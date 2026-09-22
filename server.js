require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const { db } = require('./firebase');
const { sendOtpEmail, sendResolutionEmail } = require('./emailService');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

/* ================== OTP STORE & UTILITIES ================== */
// In-memory store: Map<email, { otp, expiresAt, verified, attempts, lastSentAt }>
const otpStore = new Map();

// Periodic cleanup of expired OTPs (every 5 minutes)
setInterval(() => {
    const now = Date.now();
    for (const [email, record] of otpStore.entries()) {
        if (record.expiresAt < now) {
            otpStore.delete(email);
        }
    }
}, 5 * 60 * 1000);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ================== SEND OTP ================== */
app.post('/api/send-otp', async (req, res) => {
    try {
        let { email } = req.body;

        if (!email) {
            return res.json({ success: false, error: 'Email address is required' });
        }

        email = email.toLowerCase().trim();

        if (!EMAIL_REGEX.test(email)) {
            return res.json({ success: false, error: 'Please enter a valid email address' });
        }

        const now = Date.now();
        const existing = otpStore.get(email);

        // Cooldown: prevent spamming (minimum 30 seconds between resends)
        if (existing && (now - (existing.lastSentAt || 0) < 30000)) {
            const waitSec = Math.ceil((30000 - (now - existing.lastSentAt)) / 1000);
            return res.json({ success: false, error: `Please wait ${waitSec}s before requesting a new OTP` });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP with 10-minute expiry
        otpStore.set(email, {
            otp,
            expiresAt: now + 10 * 60 * 1000,
            verified: false,
            attempts: 0,
            lastSentAt: now
        });

        // Send Email
        const mailResult = await sendOtpEmail(email, otp);

        if (!mailResult.success) {
            return res.json({ 
                success: false, 
                error: mailResult.error || 'Failed to deliver email. Please verify your email configuration.' 
            });
        }

        res.json({
            success: true,
            message: `OTP sent to ${email}. Please check your inbox.`
        });

    } catch (err) {
        console.error('Send OTP Error:', err);
        res.json({ success: false, error: 'Failed to send OTP: ' + err.message });
    }
});

/* ================== VERIFY OTP ================== */
app.post('/api/verify-otp', async (req, res) => {
    try {
        let { email, otp } = req.body;

        if (!email || !otp) {
            return res.json({ success: false, error: 'Email and OTP are required' });
        }

        email = email.toLowerCase().trim();
        otp = otp.toString().trim();

        const record = otpStore.get(email);

        if (!record) {
            return res.json({ success: false, error: 'OTP expired or not found. Please click "Send OTP"' });
        }

        if (Date.now() > record.expiresAt) {
            otpStore.delete(email);
            return res.json({ success: false, error: 'OTP has expired. Please request a new one' });
        }

        if (record.attempts >= 5) {
            otpStore.delete(email);
            return res.json({ success: false, error: 'Too many failed attempts. Please request a new OTP' });
        }

        if (record.otp !== otp) {
            record.attempts += 1;
            return res.json({ success: false, error: 'Invalid OTP code. Please check and try again' });
        }

        record.verified = true;
        console.log(`✅ Email verified: ${email}`);

        res.json({
            success: true,
            message: 'Email verified successfully!'
        });

    } catch (err) {
        console.error('Verify OTP Error:', err);
        res.json({ success: false, error: 'Verification failed: ' + err.message });
    }
});

/* ================== REGISTER (CITIZEN) ================== */
app.post('/api/register', async (req, res) => {
    try {
        let { fullname, email, username, password, mobile, otp } = req.body;

        if (!fullname || !username || !password || !mobile) {
            return res.json({ success: false, error: 'All fields required' });
        }

        username = username.toLowerCase().trim();
        email = email ? email.toLowerCase().trim() : '';

        if (email && !EMAIL_REGEX.test(email)) {
            return res.json({ success: false, error: 'Invalid email address' });
        }

        if (!/^[6-9]\d{9}$/.test(mobile)) {
            return res.json({ success: false, error: 'Invalid mobile number (must be 10 digits starting with 6-9)' });
        }

        // Email OTP verification check
        if (email) {
            const record = otpStore.get(email);
            const isValidOtp = record && (record.verified || (otp && record.otp === otp.trim() && Date.now() <= record.expiresAt));

            if (!isValidOtp) {
                return res.json({ success: false, error: 'Please verify your email with the OTP first' });
            }
        }

        // Check if username already exists
        const userSnapshot = await db.collection('users').where('username', '==', username).limit(1).get();
        if (!userSnapshot.empty) {
            return res.json({ success: false, error: 'Username already exists. Please pick another.' });
        }

        // Check if email already exists
        if (email) {
            const emailSnapshot = await db.collection('users').where('email', '==', email).limit(1).get();
            if (!emailSnapshot.empty) {
                return res.json({ success: false, error: 'Email already registered. Please login or use another email.' });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            fullname: fullname.trim(),
            email: email || '',
            username,
            password: hashedPassword,
            mobile: mobile.trim(),
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection('users').add(newUser);

        // Clear verified OTP
        if (email) {
            otpStore.delete(email);
        }

        console.log(`✅ User registered: ${username} (Doc ID: ${docRef.id})`);

        res.json({ success: true, id: docRef.id });

    } catch (err) {
        console.error('Registration Error:', err);
        res.json({ success: false, error: err.message });
    }
});

/* ================== LOGIN ================== */
app.post('/api/login', async (req, res) => {
    try {
        let { username, password } = req.body;

        if (!username || !password) {
            return res.json({ success: false, error: 'Username and password required' });
        }

        username = username.toLowerCase().trim();

        const userSnapshot = await db.collection('users').where('username', '==', username).limit(1).get();
        if (userSnapshot.empty) {
            return res.json({ success: false, error: 'User not found' });
        }

        const userDoc = userSnapshot.docs[0];
        const userData = userDoc.data();

        const match = await bcrypt.compare(password, userData.password);
        if (!match) {
            return res.json({ success: false, error: 'Wrong password' });
        }

        res.json({
            success: true,
            user: {
                id: userDoc.id,
                _id: userDoc.id,
                fullname: userData.fullname,
                email: userData.email || '',
                username: userData.username,
                mobile: userData.mobile
            }
        });

    } catch (err) {
        console.error('Login Error:', err);
        res.json({ success: false, error: err.message });
    }
});

/* ================== GOOGLE SIGN-IN / AUTH ================== */
app.post('/api/google-auth', async (req, res) => {
    try {
        let { email, displayName, uid, photoURL } = req.body;

        if (!email) {
            return res.json({ success: false, error: 'Google account email is required' });
        }

        email = email.toLowerCase().trim();
        let baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || 'citizen';

        // Check if user already exists by email
        const userSnapshot = await db.collection('users').where('email', '==', email).limit(1).get();
        let userDocId;
        let userData;

        if (!userSnapshot.empty) {
            const userDoc = userSnapshot.docs[0];
            userDocId = userDoc.id;
            userData = userDoc.data();

            // Update profile with Google metadata
            const updatePayload = {
                googleUid: uid || userData.googleUid || '',
                photoURL: photoURL || userData.photoURL || '',
                lastLoginAt: new Date().toISOString()
            };
            if (!userData.fullname && displayName) updatePayload.fullname = displayName;

            await db.collection('users').doc(userDocId).update(updatePayload);
            userData = { ...userData, ...updatePayload };
            console.log(`🔑 Google Citizen logged in: ${email} (${userData.username})`);
        } else {
            // New citizen registration via Google
            let username = baseUsername;
            const checkUser = await db.collection('users').where('username', '==', username).limit(1).get();
            if (!checkUser.empty) {
                username = `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
            }

            const newUser = {
                fullname: displayName || baseUsername,
                email,
                username,
                googleUid: uid || '',
                photoURL: photoURL || '',
                mobile: '',
                authProvider: 'google',
                createdAt: new Date().toISOString(),
                lastLoginAt: new Date().toISOString()
            };

            const docRef = await db.collection('users').add(newUser);
            userDocId = docRef.id;
            userData = newUser;
            console.log(`✅ New Google Citizen registered: ${email} (${username}) [Doc ID: ${userDocId}]`);
        }

        res.json({
            success: true,
            user: {
                id: userDocId,
                _id: userDocId,
                fullname: userData.fullname || displayName || baseUsername,
                email: userData.email || email,
                username: userData.username || baseUsername,
                mobile: userData.mobile || '',
                photoURL: userData.photoURL || photoURL || ''
            }
        });

    } catch (err) {
        console.error('Google Auth Error:', err);
        res.json({ success: false, error: err.message });
    }
});

/* ================== OPERATOR REGISTER ================== */
app.post('/api/operator/register', async (req, res) => {
    try {
        let { operatorname, email, username, password, mobile, opCode, otp } = req.body;

        if (!operatorname || !username || !password || !mobile) {
            return res.json({ success: false, error: 'All fields required' });
        }

        username = username.toLowerCase().trim();
        email = email ? email.toLowerCase().trim() : '';

        if (!/^[0-9]{10}$/.test(mobile)) {
            return res.json({ success: false, error: 'Invalid mobile (10 digits required)' });
        }

        if (opCode !== '12345678') {
            return res.json({ success: false, error: 'Invalid operator code' });
        }

        // Email OTP verification check (if email provided)
        if (email) {
            const record = otpStore.get(email);
            const isValidOtp = record && (record.verified || (otp && record.otp === otp.trim() && Date.now() <= record.expiresAt));

            if (!isValidOtp) {
                return res.json({ success: false, error: 'Please verify your email with the OTP first' });
            }
        }

        // Check username existence
        const userSnapshot = await db.collection('operators').where('username', '==', username).limit(1).get();
        if (!userSnapshot.empty) {
            return res.json({ success: false, error: 'Username exists' });
        }

        // Check mobile existence (with or without +91)
        const formattedMobile = '+91' + mobile;
        const mobileSnapshot = await db.collection('operators')
            .where('mobile', 'in', [mobile, formattedMobile])
            .limit(1)
            .get();

        if (!mobileSnapshot.empty) {
            return res.json({ success: false, error: 'Mobile number already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newOperator = {
            operatorname: operatorname.trim(),
            email: email || '',
            username,
            password: hashedPassword,
            mobile: formattedMobile,
            opCode,
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection('operators').add(newOperator);

        if (email) {
            otpStore.delete(email);
        }

        console.log(`✅ Operator registered: ${username} (Doc ID: ${docRef.id})`);

        res.json({ success: true, id: docRef.id });

    } catch (err) {
        console.error('Operator Registration Error:', err);
        res.json({ success: false, error: err.message });
    }
});

/* ================== OPERATOR LOGIN ================== */
app.post('/api/operator/login', async (req, res) => {
    try {
        let { username, password } = req.body;

        if (!username || !password) {
            return res.json({ success: false, error: 'Invalid credentials' });
        }

        username = username.toLowerCase().trim();

        const operatorSnapshot = await db.collection('operators').where('username', '==', username).limit(1).get();
        if (operatorSnapshot.empty) {
            return res.json({ success: false, error: 'Invalid credentials' });
        }

        const operatorDoc = operatorSnapshot.docs[0];
        const operatorData = operatorDoc.data();

        const match = await bcrypt.compare(password, operatorData.password);
        if (!match) {
            return res.json({ success: false, error: 'Invalid credentials' });
        }

        res.json({
            success: true,
            operator: {
                id: operatorDoc.id,
                _id: operatorDoc.id,
                operatorname: operatorData.operatorname,
                email: operatorData.email || '',
                username: operatorData.username,
                mobile: operatorData.mobile
            }
        });

    } catch (err) {
        console.error('Operator Login Error:', err);
        res.json({ success: false, error: err.message });
    }
});

/* ================== ADD COMPLAINT ================== */
app.post('/api/complaints', async (req, res) => {
    try {
        const complaintData = {
            username: req.body.username || 'anonymous',
            fullname: req.body.fullname || req.body.username || '',
            email: req.body.email || '',
            category: req.body.category || '',
            comment: req.body.comment || '',
            location: req.body.location || '',
            district: req.body.district || '',
            taluka: req.body.taluka || '',
            village: req.body.village || '',
            mobile: req.body.mobile || '',
            imageName: req.body.imageName || '',
            imageDataUrl: req.body.imageDataUrl || '',
            status: req.body.status || 'pending',
            completedPhotoDataUrl: req.body.completedPhotoDataUrl || '',
            createdAt: req.body.createdAt || new Date().toISOString()
        };

        const docRef = await db.collection('complaints').add(complaintData);

        console.log(`✅ Complaint saved (Doc ID: ${docRef.id}, User: ${complaintData.username}, Email: ${complaintData.email || 'N/A'})`);

        res.json({ success: true, id: docRef.id });

    } catch (err) {
        console.error('Add Complaint Error:', err);
        res.json({ success: false, error: err.message });
    }
});

/* ================== GET ALL COMPLAINTS ================== */
app.get('/api/complaints', async (req, res) => {
    try {
        let snapshot;
        try {
            snapshot = await db.collection('complaints').orderBy('createdAt', 'desc').get();
        } catch (orderErr) {
            snapshot = await db.collection('complaints').get();
        }

        const complaints = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                _id: doc.id,
                ...data
            };
        });

        complaints.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        res.json({
            success: true,
            complaints: complaints
        });

    } catch (err) {
        console.error('Get Complaints Error:', err);
        res.json({ success: false, error: err.message });
    }
});

/* ================== REALTIME KPI STATS ================== */
app.get('/api/stats', async (req, res) => {
    try {
        const { district, taluka, village, username } = req.query;
        let snapshot;
        try {
            snapshot = await db.collection('complaints').get();
        } catch (e) {
            snapshot = { docs: [] };
        }

        let complaints = snapshot.docs ? snapshot.docs.map(doc => doc.data()) : [];

        if (district && district.trim() !== '') {
            const d = district.trim().toLowerCase();
            complaints = complaints.filter(c => c.district && c.district.toLowerCase() === d);
        }
        if (taluka && taluka.trim() !== '') {
            const t = taluka.trim().toLowerCase();
            complaints = complaints.filter(c => c.taluka && c.taluka.toLowerCase() === t);
        }
        if (village && village.trim() !== '') {
            const v = village.trim().toLowerCase();
            complaints = complaints.filter(c => c.village && c.village.toLowerCase() === v);
        }
        if (username && username.trim() !== '') {
            const u = username.trim().toLowerCase();
            complaints = complaints.filter(c => c.username && c.username.toLowerCase() === u);
        }

        const total = complaints.length;
        const resolved = complaints.filter(c => c.status === 'completed' || c.status === 'resolved').length;
        const progress = complaints.filter(c => c.status === 'in-progress' || c.status === 'progress').length;
        const pending = Math.max(0, total - resolved - progress);

        res.json({
            success: true,
            stats: {
                total,
                resolved,
                progress,
                pending
            },
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('Stats API Error:', err);
        res.json({ success: false, error: err.message });
    }
});

/* ================== GET USER COMPLAINTS ================== */
app.get('/api/mycomplaints/:username', async (req, res) => {
    try {
        const username = req.params.username;
        const snapshot = await db.collection('complaints')
            .where('username', '==', username)
            .get();

        const complaints = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                _id: doc.id,
                ...data
            };
        });

        complaints.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        res.json({ success: true, complaints });

    } catch (err) {
        console.error('Get User Complaints Error:', err);
        res.json({ success: false, error: err.message });
    }
});

/* ================== DELETE COMPLAINT ================== */
app.delete('/api/complaints/:id', async (req, res) => {
    try {
        const id = req.params.id;
        await db.collection('complaints').doc(id).delete();

        console.log(`🗑 Complaint deleted: ${id}`);

        res.json({ success: true });

    } catch (err) {
        console.error('Delete Complaint Error:', err);
        res.json({ success: false, error: err.message });
    }
});

/* ================== UPDATE COMPLAINT ================== */
app.put('/api/complaints/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const { status, completedPhotoDataUrl, resolutionNote, officerName } = req.body;
        const updateData = {};

        if (status !== undefined) updateData.status = status;
        if (completedPhotoDataUrl !== undefined) updateData.completedPhotoDataUrl = completedPhotoDataUrl;
        if (resolutionNote !== undefined) updateData.resolutionNote = resolutionNote;
        if (officerName !== undefined) updateData.officerName = officerName;
        updateData.updatedAt = new Date().toISOString();

        // Get existing complaint data before or during update
        const complaintRef = db.collection('complaints').doc(id);
        const complaintDoc = await complaintRef.get();
        const complaintData = complaintDoc.exists ? complaintDoc.data() : null;

        await complaintRef.update(updateData);
        console.log(`✏️ Complaint updated: ${id} (Status: ${status})`);

        let emailSent = false;
        if ((status === 'completed' || status === 'resolved') && complaintData) {
            let recipientEmail = complaintData.email || '';
            let citizenName = complaintData.fullname || complaintData.username || 'Citizen';

            // Fallback: If no direct email, check if username is email or look up in users collection
            if (!recipientEmail && complaintData.username) {
                if (complaintData.username.includes('@') && complaintData.username.includes('.')) {
                    recipientEmail = complaintData.username;
                } else {
                    try {
                        const userSnap = await db.collection('users').where('username', '==', complaintData.username).limit(1).get();
                        if (!userSnap.empty) {
                            const uData = userSnap.docs[0].data();
                            recipientEmail = uData.email || '';
                            citizenName = uData.fullname || citizenName;
                        }
                    } catch (uErr) {
                        console.error('User lookup error for resolution email:', uErr);
                    }
                }
            }

            if (recipientEmail) {
                console.log(`📧 Sending grievance resolution email to: ${recipientEmail}`);
                sendResolutionEmail({
                    toEmail: recipientEmail,
                    citizenName,
                    complaintId: id,
                    comment: complaintData.comment || '',
                    location: complaintData.location || '',
                    village: complaintData.village || '',
                    taluka: complaintData.taluka || '',
                    district: complaintData.district || '',
                    resolutionNote: resolutionNote || 'The grievance has been resolved by the local Gram Panchayat authority.',
                    completedPhotoDataUrl: completedPhotoDataUrl || '',
                    officerName: officerName || 'Gram Panchayat Officer'
                }).then(result => {
                    if (result && result.success) {
                        console.log(`✅ Resolution email successfully dispatched to ${recipientEmail}`);
                    }
                }).catch(err => {
                    console.error(`❌ Resolution email dispatch failed:`, err);
                });
                emailSent = true;
            } else {
                console.log(`⚠️ Citizen has no registered email, skipping email dispatch.`);
            }
        }

        res.json({ success: true, emailSent });

    } catch (err) {
        console.error('Update Complaint Error:', err);
        res.json({ success: false, error: err.message });
    }
});

/* ================== CLEAR COMPLAINTS ================== */
app.post('/api/clearComplaints', async (req, res) => {
    try {
        const snapshot = await db.collection('complaints').get();
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        console.log('🗑 All complaints cleared');
        res.json({ success: true });
    } catch (err) {
        console.error('Clear Complaints Error:', err);
        res.json({ success: false, error: err.message });
    }
});

/* ================== CLEAR DATA (USERS + COMPLAINTS) ================== */
app.post('/api/clearData', async (req, res) => {
    try {
        const userSnapshot = await db.collection('users').get();
        const complaintSnapshot = await db.collection('complaints').get();

        const batch = db.batch();
        userSnapshot.docs.forEach(doc => batch.delete(doc.ref));
        complaintSnapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        console.log('🗑 All user and complaint data cleared');
        res.json({ success: true });
    } catch (err) {
        console.error('Clear Data Error:', err);
        res.json({ success: false, error: err.message });
    }
});

/* ================== STATIC FILES & ROOT ROUTE ================== */
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, '.')));

app.get('/', (req, res) => {
    const publicIndex = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(publicIndex)) {
        return res.sendFile(publicIndex);
    }
    res.sendFile(path.join(__dirname, 'index.html'));
});

/* ================== SERVER ================== */
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
}

module.exports = app;
