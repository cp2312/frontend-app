// Configuración
const API_URL = 'https://backend-express-production-a427.up.railway.app';

// Formatear moneda en pesos colombianos
function formatMoneda(valor) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(valor);
}

// Formatear fecha
function formatFecha(fechaString) {
    const fecha = new Date(fechaString);
    return fecha.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Generar PDF completo
async function generarPDFCompleto(semanaId, semanaData) {
    try {
        // Mostrar loading
        const btn = document.querySelector('.btn-generar-pdf');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando PDF...';
            btn.disabled = true;
        }

        // Cargar todos los datos
        const [productos, cierres, otrosGastos, prestamos, semana] = await Promise.all([
            fetch(`${API_URL}/api/productos/semana/${semanaId}`).then(r => r.json()),
            fetch(`${API_URL}/api/cierres/semana/${semanaId}`).then(r => r.json()),
            fetch(`${API_URL}/api/otros/semana/${semanaId}`).then(r => r.json()),
            fetch(`${API_URL}/api/prestamos/semana/${semanaId}`).then(r => r.json()),
            semanaData || fetch(`${API_URL}/api/semanas/${semanaId}`).then(r => r.json())
        ]);

        // Crear documento PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        let yPos = 20;

        // ========== ENCABEZADO ==========
        doc.setFillColor(99, 102, 241);
        doc.rect(0, 0, 210, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('INFORME SEMANAL COMPLETO', 105, 20, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`${semana.nombre || 'Semana'} - ${semana.mes || ''}`, 105, 28, { align: 'center' });
        doc.text(formatFecha(semana.fecha), 105, 34, { align: 'center' });

        yPos = 50;
        doc.setTextColor(0, 0, 0);

        // ========== PRODUCTOS ==========
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(59, 130, 246);
        doc.text('📦 PRODUCTOS', 14, yPos);
        yPos += 8;

        const PRODUCTOS_ESTATICOS = ['Costilla', 'Asadura', 'Creadillas', 'Patas', 'Cabezas', 'Menudos', 'Manteca', 'Sangre', 'Guia'];
        const productosReales = productos.filter(p => 
            PRODUCTOS_ESTATICOS.some(pe => pe.toLowerCase() === p.nombre.toLowerCase()) && p.libras > 0
        );

        const productosData = productosReales.map(p => [
            p.nombre,
            formatMoneda(p.precio_unitario),
            p.libras.toFixed(2),
            formatMoneda(p.precio_unitario * p.libras)
        ]);

        const totalProductos = productosReales.reduce((sum, p) => 
            sum + (parseFloat(p.precio_unitario) * parseFloat(p.libras)), 0
        );

        doc.autoTable({
            startY: yPos,
            head: [['Producto', 'Precio Unitario', 'Libras', 'Total']],
            body: productosData,
            foot: [['TOTAL PRODUCTOS', '', '', formatMoneda(totalProductos)]],
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold' },
            footStyles: { fillColor: [241, 245, 249], textColor: [0, 0, 0], fontStyle: 'bold' }
        });

        yPos = doc.lastAutoTable.finalY + 15;

        // ========== GASTOS EN PRODUCTOS ==========
        const gastosEnProductos = productos.filter(p => 
            !PRODUCTOS_ESTATICOS.some(pe => pe.toLowerCase() === p.nombre.toLowerCase()) || p.libras === 0
        );

        if (gastosEnProductos.length > 0) {
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(251, 146, 60);
            doc.text('💰 GASTOS (En Productos)', 14, yPos);
            yPos += 8;

            const gastosProductosData = gastosEnProductos.map(g => [
                g.nombre,
                formatMoneda(g.precio_unitario)
            ]);

            const totalGastosProductos = gastosEnProductos.reduce((sum, g) => 
                sum + parseFloat(g.precio_unitario), 0
            );

            doc.autoTable({
                startY: yPos,
                head: [['Concepto', 'Valor']],
                body: gastosProductosData,
                foot: [['TOTAL GASTOS', formatMoneda(totalGastosProductos)]],
                theme: 'grid',
                headStyles: { fillColor: [251, 146, 60], fontStyle: 'bold' },
                footStyles: { fillColor: [241, 245, 249], textColor: [0, 0, 0], fontStyle: 'bold' }
            });

            yPos = doc.lastAutoTable.finalY + 15;
        }

        // ========== TOTAL FINAL PRODUCTOS ==========
        const totalGastosProductos = gastosEnProductos.reduce((sum, g) => 
            sum + parseFloat(g.precio_unitario), 0
        );
        const totalFinalProductos = totalProductos - totalGastosProductos;

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(59, 130, 246);
        doc.setTextColor(255, 255, 255);
        doc.rect(14, yPos - 5, 182, 10, 'F');
        doc.text(`TOTAL FINAL PRODUCTOS: ${formatMoneda(totalFinalProductos)}`, 105, yPos + 2, { align: 'center' });
        yPos += 15;

        // Nueva página si es necesario
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }

        // ========== OTROS GASTOS ==========
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(245, 158, 11);
        doc.text('🧾 OTROS GASTOS', 14, yPos);
        yPos += 8;

        if (otrosGastos.length > 0) {
            const otrosGastosData = otrosGastos.map(g => [
                formatFecha(g.fecha),
                g.concepto,
                formatMoneda(g.monto)
            ]);

            const totalOtrosGastos = otrosGastos.reduce((sum, g) => 
                sum + parseFloat(g.monto), 0
            );

            doc.autoTable({
                startY: yPos,
                head: [['Fecha', 'Concepto', 'Monto']],
                body: otrosGastosData,
                foot: [['', 'TOTAL OTROS GASTOS', formatMoneda(totalOtrosGastos)]],
                theme: 'grid',
                headStyles: { fillColor: [245, 158, 11], fontStyle: 'bold' },
                footStyles: { fillColor: [241, 245, 249], textColor: [0, 0, 0], fontStyle: 'bold' }
            });

            yPos = doc.lastAutoTable.finalY + 15;
        } else {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(100, 100, 100);
            doc.text('No hay otros gastos registrados', 14, yPos);
            yPos += 15;
        }

        // Nueva página
        doc.addPage();
        yPos = 20;

        // ========== PRÉSTAMOS Y GASTOS PERSONALES ==========
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(239, 68, 68);
        doc.text('👥 PRÉSTAMOS Y GASTOS PERSONALES', 14, yPos);
        yPos += 8;

        // Agrupar por persona
        const porPersona = {};
        prestamos.forEach(p => {
            const persona = p.persona || 'Sin Asignar';
            if (!porPersona[persona]) {
                porPersona[persona] = { prestamos: [], gastos: [] };
            }
            if (p.tipo === 'Prestamo') {
                porPersona[persona].prestamos.push(p);
            } else {
                porPersona[persona].gastos.push(p);
            }
        });

        Object.entries(porPersona).forEach(([persona, datos]) => {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(99, 102, 241);
            doc.text(`👤 ${persona}`, 14, yPos);
            yPos += 8;

            // Préstamos
            if (datos.prestamos.length > 0) {
                const prestamosData = datos.prestamos.map(p => [p.concepto, formatMoneda(p.monto)]);
                const totalPrestamos = datos.prestamos.reduce((sum, p) => sum + parseFloat(p.monto), 0);

                doc.autoTable({
                    startY: yPos,
                    head: [['Préstamos - Concepto', 'Monto']],
                    body: prestamosData,
                    foot: [['Total Préstamos', formatMoneda(totalPrestamos)]],
                    theme: 'plain',
                    headStyles: { fillColor: [16, 185, 129], fontStyle: 'bold', fontSize: 10 },
                    footStyles: { fillColor: [241, 245, 249], textColor: [0, 0, 0], fontStyle: 'bold' },
                    margin: { left: 20 }
                });

                yPos = doc.lastAutoTable.finalY + 5;
            }

            // Gastos
            if (datos.gastos.length > 0) {
                const gastosData = datos.gastos.map(g => [g.concepto, formatMoneda(g.monto)]);
                const totalGastos = datos.gastos.reduce((sum, g) => sum + parseFloat(g.monto), 0);

                doc.autoTable({
                    startY: yPos,
                    head: [['Gastos - Concepto', 'Monto']],
                    body: gastosData,
                    foot: [['Total Gastos', formatMoneda(totalGastos)]],
                    theme: 'plain',
                    headStyles: { fillColor: [239, 68, 68], fontStyle: 'bold', fontSize: 10 },
                    footStyles: { fillColor: [241, 245, 249], textColor: [0, 0, 0], fontStyle: 'bold' },
                    margin: { left: 20 }
                });

                yPos = doc.lastAutoTable.finalY + 5;
            }

            // Total Final por persona
            const totalPrestamosPersona = datos.prestamos.reduce((sum, p) => sum + parseFloat(p.monto), 0);
            const totalGastosPersona = datos.gastos.reduce((sum, g) => sum + parseFloat(g.monto), 0);
            const totalFinal = totalPrestamosPersona - totalGastosPersona;

            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            if (totalFinal >= 0) {
                doc.setTextColor(16, 185, 129);
                doc.text(`✅ Total Final: ${formatMoneda(totalFinal)}`, 20, yPos);
            } else {
                doc.setTextColor(239, 68, 68);
                doc.text(`⚠️ DEBE: ${formatMoneda(Math.abs(totalFinal))}`, 20, yPos);
            }

            yPos += 12;

            if (yPos > 260) {
                doc.addPage();
                yPos = 20;
            }
        });

        // Nueva página para cierres
        doc.addPage();
        yPos = 20;

        // ========== CIERRES DE CAJA ==========
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(16, 185, 129);
        doc.text('💵 CIERRES DE CAJA', 14, yPos);
        yPos += 8;

        if (cierres.length > 0) {
            cierres.forEach(cierre => {
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(99, 102, 241);
                doc.text(`📅 ${cierre.dia} - Caja ${cierre.numero_caja || 1}`, 14, yPos);
                yPos += 8;

                const cierreData = [
                    ['Base', formatMoneda(cierre.base)],
                    ['Ventas', formatMoneda(cierre.ventas)],
                    ['Talonarios', formatMoneda(cierre.talonarios)],
                    ['Llevar', formatMoneda(cierre.llevar || 0)],
                    ['Otro', formatMoneda(cierre.otro || 0)],
                    ['Préstamos Total', formatMoneda(cierre.prestamos_total || 0)],
                    ['Diferencia', formatMoneda(cierre.diferencia || 0)]
                ];

                doc.autoTable({
                    startY: yPos,
                    body: cierreData,
                    foot: [['TOTAL EFECTIVO', formatMoneda(cierre.total_efectivo)]],
                    theme: 'striped',
                    footStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
                    margin: { left: 20 }
                });

                yPos = doc.lastAutoTable.finalY + 5;

                // Observaciones
                if (cierre.observaciones) {
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'italic');
                    doc.setTextColor(100, 100, 100);
                    doc.text(`Observaciones: ${cierre.observaciones}`, 20, yPos);
                    yPos += 10;
                }

                if (yPos > 250) {
                    doc.addPage();
                    yPos = 20;
                }
            });
        }

        // ========== RESUMEN FINAL ==========
        doc.addPage();
        yPos = 20;

        doc.setFillColor(139, 92, 246);
        doc.rect(0, yPos - 10, 210, 15, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('📊 RESUMEN FINANCIERO FINAL', 105, yPos, { align: 'center' });

        yPos += 20;
        doc.setTextColor(0, 0, 0);

        const totalEfectivo = cierres.reduce((sum, c) => sum + parseFloat(c.total_efectivo || 0), 0);
        const totalOtrosGastosFinal = otrosGastos.reduce((sum, g) => sum + parseFloat(g.monto || 0), 0);

        // Calcular préstamos positivos
        let totalPrestamosPositivos = 0;
        Object.values(porPersona).forEach(datos => {
            const totalP = datos.prestamos.reduce((sum, p) => sum + parseFloat(p.monto), 0);
            const totalG = datos.gastos.reduce((sum, g) => sum + parseFloat(g.monto), 0);
            const final = totalP - totalG;
            if (final > 0) totalPrestamosPositivos += final;
        });

        const balanceFinal = totalEfectivo - totalFinalProductos - totalOtrosGastosFinal - totalPrestamosPositivos;

        const resumenData = [
            ['💰 Efectivo Total (Cierres)', formatMoneda(totalEfectivo)],
            ['📦 Total Final Productos', `- ${formatMoneda(totalFinalProductos)}`],
            ['🧾 Otros Gastos', `- ${formatMoneda(totalOtrosGastosFinal)}`],
            ['👥 Préstamos Positivos', `- ${formatMoneda(totalPrestamosPositivos)}`]
        ];

        doc.autoTable({
            startY: yPos,
            body: resumenData,
            theme: 'grid',
            styles: { fontSize: 12, cellPadding: 5 }
        });

        yPos = doc.lastAutoTable.finalY + 10;

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(balanceFinal >= 0 ? 16 : 239, balanceFinal >= 0 ? 185 : 68, balanceFinal >= 0 ? 129 : 68);
        doc.setTextColor(255, 255, 255);
        doc.rect(14, yPos - 5, 182, 15, 'F');
        doc.text(`💵 BALANCE FINAL: ${formatMoneda(balanceFinal)}`, 105, yPos + 5, { align: 'center' });

        // Guardar PDF
        const nombreArchivo = `Informe_${semana.nombre.replace(/ /g, '_')}_${semana.mes}.pdf`;
        doc.save(nombreArchivo);

        // Restaurar botón
        if (btn) {
            btn.innerHTML = '<i class="fas fa-file-pdf"></i> Generar PDF Completo';
            btn.disabled = false;
        }

        alert('✅ PDF generado correctamente!');

    } catch (error) {
        console.error('Error generando PDF:', error);
        alert('❌ Error al generar el PDF: ' + error.message);
        
        const btn = document.querySelector('.btn-generar-pdf');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-file-pdf"></i> Generar PDF Completo';
            btn.disabled = false;
        }
    }
}

// Exportar función
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generarPDFCompleto };
}