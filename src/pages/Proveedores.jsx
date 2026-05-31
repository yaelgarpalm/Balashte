import { useState, useEffect } from 'react'
import { proveedoresAPI } from '../services/api'
import toast from 'react-hot-toast'
import { Plus, Search, Edit2, Truck, X, Trash2, Eye } from 'lucide-react'
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

const empty = { nombre: '', contacto: '', email: '', telefono: '', direccion: '', rfc: '', notas: '' }

export default function Proveedores() {
    const { setTitulo, setSubtitulo, buscar } = useUI()
    const { usuario } = useAuth()
    const [proveedores, setProveedores] = useState([])
    const [loading, setLoading] = useState(true)
    const [modal, setModal] = useState(null) // null, 'form', 'detalle'
    const [selected, setSelected] = useState(null)
    const [detalle, setDetalle] = useState(null)
    const [form, setForm] = useState(empty)
    const [saving, setSaving] = useState(false)

    const load = () => { setLoading(true); proveedoresAPI.getAll({ buscar }).then(r => setProveedores(r.data.proveedores)).finally(() => setLoading(false)) }
    
    useEffect(() => { 
        setTitulo('Proveedores')
        return () => {
            setTitulo('')
            setSubtitulo('')
        }
    }, [])

    useEffect(() => {
        setSubtitulo(`${proveedores.length} proveedores registrados`)
    }, [proveedores])

    useEffect(() => { load() }, [buscar])

    const openCrear = () => { setForm(empty); setSelected(null); setModal('form') }
    const openEditar = (p) => { setSelected(p); setForm({ ...p }); setModal('form') }
    const openDetalle = async (p) => {
        try {
            const { data } = await proveedoresAPI.getOne(p.id)
            setDetalle(data.proveedor)
            setModal('detalle')
        } catch (e) { toast.error('Error al cargar detalle') }
    }
    const closeModal = () => { setModal(null); setSelected(null); setDetalle(null) }

    const handleSave = async () => {
        if (!form.nombre) return toast.error('El nombre es obligatorio')
        setSaving(true)
        try {
            if (selected) { await proveedoresAPI.actualizar(selected.id, form); toast.success('Proveedor actualizado') }
            else { await proveedoresAPI.crear(form); toast.success('Proveedor creado') }
            closeModal(); load()
        } catch (e) { toast.error(e.response?.data?.mensaje || 'Error') }
        finally { setSaving(false) }
    }

    const handleDelete = async (p) => {
        if (!window.confirm(`¿Estás seguro de que deseas eliminar a "${p.nombre}"?`)) return
        try {
            await proveedoresAPI.eliminar(p.id)
            toast.success('Proveedor eliminado')
            load()
        } catch (e) { toast.error('Error al eliminar proveedor') }
    }

    const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

    return (
        <div>
            <div className="flex items-center justify-end mb-6">
                <button onClick={openCrear} className="btn-primary"><Plus size={16} />Nuevo proveedor</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {loading && [...Array(4)].map((_, i) => <div key={i} className="h-40 bg-white rounded-2xl animate-pulse" />)}
                {!loading && proveedores.map(p => (
                    <div key={p.id} className="card group hover:shadow-md transition-all duration-200">
                        <div className="flex items-start justify-between mb-3">
                            <div className="w-10 h-10 rounded-xl bg-orchid-100 flex items-center justify-center">
                                <Truck size={18} className="text-orchid-600" />
                            </div>
                             <div className="flex gap-1">
                                 <button onClick={() => openDetalle(p)} className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-blue-50 flex items-center justify-center text-gray-400 hover:text-blue-600 transition-colors">
                                     <Eye size={13} />
                                 </button>
                                 <button onClick={() => openEditar(p)} className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-orchid-50 flex items-center justify-center text-gray-400 hover:text-orchid-600 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100">
                                     <Edit2 size={13} />
                                 </button>
                                 {usuario?.rol === 'admin' && <button onClick={() => handleDelete(p)} className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-600 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100">
                                     <Trash2 size={13} />
                                 </button>}
                             </div>
                        </div>
                        <h3 className="font-semibold text-gray-800 mb-1">{p.nombre}</h3>
                        {p.contacto && <p className="text-sm text-gray-500 mb-2">{p.contacto}</p>}
                        <div className="space-y-1">
                            {p.email && <p className="text-xs text-gray-400 flex items-center gap-1.5">📧 {p.email}</p>}
                            {p.telefono && <p className="text-xs text-gray-400 flex items-center gap-1.5">📱 {p.telefono}</p>}
                            {p.direccion && <p className="text-xs text-gray-400 flex items-center gap-1.5">📍 {p.direccion}</p>}
                        </div>
                    </div>
                ))}
                {!loading && proveedores.length === 0 && (
                    <div className="col-span-full text-center py-16 text-gray-400">
                        <Truck size={40} className="mx-auto mb-3 opacity-30" />
                        <p>No hay proveedores registrados</p>
                    </div>
                )}
            </div>

            {modal === 'form' && (
                <Modal title={selected ? `Editar: ${selected.nombre}` : 'Nuevo proveedor'} onClose={closeModal}>
                    <div className="space-y-4">
                        <div><label className="label">Nombre *</label><input className="input" value={form.nombre} onChange={e => f('nombre', e.target.value)} /></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="label">Contacto</label><input className="input" value={form.contacto || ''} onChange={e => f('contacto', e.target.value)} /></div>
                            <div><label className="label">Teléfono</label><input className="input" value={form.telefono || ''} onChange={e => f('telefono', e.target.value)} /></div>
                        </div>
                        <div><label className="label">Email</label><input type="email" className="input" value={form.email || ''} onChange={e => f('email', e.target.value)} /></div>
                        <div><label className="label">Dirección</label><input className="input" value={form.direccion || ''} onChange={e => f('direccion', e.target.value)} /></div>
                        <div><label className="label">RFC</label><input className="input" value={form.rfc || ''} onChange={e => f('rfc', e.target.value)} /></div>
                        <div><label className="label">Notas</label><textarea className="input resize-none" rows={2} value={form.notas || ''} onChange={e => f('notas', e.target.value)} /></div>
                        <div className="flex gap-3 pt-2">
                            <button onClick={closeModal} className="btn-secondary flex-1 justify-center">Cancelar</button>
                            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
                                {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                {selected ? 'Guardar' : 'Crear'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {modal === 'detalle' && detalle && (
                <Modal title={`Expediente: ${detalle.nombre}`} onClose={closeModal}>
                    <div className="space-y-6">
                        {/* Resumen Superior */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 text-center">
                                <p className="text-[10px] text-emerald-400 font-black uppercase mb-1">Total Comprado</p>
                                <p className="text-2xl font-black text-emerald-600">{fmt(detalle.resumen?.total_comprado)}</p>
                                <p className="text-[10px] text-emerald-400 font-bold mt-1">{detalle.resumen?.total_ordenes} órdenes</p>
                            </div>
                            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 text-center">
                                <p className="text-[10px] text-rose-400 font-black uppercase mb-1">Saldo a Pagar</p>
                                <p className="text-2xl font-black text-rose-600">{fmt(detalle.resumen?.saldo_total)}</p>
                                <p className="text-[10px] text-rose-400 font-bold mt-1">Cuentas pendientes</p>
                            </div>
                        </div>

                        {/* Datos de Contacto */}
                        <div className="card bg-gray-50/50 border-gray-100 p-4 space-y-3">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-orchid-600 shadow-sm">
                                    <Truck size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black text-gray-800 truncate">{detalle.contacto || 'Sin contacto asignado'}</p>
                                    <p className="text-xs text-gray-400">{detalle.rfc || 'Sin RFC registrado'}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white">
                                <div>
                                    <p className="text-[10px] text-gray-400 font-black uppercase">Teléfono</p>
                                    <p className="text-xs font-bold text-gray-600">{detalle.telefono || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 font-black uppercase">Email</p>
                                    <p className="text-xs font-bold text-gray-600 truncate">{detalle.email || '-'}</p>
                                </div>
                            </div>
                            {detalle.direccion && (
                                <div className="pt-3 border-t border-white">
                                    <p className="text-[10px] text-gray-400 font-black uppercase">Dirección</p>
                                    <p className="text-xs font-bold text-gray-600">{detalle.direccion}</p>
                                </div>
                            )}
                        </div>

                        {/* Historial de Compras */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="h-px bg-gray-100 flex-1" />
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Últimas 20 Compras</p>
                                <div className="h-px bg-gray-100 flex-1" />
                            </div>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                {detalle.compras?.length === 0 ? (
                                    <p className="text-center py-8 text-gray-400 text-sm italic">Sin historial de compras registrado</p>
                                ) : detalle.compras.map((c, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-gray-50 hover:bg-gray-50 transition-colors group">
                                        <div>
                                            <p className="text-xs font-black text-orchid-600">{c.folio}</p>
                                            <p className="text-[10px] text-gray-400">{new Date(c.fecha_compra).toLocaleDateString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-gray-800">{fmt(c.total)}</p>
                                            <p className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full inline-block ${
                                                c.estado === 'pagada' ? 'bg-emerald-100 text-emerald-700' : 
                                                c.estado === 'cancelada' ? 'bg-red-100 text-red-700' : 
                                                'bg-amber-100 text-amber-700'
                                            }`}>
                                                {c.estado}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    )
}