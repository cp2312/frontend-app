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

// Formatear moneda
function formatMoneda(valor) {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'USD'
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
        
        // Calcular totales
        const totalProductos = productos.reduce((sum, p) => sum + parseFloat(p.total_final || 0), 0);
        const totalEfectivo = cierres.reduce((sum, c) => sum + parseFloat(c.total_efectivo || 0), 0);
        const totalOtrosGastos = otrosGastos.reduce((sum, g) => sum + parseFloat(g.monto || 0), 0);
        
        // Total de préstamos (TODOS: Prestamo + Gasto)
        const totalPrestamos = prestamos.reduce((sum, p) => sum + parseFloat(p.monto || 0), 0);
        
        // Actualizar tarjetas de estadísticas
        document.getElementById('totalProductos').textContent = formatMoneda(totalProductos);
        document.getElementById('totalEfectivo').textContent = formatMoneda(totalEfectivo);
        document.getElementById('totalOtrosGastos').textContent = formatMoneda(totalOtrosGastos);
        document.getElementById('totalPrestamos').textContent = formatMoneda(totalPrestamos);
        
        // Calcular balance final
        const balanceFinal = totalEfectivo - totalProductos - totalOtrosGastos - totalPrestamos;
        const balanceElement = document.getElementById('balanceFinal');
        balanceElement.textContent = formatMoneda(balanceFinal);
        
        // Mostrar tabla de desglose
        mostrarTablaDesglose(totalEfectivo, totalProductos, totalOtrosGastos, totalPrestamos);
        
        // Mostrar tabla por persona (préstamos)
        mostrarTablaPorPersona(prestamos);
        
    } catch (error) {
        console.error('Error cargando datos:', error);
        mostrarError('Error al cargar los datos');
    }
}

// Mostrar tabla de desglose con resta acumulada
function mostrarTablaDesglose(efectivo, productos, otrosGastos, prestamos) {
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
    
    // Fila 2: Restar productos
    saldoAcumulado -= productos;
    const row2 = document.createElement('tr');
    row2.innerHTML = `
        <td>📦 Total Productos (gasto)</td>
        <td class="monto-negativo">-${formatMoneda(productos)}</td>
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
    
    // Fila 4: Restar préstamos/gastos personales
    saldoAcumulado -= prestamos;
    const row4 = document.createElement('tr');
    row4.innerHTML = `
        <td>👥 Préstamos/Gastos Personales</td>
        <td class="monto-negativo">-${formatMoneda(prestamos)}</td>
        <td><span class="${saldoAcumulado >= 0 ? 'saldo-positivo' : 'saldo-negativo'}">${formatMoneda(saldoAcumulado)}</span></td>
    `;
    tbody.appendChild(row4);
    
    // Fila final: Balance
    const rowFinal = document.createElement('tr');
    rowFinal.innerHTML = `
        <td><strong>💵 BALANCE FINAL</strong></td>
        <td></td>
        <td><span class="${saldoAcumulado >= 0 ? 'saldo-positivo' : 'saldo-negativo'}">${formatMoneda(saldoAcumulado)}</span></td>
    `;
    tbody.appendChild(rowFinal);
}

// Mostrar tabla por persona (préstamos/gastos)
function mostrarTablaPorPersona(prestamos) {
    const tbody = document.querySelector('#tablaPorPersona tbody');
    const sinPersonas = document.getElementById('sinPersonas');
    
    // Filtrar solo los gastos
    const gastos = prestamos.filter(p => p.tipo === 'Gasto');
    
    if (gastos.length === 0) {
        tbody.innerHTML = '';
        sinPersonas.style.display = 'block';
        return;
    }
    
    sinPersonas.style.display = 'none';
    tbody.innerHTML = '';
    
    // Agrupar por persona
    const porPersona = {};
    gastos.forEach(gasto => {
        const persona = gasto.persona || 'Sin Asignar';
        if (!porPersona[persona]) {
            porPersona[persona] = 0;
        }
        porPersona[persona] += parseFloat(gasto.monto || 0);
    });
    
    // Ordenar por total descendente
    const personasOrdenadas = Object.entries(porPersona)
        .sort((a, b) => b[1] - a[1]);
    
    // Crear filas
    personasOrdenadas.forEach(([persona, total]) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${persona}</strong></td>
            <td><span class="saldo-negativo">-${formatMoneda(total)}</span></td>
        `;
        tbody.appendChild(row);
    });
    
    // Fila de total
    const totalGeneral = personasOrdenadas.reduce((sum, [_, total]) => sum + total, 0);
    const rowTotal = document.createElement('tr');
    rowTotal.innerHTML = `
        <td><strong>TOTAL GENERAL (GASTOS)</strong></td>
        <td><strong class="monto-negativo">-${formatMoneda(totalGeneral)}</strong></td>
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