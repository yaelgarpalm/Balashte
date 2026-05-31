import { useState, useEffect } from 'react'
import { clientesAPI } from '../services/api'
import toast from 'react-hot-toast'
import { Plus, Search, Edit2, User, X, Eye, Trash2, Gift } from 'lucide-react'
import { useUI } from '../context/UIContext'
import { useAuth } from '../context/AuthContext'
import BenefitAssigner from '../components/common/BenefitAssigner'

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

const emptyCliente = { nombre: '', email: '', telefono: '', direccion: '', rfc: '', tipo: 'publico_general', descuento_default: 0, notas: '', regimen_fiscal: '', codigo_postal: '', uso_cfdi: 'G03' }

const REGIMENES_FISCALES = [
    { id: '601', name: '601 - General de Ley Personas Morales' },
    { id: '603', name: '603 - Personas Morales con Fines no Lucrativos' },
    { id: '605', name: '605 - Sueldos y Salarios e Ingresos Asimilados a Salarios' },
    { id: '606', name: '606 - Arrendamiento' },
    { id: '612', name: '612 - Personas Físicas con Actividades Empresariales y Profesionales' },
    { id: '621', name: '621 - Incorporación Fiscal' },
    { id: '626', name: '626 - Régimen Simplificado de Confianza (RESICO)' },
]

const USOS_CFDI = [
    { id: 'G01', name: 'G01 - Adquisición de mercancías' },
    { id: 'G03', name: 'G03 - Gastos en general' },
    { id: 'S01', name: 'S01 - Sin efectos fiscales' },
]

export default function Clientes() {
    const { setTitulo, setSubtitulo, buscar } = useUI()
    const { usuario } = useAuth()
    const [clientes, setClientes] = useState([])
    const [loading, setLoading] = useState(true)
    const [modal, setModal] = useState(null)
    const [selected, setSelected] = useState(null)
    const [detalle, setDetalle] = useState(null)
    const [form, setForm] = useState(emptyCliente)
    const [saving, setSaving] = useState(false)

    const load = () => { setLoading(true); clientesAPI.getAll({ buscar }).then(r => setClientes(r.data.clientes)).finally(() => setLoading(false)) }
    
    useEffect(() => { 
        setTitulo('Clientes')
        return () => {
            setTitulo('')
            setSubtitulo('')
        }
    }, [])

    useEffect(() => {
        setSubtitulo(`${clientes.length} clientes en el sistema`)
    }, [clientes])

    useEffect(() => { load() }, [buscar])

    const openCrear = () => { setForm(emptyCliente); setModal('form') }
    const openEditar = (c) => { setSelected(c); setForm({ ...c }); setModal('form') }
    const openDetalle = async (c) => {
        const { data } = await clientesAPI.getOne(c.id)
        setDetalle(data.cliente)
        setModal('detalle')
    }
    const closeModal = () => { setModal(null); setSelected(null); setDetalle(null) }

    const handleSave = async () => {
        if (!form.nombre) return toast.error('El nombre es obligatorio')
        setSaving(true)
        try {
            if (selected) { await clientesAPI.actualizar(selected.id, form); toast.success('Cliente actualizado') }
            else { await clientesAPI.crear(form); toast.success('Cliente creado') }
            closeModal(); load()
        } catch (e) { toast.error(e.response?.data?.mensaje || 'Error') }
        finally { setSaving(false) }
    }

    const handleDelete = async (c) => {
        if (!window.confirm(`¿Estás seguro de que deseas eliminar a "${c.nombre}"?`)) return
        try {
            await clientesAPI.eliminar(c.id)
            toast.success('Cliente eliminado')
            load()
        } catch (e) { toast.error('Error al eliminar cliente') }
    }

    const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
    const tipoBadge = (t) => {
        if (t === 'frecuente') return <span className="badge-purple">Frecuente</span>
        if (t === 'mayorista') return <span className="badge-green">Mayorista</span>
        return <span className="text-xs text-gray-400">General</span>
    }

    return (
        <div>
            <div className="flex items-center justify-end mb-6">
                <button onClick={openCrear} className="btn-primary"><Plus size={16} />Nuevo cliente</button>
            </div>


            <div className="card p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                    <thead className="border-b border-gray-50">
                        <tr>
                            <th className="th">Cliente</th>
                            <th className="th">Contacto</th>
                            <th className="th">Tipo</th>
                            <th className="th">Compras</th>
                            <th className="th">Total gastado</th>
                            <th className="th">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && [...Array(4)].map((_, i) => (
                            <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                        ))}
                        {!loading && clientes.map(c => (
                            <tr key={c.id} className="table-row">
                                <td className="td">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-orchid-100 flex items-center justify-center flex-shrink-0">
                                            <span className="text-orchid-700 text-xs font-bold">{c.nombre.charAt(0)}</span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-800 text-sm">{c.nombre}</p>
                                            {c.rfc && <p className="text-xs text-gray-400">{c.rfc}</p>}
                                        </div>
                                    </div>
                                </td>
                                <td className="td">
                                    <p className="text-sm text-gray-700">{c.email || '-'}</p>
                                    <p className="text-xs text-gray-400">{c.telefono || ''}</p>
                                </td>
                                <td className="td">{tipoBadge(c.tipo)}</td>
                                <td className="td text-sm font-medium text-gray-700">{c.total_compras || 0}</td>
                                <td className="td font-semibold text-gray-800">{fmt(c.total_gastado)}</td>
                                <td className="td">
                                    <div className="flex gap-1">
                                        <button onClick={() => openDetalle(c)} className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600 transition-colors"><Eye size={13} /></button>
                                        <button onClick={() => openEditar(c)} className="w-8 h-8 rounded-lg bg-orchid-50 hover:bg-orchid-100 flex items-center justify-center text-orchid-600 transition-colors"><Edit2 size={13} /></button>
                                        {usuario?.rol === 'admin' && <button onClick={() => handleDelete(c)} className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-600 transition-colors"><Trash2 size={13} /></button>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {!loading && clientes.length === 0 && (
                            <tr><td colSpan={6} className="text-center py-12 text-gray-400"><User size={32} className="mx-auto mb-2 opacity-30" /><p>No hay clientes</p></td></tr>
                        )}
                    </tbody>
                    </table>
                </div>
            </div>

            {modal === 'form' && (
                <Modal title={selected ? 'Editar cliente' : 'Nuevo cliente'} onClose={closeModal}>
                    <div className="space-y-4">
                        <div><label className="label">Nombre completo *</label><input className="input" value={form.nombre} onChange={e => f('nombre', e.target.value)} /></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="label">Email</label><input type="email" className="input" value={form.email || ''} onChange={e => f('email', e.target.value)} /></div>
                            <div><label className="label">Teléfono</label><input className="input" value={form.telefono || ''} onChange={e => f('telefono', e.target.value)} /></div>
                        </div>
                        <div><label className="label">Dirección</label><input className="input" value={form.direccion || ''} onChange={e => f('direccion', e.target.value)} /></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="label">RFC</label><input className="input" placeholder="XAXX010101000" value={form.rfc || ''} onChange={e => f('rfc', e.target.value.toUpperCase())} /></div>
                            <div><label className="label">Código Postal</label><input className="input" maxLength={5} value={form.codigo_postal || ''} onChange={e => f('codigo_postal', e.target.value)} /></div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            <div><label className="label">Régimen Fiscal (SAT)</label>
                                <select className="input" value={form.regimen_fiscal || ''} onChange={e => f('regimen_fiscal', e.target.value)}>
                                    <option value="">Seleccionar régimen...</option>
                                    {REGIMENES_FISCALES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="label">Uso de CFDI</label>
                                <select className="input" value={form.uso_cfdi || 'G03'} onChange={e => f('uso_cfdi', e.target.value)}>
                                    {USOS_CFDI.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </div>
                            <div><label className="label">Tipo de Cliente</label>
                                <select className="input" value={form.tipo} onChange={e => f('tipo', e.target.value)}>
                                    <option value="publico_general">Público general</option>
                                    <option value="frecuente">Frecuente</option>
                                    <option value="mayorista">Mayorista</option>
                                </select>
                            </div>
                        </div>
                        <div><label className="label">Descuento fijo %</label><input type="number" min="0" max="100" className="input" value={form.descuento_default || 0} onChange={e => f('descuento_default', e.target.value)} /></div>
                        <div><label className="label">Notas</label><textarea className="input resize-none" rows={2} value={form.notas || ''} onChange={e => f('notas', e.target.value)} /></div>
                        
                        {selected && (
                            <div className="pt-4 border-t border-gray-100">
                                <BenefitAssigner type="cliente" id={selected.id} />
                            </div>
                        )}

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
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-center">
                                <p className="text-[10px] text-rose-400 font-black uppercase mb-1">Deuda Total</p>
                                <p className="text-xl font-black text-rose-600">{fmt(detalle.resumen?.saldo_deudor)}</p>
                            </div>
                            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
                                <p className="text-[10px] text-emerald-400 font-black uppercase mb-1">Total Ventas</p>
                                <p className="text-xl font-black text-emerald-600">{fmt(detalle.resumen?.total_historico)}</p>
                            </div>
                            <div className="bg-orchid-50 border border-orchid-100 rounded-2xl p-4 text-center">
                                <p className="text-[10px] text-orchid-400 font-black uppercase mb-1">Visitas</p>
                                <p className="text-xl font-black text-orchid-600">{detalle.resumen?.visitas}</p>
                            </div>
                        </div>

                        {/* Datos de Contacto */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Email / Teléfono</p>
                                <p className="font-medium">{detalle.email || 'Sin email'}</p>
                                <p className="text-xs text-gray-500">{detalle.telefono || 'Sin teléfono'}</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Categoría / RFC / Régimen</p>
                                <p className="font-medium capitalize">{detalle.tipo?.replace('_', ' ')}</p>
                                <p className="text-xs text-gray-500">{detalle.rfc || 'Sin RFC'} - {detalle.regimen_fiscal || 'Sin Régimen'}</p>
                                <p className="text-[10px] text-gray-400 mt-1">CP: {detalle.codigo_postal || 'N/A'}</p>
                            </div>
                        </div>

                        {/* Apartados Pendientes */}
                        {detalle.apartados?.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="h-px bg-gray-100 flex-1" />
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Apartados Activos</p>
                                    <div className="h-px bg-gray-100 flex-1" />
                                </div>
                                <div className="space-y-2">
                                    {detalle.apartados.map((a, i) => (
                                        <div key={i} className="flex justify-between items-center p-3 bg-rose-50/50 rounded-xl border border-rose-100/50">
                                            <div>
                                                <p className="text-xs font-black text-rose-700">{a.folio}</p>
                                                <p className="text-[10px] text-gray-400">{new Date(a.created_at).toLocaleDateString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-rose-600">{fmt(a.saldo_pendiente)}</p>
                                                <p className="text-[10px] text-rose-400 uppercase font-bold">{a.estado}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Últimas Ventas */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="h-px bg-gray-100 flex-1" />
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Últimas 10 Ventas</p>
                                <div className="h-px bg-gray-100 flex-1" />
                            </div>
                            <div className="space-y-1">
                                {(detalle.compras || []).length === 0 && <p className="text-sm text-gray-400 text-center py-4 italic">Sin historial de ventas completadas</p>}
                                {(detalle.compras || []).map((c, i) => (
                                    <div key={i} className="flex justify-between py-2.5 border-b border-gray-50 last:border-0 text-sm group">
                                        <div>
                                            <p className="font-mono text-orchid-700 text-xs font-bold">{c.folio}</p>
                                            <p className="text-[10px] text-gray-400">{new Date(c.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-gray-700">{fmt(c.total)}</p>
                                            <p className="text-[10px] capitalize text-gray-400">{c.metodo_pago}</p>
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