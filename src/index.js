"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const firebase_1 = require("./firebase");
const auth_1 = require("firebase/auth");
const firestore_1 = require("firebase/firestore"); // importing Firestore functions
const firebase_functions_1 = __importDefault(require("firebase-functions"));
const app = (0, express_1.default)();
app.use(express_1.default.json()); // it's a middleware to parse JSON bodies
app.use((0, cors_1.default)());
app.use((0, helmet_1.default)());
// User registration
app.post('/register', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
        res.status(400).json({ message: 'Name, email, and password are required' });
        return;
    }
    try {
        const userCredential = yield (0, auth_1.createUserWithEmailAndPassword)(firebase_1.auth, email, password);
        const user = userCredential.user;
        if (user) {
            // we are storing user profile in Firestore using UID as document ID for easy check
            yield (0, firestore_1.setDoc)((0, firestore_1.doc)(firebase_1.db, 'users', user.uid), {
                uid: user.uid,
                email: user.email,
                name: name,
                createdAt: new Date().toISOString()
            });
            res.status(201).json({
                message: 'User registered successfully',
                user: {
                    uid: user.uid,
                    email: user.email,
                    name: name,
                },
            });
        }
        else {
            res.status(500).json({ message: 'Failed to create user' });
        }
    }
    catch (error) {
        const errorMessage = error.message;
        res.status(500).json({ message: errorMessage });
    }
}));
// User Edit API
app.put('/edit/:uid', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { uid } = req.params;
    const { name, email, password } = req.body;
    if (!uid) {
        res.status(400).json({ message: 'User ID is required' });
        return;
    }
    try {
        // checking if email already exists in Firebase Auth or Firestore (checking both because aisehi)
        if (email) {
            const users = yield firebase_1.adminAuth.listUsers();
            const emailExistsInAuth = users.users.some(user => user.email === email && user.uid !== uid);
            if (emailExistsInAuth) {
                res.status(409).json({ message: 'Email already exists in authentication. Give different email.' });
                return;
            }
            const usersRef = (0, firestore_1.collection)(firebase_1.db, 'users');
            const q = (0, firestore_1.query)(usersRef, (0, firestore_1.where)('email', '==', email));
            const querySnapshot = yield (0, firestore_1.getDocs)(q);
            const emailExistsInFirestore = querySnapshot.docs.some(doc => doc.data().email === email && doc.id !== uid);
            if (emailExistsInFirestore) {
                res.status(409).json({ message: 'Email already exists in users collection. Give different email.' });
                return;
            }
        }
        // updating Firebase Authentication if email or password is provided (because auth has email and pass fields only)
        if (email || password) {
            const userUpdate = {};
            if (email) {
                userUpdate.email = email;
            }
            if (password) {
                userUpdate.password = password;
            }
            if (name) {
                userUpdate.displayName = name;
            }
            yield firebase_1.adminAuth.updateUser(uid, userUpdate);
        }
        // updating Firestore/db
        const userRef = (0, firestore_1.doc)(firebase_1.db, 'users', uid);
        const userDoc = Object.assign(Object.assign({}, (name && { name })), (email && { email }));
        yield (0, firestore_1.updateDoc)(userRef, userDoc);
        res.status(200).json({ message: 'User information updated successfully' });
    }
    catch (error) {
        const errorMessage = error.message;
        res.status(500).json({ message: errorMessage });
    }
}));
// User Delete API
app.delete('/delete/:uid', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { uid } = req.params;
    const { password } = req.body;
    if (!uid || !password) {
        res.status(400).json({ message: 'User ID and password are required' });
        return;
    }
    try {
        // retrieving the user's email from Firestore using it's UID
        const userRef = (0, firestore_1.doc)(firebase_1.db, 'users', uid);
        const userDoc = yield (0, firestore_1.getDoc)(userRef);
        if (!userDoc.exists()) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const userEmail = userDoc.data().email;
        // authenticating user with email and password
        const userCredential = yield (0, auth_1.signInWithEmailAndPassword)(firebase_1.auth, userEmail, password);
        const user = userCredential.user;
        // verifying if the authenticated user's UID matches the provided UID
        if (user.uid !== uid) {
            res.status(401).json({ message: 'UID and password do not match' });
            return;
        }
        // deleting user from Firebase Authentication
        yield firebase_1.adminAuth.deleteUser(uid);
        // deleting user document from Firestore/db
        yield (0, firestore_1.deleteDoc)(userRef);
        // deleting the user's notes from Firestore
        const notesRef = (0, firestore_1.collection)(firebase_1.db, 'notes');
        const q = (0, firestore_1.query)(notesRef, (0, firestore_1.where)('uid', '==', uid));
        const querySnapshot = yield (0, firestore_1.getDocs)(q);
        for (const doc of querySnapshot.docs) {
            yield (0, firestore_1.deleteDoc)(doc.ref);
        }
        res.status(200).json({ message: 'User and corresponding notes deleted successfully' });
    }
    catch (error) {
        const errorMessage = error.message;
        res.status(500).json({ message: errorMessage });
    }
}));
// Save Notes API
app.post('/notes/save', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { uid, title, content } = req.body;
    if (!uid || !title || !content) {
        res.status(400).json({ message: 'User ID, title, and content are required' });
        return;
    }
    try {
        // verifying that the UID exists in the users collection
        const userRef = (0, firestore_1.doc)(firebase_1.db, 'users', uid);
        const userDoc = yield (0, firestore_1.getDoc)(userRef);
        if (!userDoc.exists()) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        // generating timestamp on the server side (this is in I believe ISO86001 or something like that. UTC timing)
        const timestamp = new Date().toISOString();
        // saving the note in Firestore/db
        yield (0, firestore_1.addDoc)((0, firestore_1.collection)(firebase_1.db, 'notes'), {
            uid: uid,
            title: title,
            content: content,
            timestamp: timestamp,
        });
        res.status(201).json({ message: 'Note saved successfully' });
    }
    catch (error) {
        const errorMessage = error.message;
        res.status(500).json({ message: errorMessage });
    }
}));
// Get Notes API
app.get('/notes/:uid', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { uid } = req.params;
    if (!uid) {
        res.status(400).json({ message: 'User ID is required' });
        return;
    }
    try {
        // simple query to Firestore/db for notes matching the user's UID
        const notesRef = (0, firestore_1.collection)(firebase_1.db, 'notes');
        const q = (0, firestore_1.query)(notesRef, (0, firestore_1.where)('uid', '==', uid));
        const querySnapshot = yield (0, firestore_1.getDocs)(q);
        // mapping the query results to an array of notes to give it to the user
        const notes = querySnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        res.status(200).json(notes);
    }
    catch (error) {
        const errorMessage = error.message;
        res.status(500).json({ message: errorMessage });
    }
}));
const PORT = process.env.PORT || 3000; // why am I even using process.env, all my secrets/api keys are public already
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
exports.api = firebase_functions_1.default.https.onRequest(app);
