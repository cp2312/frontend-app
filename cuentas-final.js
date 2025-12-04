// Configuración
const API_URL = 'https://backend-express-production-a427.up.railway.app';
let semanaActual = null;

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
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
            cargarDatos();
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
    
    document.title = `Resumen - ${semanaActual.nombre} ${semanaActual.mes}`;
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

// Formatear moneda en pesos colombianos
function formatMoneda(valor) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(valor);
}

// Cargar todos los datos
async function cargarDatos() {
    if (!semanaActual || !semanaActual.id) {
        console.error('No hay semana seleccionada');
        return;
    }
    
    try {
        // Cargar datos en paralelo
        const [productos, cierres, otrosGastos, prestamos] = await Promise.all([
            fetch(`${API_URL}/api/productos/semana/${semanaActual.id}`).then(r => r.json()),
            fetch(`${API_URL}/api/cierres/semana/${semanaActual.id}`).then(r => r.json()),
            fetch(`${API_URL}/api/otros/semana/${semanaActual.id}`).then(r => r.json()),
            fetch(`${API_URL}/api/prestamos/semana/${semanaActual.id}`).then(r => r.json())
        ]);
        
        // Separar productos estáticos y gastos en productos
        const PRODUCTOS_ESTATICOS = ['Costilla', 'Asadura', 'Creadillas', 'Patas', 'Cabezas', 'Menudos', 'Manteca', 'Sangre', 'Guia'];
        
        const productosReales = productos.filter(p => 
            PRODUCTOS_ESTATICOS.some(pe => pe.toLowerCase() === p.nombre.toLowerCase()) && p.libras > 0
        );
        
        const gastosEnProductos = productos.filter(p => 
            !PRODUCTOS_ESTATICOS.some(pe => pe.toLowerCase() === p.nombre.toLowerCase()) || p.libras === 0
        );
        
        // Calcular total de productos (suma de total, no total_final)
        const totalProductosIndividual = productosReales.reduce((sum, p) => {
            const total = parseFloat(p.precio_unitario || 0) * parseFloat(p.libras || 0);
            return sum + total;
        }, 0);
        
        // Calcular total de gastos en productos (precio_unitario cuando libras = 0)
        const totalGastosEnProductos = gastosEnProductos.reduce((sum, p) => {
            return sum + parseFloat(p.precio_unitario || 0);
        }, 0);
        
        // Total Final de Productos = Total Productos - Gastos en Productos
        const totalFinalProductos = totalProductosIndividual - totalGastosEnProductos;
        
        // Calcular efectivo total de cierres
        const totalEfectivo = cierres.reduce((sum, c) => sum + parseFloat(c.total_efectivo || 0), 0);
        
        // Calcular otros gastos
        const totalOtrosGastos = otrosGastos.reduce((sum, g) => sum + parseFloat(g.monto || 0), 0);
        
        // Calcular préstamos y gastos personales
        const totalPrestamosPersonales = prestamos
            .filter(p => p.tipo === 'Prestamo')
            .reduce((sum, p) => sum + parseFloat(p.monto || 0), 0);
        
        const totalGastosPersonales = prestamos
            .filter(p => p.tipo === 'Gasto')
            .reduce((sum, p) => sum + parseFloat(p.monto || 0), 0);
        
        // Total Final de Préstamos = Préstamos - Gastos
        const totalFinalPrestamos = totalPrestamosPersonales - totalGastosPersonales;
        
        // Efectivo sin ajustes inicialmente
        let efectivoAjustado = totalEfectivo;
        
        // Si el total final de préstamos es POSITIVO, se resta del efectivo
        // Si es NEGATIVO, solo se muestra en la tabla (deuda pendiente)
        if (totalFinalPrestamos > 0) {
            efectivoAjustado -= totalFinalPrestamos;
        }
        
        // Actualizar tarjetas de estadísticas
        document.getElementById('totalProductos').textContent = formatMoneda(totalFinalProductos);
        document.getElementById('totalEfectivo').textContent = formatMoneda(efectivoAjustado);
        document.getElementById('totalOtrosGastos').textContent = formatMoneda(totalOtrosGastos);
        document.getElementById('totalPrestamos').textContent = formatMoneda(totalFinalPrestamos);
        
        // Calcular balance final
        let balanceFinal = efectivoAjustado - totalFinalProductos - totalOtrosGastos;
        
        const balanceElement = document.getElementById('balanceFinal');
        balanceElement.textContent = formatMoneda(balanceFinal);
        
        // Mostrar tabla de desglose
        mostrarTablaDesglose(efectivoAjustado, totalFinalProductos, totalOtrosGastos, totalFinalPrestamos);
        
        // Mostrar tabla por persona (préstamos)
        mostrarTablaPorPersona(prestamos);
        
    } catch (error) {
        console.error('Error cargando datos:', error);
        mostrarError('Error al cargar los datos');
    }
}

// Mostrar tabla de desglose con resta acumulada
function mostrarTablaDesglose(efectivo, totalFinalProductos, otrosGastos, totalFinalPrestamos) {
    const tbody = document.querySelector('#tablaDesglose tbody');
    tbody.innerHTML = '';
    
    let saldoAcumulado = efectivo;
    
    // Fila 1: Efectivo inicial (entrada)
    const row1 = document.createElement('tr');
    row1.innerHTML = `
        <td><strong>💰 Efectivo Total (Cierres de Caja)</strong></td>
        <td class="monto-positivo">${formatMoneda(efectivo)}</td>
        <td><span class="saldo-positivo">${formatMoneda(saldoAcumulado)}</span></td>
    `;
    tbody.appendChild(row1);
    
    // Fila 2: Restar total final de productos
    saldoAcumulado -= totalFinalProductos;
    const row2 = document.createElement('tr');
    row2.innerHTML = `
        <td>📦 Total Final Productos (Productos - Gastos)</td>
        <td class="monto-negativo">-${formatMoneda(totalFinalProductos)}</td>
        <td><span class="${saldoAcumulado >= 0 ? 'saldo-positivo' : 'saldo-negativo'}">${formatMoneda(saldoAcumulado)}</span></td>
    `;
    tbody.appendChild(row2);
    
    // Fila 3: Restar otros gastos
    saldoAcumulado -= otrosGastos;
    const row3 = document.createElement('tr');
    row3.innerHTML = `
        <td>🧾 Otros Gastos</td>
        <td class="monto-negativo">-${formatMoneda(otrosGastos)}</td>
        <td><span class="${saldoAcumulado >= 0 ? 'saldo-positivo' : 'saldo-negativo'}">${formatMoneda(saldoAcumulado)}</span></td>
    `;
    tbody.appendChild(row3);
    
    // Fila 4: Préstamos (solo si hay positivos se restan)
    if (totalFinalPrestamos > 0) {
        // Si es positivo, se resta del efectivo
        saldoAcumulado -= totalFinalPrestamos;
        const row4 = document.createElement('tr');
        row4.innerHTML = `
            <td>👥 Total Final Préstamos Positivos (se resta)</td>
            <td class="monto-negativo">-${formatMoneda(totalFinalPrestamos)}</td>
            <td><span class="${saldoAcumulado >= 0 ? 'saldo-positivo' : 'saldo-negativo'}">${formatMoneda(saldoAcumulado)}</span></td>
        `;
        tbody.appendChild(row4);
    } else if (totalFinalPrestamos < 0) {
        // Si es negativo, solo mostrar mensaje de deuda (NO afecta el saldo)
        const rowInfo = document.createElement('tr');
        rowInfo.innerHTML = `
            <td>👥 Préstamos Negativos (deuda pendiente)</td>
            <td colspan="2" style="color: #dc2626; font-weight: 700; text-align: center;">
                ⚠️ Hay personas que deben ${formatMoneda(Math.abs(totalFinalPrestamos))} - Ver tabla de detalle abajo
            </td>
        `;
        tbody.appendChild(rowInfo);
    }
    
    // Fila final: Balance
    const rowFinal = document.createElement('tr');
    rowFinal.innerHTML = `
        <td><strong>💵 BALANCE FINAL</strong></td>
        <td></td>
        <td><span class="${saldoAcumulado >= 0 ? 'saldo-positivo' : 'saldo-negativo'}">${formatMoneda(saldoAcumulado)}</span></td>
    `;
    tbody.appendChild(rowFinal);
}

// Mostrar tabla por persona (préstamos - TODOS los tipos)
function mostrarTablaPorPersona(prestamos) {
    const tbody = document.querySelector('#tablaPorPersona tbody');
    const sinPersonas = document.getElementById('sinPersonas');
    
    if (prestamos.length === 0) {
        tbody.innerHTML = '';
        sinPersonas.style.display = 'block';
        return;
    }
    
    sinPersonas.style.display = 'none';
    tbody.innerHTML = '';
    
    // Agrupar por persona y calcular total final (Préstamos - Gastos)
    const porPersona = {};
    
    prestamos.forEach(prestamo => {
        const persona = prestamo.persona || 'Sin Asignar';
        if (!porPersona[persona]) {
            porPersona[persona] = {
                prestamos: 0,
                gastos: 0,
                totalFinal: 0
            };
        }
        
        const monto = parseFloat(prestamo.monto || 0);
        if (prestamo.tipo === 'Prestamo') {
            porPersona[persona].prestamos += monto;
        } else if (prestamo.tipo === 'Gasto') {
            porPersona[persona].gastos += monto;
        }
        
        porPersona[persona].totalFinal = porPersona[persona].prestamos - porPersona[persona].gastos;
    });
    
    // Ordenar por total final descendente
    const personasOrdenadas = Object.entries(porPersona)
        .sort((a, b) => b[1].totalFinal - a[1].totalFinal);
    
    // Crear filas
    personasOrdenadas.forEach(([persona, datos]) => {
        const row = document.createElement('tr');
        
        if (datos.totalFinal >= 0) {
            // Total positivo: Se resta del efectivo (se muestra normal)
            row.innerHTML = `
                <td><strong>${persona}</strong></td>
                <td><span class="saldo-positivo">${formatMoneda(datos.totalFinal)}</span></td>
            `;
        } else {
            // Total negativo: La persona debe dinero (mensaje especial)
            row.innerHTML = `
                <td><strong>${persona}</strong></td>
                <td style="color: #dc2626; font-weight: 700;">
                    ⚠️ DEBE ${formatMoneda(Math.abs(datos.totalFinal))}
                </td>
            `;
        }
        
        tbody.appendChild(row);
    });
    
    // Fila de total
    const totalGeneralFinal = personasOrdenadas.reduce((sum, [_, datos]) => sum + datos.totalFinal, 0);
    const rowTotal = document.createElement('tr');
    const claseTotalColor = totalGeneralFinal >= 0 ? 'monto-positivo' : 'monto-negativo';
    const signoTotal = totalGeneralFinal >= 0 ? '' : '-';
    
    rowTotal.innerHTML = `
        <td><strong>TOTAL FINAL (Préstamos - Gastos)</strong></td>
        <td><strong class="${claseTotalColor}">${signoTotal}${formatMoneda(Math.abs(totalGeneralFinal))}</strong></td>
    `;
    tbody.appendChild(rowTotal);
}

// Volver al dashboard
function volverAlDashboard() {
    window.history.back();
}

// Mostrar error
function mostrarError(mensaje) {
    alert(mensaje);
}