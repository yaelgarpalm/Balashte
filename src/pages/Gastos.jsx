import { useState, useEffect } from 'react'
import { gastosAPI } from '../services/api'
import { useUI } from '../context/UIContext'
import toast from 'react-hot-toast'
import { 
    TrendingDown, 
    Plus, 
    Trash2, 
    Filter, 
    Calendar, 
    Tag, 
    DollarSign,
    CreditCard,
    ArrowRightLeft,
    Banknote,
    FileText,
    Search
} from 'lucide-react'

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

export default function Gastos() {
    const { setTitulo, setSubtitulo } = useUI()
    const [gastos, setGastos] = useState([])
    const [categorias, setCategorias] = useState([])
    const [loading, setLoading] = useState(true)
    const [totalSuma, setTotalSuma] = useState(0)
    
    // Filters
    const [filtros, setFiltros] = useState({
        fecha_inicio: new Date().toISOString().split('T')[0],
        fecha_fin: new Date().toISOString().split('T')[0],
        categoria_id: ''
    })

    // Modal
    const [showModal, setShowModal] = useState(false)
    const [form, setForm] = useState({
        categoria_gasto_id: '',
        monto: '',
        concepto: '',
        fecha: new Date().toISOString().split('T')[0],
        metodo_pago: 'efectivo'
    })

    useEffect(() => {
        setTitulo('Gastos y Egresos')
        setSubtitulo('Gestión de egresos y costos operativos')
        cargarCategorias()
        cargarGastos()
        return () => { setTitulo(''); setSubtitulo('') }
    }, [])

    const cargarCategorias = async () => {
        try {
            const res = await gastosAPI.getCategorias()
            setCategorias(res.data.categorias)
        } catch (e) { toast.error('Error al cargar categorías') }
    }

    const cargarGastos = async () => {
        setLoading(true)
        try {
            const res = await gastosAPI.getAll(filtros)
            setGastos(res.data.gastos)
            setTotalSuma(res.data.suma_total)
        } catch (e) { toast.error('Error al cargar gastos') }
        finally { setLoading(false) }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            await gastosAPI.crear(form)
            toast.success('Gasto registrado con éxito')
            setShowModal(false)
            setForm({
                categoria_gasto_id: '',
                monto: '',
                concepto: '',
                fecha: new Date().toISOString().split('T')[0],
                metodo_pago: 'efectivo'
            })
            cargarGastos()
        } catch (e) { toast.error('Error al registrar gasto') }
    }

    const handleEliminar = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este registro de gasto?')) return
        try {
            await gastosAPI.eliminar(id)
            toast.success('Gasto eliminado')
            cargarGastos()
        } catch (e) { toast.error('Error al eliminar') }
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-10">
            {/* Header Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-white rounded-3xl border border-orchid-100 p-6 shadow-xl shadow-orchid-100/20 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center shadow-inner">
                            <TrendingDown size={32} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total en Gastos</p>
                            <h2 className="text-4xl font-black text-gray-800 tracking-tighter">{fmt(totalSuma)}</h2>
                            <p className="text-[10px] text-gray-400 mt-1">Según los filtros seleccionados</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowModal(true)}
                        className="btn-primary w-full sm:w-auto h-14 px-8 rounded-2xl shadow-lg shadow-orchid-100"
                    >
                        <Plus size={20} /> Nuevo Gasto
                    </button>
                </div>
                
                <div className="bg-orchid-900 rounded-3xl p-6 text-white shadow-xl shadow-orchid-900/20 relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="font-bold text-orchid-200 text-xs uppercase tracking-widest mb-4">Filtrar por periodo</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 bg-orchid-800/50 p-2 rounded-xl border border-orchid-700/50">
                                <Calendar size={14} className="text-orchid-300" />
                                <input 
                                    type="date" value={filtros.fecha_inicio} 
                                    onChange={e => setFiltros({...filtros, fecha_inicio: e.target.value})}
                                    className="bg-transparent text-xs font-bold outline-none w-full"
                                />
                            </div>
                            <div className="flex items-center gap-2 bg-orchid-800/50 p-2 rounded-xl border border-orchid-700/50">
                                <Calendar size={14} className="text-orchid-300" />
                                <input 
                                    type="date" value={filtros.fecha_fin} 
                                    onChange={e => setFiltros({...filtros, fecha_fin: e.target.value})}
                                    className="bg-transparent text-xs font-bold outline-none w-full"
                                />
                            </div>
                            <button 
                                onClick={cargarGastos}
                                className="w-full py-2 bg-white text-orchid-950 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-orchid-100 transition-colors"
                            >
                                <Filter size={12} className="inline mr-2" /> Aplicar Filtros
                            </button>
                        </div>
                    </div>
                    <div className="absolute -right-6 -bottom-6 text-orchid-800 opacity-20 rotate-12">
                        <TrendingDown size={140} />
                    </div>
                </div>
            </div>

            {/* Listado */}
            <div className="bg-white rounded-3xl border border-orchid-100 shadow-xl shadow-orchid-100/20 overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/50">
                    <h3 className="font-black text-gray-800 text-sm uppercase tracking-wider flex items-center gap-2">
                        <FileText size={18} className="text-orchid-600" />
                        Registros de Gastos
                    </h3>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <select 
                            value={filtros.categoria_id}
                            onChange={e => setFiltros({...filtros, categoria_id: e.target.value})}
                            className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold text-gray-600 outline-none focus:ring-2 focus:ring-orchid-200"
                        >
                            <option value="">Todas las categorías</option>
                            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-20 text-center">
                            <div className="w-10 h-10 border-4 border-orchid-100 border-t-orchid-600 rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-gray-400 font-bold">Cargando gastos...</p>
                        </div>
                    ) : gastos.length === 0 ? (
                        <div className="p-20 text-center space-y-4">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
                                <Search size={40} />
                            </div>
                            <p className="text-gray-400 font-medium italic">No se encontraron gastos registrados en este periodo.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 bg-gray-50/30">
                                    <th className="px-6 py-4">Fecha</th>
                                    <th className="px-6 py-4">Categoría</th>
                                    <th className="px-6 py-4">Concepto</th>
                                    <th className="px-6 py-4">Método</th>
                                    <th className="px-6 py-4">Monto</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {gastos.map(g => (
                                    <tr key={g.id} className="hover:bg-orchid-50/20 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="text-gray-300" />
                                                <span className="text-xs font-bold text-gray-700">{new Date(g.fecha).toLocaleDateString()}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="badge-purple">{g.categoria}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs font-medium text-gray-700">{g.concepto}</p>
                                            <p className="text-[10px] text-gray-400 font-mono">Por: {g.usuario}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5">
                                                {g.metodo_pago === 'efectivo' ? <Banknote size={14} className="text-green-600" /> : 
                                                 g.metodo_pago === 'tarjeta' ? <CreditCard size={14} className="text-blue-500" /> : 
                                                 <ArrowRightLeft size={14} className="text-purple-500" />}
                                                <span className="text-[10px] font-bold text-gray-500 uppercase">{g.metodo_pago}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-black text-red-600">{fmt(g.monto)}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => handleEliminar(g.id)}
                                                className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-gray-300 hover:text-red-500 hover:border-red-100 transition-all shadow-sm"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Modal de Registro */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-red-50/30">
                            <h3 className="font-black text-gray-800 flex items-center gap-2">
                                <TrendingDown size={20} className="text-red-500" /> 
                                Registrar Gasto
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="label text-xs">Categoría</label>
                                    <select 
                                        required className="input h-12 text-sm"
                                        value={form.categoria_gasto_id}
                                        onChange={e => setForm({...form, categoria_gasto_id: e.target.value})}
                                    >
                                        <option value="">Seleccionar...</option>
                                        {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="label text-xs">Monto</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                        <input 
                                            type="number" step="0.01" required
                                            className="input pl-8 h-12 text-lg font-black text-red-600"
                                            value={form.monto} onChange={e => setForm({...form, monto: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="label text-xs">Concepto / Descripción</label>
                                <input 
                                    type="text" required placeholder="Ej: Pago de renta Mayo 2024"
                                    className="input h-12 text-sm"
                                    value={form.concepto} onChange={e => setForm({...form, concepto: e.target.value})}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="label text-xs">Fecha</label>
                                    <input 
                                        type="date" required className="input h-12 text-sm"
                                        value={form.fecha} onChange={e => setForm({...form, fecha: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="label text-xs">Método de Pago</label>
                                    <select 
                                        className="input h-12 text-sm"
                                        value={form.metodo_pago}
                                        onChange={e => setForm({...form, metodo_pago: e.target.value})}
                                    >
                                        <option value="efectivo">Efectivo</option>
                                        <option value="tarjeta">Tarjeta</option>
                                        <option value="transferencia">Transferencia</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-2">
                                <button type="submit" className="w-full h-14 bg-orchid-900 text-white rounded-2xl font-black text-base uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-orchid-100">
                                    Confirmar Gasto
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

function X({ size }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> }
