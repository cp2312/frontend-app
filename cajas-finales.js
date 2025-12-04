// URL de la API
const API_URL = "https://backend-express-production-a427.up.railway.app";

// Variables globales
let cierresDB = [];
let semanaActual = null;

// Elementos del DOM
const selectSemana = document.getElementById('semana');
const btnActualizar = document.getElementById('actualizar');
const btnNuevoCierre = document.getElementById('nuevo-cierre');
const modalCierre = document.getElementById('modal-cierre');
const formCierre = document.getElementById('form-cierre');

// Formatear números como dinero
function formatMoney(num) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(num || 0);
}

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
            
            // Cargar cierres de caja
            cargarCierres();
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
            
            // Limpiar y llenar select
            if (selectSemana) {
                selectSemana.innerHTML = '';
                semanasDB.forEach(semana => {
                    const option = document.createElement('option');
                    option.value = semana.id;
                    option.textContent = `Semana ${semana.id}: ${semana.nombre || 'Sin nombre'}`;
                    selectSemana.appendChild(option);
                });
            }
            
            await cargarCierres();
        } else {
            mostrarError('No hay semanas disponibles');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error al cargar las semanas');
    }
}

// Cargar cierres de caja desde la API
async function cargarCierres() {
    if (!semanaActual || !semanaActual.id) {
        mostrarError('No hay una semana seleccionada');
        return;
    }
    
    mostrarCarga(true);
    
    try {
        const response = await fetch(`${API_URL}/api/cierres/semana/${semanaActual.id}`);
        
        if (!response.ok) throw new Error('Error al cargar cierres de caja');
        
        cierresDB = await response.json();
        actualizarInterfazCierres();
        actualizarResumenCierres();
        mostrarNotificacion('Cierres de caja actualizados correctamente');
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('Error al cargar los cierres de caja', 'error');
    } finally {
        mostrarCarga(false);
    }
}

// Obtener cierre por día y número de caja
function obtenerCierre(dia, numeroCaja = 1) {
    return cierresDB.find(c => 
        c.dia.toLowerCase() === dia.toLowerCase() && 
        (!c.numero_caja || c.numero_caja == numeroCaja)
    );
}

// Calcular diferencia para un cierre
function calcularDiferencia(cierre) {
    if (!cierre) return 0;
    
    const total = parseFloat(cierre.total_efectivo || 0);
    const base = parseFloat(cierre.base || 0);
    const ventas = parseFloat(cierre.ventas || 0);
    const talonarios = parseFloat(cierre.talonarios || 0);
    const otro = parseFloat(cierre.otro || 0);
    const llevar = parseFloat(cierre.llevar || 0);
    
    // Cálculo según el excel: TOTAL - (BASE + VENTAS + TALONARIOS + OTRO + LLEVAR)
    const suma = base + ventas + talonarios + otro + llevar;
    return total - suma;
}

// Actualizar interfaz de un cierre específico
function actualizarCierreUI(dia, numeroCaja = 1) {
    const cierre = obtenerCierre(dia, numeroCaja);
    const idSuffix = numeroCaja > 1 ? `-${dia}-${numeroCaja}` : `-${dia}`;
    
    if (cierre) {
        // Actualizar valores
        document.getElementById(`total-efectivo${idSuffix}`).textContent = formatMoney(cierre.total_efectivo);
        document.getElementById(`base${idSuffix}`).textContent = formatMoney(cierre.base);
        document.getElementById(`llevar${idSuffix}`).textContent = formatMoney(cierre.llevar || 0);
        document.getElementById(`ventas${idSuffix}`).textContent = formatMoney(cierre.ventas);
        document.getElementById(`talonarios${idSuffix}`).textContent = formatMoney(cierre.talonarios);
        document.getElementById(`otro${idSuffix}`).textContent = formatMoney(cierre.otro || 0);
        
        // Calcular y mostrar total
        const total = parseFloat(cierre.base || 0) + 
                     parseFloat(cierre.ventas || 0) + 
                     parseFloat(cierre.talonarios || 0) + 
                     parseFloat(cierre.otro || 0) + 
                     parseFloat(cierre.llevar || 0);
        document.getElementById(`total${idSuffix}-detalle`).textContent = formatMoney(total);
        
        // Calcular y mostrar diferencia
        const diferencia = calcularDiferencia(cierre);
        document.getElementById(`diferencia${idSuffix}`).textContent = formatMoney(diferencia);
    } else {
        // Si no hay cierre, mostrar ceros
        document.getElementById(`total-efectivo${idSuffix}`).textContent = formatMoney(0);
        document.getElementById(`base${idSuffix}`).textContent = formatMoney(0);
        document.getElementById(`llevar${idSuffix}`).textContent = formatMoney(0);
        document.getElementById(`ventas${idSuffix}`).textContent = formatMoney(0);
        document.getElementById(`talonarios${idSuffix}`).textContent = formatMoney(0);
        document.getElementById(`otro${idSuffix}`).textContent = formatMoney(0);
        document.getElementById(`total${idSuffix}-detalle`).textContent = formatMoney(0);
        document.getElementById(`diferencia${idSuffix}`).textContent = formatMoney(0);
    }
}

// Actualizar toda la interfaz de cierres
function actualizarInterfazCierres() {
    // Sábado
    actualizarCierreUI('sabado');
    
    // Domingo (2 cajas)
    actualizarCierreUI('domingo', 1);
    actualizarCierreUI('domingo', 2);
    
    // Lunes festivo (opcional)
    const cierreLunes = obtenerCierre('lunes');
    if (cierreLunes) {
        document.getElementById('caja-lunes-container').style.display = 'block';
        document.getElementById('add-lunes-container').style.display = 'none';
        actualizarCierreUI('lunes');
    } else {
        document.getElementById('caja-lunes-container').style.display = 'none';
        document.getElementById('add-lunes-container').style.display = 'block';
    }
}

// Calcular totales por día
function calcularTotalesPorDia() {
    const totales = {
        sabado: 0,
        domingo: 0,
        lunes: 0,
        diferenciaTotal: 0
    };
    
    // Sábado
    const cierreSabado = obtenerCierre('sabado');
    if (cierreSabado) {
        totales.sabado = calcularDiferencia(cierreSabado);
        totales.diferenciaTotal += totales.sabado;
    }
    
    // Domingo (sumar ambas cajas)
    const cierreDomingo1 = obtenerCierre('domingo', 1);
    const cierreDomingo2 = obtenerCierre('domingo', 2);
    
    if (cierreDomingo1) {
        totales.domingo += calcularDiferencia(cierreDomingo1);
    }
    if (cierreDomingo2) {
        totales.domingo += calcularDiferencia(cierreDomingo2);
    }
    totales.diferenciaTotal += totales.domingo;
    
    // Lunes festivo
    const cierreLunes = obtenerCierre('lunes');
    if (cierreLunes) {
        totales.lunes = calcularDiferencia(cierreLunes);
        totales.diferenciaTotal += totales.lunes;
    }
    
    return totales;
}

// Calcular totales generales
function calcularTotalesGenerales() {
    let efectivoTotal = 0;
    let baseTotal = 0;
    let ventasTotal = 0;
    let talonariosTotal = 0;
    let dineroNeto = 0;
    
    // Sumar todos los cierres
    cierresDB.forEach(cierre => {
        efectivoTotal += parseFloat(cierre.total_efectivo || 0);
        baseTotal += parseFloat(cierre.base || 0);
        ventasTotal += parseFloat(cierre.ventas || 0);
        talonariosTotal += parseFloat(cierre.talonarios || 0);
        dineroNeto += calcularDiferencia(cierre);
    });
    
    return {
        efectivoTotal,
        baseTotal,
        ventasTotal,
        talonariosTotal,
        dineroNeto
    };
}

// Actualizar resumen de cierres
function actualizarResumenCierres() {
    const totalesPorDia = calcularTotalesPorDia();
    const totalesGenerales = calcularTotalesGenerales();
    
    // Actualizar resumen por día
    document.getElementById('total-sabado').textContent = formatMoney(totalesPorDia.sabado);
    document.getElementById('total-domingo').textContent = formatMoney(totalesPorDia.domingo);
    document.getElementById('total-lunes').textContent = formatMoney(totalesPorDia.lunes);
    
    // Calcular total semanal (suma de diferencias positivas)
    const totalSemanal = Math.max(0, totalesPorDia.sabado) + 
                         Math.max(0, totalesPorDia.domingo) + 
                         Math.max(0, totalesPorDia.lunes);
    document.getElementById('total-semanal').textContent = formatMoney(totalSemanal);
    
    // Actualizar diferencia total
    document.getElementById('diferencia-total').textContent = formatMoney(totalesPorDia.diferenciaTotal);
    
    // Actualizar resumen final
    document.getElementById('efectivo-total').textContent = formatMoney(totalesGenerales.efectivoTotal);
    document.getElementById('base-total').textContent = formatMoney(totalesGenerales.baseTotal);
    document.getElementById('ventas-total').textContent = formatMoney(totalesGenerales.ventasTotal);
    document.getElementById('talonarios-total').textContent = formatMoney(totalesGenerales.talonariosTotal);
    document.getElementById('dinero-neto').textContent = formatMoney(totalesGenerales.dineroNeto);
}

// Modal functions - versión actualizada
function abrirModalCierre(dia, numeroCaja = 1) {
    const titulo = document.getElementById('modal-cierre-titulo');
    const form = document.getElementById('form-cierre');
    const cierre = obtenerCierre(dia, numeroCaja);
    
    // Configurar título
    const diaNombre = dia.charAt(0).toUpperCase() + dia.slice(1);
    const tituloCaja = numeroCaja > 1 ? ` - Caja ${numeroCaja}` : '';
    titulo.textContent = cierre ? `Editar Cierre ${diaNombre}${tituloCaja}` : `Nuevo Cierre ${diaNombre}${tituloCaja}`;
    
    // Configurar campos
    document.getElementById('cierre-id').value = cierre ? cierre.id : '';
    document.getElementById('cierre-dia').value = dia;
    document.getElementById('cierre-numero').value = numeroCaja;
    document.getElementById('dia').value = dia;
    document.getElementById('numero-caja').value = numeroCaja.toString();
    
    // Si es sábado o lunes, ocultar número de caja
    const numeroCajaContainer = document.getElementById('numero-caja-container');
    const numeroCajaSelect = document.getElementById('numero-caja');
    
    if (dia === 'sabado' || dia === 'lunes') {
        numeroCajaContainer.style.display = 'none';
        numeroCajaSelect.value = '1';
    } else {
        numeroCajaContainer.style.display = 'block';
        numeroCajaSelect.value = numeroCaja.toString();
    }
    
    // Si es edición, cargar datos
    if (cierre) {
        document.getElementById('total_efectivo').value = cierre.total_efectivo || '';
        document.getElementById('base').value = cierre.base || '';
        document.getElementById('llevar').value = cierre.llevar || 0;
        document.getElementById('ventas').value = cierre.ventas || '';
        document.getElementById('talonarios').value = cierre.talonarios || '';
        document.getElementById('otro').value = cierre.otro || 0;
        document.getElementById('observaciones').value = cierre.observaciones || '';
    } else {
        // Nuevo cierre - resetear formulario
        document.getElementById('total_efectivo').value = '';
        document.getElementById('base').value = '';
        document.getElementById('llevar').value = 0;
        document.getElementById('ventas').value = '';
        document.getElementById('talonarios').value = '';
        document.getElementById('otro').value = 0;
        document.getElementById('observaciones').value = '';
    }
    
    // Calcular y mostrar diferencia
    calcularYMostrarDiferencia();
    
    // Mostrar modal
    modalCierre.style.display = 'block';
    
    // Enfocar el primer campo
    setTimeout(() => {
        document.getElementById('total_efectivo').focus();
    }, 100);
    
    // Scroll al inicio del modal
    const modalContent = document.querySelector('.modal-content.modal-lg');
    if (modalContent) {
        modalContent.scrollTop = 0;
    }
}

function cerrarModalCierre() {
    modalCierre.style.display = 'none';
    formCierre.reset();
}

// Calcular y mostrar diferencia en tiempo real
function calcularYMostrarDiferencia() {
    const totalEfectivo = parseFloat(document.getElementById('total_efectivo').value) || 0;
    const base = parseFloat(document.getElementById('base').value) || 0;
    const ventas = parseFloat(document.getElementById('ventas').value) || 0;
    const talonarios = parseFloat(document.getElementById('talonarios').value) || 0;
    const otro = parseFloat(document.getElementById('otro').value) || 0;
    const llevar = parseFloat(document.getElementById('llevar').value) || 0;
    
    const suma = base + ventas + talonarios + otro + llevar;
    const diferencia = totalEfectivo - suma;
    
    const diferenciaElem = document.getElementById('diferencia-calculada');
    diferenciaElem.textContent = formatMoney(diferencia);
    
    // Cambiar color según resultado
    if (diferencia < 0) {
        diferenciaElem.style.color = '#ef4444';
    } else if (diferencia > 0) {
        diferenciaElem.style.color = '#10b981';
    } else {
        diferenciaElem.style.color = '#64748b';
    }
}

// Toggle caja lunes
function toggleCajaLunes() {
    const cajaLunes = document.getElementById('caja-lunes-container');
    const addLunes = document.getElementById('add-lunes-container');
    
    if (cajaLunes.style.display === 'none' || !cajaLunes.style.display) {
        cajaLunes.style.display = 'block';
        addLunes.style.display = 'none';
    } else {
        cajaLunes.style.display = 'none';
        addLunes.style.display = 'block';
    }
}

// Guardar cierre
async function guardarCierre(e) {
    e.preventDefault();
    
    if (!semanaActual || !semanaActual.id) {
        mostrarNotificacion('No hay una semana seleccionada', 'error');
        return;
    }
    
    const id = document.getElementById('cierre-id').value;
    const dia = document.getElementById('cierre-dia').value || document.getElementById('dia').value;
    const numero_caja = parseInt(document.getElementById('cierre-numero').value) || 1;
    const total_efectivo = parseFloat(document.getElementById('total_efectivo').value);
    const base = parseFloat(document.getElementById('base').value);
    const ventas = parseFloat(document.getElementById('ventas').value);
    const talonarios = parseFloat(document.getElementById('talonarios').value);
    const otro = parseFloat(document.getElementById('otro').value) || 0;
    const llevar = parseFloat(document.getElementById('llevar').value) || 0;
    const observaciones = document.getElementById('observaciones').value.trim();
    const semana_id = semanaActual.id;
    
    // Validaciones
    if (!total_efectivo || total_efectivo < 0) {
        mostrarNotificacion('El total efectivo es requerido y debe ser positivo', 'error');
        return;
    }
    
    if (!base || base < 0) {
        mostrarNotificacion('La base es requerida y debe ser positiva', 'error');
        return;
    }
    
    if (!ventas || ventas < 0) {
        mostrarNotificacion('Las ventas son requeridas y deben ser positivas', 'error');
        return;
    }
    
    if (!talonarios || talonarios < 0) {
        mostrarNotificacion('Los talonarios son requeridos y deben ser positivos', 'error');
        return;
    }
    
    const cierreData = {
        dia: dia.charAt(0).toUpperCase() + dia.slice(1).toLowerCase(),
        numero_caja,
        total_efectivo,
        base,
        ventas,
        talonarios,
        otro,
        llevar,
        observaciones,
        semana_id
    };
    
    try {
        let response;
        let url = `${API_URL}/api/cierres`;
        let method = 'POST';
        
        if (id) {
            // Editar cierre existente
            url = `${API_URL}/api/cierres/${id}`;
            method = 'PUT';
        }
        
        response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(cierreData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al guardar el cierre');
        }
        
        const nuevoCierre = await response.json();
        
        // Actualizar datos locales
        if (id) {
            const index = cierresDB.findIndex(c => c.id === parseInt(id));
            if (index !== -1) {
                cierresDB[index] = nuevoCierre;
            }
        } else {
            cierresDB.push(nuevoCierre);
        }
        
        cerrarModalCierre();
        actualizarInterfazCierres();
        actualizarResumenCierres();
        mostrarNotificacion(
            id ? 'Cierre actualizado correctamente' : 'Cierre agregado correctamente', 
            'success'
        );
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion(error.message || 'Error al guardar el cierre', 'error');
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
                await cargarCierres();
            }
        });
    }
    
    if (btnActualizar) {
        btnActualizar.addEventListener('click', cargarCierres);
    }
    
    if (btnNuevoCierre) {
        btnNuevoCierre.addEventListener('click', () => abrirModalCierre('sabado'));
    }
    
    // Eventos para el modal
    const closeModal = document.querySelector('.close');
    const btnCancelar = document.querySelector('.btn-cancelar');
    
    if (closeModal) {
        closeModal.addEventListener('click', cerrarModalCierre);
    }
    
    if (btnCancelar) {
        btnCancelar.addEventListener('click', cerrarModalCierre);
    }
    
    if (formCierre) {
        formCierre.addEventListener('submit', guardarCierre);
    }
    
    // Event listeners para calcular diferencia en tiempo real
    const camposCalculo = ['total_efectivo', 'base', 'llevar', 'ventas', 'talonarios', 'otro'];
    camposCalculo.forEach(campo => {
        const elem = document.getElementById(campo);
        if (elem) {
            elem.addEventListener('input', calcularYMostrarDiferencia);
        }
    });
    
    // Evento para cambiar número de caja
    const diaSelect = document.getElementById('dia');
    if (diaSelect) {
        diaSelect.addEventListener('change', function() {
            const numeroCajaContainer = document.getElementById('numero-caja-container');
            if (this.value === 'sabado' || this.value === 'lunes') {
                numeroCajaContainer.style.display = 'none';
                document.getElementById('cierre-dia').value = this.value;
            } else {
                numeroCajaContainer.style.display = 'block';
            }
        });
    }
    
    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', function(e) {
        if (e.target === modalCierre) {
            cerrarModalCierre();
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