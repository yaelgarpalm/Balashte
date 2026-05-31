import { useState, useEffect } from 'react'
import { beneficiosAPI } from '../../services/api'
import { Gift, Check, Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function BenefitAssigner({ type, id }) {
    const [allBenefits, setAllBenefits] = useState([])
    const [assigned, setAssigned] = useState([])
    const [loading, setLoading] = useState(true)

    const load = async () => {
        setLoading(true)
        try {
            const [all, curr] = await Promise.all([
                beneficiosAPI.getAll(),
                beneficiosAPI.getAsignaciones(type, id)
            ])
            // Filter by target type
            setAllBenefits(all.data.beneficios.filter(b => b.target_type === type && b.activo))
            setAssigned(curr.data.asignaciones)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    useEffect(() => { if (id) load() }, [id])

    const toggle = async (benefitId) => {
        const isAssigned = assigned.some(b => b.id === benefitId)
        try {
            if (isAssigned) {
                await beneficiosAPI.desasignar({ beneficio_id: benefitId, entidad_id: id, entidad_type: type })
                setAssigned(p => p.filter(b => b.id !== benefitId))
                toast.success('Beneficio removido')
            } else {
                await beneficiosAPI.asignar({ beneficio_id: benefitId, entidad_id: id, entidad_type: type })
                const benefit = allBenefits.find(b => b.id === benefitId)
                setAssigned(p => [...p, benefit])
                toast.success('Beneficio asignado')
            }
        } catch (e) { toast.error('Error al actualizar asignación') }
    }

    if (loading) return <div className="h-20 flex items-center justify-center"><div className="w-5 h-5 border-2 border-orchid-500 border-t-transparent rounded-full animate-spin" /></div>

    return (
        <div className="space-y-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-bold">Beneficios Disponibles</p>
            {allBenefits.length === 0 && <p className="text-xs text-gray-400 italic">No hay beneficios configurados para este perfil.</p>}
            <div className="grid grid-cols-1 gap-2">
                {allBenefits.map(b => {
                    const isAssigned = assigned.some(a => a.id === b.id)
                    return (
                        <button
                            key={b.id}
                            onClick={() => toggle(b.id)}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left ${isAssigned ? 'bg-orchid-50 border-orchid-200 shadow-sm ring-1 ring-orchid-200' : 'bg-white border-gray-100 hover:border-orchid-100'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isAssigned ? 'bg-orchid-500 text-white' : 'bg-gray-50 text-gray-400'}`}>
                                    <Gift size={14} />
                                </div>
                                <div>
                                    <p className={`text-sm font-bold ${isAssigned ? 'text-orchid-900' : 'text-gray-700'}`}>{b.nombre}</p>
                                    <p className="text-[10px] text-gray-400 leading-tight line-clamp-1">{b.descripcion}</p>
                                </div>
                            </div>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${isAssigned ? 'bg-orchid-500 border-orchid-500 text-white' : 'bg-gray-50 border-gray-200 text-transparent'}`}>
                                <Check size={10} />
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
