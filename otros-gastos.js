// Configuración
const API_URL = 'https://backend-express-production-a427.up.railway.app/api';
let semanaSeleccionada = null;
let gastos = [];
let gastoEditando = null;
let paginaActual = 1;
const itemsPorPagina = 10;
let chartGastosPorDia = null;
let chartTopConceptos = null;

// DOM Elements
const selectSemana = document.getElementById('selectSemana');
const infoSemana = document.getElementById('infoSemana');
const formGasto = document.getElementById('formGasto');
const fechaInput = document.getElementById('fecha');
const conceptoInput = document.getElementById('concepto');
const montoInput = document.getElementById('monto');
const gastoIdInput = document.getElementById('gastoId');
const btnCancelar = document.getElementById('btnCancelar');
const tablaGastos = document.getElementById('tablaGastos');
const sinGastos = document.getElementById('sinGastos');
const btnActualizar = document.getElementById('btnActualizar');
const btnExportar = document.getElementById('btnExportar');
const totalGastos = document.getElementById('totalGastos');
const cantidadGastos = document.getElementById('cantidadGastos');
const confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));
const btnConfirmarEliminar = document.getElementById('btnConfirmarEliminar');

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    cargarSemanas();
    configurarFecha();
    inicializarEventos();
    inicializarGraficos();
});

function configurarFecha() {
    const hoy = new Date();
    fechaInput.value = hoy.toISOString().split('T')[0];
}

function inicializarEventos() {
    // Selección de semana
    selectSemana.addEventListener('change', function() {
        semanaSeleccionada = this.value;
        if (semanaSeleccionada) {
            cargarInfoSemana(semanaSeleccionada);
            cargarGastos();
        } else {
            infoSemana.textContent = 'Sin semana seleccionada';
            infoSemana.className = 'badge bg-info';
            limpiarTabla();
            resetearEstadisticas();
        }
    });
    
    // Formulario de gasto
    formGasto.addEventListener('submit', guardarGasto);
    
    // Botón cancelar edición
    btnCancelar.addEventListener('click', cancelarEdicion);
    
    // Botón actualizar
    btnActualizar.addEventListener('click', function() {
        if (semanaSeleccionada) {
            cargarGastos();
            showToast('Lista de gastos actualizada', 'success');
        }
    });
    
    // Botón exportar
    btnExportar.addEventListener('click', exportarDatos);
}

function inicializarGraficos() {
    const ctxGastosPorDia = document.getElementById('chartGastosPorDia').getContext('2d');
    const ctxTopConceptos = document.getElementById('chartTopConceptos').getContext('2d');
    
    chartGastosPorDia = new Chart(ctxGastosPorDia, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Gasto por Día',
                data: [],
                backgroundColor: 'rgba(52, 152, 219, 0.7)',
                borderColor: 'rgba(52, 152, 219, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
    
    chartTopConceptos = new Chart(ctxTopConceptos, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    'rgba(231, 76, 60, 0.7)',
                    'rgba(52, 152, 219, 0.7)',
                    'rgba(46, 204, 113, 0.7)',
                    'rgba(155, 89, 182, 0.7)',
                    'rgba(241, 196, 15, 0.7)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Cargar semanas disponibles
async function cargarSemanas() {
    try {
        const response = await fetch(`${API_URL}/semanas`);
        const semanas = await response.json();
        
        selectSemana.innerHTML = '<option value="">Seleccionar Semana</option>';
        semanas.forEach(semana => {
            const option = document.createElement('option');
            option.value = semana.id;
            option.textContent = `Semana ${semana.numero} (${semana.anio})`;
            selectSemana.appendChild(option);
        });
        
        // Si hay semanas, seleccionar la primera
        if (semanas.length > 0) {
            selectSemana.value = semanas[0].id;
            selectSemana.dispatchEvent(new Event('change'));
        }
    } catch (error) {
        console.error('Error cargando semanas:', error);
        showToast('Error al cargar las semanas', 'danger');
    }
}

// Cargar información de la semana seleccionada
async function cargarInfoSemana(id) {
    try {
        const response = await fetch(`${API_URL}/semanas/${id}`);
        const semana = await response.json();
        
        infoSemana.textContent = `Semana ${semana.numero} - ${semana.anio}`;
        infoSemana.className = 'badge bg-success';
    } catch (error) {
        console.error('Error cargando información de la semana:', error);
    }
}

// Cargar gastos de la semana
async function cargarGastos() {
    if (!semanaSeleccionada) return;
    
    try {
        const response = await fetch(`${API_URL}/gastos/semana/${semanaSeleccionada}`);
        if (!response.ok) throw new Error('Error al cargar gastos');
        
        gastos = await response.json();
        mostrarGastos();
        actualizarEstadisticas();
        actualizarGraficos();
    } catch (error) {
        console.error('Error cargando gastos:', error);
        showToast('Error al cargar los gastos', 'danger');
        gastos = [];
        mostrarGastos();
    }
}

// Mostrar gastos en la tabla
function mostrarGastos() {
    const tbody = tablaGastos.querySelector('tbody');
    
    // Mostrar u ocultar mensaje de "sin gastos"
    if (gastos.length === 0) {
        sinGastos.style.display = '';
        tbody.innerHTML = `
            <tr id="sinGastos">
                <td colspan="4" class="text-center text-muted py-5">
                    <i class="bi bi-receipt display-4 d-block mb-3"></i>
                    <h5>No hay gastos registrados</h5>
                    <p class="mb-0">Agrega tu primer gasto usando el formulario</p>
                </td>
            </tr>
        `;
        return;
    } else {
        sinGastos.style.display = 'none';
    }
    
    // Calcular paginación
    const totalPaginas = Math.ceil(gastos.length / itemsPorPagina);
    const inicio = (paginaActual - 1) * itemsPorPagina;
    const fin = inicio + itemsPorPagina;
    const gastosPagina = gastos.slice(inicio, fin);
    
    // Limpiar tabla
    tbody.innerHTML = '';
    
    // Agregar gastos
    gastosPagina.forEach(gasto => {
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
        
        row.innerHTML = `
            <td>
                <div class="fw-bold">${fechaFormateada}</div>
                <small class="text-muted">${gasto.created_at ? new Date(gasto.created_at).toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'}) : ''}</small>
            </td>
            <td>
                <div class="fw-medium">${gasto.concepto}</div>
                ${gasto.observaciones ? `<small class="text-muted">${gasto.observaciones}</small>` : ''}
            </td>
            <td>
                <span class="badge bg-danger fs-6">${montoFormateado}</span>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-2" onclick="editarGasto(${gasto.id})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="confirmarEliminacion(${gasto.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Actualizar paginación
    actualizarPaginacion(totalPaginas);
}

// Actualizar paginación
function actualizarPaginacion(totalPaginas) {
    const paginacion = document.getElementById('paginacion');
    
    if (totalPaginas <= 1) {
        paginacion.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Botón anterior
    html += `
        <li class="page-item ${paginaActual === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="cambiarPagina(${paginaActual - 1})">
                <i class="bi bi-chevron-left"></i>
            </a>
        </li>
    `;
    
    // Números de página
    for (let i = 1; i <= totalPaginas; i++) {
        if (i === 1 || i === totalPaginas || (i >= paginaActual - 2 && i <= paginaActual + 2)) {
            html += `
                <li class="page-item ${i === paginaActual ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="cambiarPagina(${i})">${i}</a>
                </li>
            `;
        } else if (i === paginaActual - 3 || i === paginaActual + 3) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }
    
    // Botón siguiente
    html += `
        <li class="page-item ${paginaActual === totalPaginas ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="cambiarPagina(${paginaActual + 1})">
                <i class="bi bi-chevron-right"></i>
            </a>
        </li>
    `;
    
    paginacion.innerHTML = html;
}

// Cambiar página
function cambiarPagina(pagina) {
    if (pagina < 1 || pagina > Math.ceil(gastos.length / itemsPorPagina)) return;
    
    paginaActual = pagina;
    mostrarGastos();
    
    // Scroll suave hacia arriba
    tablaGastos.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Guardar gasto (POST o PUT)
async function guardarGasto(e) {
    e.preventDefault();
    
    if (!semanaSeleccionada) {
        showToast('Por favor, selecciona una semana primero', 'warning');
        return;
    }
    
    const gastoData = {
        fecha: fechaInput.value,
        concepto: conceptoInput.value.trim(),
        monto: parseFloat(montoInput.value),
        semana_id: parseInt(semanaSeleccionada)
    };
    
    // Validaciones
    if (!gastoData.concepto) {
        showToast('El concepto es requerido', 'warning');
        return;
    }
    
    if (isNaN(gastoData.monto) || gastoData.monto <= 0) {
        showToast('El monto debe ser mayor a 0', 'warning');
        return;
    }
    
    try {
        let response;
        
        if (gastoEditando) {
            // Actualizar gasto existente (PUT)
            response = await fetch(`${API_URL}/gastos/${gastoEditando.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(gastoData)
            });
        } else {
            // Crear nuevo gasto (POST)
            response = await fetch(`${API_URL}/gastos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(gastoData)
            });
        }
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.details || 'Error al guardar el gasto');
        }
        
        const gastoGuardado = await response.json();
        
        // Actualizar lista
        cargarGastos();
        
        // Resetear formulario
        resetearFormulario();
        
        // Mostrar mensaje
        showToast(
            gastoEditando ? 'Gasto actualizado correctamente' : 'Gasto guardado correctamente',
            'success'
        );
        
        gastoEditando = null;
        
    } catch (error) {
        console.error('Error guardando gasto:', error);
        showToast(error.message || 'Error al guardar el gasto', 'danger');
    }
}

// Editar gasto
function editarGasto(id) {
    const gasto = gastos.find(g => g.id === id);
    if (!gasto) return;
    
    gastoEditando = gasto;
    
    // Llenar formulario
    gastoIdInput.value = gasto.id;
    fechaInput.value = gasto.fecha.split('T')[0];
    conceptoInput.value = gasto.concepto;
    montoInput.value = gasto.monto;
    
    // Cambiar texto del botón
    const submitBtn = formGasto.querySelector('button[type="submit"]');
    submitBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>Actualizar Gasto';
    submitBtn.classList.remove('btn-success');
    submitBtn.classList.add('btn-primary');
    
    // Mostrar botón cancelar
    btnCancelar.style.display = 'block';
    
    // Scroll al formulario
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
    gastoIdInput.value = '';
    
    // Restaurar botón
    const submitBtn = formGasto.querySelector('button[type="submit"]');
    submitBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>Guardar Gasto';
    submitBtn.classList.remove('btn-primary');
    submitBtn.classList.add('btn-success');
    
    // Ocultar botón cancelar
    btnCancelar.style.display = 'none';
}

// Confirmar eliminación
function confirmarEliminacion(id) {
    const gasto = gastos.find(g => g.id === id);
    if (!gasto) return;
    
    // Actualizar mensaje del modal
    document.getElementById('modalMessage').textContent = 
        `¿Estás seguro de que deseas eliminar el gasto "${gasto.concepto}" por $${gasto.monto}?`;
    
    // Configurar botón de confirmación
    btnConfirmarEliminar.onclick = function() {
        eliminarGasto(id);
        confirmModal.hide();
    };
    
    // Mostrar modal
    confirmModal.show();
}

// Eliminar gasto
async function eliminarGasto(id) {
    try {
        const response = await fetch(`${API_URL}/gastos/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Error al eliminar el gasto');
        }
        
        // Actualizar lista
        cargarGastos();
        
        showToast('Gasto eliminado correctamente', 'success');
        
    } catch (error) {
        console.error('Error eliminando gasto:', error);
        showToast('Error al eliminar el gasto', 'danger');
    }
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

// Actualizar gráficos
function actualizarGraficos() {
    if (gastos.length === 0) {
        chartGastosPorDia.data.labels = [];
        chartGastosPorDia.data.datasets[0].data = [];
        chartTopConceptos.data.labels = [];
        chartTopConceptos.data.datasets[0].data = [];
        
        chartGastosPorDia.update();
        chartTopConceptos.update();
        return;
    }
    
    // Gráfico de gastos por día
    const gastosPorDia = {};
    gastos.forEach(gasto => {
        const fecha = new Date(gasto.fecha).toLocaleDateString('es-ES', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
        });
        
        if (!gastosPorDia[fecha]) {
            gastosPorDia[fecha] = 0;
        }
        gastosPorDia[fecha] += parseFloat(gasto.monto);
    });
    
    chartGastosPorDia.data.labels = Object.keys(gastosPorDia);
    chartGastosPorDia.data.datasets[0].data = Object.values(gastosPorDia);
    chartGastosPorDia.update();
    
    // Gráfico de top conceptos
    const conceptos = {};
    gastos.forEach(gasto => {
        if (!conceptos[gasto.concepto]) {
            conceptos[gasto.concepto] = 0;
        }
        conceptos[gasto.concepto] += parseFloat(gasto.monto);
    });
    
    // Ordenar conceptos por monto y tomar top 5
    const topConceptos = Object.entries(conceptos)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    chartTopConceptos.data.labels = topConceptos.map(item => item[0]);
    chartTopConceptos.data.datasets[0].data = topConceptos.map(item => item[1]);
    chartTopConceptos.update();
}

// Exportar datos
function exportarDatos() {
    if (gastos.length === 0) {
        showToast('No hay datos para exportar', 'warning');
        return;
    }
    
    // Crear CSV
    let csv = 'Fecha,Concepto,Monto\n';
    
    gastos.forEach(gasto => {
        const fecha = new Date(gasto.fecha).toLocaleDateString('es-ES');
        const concepto = gasto.concepto.replace(/,/g, ';');
        const monto = gasto.monto;
        
        csv += `"${fecha}","${concepto}",${monto}\n`;
    });
    
    // Crear archivo y descargar
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `gastos_semana_${semanaSeleccionada}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Datos exportados correctamente', 'success');
}

// Limpiar tabla
function limpiarTabla() {
    const tbody = tablaGastos.querySelector('tbody');
    tbody.innerHTML = `
        <tr id="sinGastos">
            <td colspan="4" class="text-center text-muted py-5">
                <i class="bi bi-receipt display-4 d-block mb-3"></i>
                <h5>No hay gastos registrados</h5>
                <p class="mb-0">Selecciona una semana y agrega tu primer gasto</p>
            </td>
        </tr>
    `;
    
    // Limpiar paginación
    document.getElementById('paginacion').innerHTML = '';
}

// Resetear estadísticas
function resetearEstadisticas() {
    totalGastos.textContent = '$0.00';
    cantidadGastos.textContent = '0';
    
    // Resetear gráficos
    chartGastosPorDia.data.labels = [];
    chartGastosPorDia.data.datasets[0].data = [];
    chartGastosPorDia.update();
    
    chartTopConceptos.data.labels = [];
    chartTopConceptos.data.datasets[0].data = [];
    chartTopConceptos.update();
}

// Mostrar notificación toast
function showToast(message, type = 'info') {
    // Crear toast container si no existe
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    // Crear toast
    const toastId = 'toast-' + Date.now();
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-bg-${type} border-0`;
    toast.id = toastId;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class="bi ${type === 'success' ? 'bi-check-circle' : type === 'danger' ? 'bi-exclamation-triangle' : 'bi-info-circle'} me-2"></i>
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Mostrar toast
    const bsToast = new bootstrap.Toast(toast, {
        delay: 3000
    });
    bsToast.show();
    
    // Remover toast después de ocultarse
    toast.addEventListener('hidden.bs.toast', function() {
        toast.remove();
    });
}