import { db, auth } from './firebase-config.js';
import { 
    collection, addDoc, query, where, getDocs, orderBy, onSnapshot, doc, updateDoc, deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// DOM References
const dateDisplay = document.getElementById('dateDisplay');
const userDisplay = document.getElementById('userDisplay');
const btnLogout = document.getElementById('btnLogout');

// Notes DOM
const notesList = document.getElementById('notesList');
const btnAddNoteToggle = document.getElementById('btnAddNoteToggle');
const newNoteForm = document.getElementById('newNoteForm');
const noteInput = document.getElementById('noteInput');
const btnSaveNote = document.getElementById('btnSaveNote');
const btnCancelNote = document.getElementById('btnCancelNote');

// Stats & Today DOM
const statAlumnos = document.getElementById('statAlumnos');
const statClasesHoy = document.getElementById('statClasesHoy');
const todayList = document.getElementById('todayList');
const todayLabel = document.getElementById('todayLabel');

// 1. SEGURIDAD Y CARGA INICIAL
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        userDisplay.textContent = user.email.split('@')[0]; // Mostrar nombre usuario
        initDashboard();
    }
});

btnLogout.addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = "index.html");
});

function initDashboard() {
    mostrarFecha();
    cargarNotas();
    cargarEstadisticas();
    cargarAgendaHoy();
}

function mostrarFecha() {
    const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const fecha = new Date().toLocaleDateString('es-ES', opciones);
    dateDisplay.textContent = fecha.charAt(0).toUpperCase() + fecha.slice(1);
}

// ==========================================
// 2. MÓDULO DE NOTAS (TO-DO LIST)
// ==========================================

// Cargar Notas (Tiempo Real)
function cargarNotas() {
    const q = query(collection(db, "notes"), orderBy("createdAt", "desc"));
    
    onSnapshot(q, (snapshot) => {
        notesList.innerHTML = '';
        if(snapshot.empty) {
            notesList.innerHTML = '<div style="text-align:center; padding:20px; color:#999;">No hay pendientes. ¡Todo limpio! 🎉</div>';
            return;
        }

        snapshot.forEach((docSnap) => {
            const nota = docSnap.data();
            const id = docSnap.id;
            
            const div = document.createElement('div');
            div.className = `note-item ${nota.completed ? 'completed' : ''}`;
            
            // Checkbox para marcar como completado
            const check = document.createElement('input');
            check.type = 'checkbox';
            check.checked = nota.completed;
            check.onclick = () => toggleNota(id, !nota.completed);

            const text = document.createElement('span');
            text.className = 'note-text';
            text.textContent = nota.text;

            const btnDel = document.createElement('button');
            btnDel.className = 'btn-delete-note';
            btnDel.textContent = '×';
            btnDel.onclick = () => borrarNota(id);

            div.appendChild(check);
            div.appendChild(text);
            div.appendChild(btnDel);
            notesList.appendChild(div);
        });
    });
}

// Agregar Nota
btnSaveNote.addEventListener('click', async () => {
    const texto = noteInput.value.trim();
    if(!texto) return;

    try {
        await addDoc(collection(db, "notes"), {
            text: texto,
            completed: false,
            createdAt: new Date()
        });
        noteInput.value = '';
        newNoteForm.classList.add('hidden');
    } catch(e) { console.error(e); alert("Error al guardar nota"); }
});

// Toggle Completado
async function toggleNota(id, estado) {
    try {
        await updateDoc(doc(db, "notes", id), { completed: estado });
    } catch(e) { console.error(e); }
}

// Borrar Nota
async function borrarNota(id) {
    if(confirm("¿Borrar nota?")) {
        try { await deleteDoc(doc(db, "notes", id)); } catch(e) { console.error(e); }
    }
}

// UI del Formulario Notas
btnAddNoteToggle.addEventListener('click', () => {
    newNoteForm.classList.remove('hidden');
    noteInput.focus();
});
btnCancelNote.addEventListener('click', () => newNoteForm.classList.add('hidden'));


// ==========================================
// 3. ESTADÍSTICAS Y AGENDA DE HOY
// ==========================================

async function cargarEstadisticas() {
    // Contar Alumnos Inscritos
    try {
        const q = query(collection(db, "students"), where("status", "==", "inscrito"));
        const snap = await getDocs(q);
        statAlumnos.textContent = snap.size; // Cantidad total
    } catch(e) { console.error(e); }
}

async function cargarAgendaHoy() {
    const now = new Date();
    // Formato YYYY-MM-DD local
    const offset = now.getTimezoneOffset() * 60000;
    const todayStr = (new Date(now - offset)).toISOString().split('T')[0];
    
    // Para saber el día de la semana (para clases fijas)
    const diasMap = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const diaSemanaTexto = diasMap[now.getDay()];

    todayLabel.textContent = `Eventos para: ${todayStr} (${diaSemanaTexto})`;

    try {
        // Traemos TODAS las clases (porque filtrar por "OR" en Firebase es complejo sin índices avanzados)
        // y filtramos en memoria. Si son miles de clases, habría que optimizar, pero para una academia está bien.
        const q = query(collection(db, "classes"));
        const snap = await getDocs(q);
        
        let eventosHoy = [];

        snap.forEach(docSnap => {
            const ev = docSnap.data();
            let esHoy = false;

            // Filtro de Cancelación
            if (ev.cancelaciones && ev.cancelaciones.includes(todayStr)) return;
            if (ev.fechaFin && todayStr > ev.fechaFin) return;

            // 1. Es clase FIJA y toca hoy
            if (ev.type === 'fija' && ev.dayOfWeek === diaSemanaTexto) esHoy = true;
            
            // 2. Es clase ÚNICA/MUESTRA y la fecha coincide
            if (ev.type !== 'fija' && ev.date === todayStr) esHoy = true;

            if (esHoy) eventosHoy.push(ev);
        });

        // Ordenar por hora
        eventosHoy.sort((a,b) => a.time.localeCompare(b.time));

        // Actualizar contador en tarjeta de stats
        statClasesHoy.textContent = eventosHoy.length;

        // Renderizar Lista
        todayList.innerHTML = '';
        if (eventosHoy.length === 0) {
            todayList.innerHTML = '<div style="text-align:center; padding:20px; color:#999;">No hay clases hoy. ¡Día libre! ☀️</div>';
            return;
        }

        eventosHoy.forEach(ev => {
            const div = document.createElement('div');
            div.className = 'today-item';
            
            // Formato Hora AM/PM
            const [h, m] = ev.time.split(':');
            const ampm = h >= 12 ? 'PM' : 'AM';
            const horaStr = `${h%12||12}:${m} ${ampm}`;

            div.innerHTML = `
                <div>
                    <div class="today-time">🕒 ${horaStr}</div>
                    <div class="today-info">
                        <strong>${ev.studentName}</strong> <small>(${ev.instrument})</small>
                    </div>
                </div>
                <span class="today-status">${ev.type.toUpperCase()}</span>
            `;
            todayList.appendChild(div);
        });

    } catch(e) { console.error("Error cargando agenda:", e); }
}