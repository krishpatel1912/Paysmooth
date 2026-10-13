// client/src/firebase.js
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

let app = null;
let auth = null;
let db = null;
let googleProvider = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
  } catch (err) {
    console.warn("Failed to initialize Firebase:", err.message);
  }
}

export function subscribeToAuth(callback) {
  if (!isFirebaseConfigured || !auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle() {
  if (!isFirebaseConfigured || !auth || !googleProvider) {
    throw new Error("Firebase Auth is not configured");
  }
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function logOut() {
  if (!isFirebaseConfigured || !auth) return;
  return signOut(auth);
}

export async function loadUserPreferences(uid) {
  if (!isFirebaseConfigured || !db || !uid) return null;
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (err) {
    console.warn("Could not load user preferences from Firestore:", err.message);
    return null;
  }
}

export async function saveUserPreferences(uid, { selectedRiderId, language, profile, payouts }) {
  if (!isFirebaseConfigured || !db || !uid) return;
  try {
    const dataToSave = {
      updatedAt: serverTimestamp()
    };
    if (selectedRiderId !== undefined) dataToSave.selectedRiderId = selectedRiderId;
    if (language !== undefined) dataToSave.language = language;
    if (profile !== undefined) dataToSave.profile = profile;
    if (payouts !== undefined) dataToSave.payouts = payouts;

    await setDoc(doc(db, "users", uid), dataToSave, { merge: true });
  } catch (err) {
    console.warn("Could not save user preferences to Firestore:", err.message);
  }
}

export async function deleteUserData(uid) {
  if (!isFirebaseConfigured || !db || !uid) return;
  try {
    await setDoc(doc(db, "users", uid), {
      profile: null,
      payouts: null,
      selectedRiderId: null,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.warn("Could not delete user data in Firestore:", err.message);
  }
}
