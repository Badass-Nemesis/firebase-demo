import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import admin from 'firebase-admin';
import * as serviceAccount from './credentials.json';

const firebaseConfig = {
    apiKey: "AIzaSyC6KvAKdv-j5J11Z8dzQ1o0T5RuDBTnNiM",
    authDomain: "backend-firebase-6d671.firebaseapp.com",
    projectId: "backend-firebase-6d671",
    storageBucket: "backend-firebase-6d671.firebasestorage.app",
    messagingSenderId: "946751813632",
    appId: "1:946751813632:web:2ddd7fd63cee14cb6b40e5",
    measurementId: "G-05DVRJP2SZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize Firebase Admin
if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
}

const adminAuth = admin.auth();

export { auth, db, adminAuth };
