import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const userDisplay = document.getElementById('userDisplay');
const btnLogout = document.getElementById('btnLogout');
const dateDisplay = document.getElementById('dateDisplay');

// 1. SEGURIDAD: Verificar si hay usuario logueado
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Si hay usuario, mostramos su nombre
        console.log("Usuario autenticado:", user.email);
        mostrarNombreUsuario(user.email);
    } else {
        // Si NO hay usuario, lo mandamos al login
        console.log("No hay usuario, redirigiendo...");
        window.location.href = "index.html";
    }
});

// 2. LOGOUT: Cerrar sesión
btnLogout.addEventListener('click', async () => {
    try {
        await signOut(auth);
        alert("Sesión cerrada");
        window.location.href = "index.html";
    } catch (error) {
        console.error("Error al salir:", error);
    }
});

// 3. UI: Mostrar nombre limpio (sin @moncayo.app)
function mostrarNombreUsuario(email) {
    // Ejemplo: cesar@moncayo.app -> ["cesar", "moncayo.app"]
    const nombreUsuario = email.split('@')[0];
    // Capitalizar primera letra: cesar -> Cesar
    const nombreFormateado = nombreUsuario.charAt(0).toUpperCase() + nombreUsuario.slice(1);
    
    userDisplay.textContent = `Hola, ${nombreFormateado}`;
}

// 4. UI: Mostrar fecha actual
const hoy = new Date();
dateDisplay.textContent = hoy.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });