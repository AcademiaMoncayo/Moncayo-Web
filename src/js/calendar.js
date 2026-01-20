import { db, auth } from './firebase-config.js';
import { collection, getDocs, query, where, addDoc, onSnapshot, doc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// DOM GENERAL
const calendarDate = document.getElementById('calendarDate');
const headerRow = document.getElementById('headerRow');
const calendarBody = document.getElementById('calendarBody');

// DOM MODAL
const modalEvent = document.getElementById('modalEvent');
const btnNewEvent = document.getElementById('btnNewEvent');
const btnCloseEvent = document.getElementById('btnCloseEvent');
const formEvent = document.getElementById('formEvent');

// DOM FORMULARIO
const eventType = document.getElementById('eventType');
const eventInstrument = document.getElementById('eventInstrument');
const eventTeacher = document.getElementById('eventTeacher');
const eventStudentInput = document.getElementById('eventStudentInput');
const listStudents = document.getElementById('listStudents');
const eventStudentId = document.getElementById('eventStudentId');
const eventDate = document.getElementById('eventDate');
const eventTime = document.getElementById('eventTime');

// CONFIRMACIÓN CUSTOM
const modalConfirm = document.getElementById('modalConfirm');
const confirmTitle = document.getElementById('confirmTitle');
const confirmMessage = document.getElementById('confirmMessage');
const btnOkConfirm = document.getElementById('btnOkConfirm');
const btnCancelConfirm = document.getElementById('btnCancelConfirm');
let confirmCallback = null;

// DATOS EN MEMORIA
let allTeachers = [];
let allStudents = [];
let allEvents = []; 

// --- UTILS UI (TOASTS & CONFIRM) ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if(!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✅' : (type === 'error' ? '❌' : 'ℹ️');
    toast.innerHTML = `<span class="toast-icon">${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'toastExit 0.4s forwards';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

function showConfirm(title, msg, callback) {
    confirmTitle.textContent = title;
    confirmMessage.textContent = msg;
    confirmCallback = callback;
    modalConfirm.classList.remove('hidden');
}

btnOkConfirm.addEventListener('click', () => {
    if(confirmCallback) confirmCallback();
    modalConfirm.classList.add('hidden');
    confirmCallback = null;
});
btnCancelConfirm.addEventListener('click', () => {
    modalConfirm.classList.add('hidden');
    confirmCallback = null;
});

// --- FUNCIÓN AUXILIAR ZONA HORARIA ---
function getLocalDateString() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000; 
    const localDate = new Date(now - offset);
    return localDate.toISOString().split('T')[0];
}

// 1. SEGURIDAD E INICIO
onAuthStateChanged(auth, (user) => {
    if (!user) window.location.href = "index.html";
    else {
        calendarDate.value = getLocalDateString(); 
        loadInitialData();
    }
});

// 2. CARGA DE DATOS
async function loadInitialData() {
    try {
        const qTeachers = query(collection(db, "teachers"), where("status", "==", "activo"));
        const snapTeachers = await getDocs(qTeachers);
        allTeachers = [];
        snapTeachers.forEach(doc => allTeachers.push({ id: doc.id, ...doc.data() }));
        allTeachers.sort((a,b) => a.nombre.localeCompare(b.nombre));

        const qStudents = query(collection(db, "students")); 
        const snapStudents = await getDocs(qStudents);
        allStudents = [];
        snapStudents.forEach(doc => allStudents.push({ id: doc.id, ...doc.data() }));

        onSnapshot(collection(db, "classes"), (snapshot) => {
            allEvents = [];
            snapshot.forEach(doc => allEvents.push({ id: doc.id, ...doc.data() }));
            renderCalendar();
            if (!modalEvent.classList.contains('hidden')) actualizarHorariosDisponibles();
        });

        renderCalendarStructure();
    } catch (error) {
        console.error("Error:", error);
        showToast("Error de conexión", "error");
    }
}

// 3. RENDERIZAR ESTRUCTURA
function renderCalendarStructure() {
    let htmlHeader = '<th class="time-col-header">Horario</th>';
    allTeachers.forEach(t => {
        htmlHeader += `<th>${t.nombre}</th>`;
    });
    headerRow.innerHTML = htmlHeader;

    calendarBody.innerHTML = '';
    const horas = ["14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];
    
    horas.forEach(hora => {
        const tr = document.createElement('tr');
        const tdTime = document.createElement('td');
        tdTime.className = 'time-cell';
        tdTime.textContent = formatTime(hora);
        tr.appendChild(tdTime);

        allTeachers.forEach(maestro => {
            const tdSlot = document.createElement('td');
            tdSlot.className = 'slot-cell';
            tdSlot.dataset.teacherId = maestro.id;
            tdSlot.dataset.time = hora;
            tdSlot.id = `slot-${maestro.id}-${hora.replace(':','')}`; 
            tr.appendChild(tdSlot);
        });
        calendarBody.appendChild(tr);
    });
}

// 4. RENDERIZAR EVENTOS
function renderCalendar() {
    document.querySelectorAll('.slot-cell').forEach(td => td.innerHTML = '');

    const fechaActualStr = calendarDate.value; 
    const fechaObj = new Date(fechaActualStr + 'T12:00:00');
    const diasMap = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const diaSemanaTexto = diasMap[fechaObj.getDay()];

    allEvents.forEach(evento => {
        let mostrar = false;

        if (evento.cancelaciones && evento.cancelaciones.includes(fechaActualStr)) return;
        if (evento.fechaFin && fechaActualStr > evento.fechaFin) return;

        if (evento.type === 'fija') {
            if (evento.dayOfWeek === diaSemanaTexto) mostrar = true;
        } else {
            if (evento.date === fechaActualStr) mostrar = true;
        }

        if (mostrar) {
            const cellId = `slot-${evento.teacherId}-${evento.time.replace(':','')}`;
            const celda = document.getElementById(cellId);
            
            if (celda) {
                const card = document.createElement('div');
                card.className = `class-card type-${evento.type}`;
                
                let botonesHtml = '';
                if (evento.type === 'fija') {
                    botonesHtml = `
                        <div class="card-actions">
                            <button class="btn-mini-action act-edit" onclick="editarEvento('${evento.id}')" title="Editar">✏️</button>
                            <button class="btn-mini-action act-delete-day" onclick="cancelarSoloHoy('${evento.id}')" title="Cancelar hoy">❌</button>
                            <button class="btn-mini-action act-delete-all" onclick="bajaHorario('${evento.id}')" title="Baja Definitiva">🗑️</button>
                        </div>`;
                } else {
                    botonesHtml = `
                        <div class="card-actions">
                            <button class="btn-mini-action act-edit" onclick="editarEvento('${evento.id}')" title="Editar">✏️</button>
                            <button class="btn-mini-action act-delete-all" onclick="cancelarSoloHoy('${evento.id}')" title="Eliminar">🗑️</button>
                        </div>`;
                }

                const labelMap = { 'fija': '🔄 Fija', 'muestra': '✨ Muestra', 'unica': '📅 Única', 'junta': '🤝 Junta' };
                const labelTipo = labelMap[evento.type] || evento.type;
                const htmlNota = evento.note ? `<div class="card-note">📝 ${evento.note}</div>` : '';

                card.innerHTML = `
                    ${botonesHtml}
                    <div class="card-type">${labelTipo}</div>
                    <div class="card-student">${evento.studentName}</div>
                    <div class="card-instrument">🎵 ${evento.instrument}</div>
                    ${htmlNota}
                `;
                celda.appendChild(card);
            }
        }
    });
}

// 5. VALIDACIÓN CONFLICTOS
function actualizarHorariosDisponibles() {
    const teacherId = eventTeacher.value;
    const fechaVal = eventDate.value;
    const idEdicion = document.getElementById('editEventId').value;

    eventTime.innerHTML = '<option value="">-- Selecciona Horario --</option>';
    
    if (!teacherId || !fechaVal) return;

    const fechaObj = new Date(fechaVal + 'T12:00:00');
    const diasMap = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const diaSemana = diasMap[fechaObj.getDay()];

    const maestroData = allTeachers.find(t => t.id === teacherId);
    
    if (maestroData && maestroData.diasDisponibles) {
        if (!maestroData.diasDisponibles.includes(diaSemana)) {
            const option = document.createElement('option');
            option.textContent = `⛔ ${maestroData.nombre} no trabaja los ${diaSemana}`;
            option.disabled = true;
            option.style.color = "red";
            option.style.fontWeight = "bold";
            eventTime.appendChild(option);
            return;
        }
    }

    const horasPosibles = ["14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];

    horasPosibles.forEach(hora => {
        const ocupadoPor = allEvents.find(ev => {
            if (idEdicion && ev.id === idEdicion) return false;

            if (ev.teacherId !== teacherId) return false;
            if (ev.time !== hora) return false;
            if (ev.cancelaciones && ev.cancelaciones.includes(fechaVal)) return false;
            if (ev.fechaFin && fechaVal > ev.fechaFin) return false;

            if (ev.type === 'fija' && ev.dayOfWeek === diaSemana) return true;
            if (ev.type !== 'fija' && ev.date === fechaVal) return true;

            return false;
        });

        const option = document.createElement('option');
        option.value = hora;
        
        if (ocupadoPor) {
            option.textContent = `🔴 ${formatTime(hora)} - Ocupado`;
            option.disabled = true;
            option.style.color = "#dc3545";
        } else {
            option.textContent = `🟢 ${formatTime(hora)} - Disponible`;
            option.style.color = "#28a745";
        }
        eventTime.appendChild(option);
    });
}

// 6. FUNCIONES GLOBALES (CON MODALES)
window.editarEvento = (idEvento) => {
    const evento = allEvents.find(e => e.id === idEvento);
    if (!evento) return;

    document.getElementById('editEventId').value = idEvento; 
    document.querySelector('#modalEvent h3').textContent = "✏️ Editar Evento"; 
    
    eventDate.value = evento.date; 
    eventType.value = evento.type;
    eventType.dispatchEvent(new Event('change')); 

    eventInstrument.value = evento.instrument;
    eventInstrument.disabled = false;
    eventInstrument.dispatchEvent(new Event('change'));

    eventTeacher.value = evento.teacherId;
    eventTeacher.disabled = false;

    actualizarHorariosDisponibles();

    eventTime.value = evento.time;
    eventStudentInput.value = evento.studentName;
    eventStudentId.value = evento.studentId;
    document.getElementById('eventNote').value = evento.note || '';

    modalEvent.classList.remove('hidden');
};

window.cancelarSoloHoy = async (idEvento) => {
    const fechaActual = calendarDate.value;
    showConfirm("Cancelar Clase", `¿Cancelar la clase del ${fechaActual}?`, async () => {
        try {
            await updateDoc(doc(db, "classes", idEvento), { cancelaciones: arrayUnion(fechaActual) });
            showToast("Clase cancelada por hoy", "info");
        } catch(e) { showToast("Error al cancelar", "error"); }
    });
};

window.bajaHorario = async (idEvento) => {
    const fechaActual = calendarDate.value;
    const hoy = new Date(fechaActual);
    hoy.setDate(hoy.getDate() - 1); 
    const fechaAyer = hoy.toISOString().split('T')[0];

    showConfirm("⚠️ Baja Definitiva", "¿Eliminar este horario de forma permanente?", async () => {
        try {
            await updateDoc(doc(db, "classes", idEvento), { fechaFin: fechaAyer });
            showToast("Horario dado de baja", "success");
        } catch(e) { showToast("Error al dar de baja", "error"); }
    });
};

// 7. LISTENERS FORMULARIO
eventType.addEventListener('change', () => {
    const tipo = eventType.value;
    if(tipo) {
        eventInstrument.disabled = false;
        eventStudentInput.disabled = false;
        
        listStudents.innerHTML = '';
        let alumnosFiltrados = [];
        if (tipo === 'fija') alumnosFiltrados = allStudents.filter(s => s.status === 'inscrito');
        else if (tipo === 'muestra') alumnosFiltrados = allStudents.filter(s => s.status === 'prospecto');
        else alumnosFiltrados = allStudents;

        alumnosFiltrados.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.nombre; 
            opt.dataset.id = s.id; 
            listStudents.appendChild(opt);
        });
    } else {
        eventInstrument.disabled = true; eventTeacher.disabled = true; eventStudentInput.disabled = true;
    }
});

eventInstrument.addEventListener('change', () => {
    const inst = eventInstrument.value;
    eventTeacher.innerHTML = '<option value="">-- Selecciona --</option>';
    if (inst) {
        eventTeacher.disabled = false;
        const maestrosAptos = allTeachers.filter(m => {
            if (Array.isArray(m.instrumentos)) return m.instrumentos.includes(inst);
            if (typeof m.instrumentos === 'string') return m.instrumentos.includes(inst);
            return false;
        });
        maestrosAptos.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = m.nombre;
            eventTeacher.appendChild(opt);
        });
    } else {
        eventTeacher.disabled = true;
    }
    actualizarHorariosDisponibles();
});

eventTeacher.addEventListener('change', actualizarHorariosDisponibles);
eventDate.addEventListener('change', actualizarHorariosDisponibles);

eventStudentInput.addEventListener('input', () => {
    const val = eventStudentInput.value;
    const optionFound = Array.from(listStudents.options).find(o => o.value === val);
    if (optionFound) {
        const alumnoReal = allStudents.find(s => s.nombre === val);
        if(alumnoReal) eventStudentId.value = alumnoReal.id;
    } else {
        eventStudentId.value = "";
    }
});

formEvent.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = formEvent.querySelector('button[type="submit"]');
    btnSubmit.classList.add('btn-loading');

    const idEdicion = document.getElementById('editEventId').value;
    const type = eventType.value;
    
    if (type !== 'junta' && !eventStudentId.value) { 
        showToast("Selecciona un alumno válido", "error"); 
        btnSubmit.classList.remove('btn-loading');
        return; 
    }
    if (eventTime.options[eventTime.selectedIndex].disabled) { 
        showToast("Horario ocupado", "error"); 
        btnSubmit.classList.remove('btn-loading');
        return; 
    }

    const fechaObj = new Date(eventDate.value + 'T12:00:00');
    const diasMap = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const diaSemanaTexto = diasMap[fechaObj.getDay()];

    const datosEvento = {
        type: type,
        instrument: eventInstrument.value,
        teacherId: eventTeacher.value,
        teacherName: eventTeacher.options[eventTeacher.selectedIndex].text,
        date: eventDate.value,
        time: eventTime.value,
        dayOfWeek: diaSemanaTexto,
        studentName: eventStudentInput.value,
        studentId: eventStudentId.value || 'N/A',
        note: document.getElementById('eventNote').value,
        createdAt: idEdicion ? undefined : new Date() 
    };
    if (datosEvento.createdAt === undefined) delete datosEvento.createdAt;

    try {
        if (idEdicion) {
            await updateDoc(doc(db, "classes", idEdicion), datosEvento);
            showToast("Evento actualizado", "success");
        } else {
            datosEvento.cancelaciones = [];
            datosEvento.fechaFin = null;
            datosEvento.createdAt = new Date();
            await addDoc(collection(db, "classes"), datosEvento);
            showToast("Clase agendada", "success");
        }
        modalEvent.classList.add('hidden');
        formEvent.reset();
        document.getElementById('editEventId').value = ""; 
    } catch (error) { 
        console.error(error); 
        showToast("Error al guardar", "error"); 
    } finally {
        btnSubmit.classList.remove('btn-loading');
    }
});

function formatTime(hora24) {
    const [h, m] = hora24.split(':');
    const hNum = parseInt(h);
    const ampm = hNum >= 12 ? 'PM' : 'AM';
    const h12 = hNum % 12 || 12;
    return `${h12}:${m} ${ampm}`;
}

// Botones UI
btnNewEvent.addEventListener('click', () => {
    document.getElementById('editEventId').value = ""; 
    document.querySelector('#modalEvent h3').textContent = "Nuevo Evento / Clase";
    eventDate.value = calendarDate.value;
    formEvent.reset();
    eventType.value = ""; eventInstrument.value = ""; eventInstrument.disabled = true;
    eventTeacher.value = ""; eventTeacher.disabled = true; eventStudentInput.value = "";
    eventStudentInput.disabled = true; eventTime.innerHTML = '<option value="">-- Selecciona maestro --</option>';
    modalEvent.classList.remove('hidden');
    actualizarHorariosDisponibles();
});

btnCloseEvent.addEventListener('click', () => modalEvent.classList.add('hidden'));

// NAVEGACIÓN
calendarDate.addEventListener('change', renderCalendar);

document.getElementById('btnPrevDay').addEventListener('click', () => { 
    calendarDate.stepDown(); 
    calendarDate.dispatchEvent(new Event('change')); 
});

document.getElementById('btnNextDay').addEventListener('click', () => { 
    calendarDate.stepUp(); 
    calendarDate.dispatchEvent(new Event('change')); 
});

document.getElementById('btnToday').addEventListener('click', () => { 
    calendarDate.value = getLocalDateString(); 
    calendarDate.dispatchEvent(new Event('change')); 
});