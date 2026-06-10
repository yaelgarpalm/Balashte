import { useEffect, useState } from 'react'
import { reportesAPI, configuracionAPI } from '../services/api'
import toast from 'react-hot-toast'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'
import { Search, FileText, Users, Award, TrendingUp, DollarSign, Percent, Star, Crown, ShoppingBag } from 'lucide-react'
import { useUI } from '../context/UIContext'

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
const num = (n) => Number(n || 0)
const pct = (value, total) => total > 0 ? `${((num(value) / total) * 100).toFixed(1)}%` : '0.0%'
const csvCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
const dateOnly = (value) => value ? new Date(value).toLocaleDateString('es-MX') : ''
const dateTime = (value) => value ? new Date(value).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : ''

export default function Reportes() {
    const { setTitulo, setSubtitulo } = useUI()
    const today = new Date().toISOString().slice(0, 10)
    const monthStart = today.slice(0, 8) + '01'
    const [filtros, setFiltros] = useState({ fecha_inicio: monthStart, fecha_fin: today })
    const [data, setData] = useState(null)
    const [userData, setUserData] = useState(null)
    const [clientData, setClientData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [tab, setTab] = useState('general')
    const [comision, setComision] = useState(2)
    const [config, setConfig] = useState(null)

    useEffect(() => {
        configuracionAPI.get().then(r => setConfig(r.data.config))
    }, [])

    const exportCSV = () => {
        if (!data) return;
        let rows = [];
        const businessName = config?.ticket_nombre_negocio || 'Balashte orquideas y anturios';
        const period = `${filtros.fecha_inicio} al ${filtros.fecha_fin}`;
        const totals = data.totales || {};
        const ingresos = num(totals.subtotal);
        const costo = num(totals.costo_total);
        const utilidad = ingresos - costo;

        rows.push([businessName]);
        rows.push([`REPORTE DETALLADO DE ${tab.toUpperCase()}`]);
        rows.push([`Periodo: ${period}`]);
        rows.push([`Generado: ${new Date().toLocaleString('es-MX')}`]);
        rows.push([]);

        if (tab === 'general' && data.totales) {
            rows.push(["RESUMEN GENERAL"]);
            rows.push(["Ventas Totales", totals.total_ventas]);
            rows.push(["Ingresos Brutos", ingresos.toFixed(2)]);
            rows.push(["Descuentos", num(totals.descuentos).toFixed(2)]);
            rows.push(["IVA", num(totals.iva).toFixed(2)]);
            rows.push(["Total Cobrado", num(totals.total).toFixed(2)]);
            rows.push(["Costo Total", costo.toFixed(2)]);
            rows.push(["Utilidad Bruta Estimada", utilidad.toFixed(2)]);
            rows.push(["Margen Bruto", pct(utilidad, ingresos)]);
            rows.push([]);

            rows.push(["DETALLE POR DÍA"]);
            rows.push(["Fecha", "Ventas", "Articulos", "Subtotal", "IVA", "Total", "Costo", "Utilidad", "Margen"]);
            (data.por_dia || []).forEach(d => {
                const rowUtilidad = num(d.subtotal) - num(d.costo);
                rows.push([dateOnly(d.fecha), d.ventas, d.articulos || '', num(d.subtotal).toFixed(2), num(d.iva).toFixed(2), num(d.total).toFixed(2), num(d.costo).toFixed(2), rowUtilidad.toFixed(2), pct(rowUtilidad, num(d.subtotal))]);
            });
            rows.push([]);

            rows.push(["VENTAS POR MÉTODO DE PAGO"]);
            rows.push(["Método", "Ventas", "Total", "Participación"]);
            const totalMetodos = (data.por_metodo || []).reduce((s, m) => s + num(m.total), 0);
            (data.por_metodo || []).forEach(m => rows.push([m.metodo_pago, m.ventas, num(m.total).toFixed(2), pct(m.total, totalMetodos)]));
            rows.push([]);

            rows.push(["VENTAS POR CATEGORÍA"]);
            rows.push(["Categoría", "Cantidad", "Total", "Costo", "Utilidad", "Margen"]);
            (data.por_categoria || []).forEach(c => rows.push([c.categoria, c.cantidad, num(c.total).toFixed(2), num(c.costo).toFixed(2), num(c.utilidad).toFixed(2), pct(c.utilidad, num(c.total))]));
            rows.push([]);

            rows.push(["TOP PRODUCTOS"]);
            rows.push(["Producto", "Categoría", "Cantidad", "Total", "Costo", "Utilidad", "Margen"]);
            (data.top_productos || []).forEach(p => rows.push([p.nombre, p.categoria || '', p.cantidad, num(p.total).toFixed(2), num(p.costo).toFixed(2), num(p.utilidad).toFixed(2), pct(p.utilidad, num(p.total))]));
            rows.push([]);

            rows.push(["DETALLE DE VENTAS"]);
            rows.push(["Folio", "Fecha", "Cliente", "Vendedor", "Método", "Artículos", "Subtotal", "Descuento", "IVA", "Total", "Costo", "Utilidad", "Margen"]);
            (data.detalle_ventas || []).forEach(v => rows.push([
                v.folio,
                dateTime(v.created_at),
                v.cliente,
                v.vendedor,
                v.metodo_pago,
                v.articulos,
                num(v.subtotal).toFixed(2),
                num(v.descuento).toFixed(2),
                num(v.iva).toFixed(2),
                num(v.total).toFixed(2),
                num(v.costo).toFixed(2),
                num(v.utilidad).toFixed(2),
                pct(v.utilidad, num(v.subtotal))
            ]));
        } else if (tab === 'usuarios') {
            const totalStaff = (userData || []).reduce((s, u) => s + num(u.ingresos_totales), 0);
            rows.push(["RESUMEN DE STAFF"]);
            rows.push(["Usuarios", (userData || []).length]);
            rows.push(["Ventas asignadas", (userData || []).reduce((s, u) => s + num(u.total_ventas), 0)]);
            rows.push(["Ingresos asignados", totalStaff.toFixed(2)]);
            rows.push([]);
            rows.push(["DESEMPEÑO DE STAFF"]);
            rows.push(["Usuario", "Rol", "Ventas", "Total", "Ticket Promedio", "Participación", "Comision (%)", "Pago Comision"]);
            (userData || []).forEach(u => {
                rows.push([u.nombre, u.rol, u.total_ventas, num(u.ingresos_totales).toFixed(2), num(u.ticket_promedio).toFixed(2), pct(u.ingresos_totales, totalStaff), comision, (num(u.ingresos_totales) * (num(comision) / 100)).toFixed(2)]);
            });
        } else if (tab === 'clientes') {
            const totalClientes = (clientData || []).reduce((s, c) => s + num(c.total_gastado), 0);
            rows.push(["RESUMEN DE CLIENTES"]);
            rows.push(["Clientes con historial", (clientData || []).filter(c => num(c.total_compras) > 0).length]);
            rows.push(["Clientes VIP", (clientData || []).filter(c => num(c.total_gastado) >= 2000).length]);
            rows.push(["Total gastado", totalClientes.toFixed(2)]);
            rows.push(["Puntos generados", Math.floor(totalClientes / 10)]);
            rows.push([]);
            rows.push(["FIDELIDAD DE CLIENTES"]);
            rows.push(["Cliente", "Email", "Tipo", "Status", "Compras", "Total Gastado", "Ticket Promedio", "Puntos", "Participación", "Ultima Compra"]);
            (clientData || []).forEach(c => {
                const status = getStatus(c.total_gastado);
                rows.push([c.nombre, c.email || '', c.tipo, status.label, c.total_compras, num(c.total_gastado).toFixed(2), num(c.total_compras) > 0 ? (num(c.total_gastado) / num(c.total_compras)).toFixed(2) : '0.00', Math.floor(num(c.total_gastado) / 10), pct(c.total_gastado, totalClientes), c.ultima_compra ? dateTime(c.ultima_compra) : 'N/A']);
            });
        }

        const csvContent = "\uFEFFsep=,\n" + rows.map(e => e.map(csvCell).join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `reporte_${tab}_${filtros.fecha_inicio}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('CSV exportado');
    }

    const exportXLSX = async () => {
        if (!data) return;
        const tid = toast.loading('Generando documento de Excel profesional...');
        try {
            const XLSX = await import('xlsx');
            const wb = XLSX.utils.book_new();

            const totals = data.totales || {};
            const ingresos = num(totals.subtotal);
            const costo = num(totals.costo_total);
            const utilidad = ingresos - costo;

            // 1. Resumen General
            const resumenRows = [
                [config?.ticket_nombre_negocio || 'Balashte orquideas y anturios'],
                [`REPORTE DE METRICAS Y KPIs - Pestaña: ${tab.toUpperCase()}`],
                [`Periodo: ${filtros.fecha_inicio} al ${filtros.fecha_fin}`],
                [`Generado: ${new Date().toLocaleString('es-MX')}`],
                [],
                ["MÉTRICA", "VALOR"],
                ["Ventas Totales (Transacciones)", totals.total_ventas],
                ["Ingresos Brutos", ingresos],
                ["Descuentos", num(totals.descuentos)],
                ["IVA", num(totals.iva)],
                ["Total Cobrado", num(totals.total)],
                ["Costo de Ventas", costo],
                ["Utilidad Bruta Estimada", utilidad],
                ["Margen Bruto", pct(utilidad, ingresos)],
                [],
                ["VENTAS POR MÉTODO DE PAGO", "VENTAS", "TOTAL", "PARTICIPACIÓN"],
            ];

            const totalMetodos = (data.por_metodo || []).reduce((s, m) => s + num(m.total), 0);
            (data.por_metodo || []).forEach(m => {
                resumenRows.push([m.metodo_pago, m.ventas, num(m.total), pct(m.total, totalMetodos)]);
            });

            const wsResumen = XLSX.utils.aoa_to_sheet(resumenRows);
            XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen General");

            // 2. Detalle Por Día
            const porDiaRows = [
                ["Fecha", "Ventas", "Artículos", "Subtotal", "IVA", "Total", "Costo", "Utilidad", "Margen"]
            ];
            (data.por_dia || []).forEach(d => {
                const rowUtilidad = num(d.subtotal) - num(d.costo);
                porDiaRows.push([
                    dateOnly(d.fecha),
                    num(d.ventas),
                    num(d.articulos),
                    num(d.subtotal),
                    num(d.iva),
                    num(d.total),
                    num(d.costo),
                    rowUtilidad,
                    pct(rowUtilidad, num(d.subtotal))
                ]);
            });
            const wsPorDia = XLSX.utils.aoa_to_sheet(porDiaRows);
            XLSX.utils.book_append_sheet(wb, wsPorDia, "Detalle Por Dia");

            // 3. Ventas por Categoría y Top Productos
            const catRows = [
                ["Categoría", "Cantidad", "Total", "Costo", "Utilidad", "Margen"]
            ];
            (data.por_categoria || []).forEach(c => {
                catRows.push([c.categoria, num(c.cantidad), num(c.total), num(c.costo), num(c.utilidad), pct(c.utilidad, num(c.total))]);
            });
            const wsCategorias = XLSX.utils.aoa_to_sheet(catRows);
            XLSX.utils.book_append_sheet(wb, wsCategorias, "Por Categoria");

            const topRows = [
                ["Producto", "Categoría", "Cantidad", "Total", "Costo", "Utilidad", "Margen"]
            ];
            (data.top_productos || []).forEach(p => {
                topRows.push([p.nombre, p.categoria || '', num(p.cantidad), num(p.total), num(p.costo), num(p.utilidad), pct(p.utilidad, num(p.total))]);
            });
            const wsTop = XLSX.utils.aoa_to_sheet(topRows);
            XLSX.utils.book_append_sheet(wb, wsTop, "Top Productos");

            // 4. Detalle de Ventas
            const detalleVentasRows = [
                ["Folio", "Fecha", "Cliente", "Vendedor", "Método", "Artículos", "Subtotal", "Descuento", "IVA", "Total", "Costo", "Utilidad", "Margen"]
            ];
            (data.detalle_ventas || []).forEach(v => {
                detalleVentasRows.push([
                    v.folio,
                    dateTime(v.created_at),
                    v.cliente,
                    v.vendedor,
                    v.metodo_pago,
                    num(v.articulos),
                    num(v.subtotal),
                    num(v.descuento),
                    num(v.iva),
                    num(v.total),
                    num(v.costo),
                    num(v.utilidad),
                    pct(v.utilidad, num(v.subtotal))
                ]);
            });
            const wsDetalle = XLSX.utils.aoa_to_sheet(detalleVentasRows);
            XLSX.utils.book_append_sheet(wb, wsDetalle, "Detalle de Ventas");

            // 5. Staff
            if (userData && userData.length > 0) {
                const staffRows = [
                    ["Usuario", "Rol", "Ventas", "Total", "Ticket Promedio", "Participación", "Comisión (%)", "Pago Comisión"]
                ];
                const totalStaff = (userData || []).reduce((s, u) => s + num(u.ingresos_totales), 0);
                userData.forEach(u => {
                    staffRows.push([
                        u.nombre,
                        u.rol,
                        num(u.total_ventas),
                        num(u.ingresos_totales),
                        num(u.ticket_promedio),
                        pct(u.ingresos_totales, totalStaff),
                        num(comision),
                        num(u.ingresos_totales) * (num(comision) / 100)
                    ]);
                });
                const wsStaff = XLSX.utils.aoa_to_sheet(staffRows);
                XLSX.utils.book_append_sheet(wb, wsStaff, "Desempeño Staff");
            }

            // 6. Clientes
            if (clientData && clientData.length > 0) {
                const totalClientes = (clientData || []).reduce((s, c) => s + num(c.total_gastado), 0);
                const clientRows = [
                    ["Cliente", "Email", "Tipo", "Status", "Compras", "Total Gastado", "Ticket Promedio", "Puntos", "Participación", "Última Compra"]
                ];
                clientData.forEach(c => {
                    const status = getStatus(c.total_gastado);
                    clientRows.push([
                        c.nombre,
                        c.email || '',
                        c.tipo,
                        status.label,
                        num(c.total_compras),
                        num(c.total_gastado),
                        num(c.total_compras) > 0 ? num(c.total_gastado) / num(c.total_compras) : 0,
                        Math.floor(num(c.total_gastado) / 10),
                        pct(c.total_gastado, totalClientes),
                        c.ultima_compra ? dateTime(c.ultima_compra) : 'N/A'
                    ]);
                });
                const wsClientes = XLSX.utils.aoa_to_sheet(clientRows);
                XLSX.utils.book_append_sheet(wb, wsClientes, "Clientes");
            }

            XLSX.writeFile(wb, `reporte_${tab}_${filtros.fecha_inicio}.xlsx`);
            toast.success('Excel exportado correctamente', { id: tid });
        } catch (e) {
            console.error(e);
            toast.error('Error al generar Excel', { id: tid });
        }
    }

    const exportPDF = async () => {
        if (!data) return toast.error('Genera el reporte primero')
        const tid = toast.loading('Generando PDF profesional...')
        try {
            const { jsPDF } = await import('jspdf')
            const pdf = new jsPDF('p', 'mm', 'a4')
            const PW = pdf.internal.pageSize.getWidth()   // 210
            const PH = pdf.internal.pageSize.getHeight()  // 297
            const ML = 14, MR = 14, MT = 14
            const CW = PW - ML - MR
            let Y = MT

            const ORCHID = [164, 85, 247]
            const SLATE  = [51,  65,  85]
            const GRAY   = [148, 163, 184]
            const WHITE  = [255, 255, 255]
            const GREEN  = [16,  185, 129]
            const RED    = [239, 68,  68]
            const BLUE   = [59,  130, 246]

            const checkPage = (needed = 10) => {
                if (Y + needed > PH - 14) { pdf.addPage(); Y = MT }
            }

            // ─── Header brand bar ──────────────────────────────────────────
            pdf.setFillColor(...ORCHID)
            pdf.rect(0, 0, PW, 22, 'F')
            pdf.setTextColor(...WHITE)
            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(13)
            pdf.text(config?.ticket_nombre_negocio || 'BALASHTE ORQUÍDEAS Y ANTURIOS', ML, 10)
            pdf.setFontSize(7)
            pdf.setFont('helvetica', 'normal')
            pdf.text(`REPORTE EJECUTIVO · ${tab.toUpperCase()}`, ML, 16)
            pdf.setFontSize(8)
            const periodoTxt = `${filtros.fecha_inicio}  →  ${filtros.fecha_fin}`
            pdf.text(periodoTxt, PW - MR - pdf.getTextWidth(periodoTxt), 10)
            pdf.setFontSize(7)
            const genTxt = `Generado: ${new Date().toLocaleString('es-MX')}`
            pdf.text(genTxt, PW - MR - pdf.getTextWidth(genTxt), 16)
            Y = 28

            // ─── KPI summary boxes ─────────────────────────────────────────
            const totales = data.totales || {}
            const ingresos = num(totales.subtotal)
            const costo    = num(totales.costo_total)
            const utilidad = ingresos - costo
            const margen   = ingresos > 0 ? (utilidad / ingresos * 100) : 0
            const iva      = num(totales.iva)
            const totalVentas = num(totales.total_ventas)

            const boxes = [
                { label: 'Total Ventas',    value: totalVentas.toLocaleString(),  color: ORCHID },
                { label: 'Ingresos Brutos', value: fmt(ingresos),                 color: BLUE   },
                { label: 'Costo de Ventas', value: fmt(costo),                    color: RED    },
                { label: 'Utilidad Bruta',  value: fmt(utilidad),                 color: GREEN  },
                { label: 'IVA Generado',    value: fmt(iva),                      color: [245, 158, 11] },
                { label: 'Margen %',        value: `${margen.toFixed(1)}%`,       color: [99,  102, 241] },
            ]
            const bW = (CW - 5 * 3) / 6
            boxes.forEach((b, i) => {
                const bx = ML + i * (bW + 3)
                pdf.setFillColor(b.color[0], b.color[1], b.color[2], 15)
                pdf.setFillColor(245, 247, 250)
                pdf.roundedRect(bx, Y, bW, 18, 2, 2, 'F')
                pdf.setDrawColor(b.color[0], b.color[1], b.color[2])
                pdf.setLineWidth(0.5)
                pdf.roundedRect(bx, Y, bW, 18, 2, 2, 'S')
                // accent top line
                pdf.setFillColor(...b.color)
                pdf.rect(bx, Y, bW, 1.5, 'F')
                pdf.setFont('helvetica', 'bold')
                pdf.setFontSize(9)
                pdf.setTextColor(...b.color)
                const vw = pdf.getTextWidth(b.value)
                pdf.text(b.value, bx + bW / 2 - vw / 2, Y + 10)
                pdf.setFont('helvetica', 'normal')
                pdf.setFontSize(6)
                pdf.setTextColor(...GRAY)
                const lw = pdf.getTextWidth(b.label)
                pdf.text(b.label, bx + bW / 2 - lw / 2, Y + 15.5)
            })
            Y += 24

            // ─── Helper: draw a table ─────────────────────────────────────
            const drawTable = (headers, rows, colWidths, opts = {}) => {
                const { rowH = 7, headerBg = ORCHID, fontSize = 7 } = opts
                checkPage(rowH * 2 + 4)

                // header
                let cx = ML
                pdf.setFillColor(...headerBg)
                pdf.rect(ML, Y, CW, rowH, 'F')
                pdf.setFont('helvetica', 'bold')
                pdf.setFontSize(fontSize)
                pdf.setTextColor(...WHITE)
                headers.forEach((h, i) => {
                    pdf.text(String(h), cx + 1.5, Y + rowH - 2)
                    cx += colWidths[i]
                })
                Y += rowH

                // rows
                rows.forEach((row, ri) => {
                    checkPage(rowH + 2)
                    pdf.setFillColor(ri % 2 === 0 ? 249 : 255, ri % 2 === 0 ? 250 : 255, ri % 2 === 0 ? 252 : 255)
                    pdf.rect(ML, Y, CW, rowH, 'F')
                    pdf.setDrawColor(226, 232, 240)
                    pdf.setLineWidth(0.2)
                    pdf.line(ML, Y + rowH, ML + CW, Y + rowH)

                    cx = ML
                    pdf.setFont('helvetica', 'normal')
                    pdf.setTextColor(...SLATE)
                    row.forEach((cell, i) => {
                        const txt = String(cell ?? '')
                        const maxW = colWidths[i] - 3
                        const truncated = pdf.getTextWidth(txt) > maxW
                            ? txt.slice(0, Math.floor(maxW / pdf.getTextWidth('a') * txt.length) - 1) + '…'
                            : txt
                        pdf.text(truncated, cx + 1.5, Y + rowH - 2)
                        cx += colWidths[i]
                    })
                    Y += rowH
                })
                Y += 4
            }

            // ─── Section title helper ──────────────────────────────────────
            const sectionTitle = (title) => {
                checkPage(12)
                pdf.setFillColor(241, 245, 249)
                pdf.rect(ML, Y, CW, 8, 'F')
                pdf.setFont('helvetica', 'bold')
                pdf.setFontSize(8)
                pdf.setTextColor(...SLATE)
                pdf.text(title, ML + 2, Y + 5.5)
                Y += 11
            }

            // ═══════════════════════════════════════════════════════════════
            // TAB: GENERAL
            // ═══════════════════════════════════════════════════════════════
            if (tab === 'general') {
                // Detalle por Día
                sectionTitle('DETALLE POR DÍA')
                const diaHeaders = ['Fecha', 'Ventas', 'Subtotal', 'IVA', 'Total', 'Costo', 'Utilidad']
                const diaWidths  = [28, 16, 30, 24, 30, 26, 28]
                const diaRows = (data.por_dia || []).map(d => [
                    dateOnly(d.fecha),
                    d.ventas,
                    fmt(d.subtotal),
                    fmt(d.iva),
                    fmt(d.total),
                    fmt(d.costo),
                    fmt(num(d.subtotal) - num(d.costo)),
                ])
                drawTable(diaHeaders, diaRows, diaWidths)

                // Métodos de pago
                sectionTitle('VENTAS POR MÉTODO DE PAGO')
                const metTot = (data.por_metodo || []).reduce((s, m) => s + num(m.total), 0)
                const metHeaders = ['Método', 'Transacciones', 'Total', 'Participación']
                const metWidths  = [50, 40, 40, 52]
                const metRows = (data.por_metodo || []).map(m => [
                    m.metodo_pago,
                    m.ventas,
                    fmt(m.total),
                    pct(m.total, metTot),
                ])
                drawTable(metHeaders, metRows, metWidths)

                // Ventas por Categoría
                sectionTitle('VENTAS POR CATEGORÍA')
                const catHeaders = ['Categoría', 'Cantidad', 'Total', 'Costo', 'Utilidad', 'Margen']
                const catWidths  = [45, 22, 30, 28, 28, 29]
                const catRows = (data.por_categoria || []).map(c => [
                    c.categoria,
                    c.cantidad,
                    fmt(c.total),
                    fmt(c.costo),
                    fmt(c.utilidad),
                    pct(c.utilidad, num(c.total)),
                ])
                drawTable(catHeaders, catRows, catWidths)

                // Top Productos
                sectionTitle('TOP PRODUCTOS')
                const prodHeaders = ['Producto', 'Categoría', 'Cant.', 'Total', 'Costo', 'Utilidad', 'Margen']
                const prodWidths  = [44, 32, 14, 26, 22, 26, 18]
                const prodRows = (data.top_productos || []).slice(0, 20).map(p => [
                    p.nombre,
                    p.categoria || '',
                    p.cantidad,
                    fmt(p.total),
                    fmt(p.costo),
                    fmt(p.utilidad),
                    pct(p.utilidad, num(p.total)),
                ])
                drawTable(prodHeaders, prodRows, prodWidths)

                // Detalle de Ventas — landscape page for more space
                pdf.addPage('a4', 'landscape')
                Y = MT

                // Re-draw header bar on new landscape page
                const PWL = pdf.internal.pageSize.getWidth()   // 297 in landscape
                const CWL = PWL - ML - MR
                pdf.setFillColor(...ORCHID)
                pdf.rect(0, 0, PWL, 16, 'F')
                pdf.setTextColor(...WHITE)
                pdf.setFont('helvetica', 'bold')
                pdf.setFontSize(10)
                pdf.text('DETALLE DE VENTAS', ML, 10.5)
                pdf.setFontSize(7)
                pdf.setFont('helvetica', 'normal')
                pdf.text(`Período: ${filtros.fecha_inicio}  →  ${filtros.fecha_fin}`, PWL - MR - pdf.getTextWidth(`Período: ${filtros.fecha_inicio}  →  ${filtros.fecha_fin}`), 10.5)
                Y = 22

                const shortFolio = (folio) => folio ? folio.replace('VTA-', '').replace(/^0+/, '') : ''
                const shortDate = (val) => val ? new Date(val).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''

                const dvHeaders = ['Folio', 'Fecha', 'Cliente', 'Vendedor', 'Método', 'Art.', 'Subtotal', 'IVA', 'Total', 'Utilidad']
                // CWL ≈ 269mm — distribute proportionally
                const dvWidths  = [28, 30, 48, 38, 22, 10, 26, 22, 26, 19]
                const dvRows = (data.detalle_ventas || []).map(v => [
                    shortFolio(v.folio),
                    shortDate(v.created_at),
                    v.cliente,
                    v.vendedor,
                    v.metodo_pago,
                    v.articulos,
                    fmt(v.subtotal),
                    fmt(v.iva),
                    fmt(v.total),
                    fmt(v.utilidad),
                ])

                // Landscape-aware drawTable
                const checkPageL = (needed = 10) => {
                    if (Y + needed > pdf.internal.pageSize.getHeight() - 14) {
                        pdf.addPage('a4', 'landscape')
                        Y = MT
                    }
                }
                const drawTableL = (headers, rows, colWidths, opts = {}) => {
                    const { rowH = 7, headerBg = ORCHID, fontSize = 7 } = opts
                    checkPageL(rowH * 2 + 4)
                    let cx = ML
                    pdf.setFillColor(...headerBg)
                    pdf.rect(ML, Y, CWL, rowH, 'F')
                    pdf.setFont('helvetica', 'bold')
                    pdf.setFontSize(fontSize)
                    pdf.setTextColor(...WHITE)
                    headers.forEach((h, i) => {
                        pdf.text(String(h), cx + 1.5, Y + rowH - 2)
                        cx += colWidths[i]
                    })
                    Y += rowH
                    rows.forEach((row, ri) => {
                        checkPageL(rowH + 2)
                        pdf.setFillColor(ri % 2 === 0 ? 249 : 255, ri % 2 === 0 ? 250 : 255, ri % 2 === 0 ? 252 : 255)
                        pdf.rect(ML, Y, CWL, rowH, 'F')
                        pdf.setDrawColor(226, 232, 240)
                        pdf.setLineWidth(0.2)
                        pdf.line(ML, Y + rowH, ML + CWL, Y + rowH)
                        cx = ML
                        pdf.setFont('helvetica', 'normal')
                        pdf.setTextColor(...SLATE)
                        row.forEach((cell, i) => {
                            const txt = String(cell ?? '')
                            const maxW = colWidths[i] - 3
                            const truncated = pdf.getTextWidth(txt) > maxW
                                ? txt.slice(0, Math.floor(maxW / pdf.getTextWidth('a') * txt.length) - 1) + '…'
                                : txt
                            pdf.text(truncated, cx + 1.5, Y + rowH - 2)
                            cx += colWidths[i]
                        })
                        Y += rowH
                    })
                    Y += 4
                }
                drawTableL(dvHeaders, dvRows, dvWidths, { rowH: 6.5 })
            }

            // ═══════════════════════════════════════════════════════════════
            // TAB: KPI
            // ═══════════════════════════════════════════════════════════════
            if (tab === 'kpi') {
                const ticketProm = totalVentas > 0 ? num(totales.total) / totalVentas : 0
                const descuentos = num(totales.descuentos)
                const totalArticulos = (data.top_productos || []).reduce((s, p) => s + num(p.cantidad), 0)
                const dias = (data.por_dia || []).length || 1
                const promDiario = num(totales.total) / dias
                const clientesUnicos = clientData?.length || 0
                const topVendedor = (userData || []).length > 0
                    ? (userData || []).reduce((a, b) => num(b.ingresos_totales) > num(a.ingresos_totales) ? b : a)
                    : null
                const topCliente = (clientData || []).length > 0
                    ? (clientData || []).reduce((a, b) => num(b.total_gastado) > num(a.total_gastado) ? b : a)
                    : null

                // KPI Extended table
                sectionTitle('INDICADORES CLAVE DE RENDIMIENTO (KPI)')
                const kpiRows = [
                    ['Ticket Promedio',             fmt(ticketProm)],
                    ['Artículos Vendidos',          totalArticulos.toLocaleString()],
                    ['Clientes Atendidos',          clientesUnicos.toLocaleString()],
                    ['Promedio de Ingreso Diario',  fmt(promDiario)],
                    ['Descuentos Otorgados',        fmt(descuentos)],
                    ['% Descuentos / Subtotal',     ingresos > 0 ? `${(descuentos/ingresos*100).toFixed(1)}%` : '0.0%'],
                    ['% Costo / Ingresos',          ingresos > 0 ? `${(costo/ingresos*100).toFixed(1)}%` : '0.0%'],
                    ['Ingreso por Cliente',         fmt(ingresos / (clientesUnicos || 1))],
                    ['Costo por Transacción',       fmt(costo / (totalVentas || 1))],
                    ['Utilidad por Transacción',    fmt(utilidad / (totalVentas || 1))],
                ]
                drawTable(['Indicador', 'Valor'], kpiRows, [130, 52], { headerBg: [99, 102, 241] })

                // Tendencia por día
                sectionTitle('TENDENCIA DIARIA DE VENTAS')
                const tendHeaders = ['Fecha', 'Transacciones', 'Subtotal', 'IVA', 'Total', 'Costo', 'Utilidad']
                const tendWidths  = [28, 22, 28, 22, 28, 24, 30]
                const tendRows = (data.por_dia || []).map(d => [
                    dateOnly(d.fecha),
                    d.ventas,
                    fmt(d.subtotal),
                    fmt(d.iva),
                    fmt(d.total),
                    fmt(d.costo),
                    fmt(num(d.subtotal) - num(d.costo)),
                ])
                drawTable(tendHeaders, tendRows, tendWidths)

                // Top vendedor / cliente
                if (topVendedor || topCliente) {
                    sectionTitle('DESTACADOS DEL PERÍODO')
                    const destRows = []
                    if (topVendedor) destRows.push(['⭐ Top Vendedor', topVendedor.nombre, `${topVendedor.total_ventas} ventas · ${fmt(topVendedor.ingresos_totales)}`])
                    if (topCliente)  destRows.push(['👑 Top Cliente',  topCliente.nombre,  `${topCliente.total_compras} compras · ${fmt(topCliente.total_gastado)}`])
                    drawTable(['Categoría', 'Nombre', 'Detalle'], destRows, [40, 60, 82], { headerBg: GREEN })
                }

                // Métodos de pago
                sectionTitle('DISTRIBUCIÓN POR MÉTODO DE PAGO')
                const metTotKpi = (data.por_metodo || []).reduce((s, m) => s + num(m.total), 0)
                drawTable(
                    ['Método de Pago', 'Transacciones', 'Total', 'Participación'],
                    (data.por_metodo || []).map(m => [m.metodo_pago, m.ventas, fmt(m.total), pct(m.total, metTotKpi)]),
                    [50, 40, 40, 52],
                    { headerBg: [16, 192, 184] }
                )

                // Top productos
                sectionTitle('TOP 10 PRODUCTOS MÁS VENDIDOS')
                drawTable(
                    ['#', 'Producto', 'Categoría', 'Unidades', 'Total', 'Utilidad'],
                    (data.top_productos || []).slice(0, 10).map((p, i) => [i + 1, p.nombre, p.categoria || '', p.cantidad, fmt(p.total), fmt(p.utilidad)]),
                    [10, 60, 38, 18, 30, 26],
                    { headerBg: ORCHID }
                )
            }

            // ═══════════════════════════════════════════════════════════════
            // TAB: USUARIOS
            // ═══════════════════════════════════════════════════════════════
            if (tab === 'usuarios') {
                sectionTitle('DESEMPEÑO DE VENDEDORES')
                const totalStaff = (userData || []).reduce((s, u) => s + num(u.ingresos_totales), 0)
                drawTable(
                    ['Usuario', 'Rol', 'Ventas', 'Total Ventas', 'Ticket Prom.', 'Participación', `Comisión ${comision}%`],
                    (userData || []).map(u => [
                        u.nombre, u.rol, u.total_ventas,
                        fmt(u.ingresos_totales),
                        fmt(u.ticket_promedio || num(u.ingresos_totales) / (num(u.total_ventas) || 1)),
                        pct(u.ingresos_totales, totalStaff),
                        fmt(num(u.ingresos_totales) * (comision / 100))
                    ]),
                    [40, 24, 16, 28, 24, 26, 24],
                    { headerBg: ORCHID }
                )

                // Resumen staff
                checkPage(30)
                sectionTitle('RESUMEN DEL EQUIPO')
                drawTable(
                    ['Métrica', 'Valor'],
                    [
                        ['Total vendedores', (userData || []).length],
                        ['Total transacciones', (userData || []).reduce((s, u) => s + num(u.total_ventas), 0)],
                        ['Total ingresos asignados', fmt(totalStaff)],
                        ['Promedio de ventas por vendedor', fmt(totalStaff / ((userData || []).length || 1))],
                        [`Fondo de comisiones (${comision}%)`, fmt(totalStaff * (comision / 100))],
                    ],
                    [100, 82],
                    { headerBg: [99, 102, 241] }
                )
            }

            // ═══════════════════════════════════════════════════════════════
            // TAB: CLIENTES
            // ═══════════════════════════════════════════════════════════════
            if (tab === 'clientes') {
                sectionTitle('FIDELIZACIÓN DE CLIENTES')
                const totalGastadoAll = (clientData || []).reduce((s, c) => s + num(c.total_gastado), 0)
                drawTable(
                    ['Cliente', 'Status', 'Compras', 'Total Gastado', 'Ticket Prom.', 'Puntos', 'Participación'],
                    (clientData || []).map(c => {
                        const st = getStatus(c.total_gastado)
                        return [
                            c.nombre, st.label, c.total_compras,
                            fmt(c.total_gastado),
                            fmt(num(c.total_compras) > 0 ? num(c.total_gastado) / num(c.total_compras) : 0),
                            Math.floor(num(c.total_gastado) / 10),
                            pct(c.total_gastado, totalGastadoAll)
                        ]
                    }),
                    [44, 20, 16, 28, 22, 14, 38],
                    { headerBg: BLUE, rowH: 6.5 }
                )

                checkPage(30)
                sectionTitle('RESUMEN PROGRAMA DE LEALTAD')
                drawTable(
                    ['Métrica', 'Valor'],
                    [
                        ['Clientes con historial', (clientData || []).filter(c => num(c.total_compras) > 0).length],
                        ['Clientes Bronze',  (clientData || []).filter(c => num(c.total_gastado) < 1000).length],
                        ['Clientes Silver',  (clientData || []).filter(c => num(c.total_gastado) >= 1000 && num(c.total_gastado) < 2000).length],
                        ['Clientes Gold',    (clientData || []).filter(c => num(c.total_gastado) >= 2000 && num(c.total_gastado) < 5000).length],
                        ['Clientes Platinum',(clientData || []).filter(c => num(c.total_gastado) >= 5000).length],
                        ['Total puntos generados', Math.floor(totalGastadoAll / 10)],
                        ['Total gastado acumulado', fmt(totalGastadoAll)],
                    ],
                    [100, 82],
                    { headerBg: BLUE }
                )
            }

            // ─── Footer on each page ──────────────────────────────────────
            const totalPages = pdf.internal.getNumberOfPages()
            for (let i = 1; i <= totalPages; i++) {
                pdf.setPage(i)
                const pgW = pdf.internal.pageSize.getWidth()
                const pgH = pdf.internal.pageSize.getHeight()
                pdf.setFillColor(241, 245, 249)
                pdf.rect(0, pgH - 10, pgW, 10, 'F')
                pdf.setFont('helvetica', 'normal')
                pdf.setFontSize(6)
                pdf.setTextColor(...GRAY)
                pdf.text(`${config?.ticket_nombre_negocio || 'Balashte'} · Reporte ${tab} · ${filtros.fecha_inicio} al ${filtros.fecha_fin}`, ML, pgH - 4)
                pdf.text(`Pág. ${i} / ${totalPages}`, pgW - MR - 14, pgH - 4)
            }

            pdf.save(`reporte_${tab}_${filtros.fecha_inicio}.pdf`)
            toast.success('PDF exportado correctamente', { id: tid })
        } catch (e) {
            console.error(e)
            toast.error('Error al generar PDF: ' + e.message, { id: tid })
        }
    }

    useEffect(() => {
        setTitulo('Reportes y Estadísticas')
        setSubtitulo('Analiza el rendimiento de tu negocio')
        return () => {
            setTitulo('')
            setSubtitulo('')
        }
    }, [])

    const buscar = async () => {
        setLoading(true)
        try {
            const [vResp, uResp, cResp] = await Promise.all([
                reportesAPI.ventas(filtros),
                reportesAPI.usuarios(filtros),
                reportesAPI.clientes(filtros)
            ])
            setData(vResp.data)
            setUserData(uResp.data.reporte)
            setClientData(cResp.data.reporte)
        } catch (e) { 
            console.error(e) 
            toast.error('Error al generar el reporte. Verifica los filtros o intenta de nuevo.')
        }
        finally { setLoading(false) }
    }

    const chartData = (data?.por_dia || []).map(d => ({
        fecha: new Date(d.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
        total: parseFloat(d.total || 0),
        costo: parseFloat(d.costo || 0),
        ventas: parseInt(d.ventas || 0),
        iva: parseFloat(d.iva || 0),
    }))

    const userChartData = (userData || []).map(u => ({
        nombre: u.nombre.split(' ')[0],
        total: parseFloat(u.ingresos_totales || 0),
    })).filter(u => u.total > 0)

    const clientChartData = (clientData || []).slice(0, 5).map(c => ({
        nombre: c.nombre.split(' ')[0],
        total: parseFloat(c.total_gastado || 0),
    }))

    const COLORS = ['#c44ff0', '#a78bfa', '#3b82f6', '#10b981', '#f59e0b', '#ef4444']

    const getStatus = (total) => {
        if (total >= 5000) return { label: 'Platinum', color: 'text-blue-700 bg-blue-50 border-blue-100', icon: Crown }
        if (total >= 2000) return { label: 'Gold', color: 'text-amber-700 bg-amber-50 border-amber-100', icon: Star }
        if (total >= 1000) return { label: 'Silver', color: 'text-gray-700 bg-gray-50 border-gray-100', icon: Award }
        return { label: 'Bronze', color: 'text-orange-700 bg-orange-50 border-orange-100', icon: ShoppingBag }
    }

    return (
        <div className="space-y-6 pb-10">

            <div className="card">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                    <div>
                        <h3 className="font-semibold text-gray-700 text-sm">Filtros de Reporte</h3>
                        <p className="text-xs text-gray-400">Analiza el rendimiento por período</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {[
                            { id: 'general', label: 'General', icon: FileText },
                            { id: 'kpi', label: 'Dashboard KPI', icon: TrendingUp },
                            { id: 'usuarios', label: 'Staff', icon: Users },
                            { id: 'clientes', label: 'Clientes', icon: Star },
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setTab(t.id)}
                                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${tab === t.id ? 'bg-orchid-600 text-white shadow-lg shadow-orchid-200' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                            >
                                <t.icon size={14} />
                                {t.label}
                            </button>
                        ))}
                        <div className="h-8 w-px bg-gray-100 mx-2 hidden sm:block" />
                        <button onClick={exportCSV} className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all flex items-center gap-2">
                            <FileText size={14} />
                            CSV
                        </button>
                        <button onClick={exportXLSX} className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all flex items-center gap-2">
                            <FileText size={14} />
                            XLSX
                        </button>
                        <button onClick={exportPDF} className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all flex items-center gap-2">
                            <TrendingUp size={14} />
                            PDF
                        </button>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-end">
                    <div className="w-full sm:w-auto">
                        <label className="label">Fecha inicio</label>
                        <input type="date" className="input w-full sm:w-44" value={filtros.fecha_inicio} onChange={e => setFiltros(p => ({ ...p, fecha_inicio: e.target.value }))} />
                    </div>
                    <div className="w-full sm:w-auto">
                        <label className="label">Fecha fin</label>
                        <input type="date" className="input w-full sm:w-44" value={filtros.fecha_fin} onChange={e => setFiltros(p => ({ ...p, fecha_fin: e.target.value }))} />
                    </div>
                    <button onClick={buscar} disabled={loading} className="btn-primary w-full sm:w-auto justify-center">
                        {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search size={16} />}
                        Generar reporte
                    </button>
                </div>
            </div>

            {!data && !loading && (
                <div className="text-center py-20 text-gray-400">
                    <FileText size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium">Selecciona un período y genera el reporte</p>
                    <p className="text-sm mt-1">Analiza ventas, desempeño de staff y lealtad de clientes</p>
                </div>
            )}

            <div id="reporte-content" className={data ? "space-y-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm" : ""}>
                
                {data && (
                    <div className="relative overflow-hidden rounded-2xl border border-orchid-100 bg-gradient-to-br from-orchid-50 via-white to-rose-50 p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-4">
                            {config?.ticket_logo ? (
                                <img src={config.ticket_logo} alt="logo" className="w-16 h-16 object-contain" />
                            ) : (
                                <div className="w-16 h-16 bg-orchid-100 rounded-2xl flex items-center justify-center text-orchid-600">
                                    <Star size={32} />
                                </div>
                            )}
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 uppercase">{config?.ticket_nombre_negocio || 'Balashte orquideas y anturios'}</h2>
                                <p className="text-xs font-bold text-orchid-700 uppercase tracking-widest mt-1">Reporte Ejecutivo · {tab}</p>
                            </div>
                        </div>
                        <div className="text-left md:text-right">
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Periodo del reporte</p>
                            <p className="text-lg font-bold text-gray-700">{new Date(filtros.fecha_inicio).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })} al {new Date(filtros.fecha_fin).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            <p className="text-[10px] text-gray-400 mt-1">Generado el {new Date().toLocaleString()}</p>
                        </div>
                    </div>
                    </div>
                )}

                {data && tab === 'general' && (
                <>
                    {/* KPIs */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: 'Total ventas', value: data.totales?.total_ventas || 0, sub: 'transacciones', color: 'text-orchid-700', accent: 'bg-orchid-500', icon: TrendingUp },
                            { label: 'Ingresos brutos', value: fmt(data.totales?.subtotal), sub: 'antes de IVA', color: 'text-blue-700', accent: 'bg-blue-500', icon: DollarSign },
                            { label: 'Costo de ventas', value: fmt(data.totales?.costo_total), sub: 'costo estimado', color: 'text-rose-700', accent: 'bg-rose-500', icon: ShoppingBag },
                            { label: 'Utilidad bruta', value: fmt(data.totales?.subtotal - data.totales?.costo_total), sub: 'margen estimado', color: 'text-emerald-700', accent: 'bg-emerald-500', icon: Crown },
                        ].map((k, i) => (
                            <div key={i} className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                                <div className={`absolute inset-x-0 top-0 h-1 ${k.accent}`} />
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[11px] text-gray-400 uppercase tracking-wide font-bold mb-2">{k.label}</p>
                                        <p className={`text-2xl font-display font-black ${k.color}`}>{k.value}</p>
                                    </div>
                                    <div className="rounded-xl bg-gray-50 p-2 text-gray-400">
                                        <k.icon size={18} />
                                    </div>
                                </div>
                                <div className="relative z-10">
                                    <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="card lg:col-span-2">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-gray-800 text-sm">Ventas vs Costos</h3>
                                <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider">
                                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-orchid-500" /> Venta</div>
                                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-400" /> Costo</div>
                                </div>
                            </div>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={6} barCategoryGap="28%">
                                    <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                                    <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: '12px', fontSize: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                    <Bar dataKey="total" name="Venta" fill="#a855f7" radius={[6, 6, 0, 0]} opacity={0.9} maxBarSize={34} />
                                    <Bar dataKey="costo" name="Costo" fill="#fb7185" radius={[6, 6, 0, 0]} opacity={0.9} maxBarSize={34} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="card">
                            <h3 className="font-bold text-gray-800 text-sm mb-4">Top 10 Productos</h3>
                            <div className="report-table-scroll space-y-3 pr-1">
                                {(data.top_productos || []).slice(0, 10).map((p, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-6 h-6 shrink-0 rounded-lg bg-gray-50 flex items-center justify-center text-[10px] font-bold text-gray-400">{i + 1}</div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-gray-700 truncate">{p.nombre}</p>
                                            <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                                                <div 
                                                    className="h-full bg-orchid-500 rounded-full" 
                                                    style={{ width: `${(p.cantidad / data.top_productos[0].cantidad) * 100}%` }} 
                                                />
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-bold text-gray-800">{p.cantidad}</p>
                                            <p className="text-[9px] text-gray-400">{fmt(p.total)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                        <div className="card">
                            <h3 className="font-bold text-gray-800 text-sm mb-4">Métodos de pago</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {(data.por_metodo || []).map((m, i) => {
                                    const total = (data.por_metodo || []).reduce((s, x) => s + parseFloat(x.total || 0), 0)
                                    const percentage = total > 0 ? Math.round(parseFloat(m.total) / total * 100) : 0
                                    return (
                                        <div key={i} className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-gray-600 capitalize font-medium">{m.metodo_pago}</span>
                                                <span className="font-semibold">{percentage}% · {fmt(m.total)}</span>
                                            </div>
                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <div className="card">
                            <h3 className="font-bold text-gray-800 text-sm mb-4">Detalle por Día</h3>
                            <div className="report-table-scroll overflow-auto">
                                <table className="report-table w-full min-w-[720px]">
                                    <thead className="bg-gray-50/50 border-b border-gray-50">
                                        <tr>
                                            <th className="th">Fecha</th>
                                            <th className="th text-center">Ventas</th>
                                            <th className="th text-right">Subtotal</th>
                                            <th className="th text-right">IVA</th>
                                            <th className="th text-right">Total</th>
                                            <th className="th text-right">Costo</th>
                                            <th className="th text-right">Utilidad</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(data.por_dia || []).map((d, i) => (
                                            <tr key={i} className="table-row">
                                                <td className="td">{dateOnly(d.fecha)}</td>
                                                <td className="td text-center">{d.ventas}</td>
                                                <td className="td text-right">{fmt(d.subtotal)}</td>
                                                <td className="td text-right">{fmt(d.iva)}</td>
                                                <td className="td text-right font-semibold">{fmt(d.total)}</td>
                                                <td className="td text-right">{fmt(d.costo)}</td>
                                                <td className="td text-right font-semibold text-emerald-700">{fmt(num(d.subtotal) - num(d.costo))}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="card">
                            <h3 className="font-bold text-gray-800 text-sm mb-4">Ventas por Categoría</h3>
                            <div className="report-table-scroll overflow-auto">
                                <table className="report-table w-full min-w-[620px]">
                                    <thead className="bg-gray-50/50 border-b border-gray-50">
                                        <tr>
                                            <th className="th">Categoría</th>
                                            <th className="th text-center">Cantidad</th>
                                            <th className="th text-right">Total</th>
                                            <th className="th text-right">Costo</th>
                                            <th className="th text-right">Utilidad</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(data.por_categoria || []).map((c, i) => (
                                            <tr key={i} className="table-row">
                                                <td className="td font-medium">{c.categoria}</td>
                                                <td className="td text-center">{c.cantidad}</td>
                                                <td className="td text-right">{fmt(c.total)}</td>
                                                <td className="td text-right">{fmt(c.costo)}</td>
                                                <td className="td text-right font-semibold text-emerald-700">{fmt(c.utilidad)}</td>
                                            </tr>
                                        ))}
                                        {(!data.por_categoria || data.por_categoria.length === 0) && (
                                            <tr><td colSpan={5} className="text-center py-8 text-gray-400">No hay ventas por categoría en este período</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <h3 className="font-bold text-gray-800 text-sm mb-4">Detalle de Ventas</h3>
                        <div className="report-table-scroll max-h-[520px] overflow-auto">
                            <table className="report-table report-detail-table w-full min-w-[980px]">
                                <thead className="bg-gray-50/50 border-b border-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="th">Folio</th>
                                        <th className="th">Fecha</th>
                                        <th className="th">Cliente</th>
                                        <th className="th">Vendedor</th>
                                        <th className="th">Método</th>
                                        <th className="th text-center">Art.</th>
                                        <th className="th text-right">Subtotal</th>
                                        <th className="th text-right">IVA</th>
                                        <th className="th text-right">Total</th>
                                        <th className="th text-right">Costo</th>
                                        <th className="th text-right">Utilidad</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(data.detalle_ventas || []).map((v) => (
                                        <tr key={v.id} className="table-row">
                                            <td className="td font-semibold">{v.folio}</td>
                                            <td className="td">{dateTime(v.created_at)}</td>
                                            <td className="td">{v.cliente}</td>
                                            <td className="td">{v.vendedor}</td>
                                            <td className="td capitalize">{v.metodo_pago}</td>
                                            <td className="td text-center">{v.articulos}</td>
                                            <td className="td text-right">{fmt(v.subtotal)}</td>
                                            <td className="td text-right">{fmt(v.iva)}</td>
                                            <td className="td text-right font-semibold">{fmt(v.total)}</td>
                                            <td className="td text-right">{fmt(v.costo)}</td>
                                            <td className="td text-right font-semibold text-emerald-700">{fmt(v.utilidad)}</td>
                                        </tr>
                                    ))}
                                    {(!data.detalle_ventas || data.detalle_ventas.length === 0) && (
                                        <tr><td colSpan={11} className="text-center py-10 text-gray-400">No hay ventas en este período</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {data && tab === 'kpi' && (
                <div className="space-y-6 bg-slate-50/50 p-6 rounded-3xl border border-gray-100/80 shadow-inner">
                    <h2 className="text-3xl font-extrabold text-center text-slate-800 tracking-tight mb-6 mt-2">KPI Dashboard</h2>
                    {(() => {
                        const totales = data.totales || {}
                        const totalVentas = num(totales.total_ventas)
                        const subtotal = num(totales.subtotal)
                        const costo = num(totales.costo_total)
                        const iva = num(totales.iva)
                        const descuentos = num(totales.descuentos)
                        const utilidad = subtotal - costo
                        const margen = subtotal > 0 ? (utilidad / subtotal * 100) : 0
                        const ticketProm = totalVentas > 0 ? num(totales.total) / totalVentas : 0
                        const topVendedor = (userData || []).length > 0
                            ? (userData || []).reduce((a, b) => num(b.ingresos_totales) > num(a.ingresos_totales) ? b : a)
                            : { nombre: '—', ingresos_totales: 0, total_ventas: 0 }
                        const topCliente = (clientData || []).length > 0
                            ? (clientData || []).reduce((a, b) => num(b.total_gastado) > num(a.total_gastado) ? b : a)
                            : { nombre: '—', total_gastado: 0, total_compras: 0 }
                        const metodoColors = ['#a855f7', '#3b82f6', '#10b981', '#f59e0b']
                        const catColors = ['#a855f7','#3b82f6','#10b981','#f59e0b','#ef4444']
                        const prodColors = ['#a855f7','#8b5cf6','#7c3aed','#6d28d9','#5b21b6','#4c1d95','#3b82f6','#2563eb','#1d4ed8','#1e40af']

                        return (
                            <>
                                {/* 6 KPI Cards */}
                                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                                    {[
                                        { label: 'Total Ventas', value: totalVentas.toLocaleString(), sub: 'transacciones', bg: 'bg-orchid-50', text: 'text-orchid-700', icon: '🛒' },
                                        { label: 'Ticket Promedio', value: fmt(ticketProm), sub: 'por transacción', bg: 'bg-blue-50', text: 'text-blue-700', icon: '🎫' },
                                        { label: 'Margen Bruto', value: `${margen.toFixed(1)}%`, sub: fmt(utilidad) + ' utilidad', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: '📈' },
                                        { label: 'IVA Generado', value: fmt(iva), sub: 'total cobrado', bg: 'bg-amber-50', text: 'text-amber-700', icon: '🏛️' },
                                        { label: 'Descuentos', value: fmt(descuentos), sub: 'otorgados', bg: 'bg-red-50', text: 'text-red-700', icon: '🏷️' },
                                        { label: 'Costo Total', value: fmt(costo), sub: 'mercancía vendida', bg: 'bg-indigo-50', text: 'text-indigo-700', icon: '📦' },
                                    ].map((k, i) => (
                                        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                                            <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${k.bg} text-lg mb-3`}>{k.icon}</div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{k.label}</p>
                                            <p className={`text-xl font-black ${k.text} leading-tight`}>{k.value}</p>
                                            <p className="text-[10px] text-slate-400 mt-1">{k.sub}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Row 2 */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                    {/* Pie por método */}
                                    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Ventas por Método de Pago</h3>
                                        {(data.por_metodo || []).length > 0 ? (
                                            <>
                                                <ResponsiveContainer width="100%" height={180}>
                                                    <PieChart>
                                                        <Pie data={(data.por_metodo || []).map(m => ({ name: m.metodo_pago, value: num(m.total) }))} cx="50%" cy="50%" outerRadius={80} innerRadius={45} dataKey="value" stroke="none">
                                                            {(data.por_metodo || []).map((_, i) => <Cell key={i} fill={metodoColors[i % metodoColors.length]} />)}
                                                        </Pie>
                                                        <Tooltip formatter={v => fmt(v)} contentStyle={{ borderRadius: '12px', fontSize: '11px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                                <div className="space-y-2 mt-2">
                                                    {(data.por_metodo || []).map((m, i) => {
                                                        const tot = (data.por_metodo || []).reduce((s, x) => s + num(x.total), 0)
                                                        return (
                                                            <div key={i} className="flex items-center justify-between text-[11px]">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: metodoColors[i % metodoColors.length] }} />
                                                                    <span className="capitalize font-medium text-slate-600">{m.metodo_pago}</span>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className="font-bold text-slate-700">{pct(m.total, tot)}</span>
                                                                    <span className="text-slate-400 ml-1">· {fmt(m.total)}</span>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </>
                                        ) : <p className="text-center text-slate-400 text-xs py-16">Sin datos</p>}
                                    </div>

                                    {/* Top Categorías */}
                                    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Top Categorías</h3>
                                        <div className="space-y-3">
                                            {(data.por_categoria || []).slice(0, 5).map((c, i) => {
                                                const maxCat = num((data.por_categoria || [])[0]?.total)
                                                return (
                                                    <div key={i}>
                                                        <div className="flex justify-between text-[11px] mb-1">
                                                            <span className="font-semibold text-slate-700 truncate max-w-[130px]">{c.categoria}</span>
                                                            <div className="text-right shrink-0">
                                                                <span className="font-bold text-slate-800">{fmt(c.total)}</span>
                                                                <span className="text-slate-400 ml-1">({c.cantidad} uds)</span>
                                                            </div>
                                                        </div>
                                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${maxCat > 0 ? (num(c.total)/maxCat*100) : 0}%`, backgroundColor: catColors[i] }} />
                                                        </div>
                                                        <p className="text-[9px] text-slate-400 mt-0.5">Margen: {pct(c.utilidad, num(c.total))}</p>
                                                    </div>
                                                )
                                            })}
                                            {(!data.por_categoria || data.por_categoria.length === 0) && <p className="text-center text-slate-400 text-xs py-10">Sin datos</p>}
                                        </div>
                                    </div>

                                    {/* Top Vendedor / Top Cliente / Eficiencia */}
                                    <div className="space-y-4">
                                        <div className="bg-gradient-to-br from-orchid-600 to-purple-700 rounded-2xl p-5 shadow-lg shadow-orchid-200 text-white">
                                            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-3">⭐ Top Vendedor del Período</p>
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-xl font-black">{topVendedor.nombre.charAt(0)}</div>
                                                <div>
                                                    <p className="font-black text-lg leading-tight">{topVendedor.nombre}</p>
                                                    <p className="text-xs opacity-70">{fmt(topVendedor.ingresos_totales)} en ventas</p>
                                                    <p className="text-xs opacity-60">{topVendedor.total_ventas} transacciones</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 shadow-lg shadow-blue-200 text-white">
                                            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-3">👑 Top Cliente del Período</p>
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-xl font-black">{topCliente.nombre.charAt(0)}</div>
                                                <div>
                                                    <p className="font-black text-lg leading-tight">{topCliente.nombre}</p>
                                                    <p className="text-xs opacity-70">{fmt(topCliente.total_gastado)} gastado</p>
                                                    <p className="text-xs opacity-60">{topCliente.total_compras} compras · {Math.floor(num(topCliente.total_gastado) / 10)} pts</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Eficiencia Operativa</p>
                                            <div className="space-y-3">
                                                {[{ label: 'Margen bruto', val: margen, color: 'bg-emerald-500', textColor: 'text-emerald-600', fmt: v => `${v.toFixed(1)}%` },
                                                  { label: '% Descuentos/Subtotal', val: subtotal > 0 ? descuentos/subtotal*100 : 0, color: 'bg-amber-400', textColor: 'text-amber-600', fmt: v => `${v.toFixed(1)}%` },
                                                  { label: '% Costo/Ingresos', val: subtotal > 0 ? costo/subtotal*100 : 0, color: 'bg-rose-400', textColor: 'text-rose-600', fmt: v => `${v.toFixed(1)}%` }
                                                ].map((bar, i) => (
                                                    <div key={i}>
                                                        <div className="flex justify-between text-[11px] mb-1">
                                                            <span className="text-slate-500">{bar.label}</span>
                                                            <span className={`font-bold ${bar.textColor}`}>{bar.fmt(bar.val)}</span>
                                                        </div>
                                                        <div className="h-2 bg-slate-100 rounded-full"><div className={`h-full rounded-full ${bar.color}`} style={{ width: `${Math.min(bar.val, 100)}%` }} /></div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Row 3: Tendencia + Top Productos */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Tendencia de Ventas Diarias</h3>
                                        {(data.por_dia || []).length > 0 ? (
                                            <>
                                                <ResponsiveContainer width="100%" height={200}>
                                                    <BarChart data={(data.por_dia || []).map(d => ({ fecha: new Date(d.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }), total: num(d.total), utilidad: num(d.subtotal) - num(d.costo) }))} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={4} barCategoryGap="30%">
                                                        <XAxis dataKey="fecha" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                                        <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                                                        <Tooltip formatter={v => fmt(v)} contentStyle={{ borderRadius: '12px', fontSize: '11px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                                        <Bar dataKey="total" name="Venta" fill="#a855f7" radius={[6,6,0,0]} maxBarSize={28} opacity={0.85} />
                                                        <Bar dataKey="utilidad" name="Utilidad" fill="#10b981" radius={[6,6,0,0]} maxBarSize={28} opacity={0.85} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                                <div className="flex gap-4 mt-2 text-[10px] font-bold uppercase tracking-wider">
                                                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-orchid-500" /> Total Venta</div>
                                                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Utilidad</div>
                                                </div>
                                            </>
                                        ) : <p className="text-center text-slate-400 text-xs py-16">Sin datos de ventas diarias</p>}
                                    </div>
                                    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Top 10 Productos más Vendidos</h3>
                                        <div className="space-y-2.5 overflow-y-auto max-h-[240px] pr-1">
                                            {(data.top_productos || []).slice(0, 10).map((p, i) => {
                                                const maxQ = num((data.top_productos || [])[0]?.cantidad)
                                                return (
                                                    <div key={i} className="flex items-center gap-3">
                                                        <div className="w-5 h-5 shrink-0 rounded-lg flex items-center justify-center text-[9px] font-black text-white" style={{ backgroundColor: prodColors[i] }}>{i+1}</div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between text-[11px] mb-0.5">
                                                                <span className="font-semibold text-slate-700 truncate max-w-[160px]">{p.nombre}</span>
                                                                <span className="font-bold text-slate-800 shrink-0 ml-1">{p.cantidad} uds</span>
                                                            </div>
                                                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                <div className="h-full rounded-full" style={{ width: `${maxQ > 0 ? (num(p.cantidad)/maxQ*100) : 0}%`, backgroundColor: prodColors[i] }} />
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] text-slate-400 shrink-0">{fmt(p.total)}</span>
                                                    </div>
                                                )
                                            })}
                                            {(!data.top_productos || data.top_productos.length === 0) && <p className="text-center text-slate-400 text-xs py-10">Sin datos de productos</p>}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )
                    })()}

                    {/* Métricas Reales del Sistema */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Left Col: 3 metric cards con datos reales */}
                        <div className="space-y-3">
                            {/* Card 1: Total Artículos Vendidos */}
                            {(() => {
                                const totalArticulos = (data.top_productos || []).reduce((s, p) => s + num(p.cantidad), 0)
                                const maxDay = Math.max(...(data.por_dia || []).map(d => num(d.total)), 1)
                                const barData = (data.por_dia || []).slice(-6).map(d => Math.round((num(d.total) / maxDay) * 90) || 5)
                                const bars = barData.length >= 6 ? barData : [...Array(6 - barData.length).fill(5), ...barData]
                                return (
                                    <div className="bg-white rounded-[24px] border border-gray-100/90 p-5 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between h-[115px]">
                                        <div className="space-y-1">
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Artículos Vendidos</p>
                                            <p className="text-3xl font-black text-[#10c0b8] font-display">{totalArticulos.toLocaleString()}</p>
                                            <p className="text-[10px] text-slate-400">unidades en el período</p>
                                        </div>
                                        <div className="w-[110px] h-[55px] flex items-end justify-between px-1 shrink-0">
                                            {bars.map((h, i) => (
                                                <div key={i} className="w-[10px] rounded-[3px] transition-all hover:opacity-80" style={{ height: `${h}%`, backgroundColor: i === bars.length - 1 ? '#ff9655' : i === bars.length - 2 ? '#10c0b8' : '#3ee2d8' }} />
                                            ))}
                                        </div>
                                    </div>
                                )
                            })()}

                            {/* Card 2: Clientes Atendidos */}
                            {(() => {
                                const clientesUnicos = clientData?.length || 0
                                const maxCli = Math.max(clientesUnicos, 1)
                                const barsCli = (data.por_dia || []).slice(-6).map((_, i, arr) => {
                                    const idx = arr.length - 6 + i
                                    return idx >= 0 ? Math.max(Math.round(((idx + 1) / arr.length) * 80), 5) : 5
                                })
                                const barsCliPad = barsCli.length >= 6 ? barsCli : [...Array(6 - barsCli.length).fill(5), ...barsCli]
                                return (
                                    <div className="bg-white rounded-[24px] border border-gray-100/90 p-5 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between h-[115px]">
                                        <div className="space-y-1">
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Clientes Atendidos</p>
                                            <p className="text-3xl font-black text-[#10c0b8] font-display">{clientesUnicos.toLocaleString()}</p>
                                            <p className="text-[10px] text-slate-400">clientes en el período</p>
                                        </div>
                                        <div className="w-[110px] h-[55px] flex items-end justify-between px-1 shrink-0">
                                            {barsCliPad.map((h, i) => (
                                                <div key={i} className="w-[10px] rounded-[3px] transition-all hover:opacity-80" style={{ height: `${h}%`, backgroundColor: i === barsCliPad.length - 1 ? '#ff9655' : i === barsCliPad.length - 2 ? '#3ee2d8' : '#10c0b8' }} />
                                            ))}
                                        </div>
                                    </div>
                                )
                            })()}

                            {/* Card 3: Promedio Diario de Ingresos */}
                            {(() => {
                                const dias = (data.por_dia || []).length || 1
                                const promDiario = num(data.totales?.total) / dias
                                const maxDia = Math.max(...(data.por_dia || []).map(d => num(d.total)), 1)
                                const barsD = (data.por_dia || []).slice(-6).map(d => Math.max(Math.round((num(d.total) / maxDia) * 90), 5))
                                const barsDPad = barsD.length >= 6 ? barsD : [...Array(6 - barsD.length).fill(5), ...barsD]
                                return (
                                    <div className="bg-white rounded-[24px] border border-gray-100/90 p-5 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between h-[115px]">
                                        <div className="space-y-1">
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Promedio Diario</p>
                                            <p className="text-3xl font-black text-[#10c0b8] font-display">{fmt(promDiario)}</p>
                                            <p className="text-[10px] text-slate-400">ingresos / día</p>
                                        </div>
                                        <div className="w-[110px] h-[55px] flex items-end justify-between px-1 shrink-0">
                                            {barsDPad.map((h, i) => (
                                                <div key={i} className="w-[10px] rounded-[3px] transition-all hover:opacity-80" style={{ height: `${h}%`, backgroundColor: i === barsDPad.length - 1 ? '#ff9655' : i === barsDPad.length - 2 ? '#ffb080' : '#10c0b8' }} />
                                            ))}
                                        </div>
                                    </div>
                                )
                            })()}
                        </div>
                    </div>

                        {/* Indicadores de Rentabilidad + Pie de Métodos de Pago */}
                        <div className="bg-white rounded-[32px] border border-gray-100/90 p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
                            {/* Métricas de rentabilidad reales */}
                            <div className="flex-1 space-y-6 w-full">
                                {/* Indicador 1: Ingreso por cliente */}
                                <div className="flex items-start gap-4">
                                    <div className="w-[44px] h-[44px] rounded-[14px] bg-[#5584e8]/10 shrink-0 flex items-center justify-center">
                                        <div className="w-[18px] h-[18px] rounded-[5px] bg-[#5584e8]" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <h4 className="text-sm font-black text-slate-700">Ingreso por Cliente</h4>
                                        <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                                            Promedio de ingreso generado por cada cliente atendido en el período.
                                        </p>
                                        <p className="text-base font-black text-[#5584e8]">{fmt(num(data.totales?.subtotal) / (clientData?.length || 1))}</p>
                                    </div>
                                </div>

                                {/* Indicador 2: Costo por transacción */}
                                <div className="flex items-start gap-4">
                                    <div className="w-[44px] h-[44px] rounded-[14px] bg-[#ff9655]/10 shrink-0 flex items-center justify-center">
                                        <div className="w-[18px] h-[18px] rounded-[5px] bg-[#ff9655]" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <h4 className="text-sm font-black text-[#ff9655]">Costo por Transacción</h4>
                                        <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                                            Costo promedio de mercancía vendida por cada venta realizada.
                                        </p>
                                        <p className="text-base font-black text-[#ff9655]">{fmt(num(data.totales?.costo_total) / (num(data.totales?.total_ventas) || 1))}</p>
                                    </div>
                                </div>

                                {/* Indicador 3: Utilidad por transacción */}
                                <div className="flex items-start gap-4">
                                    <div className="w-[44px] h-[44px] rounded-[14px] bg-[#10c0b8]/10 shrink-0 flex items-center justify-center">
                                        <div className="w-[18px] h-[18px] rounded-[5px] bg-[#10c0b8]" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <h4 className="text-sm font-black text-[#10c0b8]">Utilidad por Transacción</h4>
                                        <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                                            Ganancia neta promedio generada por cada venta en el período.
                                        </p>
                                        <p className="text-base font-black text-[#10c0b8]">{fmt((num(data.totales?.subtotal) - num(data.totales?.costo_total)) / (num(data.totales?.total_ventas) || 1))}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Pie Chart: Métodos de pago reales */}
                            <div className="w-full md:w-auto flex flex-col items-center justify-center shrink-0 pr-4">
                                <h4 className="text-xs font-black text-slate-500 mb-4 text-center uppercase tracking-widest">Métodos de Pago</h4>
                                {(data.por_metodo || []).length > 0 ? (
                                    <>
                                        <div className="relative w-[180px] h-[180px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={(data.por_metodo || []).map(m => ({ name: m.metodo_pago, value: num(m.total) }))}
                                                        cx="50%"
                                                        cy="50%"
                                                        outerRadius={90}
                                                        innerRadius={0}
                                                        dataKey="value"
                                                        stroke="none"
                                                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                                            const RADIAN = Math.PI / 180
                                                            const radius = innerRadius + (outerRadius - innerRadius) * 0.5
                                                            const x = cx + radius * Math.cos(-midAngle * RADIAN)
                                                            const y = cy + radius * Math.sin(-midAngle * RADIAN)
                                                            return percent > 0.05 ? (
                                                                <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" style={{ fontSize: '10px', fontWeight: 900 }}>
                                                                    {`${(percent * 100).toFixed(0)}%`}
                                                                </text>
                                                            ) : null
                                                        }}
                                                        labelLine={false}
                                                    >
                                                        {(data.por_metodo || []).map((_, i) => (
                                                            <Cell key={i} fill={['#5584e8', '#ff9655', '#10c0b8', '#a855f7', '#10b981'][i % 5]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: '12px', fontSize: '11px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="space-y-1.5 mt-3 w-full">
                                            {(data.por_metodo || []).map((m, i) => {
                                                const tot = (data.por_metodo || []).reduce((s, x) => s + num(x.total), 0)
                                                const colors = ['#5584e8', '#ff9655', '#10c0b8', '#a855f7', '#10b981']
                                                return (
                                                    <div key={i} className="flex items-center justify-between text-[10px]">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[i % 5] }} />
                                                            <span className="capitalize text-slate-600 font-medium">{m.metodo_pago}</span>
                                                        </div>
                                                        <span className="font-bold text-slate-700">{pct(m.total, tot)} · {fmt(m.total)}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </>
                                ) : <p className="text-center text-slate-400 text-xs py-16">Sin datos de pagos</p>}
                            </div>
                        </div>

                    {/* Bottom Panel: Tendencia de Ventas del Período */}
                    <div className="bg-white rounded-[32px] border border-gray-100/90 p-8 shadow-sm relative overflow-hidden">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Tendencia de Ventas</h3>
                                <p className="text-[10px] text-slate-400 mt-0.5">Evolución diaria de ingresos y utilidad en el período</p>
                            </div>
                            <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider">
                                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#5584e8]" /> Ingresos</div>
                                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#10c0b8]" /> Utilidad</div>
                                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#ff9655]" /> Costo</div>
                            </div>
                        </div>
                        {(data.por_dia || []).length > 0 ? (
                            <ResponsiveContainer width="100%" height={220}>
                                <LineChart
                                    data={(data.por_dia || []).map(d => ({
                                        fecha: new Date(d.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
                                        ingresos: num(d.subtotal),
                                        utilidad: num(d.subtotal) - num(d.costo),
                                        costo: num(d.costo),
                                    }))}
                                    margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                                >
                                    <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                                    <Tooltip
                                        formatter={(v, name) => [fmt(v), name === 'ingresos' ? 'Ingresos' : name === 'utilidad' ? 'Utilidad' : 'Costo']}
                                        contentStyle={{ borderRadius: '14px', fontSize: '11px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.15)' }}
                                    />
                                    <Line type="monotone" dataKey="ingresos" stroke="#5584e8" strokeWidth={2.5} dot={{ r: 4, fill: '#5584e8', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                                    <Line type="monotone" dataKey="utilidad" stroke="#10c0b8" strokeWidth={2.5} dot={{ r: 4, fill: '#10c0b8', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                                    <Line type="monotone" dataKey="costo" stroke="#ff9655" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3, fill: '#ff9655', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 5 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-[220px] text-slate-300">
                                <p className="text-sm">Sin datos de ventas diarias en este período</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {data && tab === 'usuarios' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 card">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-semibold text-gray-700 text-sm">Vendedores</h3>
                            <div className="flex items-center gap-2 bg-orchid-50 p-2 px-3 rounded-xl">
                                <Percent size={14} className="text-orchid-600" />
                                <input type="number" className="w-10 bg-transparent text-xs font-bold text-orchid-700 focus:outline-none" value={comision} onChange={e => setComision(e.target.value)} />
                                <span className="text-xs font-bold text-orchid-700">% Comisión</span>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50/50 border-b border-gray-50">
                                    <tr>
                                        <th className="th py-4">Usuario</th>
                                        <th className="th py-4 text-center">Ventas</th>
                                        <th className="th py-4 text-right">Total</th>
                                        <th className="th py-4 text-right bg-orchid-50/30 text-orchid-700">Beneficio</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(userData || []).map((u, i) => (
                                        <tr key={i} className="table-row border-b border-gray-50 last:border-0 hover:bg-gray-50/30 transition-colors">
                                            <td className="td py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-orchid-100 flex items-center justify-center text-orchid-700 font-bold text-xs">{u.nombre.charAt(0)}</div>
                                                    <div><p className="font-semibold text-gray-800 text-sm">{u.nombre}</p><p className="text-[10px] text-gray-400 uppercase">{u.rol}</p></div>
                                                </div>
                                            </td>
                                            <td className="td text-center"><span className="badge-purple">{u.total_ventas}</span></td>
                                            <td className="td text-right font-medium">{fmt(u.ingresos_totales)}</td>
                                            <td className="td text-right font-bold text-orchid-700 bg-orchid-50/20">{fmt(u.ingresos_totales * (comision / 100))}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="card">
                        <h3 className="font-semibold text-gray-700 text-sm mb-6">Ranking Ventas</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={userChartData} layout="vertical" margin={{ left: -10 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="nombre" type="category" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={60} />
                                <Tooltip formatter={v => fmt(v)} />
                                <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={24}>
                                    {userChartData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {data && tab === 'clientes' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 card">
                        <h3 className="font-semibold text-gray-700 text-sm mb-6">Fidelización de Clientes</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50/50 border-b border-gray-50">
                                    <tr>
                                        <th className="th py-4">Cliente</th>
                                        <th className="th py-4 text-center">Status</th>
                                        <th className="th py-4 text-center">Compras</th>
                                        <th className="th py-4 text-right">Puntos</th>
                                        <th className="th py-4 text-right">Total Gastado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(clientData || []).map((c, i) => {
                                        const status = getStatus(c.total_gastado)
                                        const puntos = Math.floor(c.total_gastado / 10)
                                        return (
                                            <tr key={i} className="table-row border-b border-gray-50 last:border-0 hover:bg-gray-50/30 transition-colors">
                                                <td className="td py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">{c.nombre.charAt(0)}</div>
                                                        <div><p className="font-semibold text-gray-800 text-sm">{c.nombre}</p><p className="text-[10px] text-gray-400">{c.email || 'Sin email'}</p></div>
                                                    </div>
                                                </td>
                                                <td className="td text-center">
                                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase border ${status.color} flex items-center justify-center gap-1 w-20 mx-auto`}>
                                                        <status.icon size={10} />
                                                        {status.label}
                                                    </span>
                                                </td>
                                                <td className="td text-center"><span className="badge-blue">{c.total_compras}</span></td>
                                                <td className="td text-right font-bold text-orchid-600">{puntos} pts</td>
                                                <td className="td text-right font-medium text-gray-700">{fmt(c.total_gastado)}</td>
                                            </tr>
                                        )
                                    })}
                                    {(!clientData || clientData.length === 0) && (
                                        <tr><td colSpan={5} className="text-center py-10 text-gray-400">No hay datos de clientes para este período</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="card">
                            <h3 className="font-semibold text-gray-700 text-sm mb-6">Top Clientes</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={clientChartData} layout="vertical" margin={{ left: -10 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="nombre" type="category" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={60} />
                                    <Tooltip formatter={v => fmt(v)} />
                                    <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={24}>
                                        {clientChartData.map((e, i) => <Cell key={i} fill={COLORS[(i+2) % COLORS.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="card bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-xl shadow-blue-200">
                            <div className="flex items-start justify-between mb-6">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                    <Star size={20} />
                                </div>
                                <span className="text-[10px] font-bold uppercase bg-white/20 px-2 py-1 rounded-lg">Programa Loyalty</span>
                            </div>
                            <h4 className="font-display font-bold text-lg mb-1">Beneficios para Clientes</h4>
                            <p className="text-xs text-blue-100 mb-4 opacity-80">Ranking de fidelidad basado en compras acumuladas y puntos generados (1 pto = $10).</p>
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <p className="text-[10px] text-blue-200 uppercase font-bold">Total Puntos</p>
                                    <p className="text-2xl font-bold">{Math.floor(clientData?.reduce((s, c) => s + parseFloat(c.total_gastado), 0) / 10 || 0)}</p>
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] text-blue-200 uppercase font-bold">Clientes VIP</p>
                                    <p className="text-2xl font-bold">{clientData?.filter(c => c.total_gastado >= 2000).length || 0}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    )
}
