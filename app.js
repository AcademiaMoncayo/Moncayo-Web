// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

// Configuración Firebase
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

// Mensajes
const msg = document.getElementById("message");

// --- Función auxiliar: convierte usuario → correo interno ---
function userToEmail(username) {
    return `${username}@moncayo.app`;
}

// LOGIN
window.login = function() {
    const username = document.getElementById("email").value;
    const pass = document.getElementById("password").value;

    const email = userToEmail(username);

    signInWithEmailAndPassword(auth, email, pass)
        .then(user => {
            msg.style.color = "green";
            msg.textContent = "Inicio de sesión exitoso";
            console.log("Usuario:", user.user);
        })
.catch(error => {
    console.error("ERROR COMPLETO:", error);
    msg.style.color = "red";
    msg.textContent = "Error: " + error.code + " - " + error.message;
});

}

// REGISTRO
window.register = function() {
    const username = document.getElementById("email").value;
    const pass = document.getElementById("password").value;

    const email = userToEmail(username);

    createUserWithEmailAndPassword(auth, email, pass)
        .then(user => {
            msg.style.color = "green";
            msg.textContent = "Usuario registrado correctamente";
            console.log("Usuario registrado:", user.user);
        })
.catch(error => {
    console.error("ERROR COMPLETO:", error);
    msg.style.color = "red";
    msg.textContent = "Error: " + error.code + " - " + error.message;
});

}
