import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Flower2, Eye, EyeOff, Lock, Mail } from 'lucide-react'

export default function Login() {
    const { login } = useAuth()
    const navigate = useNavigate()
    const [form, setForm] = useState({ email: 'admin@orchid.com', password: 'password' })
    const [showPwd, setShowPwd] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            await login(form.email, form.password)
            toast.success('Bienvenido al sistema')
            navigate('/')
        } catch (err) {
            toast.error(err.response?.data?.mensaje || 'Credenciales incorrectas')
        } finally { setLoading(false) }
    }

    return (
        <div className="min-h-screen bg-orchid-950 flex items-center justify-center">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-32 -left-32 w-96 h-96 bg-orchid-800/30 rounded-full blur-3xl" />
                <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-orchid-700/20 rounded-full blur-3xl" />
            </div>
            <div className="relative z-10 w-full max-w-sm mx-4">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                    <div className="text-center mb-8">
                        <div className="inline-flex w-16 h-16 rounded-2xl bg-orchid-500 items-center justify-center shadow-xl mb-4">
                            <Flower2 size={32} className="text-white" />
                        </div>
                        <h1 className="font-display text-3xl font-bold text-white mb-1">Balashte</h1>
                        <p className="text-orchid-300 text-sm">Orquídeas y Anturios</p>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-orchid-300 text-xs font-medium mb-1.5 uppercase tracking-wide">Correo</label>
                            <div className="relative">
                                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-orchid-400" />
                                <input type="email" required value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                                    className="w-full bg-white/10 border border-white/20 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-orchid-400 focus:outline-none focus:ring-2 focus:ring-orchid-400 transition-all"
                                    placeholder="admin@balashte.com" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-orchid-300 text-xs font-medium mb-1.5 uppercase tracking-wide">Contraseña</label>
                            <div className="relative">
                                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-orchid-400" />
                                <input type={showPwd ? 'text' : 'password'} required value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                                    className="w-full bg-white/10 border border-white/20 rounded-xl pl-9 pr-10 py-2.5 text-white text-sm placeholder-orchid-400 focus:outline-none focus:ring-2 focus:ring-orchid-400 transition-all"
                                    placeholder="••••••••" />
                                <button type="button" onClick={() => setShowPwd(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-orchid-400 hover:text-white">
                                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>
                        <button type="submit" disabled={loading}
                            className="w-full bg-orchid-500 hover:bg-orchid-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all shadow-lg hover:-translate-y-0.5 mt-2 flex items-center justify-center gap-2">
                            {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Iniciando...</> : 'Iniciar Sesión'}
                        </button>
                    </form>
                    <p className="text-center text-orchid-600 text-xs mt-6">Balashte v1.0</p>
                </div>
            </div>
        </div>
    )
}