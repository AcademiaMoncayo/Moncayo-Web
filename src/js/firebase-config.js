import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDlqBqnhEbdiDa8g0INjE3cQiic5HSVbrE",
  authDomain: "moncayo-sistem.firebaseapp.com",
  projectId: "moncayo-sistem",
  storageBucket: "moncayo-sistem.firebasestorage.app",
  messagingSenderId: "984728076608",
  appId: "1:984728076608:web:6cea81269adc7e215e3aa5",
  measurementId: "G-1BGPGGLXCX"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// CAMBIO: Quitamos el "default" extra. Dejamos que Firebase la encuentre solo.
const db = getFirestore(app); 

export { auth, db };