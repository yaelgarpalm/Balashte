import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Calculator, Factory, Plus, Save, Trash2, TrendingDown, TrendingUp, X } from 'lucide-react'
import { productosAPI, produccionAPI } from '../services/api'
import { useUI } from '../context/UIContext'
import Modal from '../components/common/Modal'

const fmt = (n) => `MXN ${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

const emptyForm = {
    producto_id: '',
    cantidad_producida: 1,
    codigo_lote: '',
    notas: '',
    insumos: [],
}

export default function Produccion() {
    const { setTitulo, setSubtitulo, buscar } = useUI()
    const [productos, setProductos] = useState([])
    const [formulas, setFormulas] = useState([])
    const [lotes, setLotes] = useState([])
    const [form, setForm] = useState(emptyForm)
    const [calculo, setCalculo] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [modalLote, setModalLote] = useState(null)

    const productosById = useMemo(() => {
        const map = new Map()
        productos.forEach(p => map.set(Number(p.id), p))
        return map
    }, [productos])

    const load = async () => {
        setLoading(true)
        try {
            const [pRes, fRes, lRes] = await Promise.all([
                productosAPI.getAll({ limit: 500, activo: 'true' }),
                produccionAPI.getFormulas({ buscar }),
                produccionAPI.getLotes({ buscar, limit: 40 }),
            ])
            setProductos(pRes.data.productos || [])
            setFormulas(fRes.data.formulas || [])
            setLotes(lRes.data.lotes || [])
        } catch (error) {
            toast.error('No se pudo cargar producción')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        setTitulo('Producción')
        return () => {
            setTitulo('')
            setSubtitulo('')
        }
    }, [])

    useEffect(() => {
        setSubtitulo(`${lotes.length} lotes recientes · ${formulas.length} fórmulas activas`)
    }, [lotes, formulas])

    useEffect(() => { load() }, [buscar])

    const setField = (key, value) => {
        setForm(prev => ({ ...prev, [key]: value }))
        setCalculo(null)
    }

    const addInsumo = () => {
        setForm(prev => ({ ...prev, insumos: [...prev.insumos, { producto_id: '', cantidad: 1 }] }))
        setCalculo(null)
    }

    const updateInsumo = (idx, key, value) => {
        setForm(prev => ({
            ...prev,
            insumos: prev.insumos.map((item, i) => i === idx ? { ...item, [key]: value } : item),
        }))
        setCalculo(null)
    }

    const removeInsumo = (idx) => {
        setForm(prev => ({ ...prev, insumos: prev.insumos.filter((_, i) => i !== idx) }))
        setCalculo(null)
    }

    const loadFormula = async (productoId) => {
        setField('producto_id', productoId)
        if (!productoId) return
        try {
            const { data } = await produccionAPI.getFormulaProducto(productoId)
            if (data.insumos?.length) {
                setForm(prev => ({
                    ...prev,
                    producto_id: productoId,
                    insumos: data.insumos.map(item => ({
                        producto_id: item.producto_insumo_id || item.producto_id,
                        cantidad: Number(item.cantidad || 1),
                    })),
                }))
                setCalculo({ insumos: data.insumos, costo_total: data.costo_total, costo_unitario_produccion: Number(data.costo_total || 0) / Number(form.cantidad_producida || 1) })
            }
        } catch {
            toast.error('No se pudo cargar la fórmula')
        }
    }

    const calcular = async () => {
        if (!form.producto_id && form.insumos.length === 0) return toast.error('Selecciona producto o insumos')
        try {
            const { data } = await produccionAPI.calcularCosto({
                producto_id: form.producto_id,
                cantidad_producida: Number(form.cantidad_producida || 1),
                insumos: form.insumos,
            })
            setCalculo(data)
        } catch (error) {
            toast.error(error.response?.data?.mensaje || 'No se pudo calcular el costo')
        }
    }

    const guardarFormula = async () => {
        if (!form.producto_id || form.insumos.length === 0) return toast.error('Producto e insumos son obligatorios')
        setSaving(true)
        try {
            await produccionAPI.guardarFormula({
                producto_id: form.producto_id,
                notas: form.notas,
                insumos: form.insumos,
            })
            toast.success('Fórmula guardada')
            await load()
        } catch (error) {
            toast.error(error.response?.data?.mensaje || 'Error al guardar fórmula')
        } finally {
            setSaving(false)
        }
    }

    const crearLote = async () => {
        if (!form.producto_id || Number(form.cantidad_producida) <= 0) return toast.error('Producto y cantidad producida son obligatorios')
        setSaving(true)
        try {
            const { data } = await produccionAPI.crearLote({
                producto_id: form.producto_id,
                cantidad_producida: Number(form.cantidad_producida),
                codigo_lote: form.codigo_lote || undefined,
                notas: form.notas,
                insumos: form.insumos,
            })
            toast.success(`Lote ${data.codigo_lote} registrado`)
            setForm(emptyForm)
            setCalculo(null)
            await load()
        } catch (error) {
            toast.error(error.response?.data?.mensaje || 'Error al registrar lote')
        } finally {
            setSaving(false)
        }
    }

    const verLote = async (lote) => {
        try {
            const { data } = await produccionAPI.getLote(lote.id)
            setModalLote(data)
        } catch {
            toast.error('No se pudo abrir el lote')
        }
    }

    const productoFinal = productosById.get(Number(form.producto_id))

    return (
        <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-5">
            <section className="space-y-5">
                <div className="card">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <div>
                            <h2 className="text-lg font-black text-gray-900">Ensamblar planta</h2>
                            <p className="text-xs text-gray-400">Costo automático por insumos y lote</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-orchid-50 text-orchid-700 flex items-center justify-center">
                            <Factory size={20} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                            <label className="label">Producto terminado</label>
                            <select className="input" value={form.producto_id} onChange={e => loadFormula(e.target.value)}>
                                <option value="">Seleccionar producto</option>
                                {productos.map(p => <option key={p.id} value={p.id}>{p.codigo} · {p.nombre}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label">Cantidad producida</label>
                            <input type="number" min="1" className="input" value={form.cantidad_producida} onChange={e => setField('cantidad_producida', Number(e.target.value) || 1)} />
                        </div>
                    </div>

                    <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                            <label className="label mb-0">Insumos</label>
                            <button onClick={addInsumo} className="btn-secondary text-xs py-1.5"><Plus size={14} />Agregar</button>
                        </div>
                        <div className="space-y-2">
                            {form.insumos.map((item, idx) => (
                                <div key={idx} className="grid grid-cols-[1fr_110px_36px] gap-2">
                                    <select className="input" value={item.producto_id} onChange={e => updateInsumo(idx, 'producto_id', e.target.value)}>
                                        <option value="">Seleccionar insumo</option>
                                        {productos.filter(p => Number(p.id) !== Number(form.producto_id)).map(p => (
                                            <option key={p.id} value={p.id}>{p.codigo} · {p.nombre} · {fmt(p.precio_compra)}</option>
                                        ))}
                                    </select>
                                    <input type="number" min="0.0001" step="0.0001" className="input" value={item.cantidad} onChange={e => updateInsumo(idx, 'cantidad', Number(e.target.value) || 0)} />
                                    <button onClick={() => removeInsumo(idx)} className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100">
                                        <X size={15} />
                                    </button>
                                </div>
                            ))}
                            {form.insumos.length === 0 && (
                                <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
                                    Agrega tutor, maceta, abrillantador, celofán u otros insumos.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                        <div>
                            <label className="label">Código de lote</label>
                            <input className="input" value={form.codigo_lote} onChange={e => setField('codigo_lote', e.target.value)} placeholder="Automático si se deja vacío" />
                        </div>
                        <div>
                            <label className="label">Notas</label>
                            <input className="input" value={form.notas} onChange={e => setField('notas', e.target.value)} placeholder="Observaciones de producción" />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-5">
                        <button onClick={calcular} className="btn-secondary"><Calculator size={16} />Calcular costo</button>
                        <button onClick={guardarFormula} disabled={saving} className="btn-secondary"><Save size={16} />Guardar fórmula</button>
                        <button onClick={crearLote} disabled={saving} className="btn-primary"><Factory size={16} />Registrar lote</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="card">
                        <p className="text-xs text-gray-400 font-bold uppercase">Producto</p>
                        <p className="text-sm font-black text-gray-800 mt-1 truncate">{productoFinal?.nombre || '-'}</p>
                    </div>
                    <div className="card">
                        <p className="text-xs text-gray-400 font-bold uppercase">Costo total</p>
                        <p className="text-2xl font-black text-orchid-800 mt-1">{fmt(calculo?.costo_total)}</p>
                    </div>
                    <div className="card">
                        <p className="text-xs text-gray-400 font-bold uppercase">Costo por planta</p>
                        <p className="text-2xl font-black text-jade-700 mt-1">{fmt(calculo?.costo_unitario_produccion)}</p>
                    </div>
                </div>

                {calculo?.insumos?.length > 0 && (
                    <div className="card p-0 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead><tr><th className="th">Insumo</th><th className="th">Cantidad base</th><th className="th">Stock</th><th className="th">Costo</th><th className="th">Subtotal</th></tr></thead>
                                <tbody>
                                    {calculo.insumos.map(item => (
                                        <tr key={item.producto_id || item.producto_insumo_id} className="table-row">
                                            <td className="td font-medium">{item.nombre}</td>
                                            <td className="td">{Number(item.cantidad || 0).toLocaleString('es-MX')} {item.unidad}</td>
                                            <td className="td">{Number(item.stock || 0).toLocaleString('es-MX')}</td>
                                            <td className="td">{fmt(item.costo_unitario || item.precio_compra)}</td>
                                            <td className="td font-bold">{fmt(item.subtotal)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </section>

            <aside className="space-y-5">
                <div className="card p-0 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                        <h2 className="text-sm font-black text-gray-800">Fórmulas activas</h2>
                        <Save size={16} className="text-orchid-500" />
                    </div>
                    <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                        {loading && <p className="p-5 text-sm text-gray-400">Cargando...</p>}
                        {!loading && formulas.length === 0 && <p className="p-5 text-sm text-gray-400">Sin fórmulas registradas</p>}
                        {formulas.map(f => (
                            <button key={f.id} onClick={() => loadFormula(f.producto_id)} className="w-full text-left p-4 hover:bg-orchid-50/50 transition-colors">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-gray-800 truncate">{f.producto}</p>
                                        <p className="text-xs text-gray-400">{f.total_insumos} insumos · costo {fmt(f.costo_estimado)}</p>
                                    </div>
                                    <TrendingUp size={16} className="text-jade-600 shrink-0" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="card p-0 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                        <h2 className="text-sm font-black text-gray-800">Lotes recientes</h2>
                        <Factory size={16} className="text-orchid-500" />
                    </div>
                    <div className="divide-y divide-gray-50 max-h-[30rem] overflow-y-auto">
                        {loading && <p className="p-5 text-sm text-gray-400">Cargando...</p>}
                        {!loading && lotes.length === 0 && <p className="p-5 text-sm text-gray-400">Sin lotes registrados</p>}
                        {lotes.map(lote => (
                            <button key={lote.id} onClick={() => verLote(lote)} className="w-full text-left p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-black text-gray-800 truncate">{lote.codigo_lote}</p>
                                        <p className="text-xs text-gray-500 truncate">{lote.producto}</p>
                                        <p className="text-[11px] text-gray-400 mt-1">{new Date(lote.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-sm font-bold text-orchid-800">{fmt(lote.costo_total)}</p>
                                        <p className="text-xs text-jade-700">{Number(lote.cantidad_producida).toLocaleString('es-MX')} uds</p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </aside>

            {modalLote && (
                <Modal title={`Lote ${modalLote.lote.codigo_lote}`} onClose={() => setModalLote(null)}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-xl bg-orchid-50 p-3">
                                <p className="text-xs text-gray-500">Producto</p>
                                <p className="text-sm font-bold text-gray-900">{modalLote.lote.producto}</p>
                            </div>
                            <div className="rounded-xl bg-jade-50 p-3">
                                <p className="text-xs text-gray-500">Costo unitario</p>
                                <p className="text-sm font-bold text-jade-800">{fmt(modalLote.lote.costo_unitario)}</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {modalLote.insumos.map(item => (
                                <div key={item.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                                    <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0"><TrendingDown size={14} /></div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-gray-800 truncate">{item.nombre}</p>
                                        <p className="text-xs text-gray-400">{Number(item.cantidad).toLocaleString('es-MX')} {item.unidad}</p>
                                    </div>
                                    <p className="text-sm font-bold text-gray-800">{fmt(item.subtotal)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    )
}
