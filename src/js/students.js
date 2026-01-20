import { db, auth } from './firebase-config.js';
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- DOM ---
const tableBody = document.getElementById('tableBody');
const searchInput = document.getElementById('searchInput');
const filterStatus = document.getElementById('filterStatus');

// Modales
const modalContainer = document.getElementById('modalContainer'); 
const modalInscripcion = document.getElementById('modalInscripcion');
const modalEditar = document.getElementById('modalEditar');
const modalPerfil = document.getElementById('modalPerfil');
// Referencia al nuevo modal de credenciales (asegúrate que esté en tu HTML)
const modalCredenciales = document.getElementById('modalCredenciales');

// Forms
const formStudent = document.getElementById('formStudent');
const formInscripcion = document.getElementById('formInscripcion');
const formEditar = document.getElementById('formEditar');

// Paginación
const btnPrevPage = document.getElementById('btnPrevPage');
const btnNextPage = document.getElementById('btnNextPage');
const pageIndicator = document.getElementById('pageIndicator');

// CONFIRMACIÓN CUSTOM
const modalConfirm = document.getElementById('modalConfirm');
const confirmTitle = document.getElementById('confirmTitle');
const confirmMessage = document.getElementById('confirmMessage');
const btnOkConfirm = document.getElementById('btnOkConfirm');
const btnCancelConfirm = document.getElementById('btnCancelConfirm');
let confirmCallback = null;

let allStudents = [];
let currentPage = 1;
const rowsPerPage = 20;

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
    else loadStudents();
});

// 2. CARGAR
async function loadStudents() {
    tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center">Cargando datos...</td></tr>';
    try {
        const q = query(collection(db, "students"), orderBy("nombre"));
        const snap = await getDocs(q);
        allStudents = [];
        snap.forEach((doc) => allStudents.push({ id: doc.id, ...doc.data() }));
        renderTable();
    } catch (error) {
        console.error(error);
        showToast("Error cargando alumnos", "error");
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:red">Error de conexión.</td></tr>';
    }
}

// 3. RENDERIZAR TABLA
function renderTable() {
    const texto = searchInput.value.toLowerCase();
    const filtro = filterStatus.value;

    const listaFiltrada = allStudents.filter(alumno => {
        // Búsqueda inteligente (Nombre, Tutor, Status)
        const coincideTexto = 
            alumno.nombre.toLowerCase().includes(texto) ||
            (alumno.nombreTutor && alumno.nombreTutor.toLowerCase().includes(texto)) ||
            alumno.status.includes(texto);

        let coincideStatus = true;
        if (filtro !== 'todos') {
            coincideStatus = (alumno.status === filtro);
        }
        return coincideTexto && coincideStatus;
    });

    const totalPages = Math.ceil(listaFiltrada.length / rowsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    
    const startIndex = (currentPage - 1) * rowsPerPage;
    const itemsPagina = listaFiltrada.slice(startIndex, startIndex + rowsPerPage);

    tableBody.innerHTML = '';
    if (itemsPagina.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px; color:#888;">No se encontraron resultados.</td></tr>';
        return;
    }

    itemsPagina.forEach(alumno => {
        const fila = document.createElement('tr');
        const st = alumno.status; 
        
        let tagHtml = `<span class="tag tag-${st}">${st.replace('_', ' ').toUpperCase()}</span>`;

        let accessDisplay = '<span style="color:#ccc; font-size:11px;">—</span>';
        if (st === 'inscrito' || st === 'inactivo' || st === 'baja') {
            const usuario = alumno.usuario || '?';
            const password = alumno.password || '...';
            accessDisplay = `
                <div style="font-size:11px; font-weight:bold; color:#0d47a1;">${usuario}</div>
                <button class="toggle-password btn-show-creds" 
                    data-user="${usuario}" 
                    data-pass="${password}" 
                    title="Ver Contraseña">
                    🔑 Ver
                </button>
            `;
        }

        // Acciones Dinámicas
        let botonesAccion = '';
        if (st === 'prospecto') {
            botonesAccion = `
                <button class="btn-inscribir" data-id="${alumno.id}" title="Inscribir" style="background:#2e7d32; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">✅</button>
                <button class="btn-cambiar-estado" data-id="${alumno.id}" data-nuevo="sin_interes" title="Mover a Sin Interés" class="btn-state-gray">💤</button>
                <button class="btn-edit" data-id="${alumno.id}" title="Editar">✏️</button>
            `;
        } else if (st === 'sin_interes') {
            botonesAccion = `
                <button class="btn-cambiar-estado" data-id="${alumno.id}" data-nuevo="prospecto" title="Reactivar" class="btn-state-blue">⬆️</button>
                <button class="btn-delete-prospecto" data-id="${alumno.id}" title="Eliminar">🗑️</button>
            `;
        } else if (st === 'inscrito') {
            botonesAccion = `
                <button class="btn-game" data-id="${alumno.id}" title="Gamer" style="background:#ffc107; border:none; padding:4px; border-radius:4px; cursor:pointer;">🎮</button>
                <button class="btn-cambiar-estado" data-id="${alumno.id}" data-nuevo="inactivo" title="Suspender" class="btn-state-orange">⏸️</button>
                <button class="btn-edit" data-id="${alumno.id}" title="Editar">✏️</button>
            `;
        } else if (st === 'inactivo') {
            botonesAccion = `
                <button class="btn-cambiar-estado" data-id="${alumno.id}" data-nuevo="inscrito" title="Reactivar" class="btn-state-green">▶️</button>
                <button class="btn-cambiar-estado" data-id="${alumno.id}" data-nuevo="baja" title="Dar de Baja" class="btn-state-red">❌</button>
            `;
        } else if (st === 'baja') {
            botonesAccion = `
                <button class="btn-cambiar-estado" data-id="${alumno.id}" data-nuevo="inscrito" title="Re-Inscribir" class="btn-state-green">♻️</button>
            `;
        }

        fila.innerHTML = `
            <td>
                <strong>${alumno.nombre}</strong>
                ${alumno.interes ? `<br><small style="color:#666;">Int: ${alumno.interes}</small>` : ''}
            </td>
            <td>${accessDisplay}</td>
            <td>
                <div style="font-weight:bold; font-size:12px;">${alumno.nombreTutor || ''}</div>
                <div style="font-size:11px;">📞 ${alumno.telefono || '-'}</div>
                <div style="font-size:11px; color:#666;">✉️ ${alumno.emailTutor || '-'}</div>
            </td>
            <td style="text-align:center;">${alumno.requiereFactura ? '✅' : '-'}</td>
            <td>${alumno.costoMensual ? '$'+alumno.costoMensual : '-'}</td>
            <td style="text-align:center;">${tagHtml}</td>
            <td><div class="actions-cell" style="display:flex; gap:5px;">${botonesAccion}</div></td>
        `;
        tableBody.appendChild(fila);
    });

    asignarEventos();
    pageIndicator.textContent = `Página ${currentPage} de ${totalPages}`;
    btnPrevPage.disabled = currentPage === 1;
    btnNextPage.disabled = currentPage === totalPages;
}

// 4. LISTENERS (UNIFICADOS)
function asignarEventos() {
    // CAMBIO DE ESTADO (Con Modal Bonito)
    document.querySelectorAll('.btn-cambiar-estado').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const nuevoEstado = e.currentTarget.dataset.nuevo;
            
            let titulo = "Cambiar Estado";
            let msg = `¿Mover alumno a: ${nuevoEstado.toUpperCase().replace('_', ' ')}?`;
            
            if (nuevoEstado === 'baja') {
                titulo = "⚠️ Dar de Baja";
                msg = "El alumno pasará a Bajas. Su historial financiero se conserva.";
            }

            showConfirm(titulo, msg, async () => {
                try {
                    await updateDoc(doc(db, "students", id), { status: nuevoEstado });
                    showToast("Estado actualizado", "success");
                    loadStudents();
                } catch (err) {
                    showToast("Error: " + err.message, "error");
                }
            });
        });
    });

    // Inscribir
    document.querySelectorAll('.btn-inscribir').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const alumno = allStudents.find(s => s.id === e.currentTarget.dataset.id);
            abrirModalInscripcion(alumno);
        });
    });

    // Editar
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const alumno = allStudents.find(s => s.id === e.currentTarget.dataset.id);
            abrirModalEditar(alumno);
        });
    });

    // Gamer
    document.querySelectorAll('.btn-game').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const alumno = allStudents.find(s => s.id === e.currentTarget.dataset.id);
            if(window.abrirPerfilGamer) await window.abrirPerfilGamer(alumno);
        });
    });

    // Eliminar Físico (Prospectos)
    document.querySelectorAll('.btn-delete-prospecto').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            showConfirm("Eliminar Registro", "Esta acción borrará al prospecto permanentemente.", async () => {
                try {
                    await deleteDoc(doc(db, "students", id));
                    showToast("Registro eliminado", "info");
                    loadStudents();
                } catch(err) { showToast("Error al eliminar", "error"); }
            });
        });
    });

    // NUEVO: Listener para ver credenciales (Integrado aquí)
    document.querySelectorAll('.btn-show-creds').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const user = e.currentTarget.dataset.user;
            const pass = e.currentTarget.dataset.pass;
            abrirModalCredenciales(user, pass);
        });
    });
}

// 5. GUARDAR PROSPECTO
formStudent.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = formStudent.querySelector('button[type="submit"]');
    btnSubmit.classList.add('btn-loading');

    const nuevo = {
        nombre: document.getElementById('stuNombre').value.trim(),
        nombreTutor: document.getElementById('stuTutor').value.trim(),
        telefono: document.getElementById('stuTel').value.trim(),
        emailTutor: document.getElementById('stuEmail').value.trim(),
        interes: document.getElementById('stuInteres').value, 
        status: "prospecto",
        fechaRegistro: new Date()
    };

    try {
        await addDoc(collection(db, "students"), nuevo);
        modalContainer.classList.add('hidden');
        formStudent.reset();
        loadStudents();
        showToast("Prospecto registrado con éxito", "success");
    } catch (error) { 
        console.error(error); 
        showToast("Error al guardar", "error"); 
    } finally {
        btnSubmit.classList.remove('btn-loading');
    }
});

// 6. INSCRIPCIÓN + PAGO
function abrirModalInscripcion(alumno) {
    document.getElementById('insId').value = alumno.id;
    document.getElementById('insNombre').value = alumno.nombre;
    const sugerencia = alumno.nombre.toLowerCase().replace(/\s+/g, '.').substring(0, 15);
    document.getElementById('insUsuario').value = sugerencia;
    document.getElementById('insPassword').value = "moncayo123"; 
    document.getElementById('insInicio').valueAsDate = new Date();
    document.getElementById('insMontoInscripcion').value = ""; 
    document.getElementById('insCosto').value = ""; 
    modalInscripcion.classList.remove('hidden');
}

formInscripcion.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = formInscripcion.querySelector('button[type="submit"]');
    btnSubmit.classList.add('btn-loading');

    const id = document.getElementById('insId').value;
    const nombreAlumno = document.getElementById('insNombre').value;
    const inicioClases = document.getElementById('insInicio').value;
    const montoInscripcion = Number(document.getElementById('insMontoInscripcion').value);
    
    if(montoInscripcion <= 0) { 
        showToast("⚠️ Falta el pago de inscripción", "error");
        btnSubmit.classList.remove('btn-loading');
        return; 
    }

    const fechaObj = new Date(inicioClases + 'T12:00:00');
    const diaCorteAuto = fechaObj.getDate();

    const datosAlumno = {
        usuario: document.getElementById('insUsuario').value.trim(),
        password: document.getElementById('insPassword').value.trim(),
        fechaNacimiento: document.getElementById('insFechaNac').value,
        requiereFactura: document.getElementById('insFactura').checked,
        costoMensual: Number(document.getElementById('insCosto').value),
        diaCorte: diaCorteAuto,
        fechaInicioClases: inicioClases,
        status: "inscrito"
    };

    const datosPago = {
        studentId: id,
        nombreAlumno: nombreAlumno,
        periodo: "Pago de Inscripción", 
        monto: montoInscripcion,
        metodo: "Efectivo", 
        fechaPago: new Date().toISOString().split('T')[0], 
        tipo: "ingreso",
        concepto: `Inscripción: ${nombreAlumno}`,
        fechaRegistro: new Date()
    };

    try {
        await updateDoc(doc(db, "students", id), datosAlumno);
        await addDoc(collection(db, "payments"), datosPago);
        await addDoc(collection(db, "finance"), datosPago);

        modalInscripcion.classList.add('hidden');
        loadStudents();
        showToast("¡Inscripción completada! 🎓", "success");
        showToast(`Pago de $${montoInscripcion} registrado`, "info");
    } catch (error) { 
        console.error(error); 
        showToast("Error en inscripción", "error"); 
    } finally {
        btnSubmit.classList.remove('btn-loading');
    }
});

// 7. EDITAR
function abrirModalEditar(alumno) {
    document.getElementById('editId').value = alumno.id;
    document.getElementById('editNombre').value = alumno.nombre;
    document.getElementById('editTutor').value = alumno.nombreTutor || '';
    document.getElementById('editTel').value = alumno.telefono || '';
    document.getElementById('editEmail').value = alumno.emailTutor || '';
    document.getElementById('editStuUsuario').value = alumno.usuario || '';
    document.getElementById('editStuPassword').value = alumno.password || '';
    document.getElementById('editFechaNac').value = alumno.fechaNacimiento || '';
    document.getElementById('editFactura').checked = alumno.requiereFactura || false;
    document.getElementById('editCosto').value = alumno.costoMensual || 0;
    document.getElementById('editInicio').value = alumno.fechaInicioClases || '';
    modalEditar.classList.remove('hidden');
}

formEditar.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = formEditar.querySelector('button[type="submit"]');
    btnSubmit.classList.add('btn-loading');

    const id = document.getElementById('editId').value;
    const inicioClases = document.getElementById('editInicio').value;

    let diaCorteAuto = 5; 
    if (inicioClases) {
        const fechaObj = new Date(inicioClases + 'T12:00:00');
        diaCorteAuto = fechaObj.getDate();
    }
    
    const datos = {
        nombre: document.getElementById('editNombre').value.trim(),
        nombreTutor: document.getElementById('editTutor').value.trim(),
        telefono: document.getElementById('editTel').value.trim(),
        emailTutor: document.getElementById('editEmail').value.trim(),
        usuario: document.getElementById('editStuUsuario').value.trim(),
        password: document.getElementById('editStuPassword').value.trim(),
        fechaNacimiento: document.getElementById('editFechaNac').value,
        requiereFactura: document.getElementById('editFactura').checked,
        costoMensual: Number(document.getElementById('editCosto').value),
        diaCorte: diaCorteAuto, 
        fechaInicioClases: inicioClases
    };

    try {
        await updateDoc(doc(db, "students", id), datos);
        modalEditar.classList.add('hidden');
        loadStudents();
        showToast("Datos actualizados", "success");
    } catch (error) { 
        console.error(error); 
        showToast("Error al actualizar", "error"); 
    } finally {
        btnSubmit.classList.remove('btn-loading');
    }
});

// 8. LOGICA GAMER
import { query as fQuery, where as fWhere } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"; 

window.abrirPerfilGamer = async function(alumno) {
    const modalPerfil = document.getElementById('modalPerfil');
    document.getElementById('gamerName').textContent = alumno.nombre;
    document.getElementById('gamerRank').textContent = "Calculando...";
    
    const q = fQuery(collection(db, "classes"), fWhere("studentId", "==", alumno.id));
    const querySnapshot = await getDocs(q);
    
    let totalClases = 0;
    querySnapshot.forEach(doc => totalClases++);

    const xpPorClase = 100;
    const xpTotal = totalClases * xpPorClase;
    const xpParaSiguienteNivel = 500;
    const nivelActual = Math.floor(xpTotal / xpParaSiguienteNivel) + 1;
    const xpEnNivelActual = xpTotal % xpParaSiguienteNivel;
    const porcentajeBarra = (xpEnNivelActual / xpParaSiguienteNivel) * 100;

    let rango = "Novato Musical 🌱";
    if (nivelActual > 5) rango = "Aprendiz Constante 🎵";
    
    document.getElementById('gamerLevel').textContent = nivelActual;
    document.getElementById('gamerRank').textContent = rango;
    document.getElementById('gamerXP').textContent = `${xpEnNivelActual} / ${xpParaSiguienteNivel} XP`;
    document.getElementById('barXP').style.width = `${porcentajeBarra}%`;
    document.getElementById('gamerClasses').textContent = totalClases;
    document.getElementById('gamerStreak').textContent = Math.floor(totalClases / 2);

    modalPerfil.classList.remove('hidden');
}

// UI Listeners
document.getElementById('btnOpenModal').addEventListener('click', () => modalContainer.classList.remove('hidden'));
document.getElementById('btnCloseModal').addEventListener('click', () => modalContainer.classList.add('hidden'));
document.getElementById('btnCloseInscripcion').addEventListener('click', () => modalInscripcion.classList.add('hidden'));
document.getElementById('btnCloseEditar').addEventListener('click', () => modalEditar.classList.add('hidden'));

if(document.getElementById('btnClosePerfil')) {
    document.getElementById('btnClosePerfil').addEventListener('click', () => modalPerfil.classList.add('hidden'));
}

searchInput.addEventListener('input', () => { currentPage = 1; renderTable(); });
filterStatus.addEventListener('change', () => { currentPage = 1; renderTable(); });
btnPrevPage.addEventListener('click', () => { if(currentPage>1) currentPage--; renderTable(); });
btnNextPage.addEventListener('click', () => { currentPage++; renderTable(); });

// --- LÓGICA DE CREDENCIALES ---

// Función para abrir el modal
function abrirModalCredenciales(user, pass) {
    if(modalCredenciales) { // Check por si no se ha puesto el HTML aún
        document.getElementById('viewUser').textContent = user;
        document.getElementById('viewPass').textContent = pass;
        modalCredenciales.classList.remove('hidden');
    } else {
        alert(`Usuario: ${user}\nContraseña: ${pass}`); // Fallback
    }
}

// Función global para copiar al portapapeles
window.copiarTexto = (elementId) => {
    const texto = document.getElementById(elementId).textContent;
    navigator.clipboard.writeText(texto).then(() => {
        showToast("Copiado al portapapeles", "success");
    }).catch(err => {
        showToast("Error al copiar", "error");
    });
};