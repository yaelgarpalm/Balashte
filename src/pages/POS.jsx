import { useState, useEffect, useRef, useCallback } from 'react'
import { productosAPI, ventasAPI, clientesAPI, categoriasAPI, cajaAPI, apartadosAPI } from '../services/api'
import { useUI } from '../context/UIContext'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { Plus, Minus, ShoppingCart, CreditCard, Banknote, ArrowRightLeft, CheckCircle, X, Package, Lock, Printer, Share2, Mail, Send, FileText, ScanLine } from 'lucide-react'
import { useReactToPrint } from 'react-to-print'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import TicketPrint from '../components/pos/TicketPrint'
import StripePaymentModal from '../components/pos/StripePaymentModal'
import api from '../services/api'
import CodeScanner from '../components/common/CodeScanner'


const fmt = (n) => `MXN ${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

export default function POS() {
    const { buscar, setBuscar, setTitulo, setSubtitulo } = useUI()
    const [productos, setProductos] = useState([])
    const [carrito, setCarrito] = useState([])
    const [cliente, setCliente] = useState(null)
    const [clientes, setClientes] = useState([])
    const [metodoPago, setMetodoPago] = useState('efectivo')
    const [montoPagado, setMontoPagado] = useState('')
    const [descGlobal, setDescGlobal] = useState(0)
    const [categorias, setCategorias] = useState([])
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todas')
    const [loading, setLoading] = useState(false)
    const [ticket, setTicket] = useState(null)
    const [viewMode, setViewMode] = useState('products') // 'products' | 'cart'
    const [cajaAbierta, setCajaAbierta] = useState(true)
    const [isApartado, setIsApartado] = useState(false)
    const [fechaLimite, setFechaLimite] = useState('')
    const [showStripeModal, setShowStripeModal] = useState(false)
    const [stripeTransactionId, setStripeTransactionId] = useState(null)
    const [isRecoveringStripe, setIsRecoveringStripe] = useState(false)
    const [facturando, setFacturando] = useState(false)
    const [showScanner, setShowScanner] = useState(false)
    const cartContainerRef = useRef(null)
    const ticketRef = useRef(null)

    const handlePrint = useReactToPrint({
        content: () => ticketRef.current,
        documentTitle: `Ticket_${ticket?.folio || 'venta'}`,
    })

    const shareWhatsApp = async () => {
        if (!ticket) return
        
        const text = `🌸 *Balashte orquideas y anturios - Comprobante de Venta*\n\n` +
            `*Folio:* ${ticket.folio}\n` +
            `*Total: ${fmt(ticket.total)}*\n\n` +
            `¡Gracias por su compra! ✨`

        try {
            // Generar el PDF para compartir si es posible
            const element = ticketRef.current
            const canvas = await html2canvas(element, { scale: 2 })
            const imgData = canvas.toDataURL('image/png')
            const imgWidth = 72
            const imgHeight = (canvas.height * imgWidth) / canvas.width
            const pdf = new jsPDF('p', 'mm', [imgWidth, imgHeight])
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
            
            const pdfBlob = pdf.output('blob')
            const file = new File([pdfBlob], `Ticket_${ticket.folio}.pdf`, { type: 'application/pdf' })

            // Intentar usar el API de compartir de la plataforma (móvil/tableta)
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: `Ticket ${ticket.folio}`,
                    text: text
                })
            } else {
                // Fallback: Abrir WhatsApp con el texto y descargar el PDF
                pdf.save(`Ticket_${ticket.folio}.pdf`)
                const url = `https://wa.me/?text=${encodeURIComponent(text + '\n\n(Se ha descargado el PDF en tu equipo para que puedas adjuntarlo)')}`
                window.open(url, '_blank')
                toast.success('PDF descargado. Ahora puedes adjuntarlo en WhatsApp.')
            }
        } catch (err) {
            console.error('Error sharing:', err)
            // Último recurso: Solo texto
            const url = `https://wa.me/?text=${encodeURIComponent(text)}`
            window.open(url, '_blank')
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
        pdf.save(`Ticket_${ticket.folio}.pdf`)
        toast.success('PDF generado correctamente')
    }

    const shareEmail = () => {
        if (!ticket) return
        const subject = `Comprobante de Venta ${ticket.folio} - Balashte`
        const body = `Hola ${ticket.cliente},\n\nAdjunto tu resumen de compra:\n\nFolio: ${ticket.folio}\nTotal: ${fmt(ticket.total)}\n\nGracias por tu preferencia.`
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    }

    const handleFacturar = async () => {
        if (!ticket || ticket.is_apartado) return
        if (ticket.cliente_id === 1 || !ticket.cliente_id) {
            return toast.error('Para facturar, debe seleccionar un cliente con RFC válido.')
        }

        setFacturando(true)
        try {
            const { data } = await api.post('/facturapi/crear-factura', { 
                venta_id: ticket.id,
                uso_cfdi: 'G03' // Por defecto
            })
            toast.success('Factura creada exitosamente')
            // Descargar PDF autenticado y abrirlo en nueva pestaña
            try {
                const pdfRes = await api.get(`/facturapi/${data.factura.id}/pdf`, { responseType: 'blob' })
                const blob = new Blob([pdfRes.data], { type: 'application/pdf' })
                const url = URL.createObjectURL(blob)
                window.open(url, '_blank')
            } catch { /* Si falla el PDF, no bloqueamos el flujo */ }
            setTicket(prev => ({ ...prev, factura_id: data.factura.id, factura_url: data.factura.dashboardUrl }))
        } catch (e) {
            toast.error(e.response?.data?.mensaje || 'Error al generar factura')
        } finally {
            setFacturando(false)
        }
    }


    useEffect(() => {
        setTitulo('Punto de Venta')
        setSubtitulo('Gestión de ventas y cobro')
        productosAPI.getAll({ limit: 200, tipo_producto: 'venta' }).then(r => setProductos(r.data.productos))
        clientesAPI.getAll().then(r => setClientes(r.data.clientes))
        categoriasAPI.getAll().then(r => setCategorias(r.data.categorias))
        cajaAPI.getEstado().then(r => setCajaAbierta(r.data.abierta))

        // Manejar retorno de Stripe
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.get('stripe_success') === 'true') {
            const sessionId = urlParams.get('session_id')
            const savedSale = localStorage.getItem('orchid_pos_pending_sale')
            
            if (savedSale) {
                try {
                    const pendingSale = JSON.parse(savedSale)
                    setCarrito(pendingSale.carrito)
                    setCliente(pendingSale.cliente)
                    setDescGlobal(pendingSale.descGlobal)
                    setIsApartado(pendingSale.isApartado)
                    setFechaLimite(pendingSale.fechaLimite)
                    setMontoPagado(pendingSale.montoPagado)
                    setMetodoPago('tarjeta')
                    setStripeTransactionId(sessionId)
                    setIsRecoveringStripe(true)
                    
                    // Limpiar URL
                    window.history.replaceState({}, document.title, window.location.pathname)
                    localStorage.removeItem('orchid_pos_pending_sale')
                    toast.success('Pago confirmado con Stripe')
                } catch (err) {
                    console.error('Error al recuperar venta de Stripe:', err)
                }
            }
        } else if (urlParams.get('stripe_cancel') === 'true') {
            window.history.replaceState({}, document.title, window.location.pathname)
            localStorage.removeItem('orchid_pos_pending_sale')
            toast.error('Pago cancelado')
        }

        return () => {
            setTitulo('')
            setSubtitulo('')
        }
    }, [])

    // Efecto para procesar la venta automáticamente al recuperar de Stripe
    useEffect(() => {
        if (isRecoveringStripe && stripeTransactionId && !loading) {
            setIsRecoveringStripe(false)
            // Pequeño delay para asegurar que los estados se aplicaron
            setTimeout(() => {
                procesarVenta()
            }, 500)
        }
    }, [isRecoveringStripe, stripeTransactionId])


    useEffect(() => {
        if (carrito.length > 0 && cartContainerRef.current) {
            cartContainerRef.current.scrollTo({
                top: cartContainerRef.current.scrollHeight,
                behavior: 'smooth'
            })
        }
    }, [carrito.length])

    const productosFiltrados = productos.filter(p =>
        (categoriaSeleccionada === 'todas' || p.categoria_id === parseInt(categoriaSeleccionada)) &&
        (p.nombre.toLowerCase().includes(buscar.toLowerCase()) || p.codigo.toLowerCase().includes(buscar.toLowerCase()))
    )

    const agregarAlCarrito = (prod) => {
        setCarrito(prev => {
            const existe = prev.find(i => i.producto_id === prod.id)
            if (existe) {
                if (existe.cantidad >= prod.stock) { toast.error('Stock insuficiente'); return prev }
                return prev.map(i => i.producto_id === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i)
            }
            return [...prev, { producto_id: prod.id, nombre: prod.nombre, codigo: prod.codigo, precio_unitario: prod.precio_venta, cantidad: 1, stock: prod.stock, descuento: 0 }]
        })
    }

    const agregarPorCodigo = useCallback((codigo) => {
        const cleanCode = String(codigo || '').trim()
        if (!cleanCode) return

        const producto = productos.find(p => String(p.codigo).toLowerCase() === cleanCode.toLowerCase())
        if (!producto) {
            setBuscar(cleanCode)
            toast.error('Producto no encontrado')
            return
        }
        if (producto.stock <= 0) {
            toast.error('Producto sin stock')
            return
        }

        agregarAlCarrito(producto)
        setBuscar('')
        setShowScanner(false)
        toast.success(`${producto.nombre} agregado`)
    }, [productos, setBuscar])

    useEffect(() => {
        let buffer = ''
        let lastKeyTime = 0

        const handleKeyDown = (event) => {
            const tag = event.target?.tagName?.toLowerCase()
            if (tag === 'input' || tag === 'textarea' || tag === 'select' || event.ctrlKey || event.altKey || event.metaKey) return

            const now = Date.now()
            if (now - lastKeyTime > 80) buffer = ''
            lastKeyTime = now

            if (event.key === 'Enter') {
                if (buffer.length >= 4) {
                    event.preventDefault()
                    agregarPorCodigo(buffer)
                }
                buffer = ''
                return
            }

            if (event.key.length === 1) buffer += event.key
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [agregarPorCodigo])

    const cambiarCantidad = (id, delta) => {
        setCarrito(prev => prev.map(i => {
            if (i.producto_id !== id) return i
            const nueva = i.cantidad + delta
            if (nueva <= 0) return null
            if (nueva > i.stock) { toast.error('Stock insuficiente'); return i }
            return { ...i, cantidad: nueva }
        }).filter(Boolean))
    }

    const quitarItem = (id) => setCarrito(prev => prev.filter(i => i.producto_id !== id))

    const validarCarritoStock = () => {
        for (const item of carrito) {
            const producto = productos.find(p => p.id === item.producto_id)
            const disponible = Number(producto?.stock ?? item.stock ?? 0)
            const cantidad = Number(item.cantidad)

            if (!Number.isInteger(cantidad) || cantidad <= 0) {
                toast.error(`Cantidad inválida para ${item.nombre}`)
                return false
            }
            if (cantidad > disponible) {
                toast.error(`Stock insuficiente para ${item.nombre}. Disponible: ${disponible}`)
                return false
            }
        }
        return true
    }

    const handleClienteChange = (e) => {
        const id = e.target.value
        const c = clientes.find(cl => cl.id == id) || null
        setCliente(c)
        if (c) {
            setDescGlobal(c.descuento_default || 0)
        } else {
            setDescGlobal(0)
        }
    }

    const subtotal = carrito.reduce((s, i) => s + i.precio_unitario * i.cantidad * (1 - i.descuento / 100), 0)
    const descuentoMonto = subtotal * (descGlobal / 100)
    const base = subtotal - descuentoMonto
    const iva = base * 0.16
    const total = base + iva
    const cambio = (parseFloat(montoPagado) || 0) - total

    const procesarVenta = async () => {
        if (!carrito.length) return toast.error('El carrito está vacío')
        if (!validarCarritoStock()) return
        
        if (isApartado) {
            if (!cliente) return toast.error('Debe seleccionar un cliente para crear un apartado')
            if (parseFloat(montoPagado || 0) <= 0) return toast.error('Debe registrar un anticipo inicial')
            if (metodoPago === 'tarjeta' && !stripeTransactionId) {
                // Guardar estado para recuperar al volver de Stripe
                localStorage.setItem('orchid_pos_pending_sale', JSON.stringify({
                    carrito,
                    cliente,
                    descGlobal,
                    isApartado,
                    fechaLimite,
                    montoPagado
                }))
                setShowStripeModal(true);
                return;
            }
        } else {
            if (metodoPago === 'efectivo' && parseFloat(montoPagado || 0) < total) return toast.error('Monto insuficiente')
            if (metodoPago === 'tarjeta' && !stripeTransactionId) {
                // Guardar estado para recuperar al volver de Stripe
                localStorage.setItem('orchid_pos_pending_sale', JSON.stringify({
                    carrito,
                    cliente,
                    descGlobal,
                    isApartado,
                    fechaLimite,
                    montoPagado
                }))
                setShowStripeModal(true);
                return;
            }
        }


        setLoading(true)
        try {
            if (isApartado) {
                const { data } = await apartadosAPI.crear({
                    cliente_id: cliente.id,
                    items: carrito.map(i => ({ producto_id: i.producto_id, cantidad: i.cantidad, precio_unitario: i.precio_unitario, descuento: i.descuento })),
                    descuento_global: descGlobal,
                    metodo_pago: metodoPago,
                    anticipo: parseFloat(montoPagado),
                    referencia_pago: stripeTransactionId,
                    fecha_limite: fechaLimite || null,
                    notas: stripeTransactionId ? `Anticipo con Stripe Ref: ${stripeTransactionId}` : 'Creado desde POS'
                })
                setTicket({ 
                    ...data.apartado, 
                    items: carrito, 
                    cliente: cliente?.nombre || 'Público General', 
                    cliente_id: cliente?.id || 1,
                    metodoPago, 
                    descuento_global: descGlobal,
                    is_apartado: true,
                    anticipo: Math.min(parseFloat(montoPagado || 0), total),
                    saldo: Math.max(0, total - parseFloat(montoPagado || 0)),
                    cambio: Math.max(0, parseFloat(montoPagado || 0) - total),
                    fecha_limite: fechaLimite,
                    created_at: new Date().toISOString() 
                })
                toast.success(`Apartado ${data.apartado.folio} creado correctamente`)
            } else {
                const { data } = await ventasAPI.crear({
                    cliente_id: cliente?.id || 1,
                    items: carrito.map(i => ({ producto_id: i.producto_id, cantidad: i.cantidad, precio_unitario: i.precio_unitario, descuento: i.descuento })),
                    descuento_global: descGlobal,
                    metodo_pago: metodoPago,
                    monto_pagado: parseFloat(montoPagado) || total,
                    referencia_pago: stripeTransactionId
                })
                setTicket({ 
                    ...data.venta, 
                    items: carrito, 
                    cliente: cliente?.nombre || 'Público General', 
                    cliente_id: cliente?.id || 1,
                    metodoPago, 
                    descuento_global: descGlobal,
                    created_at: new Date().toISOString() 
                })
                toast.success(`Venta ${data.venta.folio} registrada`)
            }

            setCarrito([])
            setMontoPagado('')
            setCliente(null)
            setDescGlobal(0)
            setIsApartado(false)
            setFechaLimite('')
            setStripeTransactionId(null)
            productosAPI.getAll({ limit: 200, tipo_producto: 'venta' }).then(r => setProductos(r.data.productos))
        } catch (e) {
            toast.error(e.response?.data?.mensaje || 'Error al procesar')
        } finally { setLoading(false) }
    }

    if (!cajaAbierta) return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center space-y-6">
            <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 animate-pulse">
                <Lock size={48} />
            </div>
            <div>
                <h2 className="text-2xl font-black text-gray-800">Caja Cerrada</h2>
                <p className="text-gray-500 max-w-md mx-auto mt-2">Para poder realizar ventas, primero debes realizar la apertura de turno en el módulo de control de caja.</p>
            </div>
            <Link to="/caja" className="btn-primary px-8 py-3 rounded-2xl shadow-lg shadow-orchid-100">
                Ir a Control de Caja
            </Link>
        </div>
    )

    if (ticket) return (
        <div className="max-w-md mx-auto animate-in fade-in zoom-in duration-300">
            <TicketPrint ref={ticketRef} ticket={ticket} />
            <div className="card text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-jade-400 via-emerald-500 to-teal-400"></div>
                <div className="w-20 h-20 bg-jade-50 rounded-full flex items-center justify-center mx-auto mb-6 mt-4 shadow-inner">
                    <CheckCircle size={48} className="text-jade-600" />
                </div>
                <h2 className="font-display text-2xl font-black text-gray-800 mb-1">¡Venta Exitosa!</h2>
                <p className="font-mono text-orchid-600 font-bold text-lg mb-6">{ticket.folio}</p>
                
                <div className="bg-gray-50 rounded-2xl p-5 text-left space-y-3 mb-8 border border-gray-100">
                    {ticket.items.map((i, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                            <span className="text-gray-600 font-medium">{i.nombre} <span className="text-orchid-300 ml-1">x{i.cantidad}</span></span>
                            <span className="font-bold text-gray-700">{fmt(i.precio_unitario * i.cantidad)}</span>
                        </div>
                    ))}
                    <div className="border-t border-dashed border-gray-300 pt-3 mt-3 space-y-2">
                        <div className="flex justify-between text-xs text-gray-500"><span>IVA 16%</span><span>{fmt(ticket.iva)}</span></div>
                        <div className="flex justify-between font-black text-2xl text-gray-900 pt-1">
                            <span>TOTAL</span>
                            <span className="text-jade-700">{fmt(ticket.total)}</span>
                        </div>
                        {ticket.cambio > 0.01 && (
                            <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100 mt-2">
                                <span>Cambio</span>
                                <span>{fmt(ticket.cambio)}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                    <button onClick={handlePrint} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white border-2 border-gray-100 hover:border-orchid-500 hover:bg-orchid-50 transition-all group">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-orchid-100 group-hover:text-orchid-600">
                            <Printer size={20} />
                        </div>
                        <span className="text-xs font-bold text-gray-600 group-hover:text-orchid-700">Imprimir Ticket</span>
                    </button>
                    <button onClick={downloadPDF} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white border-2 border-gray-100 hover:border-jade-500 hover:bg-jade-50 transition-all group">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-jade-100 group-hover:text-jade-600">
                            <Send size={20} />
                        </div>
                        <span className="text-xs font-bold text-gray-600 group-hover:text-jade-700">Digital (PDF)</span>
                    </button>
                    <button onClick={shareWhatsApp} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white border-2 border-gray-100 hover:border-green-500 hover:bg-green-50 transition-all group">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-green-100 group-hover:text-green-600">
                            <Share2 size={20} />
                        </div>
                        <span className="text-xs font-bold text-gray-600 group-hover:text-green-700">WhatsApp</span>
                    </button>
                    <button onClick={shareEmail} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white border-2 border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-all group">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600">
                            <Mail size={20} />
                        </div>
                        <span className="text-xs font-bold text-gray-600 group-hover:text-blue-700">Enviar Email</span>
                    </button>
                    {!ticket.is_apartado && (
                        <button 
                            onClick={handleFacturar} 
                            disabled={facturando || ticket.factura_id}
                            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all group ${ticket.factura_id ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-100 hover:border-indigo-500 hover:bg-indigo-50'}`}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ticket.factura_id ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-50 text-gray-400 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                                {facturando ? <div className="w-5 h-5 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" /> : <FileText size={20} />}
                            </div>
                            <span className={`text-xs font-bold ${ticket.factura_id ? 'text-indigo-700' : 'text-gray-600 group-hover:text-indigo-700'}`}>
                                {ticket.factura_id ? 'Facturado' : 'Facturar (SAT)'}
                            </span>
                        </button>
                    )}
                </div>
                
                <button onClick={() => setTicket(null)} className="btn-primary w-full h-14 rounded-2xl justify-center text-lg shadow-xl shadow-orchid-200 mt-4">
                    <Plus size={24} /> Nueva venta
                </button>
            </div>
        </div>
    )

    return (
        <div className="flex flex-col lg:flex-row gap-4 h-full lg:h-[calc(100vh-160px)]">
            {/* Mobile View Toggle */}
            <div className="lg:hidden flex bg-white p-1 rounded-2xl border border-orchid-100 shadow-sm mb-2">
                <button 
                    onClick={() => setViewMode('products')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${viewMode === 'products' ? 'bg-orchid-700 text-white shadow-md' : 'text-gray-500'}`}
                >
                    <Package size={16} /> Productos
                </button>
                <button 
                    onClick={() => setViewMode('cart')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 relative ${viewMode === 'cart' ? 'bg-orchid-700 text-white shadow-md' : 'text-gray-500'}`}
                >
                    <ShoppingCart size={16} /> Carrito
                    {carrito.length > 0 && (
                        <span className="absolute top-1.5 right-4 w-4 h-4 bg-crimson-600 text-white text-[9px] rounded-full flex items-center justify-center border-2 border-white">
                            {carrito.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Left: Products */}
            <div className={`flex-1 flex flex-col min-w-0 ${viewMode !== 'products' ? 'hidden lg:flex' : 'flex'}`}>
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <button onClick={() => setShowScanner(true)} className="btn-primary w-full justify-center sm:w-auto">
                        <ScanLine size={16} /> Escanear QR / barras
                    </button>
                    <div className="rounded-xl border border-orchid-100 bg-white px-3 py-2 text-xs font-medium text-gray-500">
                        También acepta lectores USB por teclado
                    </div>
                </div>

                {/* Categorías */}
                <div className="flex gap-2 overflow-x-auto pb-3 mb-2 scrollbar-hide">
                    <button 
                        onClick={() => setCategoriaSeleccionada('todas')}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${categoriaSeleccionada === 'todas' ? 'bg-orchid-700 text-white shadow-md shadow-orchid-100' : 'bg-white text-gray-500 border border-gray-100 hover:border-orchid-200'}`}
                    >
                        Todas
                    </button>
                    {categorias.map(cat => (
                        <button 
                            key={cat.id}
                            onClick={() => setCategoriaSeleccionada(cat.id)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${categoriaSeleccionada === cat.id ? 'bg-orchid-700 text-white shadow-md shadow-orchid-100' : 'bg-white text-gray-500 border border-gray-100 hover:border-orchid-200'}`}
                        >
                            {cat.nombre}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto pr-2 pb-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                        {productosFiltrados.map(p => (
                            <button key={p.id} onClick={() => p.stock > 0 && agregarAlCarrito(p)} disabled={p.stock <= 0}
                                className={`bg-white rounded-2xl border border-orchid-100/60 p-4 text-left transition-all duration-300 group relative overflow-hidden ${p.stock > 0 ? 'hover:border-orchid-400 hover:shadow-xl hover:shadow-orchid-100/50' : 'opacity-60 cursor-not-allowed'}`}>
                                <div className={`absolute top-0 right-0 w-12 h-12 rounded-bl-3xl flex items-center justify-center transition-opacity ${p.stock > 0 ? 'bg-orchid-50 opacity-0 group-hover:opacity-100' : 'bg-red-50 opacity-100'}`}>
                                    <Plus size={18} className="text-orchid-600" />
                                </div>
                                <div className="w-12 h-12 bg-orchid-50 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:bg-orchid-100 transition-colors overflow-hidden">
                                    {p.imagen_url ? <img src={p.imagen_url} alt={p.nombre} className="h-full w-full object-cover" /> : <span>🌸</span>}
                                </div>
                                <h3 className="font-bold text-gray-800 text-sm leading-tight group-hover:text-orchid-700 transition-colors line-clamp-2 h-10">{p.nombre}</h3>
                                <p className="text-[10px] text-gray-400 font-mono mt-1 uppercase tracking-wider">{p.codigo}</p>
                                <div className="flex items-center justify-between mt-4">
                                    <p className="text-orchid-700 font-black text-base">{fmt(p.precio_venta)}</p>
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${p.stock <= 0 ? 'bg-red-100 text-red-700' : p.stock <= p.stock_minimo ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                        {p.stock <= 0 ? 'Sin stock' : `${p.stock} uds`}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                    {productosFiltrados.length === 0 && (
                        <div className="text-center py-16 text-gray-400">
                            <div className="text-4xl mb-3">🔍</div>
                            <p>No se encontraron productos</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Cart */}
            <div className={`w-full lg:w-[380px] flex flex-col bg-white rounded-2xl border border-orchid-100/60 shadow-lg overflow-hidden flex-shrink-0 ${viewMode !== 'cart' ? 'hidden lg:flex' : 'flex'} h-[calc(100vh-280px)] lg:h-auto`}>
                <div className="p-4 border-b border-gray-50 bg-orchid-50/30">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-orchid-700 flex items-center justify-center text-white shadow-sm">
                                <ShoppingCart size={16} />
                            </div>
                            <h2 className="font-bold text-gray-800 text-sm">Mi Carrito</h2>
                        </div>
                        <span className="badge-purple">{carrito.length} {carrito.length === 1 ? 'item' : 'items'}</span>
                    </div>
                    {/* Cliente */}
                    <select className="input text-xs h-9" value={cliente?.id || ''} onChange={handleClienteChange}>
                        <option value="">Público General</option>
                        {clientes.filter(c => c.id !== 1).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>

                    {cliente && (
                        <div className="mt-3 flex bg-white/50 p-1 rounded-xl border border-orchid-100">
                            <button 
                                onClick={() => setIsApartado(false)}
                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${!isApartado ? 'bg-orchid-700 text-white shadow-sm' : 'text-orchid-400'}`}
                            >
                                Venta Directa
                            </button>
                            <button 
                                onClick={() => setIsApartado(true)}
                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${isApartado ? 'bg-amber-600 text-white shadow-sm' : 'text-amber-400'}`}
                            >
                                Apartado
                            </button>
                        </div>
                    )}
                </div>

                {/* Items */}
                <div ref={cartContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50 min-h-[80px]">
                    {carrito.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-3 shadow-sm">
                                <ShoppingCart size={24} className="opacity-20" />
                            </div>
                            <p className="text-sm font-medium">El carrito está vacío</p>
                            <p className="text-xs opacity-60">Selecciona productos</p>
                        </div>
                    )}
                    {carrito.map(item => (
                        <div key={item.producto_id} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-gray-800 truncate">{item.nombre}</p>
                                    <p className="text-[10px] text-gray-400 font-mono uppercase">{item.codigo}</p>
                                </div>
                                <button onClick={() => quitarItem(item.producto_id)} className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all">
                                    <X size={14} />
                                </button>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-100">
                                    <button onClick={() => cambiarCantidad(item.producto_id, -1)} className="w-6 h-6 rounded-md bg-white border border-gray-100 flex items-center justify-center hover:bg-orchid-50 hover:border-orchid-200 transition-colors shadow-sm">
                                        <Minus size={10} />
                                    </button>
                                    <span className="text-xs font-bold w-6 text-center text-gray-700">{item.cantidad}</span>
                                    <button onClick={() => cambiarCantidad(item.producto_id, 1)} className="w-6 h-6 rounded-md bg-white border border-gray-100 flex items-center justify-center hover:bg-orchid-50 hover:border-orchid-200 transition-colors shadow-sm">
                                        <Plus size={10} />
                                    </button>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-orchid-700">{fmt(item.precio_unitario * item.cantidad)}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Summary */}
                {carrito.length > 0 && (
                    <div className="p-3 border-t border-gray-100 bg-white shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
                        <div className="space-y-1 mb-2">
                            <div className="flex justify-between items-center text-[10px]">
                                <span className="text-gray-500 font-medium">Subtotal</span>
                                <span className="text-gray-800 font-bold">{fmt(subtotal)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px]">
                                <div className="flex items-center gap-1">
                                    <span className="text-gray-500 font-medium">Desc.</span>
                                    <div className="flex items-center bg-red-50 rounded-lg border border-red-100 px-2 py-0.5 group focus-within:border-red-300 transition-all">
                                        <input type="number" min="0" max="100" value={descGlobal} 
                                            onChange={e => setDescGlobal(e.target.value === '' ? '' : Math.max(0, Math.min(100, Number(e.target.value))))}
                                            onFocus={e => e.target.select()}
                                            className="bg-transparent text-xs w-10 text-center focus:outline-none font-bold text-red-600 h-5" />
                                        <span className="text-[10px] text-red-400 font-bold">%</span>
                                    </div>
                                </div>
                                <span className="text-red-500 font-bold">-{fmt(descuentoMonto)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px]">
                                <span className="text-gray-500 font-medium">IVA (16%)</span>
                                <span className="text-gray-800 font-bold">{fmt(iva)}</span>
                            </div>
                            <div className="pt-1 border-t border-dashed border-gray-200 flex justify-between items-end">
                                <span className="text-[10px] font-bold text-gray-900 uppercase tracking-tighter">Total</span>
                                <span className="text-lg font-black text-orchid-700 leading-none">{fmt(total)}</span>
                            </div>
                        </div>

                        {/* Método de pago */}
                        <div className="grid grid-cols-3 gap-1 mb-2">
                            {[
                                { v: 'efectivo', icon: Banknote, label: 'Efectivo' },
                                { v: 'tarjeta', icon: CreditCard, label: 'Tarjeta' },
                                { v: 'transferencia', icon: ArrowRightLeft, label: 'Transf.' }
                            ].map(({ v, icon: Icon, label }) => (
                                <button key={v} onClick={() => setMetodoPago(v)}
                                    className={`flex flex-col items-center justify-center gap-1 py-1 rounded-lg text-[8px] font-bold uppercase tracking-wider border transition-all ${metodoPago === v ? 'bg-orchid-700 text-white border-orchid-700 shadow-sm' : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-orchid-200'}`}>
                                    <Icon size={10} />{label}
                                </button>
                            ))}
                        </div>

                        {(metodoPago === 'efectivo' || isApartado) && (
                            <div className="mb-3 bg-emerald-50 p-3 rounded-xl border border-emerald-300 shadow-sm">
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="text-[10px] font-black text-emerald-900 uppercase tracking-wider">{isApartado ? 'Anticipo' : 'Recibido'}</label>
                                    {!isApartado && cambio > 0.01 && <span className="text-[10px] font-black text-emerald-800 tracking-tighter">CAMBIO: {fmt(cambio)}</span>}
                                </div>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-900 font-black text-base">$</span>
                                    <input type="number" min="0" step="0.01" value={montoPagado} 
                                        onChange={e => setMontoPagado(e.target.value < 0 ? 0 : e.target.value)}
                                        onFocus={e => e.target.select()}
                                        className="w-full bg-white border-2 border-emerald-400 rounded-lg pl-8 pr-3 py-2 text-lg font-black text-emerald-950 placeholder:text-emerald-700/65 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 focus:outline-none transition-all" 
                                        placeholder={isApartado ? 'Monto anticipo' : total.toFixed(2)} />
                                </div>
                            </div>
                        )}

                        {isApartado && (
                            <div className="mb-2 bg-amber-50/50 p-1.5 rounded-lg border border-amber-100">
                                <label className="text-[8px] font-bold text-amber-700 uppercase tracking-wider mb-1 block text-center">Fecha Límite (Opcional)</label>
                                <input type="date" value={fechaLimite} 
                                    onChange={e => setFechaLimite(e.target.value)}
                                    className="w-full bg-white border border-amber-200 rounded-md px-2 py-0.5 text-[10px] font-bold text-amber-700 focus:outline-none" />
                            </div>
                        )}

                        <button onClick={procesarVenta} disabled={loading} id="btn-procesar-venta"
                            className={`w-full py-2 rounded-lg flex items-center justify-center gap-2 font-bold text-white shadow-md transition-all active:scale-[0.98] ${loading ? 'bg-gray-400 cursor-not-allowed' : (isApartado ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-100' : 'bg-jade-600 hover:bg-jade-700 shadow-jade-100')}`}>
                            {loading ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle size={14} />}
                            <span className="text-sm uppercase tracking-wider">{isApartado ? 'Crear Apartado' : `Cobrar ${fmt(total)}`}</span>
                        </button>
                    </div>
                )}
            </div>
            <StripePaymentModal 
                isOpen={showStripeModal} 
                amount={isApartado ? (parseFloat(montoPagado) || 0) : total} 
                onSuccess={(id) => {
                    setStripeTransactionId(id);
                    setShowStripeModal(false);
                    setTimeout(() => {
                        const btn = document.getElementById('btn-procesar-venta');
                        if (btn) btn.click();
                    }, 100);
                }}
                onCancel={() => setShowStripeModal(false)}
            />
            {showScanner && (
                <CodeScanner
                    title="Escanear producto"
                    onClose={() => setShowScanner(false)}
                    onDetected={agregarPorCodigo}
                />
            )}
        </div>
    )
}
