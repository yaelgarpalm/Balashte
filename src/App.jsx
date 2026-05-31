import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { UIProvider } from './context/UIContext'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import POS from './pages/POS'
import Productos from './pages/Productos'
import Ventas from './pages/Ventas'
import Clientes from './pages/Clientes'
import Proveedores from './pages/Proveedores'
import Usuarios from './pages/Usuarios'
import Reportes from './pages/Reportes'
import Categorias from './pages/Categorias'
import Beneficios from './pages/Beneficios'
import Caja from './pages/Caja'
import Gastos from './pages/Gastos'
import Apartados from './pages/Apartados'
import InventarioHistorial from './pages/InventarioHistorial'
import Configuracion from './pages/Configuracion'
import Compras from './pages/Compras'
import Respaldos from './pages/Respaldos'
import { useEffect, useRef } from 'react'



function PrivateRoute({ children }) {
    const { usuario, cargando } = useAuth()
    if (cargando) return (
        <div className="min-h-screen flex items-center justify-center bg-orchid-950">
            <div className="text-center">
                <div className="text-6xl mb-4 animate-bounce">🌸</div>
                <p className="text-orchid-200 font-display text-lg">Cargando Balashte...</p>
            </div>
        </div>
    )
    return usuario ? children : <Navigate to="/login" />
}

function RoleRoute({ roles, children }) {
    const { usuario } = useAuth()
    const shown = useRef(false)

    useEffect(() => {
        if (usuario && !roles.includes(usuario.rol) && !shown.current) {
            shown.current = true
            toast.error('No tienes permisos para acceder a esta sección')
        }
    }, [usuario, roles])

    if (!usuario) return <Navigate to="/login" />
    if (!roles.includes(usuario.rol)) return <Navigate to="/" replace />
    return children
}

function HomeRoute() {
    const { usuario } = useAuth()

    if (!usuario) return <Navigate to="/login" />
    if (usuario.rol === 'admin') return <Dashboard />
    if (['cajero', 'vendedor'].includes(usuario.rol)) return <Navigate to="/pos" replace />
    if (usuario.rol === 'bodeguero') return <Navigate to="/productos" replace />
    return <Navigate to="/login" replace />
}

function AppRoutes() {
    const { usuario } = useAuth()
    return (
        <Routes>
            <Route path="/login" element={usuario ? <Navigate to="/" /> : <Login />} />
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
                <Route index element={<HomeRoute />} />
                <Route path="dashboard" element={<RoleRoute roles={['admin']}><Dashboard /></RoleRoute>} />

                <Route path="pos" element={<RoleRoute roles={['admin', 'cajero', 'vendedor']}><POS /></RoleRoute>} />

                <Route path="productos" element={<RoleRoute roles={['admin', 'bodeguero']}><Productos /></RoleRoute>} />
                <Route path="categorias" element={<RoleRoute roles={['admin', 'bodeguero']}><Categorias /></RoleRoute>} />
                <Route path="ventas" element={<RoleRoute roles={['admin', 'cajero', 'vendedor']}><Ventas /></RoleRoute>} />
                <Route path="clientes" element={<RoleRoute roles={['admin', 'vendedor']}><Clientes /></RoleRoute>} />
                <Route path="proveedores" element={<RoleRoute roles={['admin', 'bodeguero']}><Proveedores /></RoleRoute>} />
                <Route path="usuarios" element={<RoleRoute roles={['admin']}><Usuarios /></RoleRoute>} />
                <Route path="reportes" element={<RoleRoute roles={['admin']}><Reportes /></RoleRoute>} />
                <Route path="beneficios" element={<RoleRoute roles={['admin']}><Beneficios /></RoleRoute>} />
                <Route path="caja" element={<RoleRoute roles={['admin', 'cajero', 'vendedor']}><Caja /></RoleRoute>} />
                <Route path="gastos" element={<RoleRoute roles={['admin']}><Gastos /></RoleRoute>} />
                <Route path="apartados" element={<RoleRoute roles={['admin', 'cajero', 'vendedor']}><Apartados /></RoleRoute>} />
                <Route path="inventario/historial" element={<RoleRoute roles={['admin']}><InventarioHistorial /></RoleRoute>} />
                <Route path="configuracion" element={<RoleRoute roles={['admin']}><Configuracion /></RoleRoute>} />
                <Route path="respaldos" element={<RoleRoute roles={['admin']}><Respaldos /></RoleRoute>} />
                <Route path="compras" element={<RoleRoute roles={['admin', 'bodeguero']}><Compras /></RoleRoute>} />
            </Route>


            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    )
}

export default function App() {
    return (
        <AuthProvider>
            <UIProvider>
                <AppRoutes />
                <Toaster position="top-right" toastOptions={{
                    style: { fontFamily: 'DM Sans', borderRadius: '12px', fontSize: '14px' },
                    success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
                    error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
                }} />
            </UIProvider>
        </AuthProvider>
    )
}
