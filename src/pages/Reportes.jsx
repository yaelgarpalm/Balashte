import { useEffect, useState } from 'react'
import { reportesAPI, configuracionAPI } from '../services/api'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'
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

    const exportPDF = async () => {
        const element = document.getElementById('reporte-content');
        if (!element) return;
        
        const tid = toast.loading('Generando documento PDF profesional...');
        
        try {
            const html2canvas = (await import('html2canvas')).default;
            const { jsPDF } = await import('jspdf');
            
            document.body.classList.add('report-export-page');
            element.classList.add('report-export-mode');
            await new Promise(r => setTimeout(r, 500));

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                width: element.scrollWidth,
                height: element.scrollHeight,
                windowWidth: Math.max(1280, element.scrollWidth),
                windowHeight: element.scrollHeight,
            });
            
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 8;
            const imgWidth = pageWidth - margin * 2;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            const printableHeight = pageHeight - margin * 2;
            
            let remainingHeight = imgHeight;
            let position = margin;
            pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
            remainingHeight -= printableHeight;

            while (remainingHeight > 0) {
                pdf.addPage();
                position = margin - (imgHeight - remainingHeight);
                pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
                remainingHeight -= printableHeight;
            }

            pdf.save(`reporte_${tab}_${filtros.fecha_inicio}.pdf`);
            toast.success('PDF exportado correctamente', { id: tid });
        } catch (e) {
            console.error(e);
            toast.error('Error al generar PDF', { id: tid });
        } finally {
            element.classList.remove('report-export-mode');
            document.body.classList.remove('report-export-page');
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
