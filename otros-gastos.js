// Configuración
const API_URL = 'https://backend-express-production-a427.up.railway.app';
let semanaActual = null;
let gastos = [];
let gastoEditando = null;
let gastoAEliminar = null;

// DOM Elements
const formGasto = document.getElementById('formGasto');
const fechaInput = document.getElementById('fecha');
const conceptoInput = document.getElementById('concepto');
const montoInput = document.getElementById('monto');
const btnCancelar = document.getElementById('btnCancelar');
const tablaGastos = document.querySelector('#tablaGastos tbody');
const sinGastos = document.getElementById('sinGastos');
const totalGastos = document.getElementById('totalGastos');
const cantidadGastos = document.getElementById('cantidadGastos');
const modal = document.getElementById('confirmModal');
const closeModal = document.querySelector('.close');
const btnCancelModal = document.getElementById('btnCancelModal');
const btnConfirmDelete = document.getElementById('btnConfirmDelete');

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    configurarFecha();
    inicializarEventos();
    cargarSemanaDesdeURL();
});

// Cargar información de la semana desde URL parameters
function cargarSemanaDesdeURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const semanaParam = urlParams.get('semana');
    
    if (semanaParam) {
        try {
            semanaActual = JSON.parse(decodeURIComponent(semanaParam));
            actualizarInfoSemana();
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

// Actualizar información de la semana en la interfaz
function actualizarInfoSemana() {
    if (!semanaActual) return;
    
    document.getElementById('fechaSemanaInfo').textContent = formatFecha(semanaActual.fecha);
    document.getElementById('nombreSemanaInfo').textContent = semanaActual.nombre;
    document.getElementById('mesSemanaInfo').textContent = semanaActual.mes;
    
    // Actualizar título de la página
    document.title = `Gastos - ${semanaActual.nombre} ${semanaActual.mes}`;
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

function configurarFecha() {
    const hoy = new Date();
    fechaInput.value = hoy.toISOString().split('T')[0];
}

function inicializarEventos() {
    // Formulario de gasto
    formGasto.addEventListener('submit', guardarGasto);
    
    // Botón cancelar edición
    btnCancelar.addEventListener('click', cancelarEdicion);
    
    // Modal
    closeModal.addEventListener('click', () => modal.style.display = 'none');
    btnCancelModal.addEventListener('click', () => modal.style.display = 'none');
    btnConfirmDelete.addEventListener('click', eliminarGastoConfirmado);
    
    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Volver al dashboard
function volverAlDashboard() {
    window.history.back();
}

// Mostrar error
function mostrarError(mensaje) {
    alert(mensaje);
}

// Cargar gastos de la semana
async function cargarGastos() {
    if (!semanaActual || !semanaActual.id) {
        console.error('No hay semana seleccionada');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/gastos/semana/${semanaActual.id}`);
        if (!response.ok) throw new Error('Error al cargar gastos');
        
        gastos = await response.json();
        mostrarGastos();
        actualizarEstadisticas();
    } catch (error) {
        console.error('Error cargando gastos:', error);
        mostrarError('Error al cargar los gastos');
        gastos = [];
        mostrarGastos();
    }
}

// Mostrar gastos en la tabla
function mostrarGastos() {
    const tbody = tablaGastos;
    
    // Mostrar u ocultar mensaje de "sin gastos"
    if (gastos.length === 0) {
        sinGastos.style.display = 'block';
        tbody.innerHTML = '';
        return;
    } else {
        sinGastos.style.display = 'none';
    }
    
    // Limpiar tabla
    tbody.innerHTML = '';
    
    // Agregar gastos
    gastos.forEach(gasto => {
        const row = document.createElement('tr');
        
        // Formatear fecha
        const fecha = new Date(gasto.fecha);
        const fechaFormateada = fecha.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        // Formatear monto
        const montoFormateado = new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'USD'
        }).format(gasto.monto);
        
        // Crear fila para móviles
        if (window.innerWidth <= 768) {
            row.innerHTML = `
                <td data-label="Fecha">${fechaFormateada}</td>
                <td data-label="Concepto">${gasto.concepto}</td>
                <td data-label="Monto">${montoFormateado}</td>
                <td data-label="Acciones">
                    <button class="btn-action btn-edit" onclick="editarGasto(${gasto.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="confirmarEliminacion(${gasto.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
        } else {
            row.innerHTML = `
                <td>${fechaFormateada}</td>
                <td>${gasto.concepto}</td>
                <td><span class="monto-badge">${montoFormateado}</span></td>
                <td>
                    <button class="btn-action btn-edit" onclick="editarGasto(${gasto.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="confirmarEliminacion(${gasto.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
        }
        
        tbody.appendChild(row);
    });
}

// Actualizar estadísticas
function actualizarEstadisticas() {
    if (gastos.length === 0) {
        totalGastos.textContent = '$0.00';
        cantidadGastos.textContent = '0';
        return;
    }
    
    const total = gastos.reduce((sum, gasto) => sum + parseFloat(gasto.monto), 0);
    const cantidad = gastos.length;
    
    totalGastos.textContent = new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'USD'
    }).format(total);
    
    cantidadGastos.textContent = cantidad;
}

// Guardar gasto (POST o PUT)
async function guardarGasto(e) {
    e.preventDefault();
    
    if (!semanaActual || !semanaActual.id) {
        mostrarError('No hay semana seleccionada');
        return;
    }
    
    const gastoData = {
        fecha: fechaInput.value,
        concepto: conceptoInput.value.trim(),
        monto: parseFloat(montoInput.value),
        semana_id: parseInt(semanaActual.id)
    };
    
    // Validaciones
    if (!gastoData.concepto) {
        mostrarError('El concepto es requerido');
        return;
    }
    
    if (isNaN(gastoData.monto) || gastoData.monto <= 0) {
        mostrarError('El monto debe ser mayor a 0');
        return;
    }
    
    try {
        let url = `${API_URL}/gastos`;
        let method = 'POST';
        
        if (gastoEditando) {
            url = `${API_URL}/gastos/${gastoEditando.id}`;
            method = 'PUT';
        }
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(gastoData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.details || 'Error al guardar el gasto');
        }
        
        // Actualizar lista
        cargarGastos();
        
        // Resetear formulario
        resetearFormulario();
        
        // Mostrar mensaje de éxito
        mostrarExito(
            gastoEditando ? 'Gasto actualizado correctamente' : 'Gasto guardado correctamente'
        );
        
        gastoEditando = null;
        
    } catch (error) {
        console.error('Error guardando gasto:', error);
        mostrarError(error.message || 'Error al guardar el gasto');
    }
}

// Editar gasto
function editarGasto(id) {
    const gasto = gastos.find(g => g.id === id);
    if (!gasto) return;
    
    gastoEditando = gasto;
    
    // Llenar formulario
    fechaInput.value = gasto.fecha.split('T')[0];
    conceptoInput.value = gasto.concepto;
    montoInput.value = gasto.monto;
    
    // Cambiar texto del botón
    const submitBtn = formGasto.querySelector('button[type="submit"]');
    submitBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Actualizar Gasto';
    
    // Mostrar botón cancelar
    btnCancelar.style.display = 'block';
    
    // Scroll suave al formulario
    formGasto.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Cancelar edición
function cancelarEdicion() {
    resetearFormulario();
    gastoEditando = null;
}

// Resetear formulario
function resetearFormulario() {
    formGasto.reset();
    configurarFecha();
    
    // Restaurar botón
    const submitBtn = formGasto.querySelector('button[type="submit"]');
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Gasto';
    
    // Ocultar botón cancelar
    btnCancelar.style.display = 'none';
}

// Confirmar eliminación
function confirmarEliminacion(id) {
    const gasto = gastos.find(g => g.id === id);
    if (!gasto) return;
    
    gastoAEliminar = id;
    
    // Actualizar mensaje del modal
    document.getElementById('modalMessage').textContent = 
        `¿Estás seguro de que deseas eliminar el gasto "${gasto.concepto}" por $${gasto.monto}?`;
    
    // Mostrar modal
    modal.style.display = 'block';
}

// Eliminar gasto confirmado
async function eliminarGastoConfirmado() {
    if (!gastoAEliminar) return;
    
    try {
        const response = await fetch(`${API_URL}/gastos/${gastoAEliminar}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Error al eliminar el gasto');
        }
        
        // Cerrar modal
        modal.style.display = 'none';
        
        // Actualizar lista
        cargarGastos();
        
        // Mostrar mensaje de éxito
        mostrarExito('Gasto eliminado correctamente');
        
        gastoAEliminar = null;
        
    } catch (error) {
        console.error('Error eliminando gasto:', error);
        mostrarError('Error al eliminar el gasto');
    }
}

// Mostrar mensaje de éxito
function mostrarExito(mensaje) {
    // Crear notificación
    const notificacion = document.createElement('div');
    notificacion.className = 'notificacion-exito';
    notificacion.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${mensaje}</span>
    `;
    
    // Estilos de la notificación
    notificacion.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideInRight 0.3s ease;
    `;
    
    // Animación
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notificacion);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        notificacion.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notificacion);
            document.head.removeChild(style);
        }, 300);
    }, 3000);
}