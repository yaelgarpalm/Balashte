import { useEffect, useState } from 'react'
import { reportesAPI, productosAPI, ventasAPI, clientesAPI, comprasAPI } from '../services/api'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, ShoppingBag, AlertTriangle, Users, ArrowRight, TrendingDown, Clock, Truck, DollarSign } from 'lucide-react'

import { Link } from 'react-router-dom'
import Modal from '../components/common/Modal'
import { useUI } from '../context/UIContext'

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

function StatCard({ icon: Icon, label, value, sub, color, onClick }) {
    return (
        <div 
            className={`stat-card transition-all ${onClick ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1 active:scale-95' : ''}`}
            onClick={onClick}
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">{label}</p>
                    <p className="text-2xl font-display font-bold text-gray-800">{value}</p>
                    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                    <Icon size={20} className="text-white" />
                </div>
            </div>
        </div>
    )
}

const COLORS = ['#5f0f40', '#0f4c5c', '#fb8b24', '#9a031e', '#e36414']

export default function Dashboard() {
    const { setTitulo, setSubtitulo } = useUI()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [modal, setModal] = useState(null) // null | 'hoy' | 'mes' | 'stock' | 'clientes' | 'compras'
    const [lowStockProds, setLowStockProds] = useState([])
    const [comprasAlertas, setComprasAlertas] = useState([])
    const [detailData, setDetailData] = useState([])
    const [loadingDetail, setLoadingDetail] = useState(false)

    useEffect(() => {
        setTitulo('Dashboard')
        setSubtitulo('Resumen del negocio')
        
        Promise.all([
            reportesAPI.dashboard(),
            productosAPI.bajoStock(),
            comprasAPI.alertas()
        ]).then(([r, s, c]) => {
            setData(r.data.dashboard)
            setLowStockProds(s.data.productos)
            setComprasAlertas(c.data.alertas)
        }).catch(() => { }).finally(() => setLoading(false))

        return () => {
            setTitulo('')
            setSubtitulo('')
        }
    }, [])

    const openVentasHoy = async () => {
        setModal('hoy')
        setLoadingDetail(true)
        try {
            const today = new Date().toISOString().split('T')[0]
            const { data } = await ventasAPI.getAll({ fecha_inicio: today, fecha_fin: today })
            setDetailData(data.ventas)
        } catch (e) { } finally { setLoadingDetail(false) }
    }

    const openVentasMes = async () => {
        setModal('mes')
        setLoadingDetail(true)
        try {
            const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
            const { data } = await ventasAPI.getAll({ fecha_inicio: firstDay })
            setDetailData(data.ventas)
        } catch (e) { } finally { setLoadingDetail(false) }
    }

    const openStockDetail = () => {
        setModal('stock')
        setDetailData(lowStockProds)
    }

    const openClientes = async () => {
        setModal('clientes')
        setLoadingDetail(true)
        try {
            const { data } = await clientesAPI.getAll({ limit: 50 })
            setDetailData(data.clientes)
        } catch (e) { } finally { setLoadingDetail(false) }
    }

    if (loading) return (
        <div className="grid grid-cols-4 gap-4 animate-pulse">
            {[...Array(8)].map((_, i) => <div key={i} className="h-28 bg-white rounded-2xl" />)}
        </div>
    )

    const ventasSemana = (data?.ventas_semana || []).map(d => ({
        fecha: new Date(d.fecha).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
        total: parseFloat(d.total_ingresos || 0),
    })).reverse()

    const metodoPago = [
        { name: 'Efectivo', value: parseFloat(data?.ventas_hoy?.ingresos || 0) * 0.6 },
        { name: 'Tarjeta', value: parseFloat(data?.ventas_hoy?.ingresos || 0) * 0.3 },
        { name: 'Transferencia', value: parseFloat(data?.ventas_hoy?.ingresos || 0) * 0.1 },
    ]

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    icon={ShoppingBag} 
                    label="Ventas hoy" 
                    value={fmt(data?.ventas_hoy?.ingresos)} 
                    sub={`Utilidad: ${fmt(data?.ventas_hoy?.utilidad)}`} 
                    color="bg-orchid-700" 
                    onClick={openVentasHoy}
                />
                <StatCard 
                    icon={TrendingUp} 
                    label="Ventas del mes" 
                    value={fmt(data?.ventas_mes?.ingresos)} 
                    sub={`Utilidad: ${fmt(data?.ventas_mes?.utilidad)}`} 
                    color="bg-jade-600" 
                    onClick={openVentasMes}
                />
                <StatCard 
                    icon={TrendingDown} 
                    label="Gastos del mes" 
                    value={fmt(data?.ventas_mes?.gastos)} 
                    sub="operativos y compras" 
                    color="bg-red-500" 
                />
                <StatCard 
                    icon={AlertTriangle} 
                    label="Bajo stock" 
                    value={data?.bajo_stock || 0} 
                    sub="productos por reabastecer" 
                    color="bg-amber-500" 
                    onClick={openStockDetail}
                />
            </div>

            {/* Ganancia Real Section */}
            <div className="bg-white rounded-3xl border border-orchid-100 p-6 shadow-xl shadow-orchid-100/20 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group">
                <div className="relative z-10 flex flex-col sm:flex-row items-center gap-8">
                    <div>
                        <p className="text-[10px] font-black text-orchid-400 uppercase tracking-widest mb-1">Ganancia Real (Mes)</p>
                        <h2 className="text-5xl font-black text-orchid-950 tracking-tighter">{fmt(data?.ventas_mes?.utilidad)}</h2>
                        <div className="flex items-center gap-4 mt-2">
                            <span className="text-[10px] font-bold text-gray-400">Ingresos: {fmt(data?.ventas_mes?.ingresos)}</span>
                            <span className="text-[10px] font-bold text-red-400">Gastos: {fmt(data?.ventas_mes?.gastos)}</span>
                            <span className="text-[10px] font-bold text-blue-400">Costo Prod: {fmt(data?.ventas_mes?.costo)}</span>
                        </div>
                    </div>
                </div>
                <div className="relative z-10 w-full md:w-auto">
                    <div className="bg-orchid-50 rounded-2xl p-4 border border-orchid-100">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp size={16} className="text-jade-600" />
                            <span className="text-xs font-black text-gray-700 uppercase tracking-tighter">Margen de Utilidad</span>
                        </div>
                        <div className="w-full bg-orchid-200 rounded-full h-2 mb-1">
                            <div 
                                className="bg-jade-500 h-2 rounded-full transition-all duration-1000" 
                                style={{ width: `${Math.min(100, (data?.ventas_mes?.utilidad / (data?.ventas_mes?.ingresos || 1)) * 100)}%` }}
                            />
                        </div>
                        <p className="text-right text-[10px] font-black text-jade-700">
                            {((data?.ventas_mes?.utilidad / (data?.ventas_mes?.ingresos || 1)) * 100).toFixed(1)}%
                        </p>
                    </div>
                </div>
                <div className="absolute right-0 top-0 text-orchid-50 opacity-10 group-hover:opacity-20 transition-opacity -translate-y-1/4 translate-x-1/4 pointer-events-none">
                    <TrendingUp size={240} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="card lg:col-span-2">
                    <h3 className="font-semibold text-gray-700 mb-4 text-sm">Ventas — últimos 7 días</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={ventasSemana} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gradOrchid" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#5f0f40" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#5f0f40" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                            <Tooltip formatter={(v) => [fmt(v), 'Ingresos']} contentStyle={{ borderRadius: '12px', border: '1px solid #eadde6', fontSize: '12px' }} />
                            <Area type="monotone" dataKey="total" stroke="#5f0f40" strokeWidth={2} fill="url(#gradOrchid)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div className="card">
                    <h3 className="font-semibold text-gray-700 mb-4 text-sm">Métodos de pago (hoy)</h3>
                    <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                            <Pie data={metodoPago} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                                {metodoPago.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                            </Pie>
                            <Tooltip formatter={(v) => [fmt(v)]} contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5 mt-2">
                        {metodoPago.map((m, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                                    <span className="text-gray-500">{m.name}</span>
                                </div>
                                <span className="font-medium text-gray-700">{fmt(m.value)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-700 text-sm">Últimas ventas</h3>
                        <Link to="/ventas" className="text-xs text-orchid-600 hover:underline">Ver todas</Link>
                    </div>
                    <div className="space-y-2">
                        {(data?.ultimas_ventas || []).length === 0 && <p className="text-sm text-gray-400 text-center py-4">Sin ventas aún</p>}
                        {(data?.ultimas_ventas || []).map((v, i) => (
                            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                <div>
                                    <p className="text-xs font-mono font-medium text-orchid-700">{v.folio}</p>
                                    <p className="text-xs text-gray-400">{v.cliente || 'Público general'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-gray-800">{fmt(v.total)}</p>
                                    <p className="text-xs text-gray-400 capitalize">{v.metodo_pago}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-700 text-sm">Top productos</h3>
                        <Link to="/productos" className="text-xs text-orchid-600 hover:underline">Ver inventario</Link>
                    </div>
                    <div className="space-y-2">
                        {(data?.top_productos || []).length === 0 && <p className="text-sm text-gray-400 text-center py-4">Sin datos</p>}
                        {(data?.top_productos || []).map((p, i) => (
                            <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                                <div className="w-6 h-6 rounded-full bg-orchid-100 flex items-center justify-center text-xs font-bold text-orchid-700 flex-shrink-0">{i + 1}</div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-700 truncate">{p.nombre}</p>
                                    <p className="text-xs text-gray-400">{p.categoria}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-xs font-semibold text-gray-700">{p.total_vendido} uds</p>
                                    <p className="text-xs text-green-600">{fmt(p.total_ingresos)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            {lowStockProds.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-amber-800">{lowStockProds.length} producto(s) con stock bajo</p>
                            <p className="text-xs text-amber-600">Revisa el inventario para reponer existencias.</p>
                        </div>
                        <Link to="/productos" className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 transition-colors">Ver inventario</Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {lowStockProds.map(p => (
                            <div key={p.id} className="flex items-center justify-between p-2.5 bg-white border border-amber-100 rounded-xl shadow-sm">
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-gray-800 truncate">{p.nombre}</p>
                                    <p className="text-[10px] text-gray-400">Stock: <span className="text-amber-600 font-bold">{p.stock}</span> / Mín: {p.stock_minimo}</p>
                                </div>
                                <Link to="/productos" className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors">
                                    <ArrowRight size={14} />
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {comprasAlertas.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <Clock size={18} className="text-rose-500 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-rose-800">{comprasAlertas.length} deuda(s) por pagar vencidas o próximas</p>
                            <p className="text-xs text-rose-600">Revisa tus cuentas por pagar para evitar recargos.</p>
                        </div>
                        <Link to="/compras?tab=deudas" className="text-xs bg-rose-500 text-white px-3 py-1.5 rounded-lg hover:bg-rose-600 transition-colors">Ver cuentas</Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {comprasAlertas.map(c => (
                            <div key={c.id} className="flex items-center justify-between p-2.5 bg-white border border-rose-100 rounded-xl shadow-sm">
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-gray-800 truncate">{c.folio}</p>
                                    <p className="text-[10px] text-gray-400">Proveedor: <span className="text-rose-600 font-bold">{c.proveedor}</span> | Vence: {new Date(c.fecha_vencimiento).toLocaleDateString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-rose-600">{fmt(c.saldo_pendiente)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Detail Modals */}
            {modal === 'hoy' && (
                <Modal title="Ventas de hoy" onClose={() => setModal(null)} maxWidth="max-w-2xl">
                    <div className="space-y-3">
                        {loadingDetail ? <p className="text-center py-8 text-gray-400 animate-pulse">Cargando...</p> : null}
                        {!loadingDetail && detailData.length === 0 && <p className="text-center py-8 text-gray-400">No hay ventas registradas hoy</p>}
                        {!loadingDetail && detailData.map(v => (
                            <div key={v.id} className="flex items-center justify-between p-3 border border-gray-50 rounded-xl hover:bg-gray-50 transition-colors">
                                <div>
                                    <p className="text-xs font-mono font-medium text-orchid-600">{v.folio}</p>
                                    <p className="text-sm font-medium text-gray-800">{v.cliente || 'Público general'}</p>
                                    <p className="text-[10px] text-gray-400">{new Date(v.created_at).toLocaleTimeString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-gray-800">{fmt(v.total)}</p>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 capitalize">{v.metodo_pago}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </Modal>
            )}

            {modal === 'mes' && (
                <Modal title="Ventas del mes" onClose={() => setModal(null)} maxWidth="max-w-2xl">
                    <div className="space-y-3">
                        {loadingDetail ? <p className="text-center py-8 text-gray-400 animate-pulse">Cargando...</p> : null}
                        {!loadingDetail && detailData.length === 0 && <p className="text-center py-8 text-gray-400">No hay ventas este mes</p>}
                        {!loadingDetail && detailData.map(v => (
                            <div key={v.id} className="flex items-center justify-between p-3 border border-gray-50 rounded-xl hover:bg-gray-50 transition-colors">
                                <div>
                                    <p className="text-xs font-mono font-medium text-orchid-600">{v.folio}</p>
                                    <p className="text-sm font-medium text-gray-800">{v.cliente || 'Público general'}</p>
                                    <p className="text-[10px] text-gray-400">{new Date(v.created_at).toLocaleDateString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-gray-800">{fmt(v.total)}</p>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 capitalize">{v.metodo_pago}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </Modal>
            )}

            {modal === 'stock' && (
                <Modal title="Productos con bajo stock" onClose={() => setModal(null)} maxWidth="max-w-2xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {detailData.map(p => (
                            <div key={p.id} className="flex items-center justify-between p-3 border border-amber-100 bg-amber-50/30 rounded-xl">
                                <div>
                                    <p className="text-sm font-bold text-gray-800">{p.nombre}</p>
                                    <p className="text-xs text-gray-500">{p.categoria}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-amber-600">{p.stock} {p.unidad}</p>
                                    <p className="text-[10px] text-gray-400">Mínimo: {p.stock_minimo}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Modal>
            )}

            {modal === 'clientes' && (
                <Modal title="Clientes registrados" onClose={() => setModal(null)} maxWidth="max-w-2xl">
                    <div className="space-y-3">
                        {loadingDetail ? <p className="text-center py-8 text-gray-400 animate-pulse">Cargando...</p> : null}
                        {!loadingDetail && detailData.length === 0 && <p className="text-center py-8 text-gray-400">No hay clientes registrados</p>}
                        {!loadingDetail && detailData.map(c => (
                            <div key={c.id} className="flex items-center justify-between p-3 border border-gray-50 rounded-xl hover:bg-gray-50 transition-colors">
                                <div>
                                    <p className="text-sm font-bold text-gray-800">{c.nombre}</p>
                                    <p className="text-xs text-gray-500">{c.email || 'Sin email'} · {c.telefono || 'Sin teléfono'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-medium text-orchid-600 capitalize">{c.tipo?.replace('_', ' ')}</p>
                                    <p className="text-[10px] text-gray-400">Desde: {new Date(c.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Modal>
            )}
        </div>
    )
}