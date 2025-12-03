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

// Cargar gastos desde la API (CORREGIDO)
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
            
            // Filtrar los que son gastos - CORRECCIÓN IMPORTANTE
            gastos = todosProductos.filter(producto => {
                // Un gasto es un producto con precio_unitario > 0 y libras = 0
                // O un producto que no está en la lista estática
                const esProductoEstatico = PRODUCTOS_ESTATICOS_DATA.some(p => 
                    p.nombre.toLowerCase() === producto.nombre.toLowerCase()
                );
                
                // Si NO es un producto estático, es un gasto
                // O si es un producto estático pero tiene libras = 0 y precio > 0, también es gasto
                return !esProductoEstatico || (producto.libras === 0 && producto.precio_unitario > 0);
            }).filter(gasto => {
                // Asegurarse de que no sea un producto estático con libras > 0
                const esProductoEstaticoConLibras = PRODUCTOS_ESTATICOS_DATA.some(p => 
                    p.nombre.toLowerCase() === gasto.nombre.toLowerCase() && gasto.libras > 0
                );
                return !esProductoEstaticoConLibras;
            });
            
            console.log('Gastos cargados:', gastos);
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
                    <button class="btn-guardar-individual" onclick="guardarProductoIndividual(${index})" ${producto.id ? 'style="display:none"' : ''}>
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
    actualizarResumen(); // Añadir esta línea para actualizar el resumen
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
    const totalProductosElem = document.getElementById('totalProductos');
    if (totalProductosElem) {
        totalProductosElem.textContent = formatearMoneda(totalProductos);
    }
}

// Actualizar tabla de gastos (CORREGIDO)
function actualizarTablaGastos() {
    const tbody = document.getElementById('gastosBody');
    
    if (!gastos || gastos.length === 0) {
        tbody.innerHTML = '<tr class="no-data"><td colspan="3">No hay gastos registrados</td></tr>';
        const totalGastosTablaElem = document.getElementById('totalGastosTabla');
        if (totalGastosTablaElem) {
            totalGastosTablaElem.textContent = formatearMoneda(0);
        }
        return;
    }

    let html = '';
    let totalGastos = 0;

    gastos.forEach(gasto => {
        // Para gastos, el valor es el campo "precio_unitario" (porque gasto es 0)
        const valorGasto = parseFloat(gasto.precio_unitario) || 0;
        totalGastos += valorGasto;
        
        html += `
            <tr>
                <td>${gasto.nombre}</td>
                <td class="valor-numerico">${formatearMoneda(valorGasto)}</td>
                <td>
                    <button class="btn-editar" onclick="editarGasto(${gasto.id})" style="background:none; border:none; color:#3498db; cursor:pointer; font-size:1.1rem; margin-right:10px;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-eliminar" onclick="eliminarGasto(${gasto.id})" style="background:none; border:none; color:#e74c3c; cursor:pointer; font-size:1.1rem;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    
    const totalGastosTablaElem = document.getElementById('totalGastosTabla');
    if (totalGastosTablaElem) {
        totalGastosTablaElem.textContent = formatearMoneda(totalGastos);
    }
    
    actualizarResumen(); // Asegurar que el resumen se actualice
}

// Actualizar resumen (CORREGIDO)
function actualizarResumen() {
    // Calcular total productos
    const totalProductos = productosEstaticos.reduce((sum, p) => {
        return sum + (p.precio_unitario * (p.libras || 0));
    }, 0);
    
    // Calcular total gastos
    const totalGastos = gastos.reduce((sum, g) => {
        const valorGasto = parseFloat(g.precio_unitario) || 0;
        return sum + valorGasto;
    }, 0);
    
    // Total final = total productos - total gastos
    const totalFinal = totalProductos - totalGastos;
    
    console.log('Resumen:', { totalProductos, totalGastos, totalFinal });
    
    // Actualizar UI
    const resumenTotalProductosElem = document.getElementById('resumenTotalProductos');
    const resumenTotalGastosElem = document.getElementById('resumenTotalGastos');
    const resumenTotalFinalElem = document.getElementById('resumenTotalFinal');
    
    if (resumenTotalProductosElem) {
        resumenTotalProductosElem.textContent = formatearMoneda(totalProductos);
    }
    
    if (resumenTotalGastosElem) {
        resumenTotalGastosElem.textContent = formatearMoneda(totalGastos);
    }
    
    if (resumenTotalFinalElem) {
        resumenTotalFinalElem.textContent = formatearMoneda(totalFinal);
        
        // Cambiar color si es negativo
        if (totalFinal < 0) {
            resumenTotalFinalElem.style.color = '#e74c3c';
        } else {
            resumenTotalFinalElem.style.color = '';
        }
    }
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

// Guardar gasto (CORREGIDO)
async function guardarGasto() {
    const concepto = document.getElementById('gastoConcepto').value.trim();
    const valor = parseFloat(document.getElementById('gastoValor').value);
    
    if (!concepto || !valor) {
        mostrarError('Por favor completa todos los campos');
        return;
    }
    
    if (valor <= 0) {
        mostrarError('El valor debe ser mayor a 0');
        return;
    }
    
    // Para gastos, usamos la tabla productos con:
    // - nombre = concepto del gasto
    // - precio_unitario = valor del gasto
    // - libras = 0
    // - gasto = 0
    const gastoData = {
        nombre: concepto,
        precio_unitario: valor,
        libras: 0,
        gasto: 0,
        semana_id: semanaActual.id
    };
    
    console.log('Enviando gasto:', gastoData);
    
    try {
        const response = await fetch(`${API_URL}/api/productos`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(gastoData)
        });
        
        console.log('Respuesta:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Gasto guardado:', data);
            
            cerrarModalGasto();
            await cargarGastos(); // Recargar gastos desde el servidor
            mostrarExito('Gasto agregado correctamente');
        } else {
            const error = await response.json();
            console.error('Error del servidor:', error);
            mostrarError(error.error || 'Error al guardar el gasto');
        }
    } catch (error) {
        console.error('Error de conexión:', error);
        mostrarError('Error de conexión al guardar el gasto');
    }
}

// Editar gasto (CORREGIDO)
async function editarGasto(id) {
    const gasto = gastos.find(g => g.id === id);
    if (!gasto) return;
    
    gastoEditando = gasto;
    document.getElementById('modalGastoTitulo').textContent = 'Editar Gasto';
    document.getElementById('gastoConcepto').value = gasto.nombre;
    document.getElementById('gastoValor').value = gasto.precio_unitario || 0;
    
    document.getElementById('modalGasto').style.display = 'flex';
}

// Actualizar gasto (nueva función)
async function actualizarGasto() {
    const concepto = document.getElementById('gastoConcepto').value.trim();
    const valor = parseFloat(document.getElementById('gastoValor').value);
    
    if (!concepto || !valor) {
        mostrarError('Por favor completa todos los campos');
        return;
    }
    
    if (valor <= 0) {
        mostrarError('El valor debe ser mayor a 0');
        return;
    }
    
    const gastoData = {
        nombre: concepto,
        precio_unitario: valor,
        libras: 0,
        gasto: 0
    };
    
    try {
        const response = await fetch(`${API_URL}/api/productos/${gastoEditando.id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(gastoData)
        });
        
        if (response.ok) {
            cerrarModalGasto();
            await cargarGastos();
            mostrarExito('Gasto actualizado correctamente');
        } else {
            const error = await response.json();
            mostrarError(error.error || 'Error al actualizar el gasto');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error de conexión al actualizar el gasto');
    }
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
            mostrarExito('Gasto eliminado correctamente');
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
    alert(`✅ ${mensaje}`); // Temporalmente usando alert
}

// Mostrar mensaje de error
function mostrarError(mensaje) {
    alert(`❌ ${mensaje}`); // Temporalmente usando alert
}

// Actualizar la función guardarGasto en el modal
document.addEventListener('DOMContentLoaded', function() {
    const btnGuardarGasto = document.querySelector('.btn-guardar');
    if (btnGuardarGasto) {
        btnGuardarGasto.onclick = function() {
            if (gastoEditando) {
                actualizarGasto();
            } else {
                guardarGasto();
            }
        };
    }
});

// Inicializar la aplicación
function inicializarApp() {
    cargarSemanaDesdeURL();
}

// Inicializar cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', inicializarApp);