import { auth } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Referencias al DOM (Nota que cambiamos emailInput por usernameInput)
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const btnLogin = document.getElementById('btnLogin');
const btnRegister = document.getElementById('btnRegister');
const messageDisplay = document.getElementById('message');

// CONSTANTE DEL DOMINIO
const DOMAIN = "@moncayo.app";

// --- Función de Login ---
async function handleLogin(e) {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
        showMessage("Ingresa usuario y contraseña", true);
        return;
    }

    // AUTORRELLENADO: Creamos el email falso
    const emailCompleto = username + DOMAIN;
    console.log("Intentando entrar con:", emailCompleto); // Para depurar

    try {
        showMessage("Entrando...", false);
        const userCredential = await signInWithEmailAndPassword(auth, emailCompleto, password);
        console.log("Logueado:", userCredential.user);
        showMessage(`¡Bienvenido, ${username}!`, false);
        
        // REDIRECCIÓN (Pendiente para el siguiente paso)
        // window.location.href = "dashboard.html";

    } catch (error) {
        console.error("Error Login:", error.code);
        traducirError(error.code);
    }
}

// --- Función de Registro ---
async function handleRegister(e) {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
        showMessage("Faltan datos", true);
        return;
    }

    // AUTORRELLENADO
    const emailCompleto = username + DOMAIN;

    try {
        showMessage("Registrando...", false);
        const userCredential = await createUserWithEmailAndPassword(auth, emailCompleto, password);
        console.log("Creado:", userCredential.user);
        showMessage(`Usuario "${username}" registrado con éxito.`, false);
    } catch (error) {
        console.error("Error Registro:", error.code);
        traducirError(error.code);
    }
}

// --- Utilidades ---
function showMessage(msg, isError = false) {
    messageDisplay.textContent = msg;
    messageDisplay.style.color = isError ? 'var(--color-error)' : 'var(--color-success)';
}

function traducirError(code) {
    let msg = "Error desconocido.";
    switch(code) {
        case 'auth/invalid-email': msg = "El usuario contiene caracteres no válidos."; break; // Mensaje adaptado
        case 'auth/user-not-found': msg = "El usuario no existe."; break;
        case 'auth/wrong-password': msg = "Contraseña incorrecta."; break;
        case 'auth/email-already-in-use': msg = "Este usuario ya está ocupado."; break; // Mensaje adaptado
        case 'auth/weak-password': msg = "La contraseña debe tener al menos 6 caracteres."; break;
        case 'auth/invalid-credential': msg = "Datos incorrectos."; break;
    }
    showMessage(msg, true);
}

// Event Listeners
btnLogin.addEventListener('click', handleLogin);
btnRegister.addEventListener('click', handleRegister);