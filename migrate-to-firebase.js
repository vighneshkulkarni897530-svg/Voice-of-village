/**
 * Data Migration Script: JSON Files -> Firebase Cloud Firestore
 * Run with: node migrate-to-firebase.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { db } = require('./firebase');

const dataDir = path.join(__dirname, 'data');
const usersFile = path.join(dataDir, 'users.json');
const operatorsFile = path.join(dataDir, 'operators.json');
const complaintsFile = path.join(dataDir, 'complaints.json');

async function migrateData() {
    console.log('🚀 Starting data migration to Firebase Cloud Firestore...\n');

    // 1. Migrate Users
    if (fs.existsSync(usersFile)) {
        const users = JSON.parse(fs.readFileSync(usersFile, 'utf8') || '[]');
        console.log(`📦 Found ${users.length} users to migrate...`);
        for (const user of users) {
            const { id, ...userData } = user;
            // Check if already in Firestore
            const existing = await db.collection('users').where('username', '==', userData.username).get();
            if (existing.empty) {
                await db.collection('users').add({
                    ...userData,
                    createdAt: userData.createdAt || new Date().toISOString()
                });
                console.log(`   + Migrated user: ${userData.username}`);
            } else {
                console.log(`   ~ User already exists: ${userData.username}`);
            }
        }
    }

    // 2. Migrate Operators
    if (fs.existsSync(operatorsFile)) {
        const operators = JSON.parse(fs.readFileSync(operatorsFile, 'utf8') || '[]');
        console.log(`\n📦 Found ${operators.length} operators to migrate...`);
        for (const op of operators) {
            const { id, passwordHash, ...opData } = op;
            const existing = await db.collection('operators').where('username', '==', opData.username).get();
            if (existing.empty) {
                await db.collection('operators').add({
                    ...opData,
                    password: passwordHash || op.password,
                    createdAt: opData.createdAt || new Date().toISOString()
                });
                console.log(`   + Migrated operator: ${opData.username}`);
            } else {
                console.log(`   ~ Operator already exists: ${opData.username}`);
            }
        }
    }

    // 3. Migrate Complaints
    if (fs.existsSync(complaintsFile)) {
        const complaints = JSON.parse(fs.readFileSync(complaintsFile, 'utf8') || '[]');
        console.log(`\n📦 Found ${complaints.length} complaints to migrate...`);
        for (const comp of complaints) {
            const { id, ...compData } = comp;
            await db.collection('complaints').add({
                ...compData,
                createdAt: compData.createdAt || new Date().toISOString()
            });
            console.log(`   + Migrated complaint from ${compData.username || 'user'}: "${compData.comment?.slice(0, 30)}..."`);
        }
    }

    console.log('\n✅ Data migration to Firebase Cloud Firestore completed successfully!');
    process.exit(0);
}

migrateData().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
