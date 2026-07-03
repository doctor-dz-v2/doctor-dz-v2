// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore, enableIndexedDbPersistence, connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { getFunctions, connectFunctionsEmulator } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-functions.js";

const firebaseConfig = {
  apiKey: "AIzaSyAumOVDy0ydRb5mpGQo9HamtOf5oJOo6kI",
  authDomain: "doctor-dz-prod-4dcdf.firebaseapp.com",
  projectId: "doctor-dz-prod-4dcdf",
  storageBucket: "doctor-dz-prod-4dcdf.firebasestorage.app",
  messagingSenderId: "619616064869",
  appId: "1:619616064869:web:f6feb8709a073cc984bd8c",
  measurementId: "G-6VP9YL5J1D"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

// Enable offline persistence
enableIndexedDbPersistence(db).catch(err => {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open - offline persistence disabled');
  } else if (err.code === 'unimplemented') {
    console.warn('Browser does not support offline persistence');
  }
});

// Emulator setup for local development (optional)
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectFunctionsEmulator(functions, 'localhost', 5001);
    console.log('Firebase Emulators connected');
  } catch (err) {
    console.log('Emulator already connected or not available');
  }
}

export { app, auth, db, functions };
