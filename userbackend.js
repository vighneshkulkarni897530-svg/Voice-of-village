require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { db } = require('./firebase');

const app = express();
app.use(cors());
app.use(express.json());

/* ================== REGISTER ================== */
app.post('/api/register', async (req, res) => {
    try {
        let { fullname, username, password, mobile } = req.body;

        if (!fullname || !username || !password || !mobile) {
            return res.json({ success: false, error: 'All fields required' });
        }

        username = username.toLowerCase().trim();

        if (!/^[6-9]\d{9}$/.test(mobile)) {
            return res.json({ success: false, error: 'Invalid mobile number' });
        }

        const existingSnapshot = await db.collection('users').where('username', '==', username).limit(1).get();
        if (!existingSnapshot.empty) {
            return res.json({ success: false, error: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            fullname: fullname.trim(),
            username,
            password: hashedPassword,
            mobile: mobile.trim(),
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection('users').add(newUser);

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
                username: userData.username,
                mobile: userData.mobile
            }
        });

    } catch (err) {
        console.error('Login Error:', err);
        res.json({ success: false, error: err.message });
    }
});

/* ================== SERVER ================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 User Auth Server running at http://localhost:${PORT}`);
});