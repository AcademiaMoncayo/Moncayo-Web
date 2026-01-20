import { db, auth } from './firebase-config.js';
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- REFERENCIAS DOM ---
const tableBody = document.getElementById('tableBody');
const searchInput = document.getElementById('searchInput');
const filterStock = document.getElementById('filterStock');
const filterCategory = document.getElementById('filterCategory');
const totalInventoryValue = document.getElementById('totalInventoryValue');

// Modales
const modalContainer = document.getElementById('modalContainer'); 
const modalRestock = document.getElementById('modalRestock');     
const modalSalida = document.getElementById('modalSalida');       
const modalHistory = document.getElementById('modalHistory');     

// Body Tablas
const historyBody = document.getElementById('historyBody');
const cartBody = document.getElementById('cartBody');

// Forms
const formProduct = document.getElementById('formProduct');
const formRestock = document.getElementById('formRestock');

// Inputs Producto
const prodCantidad = document.getElementById('prodCantidad');
const prodPrecio = document.getElementById('prodPrecio');
const calcTotal = document.getElementById('calcTotal');

// Inputs Salida
const inputProdOut = document.getElementById('inputProdOut');
const listProductsOut = document.getElementById('listProductsOut');
const idProdOut = document.getElementById('idProdOut');
const qtyProdOut = document.getElementById('qtyProdOut');
const btnAddToCart = document.getElementById('btnAddToCart');
const emptyCartMsg = document.getElementById('emptyCartMsg');
const sumQty = document.getElementById('sumQty');
const sumTotal = document.getElementById('sumTotal');
const btnConfirmOutput = document.getElementById('btnConfirmOutput');

// Inputs Historial
const histStart = document.getElementById('histStart');
const histEnd = document.getElementById('histEnd');
const histType = document.getElementById('histType');
const histCount = document.getElementById('histCount');
const histPiezas = document.getElementById('histPiezas');
const histValor = document.getElementById('histValor');
const btnFilterHistory = document.getElementById('btnFilterHistory');

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

// VARIABLES GLOBALES
let allProducts = []; 
let currentCart = []; 
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

// --- FECHA LOCAL ---
function getLocalDateString(dateObj = new Date()) {
    const offset = dateObj.getTimezoneOffset() * 60000; 
    const localDate = new Date(dateObj - offset);
    return localDate.toISOString().split('T')[0];
}

// 1. SEGURIDAD
onAuthStateChanged(auth, (user) => {
    if (!user) window.location.href = "index.html";
    else loadInventory();
});

// 2. CARGAR INVENTARIO
async function loadInventory() {
    tableBody.innerHTML = '<tr><td colspan="7">Cargando inventario...</td></tr>';
    try {
        const q = query(collection(db, "inventory"), orderBy("nombre"));
        const querySnapshot = await getDocs(q);
        
        allProducts = [];
        querySnapshot.forEach((doc) => {
            allProducts.push({ id: doc.id, ...doc.data() });
        });
        renderTable();
        updateDatalist(); 
    } catch (error) {
        console.error("Error:", error);
        showToast("Error de conexión", "error");
        tableBody.innerHTML = '<tr><td colspan="7">Error de conexión.</td></tr>';
    }
}

function updateDatalist() {
    if(!listProductsOut) return;
    listProductsOut.innerHTML = '';
    allProducts.forEach(p => {
        if (p.cantidad > 0) {
            const opt = document.createElement('option');
            opt.value = p.nombre;
            opt.textContent = `Stock: ${p.cantidad} | $${p.precio}`;
            listProductsOut.appendChild(opt);
        }
    });
}

// 3. RENDERIZAR TABLA PRINCIPAL
function renderTable() {
    const texto = searchInput.value.toLowerCase();
    const fStock = filterStock.value;
    const fCat = filterCategory ? filterCategory.value : 'todos';
    let sumaTotalInventario = 0;

    const listaFiltrada = allProducts.filter(prod => {
        const coincideNombre = prod.nombre.toLowerCase().includes(texto);
        
        let coincideStock = true;
        if (fStock === 'bajo') coincideStock = (prod.cantidad > 0 && prod.cantidad <= 5);
        if (fStock === 'agotado') coincideStock = (prod.cantidad === 0);

        let coincideCat = (fCat === 'todos') || (prod.categoria === fCat);

        return coincideNombre && coincideStock && coincideCat;
    });

    const totalPages = Math.ceil(listaFiltrada.length / rowsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    
    const startIndex = (currentPage - 1) * rowsPerPage;
    const itemsPagina = listaFiltrada.slice(startIndex, startIndex + rowsPerPage);

    listaFiltrada.forEach(p => sumaTotalInventario += (p.cantidad * p.precio));
    if(totalInventoryValue) totalInventoryValue.textContent = `$${sumaTotalInventario.toLocaleString('es-MX', {minimumFractionDigits: 2})}`;

    tableBody.innerHTML = '';
    if (itemsPagina.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center">Sin productos.</td></tr>';
        return;
    }

    itemsPagina.forEach(prod => {
        const fila = document.createElement('tr');
        const totalFila = prod.cantidad * prod.precio;

        let stockClass = 'stock-ok';
        if (prod.cantidad <= 5) stockClass = 'stock-low';
        if (prod.cantidad === 0) stockClass = 'stock-out';

        fila.innerHTML = `
            <td>
                <strong>${prod.nombre}</strong><br>
                <small style="color:#888">${prod.descripcion || ''}</small>
            </td>
            <td><span class="cat-badge">${prod.categoria || 'General'}</span></td>
            <td>
                <div class="stock-cell-container">
                    <span class="stock-tag ${stockClass}">${prod.cantidad}</span>
                    <button class="btn-quick-add" data-id="${prod.id}" title="Agregar Stock">+</button>
                </div>
            </td>
            <td class="price-col">$${Number(prod.precio).toFixed(2)}</td>
            <td class="total-col">$${totalFila.toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
            <td>
                <div class="actions-cell">
                    <button class="btn-edit" data-id="${prod.id}" title="Editar">✏️</button>
                    <button class="btn-archive" data-id="${prod.id}" title="Eliminar">🗑️</button>
                </div>
            </td>
        `;
        tableBody.appendChild(fila);
    });

    if(pageIndicator) pageIndicator.textContent = `Página ${currentPage} de ${totalPages}`;
    if(btnPrevPage) btnPrevPage.disabled = currentPage === 1;
    if(btnNextPage) btnNextPage.disabled = currentPage === totalPages;

    asignarEventos();
}

function asignarEventos() {
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const prod = allProducts.find(p => p.id === e.currentTarget.dataset.id);
            abrirModal(prod);
        });
    });
    document.querySelectorAll('.btn-quick-add').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const prod = allProducts.find(p => p.id === e.currentTarget.dataset.id);
            abrirModalRestock(prod);
        });
    });
    
    // ELIMINAR (CON CONFIRMACIÓN)
    document.querySelectorAll('.btn-archive').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            showConfirm("Eliminar Producto", "¿Estás seguro? Se perderá el historial de este item.", async () => {
                try { 
                    await deleteDoc(doc(db, "inventory", id)); 
                    loadInventory(); 
                    showToast("Producto eliminado", "info");
                } catch(err) { showToast("Error al eliminar", "error"); }
            });
        });
    });
}

// 4. LÓGICA DE CARRITO (SALIDA)
inputProdOut.addEventListener('input', () => {
    const val = inputProdOut.value;
    const prod = allProducts.find(p => p.nombre === val);
    if(prod) idProdOut.value = prod.id;
    else idProdOut.value = "";
});

btnAddToCart.addEventListener('click', (e) => {
    e.preventDefault(); 
    const id = idProdOut.value;
    const qty = Number(qtyProdOut.value);

    if (!id || qty <= 0) { showToast("Selecciona producto válido", "error"); return; }

    const productoReal = allProducts.find(p => p.id === id);
    if (productoReal.cantidad < qty) {
        showToast(`❌ Solo hay ${productoReal.cantidad} disponibles`, "error");
        return;
    }

    const existente = currentCart.find(item => item.id === id);
    if (existente) {
        if (productoReal.cantidad < (existente.qty + qty)) {
            showToast("❌ Stock insuficiente en total", "error");
            return;
        }
        existente.qty += qty;
        existente.subtotal = existente.qty * productoReal.precio;
    } else {
        currentCart.push({
            id: productoReal.id,
            nombre: productoReal.nombre,
            qty: qty,
            precio: productoReal.precio,
            subtotal: qty * productoReal.precio
        });
    }

    inputProdOut.value = "";
    idProdOut.value = "";
    qtyProdOut.value = 1;
    inputProdOut.focus();
    renderCart();
});

function renderCart() {
    cartBody.innerHTML = '';
    let totalQ = 0;
    let totalM = 0;

    if (currentCart.length === 0) {
        emptyCartMsg.classList.remove('hidden');
    } else {
        emptyCartMsg.classList.add('hidden');
        currentCart.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.nombre}</td>
                <td style="text-align:center;">${item.qty}</td>
                <td>$${item.precio}</td>
                <td>$${item.subtotal}</td>
                <td><button class="btn-del-row" onclick="removeCartItem(${index})">×</button></td>
            `;
            cartBody.appendChild(tr);
            totalQ += item.qty;
            totalM += item.subtotal;
        });
    }
    sumQty.textContent = totalQ;
    sumTotal.textContent = `$${totalM.toLocaleString('es-MX', {minimumFractionDigits: 2})}`;
}

window.removeCartItem = (index) => {
    currentCart.splice(index, 1);
    renderCart();
};

btnConfirmOutput.addEventListener('click', async () => {
    if (currentCart.length === 0) { showToast("Carrito vacío", "error"); return; }
    
    // Feedback visual
    btnConfirmOutput.textContent = "Procesando...";
    btnConfirmOutput.classList.add('btn-loading');

    const motivo = document.getElementById('salidaMotivo').value;
    const referencia = document.getElementById('salidaRef').value;

    try {
        for (const item of currentCart) {
            const prodRef = doc(db, "inventory", item.id);
            const productoActual = allProducts.find(p => p.id === item.id);
            const nuevoStock = productoActual.cantidad - item.qty;

            await updateDoc(prodRef, {
                cantidad: nuevoStock,
                fechaActualizacion: new Date()
            });

            await addDoc(collection(db, "stock_movements"), {
                productId: item.id,
                productName: item.nombre,
                type: 'salida',
                quantity: item.qty,
                reason: motivo,
                reference: referencia,
                priceAtMoment: item.precio,
                date: new Date()
            });
        }
        showToast("Salida registrada correctamente", "success");
        modalSalida.classList.add('hidden');
        currentCart = [];
        renderCart();
        loadInventory();
        document.getElementById('salidaRef').value = "";
    } catch (error) {
        console.error(error);
        showToast("Error al procesar salida", "error");
    } finally {
        btnConfirmOutput.textContent = "Confirmar Salida";
        btnConfirmOutput.classList.remove('btn-loading');
    }
});

// 5. AGREGAR / EDITAR / REABASTECER
function abrirModalRestock(prod) {
    document.getElementById('restockId').value = prod.id;
    document.getElementById('restockName').textContent = `Reabastecer: ${prod.nombre}`;
    document.getElementById('restockQty').value = "";
    modalRestock.classList.remove('hidden');
    document.getElementById('restockQty').focus();
}

formRestock.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = formRestock.querySelector('button[type="submit"]');
    btnSubmit.classList.add('btn-loading');

    const id = document.getElementById('restockId').value;
    const agregar = Number(document.getElementById('restockQty').value);
    
    const prodActual = allProducts.find(p => p.id === id);
    const nuevaCantidad = Number(prodActual.cantidad) + agregar;

    try {
        await updateDoc(doc(db, "inventory", id), {
            cantidad: nuevaCantidad,
            fechaActualizacion: new Date()
        });
        
        await addDoc(collection(db, "stock_movements"), {
            productId: id,
            productName: prodActual.nombre,
            type: 'entrada',
            quantity: agregar,
            reason: 'Reabastecimiento Rápido',
            date: new Date()
        });

        modalRestock.classList.add('hidden');
        loadInventory();
        showToast("Stock agregado", "success");
    } catch (error) { 
        console.error(error); 
        showToast("Error", "error"); 
    } finally {
        btnSubmit.classList.remove('btn-loading');
    }
});

function calcularTotalModal() {
    const cant = Number(prodCantidad.value) || 0;
    const prec = Number(prodPrecio.value) || 0;
    calcTotal.textContent = `$${(cant * prec).toLocaleString('es-MX', {minimumFractionDigits: 2})}`;
}
prodCantidad.addEventListener('input', calcularTotalModal);
prodPrecio.addEventListener('input', calcularTotalModal);

function abrirModal(prod = null) {
    if (prod) {
        document.getElementById('modalTitle').textContent = "✏️ Editar Producto";
        document.getElementById('editId').value = prod.id;
        document.getElementById('prodNombre').value = prod.nombre;
        if(document.getElementById('prodCategoria')) document.getElementById('prodCategoria').value = prod.categoria || 'Otros';
        document.getElementById('prodDesc').value = prod.descripcion;
        document.getElementById('prodCantidad').value = prod.cantidad;
        document.getElementById('prodPrecio').value = prod.precio;
    } else {
        document.getElementById('modalTitle').textContent = "📦 Nuevo Producto";
        document.getElementById('editId').value = "";
        formProduct.reset();
        document.getElementById('prodCantidad').value = 0;
        document.getElementById('prodPrecio').value = 0;
    }
    calcularTotalModal();
    modalContainer.classList.remove('hidden');
}

formProduct.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = formProduct.querySelector('button[type="submit"]');
    btnSubmit.classList.add('btn-loading');

    const id = document.getElementById('editId').value;
    const data = {
        nombre: document.getElementById('prodNombre').value.trim(),
        categoria: document.getElementById('prodCategoria') ? document.getElementById('prodCategoria').value : 'General',
        descripcion: document.getElementById('prodDesc').value.trim(),
        cantidad: Number(document.getElementById('prodCantidad').value),
        precio: Number(document.getElementById('prodPrecio').value),
        fechaActualizacion: new Date()
    };

    try {
        if (id) await updateDoc(doc(db, "inventory", id), data);
        else await addDoc(collection(db, "inventory"), data);
        modalContainer.classList.add('hidden');
        loadInventory();
        showToast("Guardado correctamente", "success");
    } catch (error) { 
        console.error(error); 
        showToast("Error al guardar", "error"); 
    } finally {
        btnSubmit.classList.remove('btn-loading');
    }
});

// 6. HISTORIAL DE MOVIMIENTOS
async function loadHistory() {
    historyBody.innerHTML = '<tr><td colspan="6" style="text-align:center">Cargando movimientos...</td></tr>';
    
    try {
        // CORRECCIÓN: Fechas de filtro seguras
        let start = histStart.value ? new Date(histStart.value + 'T00:00:00') : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        let end = histEnd.value ? new Date(histEnd.value + 'T23:59:59') : new Date();
        
        // Si no se especificó hora en end, aseguramos final del día
        if(histEnd.value) end.setHours(23, 59, 59);

        const q = query(collection(db, "stock_movements"), orderBy("date", "desc"));
        const snapshot = await getDocs(q);
        
        let movimientos = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            const fechaMov = data.date.toDate(); 
            
            if (fechaMov >= start && fechaMov <= end) {
                movimientos.push({ id: doc.id, ...data, jsDate: fechaMov });
            }
        });

        const tipoFiltro = histType.value;
        if (tipoFiltro !== 'todos') {
            movimientos = movimientos.filter(m => m.type === tipoFiltro);
        }

        renderHistoryTable(movimientos);

    } catch (error) {
        console.error(error);
        historyBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red">Error cargando historial.</td></tr>';
    }
}

function renderHistoryTable(lista) {
    historyBody.innerHTML = '';
    let totalPiezas = 0;
    let totalValor = 0;

    if (lista.length === 0) {
        historyBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#777">No hay movimientos en este periodo.</td></tr>';
        histCount.textContent = 0;
        histPiezas.textContent = 0;
        histValor.textContent = "$0.00";
        return;
    }

    lista.forEach(mov => {
        const tr = document.createElement('tr');
        if(mov.type === 'entrada') tr.style.backgroundColor = '#f1f8e9'; 
        else tr.style.backgroundColor = '#fff3e0'; 
        
        const badge = mov.type === 'entrada' 
            ? '<span style="background:#c8e6c9; color:#2e7d32; padding:2px 6px; border-radius:4px; font-size:10px;">ENTRADA</span>' 
            : '<span style="background:#ffccbc; color:#bf360c; padding:2px 6px; border-radius:4px; font-size:10px;">SALIDA</span>';

        const fechaStr = mov.jsDate.toLocaleDateString() + ' ' + mov.jsDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const valorMov = mov.quantity * (mov.priceAtMoment || 0);

        tr.innerHTML = `
            <td>${fechaStr}</td>
            <td>${badge}</td>
            <td><strong>${mov.productName}</strong></td>
            <td style="text-align:center; font-weight:bold;">${mov.quantity}</td>
            <td>
                <div style="font-size:12px;">${mov.reason}</div>
                <div style="font-size:10px; color:#666;">${mov.reference || '-'}</div>
            </td>
            <td>$${valorMov.toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
        `;
        historyBody.appendChild(tr);

        totalPiezas += mov.quantity;
        totalValor += valorMov;
    });

    histCount.textContent = lista.length;
    histPiezas.textContent = totalPiezas;
    histValor.textContent = `$${totalValor.toLocaleString('es-MX', {minimumFractionDigits: 2})}`;
}

// 7. LISTENERS GENERALES
document.getElementById('btnOpenModal').addEventListener('click', () => abrirModal());
document.getElementById('btnOpenSalida').addEventListener('click', () => {
    currentCart = [];
    renderCart();
    modalSalida.classList.remove('hidden');
});

// BOTÓN HISTORIAL: Configurar fechas y abrir
document.getElementById('btnOpenHistory').addEventListener('click', () => {
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    
    // CORRECCIÓN: Usar la función de ajuste de zona horaria
    histStart.value = getLocalDateString(inicioMes);
    histEnd.value = getLocalDateString(hoy);

    modalHistory.classList.remove('hidden');
    loadHistory();
});



// GENERAR REPORTE (IMPRIMIR)
const btnPrintReport = document.getElementById('btnPrintReport');
if(btnPrintReport) {
    btnPrintReport.addEventListener('click', () => {
        // 1. Validar que haya datos
        if (document.getElementById('historyBody').children.length === 0) {
            showToast("No hay datos para generar reporte", "error");
            return;
        }

        // 2. Cambiar título temporalmente (para el nombre del archivo PDF)
        const originalTitle = document.title;
        const fechaHoy = new Date().toISOString().split('T')[0];
        document.title = `Reporte_Inventario_${fechaHoy}`;

        // 3. Imprimir
        window.print();

        // 4. Restaurar título
        document.title = originalTitle;
    });
}
document.getElementById('btnCloseModal').addEventListener('click', () => modalContainer.classList.add('hidden'));
document.getElementById('btnCloseSalida').addEventListener('click', () => modalSalida.classList.add('hidden'));
document.getElementById('btnCloseRestock').addEventListener('click', () => modalRestock.classList.add('hidden'));
document.getElementById('btnCloseHistory').addEventListener('click', () => modalHistory.classList.add('hidden'));

searchInput.addEventListener('input', () => { currentPage = 1; renderTable(); });
filterStock.addEventListener('change', () => { currentPage = 1; renderTable(); });
if(filterCategory) filterCategory.addEventListener('change', () => { currentPage = 1; renderTable(); });

// Botón Buscar en Historial
if(btnFilterHistory) btnFilterHistory.addEventListener('click', loadHistory);

// Paginación
if(btnPrevPage) btnPrevPage.addEventListener('click', () => { if(currentPage>1) { currentPage--; renderTable(); } });
if(btnNextPage) btnNextPage.addEventListener('click', () => { currentPage++; renderTable(); });