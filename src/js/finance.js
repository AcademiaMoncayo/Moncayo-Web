import { db, auth } from './firebase-config.js';
import { collection, getDocs, query, where, addDoc, doc, deleteDoc, updateDoc, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- REFERENCIAS DOM ---
const tableBody = document.getElementById('tableBody');
const searchInput = document.getElementById('searchInput');
const filterPayment = document.getElementById('filterPayment');
const filterStatus = document.getElementById('filterStatus');

// Paginación
const btnPrevPage = document.getElementById('btnPrevPage');
const btnNextPage = document.getElementById('btnNextPage');
const pageIndicator = document.getElementById('pageIndicator');

// Modales
const modalPago = document.getElementById('modalPago');
const modalHistorial = document.getElementById('modalHistorial');
const modalReporte = document.getElementById('modalReporte');

// Forms y Botones
const formPago = document.getElementById('formPago');
const selectPeriodo = document.getElementById('pagoPeriodo');

// Estado Global
let allStudents = []; 
let allPayments = []; 
let currentPage = 1;
const rowsPerPage = 20;

// --- FUNCIÓN AUXILIAR PARA FECHA LOCAL ---
// Esto soluciona el problema de que marque "mañana" a las 6pm
function getLocalToday() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now - offset);
}

// 1. SEGURIDAD
onAuthStateChanged(auth, (user) => {
    if (!user) window.location.href = "index.html";
    else loadFinanceData();
});

// 2. CARGAR DATOS
async function loadFinanceData() {
    tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center">Cargando base de datos completa...</td></tr>';
    try {
        const qStudents = query(collection(db, "students"), orderBy("nombre"));
        const snapStudents = await getDocs(qStudents);
        allStudents = [];
        snapStudents.forEach((doc) => allStudents.push({ id: doc.id, ...doc.data() }));

        const qPayments = query(collection(db, "payments"));
        const snapPayments = await getDocs(qPayments);
        allPayments = [];
        snapPayments.forEach((doc) => allPayments.push({ id: doc.id, ...doc.data() }));

        renderTable();
    } catch (error) {
        console.error("Error:", error);
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:red;">Error al cargar datos.</td></tr>';
    }
}

// 3. RENDERIZAR TABLA PRINCIPAL
function renderTable() {
    const textoBusqueda = searchInput.value.toLowerCase();
    const filtroPago = filterPayment.value; 
    const filtroEstatus = filterStatus ? filterStatus.value : 'activos'; 
    
    // CORRECCIÓN: Usamos fecha local
    const hoy = getLocalToday(); 
    const diaHoy = hoy.getDate(); // 1 al 31 real de tu zona

    const listaProcesada = allStudents.map(alumno => {
        const periodoActualStr = calcularPeriodoActual(alumno.fechaInicioClases);
        const estaPagado = allPayments.some(p => p.studentId === alumno.id && p.periodo === periodoActualStr);
        
        let estadoPago = 'pendiente';
        if (estaPagado) estadoPago = 'pagado';
        else {
            const diaCorte = alumno.diaCorte || 5;
            // Comparamos el día de hoy local contra el día de corte
            if (diaHoy > diaCorte) estadoPago = 'vencido';
        }
        return { ...alumno, estadoPago, periodoActualStr };
    });

    // --- FILTROS ---
    const listaFiltrada = listaProcesada.filter(alumno => {
        const coincideNombre = alumno.nombre.toLowerCase().includes(textoBusqueda);
        
        let coincidePago = true;
        if (filtroPago === 'pagado') coincidePago = (alumno.estadoPago === 'pagado');
        if (filtroPago === 'pendiente') coincidePago = (alumno.estadoPago === 'pendiente' || alumno.estadoPago === 'vencido');

        let coincideEstatus = true;
        const esBaja = alumno.status !== 'inscrito';

        if (filtroEstatus === 'activos') {
            coincideEstatus = !esBaja;
        } else if (filtroEstatus === 'bajas') {
            coincideEstatus = esBaja;
        }

        return coincideNombre && coincidePago && coincideEstatus;
    });

    const totalPages = Math.ceil(listaFiltrada.length / rowsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    
    const startIndex = (currentPage - 1) * rowsPerPage;
    const alumnosPagina = listaFiltrada.slice(startIndex, startIndex + rowsPerPage);

    tableBody.innerHTML = '';
    if (alumnosPagina.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center">No se encontraron resultados.</td></tr>';
        return;
    }

    alumnosPagina.forEach(alumno => {
        const fila = document.createElement('tr');
        const esBaja = alumno.status !== 'inscrito';
        
        if (esBaja) fila.style.backgroundColor = '#f5f5f5'; 

        let htmlEstadoPago = '';
        if (esBaja) {
            htmlEstadoPago = `<span style="color:#999; font-size:12px;">—</span>`; 
        } else {
            if (alumno.estadoPago === 'pagado') {
                htmlEstadoPago = `<span class="tag-pago pago-pagado">✅ PAGADO</span>`;
            } else if (alumno.estadoPago === 'vencido') {
                htmlEstadoPago = `<span class="tag-pago pago-vencido">⚠️ VENCIDO (Día ${alumno.diaCorte})</span>`;
            } else {
                htmlEstadoPago = `<span class="tag-pago pago-pendiente">⏳ PENDIENTE (Día ${alumno.diaCorte})</span>`;
            }
        }

        let htmlStatusAlumno = esBaja 
            ? `<span class="tag" style="background:#ffebee; color:#c62828; border:1px solid #ffcdd2;">BAJA</span>`
            : `<span class="tag tag-inscrito">ACTIVO</span>`;

        const costo = alumno.costoMensual ? `$${alumno.costoMensual}` : '$0';
        
        fila.innerHTML = `
            <td>
                <strong>${alumno.nombre}</strong>
                ${esBaja ? '<br><small style="color:red;">(Inactivo)</small>' : ''}
            </td>
            <td>${alumno.nombreTutor || '-'}</td>
            <td style="text-align:center;">${alumno.requiereFactura ? '✅' : 'No'}</td>
            <td style="font-weight:bold; color:#2c3e50;">${costo}</td>
            <td style="text-align:center;">${alumno.diaCorte || '-'}</td>
            <td style="text-align:center;">${htmlStatusAlumno}</td>
            <td>${htmlEstadoPago}</td>
            <td>
                <div style="display:flex; gap:5px;">
                    <button class="btn-history" data-id="${alumno.id}" title="Ver Historial">📜</button>
                    ${!esBaja ? 
                        `<button class="btn-cobrar" 
                            data-id="${alumno.id}" 
                            data-nombre="${alumno.nombre}" 
                            data-costo="${alumno.costoMensual}"
                            data-inicio="${alumno.fechaInicioClases}">
                            💲 Pagar
                        </button>` 
                        : '' 
                    }
                </div>
            </td>
        `;
        tableBody.appendChild(fila);
    });

    asignarListenersTabla();
    actualizarPaginacion(totalPages);
}

// 4. LISTENERS
function asignarListenersTabla() {
    document.querySelectorAll('.btn-cobrar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const d = e.currentTarget.dataset;
            abrirModalPago(d.id, d.nombre, d.costo, d.inicio);
        });
    });

    document.querySelectorAll('.btn-history').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const alumno = allStudents.find(a => a.id === id);
            abrirHistorial(alumno);
        });
    });
}

function abrirModalPago(id, nombre, costo, fechaInicioStr) {
    document.getElementById('pagoStudentId').value = id;
    document.getElementById('pagoNombreTexto').value = nombre;
    document.getElementById('pagoMontoBase').value = `$${costo}`;
    document.getElementById('pagoMontoReal').value = costo;
    
    // CORRECCIÓN: Fecha del input modal
    const hoyLocal = getLocalToday();
    document.getElementById('pagoFecha').value = hoyLocal.toISOString().split('T')[0];
    
    selectPeriodo.innerHTML = '<option>Cargando periodos...</option>';
    modalPago.classList.remove('hidden');

    selectPeriodo.innerHTML = '<option value="">-- Selecciona Periodo --</option>';
    
    // Para calcular periodos, usamos T12:00:00 para asegurar medio día y evitar saltos
    let fechaIteracion = fechaInicioStr ? new Date(fechaInicioStr + 'T12:00:00') : new Date();
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    for (let i = 0; i < 12; i++) {
        let inicio = new Date(fechaIteracion);
        let fin = new Date(fechaIteracion);
        fin.setMonth(fin.getMonth() + 1);

        const strInicio = `${inicio.getDate()} ${meses[inicio.getMonth()]} ${inicio.getFullYear()}`;
        const strFin = `${fin.getDate()} ${meses[fin.getMonth()]} ${fin.getFullYear()}`;
        const valorPeriodo = `${strInicio} - ${strFin}`;

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
        tipo: 'ingreso', 
        concepto: `Mensualidad ${selectPeriodo.value}`, 
        fechaRegistro: new Date()
    };

    try {
        await addDoc(collection(db, "payments"), data);
        await addDoc(collection(db, "finance"), { ...data, concepto: `Mensualidad: ${data.nombreAlumno}` });

        alert("Pago registrado exitosamente");
        modalPago.classList.add('hidden');
        loadFinanceData();
    } catch (e) { console.error(e); alert("Error al guardar pago"); }
});

// 6. HISTORIAL
function abrirHistorial(alumno) {
    document.getElementById('historialAlumnoNombre').textContent = alumno.nombre;
    const emailT = alumno.emailTutor || 'Sin correo';
    document.getElementById('historialAlumnoEmail').textContent = alumno.status === 'inscrito' ? emailT : `${emailT} (BAJA)`;
    
    const pagosAlumno = allPayments.filter(p => p.studentId === alumno.id);
    // Ordenar fechas correctamente
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

// GLOBALES
window.eliminarPago = async (idPago) => {
    if(confirm("¿Seguro que deseas eliminar este pago?")) {
        try {
            await deleteDoc(doc(db, "payments", idPago));
            alert("Pago eliminado.");
            modalHistorial.classList.add('hidden');
            loadFinanceData();
        } catch(e) { alert("Error al eliminar"); }
    }
};

window.editarPago = async (idPago, montoActual) => {
    const nuevoMonto = prompt("Nuevo monto:", montoActual);
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
    if(!email || email === 'undefined') { alert("Sin correo registrado."); return; }
    if(confirm(`¿Enviar recibo a ${email}?`)) { alert("📧 Recibo enviado (Simulación)"); }
};

// UTILIDADES: CALCULO DE PERIODO (ZONA HORARIA SEGURA)
function calcularPeriodoActual(fechaInicioStr) {
    if (!fechaInicioStr) return "";
    
    // CORRECCIÓN: Usamos fecha local en lugar de UTC
    const hoyLocal = getLocalToday();
    
    // Al leer el string de inicio, forzamos T12:00:00 para evitar que se regrese un día
    const inicio = new Date(fechaInicioStr + 'T12:00:00');
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    
    let fechaIter = new Date(inicio);
    let seguridad = 0; 
    
    while(seguridad < 60) {
        let finIter = new Date(fechaIter);
        finIter.setMonth(finIter.getMonth() + 1);
        
        if (hoyLocal >= fechaIter && hoyLocal < finIter) {
            const sInicio = `${fechaIter.getDate()} ${meses[fechaIter.getMonth()]} ${fechaIter.getFullYear()}`;
            const sFin = `${finIter.getDate()} ${meses[finIter.getMonth()]} ${finIter.getFullYear()}`;
            return `${sInicio} - ${sFin}`;
        }
        if (hoyLocal < inicio) {
             const sInicio = `${inicio.getDate()} ${meses[inicio.getMonth()]} ${inicio.getFullYear()}`;
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
    if(pageIndicator) pageIndicator.textContent = `Página ${currentPage} de ${total}`;
    if(btnPrevPage) btnPrevPage.disabled = currentPage === 1;
    if(btnNextPage) btnNextPage.disabled = currentPage === total;
}

// Listeners
document.getElementById('btnClosePago').addEventListener('click', () => modalPago.classList.add('hidden'));
document.getElementById('btnCloseHistorial').addEventListener('click', () => modalHistorial.classList.add('hidden'));
document.getElementById('btnCerrarHistorial').addEventListener('click', () => modalHistorial.classList.add('hidden'));

searchInput.addEventListener('input', () => { currentPage = 1; renderTable(); });
filterPayment.addEventListener('change', () => { currentPage = 1; renderTable(); });

if(filterStatus) {
    filterStatus.addEventListener('change', () => { 
        currentPage = 1; 
        renderTable(); 
    });
}

if(btnPrevPage) btnPrevPage.addEventListener('click', () => { if(currentPage>1) currentPage--; renderTable(); });
if(btnNextPage) btnNextPage.addEventListener('click', () => { currentPage++; renderTable(); });

// REPORTES
const inputInicio = document.getElementById('reporteInicio');
const inputFin = document.getElementById('reporteFin');
const divFiltros = document.getElementById('reporteFiltros');
const divResultados = document.getElementById('reporteResultados');
const btnOpenReport = document.getElementById('btnOpenReport') || document.querySelector('.btn-primary'); 

if(btnOpenReport) {
    btnOpenReport.addEventListener('click', () => {
        const hoy = getLocalToday();
        const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        
        // Ajuste zona horaria para inputs date
        if(inputInicio) inputInicio.value = primerDia.toISOString().split('T')[0];
        if(inputFin) inputFin.value = hoy.toISOString().split('T')[0];
        
        if(divFiltros) divFiltros.classList.remove('hidden');
        if(divResultados) divResultados.classList.add('hidden');
        if(modalReporte) modalReporte.classList.remove('hidden');
    });
}

const btnCloseReporte = document.getElementById('btnCloseReporte');
if(btnCloseReporte) btnCloseReporte.addEventListener('click', () => modalReporte.classList.add('hidden'));

const btnGenerarReporte = document.getElementById('btnGenerarReporte');
if(btnGenerarReporte) {
    btnGenerarReporte.addEventListener('click', () => {
        const fechaInicio = inputInicio.value;
        const fechaFin = inputFin.value;
        if(!fechaInicio || !fechaFin) { alert("Selecciona fechas"); return; }
        
        const pagosFiltrados = allPayments.filter(pago => {
            return pago.fechaPago >= fechaInicio && pago.fechaPago <= fechaFin;
        });
        if (pagosFiltrados.length === 0) { alert("No hay pagos en estas fechas."); return; }
        procesarDatosReporte(pagosFiltrados);
    });
}

function procesarDatosReporte(pagos) {
    let granTotal = 0;
    let mensualidades = {}; 
    let inscripciones = 0;
    let totalInscripciones = 0;
    let metodos = { "Efectivo": 0, "Transferencia": 0, "Tarjeta": 0 };

    const tbody = document.getElementById('tablaDetalleReporte');
    if(tbody) tbody.innerHTML = '';

    pagos.forEach(p => {
        const monto = Number(p.monto);
        granTotal += monto;
        if (p.periodo && p.periodo.includes("Inscripción")) {
            inscripciones++;
            totalInscripciones += monto;
        } else {
            if (!mensualidades[monto]) mensualidades[monto] = 0;
            mensualidades[monto]++;
        }
        const metodo = p.metodo || "Efectivo";
        if (!metodos[metodo]) metodos[metodo] = 0;
        metodos[metodo] += monto;
        if(tbody) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${p.fechaPago}</td><td>${p.nombreAlumno}</td><td>${p.periodo}</td><td>$${monto}</td>`;
            tbody.appendChild(tr);
        }
    });

    document.getElementById('txtGranTotal').textContent = `$${granTotal.toLocaleString('es-MX', {minimumFractionDigits: 2})}`;
    const ulDesglose = document.getElementById('listaDesglose');
    if(ulDesglose) {
        ulDesglose.innerHTML = '';
        if (inscripciones > 0) ulDesglose.innerHTML += `<li><span>🎓 Inscripciones (${inscripciones})</span><strong>$${totalInscripciones}</strong></li>`;
        for (const [monto, cantidad] of Object.entries(mensualidades)) {
            ulDesglose.innerHTML += `<li><span>📅 Mensualidades $${monto} (${cantidad})</span><strong>$${monto * cantidad}</strong></li>`;
        }
    }
    const divMetodos = document.getElementById('tablaMetodos');
    if(divMetodos) {
        divMetodos.innerHTML = '';
        for (const [metodo, total] of Object.entries(metodos)) {
            if (total > 0) divMetodos.innerHTML += `<div class="metodo-row"><span>${metodo}</span><strong>$${total.toLocaleString('es-MX')}</strong></div>`;
        }
    }
    divFiltros.classList.add('hidden');
    divResultados.classList.remove('hidden');
}

const btnNuevoReporte = document.getElementById('btnNuevoReporte');
if(btnNuevoReporte) btnNuevoReporte.addEventListener('click', () => {
    divFiltros.classList.remove('hidden');
    divResultados.classList.add('hidden');
});

const btnImprimirReporte = document.getElementById('btnImprimirReporte');
if(btnImprimirReporte) btnImprimirReporte.addEventListener('click', () => window.print());