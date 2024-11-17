import express, { Request, Response } from 'express';
import { auth, db, adminAuth } from './firebase';  // Ensure this path is correct for your firebase.ts
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, updateEmail, updatePassword } from 'firebase/auth';
import { collection, addDoc, doc, setDoc, updateDoc, getDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';  // Import Firestore functions

const app = express();
app.use(express.json());  // Middleware to parse JSON bodies

// User registration
app.post('/register', async (req: Request, res: Response): Promise<void> => {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
        res.status(400).json({ message: 'Name, email, and password are required' });
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        if (user) {
            // Store user profile in Firestore using UID as document ID
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
app.put('/edit/:uid', async (req: Request, res: Response): Promise<void> => {
    const { uid } = req.params;
    const { name, email, password } = req.body;

    if (!uid) {
        res.status(400).json({ message: 'User ID is required' });
        return;
    }

    try {
        // Update Firebase Authentication if email or password is provided
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

        // Update Firestore
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
app.delete('/delete/:uid', async (req: Request, res: Response): Promise<void> => {
    const { uid } = req.params;
    const { password } = req.body;

    if (!uid || !password) {
        res.status(400).json({ message: 'User ID and password are required' });
        return;
    }

    try {
        // Retrieve the user's email from Firestore using the UID
        const userRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        const userEmail = userDoc.data().email;

        // Authenticate user with email and password
        const userCredential = await signInWithEmailAndPassword(auth, userEmail, password);
        const user = userCredential.user;

        // Verify the authenticated user's UID matches the provided UID
        if (user.uid !== uid) {
            res.status(401).json({ message: 'UID and password do not match' });
            return;
        }

        // Delete user from Firebase Authentication
        await adminAuth.deleteUser(uid);

        // Delete user document from Firestore
        await deleteDoc(userRef);

        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error: unknown) {
        const errorMessage = (error as { message: string }).message;
        res.status(500).json({ message: errorMessage });
    }
});

// Save Notes API
app.post('/notes/save', async (req: Request, res: Response): Promise<void> => {
    const { uid, title, content } = req.body;

    if (!uid || !title || !content) {
        res.status(400).json({ message: 'User ID, title, and content are required' });
        return;
    }

    try {
        // Verify that the UID exists in the users collection
        const userRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        // Generate timestamp on the server side
        const timestamp = new Date().toISOString();

        // Save note in Firestore
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
app.get('/notes/:uid', async (req: Request, res: Response): Promise<void> => {
    const { uid } = req.params;

    if (!uid) {
        res.status(400).json({ message: 'User ID is required' });
        return;
    }

    try {
        // Query Firestore for notes matching the user's UID
        const notesRef = collection(db, 'notes');
        const q = query(notesRef, where('uid', '==', uid));
        const querySnapshot = await getDocs(q);

        // Map the query results to an array of notes
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
