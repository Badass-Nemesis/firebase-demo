import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { auth, db, adminAuth } from './firebase';  
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, updateEmail, updatePassword } from 'firebase/auth';
import { collection, addDoc, doc, setDoc, updateDoc, getDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';  // importing Firestore functions

const app = express();
app.use(express.json());  // it's a middleware to parse JSON bodies
app.use(cors());
app.use(helmet());

// interfaces for defining types for request bodies
interface RegisterRequestBody {
    email: string;
    password: string;
    name: string;
}

interface EditRequestBody {
    name?: string;
    email?: string;
    password?: string;
}

interface DeleteRequestBody {
    password: string;
}

interface SaveNoteRequestBody {
    uid: string;
    title: string;
    content: string;
}

// User registration
app.post('/register', async (req: Request<{}, {}, RegisterRequestBody>, res: Response): Promise<void> => {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
        res.status(400).json({ message: 'Name, email, and password are required' });
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        if (user) {
            // we are storing user profile in Firestore using UID as document ID for easy check
            await setDoc(doc(db, 'users', user.uid), {
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
        } else {
            res.status(500).json({ message: 'Failed to create user' });
        }
    } catch (error: unknown) {
        const errorMessage = (error as { message: string }).message;
        res.status(500).json({ message: errorMessage });
    }
});

// User Edit API
app.put('/edit/:uid', async (req: Request<{ uid: string }, {}, EditRequestBody>, res: Response): Promise<void> => {
    const { uid } = req.params;
    const { name, email, password } = req.body;

    if (!uid) {
        res.status(400).json({ message: 'User ID is required' });
        return;
    }

    try {
        // checking if email already exists in Firebase Auth or Firestore (checking both because aisehi)
        if (email) {
            const users = await adminAuth.listUsers();
            const emailExistsInAuth = users.users.some(user => user.email === email && user.uid !== uid);

            if (emailExistsInAuth) {
                res.status(409).json({ message: 'Email already exists in authentication. Give different email.' });
                return;
            }

            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('email', '==', email));
            const querySnapshot = await getDocs(q);
            const emailExistsInFirestore = querySnapshot.docs.some(doc => doc.data().email === email && doc.id !== uid);

            if (emailExistsInFirestore) {
                res.status(409).json({ message: 'Email already exists in users collection. Give different email.' });
                return;
            }
        }

        // updating Firebase Authentication if email or password is provided (because auth has email and pass fields only)
        if (email || password) {
            const userUpdate: { email?: string, password?: string, displayName?: string } = {};
            if (email) {
                userUpdate.email = email;
            }
            if (password) {
                userUpdate.password = password;
            }
            if (name) {
                userUpdate.displayName = name;
            }
            await adminAuth.updateUser(uid, userUpdate);
        }

        // updating Firestore/db
        const userRef = doc(db, 'users', uid);
        const userDoc = {
            ...(name && { name }),
            ...(email && { email }),
        };

        await updateDoc(userRef, userDoc);

        res.status(200).json({ message: 'User information updated successfully' });
    } catch (error: unknown) {
        const errorMessage = (error as { message: string }).message;
        res.status(500).json({ message: errorMessage });
    }
});

// User Delete API
app.delete('/delete/:uid', async (req: Request<{ uid: string }, {}, DeleteRequestBody>, res: Response): Promise<void> => {
    const { uid } = req.params;
    const { password } = req.body;

    if (!uid || !password) {
        res.status(400).json({ message: 'User ID and password are required' });
        return;
    }

    try {
        // retrieving the user's email from Firestore using it's UID
        const userRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        const userEmail = userDoc.data().email;

        // authenticating user with email and password
        const userCredential = await signInWithEmailAndPassword(auth, userEmail, password);
        const user = userCredential.user;

        // verifying if the authenticated user's UID matches the provided UID
        if (user.uid !== uid) {
            res.status(401).json({ message: 'UID and password do not match' });
            return;
        }

        // deleting user from Firebase Authentication
        await adminAuth.deleteUser(uid);

        // deleting user document from Firestore/db
        await deleteDoc(userRef);

        // deleting the user's notes from Firestore
        const notesRef = collection(db, 'notes');
        const q = query(notesRef, where('uid', '==', uid));
        const querySnapshot = await getDocs(q);

        for (const doc of querySnapshot.docs) {
            await deleteDoc(doc.ref);
        }

        res.status(200).json({ message: 'User and corresponding notes deleted successfully' });
    } catch (error: unknown) {
        const errorMessage = (error as { message: string }).message;
        res.status(500).json({ message: errorMessage });
    }
});

// Save Notes API
app.post('/notes/save', async (req: Request<{}, {}, SaveNoteRequestBody>, res: Response): Promise<void> => {
    const { uid, title, content } = req.body;

    if (!uid || !title || !content) {
        res.status(400).json({ message: 'User ID, title, and content are required' });
        return;
    }

    try {
        // verifying that the UID exists in the users collection
        const userRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        // generating timestamp on the server side (this is in I believe ISO86001 or something like that. UTC timing)
        const timestamp = new Date().toISOString();

        // saving the note in Firestore/db
        await addDoc(collection(db, 'notes'), {
            uid: uid,
            title: title,
            content: content,
            timestamp: timestamp,
        });

        res.status(201).json({ message: 'Note saved successfully' });
    } catch (error: unknown) {
        const errorMessage = (error as { message: string }).message;
        res.status(500).json({ message: errorMessage });
    }
});

// Get Notes API
app.get('/notes/:uid', async (req: Request<{ uid: string }>, res: Response): Promise<void> => {
    const { uid } = req.params;

    if (!uid) {
        res.status(400).json({ message: 'User ID is required' });
        return;
    }

    try {
        // simple query to Firestore/db for notes matching the user's UID
        const notesRef = collection(db, 'notes');
        const q = query(notesRef, where('uid', '==', uid));
        const querySnapshot = await getDocs(q);

        // mapping the query results to an array of notes to give it to the user
        const notes = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.status(200).json(notes);
    } catch (error: unknown) {
        const errorMessage = (error as { message: string }).message;
        res.status(500).json({ message: errorMessage });
    }
});

const PORT = process.env.PORT || 3000; // why am I even using process.env, all my secrets/api keys are public already

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
