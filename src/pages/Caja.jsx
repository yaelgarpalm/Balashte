import { useState, useEffect } from 'react'
import { cajaAPI } from '../services/api'
import { useUI } from '../context/UIContext'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { 
    Wallet, 
    ArrowUpCircle, 
    ArrowDownCircle, 
    Lock, 
    Unlock, 
    History, 
    AlertCircle, 
    DollarSign,
    CheckCircle2,
    Calendar,
    User
} from 'lucide-react'

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

export default function Caja() {
    const { setTitulo, setSubtitulo } = useUI()
    const { usuario } = useAuth()
    const [estado, setEstado] = useState(null)
    const [loading, setLoading] = useState(true)
    const [historial, setHistorial] = useState([])
    
    // Modals states
    const [showAbrir, setShowAbrir] = useState(false)
    const [showCerrar, setShowCerrar] = useState(false)
    const [showMov, setShowMov] = useState(false)
    
    // Form states
    const [montoApertura, setMontoApertura] = useState('')
    const [montoReal, setMontoReal] = useState('')
    const [notas, setNotas] = useState('')
    const [movData, setMovData] = useState({ tipo: 'entrada', monto: '', concepto: '' })

    useEffect(() => {
        setTitulo('Control de Caja')
        setSubtitulo('Apertura, cierre y movimientos de efectivo')
        cargarDatos()
        return () => { setTitulo(''); setSubtitulo('') }
    }, [])

    const cargarDatos = async () => {
        setLoading(true)
        try {
            const requests = [cajaAPI.getEstado()]
            if (usuario?.rol === 'admin') requests.push(cajaAPI.getHistorial())
            const results = await Promise.all(requests)
            setEstado(results[0].data)
            if (results[1]) setHistorial(results[1].data.cajas)
        } catch (e) {
            toast.error('Error al cargar datos de caja')
        } finally {
            setLoading(false)
        }
    }

    const handleAbrir = async (e) => {
        e.preventDefault()
        try {
            await cajaAPI.abrir({ monto_apertura: parseFloat(montoApertura) || 0, notas })
            toast.success('Caja abierta correctamente')
            setShowAbrir(false)
            setMontoApertura('')
            setNotas('')
            cargarDatos()
        } catch (e) {
            toast.error(e.response?.data?.mensaje || 'Error al abrir caja')
        }
    }

    const handleCerrar = async (e) => {
        e.preventDefault()
        try {
            const res = await cajaAPI.cerrar({ monto_real: parseFloat(montoReal) || 0, notas })
            toast.success('Caja cerrada con éxito')
            if (res.data?.alerta_admin) {
                toast.error('El corte no coincide. Se notificará al administrador.')
            }
            setShowCerrar(false)
            setMontoReal('')
            setNotas('')
            cargarDatos()
        } catch (e) {
            toast.error(e.response?.data?.mensaje || 'Error al cerrar caja')
        }
    }

    const handleMovimiento = async (e) => {
        e.preventDefault()
        try {
            await cajaAPI.registrarMovimiento({
                ...movData,
                monto: parseFloat(movData.monto)
            })
            toast.success('Movimiento registrado')
            setShowMov(false)
            setMovData({ tipo: 'entrada', monto: '', concepto: '' })
            cargarDatos()
        } catch (e) {
            toast.error(e.response?.data?.mensaje || 'Error al registrar movimiento')
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-orchid-200 border-t-orchid-600 rounded-full animate-spin"></div>
        </div>
    )

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-10">
            {/* Estado Actual */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    {!estado?.abierta ? (
                        <div className="bg-white rounded-3xl border border-orchid-100 shadow-xl shadow-orchid-100/20 overflow-hidden">
                            <div className="p-8 text-center space-y-4">
                                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500">
                                    <Lock size={40} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-gray-800">La caja está cerrada</h2>
                                    <p className="text-gray-500 mt-2">Debes realizar la apertura para poder procesar ventas.</p>
                                </div>
                                <button 
                                    onClick={() => setShowAbrir(true)}
                                    className="btn-primary px-8 py-3 text-base rounded-2xl mx-auto"
                                >
                                    <Unlock size={20} /> Realizar Apertura
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl border border-orchid-100 shadow-xl shadow-orchid-100/20 overflow-hidden">
                            <div className="bg-orchid-700 p-6 text-white">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-orchid-100 text-xs font-bold uppercase tracking-widest mb-1">Caja en curso</p>
                                        <h2 className="text-3xl font-black flex items-center gap-3">
                                            <Unlock size={28} className="text-orchid-200" />
                                            Turno Abierto
                                        </h2>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-orchid-100 text-xs font-bold uppercase mb-1">Iniciado el</p>
                                        <p className="font-mono text-sm">{new Date(estado.caja.fecha_apertura).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Apertura</p>
                                    <p className="text-lg font-black text-gray-700">{fmt(estado.caja.monto_apertura)}</p>
                                </div>
                                <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                                    <p className="text-[10px] font-bold text-green-600 uppercase mb-1">Ventas Efectivo</p>
                                    <p className="text-lg font-black text-green-700">{fmt(estado.caja.ventas_efectivo)}</p>
                                </div>
                                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                                    <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Otros Ingresos</p>
                                    <p className="text-lg font-black text-blue-700">{fmt(estado.caja.entradas)}</p>
                                </div>
                                <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                                    <p className="text-[10px] font-bold text-red-600 uppercase mb-1">Salidas</p>
                                    <p className="text-lg font-black text-red-700">-{fmt(estado.caja.salidas)}</p>
                                </div>
                            </div>

                            <div className="px-6 pb-6 pt-2 flex flex-col md:flex-row items-center gap-4">
                                <div className="flex-1 bg-orchid-50/50 p-5 rounded-2xl border border-orchid-100 flex items-center justify-between w-full">
                                    <div>
                                        <p className="text-xs font-bold text-orchid-600 uppercase tracking-wider mb-1">Efectivo Esperado</p>
                                        <p className="text-4xl font-black text-orchid-900 tracking-tighter">{fmt(estado.caja.monto_esperado)}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center gap-2 text-xs text-gray-500 font-bold mb-1">
                                            <CreditCard size={14} /> Tarjeta: {fmt(estado.caja.ventas_tarjeta)}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 font-bold">
                                            <ArrowRightLeft size={14} /> Transf: {fmt(estado.caja.ventas_transferencia)}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 w-full md:w-auto">
                                    <button onClick={() => setShowMov(true)} className="flex-1 md:flex-none h-14 px-6 bg-white border-2 border-gray-100 rounded-2xl font-bold text-gray-600 hover:border-orchid-200 hover:text-orchid-700 transition-all flex items-center justify-center gap-2 shadow-sm">
                                        <History size={18} /> Movimiento
                                    </button>
                                    <button onClick={() => setShowCerrar(true)} className="flex-1 md:flex-none h-14 px-8 bg-orchid-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-orchid-200">
                                        <Lock size={18} /> Cerrar Caja
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Resumen de Métodos */}
                <div className="space-y-4">
                    <div className="card h-full flex flex-col">
                        <h3 className="font-black text-gray-800 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Wallet size={16} className="text-orchid-600" />
                            Acciones Rápidas
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                            <button onClick={() => setShowMov(true)} className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-orchid-200 hover:bg-orchid-50/30 transition-all group">
                                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-orchid-600 group-hover:scale-110 transition-transform">
                                    <ArrowUpCircle size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-sm text-gray-700">Entrada manual</p>
                                    <p className="text-[10px] text-gray-400">Ingresar efectivo extra</p>
                                </div>
                            </button>
                            <button onClick={() => { setShowMov(true); setMovData(prev => ({...prev, tipo: 'salida'})) }} className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-red-200 hover:bg-red-50/30 transition-all group">
                                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                                    <ArrowDownCircle size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-sm text-gray-700">Salida manual</p>
                                    <p className="text-[10px] text-gray-400">Pago de gastos o retiros</p>
                                </div>
                            </button>
                        </div>
                        <div className="mt-auto pt-6">
                            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-start gap-3">
                                <AlertCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                                    Recuerda realizar el cierre al finalizar tu turno. La diferencia se calculará automáticamente comparando el sistema vs tu conteo manual.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Historial - Solo admin */}
            {usuario?.rol === 'admin' && <div className="bg-white rounded-3xl border border-orchid-100 shadow-xl shadow-orchid-100/20 overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                    <h3 className="font-black text-gray-800 text-sm uppercase tracking-wider flex items-center gap-2">
                        <History size={18} className="text-orchid-600" />
                        Historial de Cierres
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 bg-gray-50/30">
                                <th className="px-6 py-4">Fecha Cierre</th>
                                <th className="px-6 py-4">Cajero</th>
                                <th className="px-6 py-4">Ventas (Efe/Tarj)</th>
                                <th className="px-6 py-4">Esperado</th>
                                <th className="px-6 py-4">Real</th>
                                <th className="px-6 py-4">Diferencia</th>
                                <th className="px-6 py-4">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {historial.map(c => (
                                <tr key={c.id} className="hover:bg-orchid-50/20 transition-colors group">
                                    <td className="px-6 py-4">
                                        <p className="text-xs font-bold text-gray-700">{c.fecha_cierre ? new Date(c.fecha_cierre).toLocaleDateString() : 'N/A'}</p>
                                        <p className="text-[10px] text-gray-400 font-mono">{c.fecha_cierre ? new Date(c.fecha_cierre).toLocaleTimeString() : 'En curso...'}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-orchid-100 flex items-center justify-center text-orchid-600">
                                                <User size={12} />
                                            </div>
                                            <span className="text-xs font-medium text-gray-600">{c.usuario_nombre}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-bold text-gray-700">{fmt(c.monto_ventas_efectivo)}</span>
                                        <span className="text-[10px] text-gray-400 ml-1">/ {fmt(c.monto_ventas_tarjeta)}</span>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-bold text-gray-700">{fmt(c.monto_esperado)}</td>
                                    <td className="px-6 py-4 text-xs font-bold text-gray-700">{fmt(c.monto_real)}</td>
                                    <td className="px-6 py-4">
                                        {c.diferencia !== null && (
                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${
                                                Math.abs(c.diferencia) < 0.1 ? 'bg-green-100 text-green-700' : 
                                                c.diferencia < 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                            }`}>
                                                {c.diferencia > 0 ? '+' : ''}{fmt(c.diferencia)}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${c.estado === 'abierta' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {c.estado}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>}

            {/* Modals */}
            {/* Abrir Caja */}
            {showAbrir && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-orchid-50/30">
                            <h3 className="font-black text-gray-800 flex items-center gap-2"><Unlock size={20} className="text-orchid-600" /> Apertura de Turno</h3>
                            <button onClick={() => setShowAbrir(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAbrir} className="p-6 space-y-4">
                            <div>
                                <label className="label text-xs">Monto Inicial en Efectivo</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                    <input 
                                        type="number" step="0.01" required
                                        value={montoApertura} onChange={e => setMontoApertura(e.target.value)}
                                        className="input pl-8 h-12 text-lg font-black" placeholder="0.00" autoFocus 
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="label text-xs">Notas de apertura (opcional)</label>
                                <textarea 
                                    value={notas} onChange={e => setNotas(e.target.value)}
                                    className="input min-h-[80px] text-sm" placeholder="Ej: Recibí 2 billetes de $200 para cambio..."
                                ></textarea>
                            </div>
                            <button type="submit" className="btn-primary w-full h-12 rounded-xl justify-center shadow-lg shadow-orchid-100">
                                Iniciar Turno
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Cerrar Caja (Arqueo) */}
            {showCerrar && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-orchid-900 text-white">
                            <h3 className="font-black flex items-center gap-2"><Lock size={20} /> Arqueo y Cierre</h3>
                            <button onClick={() => setShowCerrar(false)} className="text-orchid-300 hover:text-white"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCerrar} className="p-6 space-y-6">
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center">
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Monto Esperado (Sistema)</p>
                                <p className="text-3xl font-black text-gray-800">{fmt(estado.caja.monto_esperado)}</p>
                            </div>
                            <div>
                                <label className="label text-xs text-orchid-700 font-bold">Monto Real Físico (Efectivo en mano)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                    <input 
                                        type="number" step="0.01" required
                                        value={montoReal} onChange={e => setMontoReal(e.target.value)}
                                        className="input pl-8 h-14 text-2xl font-black border-orchid-200 focus:border-orchid-600" placeholder="0.00" autoFocus 
                                    />
                                </div>
                                <p className="text-[10px] text-gray-400 mt-2 italic">Ingresa el total que contaste físicamente en la caja.</p>
                            </div>
                            <div>
                                <label className="label text-xs">Notas de cierre</label>
                                <textarea 
                                    value={notas} onChange={e => setNotas(e.target.value)}
                                    className="input min-h-[80px] text-sm" placeholder="Ej: Hubo faltante de $5 pesos por redondeo..."
                                ></textarea>
                            </div>
                            <button type="submit" className="w-full h-14 bg-orchid-900 text-white rounded-xl font-black text-base uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2">
                                Confirmar y Cerrar Caja
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Registrar Movimiento */}
            {showMov && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                            <h3 className="font-black text-gray-800 flex items-center gap-2">
                                {movData.tipo === 'entrada' ? <ArrowUpCircle size={20} className="text-green-600" /> : <ArrowDownCircle size={20} className="text-red-500" />}
                                Registrar {movData.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                            </h3>
                            <button onClick={() => setShowMov(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleMovimiento} className="p-6 space-y-4">
                            <div className="flex bg-gray-100 p-1 rounded-xl">
                                <button type="button" onClick={() => setMovData({...movData, tipo: 'entrada'})} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${movData.tipo === 'entrada' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}>Entrada</button>
                                <button type="button" onClick={() => setMovData({...movData, tipo: 'salida'})} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${movData.tipo === 'salida' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'}`}>Salida</button>
                            </div>
                            <div>
                                <label className="label text-xs">Monto</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                    <input 
                                        type="number" step="0.01" required
                                        value={movData.monto} onChange={e => setMovData({...movData, monto: e.target.value})}
                                        className="input pl-8 h-12 text-lg font-black" placeholder="0.00" autoFocus 
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="label text-xs">Concepto</label>
                                <input 
                                    type="text" required
                                    value={movData.concepto} onChange={e => setMovData({...movData, concepto: e.target.value})}
                                    className="input h-12 text-sm" placeholder="Ej: Compra de garrafón de agua" 
                                />
                            </div>
                            <button type="submit" className={`w-full h-12 rounded-xl font-black text-sm uppercase tracking-widest text-white shadow-lg transition-all ${movData.tipo === 'entrada' ? 'bg-green-600 shadow-green-100' : 'bg-red-500 shadow-red-100'}`}>
                                Registrar {movData.tipo === 'entrada' ? 'Ingreso' : 'Egreso'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

function X({ size }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> }
function CreditCard({ size }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg> }
function ArrowRightLeft({ size }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 11 21 7 17 3"></polyline><line x1="21" y1="7" x2="9" y2="7"></line><polyline points="7 21 3 17 7 13"></polyline><line x1="3" y1="17" x2="15" y2="17"></line></svg> }
