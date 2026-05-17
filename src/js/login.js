import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Referencias al DOM
const usernameInput = document.getElementById('loginEmail');
const passwordInput = document.getElementById('loginPassword');
const btnLogin = document.getElementById('btnLogin');
const togglePassword = document.getElementById('togglePassword');
const messageDisplay = document.getElementById('messageDisplay');
const loginForm = document.getElementById('loginForm');

// CONSTANTE DEL DOMINIO
const DOMAIN = "@moncayo.app";

// --- Funcionalidad del Ojito para la contraseña ---
togglePassword.addEventListener('click', function () {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    
    this.classList.toggle('fa-eye');
    this.classList.toggle('fa-eye-slash');
});

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

    // Animación de carga en el botón
    const originalText = btnLogin.innerHTML;
    btnLogin.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Entrando...';
    btnLogin.disabled = true;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, emailCompleto, password);
        
        showMessage(`¡Bienvenido, ${username}!`, false);
        
        // REDIRECCIÓN
        window.location.href = "dashboard.html"; 

    } catch (error) {
        console.error("Error Login:", error.code);
        
        // Restaurar el botón si falla
        btnLogin.innerHTML = originalText;
        btnLogin.disabled = false;
        
        traducirError(error.code);
    }
}

// --- Utilidades ---
function showMessage(msg, isError = false) {
    if(messageDisplay) {
        messageDisplay.textContent = msg;
        messageDisplay.style.color = isError ? '#ff4d4d' : '#69db7c';
    }
}

function traducirError(code) {
    let msg = "Error desconocido.";
    switch(code) {
        case 'auth/invalid-email': msg = "El usuario contiene caracteres no válidos."; break;
        case 'auth/user-not-found': msg = "El usuario no existe."; break;
        case 'auth/wrong-password': msg = "Contraseña incorrecta."; break;
        case 'auth/invalid-credential': msg = "Usuario o contraseña incorrectos."; break;
        case 'auth/too-many-requests': msg = "Demasiados intentos. Intenta más tarde."; break;
    }
    showMessage(msg, true);
}

// Event Listener
loginForm.addEventListener('submit', handleLogin);