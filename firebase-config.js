// Firebase Configuration & Initialization for AJHA Consultancy Services
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  setDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

export const firebaseConfig = {
  apiKey: atob("QUl6YVN5Q1VOSllPVjhqRzhQLVVvdU9aX1BCWElkVzQ4a1o4dmhB"),
  authDomain: "ajha-website-c82f1.firebaseapp.com",
  projectId: "ajha-website-c82f1",
  storageBucket: "ajha-website-c82f1.firebasestorage.app",
  messagingSenderId: "34751336433",
  appId: "1:34751336433:web:2b1b30aae368e76d9afe50"
};

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore database instance
export const db = getFirestore(app);

// Initialize Firebase Auth instance & Google Provider
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Export Firestore and Auth utilities for use across the site
export { 
  collection, 
  addDoc, 
  getDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  setDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  onSnapshot,
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
};

