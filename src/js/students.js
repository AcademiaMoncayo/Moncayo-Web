import { db, auth } from './firebase-config.js';
import { collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- REFERENCIAS AL DOM ---
const tableBody = document.getElementById('tableBody');
const searchInput = document.getElementById('searchInput');
const filterStatus = document.getElementById('filterStatus');

// Modal y Formulario
const modalContainer = document.getElementById('modalContainer');
const btnOpenModal = document.getElementById('btnOpenModal');
const btnCloseModal = document.getElementById('btnCloseModal');
const formStudent = document.getElementById('formStudent');

// Estado Global (Para búsqueda rápida sin recargar Firebase)
let allStudents = []; 

// 1. SEGURIDAD
onAuthStateChanged(auth, (user) => {
    if (!user) window.location.href = "index.html";
    else loadStudents(); // Si hay usuario, cargamos la tabla
});

// 2. CARGAR ALUMNOS DE FIREBASE
async function loadStudents() {
    tableBody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';
    
    try {
        const q = query(collection(db, "students"), orderBy("nombre"));
        const querySnapshot = await getDocs(q);
        
        allStudents = []; // Limpiamos array
        querySnapshot.forEach((doc) => {
            allStudents.push({ id: doc.id, ...doc.data() });
        });

        renderTable(); // Dibujamos la tabla inicial
    } catch (error) {
        console.error("Error al cargar:", error);
        tableBody.innerHTML = '<tr><td colspan="5" style="color:red">Error al cargar datos.</td></tr>';
    }
}

// 3. RENDERIZAR TABLA (Con Filtros de Buscador y Select)
function renderTable() {
    const textoBusqueda = searchInput.value.toLowerCase();
    const filtroEstado = filterStatus.value; // 'todos', 'inscrito', 'prospecto'

    // Filtramos el array global
    const listaFiltrada = allStudents.filter(alumno => {
        // 1. Coincide con el Select?
        const coincideEstado = (filtroEstado === 'todos') || (alumno.status === filtroEstado);
        
        // 2. Coincide con el Buscador?
        const coincideNombre = alumno.nombre.toLowerCase().includes(textoBusqueda);
        
        return coincideEstado && coincideNombre;
    });

    // Limpiamos tabla
    tableBody.innerHTML = '';

    if (listaFiltrada.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center">No se encontraron resultados.</td></tr>';
        return;
    }

    // Dibujamos filas
    listaFiltrada.forEach(alumno => {
        const fila = document.createElement('tr');
        
        // Etiqueta de color
        const claseStatus = alumno.status === 'inscrito' ? 'tag-inscrito' : 'tag-prospecto';
        
        fila.innerHTML = `
            <td>${alumno.nombre}</td>
            <td>${alumno.instrumentoInteres || 'N/A'}</td>
            <td>
                ${alumno.nombreTutor}<br>
                <small style="color:#666">${alumno.telefonoTutor}</small>
            </td>
            <td><span class="tag ${claseStatus}">${alumno.status.toUpperCase()}</span></td>
            <td>
                ${alumno.status === 'prospecto' 
                    ? `<button class="btn-action" onclick="alert('Inscribir a ${alumno.nombre} (Pendiente)')">Inscribir</button>` 
                    : '<span style="color:green">✔ Activo</span>'}
            </td>
        `;
        tableBody.appendChild(fila);
    });
}

// 4. GUARDAR NUEVO PROSPECTO
formStudent.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nuevoAlumno = {
        nombre: document.getElementById('newNombre').value.trim(),
        edad: document.getElementById('newEdad').value,
        instrumentoInteres: document.getElementById('newInstrumento').value.trim(),
        nombreTutor: document.getElementById('newTutor').value.trim(),
        telefonoTutor: document.getElementById('newTelefono').value.trim(),
        status: "prospecto", // Por defecto entran como prospectos
        fechaRegistro: new Date()
    };

    try {
        await addDoc(collection(db, "students"), nuevoAlumno);
        alert("Prospecto guardado correctamente");
        toggleModal();      // Cerrar modal
        formStudent.reset(); // Limpiar campos
        loadStudents();      // Recargar tabla
    } catch (error) {
        console.error("Error al guardar:", error);
        alert("Hubo un error al guardar");
    }
});

// 5. CONTROL DEL MODAL (Abrir/Cerrar)
function toggleModal() {
    modalContainer.classList.toggle('hidden');
}

btnOpenModal.addEventListener('click', toggleModal);
btnCloseModal.addEventListener('click', toggleModal);

// Cerrar si clic fuera del modal
modalContainer.addEventListener('click', (e) => {
    if (e.target === modalContainer) toggleModal();
});

// 6. LISTENERS PARA BÚSQUEDA
searchInput.addEventListener('input', renderTable);
filterStatus.addEventListener('change', renderTable);