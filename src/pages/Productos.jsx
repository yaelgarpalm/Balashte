import { useState, useEffect } from 'react'
import { productosAPI, categoriasAPI, proveedoresAPI, produccionAPI } from '../services/api'
import toast from 'react-hot-toast'
import { Plus, Edit2, Package, AlertTriangle, TrendingDown, TrendingUp, X, Trash2, Image as ImageIcon, Upload, ImageOff, Barcode, ScanLine, Wand2, Calculator, Factory } from 'lucide-react'

import { useUI } from '../context/UIContext'
import { useAuth } from '../context/AuthContext'

const fmt = (n) => `MXN ${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

import Modal from '../components/common/Modal'
import CodeScanner from '../components/common/CodeScanner'
import ProductCodeLabel from '../components/common/ProductCodeLabel'

const emptyProd = { codigo: '', nombre: '', descripcion: '', categoria_id: '', proveedor_id: '', tipo_producto: 'venta', precio_compra: 0, precio_venta: 0, stock: 0, stock_minimo: 5, unidad: 'pieza', imagen_url: '', codigo_sat: '01010101', unidad_sat: 'H87' }

export default function Productos() {
    const { setTitulo, setSubtitulo, buscar } = useUI()
    const { usuario } = useAuth()
    const [productos, setProductos] = useState([])
    const [insumosDisponibles, setInsumosDisponibles] = useState([])
    const [categorias, setCategorias] = useState([])
    const [proveedores, setProveedores] = useState([])
    const [loading, setLoading] = useState(true)
    const [catFiltro, setCatFiltro] = useState('')
    const [tipoFiltro, setTipoFiltro] = useState('venta')
    const [modal, setModal] = useState(null) // null | 'crear' | 'editar' | 'stock' | 'movimientos' | 'codigos' | 'scan'
    const [selected, setSelected] = useState(null)
    const [form, setForm] = useState(emptyProd)
    const [ajuste, setAjuste] = useState({ tipo: 'entrada', cantidad: 0, motivo: '' })
    const [movimientos, setMovimientos] = useState([])
    const [saving, setSaving] = useState(false)
    const [uploadingImage, setUploadingImage] = useState(false)
    const [nuevaCat, setNuevaCat] = useState('')
    const [mostrandoNuevaCat, setMostrandoNuevaCat] = useState(false)
    const [insumosProduccion, setInsumosProduccion] = useState([])
    const [calculoProduccion, setCalculoProduccion] = useState(null)
    const [calculandoCosto, setCalculandoCosto] = useState(false)
    const [margenGanancia, setMargenGanancia] = useState(60)

    const load = () => {
        setLoading(true)
        Promise.all([
            productosAPI.getAll({ buscar, categoria_id: catFiltro, tipo_producto: tipoFiltro, limit: 200 }),
            productosAPI.getAll({ tipo_producto: 'insumo', limit: 500 }),
            categoriasAPI.getAll(),
            proveedoresAPI.getAll(),
        ]).then(([p, ins, c, pr]) => {
            setProductos(p.data.productos)
            setInsumosDisponibles(ins.data.productos || [])
            setCategorias(c.data.categorias)
            setProveedores(pr.data.proveedores)
        }).finally(() => setLoading(false))
    }

    useEffect(() => { 
        setTitulo('Inventario')
        return () => {
            setTitulo('')
            setSubtitulo('')
        }
    }, [])

    useEffect(() => {
        setSubtitulo(`${productos.length} ${tipoFiltro === 'insumo' ? 'insumos' : 'productos de venta'} registrados`)
    }, [productos, tipoFiltro])

    useEffect(() => { load() }, [buscar, catFiltro, tipoFiltro])

    const resetCostoProduccion = () => {
        setInsumosProduccion([])
        setCalculoProduccion(null)
        setCalculandoCosto(false)
        setMargenGanancia(60)
    }

    const openCrear = () => { setForm({ ...emptyProd, tipo_producto: tipoFiltro }); resetCostoProduccion(); setModal('crear') }
    const openEditar = async (p) => {
        setSelected(p)
        setForm({ ...p, proveedor_id: p.proveedor_id || '' })
        setInsumosProduccion([])
        setCalculoProduccion(null)
        if (p.tipo_producto !== 'insumo' && Number(p.precio_compra || 0) > 0 && Number(p.precio_venta || 0) > 0) {
            setMargenGanancia(Math.max(0, ((Number(p.precio_venta) / Number(p.precio_compra)) - 1) * 100).toFixed(1))
        }
        setModal('editar')
        if (p.tipo_producto === 'insumo') return
        try {
            const { data } = await produccionAPI.getFormulaProducto(p.id)
            if (data.insumos?.length) {
                setInsumosProduccion(data.insumos.map(item => ({
                    producto_id: item.producto_insumo_id || item.producto_id,
                    cantidad: Number(item.cantidad || 1),
                })))
                setCalculoProduccion({
                    insumos: data.insumos,
                    costo_total: Number(data.costo_total || 0),
                    costo_unitario_produccion: Number(data.costo_total || 0),
                })
                if (Number(data.costo_total || 0) > 0 && Number(p.precio_venta || 0) > 0) {
                    setMargenGanancia(Math.max(0, ((Number(p.precio_venta) / Number(data.costo_total)) - 1) * 100).toFixed(1))
                }
            }
        } catch {
            toast.error('No se pudo cargar el costo automatizado')
        }
    }
    const openStock = (p) => { setSelected(p); setAjuste({ tipo: 'entrada', cantidad: 0, motivo: '' }); setModal('stock') }
    const openCodigos = (p) => { setSelected(p); setModal('codigos') }
    const openMovimientos = async (p) => {
        setSelected(p)
        const { data } = await productosAPI.movimientos(p.id)
        setMovimientos(data.movimientos)
        setModal('movimientos')
    }
    const closeModal = () => { 
        setModal(null); 
        setSelected(null); 
        setMostrandoNuevaCat(false);
        setNuevaCat('');
        resetCostoProduccion();
    }

    const handleCrearCat = async () => {
        if (!nuevaCat.trim()) return toast.error('El nombre es obligatorio')
        try {
            const { data } = await categoriasAPI.crear({ nombre: nuevaCat })
            if (data.id) {
                const cat = { id: data.id, nombre: nuevaCat }
                setCategorias(prev => [...prev, cat])
                f('categoria_id', cat.id)
                setNuevaCat('')
                setMostrandoNuevaCat(false)
                toast.success('Categoría creada')
            } else {
                toast.error('Error al crear categoría')
            }
        } catch (e) { toast.error('Error al crear categoría') }
    }

    const addInsumoProduccion = () => {
        setInsumosProduccion(prev => [...prev, { producto_id: '', cantidad: 1 }])
        setCalculoProduccion(null)
    }

    const updateInsumoProduccion = (idx, key, value) => {
        setInsumosProduccion(prev => prev.map((item, i) => i === idx ? { ...item, [key]: value } : item))
        setCalculoProduccion(null)
    }

    const removeInsumoProduccion = (idx) => {
        setInsumosProduccion(prev => prev.filter((_, i) => i !== idx))
        setCalculoProduccion(null)
    }

    const calcularCostoProduccion = async () => {
        if (!insumosProduccion.length) return toast.error('Agrega al menos un insumo')
        setCalculandoCosto(true)
        try {
            const { data } = await produccionAPI.calcularCosto({ cantidad_producida: 1, insumos: insumosProduccion })
            const costo = Number(data.costo_unitario_produccion || data.costo_total || 0)
            setCalculoProduccion(data)
            f('precio_compra', costo.toFixed(2))
            f('precio_venta', precioVentaConMargen(costo).toFixed(2))
            toast.success('Costo y precio de venta aplicados')
            return costo
        } catch (error) {
            toast.error(error.response?.data?.mensaje || 'No se pudo calcular el costo')
            throw error
        } finally {
            setCalculandoCosto(false)
        }
    }

    const guardarFormulaProducto = async (productoId) => {
        if (!insumosProduccion.length) return
        await produccionAPI.guardarFormula({
            producto_id: productoId,
            notas: 'Costo automatizado desde formulario de producto',
            insumos: insumosProduccion,
        })
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const payload = { ...form }
            if (payload.tipo_producto === 'insumo') {
                payload.precio_venta = 0
            } else if (insumosProduccion.length) {
                const costo = calculoProduccion ? Number(calculoProduccion.costo_unitario_produccion || calculoProduccion.costo_total || 0) : await calcularCostoProduccion()
                payload.precio_compra = costo.toFixed(2)
                payload.precio_venta = precioVentaConMargen(costo).toFixed(2)
            } else {
                return toast.error('Agrega los insumos para calcular el costo y precio de venta')
            }
            if (modal === 'crear') {
                const { data } = await productosAPI.crear(payload)
                if (data.id && payload.tipo_producto !== 'insumo') await guardarFormulaProducto(data.id)
                toast.success('Producto creado')
            } else {
                await productosAPI.actualizar(selected.id, payload)
                if (payload.tipo_producto !== 'insumo') await guardarFormulaProducto(selected.id)
                toast.success('Producto actualizado')
            }
            closeModal(); load()
        } catch (e) { toast.error(e.response?.data?.mensaje || 'Error') }
        finally { setSaving(false) }
    }

    const handleImageChange = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
            e.target.value = ''
            return toast.error('La imagen debe ser PNG, JPG o WEBP')
        }
        if (file.size > 2 * 1024 * 1024) {
            e.target.value = ''
            return toast.error('La imagen debe pesar menos de 2MB')
        }

        setUploadingImage(true)
        try {
            const reader = new FileReader()
            reader.onload = async () => {
                try {
                    const { data } = await productosAPI.subirImagen({ imagen: reader.result, nombre: form.nombre || form.codigo || file.name })
                    f('imagen_url', data.imagen_url)
                    toast.success('Imagen cargada')
                } catch (error) {
                    toast.error(error.response?.data?.mensaje || 'No se pudo subir la imagen')
                } finally {
                    setUploadingImage(false)
                    e.target.value = ''
                }
            }
            reader.onerror = () => {
                setUploadingImage(false)
                toast.error('No se pudo leer la imagen')
            }
            reader.readAsDataURL(file)
        } catch {
            setUploadingImage(false)
            toast.error('No se pudo subir la imagen')
        }
    }

    const handleAjuste = async () => {
        if (!ajuste.cantidad || ajuste.cantidad <= 0) return toast.error('Cantidad inválida')
        setSaving(true)
        try {
            await productosAPI.ajustarStock(selected.id, ajuste)
            toast.success('Stock actualizado')
            closeModal(); load()
        } catch (e) { toast.error(e.response?.data?.mensaje || 'Error') }
        finally { setSaving(false) }
    }

    const handleDelete = async (p) => {
        if (!window.confirm(`¿Estás seguro de que deseas eliminar "${p.nombre}"?`)) return
        try {
            await productosAPI.eliminar(p.id)
            toast.success('Producto eliminado')
            load()
        } catch (e) { toast.error('Error al eliminar producto') }
    }

    const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

    const precioVentaConMargen = (costo, margen = margenGanancia) => {
        const base = Number(costo || 0)
        const porcentaje = Number(margen || 0)
        return base > 0 ? base * (1 + porcentaje / 100) : 0
    }

    const cambiarMargenGanancia = (value) => {
        const margen = Number(value) || 0
        setMargenGanancia(margen)
        const costo = Number(calculoProduccion?.costo_unitario_produccion || calculoProduccion?.costo_total || form.precio_compra || 0)
        if (costo > 0) f('precio_venta', precioVentaConMargen(costo, margen).toFixed(2))
    }

    const generarCodigo = async () => {
        if (!form.categoria_id) {
            return toast.error('Selecciona una categoría primero')
        }

        const isInsumo = form.tipo_producto === 'insumo'
        const typePrefix = isInsumo ? 'INS' : 'PROD'

        const cat = categorias.find(c => Number(c.id) === Number(form.categoria_id))
        if (!cat) return toast.error('Categoría no encontrada')

        const cleanCatName = cat.nombre
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "")
            .trim()
        const catPrefix = cleanCatName.slice(0, 3).padEnd(3, 'X')

        const prefix = `${typePrefix}-${catPrefix}-`

        try {
            const { data } = await productosAPI.getAll({ limit: 1000 })
            const allProducts = data.productos || []
            
            const matchingCodes = allProducts
                .map(p => p.codigo || '')
                .filter(code => code.startsWith(prefix))
            
            let nextNum = 1
            if (matchingCodes.length > 0) {
                const numbers = matchingCodes.map(code => {
                    const parts = code.split('-')
                    const numStr = parts[parts.length - 1]
                    const num = parseInt(numStr, 10)
                    return isNaN(num) ? 0 : num
                })
                const maxNum = Math.max(...numbers, 0)
                nextNum = maxNum + 1
            }

            const nextNumStr = String(nextNum).padStart(3, '0')
            f('codigo', `${prefix}${nextNumStr}`)
            toast.success('Código generado')
        } catch (error) {
            console.error(error)
            const timestamp = Date.now().toString().slice(-4)
            f('codigo', `${prefix}${timestamp}`)
            toast.error('Error al consultar códigos, se generó un código temporal')
        }
    }

    const handleCodigoDetectado = (codigo) => {
        f('codigo', codigo.trim())
        setModal(selected ? 'editar' : 'crear')
        toast.success('Código capturado')
    }

    return (
        <div>
            <div className="flex items-center justify-end mb-6">
                <button onClick={openCrear} className="btn-primary"><Plus size={16} />Nuevo producto</button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="flex bg-white p-1 rounded-xl border border-gray-100 w-full sm:w-auto">
                    <button
                        onClick={() => setTipoFiltro('venta')}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all ${tipoFiltro === 'venta' ? 'bg-orchid-700 text-white' : 'text-gray-500 hover:bg-orchid-50'}`}
                    >
                        Productos venta
                    </button>
                    <button
                        onClick={() => setTipoFiltro('insumo')}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all ${tipoFiltro === 'insumo' ? 'bg-orchid-700 text-white' : 'text-gray-500 hover:bg-orchid-50'}`}
                    >
                        Insumos producción
                    </button>
                </div>
                <select value={catFiltro} onChange={e => setCatFiltro(e.target.value)} className="input w-full sm:w-48">
                    <option value="">Todas las categorías</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="card p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                    <thead className="border-b border-gray-50">
                        <tr>
                            <th className="th">Código</th>
                            <th className="th">Producto</th>
                            <th className="th">Tipo</th>
                            <th className="th">Categoría</th>
                            <th className="th">{tipoFiltro === 'insumo' ? 'Costo unitario' : 'Precio venta'}</th>
                            <th className="th">Stock</th>
                            <th className="th">Estado</th>
                            <th className="th">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && [...Array(6)].map((_, i) => (
                            <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                        ))}
                        {!loading && productos.map(p => (
                            <tr key={p.id} className="table-row">
                                <td className="td font-mono text-xs text-orchid-700">{p.codigo}</td>
                                <td className="td">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                                            {p.imagen_url ? <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover" /> : <ImageOff size={16} className="text-gray-300" />}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-800 text-sm">{p.nombre}</p>
                                            {p.proveedor && <p className="text-xs text-gray-400">{p.proveedor}</p>}
                                        </div>
                                    </div>
                                </td>
                                <td className="td">
                                    <span className={p.tipo_producto === 'insumo' ? 'badge-yellow' : 'badge-green'}>
                                        {p.tipo_producto === 'insumo' ? 'Insumo' : 'Venta'}
                                    </span>
                                </td>
                                <td className="td"><span className="badge-purple">{p.categoria}</span></td>
                                <td className="td font-semibold text-gray-800">{fmt(p.tipo_producto === 'insumo' ? p.precio_compra : p.precio_venta)}</td>
                                <td className="td">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-gray-800">{p.stock}</span>
                                        <span className="text-xs text-gray-400">/ mín {p.stock_minimo}</span>
                                    </div>
                                </td>
                                <td className="td">
                                    {p.stock === 0 ? <span className="badge-red">Sin stock</span>
                                        : p.stock <= p.stock_minimo ? <span className="badge-yellow"><AlertTriangle size={11} />Bajo stock</span>
                                            : <span className="badge-green">OK</span>}
                                </td>
                                <td className="td">
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => openEditar(p)} className="w-8 h-8 rounded-lg bg-orchid-50 hover:bg-orchid-100 flex items-center justify-center text-orchid-600 transition-colors"><Edit2 size={13} /></button>
                                        <button onClick={() => openCodigos(p)} className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"><Barcode size={13} /></button>
                                        <button onClick={() => openStock(p)} className="w-8 h-8 rounded-lg bg-green-50 hover:bg-green-100 flex items-center justify-center text-green-600 transition-colors"><Package size={13} /></button>
                                        <button onClick={() => openMovimientos(p)} className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600 transition-colors"><TrendingUp size={13} /></button>
                                        {usuario?.rol === 'admin' && <button onClick={() => handleDelete(p)} className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-600 transition-colors"><Trash2 size={13} /></button>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {!loading && productos.length === 0 && (
                            <tr><td colSpan={8} className="text-center py-12 text-gray-400">
                                <Package size={32} className="mx-auto mb-2 opacity-30" />
                                <p>No se encontraron {tipoFiltro === 'insumo' ? 'insumos' : 'productos de venta'}</p>
                            </td></tr>
                        )}
                    </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Crear/Editar */}
            {(modal === 'crear' || modal === 'editar') && (
                <Modal title={modal === 'crear' ? (form.tipo_producto === 'insumo' ? 'Nuevo insumo' : 'Nuevo producto') : (form.tipo_producto === 'insumo' ? 'Editar insumo' : 'Editar producto')} onClose={closeModal} maxWidth="max-w-3xl">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50/60 p-3">
                            <div className="w-24 h-24 rounded-2xl bg-white border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                                {form.imagen_url ? <img src={form.imagen_url} alt="Producto" className="w-full h-full object-cover" /> : <ImageIcon size={30} className="text-gray-300" />}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-black text-gray-700 uppercase tracking-wider mb-1">Imagen del producto</p>
                                <p className="text-xs text-gray-400 mb-3">PNG, JPG o WEBP. Máximo 2MB.</p>
                                <div className="flex flex-wrap gap-2">
                                    <label className={`btn-secondary text-xs cursor-pointer ${uploadingImage ? 'opacity-60 pointer-events-none' : ''}`}>
                                        {uploadingImage ? <div className="w-4 h-4 border-2 border-orchid-200 border-t-orchid-700 rounded-full animate-spin" /> : <Upload size={14} />}
                                        {uploadingImage ? 'Subiendo...' : 'Subir imagen'}
                                        <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleImageChange} disabled={uploadingImage} />
                                    </label>
                                    {form.imagen_url && (
                                        <button onClick={() => f('imagen_url', '')} className="btn-secondary text-xs text-red-600 hover:text-red-700">
                                            <X size={14} /> Quitar
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="label mb-0">Código *</label>
                                    {modal === 'crear' && (
                                        <div className="flex gap-1">
                                            <button onClick={generarCodigo} className="text-[10px] font-bold text-orchid-600 hover:text-orchid-700 flex items-center gap-0.5">
                                                <Wand2 size={10} /> Generar
                                            </button>
                                            <button onClick={() => setModal('scan')} className="text-[10px] font-bold text-orchid-600 hover:text-orchid-700 flex items-center gap-0.5">
                                                <ScanLine size={10} /> Escanear
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <input className="input" value={form.codigo} onChange={e => f('codigo', e.target.value)} disabled={modal === 'editar'} />
                            </div>
                            <div><label className="label">Unidad</label><input className="input" value={form.unidad} onChange={e => f('unidad', e.target.value)} placeholder="pieza" /></div>
                        </div>
                        <div>
                            <label className="label">Tipo *</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => f('tipo_producto', 'venta')} className={`py-2 rounded-xl text-xs font-black border transition-all ${form.tipo_producto !== 'insumo' ? 'bg-orchid-700 text-white border-orchid-700' : 'bg-white text-gray-500 border-gray-200'}`}>Producto para venta</button>
                                <button onClick={() => f('tipo_producto', 'insumo')} className={`py-2 rounded-xl text-xs font-black border transition-all ${form.tipo_producto === 'insumo' ? 'bg-orchid-700 text-white border-orchid-700' : 'bg-white text-gray-500 border-gray-200'}`}>Insumo de producción</button>
                            </div>
                        </div>
                        <div><label className="label">Nombre *</label><input className="input" value={form.nombre} onChange={e => f('nombre', e.target.value)} /></div>
                        <div><label className="label">Descripción</label><textarea className="input resize-none" rows={2} value={form.descripcion || ''} onChange={e => f('descripcion', e.target.value)} /></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="label mb-0">Categoría *</label>
                                    {!mostrandoNuevaCat && (
                                        <button onClick={() => setMostrandoNuevaCat(true)} className="text-[10px] font-bold text-orchid-600 hover:text-orchid-700 flex items-center gap-0.5">
                                            <Plus size={10} /> Nueva
                                        </button>
                                    )}
                                </div>
                                {mostrandoNuevaCat ? (
                                    <div className="flex gap-1">
                                        <input 
                                            autoFocus
                                            className="input py-1 text-xs" 
                                            placeholder="Nombre..." 
                                            value={nuevaCat} 
                                            onChange={e => setNuevaCat(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleCrearCat())}
                                        />
                                        <button onClick={handleCrearCat} className="w-8 h-8 rounded-lg bg-orchid-600 text-white flex items-center justify-center flex-shrink-0"><Plus size={14} /></button>
                                        <button onClick={() => { setMostrandoNuevaCat(false); setNuevaCat('') }} className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center flex-shrink-0"><X size={14} /></button>
                                    </div>
                                ) : (
                                    <select className="input" value={form.categoria_id} onChange={e => f('categoria_id', e.target.value)}>
                                        <option value="">Seleccionar</option>
                                        {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                    </select>
                                )}
                            </div>
                            <div><label className="label">Proveedor</label>
                                <select className="input" value={form.proveedor_id || ''} onChange={e => f('proveedor_id', e.target.value)}>
                                    <option value="">Sin proveedor</option>
                                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div><label className="label">Stock mínimo</label><input type="number" className="input" value={form.stock_minimo} onChange={e => f('stock_minimo', e.target.value)} /></div>
                            {form.tipo_producto === 'insumo' && (
                                <div><label className="label">Costo unitario (MXN)</label><input type="number" min="0" step="0.01" className="input" value={form.precio_compra} onChange={e => f('precio_compra', e.target.value)} /></div>
                            )}
                        </div>
                        {form.tipo_producto !== 'insumo' && <div className="rounded-2xl border border-orchid-100 bg-orchid-50/40 p-4 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <p className="text-sm font-black text-gray-800 flex items-center gap-2"><Factory size={16} className="text-orchid-700" /> Costo automatizado de producción</p>
                                    <p className="text-xs text-gray-500">Selecciona insumos, margen y calcula costo/precio de venta.</p>
                                </div>
                                <button onClick={addInsumoProduccion} className="btn-secondary text-xs py-1.5 self-start sm:self-auto"><Plus size={14} />Agregar insumo</button>
                            </div>

                            <div className="space-y-2">
                                {insumosProduccion.map((item, idx) => (
                                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1fr_120px_38px] gap-2">
                                        <select className="input" value={item.producto_id} onChange={e => updateInsumoProduccion(idx, 'producto_id', e.target.value)}>
                                            <option value="">Seleccionar insumo</option>
                                            {insumosDisponibles.filter(p => Number(p.id) !== Number(selected?.id || 0)).map(p => (
                                                <option key={p.id} value={p.id}>{p.codigo} · {p.nombre} · {fmt(p.precio_compra)}</option>
                                            ))}
                                        </select>
                                        <input type="number" min="0.0001" step="0.0001" className="input" value={item.cantidad} onChange={e => updateInsumoProduccion(idx, 'cantidad', Number(e.target.value) || 0)} />
                                        <button onClick={() => removeInsumoProduccion(idx)} className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100">
                                            <X size={15} />
                                        </button>
                                    </div>
                                ))}
                                {insumosProduccion.length === 0 && (
                                    <div className="rounded-xl border border-dashed border-orchid-200 bg-white/70 py-6 text-center text-sm text-gray-400">
                                        Agrega maceta, celofán, abrillantador u otros insumos.
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 min-w-0">
                                    <div className="rounded-xl bg-white border border-orchid-100 px-3 py-2">
                                        <p className="text-[10px] font-black uppercase text-gray-400">Costo calculado</p>
                                        <p className="text-sm font-black text-orchid-800">{fmt(calculoProduccion?.costo_unitario_produccion || calculoProduccion?.costo_total || form.precio_compra)}</p>
                                    </div>
                                    <div className="rounded-xl bg-white border border-orchid-100 px-3 py-2">
                                        <label className="text-[10px] font-black uppercase text-gray-400">Margen ganancia</label>
                                        <div className="flex items-center gap-1">
                                            <input type="number" min="0" step="1" className="w-full bg-transparent text-sm font-black text-orchid-800 focus:outline-none" value={margenGanancia} onChange={e => cambiarMargenGanancia(e.target.value)} />
                                            <span className="text-sm font-black text-orchid-800">%</span>
                                        </div>
                                    </div>
                                    <div className="rounded-xl bg-white border border-jade-100 px-3 py-2">
                                        <p className="text-[10px] font-black uppercase text-gray-400">Venta sugerida</p>
                                        <p className="text-sm font-black text-jade-700">
                                            {fmt(form.precio_venta)}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={calcularCostoProduccion} disabled={calculandoCosto || insumosProduccion.length === 0} className="btn-primary justify-center disabled:opacity-50 disabled:cursor-not-allowed">
                                    {calculandoCosto ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Calculator size={16} />}
                                    Calcular y aplicar costo
                                </button>
                            </div>
                        </div>}
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-50">
                            <div><label className="label">Código SAT (8 dígitos)</label><input className="input" placeholder="01010101" value={form.codigo_sat || ''} onChange={e => f('codigo_sat', e.target.value)} /></div>
                            <div><label className="label">Unidad SAT</label><input className="input" placeholder="H87" value={form.unidad_sat || ''} onChange={e => f('unidad_sat', e.target.value)} /></div>
                        </div>

                        {modal === 'crear' && (
                            <div><label className="label">Stock inicial</label><input type="number" className="input" value={form.stock} onChange={e => f('stock', e.target.value)} /></div>
                        )}
                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                            <ProductCodeLabel code={form.codigo} name={form.nombre} price={form.tipo_producto === 'insumo' ? form.precio_compra : form.precio_venta} />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button onClick={closeModal} className="btn-secondary flex-1 justify-center">Cancelar</button>
                            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
                                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                                {modal === 'crear' ? 'Crear' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Modal Stock */}
            {modal === 'stock' && (
                <Modal title={`Ajustar stock — ${selected?.nombre}`} onClose={closeModal}>
                    <div className="space-y-4">
                        <div className="bg-orchid-50 rounded-xl p-4 text-center">
                            <p className="text-xs text-gray-500 mb-1">Stock actual</p>
                            <p className="text-4xl font-bold text-orchid-700">{selected?.stock}</p>
                            <p className="text-xs text-gray-400 mt-1">Mínimo: {selected?.stock_minimo}</p>
                        </div>
                        <div>
                            <label className="label">Tipo de movimiento</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[{ v: 'entrada', label: 'Entrada', icon: TrendingUp }, { v: 'salida', label: 'Salida', icon: TrendingDown }, { v: 'ajuste', label: 'Ajuste', icon: Package }].map(({ v, label, icon: Icon }) => (
                                    <button key={v} onClick={() => setAjuste(p => ({ ...p, tipo: v }))}
                                        className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-medium transition-all ${ajuste.tipo === v ? 'bg-orchid-600 text-white border-orchid-600' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                        <Icon size={16} />{label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div><label className="label">{ajuste.tipo === 'ajuste' ? 'Nuevo stock' : 'Cantidad'}</label>
                            <input type="number" min="1" className="input" value={ajuste.cantidad || ''} onChange={e => setAjuste(p => ({ ...p, cantidad: parseInt(e.target.value) || 0 }))} />
                        </div>
                        <div><label className="label">Motivo (opcional)</label>
                            <input className="input" value={ajuste.motivo} onChange={e => setAjuste(p => ({ ...p, motivo: e.target.value }))} placeholder="Compra a proveedor, merma, conteo..." />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={closeModal} className="btn-secondary flex-1 justify-center">Cancelar</button>
                            <button onClick={handleAjuste} disabled={saving} className="btn-primary flex-1 justify-center">
                                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                                Aplicar
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Modal Movimientos */}
            {modal === 'movimientos' && (
                <Modal title={`Movimientos — ${selected?.nombre}`} onClose={closeModal}>
                    <div className="space-y-2">
                        {movimientos.length === 0 && <p className="text-center text-gray-400 py-6">Sin movimientos registrados</p>}
                        {movimientos.map((m, i) => (
                            <div key={i} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.tipo === 'entrada' || m.tipo === 'devolucion' ? 'bg-green-100 text-green-700' : m.tipo === 'salida' || m.tipo === 'venta' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {m.tipo === 'entrada' || m.tipo === 'devolucion' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-700 capitalize">{m.tipo} · {m.cantidad} uds</p>
                                    <p className="text-xs text-gray-400 truncate">{m.motivo || '-'}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-xs text-gray-500">{m.stock_anterior} → <span className="font-bold text-gray-800">{m.stock_nuevo}</span></p>
                                    <p className="text-xs text-gray-400">{new Date(m.created_at).toLocaleDateString('es-MX')}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Modal>
            )}

            {modal === 'codigos' && selected && (
                <Modal title={`Códigos — ${selected.nombre}`} onClose={closeModal} maxWidth="max-w-md">
                    <ProductCodeLabel code={selected.codigo} name={selected.nombre} price={selected.precio_venta} />
                </Modal>
            )}

            {modal === 'scan' && (
                <CodeScanner
                    title="Escanear código de producto"
                    onClose={() => setModal(selected ? 'editar' : 'crear')}
                    onDetected={handleCodigoDetectado}
                />
            )}
        </div>
    )
}
