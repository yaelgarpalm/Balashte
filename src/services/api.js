import axios from 'axios'

const apiBaseUrl = import.meta.env.VITE_API_URL || '/api'
const api = axios.create({ baseURL: apiBaseUrl, timeout: 15000 })

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('orchid_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem('orchid_token')
            localStorage.removeItem('orchid_user')
            window.location.href = '/login'
        }
        return Promise.reject(err)
    }
)

export default api

export const authAPI = {
    login: (data) => api.post('/auth/login', data),
    perfil: () => api.get('/auth/perfil'),
    cambiarPassword: (data) => api.put('/auth/cambiar-password', data),
}
export const productosAPI = {
    getAll: (params) => api.get('/productos', { params }),
    getOne: (id) => api.get(`/productos/${id}`),
    crear: (data) => api.post('/productos', data),
    subirImagen: (data) => api.post('/productos/imagen', data, { timeout: 60000 }),
    actualizar: (id, data) => api.put(`/productos/${id}`, data),
    ajustarStock: (id, data) => api.post(`/productos/${id}/ajuste-stock`, data),
    movimientos: (id) => api.get(`/productos/${id}/movimientos`),
    bajoStock: () => api.get('/productos/alertas/bajo-stock'),
    eliminar: (id) => api.delete(`/productos/${id}`),
}
export const ventasAPI = {
    getAll: (params) => api.get('/ventas', { params }),
    getOne: (id) => api.get(`/ventas/${id}`),
    crear: (data) => api.post('/ventas', data),
    cancelar: (id) => api.post(`/ventas/${id}/cancelar`),
}
export const clientesAPI = {
    getAll: (params) => api.get('/clientes', { params }),
    getOne: (id) => api.get(`/clientes/${id}`),
    crear: (data) => api.post('/clientes', data),
    actualizar: (id, data) => api.put(`/clientes/${id}`, data),
    eliminar: (id) => api.delete(`/clientes/${id}`),
}
export const proveedoresAPI = {
    getAll: (params) => api.get('/proveedores', { params }),
    getOne: (id) => api.get(`/proveedores/${id}`),
    crear: (data) => api.post('/proveedores', data),
    actualizar: (id, data) => api.put(`/proveedores/${id}`, data),
    eliminar: (id) => api.delete(`/proveedores/${id}`),
}
export const categoriasAPI = {
    getAll: () => api.get('/categorias'),
    crear: (data) => api.post('/categorias', data),
    actualizar: (id, data) => api.put(`/categorias/${id}`, data),
    eliminar: (id) => api.delete(`/categorias/${id}`),
}
export const usuariosAPI = {
    getAll: () => api.get('/usuarios'),
    crear: (data) => api.post('/usuarios', data),
    actualizar: (id, data) => api.put(`/usuarios/${id}`, data),
    eliminar: (id) => api.delete(`/usuarios/${id}`),
    roles: () => api.get('/roles'),
}
export const beneficiosAPI = {
    getAll: () => api.get('/beneficios'),
    crear: (data) => api.post('/beneficios', data),
    actualizar: (id, data) => api.put(`/beneficios/${id}`, data),
    eliminar: (id) => api.delete(`/beneficios/${id}`),
    getAsignaciones: (type, id) => api.get(`/beneficios/asignaciones/${type}/${id}`),
    asignar: (data) => api.post('/beneficios/asignar', data),
    desasignar: (data) => api.post('/beneficios/desasignar', data),
}
export const reportesAPI = {
    dashboard: () => api.get('/dashboard'),
    ventas: (params) => api.get('/reportes/ventas', { params }),
    usuarios: (params) => api.get('/reportes/usuarios', { params }),
    clientes: (params) => api.get('/reportes/clientes', { params }),
}
export const cajaAPI = {
    getEstado: () => api.get('/caja/estado'),
    abrir: (data) => api.post('/caja/abrir', data),
    cerrar: (data) => api.post('/caja/cerrar', data),
    registrarMovimiento: (data) => api.post('/caja/movimiento', data),
    getHistorial: () => api.get('/caja/historial'),
    alertas: () => api.get('/caja/alertas'),
}
export const gastosAPI = {
    getAll: (params) => api.get('/gastos', { params }),
    crear: (data) => api.post('/gastos', data),
    eliminar: (id) => api.delete(`/gastos/${id}`),
    getCategorias: () => api.get('/gastos/categorias'),
    crearCategoria: (data) => api.post('/gastos/categorias', data),
}
export const apartadosAPI = {
    getAll: (params) => api.get('/apartados', { params }),
    getOne: (id) => api.get(`/apartados/${id}`),
    crear: (data) => api.post('/apartados', data),
    registrarPago: (id, data) => api.post(`/apartados/${id}/pago`, data),
    cancelar: (id) => api.post(`/apartados/${id}/cancelar`),
    entregar: (id) => api.post(`/apartados/${id}/entregar`),
    alertas: () => api.get('/apartados/alertas'),
    cuentasPorCobrar: () => api.get('/apartados/cuentas-por-cobrar'),
}
export const inventarioAPI = {
    getMovimientosHistorial: (params) => api.get('/movimientos', { params }),
}

export const configuracionAPI = {
    get: () => api.get('/configuracion'),
    update: (data) => api.post('/configuracion', data),
}

export const respaldosAPI = {
    estado: () => api.get('/respaldos/estado'),
    exportar: () => api.get('/respaldos/exportar', { responseType: 'blob' }),
    restaurar: (data) => api.post('/respaldos/restaurar', data, { timeout: 120000 }),
}

export const comprasAPI = {
    getAll: (params) => api.get('/compras', { params }),
    crear: (data) => api.post('/compras', data),
    getPagos: (id) => api.get(`/compras/${id}/pagos`),
    registrarAbono: (data) => api.post('/compras/abono', data),
    alertas: () => api.get('/compras/alertas'),
}

export const stripeAPI = {
    createCheckoutSession: (data) => api.post('/stripe/create-checkout-session', data),
}

export const facturapiAPI = {
    crearFactura: (data) => api.post('/facturapi/crear-factura', data),
}
