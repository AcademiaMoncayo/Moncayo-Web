import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDM73xowdCFndhKpkYQcLlTeYTtF3u8sf0",
    authDomain: "moncayo-8c3a6.firebaseapp.com",
    projectId: "moncayo-8c3a6",
    storageBucket: "moncayo-8c3a6.firebasestorage.app",
    messagingSenderId: "377849198690",
    appId: "1:377849198690:web:693ef3793343a8c974393b",
    measurementId: "G-56G3G0F2ED"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };