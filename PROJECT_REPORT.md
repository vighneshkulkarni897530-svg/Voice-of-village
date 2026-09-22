# 📋 Gram Panchayat Samasya Nivaran — Complete Project Report

**Project Name:** Gram Panchayat Samasya Nivaran (ग्रामपंचायत समस्या निवारण)  
**Organization:** Government of Maharashtra  
**Designed By:** IDEA AVENGERS  
**Report Date:** August 19, 2026

---

## 1. Executive Summary

The **Gram Panchayat Samasya Nivaran** (Village Panchayat Grievance Redressal) system is a web-based portal that enables citizens of Maharashtra to **register, track, and manage grievances** related to their local Gram Panchayat. Government officials (operators) can log in, view complaints filtered by their assigned district/taluka, and mark them as completed.

The system supports **bilingual content** (English and Marathi), **photo uploads** for evidence, and provides **role-based access** for citizens and government operators.

---

## 2. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Backend** | Node.js + Express | Express ^5.2.1 |
| **Database (Primary)** | Firebase Cloud Firestore | firebase-admin ^14.4.0 |
| **Database (Alternative)** | JSON File Storage (data/*.json) | — |
| **Password Hashing** | bcrypt (Firebase path) / SHA-256 (JSON path) | bcrypt ^6.0.0 |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript | — |
| **Middleware** | CORS, dotenv | cors ^2.8.6, dotenv ^17.4.2 |
| **Server Port** | 3000 | — |

---

## 3. Project Structure

```
d:\dti project\
│
├── .env                          # Environment config (Firebase, Port)
├── package.json                  # Dependencies manifest
├── package-lock.json             # Locked dependency versions
├── firebase.js                   # 🔥 Firebase Admin SDK & Firestore initialization
├── serviceAccountKey.example.json# Template for Firebase credentials
├── migrate-to-firebase.js        # Data migration utility (JSON -> Firebase)
│
├── server.js                     # ✅ PRIMARY BACKEND — Firebase + bcrypt (full API)
├── backend.js                    # Alternative backend — JSON file storage (SHA-256)
├── userbackend.js                # Legacy backend — Firebase user auth
├── index.js                      # Placeholder entry file
│
├── indexc.html                   # 🏠 Home / Landing page (bilingual, role selection)
├── userlogin.html                # Citizen login page
├── userregister.html             # Citizen registration page
├── afterlogin.html               # Citizen location selection (District/Taluka/Village)
├── upload.html                   # Complaint submission form (with photo upload)
├── mycomplaints.html             # Citizen's complaint list & tracking
│
├── operatorlogin.html            # Operator login page
├── operatorregister.html         # Operator registration page
├── operatorafterlogin.html       # Operator location selection
├── operatorpanel.html            # Operator complaint management panel
│
├── style.css                     # Shared stylesheet
├── TODO.md                       # Development task log
│
└── data\                         # JSON file storage (alternative DB)
    ├── users.json                # Registered citizens
    ├── operators.json            # Registered operators
    └── complaints.json           # All submitted complaints
```

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                     │
│  indexc.html → userlogin → afterlogin → upload → mycomplaints│
│  indexc.html → operatorlogin → operatorafterlogin → panel    │
└──────────────────────────┬──────────────────────────────────┘
                           │  HTTP / JSON (REST API)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    EXPRESS SERVER (Port 3000)               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Auth APIs   │  │ Complaint    │  │  Static Files    │  │
│  │  /api/register│  │  APIs        │  │  (HTML/CSS/JS)   │  │
│  │  /api/login   │  │  /api/       │  │                  │  │
│  └──────────────┘  │  complaints   │  └──────────────────┘  │
│                    └──────────────┘                         │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
   ┌─────────────────────┐        ┌──────────────────────┐
   │ Firebase Firestore  │        │  JSON Files (data/)  │
   │  - users            │        │  - users.json        │
   │  - complaints       │        │  - operators.json    │
   │  - operators        │        │  - complaints.json   │
   └─────────────────────┘        └──────────────────────┘
```

---

## 5. Database Schemas

### 5.1 User Schema (Citizen)
| Field | Type | Constraints |
|-------|------|-------------|
| fullname | String | Required |
| email | String | Validated via Email OTP |
| username | String | Unique, Required, Lowercased |
| password | String | Required, bcrypt-hashed (10 rounds) |
| mobile | String | Required, Indian format `[6-9]\d{9}` |

### 5.2 Complaint Schema
| Field | Type | Constraints |
|-------|------|-------------|
| username | String | Complaint owner |
| comment | String | Grievance description |
| location | String | Specific location |
| district | String | Maharashtra district |
| taluka | String | Taluka within district |
| village | String | Village name |
| mobile | String | Contact number |
| imageName | String | Uploaded photo filename |
| imageDataUrl | String | Base64 photo data |
| status | String | Default: `pending` |
| completedPhotoDataUrl | String | Completion evidence photo |
| createdAt | Date | Default: `Date.now` |

### 5.3 Operator Schema
| Field | Type | Constraints |
|-------|------|-------------|
| operatorname | String | Required |
| email | String | Validated via Email OTP |
| username | String | Unique, Required, Lowercased |
| password | String | Required, bcrypt-hashed |
| mobile | String | Required, stored with `+91` prefix |
| opCode | String | Required, must equal `12345678` |

---

## 6. REST API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/send-otp` | Generate & send 6-digit OTP to user email | Public |
| POST | `/api/verify-otp` | Validate email OTP before registration | Public |
| POST | `/api/register` | Register a new citizen (with email & verified OTP) | Public |
| POST | `/api/login` | Citizen login | Public |
| POST | `/api/operator/register` | Register a new operator (requires opCode & email) | Public |
| POST | `/api/operator/login` | Operator login | Public |
| POST | `/api/complaints` | Submit a new complaint | Public |
| GET | `/api/complaints` | Get all complaints (sorted newest first) | Public |
| GET | `/api/mycomplaints/:username` | Get complaints for a specific user | Public |
| DELETE | `/api/complaints/:id` | Delete a complaint | Public |
| PUT | `/api/complaints/:id` | Update complaint status / completion photo | Public |
| POST | `/api/clearComplaints` | Delete all complaints | Public |
| POST | `/api/clearData` | Delete all users + complaints | Public |

---

## 7. User Flows

### 7.1 Citizen Flow
```
Home (indexc.html)
   │
   ▼
User Login (userlogin.html) ──► Register (userregister.html)
   │
   ▼
Location Selection (afterlogin.html)
   │  Select District → Taluka → Village
   ▼
Complaint Submission (upload.html)
   │  Write comment, location, upload photo
   ▼
My Complaints (mycomplaints.html)
   │  View list, check status, delete complaint
   ▼
Back to Home
```

### 7.2 Operator Flow
```
Home (indexc.html)
   │
   ▼
Operator Login (operatorlogin.html) ──► Register (operatorregister.html)
   │
   ▼
Location Selection (operatorafterlogin.html)
   │  Select District → Taluka → Village
   ▼
Operator Panel (operatorpanel.html)
   │  View complaints filtered by district + taluka
   │  Mark complaints as completed
   │  Clear all / Refresh
   ▼
Back to Home
```

---

## 8. Key Features

### 8.1 Bilingual Support (English / Marathi)
- Language toggle on the landing page
- Translations stored in `data-en` / `data-mr` attributes
- Language preference persisted in `localStorage`
- Full Marathi translations for UI text

### 8.2 Location Hierarchy
- **36 districts** of Maharashtra listed
- District → Taluka cascading dropdowns
- Village autocomplete via `datalist`
- Test dataset with **43,000 generated villages** for demo purposes

### 8.3 Complaint Management
- Photo upload with **base64 encoding** (stored in DB)
- Image preview before submission
- Status tracking: `pending` → `completed`
- Completion photo support
- SMS notification mock (console + alert)

### 8.4 Security
- Passwords hashed with **bcrypt** (10 salt rounds) in MongoDB path
- SHA-256 hashing in JSON file path
- Mobile number validation (Indian format)
- Operator registration protected by **secret opCode** (`12345678`)
- Username uniqueness enforcement
- Duplicate mobile number detection for operators

### 8.5 Accessibility & UX
- Skip-to-content link
- ARIA labels on interactive elements
- Keyboard focus states
- `prefers-reduced-motion` support
- Responsive design (mobile, tablet, desktop breakpoints)
- Touch-friendly button sizes (44px+ minimum)
- Smooth animations and hover effects

---

## 9. Data Storage Comparison

| Aspect | server.js (MongoDB) | backend.js (JSON Files) |
|--------|---------------------|------------------------|
| Database | MongoDB via Mongoose | `data/*.json` files |
| Password Hashing | bcrypt (10 rounds) | SHA-256 |
| Complaint IDs | MongoDB ObjectId (`_id`) | Timestamp string (`id`) |
| User IDs | MongoDB ObjectId | Timestamp string |
| Scalability | High | Low (file-based) |
| Recommended | ✅ Production | ⚠️ Development / Demo |

---

## 10. Sample Data

### Registered Users (data/users.json)
| Username | Fullname | Mobile |
|----------|----------|--------|
| vighnesh | vighnesh | 8600953409 |

### Registered Operators (data/operators.json)
| Username | Operator Name | Mobile |
|----------|--------------|--------|
| testop4 | Test | +919876543213 |
| vighnesh | vighnesh | +917391010883 |

### Complaints (data/complaints.json)
| # | Username | Comment | District | Taluka | Village | Status |
|---|----------|---------|----------|--------|---------|--------|
| 1 | vighnesh | water problem | Sangli | Kadegaon | upale mayani | pending |
| 2 | vighnesh | water problem | Sangli | Kadegaon | upale mayani | pending |
| 3 | vighnesh | water problem | Sangli | Kadegaon | upale mayani | pending |
| 4 | vighnesh | water problem | Sangli | Kadegaon | upale mayani | pending |
| 5 | vighnesh | water problem | Sangli | Kadegaon | upale mayani | pending |
| 6 | anonymous | sdfghj | Sangli | Kadegaon | upale mayani | pending |

---

## 11. Setup & Installation

### Prerequisites
- Node.js (v14+)
- MongoDB (local or Atlas) — *optional for JSON mode*
- npm

### Installation Steps
```bash
# 1. Install dependencies
npm install

# 2. Configure environment (.env)
MONGO_URI=mongodb://127.0.0.1:27017/userdb
PORT=3000

# 3. Start the server (MongoDB mode)
node server.js

# OR start the server (JSON file mode)
node backend.js

# 4. Open the application
# http://localhost:3000/indexc.html
```

---

## 12. Known Issues & Limitations

1. **No session/JWT authentication** — APIs are publicly accessible; any user can view/delete any complaint.
2. **Hardcoded API URL** — Frontend uses `http://localhost:3000` directly; not configurable.
3. **Operator secret code hardcoded** — `12345678` is embedded in both frontend and backend.
4. **Base64 image storage** — Photos stored as base64 in DB can bloat database size.
5. **SMS is mocked** — `sendCompletionSMS()` only logs to console and shows an alert.
6. **No pagination** — All complaints loaded at once; performance degrades with large datasets.
7. **Duplicate backends** — `server.js`, `backend.js`, and `userbackend.js` overlap; only one should be used.
8. **No input sanitization** — XSS risk in complaint comments rendered via `innerHTML`.
9. **No rate limiting** — APIs vulnerable to abuse.
10. **Village data dependency** — `villages.json` is fetched but not present in the project directory.

---

## 13. Recommendations for Production

| Priority | Recommendation |
|----------|---------------|
| 🔴 High | Implement JWT-based authentication & authorization |
| 🔴 High | Add role-based access control (citizen vs operator) |
| 🔴 High | Sanitize all user inputs (prevent XSS) |
| 🟠 Medium | Store images on disk/cloud (e.g., S3) instead of base64 in DB |
| 🟠 Medium | Add pagination and search/filter to complaint lists |
| 🟠 Medium | Move operator secret code to environment variable |
| 🟠 Medium | Integrate real SMS gateway (Twilio, MSG91, etc.) |
| 🟢 Low | Add rate limiting and request validation |
| 🟢 Low | Add unit tests and CI/CD pipeline |
| 🟢 Low | Consolidate into a single backend file |

---

## 14. Conclusion

The **Gram Panchayat Samasya Nivaran** project successfully delivers a functional grievance redressal portal for Maharashtra's Gram Panchayats. It provides:

- ✅ Citizen registration and login
- ✅ Complaint submission with photo evidence
- ✅ Location-based filtering (District → Taluka → Village)
- ✅ Operator management panel
- ✅ Bilingual English/Marathi interface
- ✅ Responsive, accessible design

The system is **fully functional for demonstration purposes** and provides a solid foundation for a production-grade government grievance portal with the recommended security and scalability improvements.

---

*Report generated by IDEA AVENGERS — August 2026*