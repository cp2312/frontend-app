// URL de la API
const API_URL = "https://backend-express-production-a427.up.railway.app";

// Variables globales
let prestamosDB = [];
let semanaActual = null;

// Elementos del DOM
const selectSemana = document.getElementById('semana');
const selectSemanaModal = document.getElementById('semana-modal');
const btnActualizar = document.getElementById('actualizar');
const btnNuevoRegistro = document.getElementById('nuevo-registro');

// Cargar información de la semana desde URL parameters
function cargarSemanaDesdeURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const semanaParam = urlParams.get('semana');
    
    if (semanaParam) {
        try {
            semanaActual = JSON.parse(decodeURIComponent(semanaParam));
            console.log('Semana cargada:', semanaActual);
            actualizarInfoSemana();
            // Establecer la semana actual en el select
            if (selectSemana) {
                selectSemana.value = semanaActual.id;
                // Crear opción si no existe
                if (!selectSemana.querySelector(`option[value="${semanaActual.id}"]`)) {
                    const option = document.createElement('option');
                    option.value = semanaActual.id;
                    option.textContent = `Semana ${semanaActual.id}: ${semanaActual.nombre || 'Sin nombre'}`;
                    selectSemana.appendChild(option);
                }
            }
            // Establecer la semana en el modal como solo lectura
            if (selectSemanaModal) {
                selectSemanaModal.value = semanaActual.id;
                selectSemanaModal.disabled = true;
                // Crear opción si no existe
                if (!selectSemanaModal.querySelector(`option[value="${semanaActual.id}"]`)) {
                    const option = document.createElement('option');
                    option.value = semanaActual.id;
                    option.textContent = `Semana ${semanaActual.id}: ${semanaActual.nombre || 'Sin nombre'}`;
                    selectSemanaModal.appendChild(option);
                }
            }
            // Cargar datos de préstamos
            cargarDatos();
        } catch (error) {
            console.error('Error al cargar la semana:', error);
            mostrarError('Error al cargar la información de la semana');
        }
    } else {
        console.warn('No se encontró información de la semana en la URL');
        // Si no hay semana en URL, cargar semanas normalmente
        cargarSemanas();
    }
}

// Actualizar información de la semana en la interfaz
function actualizarInfoSemana() {
    if (!semanaActual) return;
    
    document.getElementById('fechaSemanaInfo').textContent = formatFecha(semanaActual.fecha);
    document.getElementById('nombreSemanaInfo').textContent = semanaActual.nombre || 'Sin nombre';
    document.getElementById('mesSemanaInfo').textContent = semanaActual.mes || 'Sin mes';
    document.getElementById('idSemanaInfo').textContent = semanaActual.id || 'N/A';
}

// Formatear fecha
function formatFecha(fechaString) {
    if (!fechaString) return 'Sin fecha';
    try {
        const fecha = new Date(fechaString);
        return fecha.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).replace(/^\w/, c => c.toUpperCase());
    } catch (error) {
        console.error('Error al formatear fecha:', error);
        return 'Fecha inválida';
    }
}

// Formatear números con separadores de miles
function formatNumber(num) {
    return new Intl.NumberFormat('es-ES', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
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
    // Eliminar notificaciones anteriores
    const notificacionesAnteriores = document.querySelectorAll('.notificacion');
    notificacionesAnteriores.forEach(n => n.remove());
    
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion ${tipo}`;
    
    // Icono según tipo
    const icono = tipo === 'success' ? 'check-circle' : 'exclamation-circle';
    
    notificacion.innerHTML = `
        <i class="fas fa-${icono}"></i>
        <span>${mensaje}</span>
    `;
    
    notificacion.style.cssText = `
        position: fixed;
        top: 25px;
        right: 25px;
        padding: 18px 24px;
        background: ${tipo === 'success' ? 
            'linear-gradient(135deg, #10b981, #059669)' : 
            'linear-gradient(135deg, #ef4444, #dc2626)'};
        color: white;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 12px;
        font-weight: 500;
        animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    
    document.body.appendChild(notificacion);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        notificacion.style.animation = 'slideOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards';
        setTimeout(() => notificacion.remove(), 300);
    }, 3000);
}

// Mostrar error
function mostrarError(mensaje) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <span>${mensaje}</span>
    `;
    
    const container = document.querySelector('.container');
    container.insertBefore(errorDiv, container.firstChild);
    
    setTimeout(() => {
        errorDiv.style.opacity = '0';
        errorDiv.style.transform = 'translateY(-10px)';
        setTimeout(() => errorDiv.remove(), 300);
    }, 5000);
}

// Cargar semanas desde la API (para cuando no hay semana en URL)
async function cargarSemanas() {
    try {
        const response = await fetch(`${API_URL}/api/semanas`);
        if (!response.ok) throw new Error('Error al cargar semanas');
        
        const semanasDB = await response.json();
        
        // Si hay semanas, seleccionar la primera
        if (semanasDB.length > 0) {
            semanaActual = semanasDB[0];
            actualizarInfoSemana();
            
            // Limpiar y llenar selects
            selectSemana.innerHTML = '';
            selectSemanaModal.innerHTML = '';
            
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
            
            // Establecer la semana actual en el modal como solo lectura
            selectSemanaModal.value = semanaActual.id;
            selectSemanaModal.disabled = true;
            
            await cargarDatos();
        } else {
            mostrarError('No hay semanas disponibles');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error al cargar las semanas');
    }
}

// Cargar datos de préstamos desde la API
async function cargarDatos() {
    if (!semanaActual || !semanaActual.id) {
        mostrarError('No hay una semana seleccionada');
        return;
    }
    
    mostrarCarga(true);
    
    try {
        const response = await fetch(`${API_URL}/api/prestamos/semana/${semanaActual.id}`);
        
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
        p.persona && p.persona.toLowerCase() === persona.toLowerCase() && 
        p.tipo === 'Prestamo'
    );
    
    const gastos = prestamosDB.filter(p => 
        p.persona && p.persona.toLowerCase() === persona.toLowerCase() && 
        p.tipo === 'Gasto'
    );
    
    const totalPrestamos = prestamos.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0);
    const totalGastos = gastos.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0);
    const totalFinal = totalPrestamos - totalGastos;
    
    // Actualizar los totales en la interfaz
    const personaId = persona.toLowerCase();
    const totalPrestamosElem = document.getElementById(`total-prestamos-${personaId}`);
    const totalGastosElem = document.getElementById(`total-gastos-${personaId}`);
    const totalFinalElem = document.getElementById(`total-final-${personaId}`);
    
    if (totalPrestamosElem) totalPrestamosElem.textContent = formatNumber(totalPrestamos);
    if (totalGastosElem) totalGastosElem.textContent = formatNumber(totalGastos);
    if (totalFinalElem) totalFinalElem.textContent = formatNumber(totalFinal);
    
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
    
    const totalPrestamosElem = document.getElementById('total-general-prestamos');
    const totalGastosElem = document.getElementById('total-general-gastos');
    const totalFinalElem = document.getElementById('total-general-final');
    
    if (totalPrestamosElem) totalPrestamosElem.textContent = formatNumber(totalGeneralPrestamos);
    if (totalGastosElem) totalGastosElem.textContent = formatNumber(totalGeneralGastos);
    if (totalFinalElem) totalFinalElem.textContent = formatNumber(totalGeneralFinal);
}

// Renderizar tabla para una persona específica
function renderizarTabla(persona) {
    const tbodyId = `tabla-${persona.toLowerCase()}`;
    const tbody = document.getElementById(tbodyId);
    
    if (!tbody) {
        console.error(`No se encontró tbody con id: ${tbodyId}`);
        return;
    }
    
    // Obtener datos filtrados por persona
    const datosPersona = prestamosDB.filter(p => 
        p.persona && p.persona.toLowerCase() === persona.toLowerCase()
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
                <td colspan="6" style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    No hay registros para esta semana
                </td>
            </tr>
        `;
    } else {
        for (let i = 0; i < maxRows; i++) {
            html += '<tr>';
            
            // Número de fila
            html += `<td style="text-align: center; color: #64748b; font-weight: 500;">${i + 1}</td>`;
            
            // Datos de préstamo (si existen)
            if (i < prestamos.length) {
                const prestamo = prestamos[i];
                html += `<td style="color: #059669; font-weight: 600;">${formatNumber(prestamo.monto)}</td>`;
                html += `<td style="color: #475569;">${prestamo.concepto || ''}</td>`;
            } else {
                html += '<td></td><td></td>';
            }
            
            // Datos de gasto (si existen)
            if (i < gastos.length) {
                const gasto = gastos[i];
                html += `<td style="color: #dc2626; font-weight: 600;">${formatNumber(gasto.monto)}</td>`;
                html += `<td style="color: #475569;">${gasto.concepto || ''}</td>`;
            } else {
                html += '<td></td><td></td>';
            }
            
            // Botones de acción
            html += '<td class="acciones">';
            
            // Solo mostrar botones si hay un registro en esta fila
            const registro = i < prestamos.length ? prestamos[i] : gastos[i];
            if (registro && registro.id) {
                html += `
                    <button class="btn-editar" onclick="abrirModalEditar(${registro.id})" title="Editar registro">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-eliminar" onclick="eliminarRegistro(${registro.id})" title="Eliminar registro">
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
    
    if (registro) {
        // Modo edición
        titulo.textContent = 'Editar Registro';
        document.getElementById('registro-id').value = registro.id;
        document.getElementById('persona').value = registro.persona || 'Manuel';
        document.getElementById('tipo').value = registro.tipo || 'Prestamo';
        document.getElementById('monto').value = registro.monto || '';
        document.getElementById('concepto').value = registro.concepto || '';
        
        // La semana no se puede editar, se mantiene la actual
        if (semanaActual) {
            document.getElementById('semana-modal').value = semanaActual.id;
        }
    } else {
        // Modo nuevo
        titulo.textContent = 'Nuevo Registro';
        document.getElementById('registro-id').value = '';
        document.getElementById('persona').value = 'Manuel';
        document.getElementById('tipo').value = 'Prestamo';
        document.getElementById('monto').value = '';
        document.getElementById('concepto').value = '';
        
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
    if (!confirm('¿Estás seguro de eliminar este registro?\nEsta acción no se puede deshacer.')) return;
    
    try {
        const response = await fetch(`${API_URL}/api/prestamos/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al eliminar');
        }
        
        // Actualizar datos locales
        prestamosDB = prestamosDB.filter(p => p.id !== id);
        renderizarTodasLasTablas();
        mostrarNotificacion('Registro eliminado correctamente', 'success');
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion(error.message || 'Error al eliminar el registro', 'error');
    }
}

// Guardar registro
async function guardarRegistro(e) {
    e.preventDefault();
    
    if (!semanaActual || !semanaActual.id) {
        mostrarNotificacion('No hay una semana seleccionada', 'error');
        return;
    }
    
    const id = document.getElementById('registro-id').value;
    const persona = document.getElementById('persona').value;
    const tipo = document.getElementById('tipo').value;
    const monto = parseFloat(document.getElementById('monto').value);
    const concepto = document.getElementById('concepto').value.trim();
    const semana_id = semanaActual.id; // Siempre la semana actual
    
    if (!persona || !tipo || isNaN(monto) || monto <= 0 || !concepto) {
        mostrarNotificacion('Por favor complete todos los campos correctamente', 'error');
        return;
    }
    
    const registroData = {
        persona,
        tipo,
        monto,
        concepto,
        semana_id
    };
    
    try {
        let response;
        let url = `${API_URL}/api/prestamos`;
        let method = 'POST';
        
        if (id) {
            // Editar registro existente
            url = `${API_URL}/api/prestamos/${id}`;
            method = 'PUT';
        }
        
        response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(registroData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al guardar');
        }
        
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
        mostrarNotificacion(error.message || 'Error al guardar el registro', 'error');
    }
}

// Inicializar la aplicación
function inicializar() {
    // Event Listeners
    if (selectSemana) {
        selectSemana.addEventListener('change', async function() {
            const semanaId = this.value;
            if (semanaId) {
                // Actualizar semana actual
                semanaActual = {
                    id: parseInt(semanaId),
                    nombre: this.options[this.selectedIndex].text.split(': ')[1],
                    fecha: new Date().toISOString(),
                    mes: new Date().toLocaleDateString('es-ES', { month: 'long' })
                };
                actualizarInfoSemana();
                await cargarDatos();
            }
        });
    }
    
    if (btnActualizar) {
        btnActualizar.addEventListener('click', cargarDatos);
    }
    
    if (btnNuevoRegistro) {
        btnNuevoRegistro.addEventListener('click', () => abrirModal());
    }
    
    // Eventos para el modal
    if (closeModal) {
        closeModal.addEventListener('click', cerrarModal);
    }
    
    if (btnCancelar) {
        btnCancelar.addEventListener('click', cerrarModal);
    }
    
    if (formRegistro) {
        formRegistro.addEventListener('submit', guardarRegistro);
    }
    
    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            cerrarModal();
        }
    });
    
    // Cargar semana desde URL o normalmente
    cargarSemanaDesdeURL();
}

// Iniciar cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', inicializar);

// Añadir estilos para animaciones
const style = document.createElement('style');
style.textContent = `
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