import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { AlertTriangle, CheckCircle2, Database, Download, FileCheck2, RefreshCw, ShieldAlert, Upload } from 'lucide-react'
import { respaldosAPI } from '../services/api'
import { useUI } from '../context/UIContext'

const formatDate = (value) => {
    if (!value) return 'Sin fecha'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Sin fecha'
    return date.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function Respaldos() {
    const { setTitulo, setSubtitulo } = useUI()
    const fileInputRef = useRef(null)
    const [estado, setEstado] = useState(null)
    const [loading, setLoading] = useState(true)
    const [downloading, setDownloading] = useState(false)
    const [restoring, setRestoring] = useState(false)
    const [backup, setBackup] = useState(null)
    const [fileName, setFileName] = useState('')
    const [confirmText, setConfirmText] = useState('')

    useEffect(() => {
        setTitulo('Respaldos')
        setSubtitulo('Protege y recupera la información del sistema')
        loadEstado()
        return () => { setTitulo(''); setSubtitulo('') }
    }, [])

    const resumenBackup = useMemo(() => {
        if (!backup?.tables) return null
        return {
            tablas: backup.tables.length,
            registros: backup.tables.reduce((sum, table) => sum + (table.rows?.length || table.count || 0), 0),
            principales: backup.tables
                .filter(table => (table.rows?.length || table.count || 0) > 0)
                .slice(0, 6),
        }
    }, [backup])

    const loadEstado = async () => {
        setLoading(true)
        try {
            const { data } = await respaldosAPI.estado()
            setEstado(data)
        } catch (error) {
            toast.error('No se pudo revisar la base de datos')
        } finally {
            setLoading(false)
        }
    }

    const handleDownload = async () => {
        setDownloading(true)
        try {
            const response = await respaldosAPI.exportar()
            const blob = new Blob([response.data], { type: 'application/json' })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
            link.href = url
            link.download = `respaldo-orchid-pos-${stamp}.json`
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
            toast.success('Respaldo descargado')
            loadEstado()
        } catch (error) {
            toast.error('No se pudo crear el respaldo')
        } finally {
            setDownloading(false)
        }
    }

    const handleFile = (event) => {
        const file = event.target.files?.[0]
        if (!file) return
        setFileName(file.name)
        setBackup(null)
        setConfirmText('')

        const reader = new FileReader()
        reader.onload = () => {
            try {
                const parsed = JSON.parse(reader.result)
                if (parsed.app !== 'orchid-pos' || !Array.isArray(parsed.tables)) {
                    toast.error('Selecciona un respaldo válido de Orchid POS')
                    return
                }
                setBackup(parsed)
                toast.success('Respaldo listo para revisar')
            } catch (error) {
                toast.error('El archivo no es un JSON válido')
            }
        }
        reader.readAsText(file)
    }

    const handleRestore = async () => {
        if (!backup) return toast.error('Primero selecciona un respaldo')
        if (confirmText.trim().toUpperCase() !== 'RESTAURAR') {
            return toast.error('Escribe RESTAURAR para confirmar')
        }
        if (!window.confirm('La información actual será reemplazada por el respaldo seleccionado. ¿Deseas continuar?')) return

        setRestoring(true)
        try {
            const { data } = await respaldosAPI.restaurar(backup)
            toast.success(data.mensaje || 'Información restaurada')
            setBackup(null)
            setFileName('')
            setConfirmText('')
            if (fileInputRef.current) fileInputRef.current.value = ''
            loadEstado()
        } catch (error) {
            toast.error(error.response?.data?.mensaje || 'No se pudo restaurar el respaldo')
        } finally {
            setRestoring(false)
        }
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orchid-100 text-orchid-700 flex items-center justify-center">
                            <Database size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Tablas</p>
                            <p className="text-2xl font-black text-gray-800">{loading ? '...' : estado?.totalTablas || 0}</p>
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-jade-100 text-jade-700 flex items-center justify-center">
                            <FileCheck2 size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Registros</p>
                            <p className="text-2xl font-black text-gray-800">{loading ? '...' : estado?.totalRegistros || 0}</p>
                        </div>
                    </div>
                </div>
                <div className="card">
                    <button onClick={loadEstado} disabled={loading} className="btn-secondary w-full justify-center h-full min-h-[64px]">
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        Actualizar estado
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="card space-y-5">
                    <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                            <Download size={22} />
                        </div>
                        <div>
                            <h2 className="font-black text-gray-800">Crear respaldo</h2>
                            <p className="text-sm text-gray-500">Descarga un archivo JSON con la información actual de ventas, productos, clientes, usuarios, caja y configuración.</p>
                        </div>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
                        <CheckCircle2 size={18} className="text-blue-600 mt-0.5 shrink-0" />
                        <p className="text-xs text-blue-800 leading-relaxed">
                            Guarda el archivo en una carpeta segura o en una memoria externa. Para recuperar datos después, solo tendrás que seleccionarlo en esta misma pantalla.
                        </p>
                    </div>
                    <button onClick={handleDownload} disabled={downloading} className="btn-primary w-full justify-center py-3">
                        {downloading ? <RefreshCw size={18} className="animate-spin" /> : <Download size={18} />}
                        {downloading ? 'Creando respaldo...' : 'Descargar respaldo ahora'}
                    </button>
                </section>

                <section className="card space-y-5">
                    <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                            <Upload size={22} />
                        </div>
                        <div>
                            <h2 className="font-black text-gray-800">Recuperar información</h2>
                            <p className="text-sm text-gray-500">Selecciona un respaldo, revisa su contenido y confirma la restauración cuando estés seguro.</p>
                        </div>
                    </div>

                    <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleFile} />
                    <button onClick={() => fileInputRef.current?.click()} className="btn-secondary w-full justify-center py-3">
                        <Upload size={18} />
                        Seleccionar archivo de respaldo
                    </button>

                    {fileName && (
                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Archivo seleccionado</p>
                            <p className="text-sm font-bold text-gray-800 break-all">{fileName}</p>
                        </div>
                    )}
                </section>
            </div>

            {backup && resumenBackup && (
                <section className="card space-y-5 border-amber-200">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                                <ShieldAlert size={22} />
                            </div>
                            <div>
                                <h2 className="font-black text-gray-800">Revisión antes de restaurar</h2>
                                <p className="text-sm text-gray-500">
                                    Respaldo creado el {formatDate(backup.exportedAt)} con {resumenBackup.registros} registros en {resumenBackup.tablas} tablas.
                                </p>
                            </div>
                        </div>
                        <span className="badge-yellow self-start"><AlertTriangle size={12} /> Reemplaza la información actual</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {resumenBackup.principales.map(table => (
                            <div key={table.name} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider truncate">{table.name}</p>
                                <p className="text-lg font-black text-gray-800">{table.rows?.length || table.count || 0}</p>
                            </div>
                        ))}
                    </div>

                    <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                        <p className="text-sm font-bold text-red-800 mb-2">Confirmación requerida</p>
                        <p className="text-xs text-red-700 mb-3">Escribe RESTAURAR para habilitar la recuperación. Esta acción sustituye los datos actuales por los del archivo.</p>
                        <input
                            className="input bg-white"
                            value={confirmText}
                            onChange={e => setConfirmText(e.target.value)}
                            placeholder="RESTAURAR"
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-end">
                        <button
                            onClick={() => { setBackup(null); setFileName(''); setConfirmText(''); if (fileInputRef.current) fileInputRef.current.value = '' }}
                            className="btn-secondary justify-center"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleRestore}
                            disabled={restoring || confirmText.trim().toUpperCase() !== 'RESTAURAR'}
                            className="btn-danger justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {restoring ? <RefreshCw size={18} className="animate-spin" /> : <Upload size={18} />}
                            {restoring ? 'Restaurando...' : 'Restaurar información'}
                        </button>
                    </div>
                </section>
            )}
        </div>
    )
}
