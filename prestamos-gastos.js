// URL de la API
const API_URL = "https://backend-express-production-a427.up.railway.app";

// Variables globales
let prestamosDB = [];
let semanasDB = [];
let semanaActual = null;

// Elementos del DOM
const selectSemana = document.getElementById('semana');
const selectSemanaModal = document.getElementById('semana-modal');
const btnActualizar = document.getElementById('actualizar');
const btnNuevoRegistro = document.getElementById('nuevo-registro');

// Formatear números con separadores de miles
function formatNumber(num) {
    return new Intl.NumberFormat('es-ES').format(num);
}

// Mostrar/ocultar carga
function mostrarCarga(mostrar) {
    if (mostrar) {
        btnActualizar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';
        btnActualizar.disabled = true;
    } else {
        btnActualizar.innerHTML = '<i class="fas fa-sync-alt"></i> Actualizar Datos';
        btnActualizar.disabled = false;
    }
}

// Mostrar notificación
function mostrarNotificacion(mensaje, tipo = 'success') {
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion ${tipo}`;
    notificacion.textContent = mensaje;
    notificacion.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${tipo === 'success' ? '#51cf66' : '#ff6b6b'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notificacion);
    
    setTimeout(() => {
        notificacion.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notificacion.remove(), 300);
    }, 3000);
}

// Cargar semanas desde la API
async function cargarSemanas() {
    try {
        const response = await fetch(`${API_URL}/api/semanas`);
        if (!response.ok) throw new Error('Error al cargar semanas');
        
        semanasDB = await response.json();
        actualizarSelectSemanas();
        
        // Seleccionar la primera semana por defecto
        if (semanasDB.length > 0) {
            selectSemana.value = semanasDB[0].id;
            actualizarInfoSemana(semanasDB[0]);
            await cargarDatos();
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('Error al cargar las semanas', 'error');
    }
}

// Actualizar select de semanas
function actualizarSelectSemanas() {
    // Limpiar selects
    selectSemana.innerHTML = '';
    selectSemanaModal.innerHTML = '';
    
    // Agregar opciones
    semanasDB.forEach(semana => {
        const option = document.createElement('option');
        option.value = semana.id;
        option.textContent = `Semana ${semana.id}: ${semana.nombre || 'Sin nombre'}`;
        selectSemana.appendChild(option);
        
        const optionModal = document.createElement('option');
        optionModal.value = semana.id;
        optionModal.textContent = `Semana ${semana.id}: ${semana.nombre || 'Sin nombre'}`;
        selectSemanaModal.appendChild(optionModal);
    });
}

// Actualizar información de la semana
function actualizarInfoSemana(semana) {
    semanaActual = semana;
    
    document.getElementById('fechaSemanaInfo').textContent = 
        semana.fecha ? new Date(semana.fecha).toLocaleDateString('es-ES') : '-';
    document.getElementById('nombreSemanaInfo').textContent = semana.nombre || '-';
    document.getElementById('mesSemanaInfo').textContent = semana.mes || '-';
    document.getElementById('idSemanaInfo').textContent = semana.id || '-';
}

// Cargar datos de préstamos desde la API
async function cargarDatos() {
    if (!selectSemana.value) return;
    
    mostrarCarga(true);
    
    try {
        const semanaId = selectSemana.value;
        const response = await fetch(`${API_URL}/api/prestamos/semana/${semanaId}`);
        
        if (!response.ok) throw new Error('Error al cargar datos');
        
        prestamosDB = await response.json();
        renderizarTodasLasTablas();
        mostrarNotificacion('Datos actualizados correctamente');
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('Error al cargar los datos', 'error');
    } finally {
        mostrarCarga(false);
    }
}

// Calcular y mostrar totales para una persona
function calcularTotales(persona) {
    const prestamos = prestamosDB.filter(p => 
        p.persona.toLowerCase() === persona.toLowerCase() && 
        p.tipo === 'Prestamo'
    );
    
    const gastos = prestamosDB.filter(p => 
        p.persona.toLowerCase() === persona.toLowerCase() && 
        p.tipo === 'Gasto'
    );
    
    const totalPrestamos = prestamos.reduce((sum, p) => sum + parseFloat(p.monto), 0);
    const totalGastos = gastos.reduce((sum, p) => sum + parseFloat(p.monto), 0);
    const totalFinal = totalPrestamos - totalGastos;
    
    // Actualizar los totales en la interfaz
    const personaId = persona.toLowerCase();
    document.getElementById(`total-prestamos-${personaId}`).textContent = formatNumber(totalPrestamos);
    document.getElementById(`total-gastos-${personaId}`).textContent = formatNumber(totalGastos);
    document.getElementById(`total-final-${personaId}`).textContent = formatNumber(totalFinal);
    
    return { totalPrestamos, totalGastos, totalFinal };
}

// Actualizar el resumen general
function actualizarResumenGeneral() {
    let totalGeneralPrestamos = 0;
    let totalGeneralGastos = 0;
    
    const personas = ['Manuel', 'Rocio', 'Miriam', 'Luz', 'Samy', 'Fredy'];
    
    personas.forEach(persona => {
        const { totalPrestamos, totalGastos } = calcularTotales(persona);
        totalGeneralPrestamos += totalPrestamos;
        totalGeneralGastos += totalGastos;
    });
    
    const totalGeneralFinal = totalGeneralPrestamos - totalGeneralGastos;
    
    document.getElementById('total-general-prestamos').textContent = formatNumber(totalGeneralPrestamos);
    document.getElementById('total-general-gastos').textContent = formatNumber(totalGeneralGastos);
    document.getElementById('total-general-final').textContent = formatNumber(totalGeneralFinal);
}

// Renderizar tabla para una persona específica
function renderizarTabla(persona) {
    const tbodyId = `tabla-${persona.toLowerCase()}`;
    const tbody = document.getElementById(tbodyId);
    
    // Mostrar estado de carga
    tbody.innerHTML = `
        <tr class="tabla-loading">
            <td colspan="6">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Cargando datos...</p>
            </td>
        </tr>
    `;
    
    // Obtener datos filtrados por persona
    const datosPersona = prestamosDB.filter(p => 
        p.persona.toLowerCase() === persona.toLowerCase()
    );
    
    // Separar préstamos y gastos
    const prestamos = datosPersona.filter(p => p.tipo === 'Prestamo');
    const gastos = datosPersona.filter(p => p.tipo === 'Gasto');
    
    // Determinar el número máximo de filas
    const maxRows = Math.max(prestamos.length, gastos.length);
    
    // Crear filas
    let html = '';
    
    if (maxRows === 0) {
        html = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 30px; color: #999;">
                    No hay registros para esta semana
                </td>
            </tr>
        `;
    } else {
        for (let i = 0; i < maxRows; i++) {
            html += '<tr>';
            
            // Número de fila
            html += `<td>${i + 1}</td>`;
            
            // Datos de préstamo (si existen)
            if (i < prestamos.length) {
                const prestamo = prestamos[i];
                html += `<td>${formatNumber(prestamo.monto)}</td>`;
                html += `<td>${prestamo.concepto}</td>`;
            } else {
                html += '<td></td><td></td>';
            }
            
            // Datos de gasto (si existen)
            if (i < gastos.length) {
                const gasto = gastos[i];
                html += `<td>${formatNumber(gasto.monto)}</td>`;
                html += `<td>${gasto.concepto}</td>`;
            } else {
                html += '<td></td><td></td>';
            }
            
            // Botones de acción
            html += '<td class="acciones">';
            
            // Solo mostrar botones si hay un registro en esta fila
            const registro = i < prestamos.length ? prestamos[i] : gastos[i];
            if (registro) {
                html += `
                    <button class="btn-editar" onclick="abrirModalEditar(${registro.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-eliminar" onclick="eliminarRegistro(${registro.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
            }
            
            html += '</td></tr>';
        }
    }
    
    tbody.innerHTML = html;
    
    // Calcular totales
    calcularTotales(persona);
}

// Renderizar todas las tablas
function renderizarTodasLasTablas() {
    const personas = ['Manuel', 'Rocio', 'Miriam', 'Luz', 'Samy', 'Fredy'];
    personas.forEach(persona => renderizarTabla(persona));
    actualizarResumenGeneral();
}

// Modal functions
const modal = document.getElementById('modal');
const closeModal = document.querySelector('.close');
const btnCancelar = document.querySelector('.btn-cancelar');
const formRegistro = document.getElementById('form-registro');

function abrirModal(registro = null) {
    const titulo = document.getElementById('modal-titulo');
    const form = document.getElementById('form-registro');
    
    if (registro) {
        // Modo edición
        titulo.textContent = 'Editar Registro';
        document.getElementById('registro-id').value = registro.id;
        document.getElementById('persona').value = registro.persona;
        document.getElementById('tipo').value = registro.tipo;
        document.getElementById('monto').value = registro.monto;
        document.getElementById('concepto').value = registro.concepto;
        document.getElementById('semana-modal').value = registro.semana_id;
    } else {
        // Modo nuevo
        titulo.textContent = 'Nuevo Registro';
        form.reset();
        document.getElementById('registro-id').value = '';
        // Establecer semana actual por defecto
        if (semanaActual) {
            document.getElementById('semana-modal').value = semanaActual.id;
        }
    }
    
    modal.style.display = 'block';
}

function abrirModalEditar(id) {
    const registro = prestamosDB.find(p => p.id === id);
    if (registro) {
        abrirModal(registro);
    }
}

function cerrarModal() {
    modal.style.display = 'none';
    formRegistro.reset();
}

// Eliminar registro
async function eliminarRegistro(id) {
    if (!confirm('¿Estás seguro de eliminar este registro?')) return;
    
    try {
        const response = await fetch(`${API_URL}/api/prestamos/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Error al eliminar');
        
        // Actualizar datos locales
        prestamosDB = prestamosDB.filter(p => p.id !== id);
        renderizarTodasLasTablas();
        mostrarNotificacion('Registro eliminado correctamente', 'success');
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('Error al eliminar el registro', 'error');
    }
}

// Guardar registro
async function guardarRegistro(e) {
    e.preventDefault();
    
    const id = document.getElementById('registro-id').value;
    const persona = document.getElementById('persona').value;
    const tipo = document.getElementById('tipo').value;
    const monto = parseFloat(document.getElementById('monto').value);
    const concepto = document.getElementById('concepto').value;
    const semana_id = parseInt(document.getElementById('semana-modal').value);
    
    const registroData = {
        persona,
        tipo,
        monto,
        concepto,
        semana_id
    };
    
    try {
        let response;
        
        if (id) {
            // Editar registro existente
            response = await fetch(`${API_URL}/api/prestamos/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(registroData)
            });
        } else {
            // Nuevo registro
            response = await fetch(`${API_URL}/api/prestamos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(registroData)
            });
        }
        
        if (!response.ok) throw new Error('Error al guardar');
        
        const nuevoRegistro = await response.json();
        
        // Actualizar datos locales
        if (id) {
            const index = prestamosDB.findIndex(p => p.id === parseInt(id));
            if (index !== -1) {
                prestamosDB[index] = nuevoRegistro;
            }
        } else {
            prestamosDB.push(nuevoRegistro);
        }
        
        cerrarModal();
        renderizarTodasLasTablas();
        mostrarNotificacion(
            id ? 'Registro actualizado correctamente' : 'Registro agregado correctamente', 
            'success'
        );
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('Error al guardar el registro', 'error');
    }
}

// Inicializar la aplicación
async function inicializar() {
    // Event Listeners
    selectSemana.addEventListener('change', async function() {
        const semana = semanasDB.find(s => s.id == this.value);
        if (semana) {
            actualizarInfoSemana(semana);
            await cargarDatos();
        }
    });
    
    btnActualizar.addEventListener('click', cargarDatos);
    btnNuevoRegistro.addEventListener('click', () => abrirModal());
    
    // Eventos para el modal
    closeModal.addEventListener('click', cerrarModal);
    btnCancelar.addEventListener('click', cerrarModal);
    formRegistro.addEventListener('submit', guardarRegistro);
    
    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            cerrarModal();
        }
    });
    
    // Cargar datos iniciales
    await cargarSemanas();
}

// Iniciar cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', inicializar);

// Estilos CSS dinámicos para animaciones
const style = document.createElement('style');
style.textContent = `
    .acciones {
        width: 80px;
    }
    
    .btn-editar, .btn-eliminar {
        background: none;
        border: none;
        cursor: pointer;
        padding: 5px;
        margin: 0 3px;
        border-radius: 4px;
        transition: all 0.2s;
    }
    
    .btn-editar {
        color: #4dabf7;
    }
    
    .btn-editar:hover {
        background-color: #e7f5ff;
    }
    
    .btn-eliminar {
        color: #ff6b6b;
    }
    
    .btn-eliminar:hover {
        background-color: #fff5f5;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .fa-spinner {
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);