// Variables globales
let semanaActual = null;
let productosEstaticos = [];
let productosGuardados = [];
let gastos = [];
let gastoEditando = null;
const API_URL = "https://backend-express-production-a427.up.railway.app";

// Productos estáticos basados en la imagen
const PRODUCTOS_ESTATICOS_DATA = [
    { nombre: "Costilla", precio_unitario: 12000 },
    { nombre: "Asadura", precio_unitario: 8000 },
    { nombre: "Creadillas", precio_unitario: 10000 },
    { nombre: "Patas", precio_unitario: 8000 },
    { nombre: "Cabezas", precio_unitario: 10000 },
    { nombre: "Menudos", precio_unitario: 10000 },
    { nombre: "Manteca", precio_unitario: 20000 },
    { nombre: "Sangre", precio_unitario: 50000 },
    { nombre: "Guia", precio_unitario: 116000 }
];

// Función para formatear números como moneda
function formatearMoneda(valor) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(valor);
}

// Función para volver al dashboard
function volverAlDashboard() {
    window.location.href = 'index.html';
}

// Cargar información de la semana desde URL parameters
function cargarSemanaDesdeURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const semanaParam = urlParams.get('semana');
    
    if (semanaParam) {
        try {
            semanaActual = JSON.parse(decodeURIComponent(semanaParam));
            actualizarInfoSemana();
            inicializarProductosEstaticos();
            cargarProductosGuardados();
            cargarGastos();
        } catch (error) {
            console.error('Error al cargar la semana:', error);
            mostrarError('Error al cargar la información de la semana');
        }
    } else {
        mostrarError('No se encontró información de la semana');
        setTimeout(volverAlDashboard, 2000);
    }
}

// Inicializar productos estáticos
function inicializarProductosEstaticos() {
    productosEstaticos = PRODUCTOS_ESTATICOS_DATA.map(producto => ({
        ...producto,
        libras: 0,
        total: 0,
        gasto: 0,
        total_final: 0,
        id: null, // Se llenará cuando se guarde
        semana_id: semanaActual.id
    }));
    
    actualizarTablaProductos();
}

// Actualizar información de la semana en la interfaz
function actualizarInfoSemana() {
    if (!semanaActual) return;
    
    document.getElementById('fechaSemanaInfo').textContent = formatFecha(semanaActual.fecha);
    document.getElementById('nombreSemanaInfo').textContent = semanaActual.nombre;
    document.getElementById('mesSemanaInfo').textContent = semanaActual.mes;
    document.getElementById('idSemanaInfo').textContent = semanaActual.id || 'N/A';
}

// Formatear fecha
function formatFecha(fechaString) {
    const fecha = new Date(fechaString);
    return fecha.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).replace(/^\w/, c => c.toUpperCase());
}

// Cargar productos guardados desde la API
async function cargarProductosGuardados() {
    if (!semanaActual || !semanaActual.id) {
        console.error('No hay semana seleccionada');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/productos/semana/${semanaActual.id}`);
        
        if (response.ok) {
            const data = await response.json();
            productosGuardados = data;
            
            // Actualizar los productos estáticos con los datos guardados
            productosEstaticos.forEach(productoEstatico => {
                const productoGuardado = productosGuardados.find(p => 
                    p.nombre.toLowerCase() === productoEstatico.nombre.toLowerCase()
                );
                
                if (productoGuardado) {
                    productoEstatico.id = productoGuardado.id;
                    productoEstatico.libras = productoGuardado.libras || 0;
                    productoEstatico.gasto = productoGuardado.gasto || 0;
                    productoEstatico.total = productoGuardado.total || 0;
                    productoEstatico.total_final = productoGuardado.total_final || 0;
                }
            });
            
            actualizarTablaProductos();
            actualizarResumen();
        }
    } catch (error) {
        console.error('Error al cargar productos:', error);
    }
}

// Cargar gastos desde la API (usando la tabla productos con libras=0)
async function cargarGastos() {
    if (!semanaActual || !semanaActual.id) {
        console.error('No hay semana seleccionada');
        return;
    }

    try {
        // Cargar todos los productos de la semana
        const response = await fetch(`${API_URL}/api/productos/semana/${semanaActual.id}`);
        
        if (response.ok) {
            const todosProductos = await response.json();
            
            // Filtrar los que son gastos (productos que no están en la lista estática y tienen libras=0)
            gastos = todosProductos.filter(producto => {
                // Verificar si NO es un producto estático
                const esProductoEstatico = PRODUCTOS_ESTATICOS_DATA.some(p => 
                    p.nombre.toLowerCase() === producto.nombre.toLowerCase()
                );
                
                return !esProductoEstatico && producto.libras === 0;
            });
            
            actualizarTablaGastos();
            actualizarResumen();
        }
    } catch (error) {
        console.error('Error al cargar gastos:', error);
    }
}

// Actualizar tabla de productos
function actualizarTablaProductos() {
    const tbody = document.getElementById('productosBody');
    
    if (!productosEstaticos || productosEstaticos.length === 0) {
        tbody.innerHTML = '<tr class="no-data"><td colspan="5">No hay productos configurados</td></tr>';
        actualizarTotalesProductos(0);
        return;
    }

    let html = '';
    let totalProductos = 0;

    productosEstaticos.forEach((producto, index) => {
        const total = producto.precio_unitario * (producto.libras || 0);
        totalProductos += total;

        html += `
            <tr>
                <td>${producto.nombre}</td>
                <td class="valor-numerico">${formatearMoneda(producto.precio_unitario)}</td>
                <td>
                    <input type="number" 
                           id="libras-${index}" 
                           class="input-libras" 
                           value="${producto.libras || 0}" 
                           min="0" 
                           step="0.01"
                           onchange="actualizarTotalProducto(${index})"
                           oninput="actualizarTotalProducto(${index})"
                           placeholder="0.00">
                </td>
                <td class="valor-numerico" id="total-${index}">${formatearMoneda(total)}</td>
                <td>
                    <button class="btn-accion btn-guardar-individual" onclick="guardarProductoIndividual(${index})" ${producto.id ? 'style="display:none"' : ''}>
                        <i class="fas fa-save"></i> Guardar
                    </button>
                    ${producto.id ? `<span class="guardado-label"><i class="fas fa-check"></i> Guardado</span>` : ''}
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    
    // Actualizar totales en la tabla
    actualizarTotalesProductos(totalProductos);
}

// Actualizar total de un producto individual
function actualizarTotalProducto(index) {
    const inputLibras = document.getElementById(`libras-${index}`);
    const celdaTotal = document.getElementById(`total-${index}`);
    
    if (!inputLibras || !celdaTotal) return;
    
    const libras = parseFloat(inputLibras.value) || 0;
    const precio = productosEstaticos[index].precio_unitario;
    const total = precio * libras;
    
    celdaTotal.textContent = formatearMoneda(total);
    
    // Actualizar en el array
    productosEstaticos[index].libras = libras;
    productosEstaticos[index].total = total;
    productosEstaticos[index].total_final = total - (productosEstaticos[index].gasto || 0);
    
    // Recalcular totales
    recalcularTotales();
}

// Recalcular totales
function recalcularTotales() {
    const totalProductos = productosEstaticos.reduce((sum, p) => {
        return sum + (p.precio_unitario * (p.libras || 0));
    }, 0);
    
    actualizarTotalesProductos(totalProductos);
    actualizarResumen();
}

// Actualizar totales de productos
function actualizarTotalesProductos(totalProductos) {
    document.getElementById('totalProductos').textContent = formatearMoneda(totalProductos);
}

// Actualizar tabla de gastos
function actualizarTablaGastos() {
    const tbody = document.getElementById('gastosBody');
    
    if (!gastos || gastos.length === 0) {
        tbody.innerHTML = '<tr class="no-data"><td colspan="3">No hay gastos registrados</td></tr>';
        document.getElementById('totalGastosTabla').textContent = formatearMoneda(0);
        return;
    }

    let html = '';
    let totalGastos = 0;

    gastos.forEach(gasto => {
        // Para gastos, el valor es el campo "gasto" o el precio_unitario si gasto es 0
        const valorGasto = parseFloat(gasto.gasto) || parseFloat(gasto.precio_unitario) || 0;
        totalGastos += valorGasto;
        
        html += `
            <tr>
                <td>${gasto.nombre}</td>
                <td class="valor-numerico">${formatearMoneda(valorGasto)}</td>
                <td>
                    <button class="btn-accion btn-editar" onclick="editarGasto(${gasto.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-accion btn-eliminar" onclick="eliminarGasto(${gasto.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    document.getElementById('totalGastosTabla').textContent = formatearMoneda(totalGastos);
}

// Actualizar resumen
function actualizarResumen() {
    // Calcular total productos
    const totalProductos = productosEstaticos.reduce((sum, p) => {
        return sum + (p.precio_unitario * (p.libras || 0));
    }, 0);
    
    // Calcular total gastos
    const totalGastos = gastos.reduce((sum, g) => {
        const valorGasto = parseFloat(g.gasto) || parseFloat(g.precio_unitario) || 0;
        return sum + valorGasto;
    }, 0);
    
    // Total final = total productos - total gastos
    const totalFinal = totalProductos - totalGastos;
    
    // Actualizar UI
    document.getElementById('resumenTotalProductos').textContent = formatearMoneda(totalProductos);
    document.getElementById('resumenTotalGastos').textContent = formatearMoneda(totalGastos);
    document.getElementById('resumenTotalFinal').textContent = formatearMoneda(totalFinal);
}

// Guardar un producto individual
async function guardarProductoIndividual(index) {
    const producto = productosEstaticos[index];
    
    if (!producto.libras || producto.libras <= 0) {
        mostrarError(`Ingresa las libras para ${producto.nombre}`);
        return;
    }
    
    const productoData = {
        nombre: producto.nombre,
        precio_unitario: producto.precio_unitario,
        libras: producto.libras,
        gasto: producto.gasto || 0,
        semana_id: semanaActual.id
    };
    
    try {
        const btnGuardar = document.querySelector(`#libras-${index}`).parentElement.parentElement.querySelector('.btn-guardar-individual');
        if (btnGuardar) btnGuardar.disabled = true;
        
        const response = await fetch(`${API_URL}/api/productos`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(productoData)
        });
        
        if (response.ok) {
            const data = await response.json();
            productosEstaticos[index].id = data.id;
            
            // Actualizar la fila para mostrar que está guardado
            const fila = document.querySelector(`#libras-${index}`).parentElement.parentElement;
            const celdaAcciones = fila.querySelector('td:last-child');
            
            if (celdaAcciones) {
                celdaAcciones.innerHTML = `<span class="guardado-label"><i class="fas fa-check"></i> Guardado</span>`;
            }
            
            mostrarExito(`${producto.nombre} guardado`);
            
            // Recalcular totales
            actualizarTablaProductos();
            actualizarResumen();
        } else {
            const error = await response.json();
            mostrarError(error.error || `Error al guardar ${producto.nombre}`);
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error de conexión al guardar el producto');
    }
}

// Guardar todos los productos
async function guardarTodosProductos() {
    const productosConLibras = productosEstaticos.filter(p => p.libras > 0);
    
    if (productosConLibras.length === 0) {
        mostrarError('Ingresa las libras para al menos un producto');
        return;
    }
    
    const btnGuardarTodo = document.querySelector('.btn-guardar-todo');
    const originalText = btnGuardarTodo.innerHTML;
    btnGuardarTodo.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    btnGuardarTodo.disabled = true;
    
    let guardados = 0;
    let errores = 0;
    
    for (let i = 0; i < productosConLibras.length; i++) {
        const producto = productosConLibras[i];
        
        // Solo guardar si no tiene ID (no está guardado aún)
        if (!producto.id) {
            try {
                const productoData = {
                    nombre: producto.nombre,
                    precio_unitario: producto.precio_unitario,
                    libras: producto.libras,
                    gasto: producto.gasto || 0,
                    semana_id: semanaActual.id
                };
                
                const response = await fetch(`${API_URL}/api/productos`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(productoData)
                });
                
                if (response.ok) {
                    const data = await response.json();
                    producto.id = data.id;
                    guardados++;
                } else {
                    errores++;
                }
            } catch (error) {
                console.error(`Error al guardar ${producto.nombre}:`, error);
                errores++;
            }
        }
    }
    
    // Restaurar botón
    btnGuardarTodo.innerHTML = originalText;
    btnGuardarTodo.disabled = false;
    
    // Actualizar interfaz
    actualizarTablaProductos();
    actualizarResumen();
    
    // Mostrar resultado
    if (errores === 0) {
        mostrarExito(`${guardados} productos guardados correctamente`);
    } else {
        mostrarError(`Se guardaron ${guardados} productos. ${errores} errores.`);
    }
}

// Mostrar modal de gasto
function mostrarModalGasto() {
    if (!semanaActual || !semanaActual.id) {
        mostrarError('Primero debes seleccionar una semana');
        return;
    }
    
    gastoEditando = null;
    document.getElementById('modalGastoTitulo').textContent = 'Agregar Gasto';
    document.getElementById('gastoConcepto').value = '';
    document.getElementById('gastoValor').value = '';
    
    document.getElementById('modalGasto').style.display = 'flex';
}

// Cerrar modal de gasto
function cerrarModalGasto() {
    document.getElementById('modalGasto').style.display = 'none';
    gastoEditando = null;
}

// Guardar gasto
async function guardarGasto() {
    const concepto = document.getElementById('gastoConcepto').value.trim();
    const valor = parseFloat(document.getElementById('gastoValor').value);
    
    if (!concepto || !valor) {
        mostrarError('Por favor completa todos los campos');
        return;
    }
    
    if (valor < 0) {
        mostrarError('El valor no puede ser negativo');
        return;
    }
    
    // Para gastos, usamos la tabla productos pero con:
    // - nombre = concepto del gasto
    // - precio_unitario = valor del gasto
    // - libras = 0
    // - gasto = 0 (o podría ser el valor también)
    
    const gastoData = {
        nombre: concepto,
        precio_unitario: valor,
        libras: 0,
        gasto: 0, // O podríamos usar valor aquí también
        semana_id: semanaActual.id
    };
    
    try {
        const response = await fetch(`${API_URL}/api/productos`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(gastoData)
        });
        
        if (response.ok) {
            cerrarModalGasto();
            await cargarGastos(); // Recargar gastos
            mostrarExito('Gasto agregado');
        } else {
            const error = await response.json();
            mostrarError(error.error || 'Error al guardar el gasto');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error de conexión al guardar el gasto');
    }
}

// Editar gasto
function editarGasto(id) {
    const gasto = gastos.find(g => g.id === id);
    if (!gasto) return;
    
    gastoEditando = gasto;
    document.getElementById('modalGastoTitulo').textContent = 'Editar Gasto';
    document.getElementById('gastoConcepto').value = gasto.nombre;
    document.getElementById('gastoValor').value = gasto.gasto || gasto.precio_unitario || 0;
    
    document.getElementById('modalGasto').style.display = 'flex';
}

// Eliminar gasto
async function eliminarGasto(id) {
    if (!confirm('¿Estás seguro de eliminar este gasto?')) return;
    
    try {
        const response = await fetch(`${API_URL}/api/productos/${id}`, {
            method: "DELETE"
        });
        
        if (response.ok) {
            await cargarGastos();
            mostrarExito('Gasto eliminado');
        } else {
            mostrarError('Error al eliminar el gasto');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error de conexión al eliminar el gasto');
    }
}

// Mostrar mensaje de éxito
function mostrarExito(mensaje) {
    // Crear notificación temporal
    const notification = document.createElement('div');
    notification.className = 'notification exito';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${mensaje}</span>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }, 10);
}

// Mostrar mensaje de error
function mostrarError(mensaje) {
    // Crear notificación temporal
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${mensaje}</span>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }, 10);
}

// CSS adicional para notificaciones (debe estar en styles-cuentas.css)
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 10px;
        color: white;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        transform: translateX(100%);
        opacity: 0;
        transition: all 0.3s ease;
        max-width: 300px;
    }
    
    .notification.show {
        transform: translateX(0);
        opacity: 1;
    }
    
    .notification.exito {
        background: linear-gradient(to right, #27ae60, #2ecc71);
        border-left: 4px solid #2ecc71;
    }
    
    .notification.error {
        background: linear-gradient(to right, #c0392b, #e74c3c);
        border-left: 4px solid #e74c3c;
    }
    
    .notification i {
        font-size: 1.2rem;
    }
    
    .guardado-label {
        color: #27ae60;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 5px;
    }
    
    .btn-guardar-individual {
        background: linear-gradient(to right, #3498db, #2980b9);
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 0.8rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 5px;
    }
    
    .btn-guardar-individual:hover {
        background: linear-gradient(to right, #2980b9, #2573a7);
    }
    
    .btn-guardar-individual:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`;
document.head.appendChild(style);

// Inicializar la aplicación
function inicializarApp() {
    cargarSemanaDesdeURL();
}

// Inicializar cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', inicializarApp);