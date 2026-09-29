import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getDatabase } from 'firebase/database'

/*
 * One Firebase project holds everything: this portal, and every device.
 *
 * It has to be one, because Firebase Authentication belongs to a project - an
 * account made in one does not exist in another. Claiming a device compares
 * the uid signed in here against the owner written on the device, and across
 * two projects there would be nothing to compare.
 *
 * None of the values below are secrets. They are in the bundle any visitor can
 * read, and they identify the project rather than authorise anything. What
 * keeps the data safe is the security rules. See PROTOCOL.md and FIREBASE.md
 * in the iot repository.
 */
export const firebaseApp = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
})

export const auth = getAuth(firebaseApp)

// Realtime Database, not Firestore: a device reaches this one over plain
// HTTPS, which is all an ESP32-C3 has room for.
export const db = getDatabase(firebaseApp)
