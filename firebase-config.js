// Firebase Configuration & Initialization for AJHA Consultancy Services
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

// Export Firestore utilities for use across the site
export { collection, addDoc, serverTimestamp };
