import { useState, useEffect } from 'react'
import { comprasAPI, proveedoresAPI, productosAPI } from '../services/api'
import { useUI } from '../context/UIContext'
import toast from 'react-hot-toast'
import { 
    Plus, 
    Search, 
    Truck, 
    ShoppingCart, 
    Calendar, 
    User, 
    ChevronRight, 
    AlertCircle, 
    CheckCircle2, 
    Clock, 
    DollarSign,
    Package,
    Trash2,
    Save,
    History,
    Wallet
} from 'lucide-react'
import Modal from '../components/common/Modal'

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

export default function Compras() {
    const { setTitulo, setSubtitulo } = useUI()
    const [compras, setCompras] = useState([])
    const [proveedores, setProveedores] = useState([])
    const [productos, setProductos] = useState([])
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState('historial') // historial, nueva, deudas
    const [modal, setModal] = useState(null)
    const [selected, setSelected] = useState(null)
    const [saving, setSaving] = useState(false)

    // Nueva Compra State
    const [nuevaCompra, setNuevaCompra] = useState({
        proveedor_id: '',
        fecha_compra: new Date().toISOString().split('T')[0],
        fecha_vencimiento: '',
        notas: '',
        items: [],
        monto_pagado: 0,
        metodo_pago: 'efectivo',
        tipo_pago: 'contado'
    })
    const [buscarProd, setBuscarProd] = useState('')

    // Abono State
    const [abono, setAbono] = useState({ monto: 0, metodo_pago: 'efectivo', notas: '' })

    useEffect(() => {
        setTitulo('Compras y Proveedores')
        setSubtitulo('Gestión de órdenes de compra y cuentas por pagar')
        loadData()
        return () => { setTitulo(''); setSubtitulo('') }
    }, [tab])

    const loadData = async () => {
        setLoading(true)
        try {
            const [cRes, pRes, prRes] = await Promise.all([
                comprasAPI.getAll(tab === 'deudas' ? { estado: 'pendiente' } : {}),
                proveedoresAPI.getAll(),
                productosAPI.getAll({ limit: 100 })
            ])
            setCompras(cRes.data.compras)
            setProveedores(pRes.data.proveedores)
            setProductos(prRes.data.productos)
        } catch (error) {
            toast.error('Error al cargar datos')
        } finally {
            setLoading(false)
        }
    }

    const addItem = (prod) => {
        if (nuevaCompra.items.find(i => i.producto_id === prod.id)) return toast.error('Producto ya añadido')
        setNuevaCompra(prev => ({
            ...prev,
            items: [...prev.items, { 
                producto_id: prod.id, 
                nombre: prod.nombre, 
                cantidad: 1, 
                costo_unitario: prod.precio_compra || 0 
            }]
        }))
        setBuscarProd('')
    }

    const removeItem = (idx) => {
        setNuevaCompra(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== idx)
        }))
    }

    const updateItem = (idx, field, value) => {
        const newItems = [...nuevaCompra.items]
        newItems[idx][field] = value
        setNuevaCompra(prev => ({ ...prev, items: newItems }))
    }

    const totalNueva = nuevaCompra.items.reduce((acc, i) => acc + (i.cantidad * i.costo_unitario), 0)
    
    // Sincronizar monto_pagado si es de contado
    useEffect(() => {
        if (nuevaCompra.tipo_pago === 'contado') {
            setNuevaCompra(prev => ({ ...prev, monto_pagado: totalNueva }))
        }
    }, [totalNueva, nuevaCompra.tipo_pago])

    const handleCrearCompra = async () => {
        if (!nuevaCompra.proveedor_id) return toast.error('Selecciona un proveedor')
        if (nuevaCompra.items.length === 0) return toast.error('Añade al menos un producto')
        
        setSaving(true)
        try {
            await comprasAPI.crear(nuevaCompra)
            toast.success('Compra registrada correctamente')
            setTab('historial')
            setNuevaCompra({
                proveedor_id: '',
                fecha_compra: new Date().toISOString().split('T')[0],
                fecha_vencimiento: '',
                notas: '',
                items: [],
                monto_pagado: 0,
                metodo_pago: 'efectivo',
                tipo_pago: 'contado'
            })
        } catch (error) {
            toast.error(error.response?.data?.mensaje || 'Error al registrar compra')
        } finally {
            setSaving(false)
        }
    }

    const handleAbono = async () => {
        if (abono.monto <= 0) return toast.error('Monto inválido')
        setSaving(true)
        try {
            await comprasAPI.registrarAbono({ ...abono, compra_id: selected.id })
            toast.success('Abono registrado')
            setModal(null)
            loadData()
        } catch (error) {
            toast.error(error.response?.data?.mensaje || 'Error')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            
            {/* Tabs Navigation */}
            <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-orchid-50 w-fit">
                {[
                    { id: 'historial', label: 'Historial', icon: History },
                    { id: 'nueva', label: 'Nueva Compra', icon: Plus },
                    { id: 'deudas', label: 'Cuentas por Pagar', icon: Wallet }
                ].map(t => (
                    <button 
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === t.id ? 'bg-orchid-600 text-white shadow-lg shadow-orchid-100' : 'text-gray-400 hover:bg-orchid-50 hover:text-orchid-600'}`}
                    >
                        <t.icon size={18} />
                        {t.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="w-10 h-10 border-4 border-orchid-200 border-t-orchid-600 rounded-full animate-spin"></div>
                </div>
            ) : tab === 'nueva' ? (
                /* SECTION: NUEVA COMPRA */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Left: Settings */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="card space-y-4">
                            <h3 className="font-black text-gray-800 uppercase tracking-wider text-xs flex items-center gap-2">
                                <Truck size={16} className="text-orchid-600" />
                                Datos del Proveedor
                            </h3>
                            <div>
                                <label className="label text-[10px]">Proveedor</label>
                                <select 
                                    className="input h-11"
                                    value={nuevaCompra.proveedor_id}
                                    onChange={e => setNuevaCompra(p => ({ ...p, proveedor_id: e.target.value }))}
                                >
                                    <option value="">Selecciona un proveedor</option>
                                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                </select>
                            </div>
                            <div className="space-y-4">
                                <label className="label text-[10px]">Tipo de Compra</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        onClick={() => setNuevaCompra(p => ({ ...p, tipo_pago: 'contado', monto_pagado: totalNueva, fecha_vencimiento: '' }))}
                                        className={`py-2 rounded-xl text-xs font-black border transition-all ${nuevaCompra.tipo_pago === 'contado' ? 'bg-orchid-600 text-white border-orchid-600 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:border-orchid-300'}`}
                                    >
                                        CONTADO
                                    </button>
                                    <button 
                                        onClick={() => setNuevaCompra(p => ({ ...p, tipo_pago: 'credito', monto_pagado: 0 }))}
                                        className={`py-2 rounded-xl text-xs font-black border transition-all ${nuevaCompra.tipo_pago === 'credito' ? 'bg-amber-500 text-white border-amber-500 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:border-orchid-300'}`}
                                    >
                                        A CRÉDITO
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="label text-[10px]">Fecha Compra</label>
                                    <input 
                                        type="date" className="input h-11" 
                                        value={nuevaCompra.fecha_compra}
                                        onChange={e => setNuevaCompra(p => ({ ...p, fecha_compra: e.target.value }))}
                                    />
                                </div>
                                {nuevaCompra.tipo_pago === 'credito' && (
                                    <div className="animate-in slide-in-from-top-2 duration-300">
                                        <label className="label text-[10px] text-amber-600 font-bold">Fecha Vencimiento del Crédito</label>
                                        <input 
                                            type="date" className="input h-11 border-amber-200 focus:ring-amber-500"
                                            value={nuevaCompra.fecha_vencimiento}
                                            onChange={e => setNuevaCompra(p => ({ ...p, fecha_vencimiento: e.target.value }))}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="card bg-gray-900 border-gray-800 text-white space-y-4">
                            <h3 className="font-black text-orchid-400 uppercase tracking-wider text-xs">Resumen Financiero</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm text-gray-400">
                                    <span>Subtotal</span>
                                    <span>{fmt(totalNueva)}</span>
                                </div>
                                <div className="flex justify-between text-lg font-black pt-2 border-t border-gray-800">
                                    <span>TOTAL</span>
                                    <span className="text-orchid-400">{fmt(totalNueva)}</span>
                                </div>
                            </div>
                            <div className="pt-4 space-y-3">
                                {nuevaCompra.tipo_pago === 'credito' ? (
                                    <div>
                                        <label className="label text-[10px] text-gray-400">Pago Inicial (Opcional)</label>
                                        <input 
                                            type="number" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orchid-500"
                                            value={nuevaCompra.monto_pagado}
                                            onChange={e => setNuevaCompra(p => ({ ...p, monto_pagado: parseFloat(e.target.value) || 0 }))}
                                        />
                                    </div>
                                ) : (
                                    <div className="p-3 bg-emerald-900/30 rounded-xl border border-emerald-800/50">
                                        <p className="text-[10px] text-emerald-300 uppercase font-black">Pago de Contado</p>
                                        <p className="text-xl font-black">{fmt(totalNueva)}</p>
                                    </div>
                                )}

                                {(nuevaCompra.tipo_pago === 'contado' || nuevaCompra.monto_pagado > 0) && (
                                    <div>
                                        <label className="label text-[10px] text-gray-400">Método de Pago</label>
                                        <select 
                                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm"
                                            value={nuevaCompra.metodo_pago}
                                            onChange={e => setNuevaCompra(p => ({ ...p, metodo_pago: e.target.value }))}
                                        >
                                            <option value="efectivo">Efectivo</option>
                                            <option value="transferencia">Transferencia</option>
                                            <option value="tarjeta">Tarjeta</option>
                                        </select>
                                    </div>
                                )}
                                <div className="p-3 bg-orchid-900/30 rounded-xl border border-orchid-800/50">
                                    <p className="text-[10px] text-orchid-300 uppercase font-black">Saldo Pendiente</p>
                                    <p className="text-xl font-black">{fmt(totalNueva - nuevaCompra.monto_pagado)}</p>
                                </div>
                            </div>
                            <button 
                                onClick={handleCrearCompra}
                                disabled={saving}
                                className="w-full bg-orchid-600 hover:bg-orchid-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-orchid-900/40 transition-all flex items-center justify-center gap-2"
                            >
                                {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={20} />}
                                REGISTRAR COMPRA
                            </button>
                        </div>
                    </div>

                    {/* Right: Items */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="card">
                            <div className="relative mb-6">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input 
                                    type="text" 
                                    className="input pl-12 h-12 text-base" 
                                    placeholder="Buscar producto para añadir..."
                                    value={buscarProd}
                                    onChange={e => setBuscarProd(e.target.value)}
                                />
                                {buscarProd.length > 1 && (
                                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-100 rounded-2xl shadow-2xl mt-2 z-50 max-h-60 overflow-y-auto overflow-x-hidden">
                                        {productos.filter(p => p.nombre.toLowerCase().includes(buscarProd.toLowerCase())).map(p => (
                                            <button key={p.id} onClick={() => addItem(p)} className="w-full p-4 hover:bg-orchid-50 flex items-center justify-between text-left group">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:text-orchid-600 transition-colors">
                                                        <Package size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-800">{p.nombre}</p>
                                                        <p className="text-xs text-gray-400">Stock: {p.stock} | Costo Actual: {fmt(p.precio_compra)}</p>
                                                    </div>
                                                </div>
                                                <Plus size={18} className="text-gray-300 group-hover:text-orchid-600" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-left border-b border-gray-100">
                                            <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Producto</th>
                                            <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center" width="100">Cantidad</th>
                                            <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right" width="140">Costo Unitario</th>
                                            <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right pr-2" width="120">Subtotal</th>
                                            <th width="50"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {nuevaCompra.items.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="py-20 text-center">
                                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                                                        <ShoppingCart size={32} />
                                                    </div>
                                                    <p className="text-gray-500 font-bold">Carrito vacío</p>
                                                    <p className="text-xs text-gray-400">Busca productos para empezar a abastecer tu inventario.</p>
                                                </td>
                                            </tr>
                                        ) : nuevaCompra.items.map((item, idx) => (
                                            <tr key={idx} className="group hover:bg-gray-50/50 transition-colors">
                                                <td className="py-4 pl-2">
                                                    <p className="text-sm font-bold text-gray-800">{item.nombre}</p>
                                                    <p className="text-[10px] text-orchid-500 font-bold uppercase">Código Prod: {item.producto_id}</p>
                                                </td>
                                                <td className="py-4 text-center">
                                                    <input 
                                                        type="number" min="1" className="w-20 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center font-bold"
                                                        value={item.cantidad}
                                                        onChange={e => updateItem(idx, 'cantidad', parseInt(e.target.value) || 1)}
                                                    />
                                                </td>
                                                <td className="py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <span className="text-xs text-gray-400">$</span>
                                                        <input 
                                                            type="number" step="0.01" className="w-24 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right font-bold"
                                                            value={item.costo_unitario}
                                                            onChange={e => updateItem(idx, 'costo_unitario', parseFloat(e.target.value) || 0)}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="py-4 text-right pr-2 font-black text-gray-700">
                                                    {fmt(item.cantidad * item.costo_unitario)}
                                                </td>
                                                <td className="py-4 text-center">
                                                    <button onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-500 transition-colors p-2">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="card space-y-3">
                            <label className="label text-[10px]">Notas de la Compra</label>
                            <textarea 
                                className="input min-h-[80px]"
                                placeholder="Añade detalles adicionales, número de factura del proveedor, etc."
                                value={nuevaCompra.notas}
                                onChange={e => setNuevaCompra(p => ({ ...p, notas: e.target.value }))}
                            />
                        </div>
                    </div>
                </div>
            ) : (
                /* SECTION: LISTADO (Historial o Deudas) */
                <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left border-b border-gray-100 bg-gray-50/50">
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Folio</th>
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha</th>
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Proveedor</th>
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Estado</th>
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Total</th>
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Saldo</th>
                                    <th className="p-5" width="100"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {compras.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="py-20 text-center">
                                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                                                <History size={32} />
                                            </div>
                                            <p className="text-gray-500 font-bold">Sin registros</p>
                                            <p className="text-xs text-gray-400">No se encontraron órdenes de compra en esta categoría.</p>
                                        </td>
                                    </tr>
                                ) : compras.map(c => (
                                    <tr key={c.id} className="group hover:bg-orchid-50/20 transition-colors">
                                        <td className="p-5">
                                            <p className="text-sm font-black text-gray-800">{c.folio}</p>
                                            <p className="text-[10px] text-gray-400 flex items-center gap-1"><User size={10} /> {c.usuario}</p>
                                        </td>
                                        <td className="p-5">
                                            <p className="text-xs font-bold text-gray-600">{new Date(c.fecha_compra).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                            {c.fecha_vencimiento && <p className={`text-[10px] font-bold ${new Date(c.fecha_vencimiento) < new Date() && c.saldo_pendiente > 0 ? 'text-red-500' : 'text-gray-400'}`}>Vence: {new Date(c.fecha_vencimiento).toLocaleDateString()}</p>}
                                        </td>
                                        <td className="p-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-orchid-600 shadow-sm">
                                                    <Truck size={14} />
                                                </div>
                                                <p className="text-sm font-bold text-gray-700">{c.proveedor}</p>
                                            </div>
                                        </td>
                                        <td className="p-5 text-center">
                                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                                                c.estado === 'pagada' ? 'bg-emerald-100 text-emerald-700' :
                                                c.estado === 'cancelada' ? 'bg-red-100 text-red-700' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>
                                                {c.estado === 'pagada' && <CheckCircle2 size={12} />}
                                                {c.estado === 'cancelada' && <AlertCircle size={12} />}
                                                {c.estado === 'pendiente' && <Clock size={12} />}
                                                {c.estado}
                                            </span>
                                        </td>
                                        <td className="p-5 text-right font-black text-gray-700">{fmt(c.total)}</td>
                                        <td className="p-5 text-right">
                                            <p className={`text-sm font-black ${c.saldo_pendiente > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                {fmt(c.saldo_pendiente)}
                                            </p>
                                        </td>
                                        <td className="p-5 text-center">
                                            {c.saldo_pendiente > 0 && (
                                                <button 
                                                    onClick={() => { setSelected(c); setAbono({ monto: c.saldo_pendiente, metodo_pago: 'efectivo', notas: '' }); setModal('abono') }}
                                                    className="w-10 h-10 bg-white border border-orchid-100 rounded-xl flex items-center justify-center text-orchid-600 hover:bg-orchid-600 hover:text-white transition-all shadow-sm group-hover:scale-110"
                                                    title="Registrar Abono"
                                                >
                                                    <DollarSign size={18} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODAL ABONO */}
            {modal === 'abono' && (
                <Modal title={`Registrar Abono — ${selected?.folio}`} onClose={() => setModal(null)}>
                    <div className="space-y-4">
                        <div className="bg-red-50 rounded-2xl p-5 text-center border border-red-100">
                            <p className="text-[10px] text-red-400 font-black uppercase tracking-wider mb-1">Saldo Pendiente</p>
                            <p className="text-4xl font-black text-red-600">{fmt(selected?.saldo_pendiente)}</p>
                            <p className="text-[10px] text-red-400 mt-2 font-bold uppercase tracking-widest">Proveedor: {selected?.proveedor}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label text-[10px]">Monto del Pago</label>
                                <input 
                                    type="number" max={selected?.saldo_pendiente} 
                                    className="input h-11" 
                                    value={abono.monto}
                                    onChange={e => setAbono(p => ({ ...p, monto: parseFloat(e.target.value) || 0 }))}
                                />
                            </div>
                            <div>
                                <label className="label text-[10px]">Método</label>
                                <select 
                                    className="input h-11"
                                    value={abono.metodo_pago}
                                    onChange={e => setAbono(p => ({ ...p, metodo_pago: e.target.value }))}
                                >
                                    <option value="efectivo">Efectivo</option>
                                    <option value="transferencia">Transferencia</option>
                                    <option value="tarjeta">Tarjeta</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="label text-[10px]">Notas</label>
                            <textarea 
                                className="input min-h-[60px] py-3"
                                value={abono.notas}
                                onChange={e => setAbono(p => ({ ...p, notas: e.target.value }))}
                                placeholder="Referencia bancaria, persona que entregó, etc."
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setModal(null)} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50 transition-colors">Cancelar</button>
                            <button 
                                onClick={handleAbono} 
                                disabled={saving}
                                className="flex-1 px-4 py-3 rounded-xl bg-orchid-600 text-white text-sm font-black hover:bg-orchid-700 transition-all shadow-lg shadow-orchid-100 flex items-center justify-center gap-2"
                            >
                                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <DollarSign size={16} />}
                                APLICAR PAGO
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

        </div>
    )
}
