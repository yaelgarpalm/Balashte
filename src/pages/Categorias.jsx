import { useState, useEffect } from 'react'
import { categoriasAPI } from '../services/api'
import toast from 'react-hot-toast'
import { Plus, Search, Edit2, Trash2, Flower2, Package, MoreVertical } from 'lucide-react'
import { useUI } from '../context/UIContext'
import Modal from '../components/common/Modal'

const emptyCat = { nombre: '', descripcion: '' }

export default function Categorias() {
    const { setTitulo, setSubtitulo, buscar } = useUI()
    const [categorias, setCategorias] = useState([])
    const [loading, setLoading] = useState(true)
    const [modal, setModal] = useState(null) // null | 'crear' | 'editar' | 'eliminar'
    const [selected, setSelected] = useState(null)
    const [form, setForm] = useState(emptyCat)
    const [saving, setSaving] = useState(false)

    const load = async () => {
        setLoading(true)
        try {
            const { data } = await categoriasAPI.getAll()
            setCategorias(data.categorias)
        } catch (e) {
            toast.error('Error al cargar categorías')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        setTitulo('Categorías')
        load()
        return () => {
            setTitulo('')
            setSubtitulo('')
        }
    }, [])

    useEffect(() => {
        setSubtitulo(`${categorias.length} categorías registradas`)
    }, [categorias])

    const filtered = categorias.filter(c => 
        c.nombre.toLowerCase().includes(buscar.toLowerCase()) ||
        (c.descripcion && c.descripcion.toLowerCase().includes(buscar.toLowerCase()))
    )

    const openCrear = () => { setForm(emptyCat); setModal('crear') }
    const openEditar = (c) => { setSelected(c); setForm({ nombre: c.nombre, descripcion: c.descripcion || '' }); setModal('editar') }
    const openEliminar = (c) => { setSelected(c); setModal('eliminar') }
    
    const closeModal = () => {
        setModal(null)
        setSelected(null)
        setForm(emptyCat)
    }

    const handleSave = async () => {
        if (!form.nombre.trim()) return toast.error('El nombre es obligatorio')
        setSaving(true)
        try {
            if (modal === 'crear') {
                await categoriasAPI.crear(form)
                toast.success('Categoría creada')
            } else {
                await categoriasAPI.actualizar(selected.id, form)
                toast.success('Categoría actualizada')
            }
            closeModal()
            load()
        } catch (e) {
            toast.error(e.response?.data?.mensaje || 'Error al guardar')
        } finally {
            setSaving(false)
        }
    }

    const handleEliminar = async () => {
        setSaving(true)
        try {
            await categoriasAPI.eliminar(selected.id)
            toast.success('Categoría eliminada')
            closeModal()
            load()
        } catch (e) {
            toast.error('Error al eliminar categoría')
        } finally {
            setSaving(false)
        }
    }

    const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-end">
                <button onClick={openCrear} className="btn-primary h-12 px-6">
                    <Plus size={18} />
                    <span className="hidden sm:inline">Nueva categoría</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    [...Array(6)].map((_, i) => (
                        <div key={i} className="card h-40 animate-pulse bg-gray-50/50" />
                    ))
                ) : filtered.length === 0 ? (
                    <div className="col-span-full py-20 text-center">
                        <div className="w-20 h-20 bg-orchid-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Flower2 size={40} className="text-orchid-300" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-700">No hay categorías</h3>
                        <p className="text-gray-400 mt-1">Intenta con otro término o crea una nueva</p>
                    </div>
                ) : (
                    filtered.map(cat => (
                        <div key={cat.id} className="card group hover:border-orchid-200 hover:shadow-md transition-all duration-300">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-orchid-50 text-orchid-600 flex items-center justify-center group-hover:bg-orchid-600 group-hover:text-white transition-colors duration-300">
                                    <Flower2 size={24} />
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => openEditar(cat)} className="p-2 rounded-xl text-gray-400 hover:text-orchid-600 hover:bg-orchid-50 transition-all">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => openEliminar(cat)} className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            
                            <h3 className="font-bold text-gray-800 text-lg mb-1">{cat.nombre}</h3>
                            <p className="text-gray-500 text-sm line-clamp-2 mb-4 h-10">
                                {cat.descripcion || 'Sin descripción'}
                            </p>
                            
                            <div className="pt-4 border-t border-gray-50 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                                <span className="text-gray-400">Productos</span>
                                <div className="flex items-center gap-1.5 text-orchid-600">
                                    <Package size={14} />
                                    <span>{cat.total_productos || 0}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal Crear/Editar */}
            {(modal === 'crear' || modal === 'editar') && (
                <Modal title={modal === 'crear' ? 'Nueva categoría' : 'Editar categoría'} onClose={closeModal}>
                    <div className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Nombre de la categoría</label>
                            <input 
                                autoFocus
                                className="w-full bg-white border border-orchid-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orchid-400 focus:border-transparent transition-all" 
                                value={form.nombre} 
                                onChange={e => f('nombre', e.target.value)}
                                placeholder="Ej. Orquídeas Exóticas"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Descripción (opcional)</label>
                            <textarea 
                                className="w-full bg-white border border-orchid-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orchid-400 focus:border-transparent transition-all resize-none" 
                                rows={3}
                                value={form.descripcion} 
                                onChange={e => f('descripcion', e.target.value)}
                                placeholder="Breve descripción de la categoría..."
                            />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button onClick={closeModal} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50 transition-colors">
                                Cancelar
                            </button>
                            <button 
                                onClick={handleSave} 
                                disabled={saving} 
                                className="flex-1 px-4 py-3 rounded-xl bg-orchid-700 text-white text-sm font-bold hover:bg-orchid-800 transition-colors shadow-lg shadow-orchid-100 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                                {modal === 'crear' ? 'Crear categoría' : 'Guardar cambios'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Modal Eliminar */}
            {modal === 'eliminar' && (
                <Modal title="¿Eliminar categoría?" onClose={closeModal}>
                    <div className="text-center py-4">
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={32} />
                        </div>
                        <p className="text-gray-600 mb-2">¿Estás seguro que deseas eliminar la categoría <span className="font-bold text-gray-800">{selected?.nombre}</span>?</p>
                        <p className="text-xs text-gray-400 bg-amber-50 p-3 rounded-lg border border-amber-100 text-amber-700 font-medium">
                            Nota: Los productos asociados a esta categoría no serán eliminados, pero quedarán sin categoría asignada.
                        </p>
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button onClick={closeModal} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50 transition-colors">
                            Cancelar
                        </button>
                        <button 
                            onClick={handleEliminar} 
                            disabled={saving} 
                            className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-100 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                            Sí, eliminar
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    )
}
