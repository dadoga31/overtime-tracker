// src/js/firebase.js
// ─────────────────────────────────────────────
// Firebase initialization — edit ONLY the firebaseConfig block
// with your own project credentials from Firebase Console.
// ─────────────────────────────────────────────

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── ⚙️  YOUR FIREBASE CONFIG ──────────────────
// Replace with your project's values:
// Firebase Console → Project Settings → Your apps → SDK setup
const firebaseConfig = {
  apiKey:            "AIzaSyBES0IivtlXshNmSD94as2__1esxRKU-U0",
  authDomain:        "horas-extras-c1b60.firebaseapp.com",
  projectId:         "horas-extras-c1b60",
  storageBucket:     "horas-extras-c1b60.firebasestorage.app",
  messagingSenderId: "164600030685",
  appId:             "1:164600030685:web:870aad5fbc4c9a16458234"
};
// ─────────────────────────────────────────────

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// Expose to app.js via window
window._fb = {
  auth,
  db,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp
};
