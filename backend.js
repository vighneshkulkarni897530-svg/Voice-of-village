const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { sendResolutionEmail } = require('./emailService');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;

/* ================== FILE PATHS ================== */
const dataDir = path.join(__dirname, 'data');
const usersFile = path.join(dataDir, 'users.json');
const complaintsFile = path.join(dataDir, 'complaints.json');
const operatorsFile = path.join(dataDir, 'operators.json');

/* ================== INIT FILE ================== */
function ensureFile() {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
    if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, '[]');
    if (!fs.existsSync(complaintsFile)) fs.writeFileSync(complaintsFile, '[]');
    if (!fs.existsSync(operatorsFile)) fs.writeFileSync(operatorsFile, '[]');
}

/* ================== READ / WRITE ================== */
function readUsers() {
    ensureFile();
    return JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
}

function writeUsers(data) {
    fs.writeFileSync(usersFile, JSON.stringify(data, null, 2));
}

function readComplaints() {
    ensureFile();
    return JSON.parse(fs.readFileSync(complaintsFile, 'utf-8'));
}

function writeComplaints(data) {
    fs.writeFileSync(complaintsFile, JSON.stringify(data, null, 2));
}

function readOperators() {
    ensureFile();
    return JSON.parse(fs.readFileSync(operatorsFile, 'utf-8'));
}

function writeOperators(data) {
    fs.writeFileSync(operatorsFile, JSON.stringify(data, null, 2));
}

/* ================== HASH ================== */
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

/* ================== REGISTER ================== */
app.post('/api/register', (req, res) => {
    const { fullname, username, password, mobile } = req.body;

    if (!fullname || !username || !password || !mobile) {
        return res.json({ success: false, error: 'All fields required' });
    }

    const users = readUsers();

    if (users.some(u => u.username === username.toLowerCase())) {
        return res.json({ success: false, error: 'Username exists' });
    }

    const newUser = {
        id: Date.now().toString(),
        fullname,
        username: username.toLowerCase(),
        password: hashPassword(password),
        mobile
    };

    users.push(newUser);
    writeUsers(users);

    res.json({ success: true });
});

/* ================== LOGIN ================== */
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    const users = readUsers();

    const user = users.find(
        u =>
            u.username === username.toLowerCase() &&
            u.password === hashPassword(password)
    );

    if (!user) {
        return res.json({ success: false, error: 'Invalid credentials' });
    }

    res.json({
        success: true,
        user: {
            fullname: user.fullname,
            username: user.username,
            mobile: user.mobile
        }
    });
});

/* ================== OPERATOR REGISTER ================== */
app.post('/api/operator/register', (req, res) => {
    try {
        const { operatorname, username, password, mobile, opCode } = req.body;

        if (!operatorname || !username || !password || !mobile) {
            return res.json({ success: false, error: 'All fields required' });
        }

        if (!/^[0-9]{10}$/.test(mobile)) {
            return res.json({ success: false, error: 'Invalid mobile' });
        }

        if (opCode !== '12345678') {
            return res.json({ success: false, error: 'Invalid operator code' });
        }

        const operators = readOperators();

        if (operators.some(op => op.username === username.toLowerCase())) {
            return res.json({ success: false, error: 'Username exists' });
        }

        if (operators.some(op => op.mobile === mobile || op.mobile === '+91' + mobile)) {
            return res.json({ success: false, error: 'Mobile number already registered' });
        }

        const newOperator = {
            id: Date.now().toString(),
            operatorname,
            username: username.toLowerCase(),
            passwordHash: hashPassword(password),
            mobile: '+91' + mobile,
            opCode
        };

        operators.push(newOperator);
        writeOperators(operators);

        res.json({ success: true });

    } catch (err) {
        console.error(err);
        res.json({ success: false, error: err.message });
    }
});

/* ================== OPERATOR LOGIN ================== */
app.post('/api/operator/login', (req, res) => {
    try {
        const { username, password } = req.body;

        const operators = readOperators();

        const operator = operators.find(
            op =>
                op.username === username.toLowerCase() &&
                op.passwordHash === hashPassword(password)
        );

        if (!operator) {
            return res.json({ success: false, error: 'Invalid credentials' });
        }

        res.json({
            success: true,
            operator: {
                operatorname: operator.operatorname,
                username: operator.username,
                mobile: operator.mobile
            }
        });

    } catch (err) {
        console.error(err);
        res.json({ success: false, error: err.message });
    }
});

/* ================== ADD COMPLAINT ================== */
app.post('/api/complaints', (req, res) => {
    try {
        const complaints = readComplaints();

        const newComplaint = {
            id: Date.now().toString(),
            ...req.body,
            createdAt: new Date().toISOString()
        };

        complaints.push(newComplaint);
        writeComplaints(complaints);

        res.json({ success: true });

    } catch (err) {
        console.error(err);
        res.json({ success: false });
    }
});

/* ================== GET ALL COMPLAINTS ================== */
app.get('/api/complaints', (req, res) => {
    try {
        const complaints = readComplaints();

        res.json({
            success: true,
            complaints: complaints
        });

    } catch (err) {
        console.error(err);
        res.json({ success: false });
    }
});

/* ================== DELETE COMPLAINT ================== */
app.delete('/api/complaints/:id', (req, res) => {
    try {
        let complaints = readComplaints();

        complaints = complaints.filter(c => c.id !== req.params.id);

        writeComplaints(complaints);

        res.json({ success: true });

    } catch (err) {
        console.error(err);
        res.json({ success: false });
    }
});

/* ================== GET USER COMPLAINTS ================== */
app.get('/api/mycomplaints/:username', (req, res) => {
    try {
        const complaints = readComplaints();
        const userComplaints = complaints
            .filter(c => c.username === req.params.username)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({
            success: true,
            complaints: userComplaints
        });

    } catch (err) {
        console.error(err);
        res.json({ success: false });
    }
});


/* ================== UPDATE COMPLAINT ================== */
app.put('/api/complaints/:id', (req, res) => {
    try {
        let complaints = readComplaints();
        const index = complaints.findIndex(c => c.id === req.params.id);
        if (index === -1) {
            return res.json({ success: false, error: 'Complaint not found' });
        }

        const { status, completedPhotoDataUrl, resolutionNote, officerName } = req.body;
        if (status !== undefined) complaints[index].status = status;
        if (completedPhotoDataUrl !== undefined) complaints[index].completedPhotoDataUrl = completedPhotoDataUrl;
        if (resolutionNote !== undefined) complaints[index].resolutionNote = resolutionNote;
        if (officerName !== undefined) complaints[index].officerName = officerName;
        complaints[index].updatedAt = new Date().toISOString();

        const complaint = complaints[index];
        writeComplaints(complaints);

        let emailSent = false;
        if (status === 'completed' || status === 'resolved') {
            let recipientEmail = complaint.email || '';
            let citizenName = complaint.fullname || complaint.username || 'Citizen';

            if (!recipientEmail && complaint.username) {
                if (complaint.username.includes('@') && complaint.username.includes('.')) {
                    recipientEmail = complaint.username;
                } else {
                    const users = readUsers();
                    const u = users.find(user => user.username === complaint.username.toLowerCase());
                    if (u && u.email) {
                        recipientEmail = u.email;
                        citizenName = u.fullname || citizenName;
                    }
                }
            }

            if (recipientEmail) {
                console.log(`📧 Sending resolution email to: ${recipientEmail}`);
                sendResolutionEmail({
                    toEmail: recipientEmail,
                    citizenName,
                    complaintId: complaint.id,
                    comment: complaint.comment || '',
                    location: complaint.location || '',
                    village: complaint.village || '',
                    taluka: complaint.taluka || '',
                    district: complaint.district || '',
                    resolutionNote: resolutionNote || 'The grievance has been resolved by the local Gram Panchayat authority.',
                    completedPhotoDataUrl: completedPhotoDataUrl || '',
                    officerName: officerName || 'Gram Panchayat Officer'
                }).catch(err => console.error('Resolution email error:', err));
                emailSent = true;
            }
        }

        res.json({ success: true, emailSent });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: err.message });
    }
});

/* ================== CLEAR COMPLAINTS ================== */
app.post('/api/clearComplaints', (req, res) => {
    writeComplaints([]);
    res.json({ success: true });
});

/* ================== CLEAR DATA ================== */
app.post('/api/clearData', (req, res) => {
    writeUsers([]);
    writeComplaints([]);
    writeOperators([]);
    res.json({ success: true });
});

/* ================== OTP FALLBACK ENDPOINTS ================== */
const fallbackOtpStore = new Map();

app.post('/api/send-otp', (req, res) => {
    const { email } = req.body;
    if (!email) return res.json({ success: false, error: 'Email required' });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    fallbackOtpStore.set(email.toLowerCase().trim(), { otp, expiresAt: Date.now() + 10 * 60 * 1000, verified: false });
    console.log(`📧 [Mock OTP] Code for ${email}: ${otp}`);
    res.json({ success: true, message: `OTP sent to ${email} (Demo code: ${otp})` });
});

app.post('/api/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    const record = fallbackOtpStore.get((email || '').toLowerCase().trim());
    if (!record || record.otp !== (otp || '').trim()) {
        return res.json({ success: false, error: 'Invalid or expired OTP' });
    }
    record.verified = true;
    res.json({ success: true, message: 'Verified' });
});

/* ================== STATIC FILES ================== */
app.use(express.static('.'));

/* ================== START SERVER ================== */
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});


