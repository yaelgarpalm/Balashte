import { useState, useEffect } from 'react'
import { usuariosAPI } from '../services/api'
import toast from 'react-hot-toast'
import { Plus, Edit2, UserCog, X, Shield, Trash2, Gift } from 'lucide-react'
import { useUI } from '../context/UIContext'
import BenefitAssigner from '../components/common/BenefitAssigner'

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

const empty = { nombre: '', email: '', password: '', rol_id: '', activo: true }

export default function Usuarios() {
    const { setTitulo, setSubtitulo } = useUI()
    const [usuarios, setUsuarios] = useState([])
    const [roles, setRoles] = useState([])
    const [loading, setLoading] = useState(true)
    const [modal, setModal] = useState(false)
    const [selected, setSelected] = useState(null)
    const [form, setForm] = useState(empty)
    const [saving, setSaving] = useState(false)

    const load = () => {
        setLoading(true)
        Promise.all([usuariosAPI.getAll(), usuariosAPI.roles()]).then(([u, r]) => { setUsuarios(u.data.usuarios); setRoles(r.data.roles) }).finally(() => setLoading(false))
    }
    
    useEffect(() => { 
        setTitulo('Usuarios del Sistema')
        return () => {
            setTitulo('')
            setSubtitulo('')
        }
    }, [])

    useEffect(() => {
        setSubtitulo(`${usuarios.length} cuentas registradas`)
    }, [usuarios])

    useEffect(() => { load() }, [])

    const openCrear = () => { setForm(empty); setSelected(null); setModal(true) }
    const openEditar = (u) => { setSelected(u); setForm({ ...u, password: '', rol_id: roles.find(r => r.nombre === u.rol)?.id || '' }); setModal(true) }
    const closeModal = () => { setModal(false); setSelected(null) }

    const handleSave = async () => {
        if (!form.nombre || !form.email || !form.rol_id) return toast.error('Nombre, email y rol son obligatorios')
        if (!selected && !form.password) return toast.error('La contraseña es obligatoria for nuevos usuarios')
        setSaving(true)
        try {
            if (selected) { await usuariosAPI.actualizar(selected.id, form); toast.success('Usuario actualizado') }
            else { await usuariosAPI.crear(form); toast.success('Usuario creado') }
            closeModal(); load()
        } catch (e) { toast.error(e.response?.data?.mensaje || 'Error') }
        finally { setSaving(false) }
    }

    const handleDelete = async (u) => {
        if (!window.confirm(`¿Estás seguro de que deseas eliminar a "${u.nombre}"?`)) return
        try {
            await usuariosAPI.eliminar(u.id)
            toast.success('Usuario eliminado')
            load()
        } catch (e) { toast.error('Error al eliminar usuario') }
    }

    const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
    const rolColor = (r) => r === 'admin' ? 'badge-red' : r === 'vendedor' ? 'badge-green' : 'badge-yellow'

    return (
        <div>
            <div className="flex items-center justify-end mb-6">
                <button onClick={openCrear} className="btn-primary"><Plus size={16} />Nuevo usuario</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {loading && [...Array(3)].map((_, i) => <div key={i} className="h-36 bg-white rounded-2xl animate-pulse" />)}
                {!loading && usuarios.map(u => (
                    <div key={u.id} className="card group hover:shadow-md transition-all duration-200">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-orchid-500 flex items-center justify-center text-white font-bold">
                                    {u.nombre.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-800">{u.nombre}</p>
                                    <span className={rolColor(u.rol)}><Shield size={10} />{u.rol}</span>
                                </div>
                            </div>
                             <div className="flex gap-1">
                                <button onClick={() => openEditar(u)} className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-orchid-50 flex items-center justify-center text-gray-400 hover:text-orchid-600 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100">
                                    <Edit2 size={13} />
                                </button>
                                <button onClick={() => handleDelete(u)} className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-600 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100">
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 mb-1">{u.email}</p>
                        <div className="flex items-center gap-2">
                            <span className={u.activo ? 'badge-green' : 'badge-red'}>{u.activo ? 'Activo' : 'Inactivo'}</span>
                            {u.ultimo_login && <span className="text-xs text-gray-400">Último login: {new Date(u.ultimo_login).toLocaleDateString('es-MX')}</span>}
                        </div>
                    </div>
                ))}
                {!loading && usuarios.length === 0 && (
                    <div className="col-span-full text-center py-16 text-gray-400">
                        <UserCog size={40} className="mx-auto mb-3 opacity-30" />
                        <p>No hay usuarios</p>
                    </div>
                )}
            </div>

            {modal && (
                <Modal title={selected ? 'Editar usuario' : 'Nuevo usuario'} onClose={closeModal}>
                    <div className="space-y-4">
                        <div><label className="label">Nombre *</label><input className="input" value={form.nombre} onChange={e => f('nombre', e.target.value)} /></div>
                        <div><label className="label">Email *</label><input type="email" className="input" value={form.email} onChange={e => f('email', e.target.value)} /></div>
                        <div><label className="label">{selected ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}</label>
                            <input type="password" className="input" value={form.password} onChange={e => f('password', e.target.value)} placeholder={selected ? 'Nueva contraseña' : 'Mínimo 6 caracteres'} />
                        </div>
                        <div><label className="label">Rol *</label>
                            <select className="input" value={form.rol_id} onChange={e => f('rol_id', e.target.value)}>
                                <option value="">Seleccionar rol</option>
                                {roles.map(r => <option key={r.id} value={r.id}>{r.nombre} — {r.descripcion}</option>)}
                            </select>
                        </div>
                        {selected && (
                            <div className="flex items-center gap-3">
                                <input type="checkbox" id="activo" checked={form.activo} onChange={e => f('activo', e.target.checked)} className="w-4 h-4 accent-orchid-600" />
                                <label htmlFor="activo" className="text-sm text-gray-700">Usuario activo</label>
                            </div>
                        )}

                        {selected && (
                            <div className="pt-4 border-t border-gray-100">
                                <BenefitAssigner type="empleado" id={selected.id} />
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
        </div>
    )
}