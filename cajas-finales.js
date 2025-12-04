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
        console.error('No hay semana seleccionada para cargar cierres');
        mostrarError('No hay una semana seleccionada');
        return;
    }
    
    console.log(`Cargando cierres para semana ID: ${semanaActual.id}`);
    
    mostrarCarga(true);
    
    try {
        const url = `${API_URL}/api/cierres/semana/${semanaActual.id}`;
        console.log(`Fetching: ${url}`);
        
        const response = await fetch(url);
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error al cargar cierres:', errorText);
            throw new Error('Error al cargar cierres de caja');
        }
        
        cierresDB = await response.json();
        console.log(`Cierres cargados: ${cierresDB.length} cierres`, cierresDB);
        
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

// Calcular total de conceptos (sin préstamos)
function calcularTotalConceptos(cierre) {
    if (!cierre) return 0;
    
    return (parseFloat(cierre.base || 0) +
           parseFloat(cierre.llevar || 0) +
           parseFloat(cierre.ventas || 0) +
           parseFloat(cierre.talonarios || 0) +
           parseFloat(cierre.otro || 0));
}

// Calcular diferencia para un cierre
function calcularDiferencia(cierre) {
    if (!cierre) return 0;
    
    const totalEfectivo = parseFloat(cierre.total_efectivo || 0);
    const totalConceptos = calcularTotalConceptos(cierre);
    const totalPrestamos = parseFloat(cierre.prestamos_total || 0);
    
    // Fórmula: (Total Efectivo + Total Préstamos) - Total Conceptos
    return (totalEfectivo + totalPrestamos) - totalConceptos;
}

// Actualizar interfaz de un cierre específico
function actualizarCierreUI(dia, numeroCaja = 1) {
    const cierre = obtenerCierre(dia, numeroCaja);
    
    // Crear el ID suffix según cómo están en el HTML
    let idSuffix;
    if (dia === 'sabado' || dia === 'lunes') {
        idSuffix = `-${dia}`;
    } else {
        idSuffix = `-${dia}-${numeroCaja}`;
    }
    
    console.log(`Actualizando cierre: ${dia}, caja: ${numeroCaja}, ID suffix: ${idSuffix}`);
    
    if (cierre) {
        // Calcular totales
        const totalConceptos = calcularTotalConceptos(cierre);
        const diferencia = calcularDiferencia(cierre);
        const totalPrestamos = parseFloat(cierre.prestamos_total || 0);
        
        console.log(`Cierre encontrado:`, cierre);
        console.log(`- Total efectivo: ${cierre.total_efectivo}`);
        console.log(`- Prestamos:`, cierre.prestamos);
        
        // Actualizar valores principales
        const elementos = {
            totalEfectivo: document.getElementById(`total-efectivo${idSuffix}`),
            base: document.getElementById(`base${idSuffix}`),
            llevar: document.getElementById(`llevar${idSuffix}`),
            ventas: document.getElementById(`ventas${idSuffix}`),
            talonarios: document.getElementById(`talonarios${idSuffix}`),
            otro: document.getElementById(`otro${idSuffix}`),
            totalDetalle: document.getElementById(`total${idSuffix}-detalle`),
            diferencia: document.getElementById(`diferencia${idSuffix}`),
            totalPrestamos: document.getElementById(`total-prestamos${idSuffix}`)
        };
        
        // Actualizar valores si los elementos existen
        if (elementos.totalEfectivo) elementos.totalEfectivo.textContent = formatMoney(cierre.total_efectivo || 0);
        if (elementos.base) elementos.base.textContent = formatMoney(cierre.base || 0);
        if (elementos.llevar) elementos.llevar.textContent = formatMoney(cierre.llevar || 0);
        if (elementos.ventas) elementos.ventas.textContent = formatMoney(cierre.ventas || 0);
        if (elementos.talonarios) elementos.talonarios.textContent = formatMoney(cierre.talonarios || 0);
        if (elementos.otro) elementos.otro.textContent = formatMoney(cierre.otro || 0);
        
        if (elementos.totalDetalle) elementos.totalDetalle.textContent = formatMoney(totalConceptos);
        if (elementos.diferencia) elementos.diferencia.textContent = formatMoney(diferencia);
        if (elementos.totalPrestamos) elementos.totalPrestamos.textContent = formatMoney(totalPrestamos);
        
        // Actualizar lista de préstamos
        const prestamosBodyId = `prestamos-body${idSuffix}`;
        const prestamosBody = document.getElementById(prestamosBodyId);
        
        if (prestamosBody) {
            // Asegurarse de que prestamos sea un array
            let prestamosArray = [];
            if (Array.isArray(cierre.prestamos)) {
                prestamosArray = cierre.prestamos;
            } else if (typeof cierre.prestamos === 'string') {
                // Si es un string JSON, parsearlo
                try {
                    prestamosArray = JSON.parse(cierre.prestamos);
                } catch (e) {
                    console.error('Error parseando préstamos:', e);
                    prestamosArray = [];
                }
            }
            
            console.log(`Préstamos procesados para ${dia}:`, prestamosArray);
            
            if (prestamosArray && prestamosArray.length > 0) {
                let html = '';
                prestamosArray.forEach((prestamo, index) => {
                    html += `
                        <tr>
                            <td>${prestamo.concepto || `Préstamo ${index + 1}`}</td>
                            <td class="valor">${formatMoney(prestamo.monto || 0)}</td>
                        </tr>
                    `;
                });
                prestamosBody.innerHTML = html;
            } else {
                prestamosBody.innerHTML = `
                    <tr>
                        <td colspan="2" class="sin-prestamos">No hay préstamos</td>
                    </tr>
                `;
            }
        }
    } else {
        console.log(`No se encontró cierre para ${dia} caja ${numeroCaja}`);
        
        // Si no hay cierre, mostrar ceros
        const elementos = {
            totalEfectivo: document.getElementById(`total-efectivo${idSuffix}`),
            base: document.getElementById(`base${idSuffix}`),
            llevar: document.getElementById(`llevar${idSuffix}`),
            ventas: document.getElementById(`ventas${idSuffix}`),
            talonarios: document.getElementById(`talonarios${idSuffix}`),
            otro: document.getElementById(`otro${idSuffix}`),
            totalDetalle: document.getElementById(`total${idSuffix}-detalle`),
            diferencia: document.getElementById(`diferencia${idSuffix}`),
            totalPrestamos: document.getElementById(`total-prestamos${idSuffix}`)
        };
        
        for (const [nombre, elemento] of Object.entries(elementos)) {
            if (elemento) {
                elemento.textContent = formatMoney(0);
            }
        }
        
        const prestamosBodyId = `prestamos-body${idSuffix}`;
        const prestamosBody = document.getElementById(prestamosBodyId);
        if (prestamosBody) {
            prestamosBody.innerHTML = `
                <tr>
                    <td colspan="2" class="sin-prestamos">No hay préstamos</td>
                </tr>
            `;
        }
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
        efectivoSabado: 0,
        efectivoDomingo: 0,
        efectivoLunes: 0,
        diferenciaSabado: 0,
        diferenciaDomingo: 0,
        diferenciaLunes: 0,
        efectivoTotal: 0,
        diferenciaTotal: 0
    };
    
    // Sábado
    const cierreSabado = obtenerCierre('sabado');
    if (cierreSabado) {
        totales.efectivoSabado = parseFloat(cierreSabado.total_efectivo || 0);
        totales.diferenciaSabado = calcularDiferencia(cierreSabado);
        totales.efectivoTotal += totales.efectivoSabado;
        totales.diferenciaTotal += totales.diferenciaSabado;
    }
    
    // Domingo (sumar ambas cajas)
    const cierreDomingo1 = obtenerCierre('domingo', 1);
    const cierreDomingo2 = obtenerCierre('domingo', 2);
    
    if (cierreDomingo1) {
        totales.efectivoDomingo += parseFloat(cierreDomingo1.total_efectivo || 0);
        totales.diferenciaDomingo += calcularDiferencia(cierreDomingo1);
    }
    if (cierreDomingo2) {
        totales.efectivoDomingo += parseFloat(cierreDomingo2.total_efectivo || 0);
        totales.diferenciaDomingo += calcularDiferencia(cierreDomingo2);
    }
    totales.efectivoTotal += totales.efectivoDomingo;
    totales.diferenciaTotal += totales.diferenciaDomingo;
    
    // Lunes festivo
    const cierreLunes = obtenerCierre('lunes');
    if (cierreLunes) {
        totales.efectivoLunes = parseFloat(cierreLunes.total_efectivo || 0);
        totales.diferenciaLunes = calcularDiferencia(cierreLunes);
        totales.efectivoTotal += totales.efectivoLunes;
        totales.diferenciaTotal += totales.diferenciaLunes;
    }
    
    return totales;
}

// Actualizar resumen de cierres
function actualizarResumenCierres() {
    const totalesPorDia = calcularTotalesPorDia();
    
    // Actualizar resumen por día
    const efectivoSabadoElem = document.getElementById('efectivo-sabado');
    const efectivoDomingoElem = document.getElementById('efectivo-domingo');
    const efectivoLunesElem = document.getElementById('efectivo-lunes');
    const efectivoTotalElem = document.getElementById('efectivo-total');
    const diferenciaTotalElem = document.getElementById('diferencia-total');
    
    if (efectivoSabadoElem) efectivoSabadoElem.textContent = formatMoney(totalesPorDia.efectivoSabado);
    if (efectivoDomingoElem) efectivoDomingoElem.textContent = formatMoney(totalesPorDia.efectivoDomingo);
    if (efectivoLunesElem) efectivoLunesElem.textContent = formatMoney(totalesPorDia.efectivoLunes);
    if (efectivoTotalElem) efectivoTotalElem.textContent = formatMoney(totalesPorDia.efectivoTotal);
    if (diferenciaTotalElem) diferenciaTotalElem.textContent = formatMoney(totalesPorDia.diferenciaTotal);
}

// Modal functions
function abrirModalCierre(dia, numeroCaja = 1) {
    const titulo = document.getElementById('modal-cierre-titulo');
    const cierre = obtenerCierre(dia, numeroCaja);
    
    // Configurar título
    const diaNombre = dia.charAt(0).toUpperCase() + dia.slice(1);
    const tituloCaja = numeroCaja > 1 ? ` - Caja ${numeroCaja}` : '';
    titulo.textContent = cierre ? `Editar Cierre ${diaNombre}${tituloCaja}` : `Nuevo Cierre ${diaNombre}${tituloCaja}`;
    
    // Configurar campos ocultos
    document.getElementById('cierre-id').value = cierre ? cierre.id : '';
    document.getElementById('cierre-dia').value = dia;
    document.getElementById('cierre-numero').value = numeroCaja;
    
    // Configurar día y número de caja
    document.getElementById('dia').value = dia;
    document.getElementById('numero-caja').value = numeroCaja.toString();
    
    // Si es sábado o lunes, ocultar número de caja
    const numeroCajaContainer = document.getElementById('numero-caja-container');
    if (dia === 'sabado' || dia === 'lunes') {
        numeroCajaContainer.style.display = 'none';
    } else {
        numeroCajaContainer.style.display = 'block';
    }
    
    // Limpiar préstamos previos
    const prestamosContainer = document.getElementById('prestamos-container');
    prestamosContainer.innerHTML = '';
    
    // Si es edición, cargar datos
    if (cierre) {
        document.getElementById('total_efectivo').value = cierre.total_efectivo || '';
        document.getElementById('base').value = cierre.base || '';
        document.getElementById('ventas').value = cierre.ventas || '';
        document.getElementById('talonarios').value = cierre.talonarios || '';
        document.getElementById('llevar').value = cierre.llevar || 0;
        document.getElementById('otro').value = cierre.otro || 0;
        
        // Cargar préstamos
        if (cierre.prestamos && cierre.prestamos.length > 0) {
            cierre.prestamos.forEach((prestamo, index) => {
                agregarPrestamo(prestamo.concepto, prestamo.monto);
            });
        } else {
            // Agregar un préstamo vacío por defecto
            agregarPrestamo();
        }
    } else {
        // Nuevo cierre - resetear formulario
        document.getElementById('total_efectivo').value = '';
        document.getElementById('base').value = '';
        document.getElementById('ventas').value = '';
        document.getElementById('talonarios').value = '';
        document.getElementById('llevar').value = 0;
        document.getElementById('otro').value = 0;
        
        // Agregar un préstamo vacío por defecto
        agregarPrestamo();
    }
    
    // Calcular y mostrar resumen
    calcularYMostrarResumen();
    
    // Mostrar modal
    modalCierre.style.display = 'block';
    
    // Enfocar el primer campo
    setTimeout(() => {
        document.getElementById('total_efectivo').focus();
    }, 100);
    
    // Scroll al inicio del modal
    modalCierre.scrollTop = 0;
}

function cerrarModalCierre() {
    modalCierre.style.display = 'none';
    formCierre.reset();
}

// Agregar campo de préstamo
function agregarPrestamo(concepto = '', monto = '') {
    const prestamosContainer = document.getElementById('prestamos-container');
    const prestamoId = Date.now();
    
    const prestamoHTML = `
        <div class="prestamo-item" id="prestamo-${prestamoId}">
            <div class="form-row">
                <div class="form-group">
                    <label>Concepto del préstamo:</label>
                    <input type="text" class="prestamo-concepto" placeholder="Ej: Salsamentaria" value="${concepto}">
                </div>
                <div class="form-group">
                    <label>Monto del préstamo:</label>
                    <input type="number" class="prestamo-monto" step="0.01" min="0" placeholder="Ej: 101400" value="${monto}">
                </div>
            </div>
            <button type="button" class="btn-eliminar-prestamo" onclick="eliminarPrestamo(${prestamoId})">
                <i class="fas fa-trash"></i> Eliminar préstamo
            </button>
        </div>
    `;
    
    prestamosContainer.insertAdjacentHTML('beforeend', prestamoHTML);
    
    // Agregar event listeners para cálculo en tiempo real
    const nuevoPrestamo = document.getElementById(`prestamo-${prestamoId}`);
    nuevoPrestamo.querySelector('.prestamo-concepto').addEventListener('input', calcularYMostrarResumen);
    nuevoPrestamo.querySelector('.prestamo-monto').addEventListener('input', calcularYMostrarResumen);
}

// Eliminar campo de préstamo
function eliminarPrestamo(id) {
    const prestamoElement = document.getElementById(`prestamo-${id}`);
    if (prestamoElement) {
        prestamoElement.remove();
        calcularYMostrarResumen();
    }
}

// Calcular y mostrar resumen en tiempo real
function calcularYMostrarResumen() {
    // Obtener valores de conceptos
    const base = parseFloat(document.getElementById('base').value) || 0;
    const llevar = parseFloat(document.getElementById('llevar').value) || 0;
    const ventas = parseFloat(document.getElementById('ventas').value) || 0;
    const talonarios = parseFloat(document.getElementById('talonarios').value) || 0;
    const otro = parseFloat(document.getElementById('otro').value) || 0;
    
    // Obtener total efectivo
    const totalEfectivo = parseFloat(document.getElementById('total_efectivo').value) || 0;
    
    // Calcular total de préstamos
    let totalPrestamos = 0;
    const prestamoMontos = document.querySelectorAll('.prestamo-monto');
    prestamoMontos.forEach(input => {
        totalPrestamos += parseFloat(input.value) || 0;
    });
    
    // Calcular totales
    const totalConceptos = base + llevar + ventas + talonarios + otro;
    const diferencia = (totalEfectivo + totalPrestamos) - totalConceptos;
    
    // Actualizar display
    document.getElementById('total-conceptos-calculado').textContent = formatMoney(totalConceptos);
    document.getElementById('total-prestamos-calculado').textContent = formatMoney(totalPrestamos);
    document.getElementById('diferencia-calculada').textContent = formatMoney(diferencia);
    
    // Cambiar color de diferencia según resultado
    const diferenciaElem = document.getElementById('diferencia-calculada');
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
    
    console.log('=== INICIANDO GUARDAR CIERRE ===');
    
    if (!semanaActual || !semanaActual.id) {
        console.error('No hay semana seleccionada:', semanaActual);
        mostrarNotificacion('No hay una semana seleccionada', 'error');
        return;
    }
    
    const id = document.getElementById('cierre-id').value;
    const dia = document.getElementById('cierre-dia').value || document.getElementById('dia').value;
    const numero_caja = parseInt(document.getElementById('cierre-numero').value) || 1;
    const total_efectivo = parseFloat(document.getElementById('total_efectivo').value);
    const base = parseFloat(document.getElementById('base').value);
    const ventas = parseFloat(document.getElementById('ventas').value) || 0; // Ahora es opcional
    const talonarios = parseFloat(document.getElementById('talonarios').value);
    const llevar = parseFloat(document.getElementById('llevar').value) || 0;
    const otro = parseFloat(document.getElementById('otro').value) || 0;
    const semana_id = semanaActual.id;
    
    console.log('Datos del formulario:');
    console.log('- ID:', id);
    console.log('- Día:', dia);
    console.log('- Número caja:', numero_caja);
    console.log('- Total efectivo:', total_efectivo);
    console.log('- Base:', base);
    console.log('- Ventas:', ventas);
    console.log('- Talonarios:', talonarios);
    console.log('- Llevar:', llevar);
    console.log('- Otro:', otro);
    console.log('- Semana ID:', semana_id);
    
    // Obtener préstamos
    const prestamos = [];
    const prestamoItems = document.querySelectorAll('.prestamo-item');
    console.log(`- Número de préstamos: ${prestamoItems.length}`);
    
    prestamoItems.forEach((item, index) => {
        const concepto = item.querySelector('.prestamo-concepto').value.trim();
        const montoInput = item.querySelector('.prestamo-monto');
        const monto = montoInput ? parseFloat(montoInput.value) || 0 : 0;
        
        console.log(`  Préstamo ${index + 1}: concepto="${concepto}", monto=${monto}`);
        
        // Solo agregar si tiene concepto o monto
        if (concepto || monto > 0) {
            prestamos.push({
                concepto: concepto || `Préstamo ${index + 1}`,
                monto: monto
            });
        }
    });
    
    // Calcular total de préstamos
    const prestamos_total = prestamos.reduce((total, prestamo) => total + (prestamo.monto || 0), 0);
    console.log('- Total préstamos:', prestamos_total);
    
    // Calcular diferencia
    const totalConceptos = base + llevar + ventas + talonarios + otro;
    const diferencia = (total_efectivo + prestamos_total) - totalConceptos;
    console.log('- Total conceptos:', totalConceptos);
    console.log('- Diferencia:', diferencia);
    
    // Validaciones de campos requeridos
    if (isNaN(total_efectivo) || total_efectivo < 0) {
        mostrarNotificacion('El total efectivo es requerido y debe ser un número positivo', 'error');
        return;
    }
    
    if (isNaN(base) || base < 0) {
        mostrarNotificacion('La base es requerida y debe ser un número positivo', 'error');
        return;
    }
    
    if (isNaN(talonarios) || talonarios < 0) {
        mostrarNotificacion('Los talonarios son requeridos y deben ser un número positivo', 'error');
        return;
    }
    
    // Validar que ventas no sea negativa (si se ingresa)
    if (isNaN(ventas) || ventas < 0) {
        mostrarNotificacion('Las ventas deben ser un número positivo (o dejarlas en 0)', 'error');
        return;
    }
    
    // Validar que número_caja sea 1 o 2
    if (numero_caja !== 1 && numero_caja !== 2) {
        mostrarNotificacion('El número de caja debe ser 1 o 2', 'error');
        return;
    }
    
    // Preparar datos para enviar
    const cierreData = {
        dia: dia.charAt(0).toUpperCase() + dia.slice(1).toLowerCase(),
        numero_caja: numero_caja,
        total_efectivo: total_efectivo,
        base: base,
        ventas: ventas || 0,  // Asegurar que si está vacío sea 0
        talonarios: talonarios,
        llevar: llevar || 0,
        otro: otro || 0,
        diferencia: diferencia,
        semana_id: semana_id,
        prestamos: prestamos.length > 0 ? prestamos : [],
        prestamos_total: prestamos_total
    };
    
    console.log('Datos a enviar a la API:', JSON.stringify(cierreData, null, 2));
    
    try {
        let response;
        let url = `${API_URL}/api/cierres`;
        let method = 'POST';
        
        if (id) {
            // Editar cierre existente
            url = `${API_URL}/api/cierres/${id}`;
            method = 'PUT';
            console.log(`Editando cierre existente con ID: ${id}`);
        } else {
            console.log('Creando nuevo cierre');
        }
        
        console.log(`Enviando ${method} request a: ${url}`);
        
        response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(cierreData)
        });
        
        console.log('Respuesta recibida, status:', response.status);
        
        if (!response.ok) {
            let errorMessage = 'Error al guardar el cierre';
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
                console.error('Error detallado:', errorData);
            } catch (jsonError) {
                const errorText = await response.text();
                console.error('Error text:', errorText);
                errorMessage = errorText || errorMessage;
            }
            throw new Error(errorMessage);
        }
        
        const nuevoCierre = await response.json();
        console.log('Cierre guardado exitosamente:', nuevoCierre);
        
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
        console.error('Error al guardar:', error);
        
        // Mensajes de error más específicos
        let mensajeError = error.message;
        if (error.message.includes('Failed to fetch')) {
            mensajeError = 'Error de conexión con el servidor. Verifica tu internet.';
        } else if (error.message.includes('JSON')) {
            mensajeError = 'Error en el formato de datos. Contacta al administrador.';
        }
        
        mostrarNotificacion(mensajeError || 'Error al guardar el cierre', 'error');
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
    
    // Event listeners para calcular en tiempo real
    const camposCalculo = [
        'total_efectivo', 'base', 'llevar', 'ventas', 'talonarios', 'otro'
    ];
    
    camposCalculo.forEach(campo => {
        const elem = document.getElementById(campo);
        if (elem) {
            elem.addEventListener('input', calcularYMostrarResumen);
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