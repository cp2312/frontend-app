// Variables globales
let semanaActual = null;
let productos = [];
let productoEditando = null;
const API_URL = "https://backend-express-production-a427.up.railway.app";

// Tipos de registros
const TIPO_PRODUCTO = 'producto';
const TIPO_GASTO = 'gasto';

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
            cargarProductos();
        } catch (error) {
            console.error('Error al cargar la semana:', error);
            mostrarError('Error al cargar la información de la semana');
        }
    } else {
        mostrarError('No se encontró información de la semana');
        setTimeout(volverAlDashboard, 2000);
    }
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

// Cargar productos desde la API
async function cargarProductos() {
    if (!semanaActual || !semanaActual.id) {
        console.error('No hay semana seleccionada');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/productos/semana/${semanaActual.id}`);
        
        if (response.ok) {
            const data = await response.json();
            productos = data;
            actualizarTablas();
        } else {
            console.error('Error al cargar productos:', response.status);
            mostrarError('Error al cargar los productos');
        }
    } catch (error) {
        console.error('Error de conexión:', error);
        mostrarError('Error de conexión al cargar productos');
    }
}

// Separar productos y gastos
function separarProductosYGastos() {
    // Los gastos son productos con libras = 0 y precio_unitario = 0
    // pero gasto > 0 (aunque en la imagen el gasto "Pintor" parece ser un concepto)
    // Para simplificar, consideraremos que:
    // - Productos: tienen libras > 0
    // - Gastos: tienen libras = 0 y nombre representa el concepto
    
    const productosList = [];
    const gastosList = [];
    
    productos.forEach(item => {
        if (item.libras > 0) {
            productosList.push(item);
        } else {
            // Es un gasto
            gastosList.push(item);
        }
    });
    
    return { productosList, gastosList };
}

// Actualizar ambas tablas
function actualizarTablas() {
    const { productosList, gastosList } = separarProductosYGastos();
    actualizarTablaProductos(productosList);
    actualizarTablaGastos(gastosList);
    actualizarResumen(productosList, gastosList);
}

// Actualizar tabla de productos
function actualizarTablaProductos(productosList) {
    const tbody = document.getElementById('productosBody');
    
    if (!productosList || productosList.length === 0) {
        tbody.innerHTML = '<tr class="no-data"><td colspan="7">No hay productos registrados</td></tr>';
        actualizarTotalesProductos(0, 0, 0);
        return;
    }

    let html = '';
    let totalProductos = 0;
    let totalGastosProductos = 0;
    let totalFinalProductos = 0;

    productosList.forEach(producto => {
        const totalBruto = parseFloat(producto.total) || (producto.precio_unitario * producto.libras);
        const totalFinalProducto = parseFloat(producto.total_final) || (totalBruto - (producto.gasto || 0));
        
        totalProductos += totalBruto;
        totalGastosProductos += producto.gasto || 0;
        totalFinalProductos += totalFinalProducto;

        html += `
            <tr>
                <td>${producto.nombre}</td>
                <td class="valor-numerico">${formatearMoneda(producto.precio_unitario)}</td>
                <td class="valor-numerico">${producto.libras}</td>
                <td class="valor-numerico">${formatearMoneda(totalBruto)}</td>
                <td class="valor-numerico">${formatearMoneda(producto.gasto || 0)}</td>
                <td class="valor-numerico">${formatearMoneda(totalFinalProducto)}</td>
                <td>
                    <button class="btn-accion btn-editar" onclick="editarProducto(${producto.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-accion btn-eliminar" onclick="eliminarProducto(${producto.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    
    // Actualizar totales en la tabla
    actualizarTotalesProductos(totalProductos, totalGastosProductos, totalFinalProductos);
}

// Actualizar totales de productos
function actualizarTotalesProductos(totalProductos, totalGastos, totalFinal) {
    document.getElementById('totalProductos').textContent = formatearMoneda(totalProductos);
    document.getElementById('totalGastos').textContent = formatearMoneda(totalGastos);
    document.getElementById('totalFinalProductos').textContent = formatearMoneda(totalFinal);
}

// Actualizar tabla de gastos
function actualizarTablaGastos(gastosList) {
    const tbody = document.getElementById('gastosBody');
    
    if (!gastosList || gastosList.length === 0) {
        tbody.innerHTML = '<tr class="no-data"><td colspan="3">No hay gastos registrados</td></tr>';
        document.getElementById('totalGastosTabla').textContent = formatearMoneda(0);
        return;
    }

    let html = '';
    let totalGastos = 0;

    gastosList.forEach(gasto => {
        // Para gastos, el "valor" es el campo "gasto" en la tabla
        const valorGasto = parseFloat(gasto.gasto) || 0;
        totalGastos += valorGasto;
        
        html += `
            <tr>
                <td>${gasto.nombre}</td>
                <td class="valor-numerico">${formatearMoneda(valorGasto)}</td>
                <td>
                    <button class="btn-accion btn-editar" onclick="editarProducto(${gasto.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-accion btn-eliminar" onclick="eliminarProducto(${gasto.id})">
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
function actualizarResumen(productosList, gastosList) {
    // Calcular total productos (usando total_final de la base de datos)
    const totalProductos = productosList.reduce((sum, p) => {
        const totalFinal = parseFloat(p.total_final) || (p.precio_unitario * p.libras - (p.gasto || 0));
        return sum + totalFinal;
    }, 0);
    
    // Calcular total gastos (suma de todos los "gastos" de la segunda tabla)
    const totalGastos = gastosList.reduce((sum, g) => {
        return sum + (parseFloat(g.gasto) || 0);
    }, 0);
    
    // Total final = total productos - total gastos
    const totalFinal = totalProductos - totalGastos;
    
    // Actualizar UI
    document.getElementById('resumenTotalProductos').textContent = formatearMoneda(totalProductos);
    document.getElementById('resumenTotalGastos').textContent = formatearMoneda(totalGastos);
    document.getElementById('resumenTotalFinal').textContent = formatearMoneda(totalFinal);
}

// Mostrar modal de producto
function mostrarModalProducto() {
    if (!semanaActual || !semanaActual.id) {
        mostrarError('Primero debes seleccionar una semana');
        return;
    }
    
    productoEditando = null;
    document.getElementById('modalProductoTitulo').textContent = 'Agregar Producto';
    document.getElementById('productoNombre').value = '';
    document.getElementById('productoPrecio').value = '';
    document.getElementById('productoLibras').value = '';
    document.getElementById('productoGasto').value = '0';
    actualizarPreviewProducto();
    
    document.getElementById('modalProducto').style.display = 'flex';
}

// Mostrar modal de gasto
function mostrarModalGasto() {
    if (!semanaActual || !semanaActual.id) {
        mostrarError('Primero debes seleccionar una semana');
        return;
    }
    
    productoEditando = null;
    document.getElementById('modalGastoTitulo').textContent = 'Agregar Gasto';
    document.getElementById('gastoConcepto').value = '';
    document.getElementById('gastoValor').value = '';
    
    document.getElementById('modalGasto').style.display = 'flex';
}

// Cerrar modal de producto
function cerrarModalProducto() {
    document.getElementById('modalProducto').style.display = 'none';
    productoEditando = null;
}

// Cerrar modal de gasto
function cerrarModalGasto() {
    document.getElementById('modalGasto').style.display = 'none';
    productoEditando = null;
}

// Actualizar preview del producto
function actualizarPreviewProducto() {
    const precio = parseFloat(document.getElementById('productoPrecio').value) || 0;
    const libras = parseFloat(document.getElementById('productoLibras').value) || 0;
    const gasto = parseFloat(document.getElementById('productoGasto').value) || 0;
    
    const totalBruto = precio * libras;
    const totalFinal = totalBruto - gasto;
    
    document.getElementById('previewTotalBruto').textContent = formatearMoneda(totalBruto);
    document.getElementById('previewTotalFinal').textContent = formatearMoneda(totalFinal);
}

// Guardar producto
async function guardarProducto() {
    const nombre = document.getElementById('productoNombre').value.trim();
    const precio = parseFloat(document.getElementById('productoPrecio').value);
    const libras = parseFloat(document.getElementById('productoLibras').value);
    const gasto = parseFloat(document.getElementById('productoGasto').value) || 0;
    
    if (!nombre || !precio || !libras) {
        mostrarError('Por favor completa todos los campos requeridos');
        return;
    }
    
    if (precio < 0 || libras < 0 || gasto < 0) {
        mostrarError('Los valores no pueden ser negativos');
        return;
    }
    
    const productoData = {
        nombre,
        precio_unitario: precio,
        libras,
        gasto,
        semana_id: semanaActual.id
    };
    
    try {
        let response;
        
        if (productoEditando) {
            // Actualizar producto existente
            response = await fetch(`${API_URL}/api/productos/${productoEditando.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(productoData)
            });
        } else {
            // Crear nuevo producto
            response = await fetch(`${API_URL}/api/productos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(productoData)
            });
        }
        
        if (response.ok) {
            const data = await response.json();
            cerrarModalProducto();
            await cargarProductos();
            mostrarExito(productoEditando ? 'Producto actualizado' : 'Producto agregado');
        } else {
            const error = await response.json();
            mostrarError(error.error || 'Error al guardar el producto');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error de conexión al guardar el producto');
    }
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
    
    // Para un gasto, usamos la misma tabla productos pero con:
    // - nombre = concepto del gasto
    // - precio_unitario = 0
    // - libras = 0
    // - gasto = valor del gasto
    // Así total_final será 0 - valor = -valor (pero lo manejaremos en el cálculo)
    
    const gastoData = {
        nombre: concepto,
        precio_unitario: 0,
        libras: 0,
        gasto: valor,
        semana_id: semanaActual.id
    };
    
    try {
        const response = await fetch(`${API_URL}/api/productos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(gastoData)
        });
        
        if (response.ok) {
            cerrarModalGasto();
            await cargarProductos();
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

// Editar producto (funciona tanto para productos como gastos)
function editarProducto(id) {
    const producto = productos.find(p => p.id === id);
    if (!producto) return;
    
    productoEditando = producto;
    
    // Determinar si es un producto o un gasto
    if (producto.libras > 0) {
        // Es un producto
        document.getElementById('modalProductoTitulo').textContent = 'Editar Producto';
        document.getElementById('productoNombre').value = producto.nombre;
        document.getElementById('productoPrecio').value = producto.precio_unitario;
        document.getElementById('productoLibras').value = producto.libras;
        document.getElementById('productoGasto').value = producto.gasto || 0;
        actualizarPreviewProducto();
        
        document.getElementById('modalProducto').style.display = 'flex';
    } else {
        // Es un gasto
        document.getElementById('modalGastoTitulo').textContent = 'Editar Gasto';
        document.getElementById('gastoConcepto').value = producto.nombre;
        document.getElementById('gastoValor').value = producto.gasto || 0;
        
        document.getElementById('modalGasto').style.display = 'flex';
    }
}

// Eliminar producto/gasto
async function eliminarProducto(id) {
    if (!confirm('¿Estás seguro de eliminar este registro?')) return;
    
    try {
        const response = await fetch(`${API_URL}/api/productos/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await cargarProductos();
            mostrarExito('Registro eliminado');
        } else {
            mostrarError('Error al eliminar el registro');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error de conexión al eliminar el registro');
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

// Inicializar la aplicación
function inicializarApp() {
    cargarSemanaDesdeURL();
    
    // Event listeners para preview en tiempo real
    const inputsProducto = ['productoPrecio', 'productoLibras', 'productoGasto'];
    inputsProducto.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', actualizarPreviewProducto);
        }
    });
}

// Inicializar cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', inicializarApp);