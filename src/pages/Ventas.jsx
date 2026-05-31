import { useState, useEffect } from 'react'
import { ventasAPI } from '../services/api'
import toast from 'react-hot-toast'
import { Eye, XCircle, Search, X, FileText } from 'lucide-react'
import api from '../services/api'
import { useUI } from '../context/UIContext'
import { useAuth } from '../context/AuthContext'

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

function Modal({ title, onClose, children }) {
    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <h2 className="font-display font-bold text-gray-800">{title}</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200"><X size={16} /></button>
                </div>
                <div className="p-5">{children}</div>
            </div>
        </div>
    )
}

export default function Ventas() {
    const { setTitulo, setSubtitulo, buscar } = useUI()
    const { usuario } = useAuth()
    const [ventas, setVentas] = useState([])
    const [loading, setLoading] = useState(true)
    const [filtros, setFiltros] = useState({ fecha_inicio: '', fecha_fin: '', estado: '' })
    const [detalle, setDetalle] = useState(null)
    const [modal, setModal] = useState(false)
    const [facturando, setFacturando] = useState(false)

    const load = () => {
        setLoading(true)
        ventasAPI.getAll(filtros).then(r => setVentas(r.data.ventas)).finally(() => setLoading(false))
    }

    useEffect(() => {
        setTitulo('Historial de Ventas')
        return () => {
            setTitulo('')
            setSubtitulo('')
        }
    }, [])

    const filteredVentas = ventas.filter(v => 
        v.folio.toLowerCase().includes(buscar.toLowerCase()) ||
        (v.cliente && v.cliente.toLowerCase().includes(buscar.toLowerCase()))
    )

    useEffect(() => {
        setSubtitulo(`${filteredVentas.length} transacciones encontradas`)
    }, [filteredVentas])

    useEffect(() => { load() }, [filtros])

    const verDetalle = async (id) => {
        const { data } = await ventasAPI.getOne(id)
        setDetalle(data.venta)
        setModal(true)
    }

    const cancelar = async (id) => {
        if (!confirm('¿Seguro que deseas cancelar esta venta? El stock será restaurado.')) return
        try {
            await ventasAPI.cancelar(id)
            toast.success('Venta cancelada y stock restaurado')
            load()
            setModal(false)
        } catch (e) { toast.error(e.response?.data?.mensaje || 'Error') }
    }

    const handleFacturar = async (venta) => {
        if (!venta || venta.estado !== 'completada') return
        if (venta.cliente_id === 1 || !venta.cliente_id) {
            return toast.error('Para facturar, debe seleccionar un cliente con RFC válido.')
        }

        setFacturando(true)
        try {
            const { data } = await api.post('/facturapi/crear-factura', { 
                venta_id: venta.id,
                uso_cfdi: 'G03' // Por defecto
            })
            toast.success('Factura creada exitosamente')
            // Descargar PDF autenticado y abrirlo en nueva pestaña
            try {
                const pdfRes = await api.get(`/facturapi/${data.factura.id}/pdf`, { responseType: 'blob' })
                const blob = new Blob([pdfRes.data], { type: 'application/pdf' })
                const url = URL.createObjectURL(blob)
                window.open(url, '_blank')
            } catch { /* Si falla el PDF, no bloqueamos el flujo */ }
            setDetalle(prev => ({ ...prev, factura_id: data.factura.id, factura_url: data.factura.dashboardUrl }))
            load() // Recargar lista
        } catch (e) {
            toast.error(e.response?.data?.mensaje || 'Error al generar factura')
        } finally {
            setFacturando(false)
        }
    }

    const estadoBadge = (e) => {
        if (e === 'completada') return <span className="badge-green">Completada</span>
        if (e === 'cancelada') return <span className="badge-red">Cancelada</span>
        return <span className="badge-yellow">Pendiente</span>
    }

    return (
        <div>
            <div className="mb-4"></div>

            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <input type="date" className="input w-full sm:w-40" value={filtros.fecha_inicio} onChange={e => setFiltros(p => ({ ...p, fecha_inicio: e.target.value }))} />
                <input type="date" className="input w-full sm:w-40" value={filtros.fecha_fin} onChange={e => setFiltros(p => ({ ...p, fecha_fin: e.target.value }))} />
                <select className="input w-full sm:w-44" value={filtros.estado} onChange={e => setFiltros(p => ({ ...p, estado: e.target.value }))}>
                    <option value="">Todos los estados</option>
                    <option value="completada">Completadas</option>
                    <option value="cancelada">Canceladas</option>
                </select>
            </div>

            <div className="card p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b border-gray-50">
                            <tr>
                                <th className="th">Folio</th>
                                <th className="th">Cliente</th>
                                <th className="th">Vendedor</th>
                                <th className="th">Método</th>
                                <th className="th">Total</th>
                                <th className="th">Estado</th>
                                <th className="th">Fecha</th>
                                <th className="th">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && [...Array(5)].map((_, i) => (
                                <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                            ))}
                            {!loading && filteredVentas.map(v => (
                                <tr key={v.id} className="table-row">
                                    <td className="td font-mono text-xs text-orchid-700 font-medium">{v.folio}</td>
                                    <td className="td text-sm">{v.cliente || 'Público General'}</td>
                                    <td className="td text-sm text-gray-500">{v.vendedor}</td>
                                    <td className="td"><span className="text-xs capitalize text-gray-600">{v.metodo_pago}</span></td>
                                    <td className="td font-bold text-gray-800">{fmt(v.total)}</td>
                                    <td className="td">{estadoBadge(v.estado)}</td>
                                    <td className="td text-xs text-gray-500">{new Date(v.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                    <td className="td">
                                        <div className="flex gap-1">
                                            <button onClick={() => verDetalle(v.id)} className="w-8 h-8 rounded-lg bg-orchid-50 hover:bg-orchid-100 flex items-center justify-center text-orchid-600 transition-colors"><Eye size={13} /></button>
                                            {v.estado === 'completada' && usuario?.rol === 'admin' && <button onClick={() => cancelar(v.id)} className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-500 transition-colors"><XCircle size={13} /></button>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!loading && ventas.length === 0 && (
                                <tr><td colSpan={8} className="text-center py-12 text-gray-400">Sin ventas en el período</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {modal && detalle && (
                <Modal title={`Venta ${detalle.folio}`} onClose={() => setModal(false)}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400 mb-0.5">Cliente</p><p className="font-medium">{detalle.cliente || 'Público General'}</p></div>
                            <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400 mb-0.5">Método</p><p className="font-medium capitalize">{detalle.metodo_pago}</p></div>
                            <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400 mb-0.5">Vendedor</p><p className="font-medium">{detalle.vendedor}</p></div>
                            <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400 mb-0.5">Estado</p>{detalle.estado === 'completada' ? <span className="badge-green">Completada</span> : <span className="badge-red">Cancelada</span>}</div>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">Productos</p>
                            <div className="space-y-1.5">
                                {(detalle.detalle || []).map((d, i) => (
                                    <div key={i} className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                                        <span className="text-gray-700">{d.producto} × {d.cantidad}</span>
                                        <span className="font-semibold">{fmt(d.subtotal)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-orchid-50 rounded-xl p-4 space-y-1 text-sm">
                            <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{fmt(detalle.subtotal)}</span></div>
                            {parseFloat(detalle.descuento) > 0 && <div className="flex justify-between text-red-600"><span>Descuento</span><span>-{fmt(detalle.descuento)}</span></div>}
                            <div className="flex justify-between text-gray-600"><span>IVA 16%</span><span>{fmt(detalle.iva)}</span></div>
                            <div className="flex justify-between font-bold text-lg text-orchid-800 pt-1 border-t border-orchid-200"><span>Total</span><span>{fmt(detalle.total)}</span></div>
                        </div>
                        {detalle.estado === 'completada' && (
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleFacturar(detalle)} 
                                    disabled={facturando || detalle.factura_id}
                                    className={`btn-secondary flex-1 justify-center ${detalle.factura_id ? 'text-indigo-600 bg-indigo-50 border-indigo-100' : ''}`}
                                >
                                    {facturando ? <div className="w-4 h-4 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" /> : <FileText size={16} />}
                                    {detalle.factura_id ? 'Facturado' : 'Generar Factura'}
                                </button>
                                {detalle.factura_id && (
                                    <button 
                                        onClick={() => window.open(detalle.factura_url, '_blank')}
                                        className="btn-secondary flex-1 justify-center"
                                    >
                                        <Eye size={16} /> Ver PDF
                                    </button>
                                )}
                                {usuario?.rol === 'admin' && (
                                    <button onClick={() => cancelar(detalle.id)} className="btn-danger flex-1 justify-center"><XCircle size={16} />Cancelar</button>
                                )}
                            </div>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    )
}