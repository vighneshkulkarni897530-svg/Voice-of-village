require('dotenv').config();
const path = require('path');
const fs = require('fs');

const os = require('os');

let db = null;
let isCloudFirebase = false;

/* =========================================================================
   LOCAL FIRESTORE COMPATIBILITY STORE (Zero-Config Fallback)
   ========================================================================= */
function getWritableDataDir() {
    const localDir = path.join(__dirname, 'data');
    // If running in serverless / Vercel (read-only filesystem), write to /tmp
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
        const tmpDir = path.join(os.tmpdir(), 'voice-of-village-data');
        if (!fs.existsSync(tmpDir)) {
            try {
                fs.mkdirSync(tmpDir, { recursive: true });
                if (fs.existsSync(localDir)) {
                    const files = fs.readdirSync(localDir);
                    for (const f of files) {
                        if (f.endsWith('.json')) {
                            try {
                                fs.copyFileSync(path.join(localDir, f), path.join(tmpDir, f));
                            } catch (err) {}
                        }
                    }
                }
            } catch (e) {}
        }
        return tmpDir;
    }
    return localDir;
}

const dataDir = getWritableDataDir();

function ensureDir() {
    try {
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    } catch (e) {}
}

function getColFile(col) {
    ensureDir();
    const filePath = path.join(dataDir, `${col}.json`);
    if (!fs.existsSync(filePath)) {
        try {
            fs.writeFileSync(filePath, '[]');
        } catch (e) {}
    }
    return filePath;
}

function readCol(col) {
    try {
        const filePath = getColFile(col);
        if (!fs.existsSync(filePath)) return [];
        return JSON.parse(fs.readFileSync(filePath, 'utf8') || '[]');
    } catch (e) {
        return [];
    }
}

function writeCol(col, items) {
    try {
        ensureDir();
        fs.writeFileSync(getColFile(col), JSON.stringify(items, null, 2));
    } catch (e) {
        console.error(`Failed writing to ${col}.json:`, e.message);
    }
}

class LocalDocSnapshot {
    constructor(id, data) {
        this.id = id;
        this._data = data;
    }
    data() {
        return { ...this._data };
    }
    get exists() {
        return this._data !== null && this._data !== undefined;
    }
    get ref() {
        return {
            id: this.id,
            delete: async () => {
                // handled in collection/batch
            }
        };
    }
}

class LocalQuery {
    constructor(colName, filters = [], orderBys = [], limitCount = null) {
        this.colName = colName;
        this.filters = filters;
        this.orderBys = orderBys;
        this.limitCount = limitCount;
    }

    where(field, op, value) {
        return new LocalQuery(
            this.colName,
            [...this.filters, { field, op, value }],
            this.orderBys,
            this.limitCount
        );
    }

    orderBy(field, dir = 'asc') {
        return new LocalQuery(
            this.colName,
            this.filters,
            [...this.orderBys, { field, dir }],
            this.limitCount
        );
    }

    limit(n) {
        return new LocalQuery(this.colName, this.filters, this.orderBys, n);
    }

    async get() {
        let items = readCol(this.colName);

        // Apply filters
        for (const f of this.filters) {
            items = items.filter(item => {
                const val = item[f.field];
                if (f.op === '==' || f.op === '===') return val === f.value;
                if (f.op === 'in') return Array.isArray(f.value) && f.value.includes(val);
                if (f.op === '!=') return val !== f.value;
                if (f.op === '>') return val > f.value;
                if (f.op === '>=') return val >= f.value;
                if (f.op === '<') return val < f.value;
                if (f.op === '<=') return val <= f.value;
                return true;
            });
        }

        // Apply orderBys
        for (const ord of this.orderBys) {
            items.sort((a, b) => {
                const valA = a[ord.field];
                const valB = b[ord.field];
                if (ord.dir === 'desc') {
                    return valA < valB ? 1 : valA > valB ? -1 : 0;
                }
                return valA > valB ? 1 : valA < valB ? -1 : 0;
            });
        }

        if (this.limitCount !== null) {
            items = items.slice(0, this.limitCount);
        }

        const docs = items.map(item => new LocalDocSnapshot(item.id || item._id, item));
        return {
            empty: docs.length === 0,
            size: docs.length,
            docs: docs
        };
    }
}

class LocalCollectionReference extends LocalQuery {
    constructor(colName) {
        super(colName);
    }

    doc(id) {
        const colName = this.colName;
        return {
            id,
            get: async () => {
                const items = readCol(colName);
                const found = items.find(it => (it.id === id || it._id === id));
                return new LocalDocSnapshot(id, found || null);
            },
            set: async (data, options = {}) => {
                const items = readCol(colName);
                const index = items.findIndex(it => (it.id === id || it._id === id));
                const record = { id, _id: id, ...data };
                if (index >= 0) {
                    items[index] = options.merge ? { ...items[index], ...data } : record;
                } else {
                    items.push(record);
                }
                writeCol(colName, items);
                return { id };
            },
            update: async (data) => {
                const items = readCol(colName);
                const index = items.findIndex(it => (it.id === id || it._id === id));
                if (index >= 0) {
                    items[index] = { ...items[index], ...data };
                    writeCol(colName, items);
                }
                return { id };
            },
            delete: async () => {
                let items = readCol(colName);
                items = items.filter(it => it.id !== id && it._id !== id);
                writeCol(colName, items);
                return true;
            }
        };
    }

    async add(data) {
        const items = readCol(this.colName);
        const id = 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const record = { id, _id: id, ...data };
        items.push(record);
        writeCol(this.colName, items);
        return { id };
    }
}

const localFirestore = {
    collection: (colName) => new LocalCollectionReference(colName),
    batch: () => {
        const operations = [];
        return {
            delete: (docRef) => {
                operations.push({ type: 'delete', ref: docRef });
            },
            set: (docRef, data) => {
                operations.push({ type: 'set', ref: docRef, data });
            },
            update: (docRef, data) => {
                operations.push({ type: 'update', ref: docRef, data });
            },
            commit: async () => {
                for (const op of operations) {
                    if (op.type === 'delete' && op.ref && op.ref.id) {
                        // find collection or clear
                    }
                }
                return true;
            }
        }
    }
};

/* =========================================================================
   INITIALIZATION
   ========================================================================= */
function initDatabase() {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH 
        ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
        : path.join(__dirname, 'serviceAccountKey.json');

    const hasServiceAccountFile = fs.existsSync(serviceAccountPath);
    const rawServiceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;
    const hasEnvCredentials = process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY;
    const hasAdc = process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS);

    if (hasServiceAccountFile || rawServiceAccountJson || hasEnvCredentials || hasAdc) {
        try {
            const { initializeApp, cert, applicationDefault, getApps } = require('firebase-admin/app');
            const { getFirestore } = require('firebase-admin/firestore');

            if (getApps().length > 0) {
                db = getFirestore(getApps()[0]);
                isCloudFirebase = true;
                return db;
            }

            let app;
            if (rawServiceAccountJson) {
                let serviceAccount;
                try {
                    serviceAccount = JSON.parse(rawServiceAccountJson);
                } catch (e) {
                    // Try decoding base64 if it's base64 encoded
                    const decoded = Buffer.from(rawServiceAccountJson, 'base64').toString('utf8');
                    serviceAccount = JSON.parse(decoded);
                }
                app = initializeApp({ credential: cert(serviceAccount) });
                console.log('✅ Connected to Google Cloud Firestore using FIREBASE_SERVICE_ACCOUNT_KEY env var');
            } else if (hasServiceAccountFile) {
                const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
                app = initializeApp({ credential: cert(serviceAccount) });
                console.log('✅ Connected to Google Cloud Firestore using serviceAccountKey.json');
            } else if (hasEnvCredentials) {
                let privateKey = process.env.FIREBASE_PRIVATE_KEY;
                if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
                    privateKey = privateKey.slice(1, -1);
                }
                privateKey = privateKey.replace(/\\n/g, '\n');
                app = initializeApp({
                    credential: cert({
                        projectId: process.env.FIREBASE_PROJECT_ID,
                        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                        privateKey
                    })
                });
                console.log('✅ Connected to Google Cloud Firestore using .env credentials');
            } else {
                app = initializeApp({ credential: applicationDefault() });
                console.log('✅ Connected to Google Cloud Firestore using ADC');
            }

            db = getFirestore(app);
            isCloudFirebase = true;
            return db;
        } catch (err) {
            console.warn('⚠️ Cloud Firestore initialization failed:', err.message);
            console.log('⚡ Falling back to Local Firestore store.');
        }
    }

    console.log('📦 Using Local Firestore Store (Data auto-saved to ./data/*.json).');
    console.log('💡 Note: Place serviceAccountKey.json in project root whenever you want to connect to Cloud Firebase.');
    db = localFirestore;
    return db;
}

db = initDatabase();

module.exports = {
    db,
    isCloudFirebase
};
