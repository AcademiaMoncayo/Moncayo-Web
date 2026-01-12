import { db, auth } from './firebase-config.js';
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- REFERENCIAS DOM ---
const tableBody = document.getElementById('tableBody');
const searchInput = document.getElementById('searchInput');
const filterStatus = document.getElementById('filterStatus');

// Modales
const modalContainer = document.getElementById('modalContainer'); // Nuevo
const modalInscripcion = document.getElementById('modalInscripcion'); // Inscribir
const modalEditar = document.getElementById('modalEditar'); // Editar

// Paginación
const btnPrevPage = document.getElementById('btnPrevPage');
const btnNextPage = document.getElementById('btnNextPage');
const pageIndicator = document.getElementById('pageIndicator');

let allStudents = []; 
let currentPage = 1;
const rowsPerPage = 25;

// 1. SEGURIDAD
onAuthStateChanged(auth, (user) => {
    if (!user) window.location.href = "index.html";
    else loadStudents();
});

// 2. CARGAR
async function loadStudents() {
    tableBody.innerHTML = '<tr><td colspan="8">Cargando...</td></tr>';
    try {
        const q = query(collection(db, "students"), orderBy("nombre"));
        const querySnapshot = await getDocs(q);
        
        allStudents = [];
        querySnapshot.forEach((doc) => {
            allStudents.push({ id: doc.id, ...doc.data() });
        });
        renderTable();
    } catch (error) {
        console.error("Error:", error);
    }
}

// 3. RENDERIZAR TABLA
function renderTable() {
    const textoBusqueda = searchInput.value.toLowerCase();
    const filtroEstado = filterStatus.value;

    const listaFiltrada = allStudents.filter(alumno => {
        let coincideEstado = false;
        if (filtroEstado === 'todos') {
            coincideEstado = (alumno.status === 'prospecto' || alumno.status === 'inscrito');
        } else {
            coincideEstado = (alumno.status === filtroEstado);
        }
        const coincideNombre = alumno.nombre.toLowerCase().includes(textoBusqueda);
        return coincideEstado && coincideNombre;
    });

    // Paginación
    const totalPages = Math.ceil(listaFiltrada.length / rowsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    
    const startIndex = (currentPage - 1) * rowsPerPage;
    const alumnosPagina = listaFiltrada.slice(startIndex, startIndex + rowsPerPage);

    // Dibujar
    tableBody.innerHTML = '';
    if (alumnosPagina.length === 0) {
        // AJUSTE: colspan="9" porque agregamos una columna
        tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center">No se encontraron resultados.</td></tr>';
        pageIndicator.textContent = "0 de 0";
        return;
    }

    alumnosPagina.forEach(alumno => {
        const fila = document.createElement('tr');
        
        let claseStatus = 'tag-prospecto';
        if (alumno.status === 'inscrito') claseStatus = 'tag-inscrito';
        if (alumno.status === 'inactivo' || alumno.status === 'sin_interes') claseStatus = 'tag-inactivo';

        let accionBtn = '';
        if (alumno.status === 'prospecto') {
            accionBtn = `<button class="btn-action inscribir-btn" data-id="${alumno.id}" data-nombre="${alumno.nombre}">Inscribir</button>`;
        } else if (alumno.status === 'inscrito') {
            accionBtn = '<span style="color:green; font-weight:bold; font-size:12px;">✔ Alumno</span>';
        } else {
            accionBtn = '<span style="color:#999; font-size:12px;">Archivado</span>';
        }

        // DATOS DE LA TABLA
        const emailDisplay = alumno.emailTutor ? `<div style="display:flex; gap:5px;"><span>${alumno.emailTutor}</span><button class="btn-mini-email" data-email="${alumno.emailTutor}">✉</button></div>` : '-';
        const diaPago = alumno.diaCorte ? `Día ${alumno.diaCorte}` : '-';
        const factura = alumno.requiereFactura ? '✅ Sí' : '-';
        
        // NUEVO DATO: Mensualidad (Si existe, le ponemos signo de pesos)
        const costoDisplay = alumno.costoMensual ? `$${alumno.costoMensual}` : '-';

        const btnEditar = `<button class="btn-edit" data-id="${alumno.id}" title="Editar">✏️</button>`;
        const btnBaja = `<button class="btn-archive" data-id="${alumno.id}" data-status="${alumno.status}" title="Dar de baja / Archivar">🗑️</button>`;

        fila.innerHTML = `
            <td><strong>${alumno.nombre}</strong></td>
            <td>${alumno.instrumentoInteres || 'N/A'}</td>
            <td>${alumno.nombreTutor}<br><small>${alumno.telefonoTutor}</small></td>
            <td>${emailDisplay}</td>
            <td style="font-weight:bold; color:#2c3e50;">${costoDisplay}</td> <td style="text-align:center;">${diaPago}</td>
            <td style="text-align:center;">${factura}</td>
            <td><span class="tag ${claseStatus}">${alumno.status.toUpperCase()}</span></td>
            <td>
                <div class="actions-cell">
                    ${btnEditar}
                    ${btnBaja}
                    ${accionBtn}
                </div>
            </td>
        `;
        tableBody.appendChild(fila);
    });

    pageIndicator.textContent = `Página ${currentPage} de ${totalPages}`;
    btnPrevPage.disabled = currentPage === 1;
    btnNextPage.disabled = currentPage === totalPages;

    asignarEventos();
}

// 4. EVENTOS DE BOTONES
function asignarEventos() {
    // Editar
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const alumno = allStudents.find(a => a.id === e.currentTarget.dataset.id);
            abrirModalEditar(alumno);
        });
    });

    // Dar de Baja / Archivar
    document.querySelectorAll('.btn-archive').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const statusActual = e.currentTarget.dataset.status;
            confirmarBaja(id, statusActual);
        });
    });

    // Inscribir
    document.querySelectorAll('.inscribir-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            abrirModalInscripcion(e.currentTarget.dataset.id, e.currentTarget.dataset.nombre);
        });
    });
}

// --- FUNCIONES DE ACCIÓN ---

// A) Lógica de Baja / Archivo
async function confirmarBaja(id, statusActual) {
    let nuevoStatus = '';
    let mensajeConfirmacion = '';

    if (statusActual === 'prospecto') {
        nuevoStatus = 'sin_interes';
        mensajeConfirmacion = '¿Mover a la lista de "Sin Interés"?';
    } else if (statusActual === 'inscrito') {
        nuevoStatus = 'inactivo';
        mensajeConfirmacion = '¿Dar de baja al alumno (Pasar a Inactivo)?';
    } else {
        // Si ya está inactivo, quizás queramos reactivarlo o borrarlo definitivo
        if(confirm("¿Este registro ya está archivado. ¿Deseas REACTIVARLO como Prospecto?")) {
            actualizarStatus(id, 'prospecto');
        }
        return;
    }

    if (confirm(mensajeConfirmacion)) {
        await actualizarStatus(id, nuevoStatus);
    }
}

async function actualizarStatus(id, nuevoStatus) {
    try {
        await updateDoc(doc(db, "students", id), { status: nuevoStatus });
        alert("Estado actualizado.");
        loadStudents();
    } catch (error) {
        alert("Error al actualizar: " + error.message);
    }
}

// B) Lógica de Editar (Cargar datos en el modal)
function abrirModalEditar(alumno) {
    document.getElementById('editId').value = alumno.id;
    document.getElementById('editStatus').value = alumno.status;

    // Llenar campos
    document.getElementById('editNombre').value = alumno.nombre;
    document.getElementById('editEdad').value = alumno.edad;
    document.getElementById('editInstrumento').value = alumno.instrumentoInteres || '';
    document.getElementById('editTutor').value = alumno.nombreTutor;
    document.getElementById('editTelefono').value = alumno.telefonoTutor;
    document.getElementById('editCorreo').value = alumno.emailTutor || '';

    // Mostrar finanzas solo si es inscrito
    const finanzasDiv = document.getElementById('editFinanzasContainer');
    if (alumno.status === 'inscrito') {
        finanzasDiv.classList.remove('hidden');
        document.getElementById('editCosto').value = alumno.costoMensual || '';
        // Si tienes campo de diaCorte en el modal de editar, ponlo, si no, quítalo
        if(document.getElementById('editDiaCorte')) document.getElementById('editDiaCorte').value = alumno.diaCorte || '';
        document.getElementById('editFactura').checked = alumno.requiereFactura || false;
    } else {
        finanzasDiv.classList.add('hidden');
    }
    
    modalEditar.classList.remove('hidden');
}

// Guardar Edición
document.getElementById('formEditar').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const status = document.getElementById('editStatus').value;

    const datos = {
        nombre: document.getElementById('editNombre').value.trim(),
        edad: document.getElementById('editEdad').value,
        instrumentoInteres: document.getElementById('editInstrumento').value.trim(),
        nombreTutor: document.getElementById('editTutor').value.trim(),
        telefonoTutor: document.getElementById('editTelefono').value.trim(),
        emailTutor: document.getElementById('editCorreo').value.trim()
    };

    if (status === 'inscrito') {
        datos.costoMensual = Number(document.getElementById('editCosto').value);
        datos.requiereFactura = document.getElementById('editFactura').checked;
        // Si permitimos editar el día de corte manual:
        if(document.getElementById('editDiaCorte')) datos.diaCorte = Number(document.getElementById('editDiaCorte').value);
    }

    try {
        await updateDoc(doc(db, "students", id), datos);
        alert("Cambios guardados.");
        modalEditar.classList.add('hidden');
        loadStudents();
    } catch (error) {
        alert("Error al editar: " + error.message);
    }
});

// --- EL RESTO DE LISTENERS (Modal nuevo, paginación, etc.) ---
document.getElementById('btnCloseEditar').addEventListener('click', () => modalEditar.classList.add('hidden'));

// (Mantén aquí el resto de tus listeners de Inscribir y Nuevo Prospecto como estaban)
// ... Paginación ...
btnPrevPage.addEventListener('click', () => { if(currentPage>1) { currentPage--; renderTable(); } });
btnNextPage.addEventListener('click', () => { 
    // Recalcular total pages simple
    const filtrados = allStudents.filter(a => filterStatus.value==='todos' ? (a.status==='prospecto'||a.status==='inscrito') : a.status===filterStatus.value);
    if(currentPage < Math.ceil(filtrados.length/rowsPerPage)) { currentPage++; renderTable(); } 
});

// Listener del Filtro para resetear página
filterStatus.addEventListener('change', () => { currentPage = 1; renderTable(); });
searchInput.addEventListener('input', () => { currentPage = 1; renderTable(); });

// Funciones de Modal Nuevo y Modal Inscribir (Copiadas del paso anterior)
// ... (Asegúrate de tener aquí el formStudent y formInscripcion listeners) ...
const formStudent = document.getElementById('formStudent');
const formInscripcion = document.getElementById('formInscripcion');

// GUARDAR NUEVO
if(formStudent) {
    formStudent.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nuevo = {
            nombre: document.getElementById('newNombre').value.trim(),
            edad: document.getElementById('newEdad').value,
            instrumentoInteres: document.getElementById('newInstrumento').value.trim(),
            nombreTutor: document.getElementById('newTutor').value.trim(),
            telefonoTutor: document.getElementById('newTelefono').value.trim(),
            status: "prospecto", fechaRegistro: new Date()
        };
        try { await addDoc(collection(db, "students"), nuevo); modalContainer.classList.add('hidden'); formStudent.reset(); loadStudents(); } catch (e) { alert("Error"); }
    });
}
if(formInscripcion) {
    formInscripcion.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Capturar datos del formulario
        const id = document.getElementById('inscripcionId').value;
        const nombreAlumno = document.getElementById('inscripcionNombre').value;
        const mensualidad = document.getElementById('costoMensual').value;
        const inscripcion = document.getElementById('costoInscripcion').value; // Nuevo Campo
        const metodoPago = document.getElementById('metodoPagoInscripcion').value; // Nuevo Campo
        const fechaInicio = document.getElementById('fechaInicio').value;
        const correo = document.getElementById('correoTutor').value;
        const factura = document.getElementById('requiereFactura').checked;
        
        // Calcular día de corte
        const diaCorte = parseInt(fechaInicio.split('-')[2]);

        try {
            // PASO 1: Actualizar el perfil del Alumno (status: inscrito)
            const alumnoRef = doc(db, "students", id);
            await updateDoc(alumnoRef, {
                status: "inscrito",
                costoMensual: Number(mensualidad),
                diaCorte: diaCorte,
                fechaInicioClases: fechaInicio,
                fechaInscripcion: new Date(),
                emailTutor: correo,
                requiereFactura: factura,
                costoInscripcionPagado: Number(inscripcion) // Guardamos dato histórico
            });

            // PASO 2: Registrar el PAGO DE INSCRIPCIÓN en Finanzas (Si es mayor a 0)
            if (Number(inscripcion) > 0) {
                await addDoc(collection(db, "payments"), {
                    studentId: id,
                    nombreAlumno: nombreAlumno,
                    periodo: "Pago de Inscripción", // Etiqueta especial
                    monto: Number(inscripcion),
                    metodo: metodoPago,
                    fechaPago: fechaInicio, // Asumimos que paga el día que inicia
                    fechaRegistro: new Date()
                });
            }

            alert(`¡Alumno Inscrito Correctamente!\n\n- Mensualidad: $${mensualidad}\n- Inscripción cobrada: $${inscripcion}\n- Día de corte: ${diaCorte}`);
            
            modalInscripcion.classList.add('hidden'); 
            formInscripcion.reset(); 
            loadStudents();

        } catch (error) {
            console.error("Error al inscribir:", error);
            alert("Hubo un error al procesar la inscripción.");
        }
    });
}
// Botones de abrir modales generales
document.getElementById('btnOpenModal').addEventListener('click', () => modalContainer.classList.remove('hidden'));
document.getElementById('btnCloseModal').addEventListener('click', () => modalContainer.classList.add('hidden'));
document.getElementById('btnCloseInscripcion').addEventListener('click', () => modalInscripcion.classList.add('hidden'));

// FUNCION DE INSCRIPCION (Para que el botón de la tabla la llame)
function abrirModalInscripcion(id, nombre) {
    document.getElementById('inscripcionId').value = id;
    document.getElementById('inscripcionNombre').value = nombre;
    document.getElementById('fechaInicio').valueAsDate = new Date();
    modalInscripcion.classList.remove('hidden');
}