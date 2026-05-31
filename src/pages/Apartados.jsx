import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    ShoppingBag, Search, Filter, Calendar, User, CreditCard, ChevronRight, Clock, 
    CheckCircle2, XCircle, Plus, Receipt, Wallet, TrendingUp, AlertCircle, 
    ArrowRightLeft, DollarSign, Printer, Share2, Mail, Send, X, CheckCircle
} from 'lucide-react'
import { apartadosAPI } from '../services/api'
import toast from 'react-hot-toast'
import { useUI } from '../context/UIContext'
import { useAuth } from '../context/AuthContext'
import { useReactToPrint } from 'react-to-print'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import TicketPrint from '../components/pos/TicketPrint'
import StripePaymentModal from '../components/pos/StripePaymentModal'

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

export default function Apartados() {
    const { setTitulo } = useUI()
    const { usuario } = useAuth()
    const [searchParams] = useSearchParams()
    
    const [tab, setTab] = useState('activos')
    const [apartados, setApartados] = useState([])
    const [cuentas, setCuentas] = useState([])
    const [resumen, setResumen] = useState(null)
    const [cargando, setCargando] = useState(true)
    const [filtro, setFiltro] = useState('')
    const [apartadoSeleccionado, setApartadoSeleccionado] = useState(null)

    useEffect(() => {
        const urlId = searchParams.get('id')
        const urlTab = searchParams.get('tab')
        if (urlTab) setTab(urlTab)
        if (urlId) fetchDetalle(urlId)

        // Manejar retorno de Stripe
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.get('stripe_success') === 'true') {
            const sessionId = urlParams.get('session_id')
            const savedPago = localStorage.getItem('orchid_apartado_pending_pago')
            
            if (savedPago) {
                try {
                    const pending = JSON.parse(savedPago)
                    // Limpiar URL y storage
                    window.history.replaceState({}, document.title, window.location.pathname)
                    localStorage.removeItem('orchid_apartado_pending_pago')
                    
                    // Recuperar datos y procesar
                    setMontoPago(pending.monto)
                    setMetodoPago(pending.metodo)
                    
                    // Necesitamos asegurar que el apartado esté cargado para procesar
                    apartadosAPI.getOne(pending.apartado_id).then(res => {
                        setApartadoSeleccionado(res.data.apartado)
                        toast.success('Pago confirmado con Stripe')
                        // Procesar el pago con la referencia de Stripe
                        handleRegistrarPago(null, sessionId, res.data.apartado, pending.monto)
                    })
                } catch (err) {
                    console.error('Error al recuperar pago de Stripe:', err)
                }
            }
        } else if (urlParams.get('stripe_cancel') === 'true') {
            window.history.replaceState({}, document.title, window.location.pathname)
            localStorage.removeItem('orchid_apartado_pending_pago')
            toast.error('Pago cancelado')
        }
    }, [searchParams])

    const [showPagoModal, setShowPagoModal] = useState(false)
    const [montoPago, setMontoPago] = useState('')
    const [metodoPago, setMetodoPago] = useState('efectivo')
    
    const [ticket, setTicket] = useState(null)
    const [showStripeModal, setShowStripeModal] = useState(false)
    const ticketRef = useRef(null)

    const handlePrint = useReactToPrint({
        content: () => ticketRef.current,
        documentTitle: `Ticket_Abono_${ticket?.folio || ''}`,
    })

    const shareWhatsApp = async () => {
        if (!ticket) return
        const text = `🌸 *Balashte orquideas y anturios - Comprobante de Abono*\n\n` +
            `*Folio:* ${ticket.folio}\n` +
            `*Monto Abonado: ${fmt(ticket.monto_pago)}*\n` +
            `*Nuevo Saldo: ${fmt(ticket.saldo_actual)}*\n\n` +
            `¡Gracias por su pago! ✨`

        try {
            const element = ticketRef.current
            const canvas = await html2canvas(element, { scale: 2 })
            const imgData = canvas.toDataURL('image/png')
            const imgWidth = 72
            const imgHeight = (canvas.height * imgWidth) / canvas.width
            const pdf = new jsPDF('p', 'mm', [imgWidth, imgHeight])
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
            const pdfBlob = pdf.output('blob')
            const file = new File([pdfBlob], `Abono_${ticket.folio}.pdf`, { type: 'application/pdf' })

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: `Abono ${ticket.folio}`, text })
            } else {
                pdf.save(`Abono_${ticket.folio}.pdf`)
                window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n\n(El PDF se ha descargado)')}`, '_blank')
            }
        } catch (e) {
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
        }
    }

    const downloadPDF = async () => {
        if (!ticket) return
        const element = ticketRef.current
        const canvas = await html2canvas(element, { scale: 2 })
        const imgData = canvas.toDataURL('image/png')
        const imgWidth = 72
        const imgHeight = (canvas.height * imgWidth) / canvas.width
        const pdf = new jsPDF('p', 'mm', [imgWidth, imgHeight])
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
        pdf.save(`Abono_${ticket.folio}.pdf`)
        toast.success('PDF generado')
    }

    useEffect(() => {
        setTitulo('Sistema de Apartados')
        fetchData()
    }, [tab])

    const fetchData = async () => {
        setCargando(true)
        try {
            if (tab === 'cuentas') {
                const res = await apartadosAPI.cuentasPorCobrar()
                setCuentas(res.data.cuentas || [])
                setResumen(res.data)
            } else {
                const res = await apartadosAPI.getAll({ estado: tab === 'activos' ? 'activo' : tab })
                setApartados(res.data.apartados || [])
            }
        } catch (error) {
            console.error('Error fetching apartados:', error)
            toast.error('Error al cargar la información')
        } finally {
            setCargando(false)
        }
    }

    const fetchDetalle = async (id) => {
        try {
            const res = await apartadosAPI.getOne(id)
            setApartadoSeleccionado(res.data.apartado)
        } catch (error) {
            toast.error('Error al cargar el detalle')
        }
    }

    const handleRegistrarPago = async (e, stripeRef = null, overrideApartado = null, overrideMonto = null) => {
        if (e) e.preventDefault()
        
        const currentApartado = overrideApartado || apartadoSeleccionado
        const currentMonto = overrideMonto || montoPago

        // Si el método es tarjeta pero no hay referencia de Stripe, abrimos el modal de Stripe
        if (metodoPago === 'tarjeta' && !stripeRef) {
            localStorage.setItem('orchid_apartado_pending_pago', JSON.stringify({
                apartado_id: currentApartado.id,
                monto: currentMonto,
                metodo: metodoPago
            }))
            setShowStripeModal(true)
            return
        }

        const montoEntregado = parseFloat(currentMonto)
        const montoAplicado = Math.min(montoEntregado, currentApartado.saldo_pendiente)
        const cambio = Math.max(0, montoEntregado - currentApartado.saldo_pendiente)


        try {
            const res = await apartadosAPI.registrarPago(currentApartado.id, {
                monto: montoEntregado,
                metodo_pago: metodoPago,
                referencia_pago: stripeRef,
                notas: stripeRef ? `Pago con Stripe Ref: ${stripeRef}` : 'Pago registrado desde panel de apartados'
            })

            setTicket({
                folio: currentApartado.folio,
                cliente: currentApartado.cliente,
                is_pago: true,
                saldo_anterior: currentApartado.saldo_pendiente,
                monto_pago: montoAplicado,
                saldo_actual: Math.max(0, currentApartado.saldo_pendiente - montoAplicado),
                cambio: cambio,
                metodoPago: metodoPago,
                created_at: new Date().toISOString(),
                fecha_limite: currentApartado.fecha_limite
            })

            toast.success(res.data.mensaje)
            setShowPagoModal(false)
            setShowStripeModal(false)
            setMontoPago('')
            fetchDetalle(currentApartado.id)
            fetchData()
        } catch (error) {

            toast.error(error.response?.data?.mensaje || 'Error al registrar pago')
        }
    }

    const handleCancelar = async (id) => {
        if (!window.confirm('¿Estás seguro de cancelar este apartado? El stock será devuelto al inventario.')) return

        try {
            await apartadosAPI.cancelar(id)
            toast.success('Apartado cancelado correctamente')
            setApartadoSeleccionado(null)
            fetchData()
        } catch (error) {
            toast.error(error.response?.data?.mensaje || 'Error al cancelar')
        }
    }

    const handleEntregar = async (id) => {
        if (!window.confirm('¿Confirmar entrega de productos?')) return
        try {
            await apartadosAPI.entregar(id)
            
            // Preparar ticket de entrega
            setTicket({
                folio: apartadoSeleccionado.folio,
                cliente: apartadoSeleccionado.cliente,
                is_entrega: true,
                is_apartado: true,
                items: apartadoSeleccionado.detalle.map(d => ({
                    nombre: d.producto,
                    cantidad: d.cantidad,
                    precio_unitario: d.precio_unitario,
                    descuento: 0
                })),
                total: apartadoSeleccionado.total,
                anticipo: apartadoSeleccionado.total,
                saldo: 0,
                metodoPago: 'ENTREGADO',
                created_at: new Date().toISOString()
            })

            toast.success('Productos entregados correctamente')
            fetchDetalle(id)
            fetchData()
        } catch (error) {
            toast.error(error.response?.data?.mensaje || 'Error al entregar')
        }
    }

    const filteredApartados = apartados.filter(a => 
        a.folio.toLowerCase().includes(filtro.toLowerCase()) || 
        a.cliente?.toLowerCase().includes(filtro.toLowerCase())
    )

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)
    }

    const getStatusStyle = (estado) => {
        switch (estado) {
            case 'activo': return 'bg-amber-100 text-amber-700 border-amber-200'
            case 'completado': return 'bg-blue-100 text-blue-700 border-blue-200'
            case 'entregado': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
            case 'cancelado': return 'bg-rose-100 text-rose-700 border-rose-200'
            default: return 'bg-slate-100 text-slate-700 border-slate-200'
        }
    }

    return (
        <div className="space-y-6">
            {/* Tabs & Stats Header */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-3 flex bg-orchid-100/50 p-1 rounded-2xl w-fit">
                    <button 
                        onClick={() => setTab('activos')}
                        className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 ${tab === 'activos' ? 'bg-white text-orchid-700 shadow-sm' : 'text-orchid-600 hover:bg-orchid-100'}`}
                    >
                        <Clock size={18} /> Activos
                    </button>
                    <button 
                        onClick={() => setTab('completado')}
                        className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 ${tab === 'completado' ? 'bg-white text-orchid-700 shadow-sm' : 'text-orchid-600 hover:bg-orchid-100'}`}
                    >
                        <CheckCircle2 size={18} /> Liquidados
                    </button>
                    <button 
                        onClick={() => setTab('entregado')}
                        className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 ${tab === 'entregado' ? 'bg-white text-orchid-700 shadow-sm' : 'text-orchid-600 hover:bg-orchid-100'}`}
                    >
                        <ShoppingBag size={18} /> Entregados
                    </button>
                    <button 
                        onClick={() => setTab('cuentas')}
                        className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 ${tab === 'cuentas' ? 'bg-white text-orchid-700 shadow-sm' : 'text-orchid-600 hover:bg-orchid-100'}`}
                    >
                        <Wallet size={18} /> Cuentas por Cobrar
                    </button>
                    <button 
                        onClick={() => setTab('cancelado')}
                        className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 ${tab === 'cancelado' ? 'bg-white text-orchid-700 shadow-sm' : 'text-orchid-600 hover:bg-orchid-100'}`}
                    >
                        <XCircle size={18} /> Cancelados
                    </button>
                </div>
                
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-orchid-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar folio o cliente..."
                            value={filtro}
                            onChange={(e) => setFiltro(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border-none ring-1 ring-orchid-100 focus:ring-2 focus:ring-orchid-500 bg-white"
                        />
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-[calc(100vh-220px)]">
                
                {/* List Column */}
                <div className="xl:col-span-2 bg-white rounded-3xl shadow-sm border border-orchid-50 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-orchid-50 flex justify-between items-center bg-orchid-50/30">
                        <h3 className="font-display font-semibold text-orchid-900">
                            {tab === 'activos' ? 'Apartados en curso' : 
                             tab === 'completado' ? 'Historial de entregados' : 
                             tab === 'cuentas' ? 'Clientes con deuda' : 'Apartados cancelados'}
                        </h3>
                        <span className="text-xs font-medium text-orchid-500 bg-orchid-100 px-3 py-1 rounded-full uppercase tracking-wider">
                            {tab === 'cuentas' ? `${resumen?.total_apartados_activos || 0} DEUDAS` : `${filteredApartados.length} REGISTROS`}
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {cargando ? (
                            <div className="h-full flex items-center justify-center">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orchid-600"></div>
                            </div>
                        ) : tab === 'cuentas' ? (
                            /* Cuentas por cobrar view */
                            <div className="space-y-4">
                                {resumen?.resumen_clientes.map((cliente, idx) => (
                                    <div key={idx} className="bg-white border border-orchid-100 rounded-2xl p-5 hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h4 className="font-bold text-orchid-900 text-lg">{cliente.cliente}</h4>
                                                <p className="text-sm text-orchid-500 flex items-center gap-2 mt-1">
                                                    <User size={14} /> {cliente.apartados} apartados activos
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-medium text-rose-500 uppercase tracking-tighter mb-1">Deuda Total</p>
                                                <p className="text-2xl font-display font-black text-rose-600">{formatCurrency(cliente.total_deuda)}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => { setFiltro(cliente.cliente); setTab('activos'); }}
                                                className="flex-1 py-2 rounded-xl bg-orchid-50 text-orchid-700 text-sm font-semibold hover:bg-orchid-100 transition-colors"
                                            >
                                                Ver detalles
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {resumen?.resumen_clientes.length === 0 && (
                                    <div className="text-center py-20">
                                        <CheckCircle2 size={48} className="mx-auto text-emerald-200 mb-4" />
                                        <p className="text-orchid-400">¡Todo al corriente! No hay cuentas por cobrar.</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Standard Apartados list */
                            filteredApartados.map((a) => (
                                <motion.div
                                    layout
                                    key={a.id}
                                    onClick={() => fetchDetalle(a.id)}
                                    className={`group cursor-pointer p-4 rounded-2xl border transition-all duration-200 ${
                                        apartadoSeleccionado?.id === a.id 
                                        ? 'border-orchid-500 bg-orchid-50/50 ring-1 ring-orchid-500' 
                                        : 'border-orchid-100 hover:border-orchid-300 hover:bg-slate-50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-xl ${getStatusStyle(a.estado)} border`}>
                                                <ShoppingBag size={20} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-display font-bold text-orchid-900">{a.folio}</span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase ${getStatusStyle(a.estado)}`}>
                                                        {a.estado}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-orchid-600 font-medium">{a.cliente}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-orchid-950">{formatCurrency(a.total)}</p>
                                            <p className="text-[10px] text-rose-500 font-bold uppercase tracking-tight">
                                                Pendiente: {formatCurrency(a.saldo_pendiente)}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>

                {/* Detail Column */}
                <div className="bg-white rounded-3xl shadow-sm border border-orchid-50 overflow-hidden flex flex-col">
                    {apartadoSeleccionado ? (
                        <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="p-6 border-b border-orchid-50 bg-orchid-950 text-white">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-display font-black">{apartadoSeleccionado.folio}</h3>
                                        <p className="text-orchid-300 text-sm">{new Date(apartadoSeleccionado.created_at).toLocaleDateString('es-MX', { dateStyle: 'long' })}</p>
                                    </div>
                                    <button 
                                        onClick={() => setApartadoSeleccionado(null)}
                                        className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        <XCircle size={20} />
                                    </button>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                                        <p className="text-[10px] uppercase font-bold text-orchid-400">Total Apartado</p>
                                        <p className="text-lg font-black">{formatCurrency(apartadoSeleccionado.total)}</p>
                                    </div>
                                    <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                                        <p className="text-[10px] uppercase font-bold text-rose-400">Saldo Pendiente</p>
                                        <p className="text-lg font-black text-rose-300">{formatCurrency(apartadoSeleccionado.saldo_pendiente)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* Cliente Info */}
                                <div>
                                    <h4 className="text-xs font-bold text-orchid-400 uppercase tracking-widest mb-3">Información del Cliente</h4>
                                    <div className="flex items-center gap-3 text-orchid-900">
                                        <div className="h-10 w-10 rounded-full bg-orchid-100 flex items-center justify-center text-orchid-600">
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold">{apartadoSeleccionado.cliente}</p>
                                            <p className="text-xs text-orchid-500">{apartadoSeleccionado.cliente_tel || 'Sin teléfono'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Items List */}
                                <div>
                                    <h4 className="text-xs font-bold text-orchid-400 uppercase tracking-widest mb-3">Productos Bloqueados</h4>
                                    <div className="space-y-3">
                                        {apartadoSeleccionado.detalle.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-sm p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <div>
                                                    <p className="font-bold text-orchid-900">{item.producto}</p>
                                                    <p className="text-xs text-orchid-500">{item.cantidad} x {formatCurrency(item.precio_unitario)}</p>
                                                </div>
                                                <span className="font-black text-orchid-950">{formatCurrency(item.subtotal)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Pagos Realizados */}
                                <div>
                                    <h4 className="text-xs font-bold text-orchid-400 uppercase tracking-widest mb-3">Historial de Pagos</h4>
                                    <div className="space-y-3">
                                        {apartadoSeleccionado.pagos.map((pago, idx) => (
                                            <div key={idx} className="flex items-center gap-3 text-sm p-3 border-l-4 border-emerald-400 bg-emerald-50/30 rounded-r-xl">
                                                <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                                                    <DollarSign size={16} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between">
                                                        <span className="font-bold text-emerald-900">{formatCurrency(pago.monto)}</span>
                                                        <span className="text-[10px] text-emerald-600 font-medium">
                                                            {new Date(pago.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-emerald-500 uppercase tracking-tighter">{pago.metodo_pago} — {pago.registrado_por}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                                <div className="p-6 border-t border-orchid-50 bg-slate-50 flex gap-3">
                                    {apartadoSeleccionado.estado === 'activo' && (
                                        <button 
                                            onClick={() => setShowPagoModal(true)}
                                            className="flex-1 flex items-center justify-center gap-2 bg-orchid-600 text-white py-3 rounded-2xl font-bold hover:bg-orchid-700 shadow-lg shadow-orchid-200 transition-all active:scale-95"
                                        >
                                            <Plus size={20} /> Registrar Pago
                                        </button>
                                    )}
                                    {apartadoSeleccionado.estado === 'completado' && (
                                        <button 
                                            onClick={() => handleEntregar(apartadoSeleccionado.id)}
                                            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-2xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-95"
                                        >
                                            <Send size={20} /> Entregar Productos
                                        </button>
                                    )}
                                    {usuario?.rol === 'admin' && apartadoSeleccionado.estado !== 'cancelado' && apartadoSeleccionado.estado !== 'entregado' && (
                                        <button 
                                            onClick={() => handleCancelar(apartadoSeleccionado.id)}
                                            className="p-3 rounded-2xl border border-rose-200 text-rose-500 hover:bg-rose-50 transition-colors"
                                            title="Cancelar Apartado"
                                        >
                                            <XCircle size={20} />
                                        </button>
                                    )}
                                </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-60">
                            <div className="w-24 h-24 bg-orchid-50 rounded-full flex items-center justify-center mb-6 text-orchid-300">
                                <Receipt size={48} />
                            </div>
                            <h3 className="text-xl font-display font-bold text-orchid-900 mb-2">Detalle del Apartado</h3>
                            <p className="text-orchid-500 max-w-xs">
                                Selecciona un registro de la lista para ver el historial de pagos y productos bloqueados.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Pago */}
            <AnimatePresence>
                {showPagoModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            onClick={() => setShowPagoModal(false)}
                            className="absolute inset-0 bg-orchid-950/40 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white rounded-3xl p-8 w-full max-w-md relative shadow-2xl"
                        >
                            <h3 className="text-2xl font-display font-black text-orchid-950 mb-6 flex items-center gap-3">
                                <TrendingUp className="text-orchid-600" /> Registrar Abono
                            </h3>

                            <form onSubmit={handleRegistrarPago} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-orchid-900 mb-2">Monto a abonar</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-orchid-400" size={20} />
                                        <input
                                            autoFocus
                                            type="number"
                                            step="0.01"
                                            value={montoPago}
                                            onChange={(e) => setMontoPago(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full pl-12 pr-4 py-4 rounded-2xl border-none ring-1 ring-orchid-100 focus:ring-2 focus:ring-orchid-600 bg-orchid-50/30 text-xl font-black text-orchid-900"
                                            required
                                        />
                                    </div>
                                    <p className="mt-2 text-xs text-orchid-500 font-medium">
                                        Saldo máximo permitido: <span className="text-rose-500 font-bold">{formatCurrency(apartadoSeleccionado?.saldo_pendiente)}</span>
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-orchid-900 mb-3 text-center uppercase tracking-widest">Método de Pago</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { id: 'efectivo', label: 'Efectivo', icon: '💵' },
                                            { id: 'transferencia', label: 'Transferencia', icon: '📱' },
                                            { id: 'tarjeta', label: 'Tarjeta', icon: '💳' },
                                            { id: 'otro', label: 'Otro', icon: '✨' }
                                        ].map((m) => (
                                            <button
                                                key={m.id}
                                                type="button"
                                                onClick={() => setMetodoPago(m.id)}
                                                className={`py-3 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all ${
                                                    metodoPago === m.id 
                                                    ? 'border-orchid-600 bg-orchid-50 text-orchid-700 shadow-md scale-105' 
                                                    : 'border-orchid-100 hover:border-orchid-200 text-orchid-500'
                                                }`}
                                            >
                                                <span className="text-xl">{m.icon}</span>
                                                <span className="text-xs font-bold">{m.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowPagoModal(false)}
                                        className="flex-1 py-4 rounded-2xl border border-orchid-100 font-bold text-orchid-500 hover:bg-slate-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-2 bg-orchid-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-orchid-700 shadow-lg shadow-orchid-200 transition-all active:scale-95"
                                    >
                                        Confirmar Pago
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            
            <StripePaymentModal 
                isOpen={showStripeModal}
                amount={parseFloat(montoPago) || 0}
                onSuccess={(ref) => handleRegistrarPago(null, ref)}
                onCancel={() => setShowStripeModal(false)}
            />

            {/* Modal de Comprobante de Abono */}
            <AnimatePresence>
                {ticket && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-orchid-950/60 backdrop-blur-md"
                            onClick={() => setTicket(null)}
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-3xl p-8 w-full max-w-sm relative shadow-2xl text-center overflow-hidden"
                        >
                            <TicketPrint ref={ticketRef} ticket={ticket} />
                            
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle size={32} className="text-emerald-600" />
                            </div>
                            <h3 className="text-xl font-display font-black text-orchid-900 mb-1">
                                {ticket.is_entrega ? 'Entrega Confirmada' : 'Pago Registrado'}
                            </h3>
                            <p className="text-sm text-orchid-500 mb-6">
                                {ticket.is_entrega ? 'Los productos han sido marcados como entregados' : 'El abono se ha procesado correctamente'}
                            </p>

                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <button onClick={handlePrint} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 hover:bg-orchid-50 transition-colors border border-slate-100 hover:border-orchid-200 group">
                                    <Printer size={20} className="text-slate-400 group-hover:text-orchid-600" />
                                    <span className="text-[10px] font-bold uppercase text-slate-500 group-hover:text-orchid-700">Imprimir</span>
                                </button>
                                <button onClick={downloadPDF} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 hover:bg-emerald-50 transition-colors border border-slate-100 hover:border-emerald-200 group">
                                    <Send size={20} className="text-slate-400 group-hover:text-emerald-600" />
                                    <span className="text-[10px] font-bold uppercase text-slate-500 group-hover:text-emerald-700">Digital</span>
                                </button>
                                <button onClick={shareWhatsApp} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 hover:bg-green-50 transition-colors border border-slate-100 hover:border-green-200 group col-span-2">
                                    <div className="flex items-center gap-2">
                                        <Share2 size={18} className="text-slate-400 group-hover:text-green-600" />
                                        <span className="text-[10px] font-bold uppercase text-slate-500 group-hover:text-green-700">Enviar por WhatsApp</span>
                                    </div>
                                </button>
                            </div>

                            <button onClick={() => setTicket(null)} className="w-full py-4 rounded-2xl bg-orchid-600 text-white font-bold hover:bg-orchid-700 shadow-lg shadow-orchid-200 transition-all">
                                {ticket.cambio > 0 ? `Entregar cambio: ${formatCurrency(ticket.cambio)}` : 'Entendido'}
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
