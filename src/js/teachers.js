import { db, auth } from './firebase-config.js';
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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
let currentPage = 1;
const rowsPerPage = 20;

// 1. SEGURIDAD
onAuthStateChanged(auth, (user) => {
    if (!user) window.location.href = "index.html";
    else loadTeachers();
});

// 2. CARGAR MAESTROS
async function loadTeachers() {
    tableBody.innerHTML = '<tr><td colspan="7">Cargando claustro...</td></tr>';
    try {
        const q = query(collection(db, "teachers"), orderBy("nombre"));
        const querySnapshot = await getDocs(q);
        
        allTeachers = [];
        querySnapshot.forEach((doc) => {
            allTeachers.push({ id: doc.id, ...doc.data() });
        });
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
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center">No hay maestros registrados.</td></tr>';
        return;
    }

    itemsPagina.forEach(maestro => {
        const fila = document.createElement('tr');
        
        const claseStatus = maestro.status === 'activo' ? 'tag-inscrito' : 'tag-inactivo';

        // B) INSTRUMENTOS (Manejo de Array)
        let htmlInstrumentos = '';
        let listaInstrumentos = [];
        
        // Verificamos si es array (nuevo) o string (viejo)
        if (Array.isArray(maestro.instrumentos)) {
            listaInstrumentos = maestro.instrumentos;
        } else if (maestro.instrumentos) {
            listaInstrumentos = maestro.instrumentos.split(',').map(s => s.trim());
        }

        listaInstrumentos.forEach(inst => {
            htmlInstrumentos += `<span class="badge-instrumento">${inst}</span>`;
        });

        // C) DÍAS
        let htmlDias = '';
        const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        diasSemana.forEach(dia => {
            const activo = maestro.diasDisponibles && maestro.diasDisponibles.includes(dia);
            const claseDia = activo ? 'active' : '';
            if (activo) htmlDias += `<span class="badge-dia ${claseDia}">${dia}</span>`;
        });

        // D) PASSWORD
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
            <td style="text-align:center; font-weight:bold;">${maestro.alumnosCount || 0}</td>
            <td><span class="tag ${claseStatus}">${maestro.status.toUpperCase()}</span></td>
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
                loadTeachers();
            }
        });
    });
}

// 4. GUARDAR NUEVO MAESTRO (CHECKBOXES)
formTeacher.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Capturar Días
    const diasCheck = document.querySelectorAll('input[name="dias"]:checked');
    const diasSeleccionados = Array.from(diasCheck).map(cb => cb.value);

    // Capturar Instrumentos
    const instCheck = document.querySelectorAll('input[name="instrumentos"]:checked');
    const instSeleccionados = Array.from(instCheck).map(cb => cb.value);

    if (instSeleccionados.length === 0) {
        alert("Selecciona al menos un instrumento.");
        return;
    }

    const nuevo = {
        nombre: document.getElementById('newNombre').value.trim(),
        usuario: document.getElementById('newUsuario').value.trim(),
        password: document.getElementById('newPassword').value.trim(),
        instrumentos: instSeleccionados, // Guardamos Array
        diasDisponibles: diasSeleccionados, // Guardamos Array
        status: "activo", 
        alumnosCount: 0,
        fechaRegistro: new Date()
    };

    try {
        await addDoc(collection(db, "teachers"), nuevo);
        modalContainer.classList.add('hidden');
        formTeacher.reset();
        loadTeachers();
        alert("Maestro agregado exitosamente.");
    } catch (error) {
        console.error(error);
        alert("Error al guardar.");
    }
});

// 5. EDITAR MAESTRO
function abrirModalEditar(maestro) {
    document.getElementById('editId').value = maestro.id;
    document.getElementById('editStatus').value = maestro.status;
    
    document.getElementById('editNombre').value = maestro.nombre;
    document.getElementById('editUsuario').value = maestro.usuario;
    document.getElementById('editPassword').value = maestro.password;

    // Marcar Checkboxes Días
    document.querySelectorAll('input[name="editDias"]').forEach(cb => {
        cb.checked = maestro.diasDisponibles && maestro.diasDisponibles.includes(cb.value);
    });

    // Marcar Checkboxes Instrumentos
    const misInstrumentos = Array.isArray(maestro.instrumentos) ? maestro.instrumentos : []; // Si es viejo (string), no marcara nada, es un caso borde aceptable o se puede parsear
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
        loadTeachers();
        alert("Maestro actualizado.");
    } catch (error) {
        console.error(error);
        alert("Error al actualizar.");
    }
});

// Listeners Generales
document.getElementById('btnOpenModal').addEventListener('click', () => modalContainer.classList.remove('hidden'));
document.getElementById('btnCloseModal').addEventListener('click', () => modalContainer.classList.add('hidden'));
document.getElementById('btnCloseEditar').addEventListener('click', () => modalEditar.classList.add('hidden'));

searchInput.addEventListener('input', () => { currentPage = 1; renderTable(); });
filterStatus.addEventListener('change', () => { currentPage = 1; renderTable(); });
btnPrevPage.addEventListener('click', () => { if(currentPage>1) currentPage--; renderTable(); });
btnNextPage.addEventListener('click', () => { currentPage++; renderTable(); });