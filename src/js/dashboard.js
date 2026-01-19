import { db, auth } from './firebase-config.js';
import { 
    collection, addDoc, query, where, getDocs, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDoc 
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

// Stats & WhatsApp DOM
const statAlumnos = document.getElementById('statAlumnos');
const statClasesHoy = document.getElementById('statClasesHoy');
const todayList = document.getElementById('todayList');
const todayLabel = document.getElementById('todayLabel');
const listaRecordatorios = document.getElementById('listaRecordatorios');

// DOM CONFIRMACIÓN
const modalConfirm = document.getElementById('modalConfirm');
const confirmMessage = document.getElementById('confirmMessage');
const btnOkConfirm = document.getElementById('btnOkConfirm');
const btnCancelConfirm = document.getElementById('btnCancelConfirm');

let confirmCallback = null; // Variable para guardar la acción pendiente

// --- SISTEMA DE NOTIFICACIONES (TOASTS) ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'info') icon = 'ℹ️';

    toast.innerHTML = `<span class="toast-icon">${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastExit 0.4s forwards';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// --- SISTEMA DE CONFIRMACIÓN CUSTOM ---
function showConfirm(mensaje, accionSi) {
    confirmMessage.textContent = mensaje;
    confirmCallback = accionSi; // Guardamos la función a ejecutar
    modalConfirm.classList.remove('hidden');
}

// Listeners del Modal de Confirmación
btnOkConfirm.addEventListener('click', () => {
    if (confirmCallback) confirmCallback(); // Ejecutar la acción guardada
    modalConfirm.classList.add('hidden');
    confirmCallback = null; // Limpiar
});

btnCancelConfirm.addEventListener('click', () => {
    modalConfirm.classList.add('hidden');
    confirmCallback = null;
});


// 1. SEGURIDAD Y CARGA INICIAL
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        userDisplay.textContent = user.email.split('@')[0]; 
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
    checkRemindersForTomorrow();
}

function mostrarFecha() {
    const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const fecha = new Date().toLocaleDateString('es-ES', opciones);
    dateDisplay.textContent = fecha.charAt(0).toUpperCase() + fecha.slice(1);
}

// ==========================================
// 2. MÓDULO DE NOTAS
// ==========================================

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
            // CAMBIO: Ahora llama a nuestra función wrapper, no borra directo
            btnDel.onclick = () => solicitarBorrarNota(id); 

            div.appendChild(check);
            div.appendChild(text);
            div.appendChild(btnDel);
            notesList.appendChild(div);
        });
    });
}

// Función Intermedia para activar el Modal
function solicitarBorrarNota(id) {
    showConfirm("¿Deseas eliminar esta nota permanentemente?", async () => {
        // Esta es la 'accionSi' que se ejecuta al dar click en "Sí, Eliminar"
        try { 
            await deleteDoc(doc(db, "notes", id)); 
            showToast("Nota eliminada", "info");
        } catch(e) { 
            console.error(e); 
            showToast("Error al eliminar", "error");
        }
    });
}

btnSaveNote.addEventListener('click', async () => {
    const texto = noteInput.value.trim();
    if(!texto) {
        showToast("Escribe algo primero", "info");
        return;
    }

    const originalText = btnSaveNote.textContent;
    btnSaveNote.textContent = "Guardando...";
    btnSaveNote.classList.add('btn-loading');

    try {
        await addDoc(collection(db, "notes"), {
            text: texto,
            completed: false,
            createdAt: new Date()
        });
        noteInput.value = '';
        newNoteForm.classList.add('hidden');
        showToast("Nota agregada", "success");
    } catch(e) { 
        console.error(e); 
        showToast("Error al guardar", "error");
    } finally {
        btnSaveNote.textContent = originalText;
        btnSaveNote.classList.remove('btn-loading');
    }
});

async function toggleNota(id, estado) {
    try {
        await updateDoc(doc(db, "notes", id), { completed: estado });
    } catch(e) { console.error(e); }
}

btnAddNoteToggle.addEventListener('click', () => {
    newNoteForm.classList.remove('hidden');
    noteInput.focus();
});
btnCancelNote.addEventListener('click', () => newNoteForm.classList.add('hidden'));


// ==========================================
// 3. ESTADÍSTICAS Y AGENDA
// ==========================================

async function cargarEstadisticas() {
    try {
        const q = query(collection(db, "students"), where("status", "==", "inscrito"));
        const snap = await getDocs(q);
        statAlumnos.textContent = snap.size;
    } catch(e) { console.error(e); }
}

async function cargarAgendaHoy() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const todayStr = (new Date(now - offset)).toISOString().split('T')[0];
    
    const diasMap = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const diaSemanaTexto = diasMap[now.getDay()];

    todayLabel.textContent = `Eventos para: ${todayStr} (${diaSemanaTexto})`;

    try {
        const q = query(collection(db, "classes"));
        const snap = await getDocs(q);
        
        let eventosHoy = [];

        snap.forEach(docSnap => {
            const ev = docSnap.data();
            let esHoy = false;

            if (ev.cancelaciones && ev.cancelaciones.includes(todayStr)) return;
            if (ev.fechaFin && todayStr > ev.fechaFin) return;

            if (ev.type === 'fija' && ev.dayOfWeek === diaSemanaTexto) esHoy = true;
            if (ev.type !== 'fija' && ev.date === todayStr) esHoy = true;

            if (esHoy) eventosHoy.push(ev);
        });

        eventosHoy.sort((a,b) => a.time.localeCompare(b.time));
        statClasesHoy.textContent = eventosHoy.length;

        todayList.innerHTML = '';
        if (eventosHoy.length === 0) {
            todayList.innerHTML = '<div style="text-align:center; padding:20px; color:#999;">No hay clases hoy. ¡Día libre! ☀️</div>';
            return;
        }

        eventosHoy.forEach(ev => {
            const div = document.createElement('div');
            div.className = 'today-item';
            
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

// ==========================================
// 4. RECORDATORIOS WHATSAPP
// ==========================================

async function checkRemindersForTomorrow() {
    if(!listaRecordatorios) return;

    listaRecordatorios.innerHTML = '<p style="color:#666; font-size:12px;">Buscando recordatorios...</p>';

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const offset = tomorrow.getTimezoneOffset() * 60000;
    const tomorrowStr = (new Date(tomorrow - offset)).toISOString().split('T')[0];

    try {
        const qClases = query(
            collection(db, "classes"), 
            where("date", "==", tomorrowStr),
            where("type", "==", "muestra")
        );
        
        const snapClases = await getDocs(qClases);
        
        if (snapClases.empty) {
            listaRecordatorios.innerHTML = '<div style="color:#2e7d32; font-size:13px;">✅ No hay clases muestra para mañana.</div>';
            return;
        }

        listaRecordatorios.innerHTML = '';

        for (const docClase of snapClases.docs) {
            const clase = docClase.data();
            let telefono = "";
            let nombreTutor = "";

            if (clase.studentId) {
                try {
                    const docStudent = await getDoc(doc(db, "students", clase.studentId));
                    if (docStudent.exists()) {
                        const sData = docStudent.data();
                        telefono = sData.telefono;
                        nombreTutor = sData.nombreTutor;
                    }
                } catch(err) { console.error(err); }
            }

            const card = document.createElement('div');
            card.style.cssText = "display:flex; justify-content:space-between; align-items:center; background:#f1f8e9; padding:8px; border-radius:6px; border:1px solid #c8e6c9; margin-bottom:5px;";

            if (telefono) {
                const phoneClean = telefono.replace(/\D/g, ''); 
                const [h, m] = clase.time.split(':');
                const ampm = h >= 12 ? 'PM' : 'AM';
                const horaAmPm = `${h%12||12}:${m} ${ampm}`;

                const mensaje = `Hola ${nombreTutor || clase.studentName}, le recordamos la clase muestra de *${clase.instrument}* para *${clase.studentName}* mañana a las *${horaAmPm}* en Academia Moncayo. 🎹`;
                const linkWhatsapp = `https://wa.me/52${phoneClean}?text=${encodeURIComponent(mensaje)}`;
                
                card.innerHTML = `
                    <div style="font-size:12px;">
                        <strong>${clase.studentName}</strong><br>
                        <span style="color:#555;">⏰ ${clase.time} - ${clase.instrument}</span>
                    </div>
                    <a href="${linkWhatsapp}" target="_blank" title="Enviar WhatsApp" style="background:#25D366; color:white; text-decoration:none; padding:5px 10px; border-radius:15px; font-weight:bold; font-size:12px;">
                        📲 Enviar
                    </a>
                `;
            } else {
                card.innerHTML = `<div style="font-size:12px; color:red;">⚠️ ${clase.studentName}: Sin teléfono.</div>`;
            }
            listaRecordatorios.appendChild(card);
        }

    } catch (error) {
        console.error("Error recordatorios:", error);
        listaRecordatorios.innerHTML = '<p style="color:red;">Error cargando.</p>';
    }
}