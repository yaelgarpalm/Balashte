import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useUI } from '../../context/UIContext'
import { productosAPI, apartadosAPI, comprasAPI, cajaAPI } from '../../services/api'
import { LayoutDashboard, ShoppingCart, Package, Receipt, Users, Truck, UserCog, BarChart3, LogOut, Flower2, Bell, AlertTriangle, TrendingUp, TrendingDown, X, Gift, Wallet, ClipboardList, Settings, Database, CheckCircle2 } from 'lucide-react'

import Modal from '../common/Modal'
import toast from 'react-hot-toast'

const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin'] },
    { to: '/caja', icon: Wallet, label: 'Control de Caja', roles: ['admin', 'cajero', 'vendedor'] },
    { to: '/gastos', icon: TrendingDown, label: 'Gastos', roles: ['admin'] },
    { to: '/pos', icon: ShoppingCart, label: 'Punto de Venta', roles: ['admin', 'cajero', 'vendedor'] },
    { to: '/ventas', icon: Receipt, label: 'Ventas', roles: ['admin', 'cajero', 'vendedor'] },
    { to: '/apartados', icon: ClipboardList, label: 'Apartados', roles: ['admin', 'cajero', 'vendedor'] },
    { to: '/productos', icon: Package, label: 'Inventario', roles: ['admin', 'bodeguero'] },
    { to: '/inventario/historial', icon: ClipboardList, label: 'Kardex', roles: ['admin'] },
    { to: '/categorias', icon: Flower2, label: 'Categorías', roles: ['admin', 'bodeguero'] },
    { to: '/clientes', icon: Users, label: 'Clientes', roles: ['admin', 'vendedor'] },
    { to: '/proveedores', icon: Truck, label: 'Proveedores', roles: ['admin', 'bodeguero'] },
    { to: '/compras', icon: ShoppingCart, label: 'Compras', roles: ['admin', 'bodeguero'] },
    { to: '/reportes', icon: BarChart3, label: 'Reportes', roles: ['admin'] },
    { to: '/usuarios', icon: UserCog, label: 'Usuarios', roles: ['admin'] },
    { to: '/beneficios', icon: Gift, label: 'Beneficios', roles: ['admin'] },
    { to: '/configuracion', icon: Settings, label: 'Configuración', roles: ['admin'] },
    { to: '/respaldos', icon: Database, label: 'Respaldos', roles: ['admin'] },
]


export default function Layout() {
    const { usuario, logout } = useAuth()
    const { titulo, subtitulo, buscar, setBuscar } = useUI()
    const navigate = useNavigate()
    const location = useLocation()
    const [alertas, setAlertas] = useState([])
    const [showNotifs, setShowNotifs] = useState(false)
    const [modal, setModal] = useState(null)
    const [selected, setSelected] = useState(null)
    const [ajuste, setAjuste] = useState({ tipo: 'entrada', cantidad: 0, motivo: '' })
    const [saving, setSaving] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [dismissedAlerts, setDismissedAlerts] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('orchid_dismissed_alerts') || '[]')
        } catch {
            return []
        }
    })

    const getAlertKey = (notif) => {
        if (!notif) return ''
        if (notif.tipo === 'stock') return `stock:${notif.id}`
        if (notif.tipo === 'apartado') return `apartado:${notif.id}:${notif.tipo_alerta || ''}`
        if (notif.tipo === 'compra') return `compra:${notif.id || notif.folio}`
        if (notif.tipo === 'caja') return `caja:${notif.id}:${notif.diferencia}`
        return `${notif.tipo}:${notif.id || notif.titulo || notif.mensaje}`
    }

    const visibleAlertas = alertas.filter(notif => !dismissedAlerts.includes(getAlertKey(notif)))

    const fetchAlertas = async () => {
        try {
            const requests = [
                productosAPI.bajoStock(),
                apartadosAPI.alertas(),
                comprasAPI.alertas()
            ]

            if (usuario?.rol === 'admin') requests.push(cajaAPI.alertas())

            const [stockRes, apartadosRes, comprasRes, cajaRes] = await Promise.all(requests)

            const stockAlerts = stockRes.data.productos.map(p => ({
                ...p,
                tipo: 'stock',
                titulo: p.nombre,
                mensaje: `Stock bajo: ${p.stock} ${p.unidad}`,
                sub: `Mínimo: ${p.stock_minimo}`,
                color: 'amber'
            }))

            const apartadosAlerts = apartadosRes.data.alertas.map(a => ({
                ...a,
                tipo: 'apartado',
                titulo: a.folio,
                sub: a.cliente
            }))

            const comprasAlerts = comprasRes.data.alertas.map(c => ({
                ...c,
                tipo: 'compra',
                titulo: `Deuda: ${c.folio}`,
                mensaje: `Vence: ${new Date(c.fecha_vencimiento).toLocaleDateString()}`,
                sub: `${c.proveedor} | Saldo: $${c.saldo_pendiente}`,
                color: c.dias_restantes < 0 ? 'rose' : 'amber'
            }))

            const cajaAlerts = (cajaRes?.data?.alertas || []).map(c => ({
                ...c,
                tipo: 'caja',
                titulo: `Corte con diferencia #${c.id}`,
                mensaje: `${Number(c.diferencia) < 0 ? 'Faltante' : 'Sobrante'}: $${Math.abs(Number(c.diferencia || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
                sub: `${c.usuario_nombre} | Turno ${new Date(c.fecha_apertura).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}`,
                color: Number(c.diferencia) < 0 ? 'rose' : 'amber'
            }))

            setAlertas([...cajaAlerts, ...stockAlerts, ...apartadosAlerts, ...comprasAlerts])
        } catch (error) {
            console.error('Error fetching alerts:', error)
        }
    }

    useEffect(() => {
        fetchAlertas()
        setSidebarOpen(false)
    }, [location.pathname])

    const handleLogout = () => { logout(); navigate('/login') }
    const closeModal = () => { setModal(null); setSelected(null) }

    const dismissAlert = (notif) => {
        const key = getAlertKey(notif)
        if (!key) return
        setDismissedAlerts(prev => {
            const next = prev.includes(key) ? prev : [...prev, key].slice(-200)
            localStorage.setItem('orchid_dismissed_alerts', JSON.stringify(next))
            return next
        })
    }

    const clearVisibleAlerts = () => {
        if (visibleAlertas.length === 0) return
        setDismissedAlerts(prev => {
            const next = [...new Set([...prev, ...visibleAlertas.map(getAlertKey).filter(Boolean)])].slice(-200)
            localStorage.setItem('orchid_dismissed_alerts', JSON.stringify(next))
            return next
        })
        setShowNotifs(false)
        toast.success('Notificaciones marcadas como atendidas')
    }

    const handleAjuste = async () => {
        if (!ajuste.cantidad || ajuste.cantidad <= 0) return toast.error('Cantidad inválida')
        setSaving(true)
        try {
            await productosAPI.ajustarStock(selected.id, ajuste)
            toast.success('Stock actualizado')
            closeModal()
            fetchAlertas()
        } catch (e) { toast.error(e.response?.data?.mensaje || 'Error') }
        finally { setSaving(false) }
    }

    const handleNotifClick = (notif) => {
        if (notif.tipo === 'stock') {
            setSelected(notif)
            setAjuste({ tipo: 'entrada', cantidad: 0, motivo: '' })
            setModal('stock')
        } else if (notif.tipo === 'compra') {
            navigate('/compras?tab=deudas')
        } else if (notif.tipo === 'caja') {
            navigate('/caja')
        } else {
            const targetTab = notif.tipo_alerta === 'entrega' ? 'completado' : 'activos'
            navigate(`/apartados?id=${notif.id}&tab=${targetTab}`)
        }
        setShowNotifs(false)
    }

    return (
        <div className="flex h-screen overflow-hidden bg-[#fdfaf7]">
            {/* Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <aside className={`
                fixed inset-y-0 left-0 z-50 w-64 bg-orchid-950 flex flex-col transition-transform duration-300 transform 
                lg:static lg:translate-x-0 
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="px-5 py-6 border-b border-orchid-800/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orchid-700 flex items-center justify-center shadow-lg">
                            <Flower2 size={20} className="text-white" />
                        </div>
                        <div>
                            <p className="font-display font-bold text-white text-base leading-tight">Balashte</p>
                            <p className="text-orchid-300 text-xs">Orquídeas y Anturios</p>
                        </div>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-orchid-300 hover:text-white">
                        <X size={20} />
                    </button>
                </div>
                <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                    {navItems.filter(item => item.roles.includes(usuario?.rol)).map(({ to, icon: Icon, label }) => (
                        <NavLink key={to} to={to} end={to === '/'}
                            className={({ isActive }) => `sidebar-item ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'}`}>
                            <Icon size={16} /><span>{label}</span>
                        </NavLink>
                    ))}
                </nav>
                <div className="p-3 border-t border-orchid-800/40">
                    <div className="flex items-center gap-3 px-2 py-2 mb-1">
                        <div className="w-8 h-8 rounded-full bg-orchid-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {usuario?.nombre?.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <p className="text-white text-xs font-medium truncate">{usuario?.nombre}</p>
                            <p className="text-orchid-300 text-xs capitalize">{usuario?.rol}</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="sidebar-item sidebar-item-inactive w-full mt-1 text-red-400 hover:text-red-300">
                        <LogOut size={15} /><span>Cerrar sesión</span>
                    </button>
                </div>
            </aside>
            <main className="flex-1 overflow-y-auto relative">
                <header className="sticky top-0 z-30 bg-[#fdfaf7]/95 backdrop-blur-md px-4 sm:px-10 py-4 sm:py-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-orchid-100/30">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2 rounded-xl bg-white border border-orchid-100 text-orchid-700 shadow-sm"
                        >
                            <LayoutDashboard size={20} />
                        </button>
                        <div className="flex flex-col">
                            {titulo && <h1 className="font-display text-2xl sm:text-3xl font-black text-[#1a1f36] leading-tight">{titulo}</h1>}
                            {subtitulo && <p className="text-gray-400 text-[10px] sm:text-sm font-medium">{subtitulo}</p>}
                        </div>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto justify-end relative">
                        {/* Global Search Bar - Styled like the image */}


                        {/* Notification Bell - Styled like the image */}
                        <button
                            onClick={() => setShowNotifs(!showNotifs)}
                            className={`w-11 h-11 rounded-2xl bg-white border border-orchid-50 flex items-center justify-center hover:bg-orchid-50 transition-all shadow-sm relative group ${showNotifs ? 'ring-2 ring-orchid-200 border-transparent' : ''}`}
                        >
                            <Bell size={20} className={`${alertas.length > 0 ? 'text-orchid-700' : 'text-orchid-300'} group-hover:scale-110 transition-transform`} />
                            {visibleAlertas.length > 0 && (
                                <span className="absolute top-0 right-0 w-4 h-4 bg-crimson-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm -translate-y-1/3 translate-x-1/3">
                                    {visibleAlertas.length}
                                </span>
                            )}
                        </button>

                        {showNotifs && (
                            <>
                                <div className="fixed inset-0 z-20" onClick={() => setShowNotifs(false)} />
                                <div className="absolute top-full right-0 mt-3 w-80 bg-white rounded-3xl shadow-2xl border border-orchid-100 z-30 overflow-hidden page-enter origin-top-right">
                                    <div className="p-4 border-b border-gray-50 bg-orchid-50/30 flex items-center justify-between">
                                        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Notificaciones</h3>
                                        <span className="text-[10px] bg-crimson-50 text-crimson-700 px-2 py-0.5 rounded-full font-bold">{visibleAlertas.length} alertas</span>
                                    </div>
                                    <div className="max-h-80 overflow-y-auto">
                                        {visibleAlertas.length === 0 ? (
                                            <div className="p-10 text-center">
                                                <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <Bell size={24} className="text-gray-300" />
                                                </div>
                                                <p className="text-sm text-gray-500 font-bold">No hay alertas</p>
                                                <p className="text-xs text-gray-400 mt-1">Todo está bajo control</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-gray-50">
                                                {visibleAlertas.map((notif, idx) => (
                                                    <div key={idx} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => handleNotifClick(notif)}>
                                                        <div className="flex items-start gap-3">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${notif.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                                                                    notif.color === 'rose' ? 'bg-rose-50 text-rose-600' :
                                                                        'bg-amber-50 text-amber-600'
                                                                }`}>
                                                                {notif.tipo === 'stock' ? <AlertTriangle size={18} /> :
                                                                    notif.color === 'emerald' ? <Package size={18} /> : <ClipboardList size={18} />}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-bold text-gray-800 truncate">{notif.titulo}</p>
                                                                <p className={`text-xs font-medium mt-0.5 ${notif.color === 'emerald' ? 'text-emerald-600' :
                                                                        notif.color === 'rose' ? 'text-rose-600' :
                                                                            'text-amber-600'
                                                                    }`}>{notif.mensaje}</p>
                                                                <p className="text-[10px] text-gray-400">{notif.sub}</p>
                                                            </div>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    dismissAlert(notif)
                                                                }}
                                                                className="ml-auto w-8 h-8 rounded-lg bg-white border border-gray-100 text-gray-300 hover:text-jade-600 hover:border-jade-100 hover:bg-jade-50 transition-colors flex items-center justify-center shrink-0"
                                                                title="Marcar como atendida"
                                                            >
                                                                <CheckCircle2 size={15} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {visibleAlertas.length > 0 && (
                                        <button onClick={clearVisibleAlerts} className="w-full p-3.5 text-xs font-bold text-orchid-700 hover:bg-orchid-50 border-t border-gray-50 transition-colors flex items-center justify-center gap-2">
                                            <CheckCircle2 size={14} />
                                            Marcar todas como atendidas
                                        </button>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Date Display - Styled like the image */}
                        <div className="hidden sm:flex flex-col items-start leading-tight min-w-[100px]">
                            <p className="text-[10px] font-black text-orchid-400 uppercase tracking-widest">{new Date().toLocaleDateString('es-MX', { weekday: 'long' })}</p>
                            <p className="text-sm font-bold text-[#1a1f36]">{new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}</p>
                        </div>
                    </div>
                </header>
                <div className="p-4 sm:p-6 page-enter"><Outlet /></div>

                {/* Modal Stock (Quick Access) */}
                {modal === 'stock' && (
                    <Modal title={`Ajustar stock — ${selected?.nombre}`} onClose={closeModal}>
                        <div className="space-y-4">
                            <div className="bg-orchid-50 rounded-xl p-4 text-center">
                                <p className="text-xs text-gray-500 mb-1">Stock actual</p>
                                <p className="text-4xl font-bold text-orchid-700">{selected?.stock}</p>
                                <p className="text-xs text-gray-400 mt-1">Mínimo: {selected?.stock_minimo}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Tipo de movimiento</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[{ v: 'entrada', label: 'Entrada', icon: TrendingUp }, { v: 'salida', label: 'Salida', icon: TrendingDown }, { v: 'ajuste', label: 'Ajuste', icon: Package }].map(({ v, label, icon: Icon }) => (
                                        <button key={v} onClick={() => setAjuste(p => ({ ...p, tipo: v }))}
                                            className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-medium transition-all ${ajuste.tipo === v ? 'bg-orchid-600 text-white border-orchid-600' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                            <Icon size={16} />{label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">{ajuste.tipo === 'ajuste' ? 'Nuevo stock' : 'Cantidad'}</label>
                                <input type="number" min="1" className="w-full bg-white border border-orchid-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orchid-400 focus:border-transparent transition-all" value={ajuste.cantidad || ''} onChange={e => setAjuste(p => ({ ...p, cantidad: parseInt(e.target.value) || 0 }))} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Motivo (opcional)</label>
                                <input className="w-full bg-white border border-orchid-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orchid-400 focus:border-transparent transition-all" value={ajuste.motivo} onChange={e => setAjuste(p => ({ ...p, motivo: e.target.value }))} placeholder="Compra a proveedor, merma, conteo..." />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={closeModal} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50 transition-colors">Cancelar</button>
                                <button onClick={handleAjuste} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-orchid-700 text-white text-sm font-bold hover:bg-orchid-800 transition-colors shadow-lg shadow-orchid-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                    {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                                    Aplicar
                                </button>
                            </div>
                        </div>
                    </Modal>
                )}
            </main>
        </div>
    )
}
