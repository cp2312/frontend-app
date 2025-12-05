// Configuración
const API_URL_PDF = 'https://backend-express-production-a427.up.railway.app';

// Formatear moneda en pesos colombianos
function formatMonedaPDF(valor) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(valor);
}

// Formatear fecha para PDF
function formatFechaPDF(fechaString) {
    const fecha = new Date(fechaString);
    return fecha.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Función para convertir cualquier valor a número
function parseNumero(valor) {
    if (valor === null || valor === undefined) return 0;
    if (typeof valor === 'number') return valor;
    if (typeof valor === 'string') {
        const num = parseFloat(valor);
        return isNaN(num) ? 0 : num;
    }
    return 0;
}

// Generar PDF completo
async function generarPDFCompleto(semanaId, semanaData) {
    try {
        console.log('Iniciando generación de PDF...');
        console.log('Semana ID:', semanaId);
        console.log('Semana Data:', semanaData);
        
        // Verificar que jsPDF esté cargado
        if (typeof window.jspdf === 'undefined') {
            alert('❌ Error: La librería jsPDF no está cargada. Por favor, recarga la página.');
            return;
        }

        // Mostrar loading
        const btn = document.querySelector('.btn-generar-pdf');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
            btn.disabled = true;
        }

        console.log('Cargando datos de la API...');

        // Cargar todos los datos con manejo de errores
        let productos = [], cierres = [], otrosGastos = [], prestamos = [], semana = semanaData;
        
        try {
            const responses = await Promise.allSettled([
                fetch(`${API_URL_PDF}/api/productos/semana/${semanaId}`).then(r => r.json()),
                fetch(`${API_URL_PDF}/api/cierres/semana/${semanaId}`).then(r => r.json()),
                fetch(`${API_URL_PDF}/api/otros/semana/${semanaId}`).then(r => r.json()),
                fetch(`${API_URL_PDF}/api/prestamos/semana/${semanaId}`).then(r => r.json()),
                !semanaData ? fetch(`${API_URL_PDF}/api/semanas/${semanaId}`).then(r => r.json()) : Promise.resolve(semanaData)
            ]);

            productos = responses[0].status === 'fulfilled' ? responses[0].value : [];
            cierres = responses[1].status === 'fulfilled' ? responses[1].value : [];
            otrosGastos = responses[2].status === 'fulfilled' ? responses[2].value : [];
            prestamos = responses[3].status === 'fulfilled' ? responses[3].value : [];
            semana = responses[4].status === 'fulfilled' ? responses[4].value : semanaData;
            
            console.log('Datos cargados:', { productos, cierres, otrosGastos, prestamos, semana });
            
        } catch (fetchError) {
            console.error('Error cargando datos:', fetchError);
            throw new Error('Error al cargar los datos necesarios');
        }

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
        doc.text(formatFechaPDF(semana.fecha), 105, 34, { align: 'center' });

        yPos = 50;
        doc.setTextColor(0, 0, 0);

        // ========== PRODUCTOS ==========
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(59, 130, 246);
        doc.text('PRODUCTOS', 14, yPos);
        yPos += 8;

        const PRODUCTOS_ESTATICOS = ['Costilla', 'Asadura', 'Creadillas', 'Patas', 'Cabezas', 'Menudos', 'Manteca', 'Sangre', 'Guia'];
        const productosReales = productos.filter(p => {
            // Verificar si es un producto estático y tiene libras > 0
            const esProductoEstatico = PRODUCTOS_ESTATICOS.some(pe => 
                pe.toLowerCase() === p.nombre.toLowerCase()
            );
            const libras = parseNumero(p.libras);
            return esProductoEstatico && libras > 0;
        });

        // Crear datos de tabla con manejo seguro de números
        const productosData = productosReales.map(p => {
            const precioUnitario = parseNumero(p.precio_unitario);
            const libras = parseNumero(p.libras);
            const total = precioUnitario * libras;
            
            return [
                p.nombre || 'Sin nombre',
                formatMonedaPDF(precioUnitario),
                libras.toFixed(2), // Ahora seguro que es número
                formatMonedaPDF(total)
            ];
        });

        const totalProductos = productosReales.reduce((sum, p) => {
            const precio = parseNumero(p.precio_unitario);
            const libras = parseNumero(p.libras);
            return sum + (precio * libras);
        }, 0);

        if (productosReales.length > 0) {
            doc.autoTable({
                startY: yPos,
                head: [['Producto', 'Precio Unitario', 'Libras', 'Total']],
                body: productosData,
                foot: [['TOTAL PRODUCTOS', '', '', formatMonedaPDF(totalProductos)]],
                theme: 'grid',
                headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold' },
                footStyles: { fillColor: [241, 245, 249], textColor: [0, 0, 0], fontStyle: 'bold' }
            });

            yPos = doc.lastAutoTable.finalY + 15;
        } else {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(100, 100, 100);
            doc.text('No hay productos registrados', 14, yPos);
            yPos += 15;
        }

        // ========== GASTOS EN PRODUCTOS ==========
        const gastosEnProductos = productos.filter(p => {
            const esProductoEstatico = PRODUCTOS_ESTATICOS.some(pe => 
                pe.toLowerCase() === p.nombre.toLowerCase()
            );
            const libras = parseNumero(p.libras);
            // Es un gasto si no es producto estático O es producto estático pero sin libras
            return !esProductoEstatico || (esProductoEstatico && libras === 0);
        });

        if (gastosEnProductos.length > 0) {
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(251, 146, 60);
            doc.text('GASTOS (En Productos)', 14, yPos);
            yPos += 8;

            const gastosProductosData = gastosEnProductos.map(g => [
                g.nombre || 'Sin concepto',
                formatMonedaPDF(parseNumero(g.precio_unitario))
            ]);

            const totalGastosProductos = gastosEnProductos.reduce((sum, g) => 
                sum + parseNumero(g.precio_unitario), 0
            );

            doc.autoTable({
                startY: yPos,
                head: [['Concepto', 'Valor']],
                body: gastosProductosData,
                foot: [['TOTAL GASTOS', formatMonedaPDF(totalGastosProductos)]],
                theme: 'grid',
                headStyles: { fillColor: [251, 146, 60], fontStyle: 'bold' },
                footStyles: { fillColor: [241, 245, 249], textColor: [0, 0, 0], fontStyle: 'bold' }
            });

            yPos = doc.lastAutoTable.finalY + 15;
        }

        // ========== TOTAL FINAL PRODUCTOS ==========
        const totalGastosProductos = gastosEnProductos.reduce((sum, g) => 
            sum + parseNumero(g.precio_unitario), 0
        );
        const totalFinalProductos = totalProductos - totalGastosProductos;

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(59, 130, 246);
        doc.setTextColor(255, 255, 255);
        doc.rect(14, yPos - 5, 182, 10, 'F');
        doc.text(`TOTAL FINAL PRODUCTOS: ${formatMonedaPDF(totalFinalProductos)}`, 105, yPos + 2, { align: 'center' });
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
        doc.text('OTROS GASTOS', 14, yPos);
        yPos += 8;

        if (otrosGastos && otrosGastos.length > 0) {
            const otrosGastosData = otrosGastos.map(g => [
                g.fecha ? formatFechaPDF(g.fecha) : 'Sin fecha',
                g.concepto || 'Sin concepto',
                formatMonedaPDF(parseNumero(g.monto))
            ]);

            const totalOtrosGastos = otrosGastos.reduce((sum, g) => 
                sum + parseNumero(g.monto), 0
            );

            doc.autoTable({
                startY: yPos,
                head: [['Fecha', 'Concepto', 'Monto']],
                body: otrosGastosData,
                foot: [['', 'TOTAL OTROS GASTOS', formatMonedaPDF(totalOtrosGastos)]],
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
        doc.text('PRESTAMOS Y GASTOS PERSONALES', 14, yPos);
        yPos += 8;

        // Agrupar por persona
        const porPersona = {};
        if (prestamos && Array.isArray(prestamos)) {
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
        }

        if (Object.keys(porPersona).length > 0) {
            Object.entries(porPersona).forEach(([persona, datos]) => {
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(99, 102, 241);
                doc.text(`${persona}`, 14, yPos);
                yPos += 8;

                // Préstamos
                if (datos.prestamos.length > 0) {
                    const prestamosData = datos.prestamos.map(p => [
                        p.concepto || 'Sin concepto',
                        formatMonedaPDF(parseNumero(p.monto))
                    ]);
                    const totalPrestamos = datos.prestamos.reduce((sum, p) => 
                        sum + parseNumero(p.monto), 0
                    );

                    doc.autoTable({
                        startY: yPos,
                        head: [['Prestamos - Concepto', 'Monto']],
                        body: prestamosData,
                        foot: [['Total Prestamos', formatMonedaPDF(totalPrestamos)]],
                        theme: 'plain',
                        headStyles: { fillColor: [16, 185, 129], fontStyle: 'bold', fontSize: 10 },
                        footStyles: { fillColor: [241, 245, 249], textColor: [0, 0, 0], fontStyle: 'bold' },
                        margin: { left: 20 }
                    });

                    yPos = doc.lastAutoTable.finalY + 5;
                }

                // Gastos
                if (datos.gastos.length > 0) {
                    const gastosData = datos.gastos.map(g => [
                        g.concepto || 'Sin concepto',
                        formatMonedaPDF(parseNumero(g.monto))
                    ]);
                    const totalGastos = datos.gastos.reduce((sum, g) => 
                        sum + parseNumero(g.monto), 0
                    );

                    doc.autoTable({
                        startY: yPos,
                        head: [['Gastos - Concepto', 'Monto']],
                        body: gastosData,
                        foot: [['Total Gastos', formatMonedaPDF(totalGastos)]],
                        theme: 'plain',
                        headStyles: { fillColor: [239, 68, 68], fontStyle: 'bold', fontSize: 10 },
                        footStyles: { fillColor: [241, 245, 249], textColor: [0, 0, 0], fontStyle: 'bold' },
                        margin: { left: 20 }
                    });

                    yPos = doc.lastAutoTable.finalY + 5;
                }

                // Total Final por persona
                const totalPrestamosPersona = datos.prestamos.reduce((sum, p) => 
                    sum + parseNumero(p.monto), 0
                );
                const totalGastosPersona = datos.gastos.reduce((sum, g) => 
                    sum + parseNumero(g.monto), 0
                );
                const totalFinal = totalPrestamosPersona - totalGastosPersona;

                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                if (totalFinal >= 0) {
                    doc.setTextColor(16, 185, 129);
                    doc.text(`Total Final: ${formatMonedaPDF(totalFinal)}`, 20, yPos);
                } else {
                    doc.setTextColor(239, 68, 68);
                    doc.text(`DEBE: ${formatMonedaPDF(Math.abs(totalFinal))}`, 20, yPos);
                }

                yPos += 12;

                if (yPos > 260) {
                    doc.addPage();
                    yPos = 20;
                }
            });
        } else {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(100, 100, 100);
            doc.text('No hay préstamos o gastos personales registrados', 14, yPos);
            yPos += 15;
        }

        // Nueva página para cierres
        doc.addPage();
        yPos = 20;

        // ========== CIERRES DE CAJA ==========
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(16, 185, 129);
        doc.text('CIERRES DE CAJA', 14, yPos);
        yPos += 8;

        if (cierres && cierres.length > 0) {
            cierres.forEach(cierre => {
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(99, 102, 241);
                doc.text(`${cierre.dia || 'Sin día'} - Caja ${cierre.numero_caja || 1}`, 14, yPos);
                yPos += 8;

                const cierreData = [
                    ['Base', formatMonedaPDF(parseNumero(cierre.base))],
                    ['Ventas', formatMonedaPDF(parseNumero(cierre.ventas))],
                    ['Talonarios', formatMonedaPDF(parseNumero(cierre.talonarios))],
                    ['Llevar', formatMonedaPDF(parseNumero(cierre.llevar))],
                    ['Otro', formatMonedaPDF(parseNumero(cierre.otro))],
                    ['Prestamos Total', formatMonedaPDF(parseNumero(cierre.prestamos_total))],
                    ['Diferencia', formatMonedaPDF(parseNumero(cierre.diferencia))]
                ];

                doc.autoTable({
                    startY: yPos,
                    body: cierreData,
                    foot: [['TOTAL EFECTIVO', formatMonedaPDF(parseNumero(cierre.total_efectivo))]],
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
        } else {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(100, 100, 100);
            doc.text('No hay cierres de caja registrados', 14, yPos);
            yPos += 15;
        }

        // ========== RESUMEN FINAL ==========
        doc.addPage();
        yPos = 20;

        doc.setFillColor(139, 92, 246);
        doc.rect(0, yPos - 10, 210, 15, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('RESUMEN FINANCIERO FINAL', 105, yPos, { align: 'center' });

        yPos += 20;
        doc.setTextColor(0, 0, 0);

        const totalEfectivo = cierres.reduce((sum, c) => 
            sum + parseNumero(c.total_efectivo), 0
        );
        const totalOtrosGastosFinal = otrosGastos.reduce((sum, g) => 
            sum + parseNumero(g.monto), 0
        );

        // Calcular préstamos positivos
        let totalPrestamosPositivos = 0;
        if (porPersona) {
            Object.values(porPersona).forEach(datos => {
                const totalP = datos.prestamos.reduce((sum, p) => 
                    sum + parseNumero(p.monto), 0
                );
                const totalG = datos.gastos.reduce((sum, g) => 
                    sum + parseNumero(g.monto), 0
                );
                const final = totalP - totalG;
                if (final > 0) totalPrestamosPositivos += final;
            });
        }

        const balanceFinal = totalEfectivo - totalFinalProductos - totalOtrosGastosFinal - totalPrestamosPositivos;

        const resumenData = [
            ['Efectivo Total (Cierres)', formatMonedaPDF(totalEfectivo)],
            ['Total Final Productos', `- ${formatMonedaPDF(totalFinalProductos)}`],
            ['Otros Gastos', `- ${formatMonedaPDF(totalOtrosGastosFinal)}`],
            ['Prestamos Positivos', `- ${formatMonedaPDF(totalPrestamosPositivos)}`]
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
        doc.text(`BALANCE FINAL: ${formatMonedaPDF(balanceFinal)}`, 105, yPos + 5, { align: 'center' });

        // Guardar PDF
        const nombreArchivo = `Informe_${(semana.nombre || 'Semana').replace(/ /g, '_')}_${semana.mes || ''}.pdf`;
        doc.save(nombreArchivo);

        console.log('PDF generado exitosamente:', nombreArchivo);

        // Restaurar botón
        if (btn) {
            btn.innerHTML = '<i class="fas fa-file-pdf"></i> Generar PDF';
            btn.disabled = false;
        }

        alert('✅ PDF generado correctamente!');

    } catch (error) {
        console.error('Error generando PDF:', error);
        alert('❌ Error al generar el PDF: ' + error.message);
        
        const btn = document.querySelector('.btn-generar-pdf');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-file-pdf"></i> Generar PDF';
            btn.disabled = false;
        }
    }
}