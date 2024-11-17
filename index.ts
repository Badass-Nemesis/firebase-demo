import express, { Request, Response } from 'express';
import { auth, db, adminAuth } from './firebase';  // Ensure this path is correct for your firebase.ts
import { createUserWithEmailAndPassword, updateProfile, updateEmail, updatePassword } from 'firebase/auth';
import { collection, addDoc, doc, setDoc, updateDoc } from 'firebase/firestore';  // Import Firestore functions

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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
