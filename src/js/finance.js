import { db, auth } from './firebase-config.js';
import { collection, getDocs, query, where, addDoc, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- REFERENCIAS DOM ---
const tableBody = document.getElementById('tableBody');
const searchInput = document.getElementById('searchInput');
const filterPayment = document.getElementById('filterPayment');

// Paginación
const btnPrevPage = document.getElementById('btnPrevPage');
const btnNextPage = document.getElementById('btnNextPage');
const pageIndicator = document.getElementById('pageIndicator');

// Modales
const modalPago = document.getElementById('modalPago');
const modalHistorial = document.getElementById('modalHistorial'); // NUEVO

const formPago = document.getElementById('formPago');
const selectPeriodo = document.getElementById('pagoPeriodo');

// Estado Global
let allStudents = []; 
let allPayments = []; // Aquí guardaremos TODOS los pagos para consulta rápida
let currentPage = 1;
const rowsPerPage = 20;

// 1. SEGURIDAD
onAuthStateChanged(auth, (user) => {
    if (!user) window.location.href = "index.html";
    else loadFinanceData();
});

// 2. CARGAR DATOS (ALUMNOS Y PAGOS)
async function loadFinanceData() {
    tableBody.innerHTML = '<tr><td colspan="8">Cargando base de datos...</td></tr>';
    try {
        // A) Cargar Alumnos Inscritos
        const qStudents = query(collection(db, "students"), where("status", "==", "inscrito"));
        const snapStudents = await getDocs(qStudents);
        allStudents = [];
        snapStudents.forEach((doc) => allStudents.push({ id: doc.id, ...doc.data() }));
        allStudents.sort((a, b) => a.nombre.localeCompare(b.nombre));

        // B) Cargar TODOS los Pagos (Para saber quién ya pagó)
        const qPayments = query(collection(db, "payments"));
        const snapPayments = await getDocs(qPayments);
        allPayments = [];
        snapPayments.forEach((doc) => allPayments.push({ id: doc.id, ...doc.data() }));

        renderTable();
    } catch (error) {
        console.error("Error:", error);
        tableBody.innerHTML = '<tr><td colspan="8">Error al cargar datos.</td></tr>';
    }
}

// 3. RENDERIZAR TABLA PRINCIPAL
function renderTable() {
    const textoBusqueda = searchInput.value.toLowerCase();
    const filtroPago = filterPayment.value; 
    const hoy = new Date();

    // Filtramos y Procesamos
    const listaProcesada = allStudents.map(alumno => {
        // 1. Calcular el string del "Periodo Actual" (El que debería pagar este mes)
        const periodoActualStr = calcularPeriodoActual(alumno.fechaInicioClases);
        
        // 2. Buscar si existe un pago para este alumno y este periodo
        const estaPagado = allPayments.some(p => p.studentId === alumno.id && p.periodo === periodoActualStr);

        // 3. Determinar estado
        let estadoPago = 'pendiente';
        if (estaPagado) {
            estadoPago = 'pagado';
        } else {
            // Si no está pagado, checamos si ya pasó su día de corte
            const diaCorte = alumno.diaCorte || 5;
            if (hoy.getDate() > diaCorte) estadoPago = 'vencido';
        }

        return { ...alumno, estadoPago, periodoActualStr };
    });

    // Filtros Visuales
    const listaFiltrada = listaProcesada.filter(alumno => {
        const coincideNombre = alumno.nombre.toLowerCase().includes(textoBusqueda);
        
        let coincideFiltro = true;
        if (filtroPago === 'pagado') coincideFiltro = (alumno.estadoPago === 'pagado');
        if (filtroPago === 'pendiente') coincideFiltro = (alumno.estadoPago === 'pendiente' || alumno.estadoPago === 'vencido');

        return coincideNombre && coincideFiltro;
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
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center">No hay alumnos.</td></tr>';
        return;
    }

    alumnosPagina.forEach(alumno => {
        const fila = document.createElement('tr');
        
        // Renderizar Estado
        let htmlEstado = '';
        if (alumno.estadoPago === 'pagado') {
            htmlEstado = `<span class="tag-pago pago-pagado">✅ PAGADO</span>`;
        } else if (alumno.estadoPago === 'vencido') {
            htmlEstado = `<span class="tag-pago pago-vencido">⚠️ VENCIDO (Día ${alumno.diaCorte})</span>`;
        } else {
            htmlEstado = `<span class="tag-pago pago-pendiente">⏳ PENDIENTE (Día ${alumno.diaCorte})</span>`;
        }

        const costo = alumno.costoMensual ? `$${alumno.costoMensual}` : '$0';
        
        fila.innerHTML = `
            <td><strong>${alumno.nombre}</strong></td>
            <td>${alumno.nombreTutor}</td>
            <td style="text-align:center;">${alumno.requiereFactura ? '✅' : 'No'}</td>
            <td style="font-weight:bold; color:#2c3e50;">${costo}</td>
            <td style="text-align:center;">${alumno.diaCorte}</td>
            <td style="text-align:center;"><span class="tag tag-inscrito">ACTIVO</span></td>
            <td>${htmlEstado}</td>
            <td>
                <div style="display:flex; gap:5px;">
                    <button class="btn-history" data-id="${alumno.id}" title="Ver Historial">📜</button>
                    <button class="btn-cobrar" 
                        data-id="${alumno.id}" 
                        data-nombre="${alumno.nombre}" 
                        data-costo="${alumno.costoMensual}"
                        data-inicio="${alumno.fechaInicioClases}">
                        💲 Pagar
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(fila);
    });

    asignarListenersTabla();
    actualizarPaginacion(totalPages);
}

// 4. FUNCIONES DE MODAL PAGO (Cobrar)
function asignarListenersTabla() {
    // Botón Cobrar
    document.querySelectorAll('.btn-cobrar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const d = e.currentTarget.dataset;
            abrirModalPago(d.id, d.nombre, d.costo, d.inicio);
        });
    });

    // Botón Historial (NUEVO)
    document.querySelectorAll('.btn-history').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            // Buscar datos del alumno para mostrarlos en el header
            const alumno = allStudents.find(a => a.id === id);
            abrirHistorial(alumno);
        });
    });
}

// Lógica para abrir modal de pago (Generación de Periodos)
function abrirModalPago(id, nombre, costo, fechaInicioStr) {
    document.getElementById('pagoStudentId').value = id;
    document.getElementById('pagoNombreTexto').value = nombre;
    document.getElementById('pagoAlumnoNombre').value = nombre;
    document.getElementById('pagoMontoBase').value = `$${costo}`;
    document.getElementById('pagoMontoReal').value = costo;
    document.getElementById('pagoFecha').valueAsDate = new Date();
    
    selectPeriodo.innerHTML = '<option>Cargando periodos...</option>';
    modalPago.classList.remove('hidden');

    // Generar lista de periodos (Próximos 12 meses)
    selectPeriodo.innerHTML = '<option value="">-- Selecciona --</option>';
    
    let fechaIteracion = fechaInicioStr ? new Date(fechaInicioStr + 'T12:00:00') : new Date();
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    for (let i = 0; i < 12; i++) {
        let inicio = new Date(fechaIteracion);
        let fin = new Date(fechaIteracion);
        fin.setMonth(fin.getMonth() + 1);

        const strInicio = `${inicio.getDate()} ${meses[inicio.getMonth()]} ${inicio.getFullYear()}`;
        const strFin = `${fin.getDate()} ${meses[fin.getMonth()]} ${fin.getFullYear()}`;
        const valorPeriodo = `${strInicio} - ${strFin}`;

        // Verificamos si YA está pagado en memoria (allPayments)
        const yaPagado = allPayments.some(p => p.studentId === id && p.periodo === valorPeriodo);

        const option = document.createElement('option');
        if (yaPagado) {
            option.text = `✅ PAGADO: ${valorPeriodo}`;
            option.disabled = true;
        } else {
            option.value = valorPeriodo;
            option.text = `⭕ PENDIENTE: ${valorPeriodo}`;
        }
        selectPeriodo.add(option);

        fechaIteracion.setMonth(fechaIteracion.getMonth() + 1);
    }
}

// 5. GUARDAR PAGO
formPago.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        studentId: document.getElementById('pagoStudentId').value,
        nombreAlumno: document.getElementById('pagoNombreTexto').value,
        periodo: selectPeriodo.value,
        monto: Number(document.getElementById('pagoMontoReal').value),
        metodo: document.getElementById('pagoMetodo').value,
        fechaPago: document.getElementById('pagoFecha').value,
        fechaRegistro: new Date()
    };

    try {
        await addDoc(collection(db, "payments"), data);
        alert("Pago registrado");
        modalPago.classList.add('hidden');
        loadFinanceData(); // Recargar todo para actualizar colores
    } catch (e) { alert("Error al guardar pago"); }
});

// 6. HISTORIAL DE PAGOS (Lógica Nueva)
function abrirHistorial(alumno) {
    document.getElementById('historialAlumnoNombre').textContent = alumno.nombre;
    document.getElementById('historialAlumnoEmail').textContent = alumno.emailTutor || 'Sin correo';
    
    // Filtramos los pagos de este alumno
    const pagosAlumno = allPayments.filter(p => p.studentId === alumno.id);
    
    // Ordenar por fecha de pago (más reciente arriba)
    pagosAlumno.sort((a, b) => new Date(b.fechaPago) - new Date(a.fechaPago));

    const tbody = document.getElementById('historialTableBody');
    tbody.innerHTML = '';

    if (pagosAlumno.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No hay pagos registrados.</td></tr>';
    } else {
        pagosAlumno.forEach(pago => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${pago.periodo}</td>
                <td>${pago.fechaPago}</td>
                <td>$${pago.monto}</td>
                <td>${pago.metodo}</td>
                <td>
                    <button class="btn-action-small btn-email-pago" onclick="enviarRecibo('${alumno.emailTutor}', '${pago.periodo}', ${pago.monto})">✉</button>
                    <button class="btn-action-small btn-edit-pago" onclick="editarPago('${pago.id}', ${pago.monto})">✏️</button>
                    <button class="btn-action-small btn-delete-pago" onclick="eliminarPago('${pago.id}')">🗑️</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    modalHistorial.classList.remove('hidden');
}

// Funciones globales para que funcionen los onclick del HTML inyectado
window.eliminarPago = async (idPago) => {
    if(confirm("¿Seguro que deseas eliminar este pago? El periodo volverá a aparecer como pendiente.")) {
        try {
            await deleteDoc(doc(db, "payments", idPago));
            alert("Pago eliminado.");
            modalHistorial.classList.add('hidden');
            loadFinanceData();
        } catch(e) { alert("Error al eliminar"); }
    }
};

window.editarPago = async (idPago, montoActual) => {
    const nuevoMonto = prompt("Editar monto del pago:", montoActual);
    if(nuevoMonto && !isNaN(nuevoMonto)) {
        try {
            await updateDoc(doc(db, "payments", idPago), { monto: Number(nuevoMonto) });
            alert("Monto actualizado.");
            modalHistorial.classList.add('hidden');
            loadFinanceData();
        } catch(e) { alert("Error al editar"); }
    }
};

window.enviarRecibo = (email, periodo, monto) => {
    if(!email) { alert("El alumno no tiene correo registrado."); return; }
    // Simulación de envío
    if(confirm(`¿Enviar recibo a ${email}?\n\nDetalles:\nPeriodo: ${periodo}\nMonto: $${monto}`)) {
        alert("📧 ¡Recibo enviado correctamente! (Simulación)");
    }
};

// UTILIDADES
function calcularPeriodoActual(fechaInicioStr) {
    if (!fechaInicioStr) return "";
    const hoy = new Date();
    const inicio = new Date(fechaInicioStr + 'T12:00:00');
    
    // Buscamos el periodo que cubre el día de HOY
    // Truco: Empezamos iterando desde el inicio de clases hasta pasar la fecha de hoy
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    
    let fechaIter = new Date(inicio);
    // Límite de seguridad para while (5 años)
    let seguridad = 0; 
    
    while(seguridad < 60) {
        let finIter = new Date(fechaIter);
        finIter.setMonth(finIter.getMonth() + 1);
        
        // Si hoy cae dentro de este rango, ESTE es el periodo actual
        if (hoy >= fechaIter && hoy < finIter) {
            const sInicio = `${fechaIter.getDate()} ${meses[fechaIter.getMonth()]} ${fechaIter.getFullYear()}`;
            const sFin = `${finIter.getDate()} ${meses[finIter.getMonth()]} ${finIter.getFullYear()}`;
            return `${sInicio} - ${sFin}`;
        }
        
        // Si hoy es antes del inicio de clases (raro), devolvemos el primer periodo
        if (hoy < inicio) {
             const sInicio = `${inicio.getDate()} ${meses[inicio.getMonth()]} ${inicio.getFullYear()}`;
             // Recalcular fin
             let fin = new Date(inicio); fin.setMonth(fin.getMonth()+1);
             const sFin = `${fin.getDate()} ${meses[fin.getMonth()]} ${fin.getFullYear()}`;
             return `${sInicio} - ${sFin}`;
        }

        fechaIter.setMonth(fechaIter.getMonth() + 1);
        seguridad++;
    }
    return "Periodo Desconocido";
}

function actualizarPaginacion(total) {
    pageIndicator.textContent = `Página ${currentPage} de ${total}`;
    btnPrevPage.disabled = currentPage === 1;
    btnNextPage.disabled = currentPage === total;
}

// Cierre Modales
document.getElementById('btnClosePago').addEventListener('click', () => modalPago.classList.add('hidden'));
document.getElementById('btnCloseHistorial').addEventListener('click', () => modalHistorial.classList.add('hidden'));
document.getElementById('btnCerrarHistorial').addEventListener('click', () => modalHistorial.classList.add('hidden'));

// Listeners Paginación
searchInput.addEventListener('input', () => { currentPage = 1; renderTable(); });
filterPayment.addEventListener('change', () => { currentPage = 1; renderTable(); });
btnPrevPage.addEventListener('click', () => { if(currentPage>1) currentPage--; renderTable(); });
btnNextPage.addEventListener('click', () => { currentPage++; renderTable(); });


// ==========================================
//          LÓGICA DEL REPORTE MENSUAL
// ==========================================

// Referencias del Modal Reporte
const btnAbrirReporte = document.querySelector('.btn-primary'); 

const modalReporte = document.getElementById('modalReporte');
const btnCloseReporte = document.getElementById('btnCloseReporte');
const btnGenerarReporte = document.getElementById('btnGenerarReporte');
const btnImprimirReporte = document.getElementById('btnImprimirReporte');
const btnNuevoReporte = document.getElementById('btnNuevoReporte');

const inputInicio = document.getElementById('reporteInicio');
const inputFin = document.getElementById('reporteFin');
const divFiltros = document.getElementById('reporteFiltros');
const divResultados = document.getElementById('reporteResultados');

// 1. Abrir Modal
// Asegúrate de ponerle id="btnOpenReport" a tu botón en el HTML, o usa esta línea si es el único .btn-primary en el header
document.getElementById('btnOpenReport').addEventListener('click', () => {
    // Poner fechas por defecto (Día 1 del mes actual hasta hoy)
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    
    inputInicio.valueAsDate = primerDia;
    inputFin.valueAsDate = hoy;

    divFiltros.classList.remove('hidden');
    divResultados.classList.add('hidden');
    modalReporte.classList.remove('hidden');
});

btnCloseReporte.addEventListener('click', () => modalReporte.classList.add('hidden'));

// 2. GENERAR CÁLCULOS
btnGenerarReporte.addEventListener('click', () => {
    const fechaInicio = inputInicio.value;
    const fechaFin = inputFin.value;

    if(!fechaInicio || !fechaFin) {
        alert("Selecciona ambas fechas");
        return;
    }

    // Filtrar pagos en el rango (allPayments ya tiene TODOS los pagos cargados desde el inicio)
    const pagosFiltrados = allPayments.filter(pago => {
        return pago.fechaPago >= fechaInicio && pago.fechaPago <= fechaFin;
    });

    if (pagosFiltrados.length === 0) {
        alert("No se encontraron pagos en estas fechas.");
        return;
    }

    procesarDatosReporte(pagosFiltrados);
});

function procesarDatosReporte(pagos) {
    let granTotal = 0;
    
    // Contadores para agrupación
    let mensualidades = {}; // Ej: { "1500": 3, "1200": 1 }
    let inscripciones = 0;
    let totalInscripciones = 0;
    
    let metodos = { "Efectivo": 0, "Transferencia": 0, "Tarjeta": 0 };

    // Limpiar tabla detalle
    const tbody = document.getElementById('tablaDetalleReporte');
    tbody.innerHTML = '';

    // Iterar pagos
    pagos.forEach(p => {
        const monto = Number(p.monto);
        granTotal += monto;

        // A) Agrupar por Concepto
        if (p.periodo === "Pago de Inscripción") {
            inscripciones++;
            totalInscripciones += monto;
        } else {
            // Es mensualidad
            if (!mensualidades[monto]) mensualidades[monto] = 0;
            mensualidades[monto]++;
        }

        // B) Agrupar por Método
        const metodo = p.metodo || "Efectivo";
        if (!metodos[metodo]) metodos[metodo] = 0;
        metodos[metodo] += monto;

        // C) Llenar tabla detalle
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${p.fechaPago}</td>
            <td>${p.nombreAlumno}</td>
            <td>${p.periodo}</td>
            <td>$${monto}</td>
        `;
        tbody.appendChild(tr);
    });

    // RENDERIZAR RESULTADOS
    document.getElementById('txtGranTotal').textContent = `$${granTotal.toLocaleString('es-MX', {minimumFractionDigits: 2})}`;

    // 1. Lista Desglose
    const ulDesglose = document.getElementById('listaDesglose');
    ulDesglose.innerHTML = '';

    // Inscripciones
    if (inscripciones > 0) {
        ulDesglose.innerHTML += `
            <li>
                <span>🎓 Inscripciones (${inscripciones})</span>
                <strong>$${totalInscripciones}</strong>
            </li>`;
    }

    // Mensualidades Agrupadas
    for (const [monto, cantidad] of Object.entries(mensualidades)) {
        const subtotal = monto * cantidad;
        ulDesglose.innerHTML += `
            <li>
                <span>📅 Mensualidades de $${monto} (${cantidad})</span>
                <strong>$${subtotal}</strong>
            </li>`;
    }

    // 2. Corte de Caja (Métodos)
    const divMetodos = document.getElementById('tablaMetodos');
    divMetodos.innerHTML = '';
    for (const [metodo, total] of Object.entries(metodos)) {
        if (total > 0) {
            divMetodos.innerHTML += `
                <div class="metodo-row">
                    <span>${metodo}</span>
                    <strong>$${total.toLocaleString('es-MX')}</strong>
                </div>`;
        }
    }

    // Mostrar vista de resultados
    divFiltros.classList.add('hidden');
    divResultados.classList.remove('hidden');
}

// 3. BOTONES EXTRA
btnNuevoReporte.addEventListener('click', () => {
    divFiltros.classList.remove('hidden');
    divResultados.classList.add('hidden');
});

btnImprimirReporte.addEventListener('click', () => {
    window.print();
});