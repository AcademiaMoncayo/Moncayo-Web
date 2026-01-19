import { db, auth } from './firebase-config.js';
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- DOM ---
const tableBody = document.getElementById('tableBody');
const searchInput = document.getElementById('searchInput');
const filterStatus = document.getElementById('filterStatus');

// Modales
const modalContainer = document.getElementById('modalContainer'); 
const modalEditar = document.getElementById('modalEditar'); 
const modalAlumnos = document.getElementById('modalAlumnos');

const formTeacher = document.getElementById('formTeacher');
const formEditar = document.getElementById('formEditar');

// Paginación Principal
const btnPrevPage = document.getElementById('btnPrevPage');
const btnNextPage = document.getElementById('btnNextPage');
const pageIndicator = document.getElementById('pageIndicator');

// Paginación Interna
const btnModalPrev = document.getElementById('btnModalPrev');
const btnModalNext = document.getElementById('btnModalNext');
const lblModalPage = document.getElementById('lblModalPage');

// CONFIRMACIÓN CUSTOM
const modalConfirm = document.getElementById('modalConfirm');
const confirmTitle = document.getElementById('confirmTitle');
const confirmMessage = document.getElementById('confirmMessage');
const btnOkConfirm = document.getElementById('btnOkConfirm');
const btnCancelConfirm = document.getElementById('btnCancelConfirm');
let confirmCallback = null;

let allTeachers = []; 
let allClasses = []; 
let currentPage = 1;
const rowsPerPage = 20;

let modalFijas = [];
let modalHistorial = [];
let modalPage = 1;
const modalLimit = 10; 

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

// 1. SEGURIDAD
onAuthStateChanged(auth, (user) => {
    if (!user) window.location.href = "index.html";
    else loadData();
});

// 2. CARGAR DATOS
async function loadData() {
    tableBody.innerHTML = '<tr><td colspan="7">Cargando datos...</td></tr>';
    try {
        const qTeachers = query(collection(db, "teachers"), orderBy("nombre"));
        const snapTeachers = await getDocs(qTeachers);
        allTeachers = [];
        snapTeachers.forEach((doc) => allTeachers.push({ id: doc.id, ...doc.data() }));

        const qClasses = query(collection(db, "classes"));
        const snapClasses = await getDocs(qClasses);
        allClasses = [];
        snapClasses.forEach((doc) => allClasses.push({ id: doc.id, ...doc.data() }));

        renderTable();
    } catch (error) {
        console.error("Error:", error);
        showToast("Error de conexión", "error");
        tableBody.innerHTML = '<tr><td colspan="7">Error de conexión.</td></tr>';
    }
}

// 3. RENDERIZAR TABLA PRINCIPAL
function renderTable() {
    const textoBusqueda = searchInput.value.toLowerCase();
    const filtro = filterStatus.value;
    
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const todayStr = (new Date(now - offset)).toISOString().split('T')[0];

    const listaFiltrada = allTeachers.filter(maestro => {
        const coincideEstado = (filtro === 'todos') || (maestro.status === filtro);
        const coincideNombre = maestro.nombre.toLowerCase().includes(textoBusqueda);
        return coincideEstado && coincideNombre;
    });

    const totalPages = Math.ceil(listaFiltrada.length / rowsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    
    const startIndex = (currentPage - 1) * rowsPerPage;
    const itemsPagina = listaFiltrada.slice(startIndex, startIndex + rowsPerPage);

    tableBody.innerHTML = '';
    if (itemsPagina.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px; color:#888;">No hay maestros registrados.</td></tr>';
        return;
    }

    itemsPagina.forEach(maestro => {
        const fila = document.createElement('tr');
        const claseStatus = maestro.status === 'activo' ? 'tag-inscrito' : 'tag-inactivo';

        let fijos = 0;
        let muestrasPasadas = 0;
        let muestrasFuturas = 0;

        const susClases = allClasses.filter(c => c.teacherId === maestro.id);

        susClases.forEach(c => {
            if (c.type === 'fija') {
                if (!c.fechaFin || c.fechaFin >= todayStr) fijos++;
            } else if (c.type === 'muestra') {
                if (c.date < todayStr) muestrasPasadas++; 
                else muestrasFuturas++; 
            }
        });

        let htmlInstrumentos = '';
        let listaInst = Array.isArray(maestro.instrumentos) ? maestro.instrumentos : (maestro.instrumentos ? maestro.instrumentos.split(',') : []);
        listaInst.forEach(inst => htmlInstrumentos += `<span class="badge-instrumento">${inst.trim()}</span>`);

        let htmlDias = '';
        const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        diasSemana.forEach(dia => {
            const activo = maestro.diasDisponibles && maestro.diasDisponibles.includes(dia);
            if (activo) htmlDias += `<span class="badge-dia active">${dia}</span>`;
        });

        const htmlStats = `
            <div class="stats-container">
                <div class="stat-row"><span class="stat-label">👥 Alumnos Fijos</span><span class="num-fijos">${fijos}</span></div>
                <div class="stat-row"><span class="stat-label">✨ Muestras Pendientes</span><span class="num-futuras">${muestrasFuturas}</span></div>
                <div class="stat-row"><span class="stat-label">📜 Muestras Pasadas</span><span class="num-pasadas">${muestrasPasadas}</span></div>
            </div>
        `;

        const passwordDisplay = `
            <span class="pass-hidden">••••••</span>
            <button class="toggle-password" onclick="alert('Usuario: ${maestro.usuario}\\nContraseña: ${maestro.password}')">👁️</button>
        `;

        fila.innerHTML = `
            <td><strong>${maestro.nombre}</strong></td>
            <td><div style="font-size:12px; color:#666;">User: ${maestro.usuario}</div>${passwordDisplay}</td>
            <td>${htmlInstrumentos}</td>
            <td>${htmlDias}</td>
            <td>${htmlStats}</td>
            <td><span class="tag ${claseStatus}">${maestro.status.toUpperCase()}</span></td>
            <td>
                <div class="actions-cell">
                    <button class="btn-view" data-id="${maestro.id}" title="Ver Clases">📋</button>
                    <button class="btn-edit" data-id="${maestro.id}" title="Editar">✏️</button>
                    <button class="btn-archive" data-id="${maestro.id}" data-status="${maestro.status}" title="Activar/Desactivar">🔄</button>
                </div>
            </td>
        `;
        tableBody.appendChild(fila);
    });

    asignarEventos();
    pageIndicator.textContent = `Página ${currentPage} de ${totalPages}`;
    btnPrevPage.disabled = currentPage === 1;
    btnNextPage.disabled = currentPage === totalPages;
}

// 4. LISTENERS TABLA
function asignarEventos() {
    document.querySelectorAll('.btn-view').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const maestro = allTeachers.find(t => t.id === e.currentTarget.dataset.id);
            abrirModalAlumnos(maestro);
        });
    });

    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const maestro = allTeachers.find(t => t.id === e.currentTarget.dataset.id);
            abrirModalEditar(maestro);
        });
    });

    // CAMBIO DE ESTADO (CON CONFIRMACIÓN)
    document.querySelectorAll('.btn-archive').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            const statusActual = e.currentTarget.dataset.status;
            const nuevoStatus = statusActual === 'activo' ? 'inactivo' : 'activo';
            
            showConfirm("Cambiar Estado", `¿Cambiar estado a ${nuevoStatus.toUpperCase()}?`, async () => {
                try {
                    await updateDoc(doc(db, "teachers", id), { status: nuevoStatus });
                    loadData();
                    showToast("Estado actualizado", "info");
                } catch(err) { showToast("Error al actualizar", "error"); }
            });
        });
    });
}

// 5. GUARDAR NUEVO
formTeacher.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = formTeacher.querySelector('button[type="submit"]');
    btnSubmit.classList.add('btn-loading');

    const diasCheck = document.querySelectorAll('input[name="dias"]:checked');
    const diasSeleccionados = Array.from(diasCheck).map(cb => cb.value);
    const instCheck = document.querySelectorAll('input[name="instrumentos"]:checked');
    const instSeleccionados = Array.from(instCheck).map(cb => cb.value);

    if (instSeleccionados.length === 0) { 
        showToast("Selecciona al menos un instrumento", "error"); 
        btnSubmit.classList.remove('btn-loading');
        return; 
    }

    const nuevo = {
        nombre: document.getElementById('newNombre').value.trim(),
        usuario: document.getElementById('newUsuario').value.trim(),
        password: document.getElementById('newPassword').value.trim(),
        instrumentos: instSeleccionados,
        diasDisponibles: diasSeleccionados,
        status: "activo", 
        alumnosCount: 0,
        fechaRegistro: new Date()
    };

    try {
        await addDoc(collection(db, "teachers"), nuevo);
        modalContainer.classList.add('hidden');
        formTeacher.reset();
        loadData();
        showToast("Maestro agregado exitosamente", "success");
    } catch (error) { 
        console.error(error); 
        showToast("Error al guardar", "error"); 
    } finally {
        btnSubmit.classList.remove('btn-loading');
    }
});

// 6. EDITAR MAESTRO
function abrirModalEditar(maestro) {
    document.getElementById('editId').value = maestro.id;
    document.getElementById('editStatus').value = maestro.status;
    document.getElementById('editNombre').value = maestro.nombre;
    document.getElementById('editUsuario').value = maestro.usuario;
    document.getElementById('editPassword').value = maestro.password;

    document.querySelectorAll('input[name="editDias"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('input[name="editInstrumentos"]').forEach(cb => cb.checked = false);

    if(maestro.diasDisponibles) {
        document.querySelectorAll('input[name="editDias"]').forEach(cb => {
            if(maestro.diasDisponibles.includes(cb.value)) cb.checked = true;
        });
    }
    const misInstrumentos = Array.isArray(maestro.instrumentos) ? maestro.instrumentos : [];
    document.querySelectorAll('input[name="editInstrumentos"]').forEach(cb => {
        if(misInstrumentos.includes(cb.value)) cb.checked = true;
    });

    modalEditar.classList.remove('hidden');
}

formEditar.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = formEditar.querySelector('button[type="submit"]');
    btnSubmit.classList.add('btn-loading');

    const id = document.getElementById('editId').value;
    const diasCheck = document.querySelectorAll('input[name="editDias"]:checked');
    const diasSeleccionados = Array.from(diasCheck).map(cb => cb.value);
    const instCheck = document.querySelectorAll('input[name="editInstrumentos"]:checked');
    const instSeleccionados = Array.from(instCheck).map(cb => cb.value);

    const datos = {
        nombre: document.getElementById('editNombre').value.trim(),
        usuario: document.getElementById('editUsuario').value.trim(),
        password: document.getElementById('editPassword').value.trim(),
        instrumentos: instSeleccionados,
        diasDisponibles: diasSeleccionados
    };

    try {
        await updateDoc(doc(db, "teachers", id), datos);
        modalEditar.classList.add('hidden');
        loadData();
        showToast("Datos actualizados", "success");
    } catch (error) { 
        console.error(error); 
        showToast("Error al actualizar", "error"); 
    } finally {
        btnSubmit.classList.remove('btn-loading');
    }
});

// 7. PAGINACIÓN INTERNA DEL MODAL
function abrirModalAlumnos(maestro) {
    document.getElementById('tituloMaestro').textContent = `Maestro: ${maestro.nombre}`;
    
    const misClases = allClasses.filter(c => c.teacherId === maestro.id);
    document.getElementById('subtituloMaestro').textContent = `Total registros históricos: ${misClases.length}`;

    modalFijas = misClases.filter(c => c.type === 'fija' && (!c.fechaFin)); 
    modalHistorial = misClases.filter(c => c.type !== 'fija' || c.fechaFin); 

    const mapDias = { 'Lun': 1, 'Mar': 2, 'Mié': 3, 'Jue': 4, 'Vie': 5, 'Sáb': 6, 'Dom': 7 };
    modalFijas.sort((a, b) => {
        const diaA = mapDias[a.dayOfWeek] || 99;
        const diaB = mapDias[b.dayOfWeek] || 99;
        if (diaA !== diaB) return diaA - diaB; 
        return a.time.localeCompare(b.time);   
    });
    modalHistorial.sort((a, b) => new Date(b.date) - new Date(a.date));

    modalPage = 1;
    renderModalPage();
    modalAlumnos.classList.remove('hidden');
}

function renderModalPage() {
    const tbodyFijas = document.getElementById('tablaFijas');
    const tbodyHistorial = document.getElementById('tablaHistorial');

    const totalItems = Math.max(modalFijas.length, modalHistorial.length);
    const totalPages = Math.ceil(totalItems / modalLimit) || 1;

    if (modalPage > totalPages) modalPage = totalPages;
    if (modalPage < 1) modalPage = 1;

    const start = (modalPage - 1) * modalLimit;
    const end = start + modalLimit;

    // Fijas
    tbodyFijas.innerHTML = '';
    const sliceFijas = modalFijas.slice(start, end);
    
    if (modalFijas.length === 0) {
        tbodyFijas.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#999;">Sin clases fijas.</td></tr>';
    } else if (sliceFijas.length === 0 && modalPage > 1) {
        tbodyFijas.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#ddd;">(Ver páginas anteriores)</td></tr>';
    } else {
        sliceFijas.forEach(c => {
            const row = document.createElement('tr');
            row.className = 'row-fija';
            const [h, m] = c.time.split(':');
            const ampm = h >= 12 ? 'PM' : 'AM';
            const horaStr = `${h%12||12}:${m} ${ampm}`;

            row.innerHTML = `
                <td><span class="badge-dia active" style="font-size:11px; width:auto; padding:2px 8px; border-radius:4px;">${c.dayOfWeek}</span></td>
                <td style="font-weight:bold;">${horaStr}</td>
                <td>${c.studentName}</td>
                <td><span class="badge-instrumento">${c.instrument}</span></td>
            `;
            tbodyFijas.appendChild(row);
        });
    }

    // Historial
    tbodyHistorial.innerHTML = '';
    const sliceHistorial = modalHistorial.slice(start, end);

    if (modalHistorial.length === 0) {
        tbodyHistorial.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#999;">Sin historial.</td></tr>';
    } else if (sliceHistorial.length === 0 && modalPage > 1) {
        tbodyHistorial.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#ddd;">(Fin del historial)</td></tr>';
    } else {
        sliceHistorial.forEach(c => {
            const row = document.createElement('tr');
            let badgeTipo = '';
            if(c.type === 'muestra') badgeTipo = '<span class="badge-type badge-muestra">Muestra</span>';
            else if(c.type === 'unica') badgeTipo = '<span class="badge-type badge-unica">Única</span>';
            else badgeTipo = '<span class="badge-type" style="background:#eee;">Baja</span>';

            const [h, m] = c.time.split(':');
            const ampm = h >= 12 ? 'PM' : 'AM';

            row.innerHTML = `
                <td>${c.date}</td>
                <td>${badgeTipo}</td>
                <td>${h%12||12}:${m} ${ampm}</td>
                <td>${c.studentName}</td>
                <td>${c.instrument}</td>
            `;
            tbodyHistorial.appendChild(row);
        });
    }

    lblModalPage.textContent = `Página ${modalPage} de ${totalPages}`;
    btnModalPrev.disabled = modalPage === 1;
    btnModalNext.disabled = modalPage === totalPages;
}

btnModalPrev.addEventListener('click', () => { 
    if(modalPage > 1) { modalPage--; renderModalPage(); }
});

btnModalNext.addEventListener('click', () => {
    const totalItems = Math.max(modalFijas.length, modalHistorial.length);
    const totalPages = Math.ceil(totalItems / modalLimit) || 1;
    if(modalPage < totalPages) { modalPage++; renderModalPage(); }
});

// UI Listeners Globales
document.getElementById('btnOpenModal').addEventListener('click', () => modalContainer.classList.remove('hidden'));
document.getElementById('btnCloseModal').addEventListener('click', () => modalContainer.classList.add('hidden'));
document.getElementById('btnCloseEditar').addEventListener('click', () => modalEditar.classList.add('hidden'));

if(document.getElementById('btnCloseAlumnos')) {
    document.getElementById('btnCloseAlumnos').addEventListener('click', () => document.getElementById('modalAlumnos').classList.add('hidden'));
}
if(document.getElementById('btnCerrarDetalle')) {
    document.getElementById('btnCerrarDetalle').addEventListener('click', () => document.getElementById('modalAlumnos').classList.add('hidden'));
}

searchInput.addEventListener('input', () => { currentPage = 1; renderTable(); });
filterStatus.addEventListener('change', () => { currentPage = 1; renderTable(); });
btnPrevPage.addEventListener('click', () => { if(currentPage>1) currentPage--; renderTable(); });
btnNextPage.addEventListener('click', () => { currentPage++; renderTable(); });