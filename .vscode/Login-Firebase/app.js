// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDM73xowdCFndhKpkYQcLlTeYTtF3u8sf0",
  authDomain: "moncayo-8c3a6.firebaseapp.com",
  projectId: "moncayo-8c3a6",
  storageBucket: "moncayo-8c3a6.firebasestorage.app",
  messagingSenderId: "377849198690",
  appId: "1:377849198690:web:693ef3793343a8c974393b",
  measurementId: "G-56G3G0F2ED"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export default app;

// Obtener elementos
const msg = document.getElementById("message");

// Función Login
window.login = function() {
    const email = document.getElementById("email").value;
    const pass = document.getElementById("password").value;

    signInWithEmailAndPassword(auth, email, pass)
        .then(userCredential => {
            msg.style.color = "green";
            msg.textContent = "Inicio de sesión exitoso";
            console.log("Usuario:", userCredential.user);
        })
        .catch(error => {
            msg.style.color = "red";
            msg.textContent = "Error: " + error.message;
        });
}

// Función Registro
window.register = function() {
    const email = document.getElementById("email").value;
    const pass = document.getElementById("password").value;

    createUserWithEmailAndPassword(auth, email, pass)
        .then(userCredential => {
            msg.style.color = "green";
            msg.textContent = "Usuario registrado correctamente";
            console.log("Usuario:", userCredential.user);
        })
        .catch(error => {
            msg.style.color = "red";
            msg.textContent = "Error: " + error.message;
        });
}