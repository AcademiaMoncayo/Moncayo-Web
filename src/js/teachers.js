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

const formTeacher = document.getElementById('formTeacher');
const formEditar = document.getElementById('formEditar');

// Paginación
const btnPrevPage = document.getElementById('btnPrevPage');
const btnNextPage = document.getElementById('btnNextPage');
const pageIndicator = document.getElementById('pageIndicator');

let allTeachers = []; 
let allClasses = []; // NUEVO: Para guardar las clases y hacer conteos
let currentPage = 1;
const rowsPerPage = 20;

// 1. SEGURIDAD
onAuthStateChanged(auth, (user) => {
    if (!user) window.location.href = "index.html";
    else loadData();
});

// 2. CARGAR DATOS (MAESTROS Y CLASES)
async function loadData() {
    tableBody.innerHTML = '<tr><td colspan="7">Cargando datos y calculando estadísticas...</td></tr>';
    try {
        // A) Cargar Maestros
        const qTeachers = query(collection(db, "teachers"), orderBy("nombre"));
        const snapTeachers = await getDocs(qTeachers);
        allTeachers = [];
        snapTeachers.forEach((doc) => allTeachers.push({ id: doc.id, ...doc.data() }));

        // B) Cargar Clases (Para estadísticas)
        // Traemos todas para filtrar en memoria (más eficiente que hacer 1 query por maestro)
        const qClasses = query(collection(db, "classes"));
        const snapClasses = await getDocs(qClasses);
        allClasses = [];
        snapClasses.forEach((doc) => allClasses.push({ id: doc.id, ...doc.data() }));

        renderTable();
    } catch (error) {
        console.error("Error:", error);
        tableBody.innerHTML = '<tr><td colspan="7">Error de conexión.</td></tr>';
    }
}

// 3. RENDERIZAR TABLA
function renderTable() {
    const textoBusqueda = searchInput.value.toLowerCase();
    const filtro = filterStatus.value;
    
    // Obtener fecha de hoy para comparaciones (YYYY-MM-DD)
    // Ajustamos zona horaria para que "hoy" sea correcto localmente
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const todayStr = (new Date(now - offset)).toISOString().split('T')[0];

    const listaFiltrada = allTeachers.filter(maestro => {
        const coincideEstado = (filtro === 'todos') || (maestro.status === filtro);
        const coincideNombre = maestro.nombre.toLowerCase().includes(textoBusqueda);
        return coincideEstado && coincideNombre;
    });

    // Paginación
    const totalPages = Math.ceil(listaFiltrada.length / rowsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    
    const startIndex = (currentPage - 1) * rowsPerPage;
    const itemsPagina = listaFiltrada.slice(startIndex, startIndex + rowsPerPage);

    tableBody.innerHTML = '';
    if (itemsPagina.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center">No hay maestros registrados.</td></tr>';
        return;
    }

    itemsPagina.forEach(maestro => {
        const fila = document.createElement('tr');
        const claseStatus = maestro.status === 'activo' ? 'tag-inscrito' : 'tag-inactivo';

        // --- CÁLCULO DE ESTADÍSTICAS ---
        let fijos = 0;
        let muestrasPasadas = 0;
        let muestrasFuturas = 0;

        // Filtramos las clases de ESTE maestro
        const susClases = allClasses.filter(c => c.teacherId === maestro.id);

        susClases.forEach(c => {
            // 1. Clases FIJAS (Alumnos Activos)
            if (c.type === 'fija') {
                // Solo cuenta si NO tiene fechaFin (activa) o si la fechaFin es futura
                if (!c.fechaFin || c.fechaFin >= todayStr) {
                    fijos++;
                }
            }
            // 2. Clases MUESTRA
            else if (c.type === 'muestra') {
                if (c.date < todayStr) {
                    muestrasPasadas++; // Ya sucedieron
                } else {
                    muestrasFuturas++; // Pendientes (Hoy o futuro)
                }
            }
        });

        // --- RENDERIZADO DE BADGES Y COLUMNAS ---
        
        // Instrumentos
        let htmlInstrumentos = '';
        let listaInst = Array.isArray(maestro.instrumentos) ? maestro.instrumentos : (maestro.instrumentos ? maestro.instrumentos.split(',') : []);
        listaInst.forEach(inst => htmlInstrumentos += `<span class="badge-instrumento">${inst.trim()}</span>`);

        // Días
        let htmlDias = '';
        const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        diasSemana.forEach(dia => {
            const activo = maestro.diasDisponibles && maestro.diasDisponibles.includes(dia);
            if (activo) htmlDias += `<span class="badge-dia active">${dia}</span>`;
        });

        // HTML ESTADÍSTICAS
        const htmlStats = `
            <div class="stats-container">
                <div class="stat-row">
                    <span class="stat-label">👥 Alumnos Fijos</span>
                    <span class="num-fijos">${fijos}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">✨ Muestras Pendientes</span>
                    <span class="num-futuras">${muestrasFuturas}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">📜 Muestras Pasadas</span>
                    <span class="num-pasadas">${muestrasPasadas}</span>
                </div>
            </div>
        `;

        const passwordDisplay = `
            <span class="pass-hidden">••••••</span>
            <button class="toggle-password" onclick="alert('Usuario: ${maestro.usuario}\\nContraseña: ${maestro.password}')">👁️</button>
        `;

        fila.innerHTML = `
            <td><strong>${maestro.nombre}</strong></td>
            <td>
                <div style="font-size:12px; color:#666;">User: ${maestro.usuario}</div>
                ${passwordDisplay}
            </td>
            <td>${htmlInstrumentos}</td>
            <td>${htmlDias}</td>
            <td>${htmlStats}</td> <td><span class="tag ${claseStatus}">${maestro.status.toUpperCase()}</span></td>
            <td>
                <div class="actions-cell">
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

// ... (EL RESTO DEL ARCHIVO TEACHERS.JS SE QUEDA EXACTAMENTE IGUAL) ...
// (Copia aquí las funciones asignarEventos, formTeacher.submit, abrirModalEditar, formEditar.submit y listeners de botones que ya tenías)
function asignarEventos() {
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const maestro = allTeachers.find(t => t.id === e.currentTarget.dataset.id);
            abrirModalEditar(maestro);
        });
    });

    document.querySelectorAll('.btn-archive').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            const statusActual = e.currentTarget.dataset.status;
            const nuevoStatus = statusActual === 'activo' ? 'inactivo' : 'activo';
            
            if(confirm(`¿Cambiar estado del maestro a ${nuevoStatus.toUpperCase()}?`)) {
                await updateDoc(doc(db, "teachers", id), { status: nuevoStatus });
                loadData();
            }
        });
    });
}

formTeacher.addEventListener('submit', async (e) => {
    e.preventDefault();
    const diasCheck = document.querySelectorAll('input[name="dias"]:checked');
    const diasSeleccionados = Array.from(diasCheck).map(cb => cb.value);
    const instCheck = document.querySelectorAll('input[name="instrumentos"]:checked');
    const instSeleccionados = Array.from(instCheck).map(cb => cb.value);

    if (instSeleccionados.length === 0) { alert("Selecciona instrumentos."); return; }

    const nuevo = {
        nombre: document.getElementById('newNombre').value.trim(),
        usuario: document.getElementById('newUsuario').value.trim(),
        password: document.getElementById('newPassword').value.trim(),
        instrumentos: instSeleccionados,
        diasDisponibles: diasSeleccionados,
        status: "activo", 
        alumnosCount: 0, // Dato legacy, ya no se usa visualmente porque calculamos en tiempo real
        fechaRegistro: new Date()
    };

    try {
        await addDoc(collection(db, "teachers"), nuevo);
        modalContainer.classList.add('hidden');
        formTeacher.reset();
        loadData();
        alert("Maestro agregado.");
    } catch (error) { console.error(error); alert("Error al guardar."); }
});

function abrirModalEditar(maestro) {
    document.getElementById('editId').value = maestro.id;
    document.getElementById('editStatus').value = maestro.status;
    document.getElementById('editNombre').value = maestro.nombre;
    document.getElementById('editUsuario').value = maestro.usuario;
    document.getElementById('editPassword').value = maestro.password;

    document.querySelectorAll('input[name="editDias"]').forEach(cb => {
        cb.checked = maestro.diasDisponibles && maestro.diasDisponibles.includes(cb.value);
    });
    const misInstrumentos = Array.isArray(maestro.instrumentos) ? maestro.instrumentos : [];
    document.querySelectorAll('input[name="editInstrumentos"]').forEach(cb => {
        cb.checked = misInstrumentos.includes(cb.value);
    });

    modalEditar.classList.remove('hidden');
}

formEditar.addEventListener('submit', async (e) => {
    e.preventDefault();
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
        alert("Actualizado.");
    } catch (error) { console.error(error); alert("Error al actualizar."); }
});

document.getElementById('btnOpenModal').addEventListener('click', () => modalContainer.classList.remove('hidden'));
document.getElementById('btnCloseModal').addEventListener('click', () => modalContainer.classList.add('hidden'));
document.getElementById('btnCloseEditar').addEventListener('click', () => modalEditar.classList.add('hidden'));

searchInput.addEventListener('input', () => { currentPage = 1; renderTable(); });
filterStatus.addEventListener('change', () => { currentPage = 1; renderTable(); });
btnPrevPage.addEventListener('click', () => { if(currentPage>1) currentPage--; renderTable(); });
btnNextPage.addEventListener('click', () => { currentPage++; renderTable(); });