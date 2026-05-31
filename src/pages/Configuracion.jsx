import { useState, useEffect } from 'react'
import { configuracionAPI } from '../services/api'
import toast from 'react-hot-toast'
import { 
    Settings, 
    Store, 
    FileText, 
    MessageSquare, 
    Image as ImageIcon, 
    Save, 
    Info,
    ShieldCheck,
    RefreshCw
} from 'lucide-react'
import { useUI } from '../context/UIContext'

export default function Configuracion() {
    const { setTitulo, setSubtitulo } = useUI()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [config, setConfig] = useState({
        ticket_nombre_negocio: '',
        ticket_rfc: '',
        ticket_direccion: '',
        ticket_telefono: '',
        ticket_mensaje_piso: '',
        ticket_politicas: '',
        ticket_garantia: '',
        ticket_logo: ''
    })

    useEffect(() => {
        setTitulo('Configuración')
        setSubtitulo('Personaliza tu ticket y datos del negocio')
        loadConfig()
        return () => { setTitulo(''); setSubtitulo('') }
    }, [])

    const loadConfig = async () => {
        setLoading(true)
        try {
            const { data } = await configuracionAPI.get()
            if (data.config) {
                setConfig(prev => ({ ...prev, ...data.config }))
            }
        } catch (error) {
            toast.error('Error al cargar la configuración')
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setConfig(prev => ({ ...prev, [name]: value }))
    }

    const handleLogoChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            if (file.size > 1024 * 500) { // 500KB limit for base64 in DB
                return toast.error('El logo debe ser menor a 500KB')
            }
            const reader = new FileReader()
            reader.onloadend = () => {
                setConfig(prev => ({ ...prev, ticket_logo: reader.result }))
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            await configuracionAPI.update(config)
            toast.success('Configuración guardada correctamente')
        } catch (error) {
            toast.error('Error al guardar la configuración')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-orchid-200 border-t-orchid-600 rounded-full animate-spin"></div>
        </div>
    )

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Header Action */}
            <div className="flex justify-end">
                <button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="btn-primary px-8 py-3 rounded-2xl shadow-lg shadow-orchid-200 flex items-center gap-2 group"
                >
                    {saving ? <RefreshCw size={20} className="animate-spin" /> : <Save size={20} className="group-hover:scale-110 transition-transform" />}
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Datos del Negocio */}
                <div className="card space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-orchid-100 flex items-center justify-center text-orchid-600">
                            <Store size={22} />
                        </div>
                        <h3 className="font-black text-gray-800 uppercase tracking-wider text-sm">Datos del Negocio</h3>
                    </div>
                    
                    <div className="space-y-3">
                        <div>
                            <label className="label text-[10px]">Nombre del Negocio</label>
                            <input 
                                type="text" name="ticket_nombre_negocio" 
                                value={config.ticket_nombre_negocio} onChange={handleChange}
                                className="input h-11" placeholder="Ej: Boutique Orchid"
                            />
                        </div>
                        <div>
                            <label className="label text-[10px]">Identificación Fiscal (RFC/NIT)</label>
                            <input 
                                type="text" name="ticket_rfc" 
                                value={config.ticket_rfc} onChange={handleChange}
                                className="input h-11" placeholder="Ej: ABC123456789"
                            />
                        </div>
                        <div>
                            <label className="label text-[10px]">Dirección</label>
                            <input 
                                type="text" name="ticket_direccion" 
                                value={config.ticket_direccion} onChange={handleChange}
                                className="input h-11" placeholder="Calle, Número, Ciudad..."
                            />
                        </div>
                        <div>
                            <label className="label text-[10px]">Teléfono de Contacto</label>
                            <input 
                                type="text" name="ticket_telefono" 
                                value={config.ticket_telefono} onChange={handleChange}
                                className="input h-11" placeholder="Ej: +52 555 123 4567"
                            />
                        </div>
                    </div>
                </div>

                {/* Logo del Ticket */}
                <div className="card space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                            <ImageIcon size={22} />
                        </div>
                        <h3 className="font-black text-gray-800 uppercase tracking-wider text-sm">Logo del Ticket</h3>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-3xl p-6 bg-gray-50/50 hover:border-orchid-200 transition-colors">
                        {config.ticket_logo ? (
                            <div className="relative group">
                                <img src={config.ticket_logo} alt="Logo preview" className="max-h-32 object-contain rounded-xl grayscale opacity-80" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                                    <button onClick={() => setConfig(p => ({...p, ticket_logo: ''}))} className="bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600">
                                        <RefreshCw size={16} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center space-y-2">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto text-gray-300 shadow-sm">
                                    <ImageIcon size={32} />
                                </div>
                                <p className="text-xs text-gray-400">Sube tu logo (PNG/JPG preferiblemente blanco y negro)</p>
                            </div>
                        )}
                        <input 
                            type="file" accept="image/*" id="logo-upload" className="hidden" 
                            onChange={handleLogoChange}
                        />
                        <label htmlFor="logo-upload" className="mt-4 px-6 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 cursor-pointer hover:bg-orchid-50 hover:border-orchid-200 transition-all shadow-sm">
                            Seleccionar Imagen
                        </label>
                    </div>
                    <div className="flex items-start gap-2 bg-blue-50 p-3 rounded-xl border border-blue-100">
                        <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-blue-700 leading-relaxed">
                            Para una mejor impresión térmica, utiliza imágenes cuadradas con fondo blanco y elementos negros o muy oscuros.
                        </p>
                    </div>
                </div>

                {/* Mensajes y Políticas */}
                <div className="card md:col-span-2 space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                            <FileText size={22} />
                        </div>
                        <h3 className="font-black text-gray-800 uppercase tracking-wider text-sm">Mensajes y Políticas</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="label text-[10px] flex items-center gap-1">
                                <MessageSquare size={12} /> Mensaje de Agradecimiento
                            </label>
                            <textarea 
                                name="ticket_mensaje_piso" 
                                value={config.ticket_mensaje_piso} onChange={handleChange}
                                className="input min-h-[100px] py-3 text-sm" 
                                placeholder="Aparecerá justo antes de las políticas..."
                            />
                        </div>
                        <div>
                            <label className="label text-[10px] flex items-center gap-1">
                                <ShieldCheck size={12} /> Políticas de Devolución
                            </label>
                            <textarea 
                                name="ticket_politicas" 
                                value={config.ticket_politicas} onChange={handleChange}
                                className="input min-h-[100px] py-3 text-sm" 
                                placeholder="Ej: No se aceptan cambios después de 7 días..."
                            />
                        </div>
                        <div>
                            <label className="label text-[10px] flex items-center gap-1">
                                <Info size={12} /> Garantía de Productos
                            </label>
                            <textarea 
                                name="ticket_garantia" 
                                value={config.ticket_garantia} onChange={handleChange}
                                className="input min-h-[100px] py-3 text-sm" 
                                placeholder="Ej: 30 días contra defectos de fábrica..."
                            />
                        </div>
                    </div>
                </div>

            </div>

            {/* Preview Section */}
            <div className="card bg-gray-900 border-gray-800 p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-orchid-400">
                        <FileText size={16} />
                    </div>
                    <h3 className="font-black text-white uppercase tracking-widest text-xs">Vista Previa del Ticket</h3>
                </div>
                
                <div className="max-w-[300px] mx-auto bg-white p-6 shadow-2xl rounded-sm font-mono text-[10px] text-gray-800">
                    <div className="text-center space-y-1 mb-4">
                        {config.ticket_logo && <img src={config.ticket_logo} className="h-12 mx-auto grayscale mb-2" alt="logo" />}
                        <p className="font-black text-sm uppercase">{config.ticket_nombre_negocio || 'NOMBRE DEL NEGOCIO'}</p>
                        <p>{config.ticket_direccion || 'DIRECCIÓN'}</p>
                        <p>TEL: {config.ticket_telefono || '000-000-0000'}</p>
                        <p>RFC: {config.ticket_rfc || 'XXXXXXXXXXXXX'}</p>
                    </div>
                    
                    <div className="border-t border-dashed border-gray-300 py-2 space-y-1">
                        <div className="flex justify-between"><span>PRODUCTO EJEMPLO</span><span>$100.00</span></div>
                        <div className="flex justify-between font-bold text-xs pt-2"><span>TOTAL</span><span>$100.00</span></div>
                    </div>
                    
                    <div className="border-t border-dashed border-gray-300 pt-4 text-center space-y-3">
                        <p className="whitespace-pre-line italic text-gray-500">{config.ticket_mensaje_piso || '¡Gracias por su compra!'}</p>
                        <div className="text-[8px] border-t border-gray-100 pt-2 text-gray-400 leading-tight">
                            {config.ticket_politicas && (
                                <div className="mb-2">
                                    <p className="font-bold mb-1">POLÍTICAS:</p>
                                    <p className="whitespace-pre-line">{config.ticket_politicas}</p>
                                </div>
                            )}
                            {config.ticket_garantia && (
                                <div>
                                    <p className="font-bold mb-1">GARANTÍA:</p>
                                    <p className="whitespace-pre-line">{config.ticket_garantia}</p>
                                </div>
                            )}
                            {!config.ticket_politicas && !config.ticket_garantia && <p>Sin políticas definidas.</p>}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    )
}
