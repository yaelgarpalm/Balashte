import { useState, useEffect } from 'react'
import { beneficiosAPI } from '../services/api'
import toast from 'react-hot-toast'
import { Plus, Edit2, Gift, X, Trash2, Check, Percent, DollarSign, Star, Award } from 'lucide-react'
import { useUI } from '../context/UIContext'

function Modal({ title, onClose, children }) {
    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <h2 className="font-display font-bold text-gray-800">{title}</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200"><X size={16} /></button>
                </div>
                <div className="p-5">{children}</div>
            </div>
        </div>
    )
}

const empty = { nombre: '', descripcion: '', tipo: 'comision', valor: 0, target_type: 'empleado', activo: true, is_automatic: false }

export default function Beneficios() {
    const { setTitulo, setSubtitulo, buscar } = useUI()
    const [beneficios, setBeneficios] = useState([])
    const [loading, setLoading] = useState(true)
    const [modal, setModal] = useState(false)
    const [selected, setSelected] = useState(null)
    const [form, setForm] = useState(empty)
    const [saving, setSaving] = useState(false)

    const load = async () => {
        setLoading(true)
        try {
            const { data } = await beneficiosAPI.getAll()
            setBeneficios(data.beneficios)
        } catch (e) { toast.error('Error al cargar beneficios') }
        finally { setLoading(false) }
    }

    useEffect(() => {
        setTitulo('Administración de Beneficios')
        setSubtitulo('Gestiona comisiones, bonos y puntos')
        load()
        return () => {
            setTitulo('')
            setSubtitulo('')
        }
    }, [])

    const filtered = beneficios.filter(b => 
        b.nombre.toLowerCase().includes(buscar.toLowerCase()) ||
        (b.descripcion && b.descripcion.toLowerCase().includes(buscar.toLowerCase()))
    )

    const openCrear = () => { setForm(empty); setSelected(null); setModal(true) }
    const openEditar = (b) => { setSelected(b); setForm({ ...b }); setModal(true) }
    const closeModal = () => { setModal(false); setSelected(null) }

    const handleSave = async () => {
        if (!form.nombre || !form.valor) return toast.error('Nombre y valor son obligatorios')
        setSaving(true)
        try {
            if (selected) { await beneficiosAPI.actualizar(selected.id, form); toast.success('Beneficio actualizado') }
            else { await beneficiosAPI.crear(form); toast.success('Beneficio creado') }
            closeModal(); load()
        } catch (e) { toast.error(e.response?.data?.mensaje || 'Error') }
        finally { setSaving(false) }
    }

    const handleDelete = async (b) => {
        if (!window.confirm(`¿Estás seguro de eliminar "${b.nombre}"?`)) return
        try {
            await beneficiosAPI.eliminar(b.id)
            toast.success('Beneficio eliminado')
            load()
        } catch (e) { toast.error('Error al eliminar') }
    }

    const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

    const getIcon = (tipo) => {
        switch (tipo) {
            case 'comision': return <Percent size={14} className="text-blue-500" />
            case 'puntos': return <Star size={14} className="text-amber-500" />
            case 'bono': return <DollarSign size={14} className="text-green-500" />
            case 'descuento': return <Award size={14} className="text-orchid-500" />
            default: return <Gift size={14} />
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{filtered.length} beneficios encontrados</p>
                <button onClick={openCrear} className="btn-primary"><Plus size={16} />Nuevo beneficio</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading && [...Array(3)].map((_, i) => <div key={i} className="h-40 bg-white rounded-2xl animate-pulse" />)}
                {!loading && filtered.map(b => (
                    <div key={b.id} className="card group hover:shadow-md transition-all">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${b.activo ? 'bg-orchid-50 text-orchid-600' : 'bg-gray-100 text-gray-400'}`}>
                                    {getIcon(b.tipo)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800">{b.nombre}</h3>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${b.target_type === 'cliente' ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-green-600 bg-green-50 border-green-100'}`}>
                                        {b.target_type}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => openEditar(b)} className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-orchid-50 flex items-center justify-center text-gray-400 hover:text-orchid-600 transition-colors">
                                    <Edit2 size={13} />
                                </button>
                                <button onClick={() => handleDelete(b)} className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-600 transition-colors">
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2 mb-4 h-8">{b.descripcion || 'Sin descripción'}</p>
                        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase font-bold">Valor</p>
                                <p className="text-lg font-display font-bold text-gray-800">
                                    {b.tipo === 'descuento' || b.tipo === 'comision' ? `${b.valor}%` : b.tipo === 'puntos' ? `${b.valor} pts` : `$${b.valor}`}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-gray-400 uppercase font-bold">Estado</p>
                                <span className={`flex items-center gap-1 text-xs font-bold ${b.activo ? 'text-green-600' : 'text-gray-400'}`}>
                                    {b.activo ? <Check size={12} /> : <X size={12} />}
                                    {b.activo ? 'Activo' : 'Inactivo'}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {modal && (
                <Modal title={selected ? 'Editar Beneficio' : 'Nuevo Beneficio'} onClose={closeModal}>
                    <div className="space-y-4">
                        <div><label className="label">Nombre del Beneficio *</label><input className="input" value={form.nombre} onChange={e => f('nombre', e.target.value)} placeholder="Ej. Bono de Navidad" /></div>
                        <div><label className="label">Descripción</label><textarea className="input min-h-[80px]" value={form.descripcion} onChange={e => f('descripcion', e.target.value)} placeholder="Detalles del beneficio..." /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label">Tipo</label>
                                <select className="input" value={form.tipo} onChange={e => f('tipo', e.target.value)}>
                                    <option value="comision">Comisión (%)</option>
                                    <option value="bono">Bono Fijo ($)</option>
                                    <option value="puntos">Puntos Loyalty</option>
                                    <option value="descuento">Descuento (%)</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">Valor</label>
                                <input type="number" className="input" value={form.valor} onChange={e => f('valor', e.target.value)} />
                            </div>
                        </div>
                        <div>
                            <label className="label">Aplicar a</label>
                            <div className="flex gap-4">
                                {['empleado', 'cliente'].map(t => (
                                    <label key={t} className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" checked={form.target_type === t} onChange={() => f('target_type', t)} className="w-4 h-4 accent-orchid-600" />
                                        <span className="text-sm text-gray-700 capitalize">{t}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="is_automatic" checked={form.is_automatic} onChange={e => f('is_automatic', e.target.checked)} className="w-4 h-4 accent-orchid-600" />
                                <label htmlFor="is_automatic" className="text-sm text-gray-700">Aplicar automáticamente al crear {form.target_type === 'cliente' ? 'un cliente' : 'un empleado'}</label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="activo" checked={form.activo} onChange={e => f('activo', e.target.checked)} className="w-4 h-4 accent-orchid-600" />
                                <label htmlFor="activo" className="text-sm text-gray-700">Beneficio activo</label>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-4">
                            <button onClick={closeModal} className="btn-secondary flex-1">Cancelar</button>
                            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
                                {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />}
                                {selected ? 'Guardar Cambios' : 'Crear Beneficio'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    )
}
