import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [usuario, setUsuario] = useState(() => {
        const u = localStorage.getItem('orchid_user')
        return u ? JSON.parse(u) : null
    })
    const [cargando, setCargando] = useState(true)

    useEffect(() => {
        const token = localStorage.getItem('orchid_token')
        if (token) {
            authAPI.perfil().then(r => setUsuario(r.data.usuario)).catch(() => logout()).finally(() => setCargando(false))
        } else { setCargando(false) }
    }, [])

    const login = async (email, password) => {
        const { data } = await authAPI.login({ email, password })
        localStorage.setItem('orchid_token', data.token)
        localStorage.setItem('orchid_user', JSON.stringify(data.usuario))
        setUsuario(data.usuario)
        return data
    }

    const logout = () => {
        localStorage.removeItem('orchid_token')
        localStorage.removeItem('orchid_user')
        setUsuario(null)
    }

    const tienePermiso = (permiso) => usuario?.permisos?.includes(permiso) || false

    return (
        <AuthContext.Provider value={{ usuario, cargando, login, logout, tienePermiso }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)