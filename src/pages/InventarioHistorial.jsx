import { useState, useEffect } from 'react';
import { inventarioAPI } from '../services/api';
import { useUI } from '../context/UIContext';
import toast from 'react-hot-toast';
import { 
  Search, Filter, AlertTriangle, ArrowUpRight, ArrowDownLeft, 
  RefreshCw, User, Calendar, Box, Clock, FileText, ChevronLeft, ChevronRight,
  ClipboardList, Activity, ArrowRight
} from 'lucide-react';

export default function InventarioHistorial() {
    const { setTitulo, setSubtitulo } = useUI();
    const [movimientos, setMovimientos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [filtros, setFiltros] = useState({
        buscar: '',
        tipo: '',
        sospechoso: 'false',
        page: 1,
        limit: 20
    });

    useEffect(() => {
        setTitulo('Historial de Inventario');
        setSubtitulo('Trazabilidad y Auditoría (Kardex)');
        fetchMovimientos();
    }, [filtros.page, filtros.tipo, filtros.sospechoso]);

    const fetchMovimientos = async () => {
        try {
            setLoading(true);
            const { data } = await inventarioAPI.getMovimientosHistorial(filtros);
            if (data.ok) {
                setMovimientos(data.movimientos);
                setTotal(data.total);
            }
        } catch (error) {
            toast.error('Error al cargar movimientos');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setFiltros({ ...filtros, page: 1 });
        fetchMovimientos();
    };

    const getTipoBadge = (tipo) => {
        const types = {
            entrada: { color: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: <ArrowUpRight size={14} />, label: 'Entrada' },
            salida: { color: 'bg-rose-50 text-rose-600 border-rose-100', icon: <ArrowDownLeft size={14} />, label: 'Salida' },
            ajuste: { color: 'bg-amber-50 text-amber-600 border-amber-100', icon: <RefreshCw size={14} />, label: 'Ajuste' },
            venta: { color: 'bg-blue-50 text-blue-600 border-blue-100', icon: <FileText size={14} />, label: 'Venta' },
            devolucion: { color: 'bg-purple-50 text-purple-600 border-purple-100', icon: <RefreshCw size={14} />, label: 'Devolución' },
            apartado: { color: 'bg-indigo-50 text-indigo-600 border-indigo-100', icon: <ClipboardList size={14} />, label: 'Apartado' },
        };
        const style = types[tipo] || { color: 'bg-gray-50 text-gray-600 border-gray-100', icon: <Box size={14} />, label: tipo };
        
        return (
            <span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold flex items-center gap-1.5 w-fit uppercase tracking-wider ${style.color}`}>
                {style.icon}
                {style.label}
            </span>
        );
    };

    const formatFecha = (fechaStr) => {
        const d = new Date(fechaStr);
        return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const formatHora = (fechaStr) => {
        const d = new Date(fechaStr);
        return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 pb-10">
            {/* Stats Summary - More elegant */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-orchid-100 shadow-sm flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-orchid-50 flex items-center justify-center text-orchid-600 shadow-inner">
                        <Activity size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] text-orchid-400 font-black uppercase tracking-[0.2em]">Movimientos Totales</p>
                        <p className="text-3xl font-black text-orchid-950">{total}</p>
                    </div>
                </div>
                
                <div className="bg-white p-6 rounded-3xl border border-orchid-100 shadow-sm flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-inner">
                        <AlertTriangle size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] text-amber-500 font-black uppercase tracking-[0.2em]">Audit Alert</p>
                        <p className="text-sm font-bold text-gray-500 leading-tight">Monitoreo de auditoría activo</p>
                    </div>
                </div>
            </div>

            {/* Filters Bar - Refined */}
            <div className="bg-white/80 backdrop-blur-md p-2 rounded-[32px] border border-orchid-100 shadow-xl shadow-orchid-100/20">
                <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2">
                    <div className="flex-1 min-w-[300px] relative">
                        <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-orchid-300" />
                        <input
                            type="text"
                            placeholder="Buscar por producto, código o motivo..."
                            className="w-full bg-transparent border-none rounded-3xl py-4 pl-14 pr-6 text-orchid-950 placeholder:text-orchid-300 focus:outline-none focus:ring-0 transition-all text-sm font-medium"
                            value={filtros.buscar}
                            onChange={(e) => setFiltros({ ...filtros, buscar: e.target.value })}
                        />
                    </div>

                    <div className="h-10 w-px bg-orchid-100 mx-2 hidden lg:block" />

                    <select
                        className="bg-orchid-50/50 border border-orchid-100 rounded-2xl py-3 px-5 text-orchid-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orchid-200"
                        value={filtros.tipo}
                        onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value, page: 1 })}
                    >
                        <option value="">Todos los tipos</option>
                        <option value="entrada">Entradas</option>
                        <option value="salida">Salidas</option>
                        <option value="ajuste">Ajustes Manuales</option>
                        <option value="venta">Ventas</option>
                        <option value="apartado">Apartados</option>
                        <option value="devolucion">Devoluciones</option>
                    </select>

                    <label className="flex items-center gap-3 cursor-pointer group bg-orchid-50/50 border border-orchid-100 rounded-2xl px-5 py-3 transition-all hover:bg-orchid-100/50">
                        <input
                            type="checkbox"
                            className="w-5 h-5 rounded-lg border-orchid-200 bg-white text-orchid-600 focus:ring-orchid-300 transition-all"
                            checked={filtros.sospechoso === 'true'}
                            onChange={(e) => setFiltros({ ...filtros, sospechoso: e.target.checked ? 'true' : 'false', page: 1 })}
                        />
                        <span className={`text-[11px] font-black uppercase tracking-widest transition-colors ${filtros.sospechoso === 'true' ? 'text-amber-600' : 'text-orchid-400'}`}>
                            Sospechosos
                        </span>
                    </label>

                    <button 
                        type="submit"
                        className="bg-orchid-800 hover:bg-orchid-900 text-white px-8 py-3.5 rounded-2xl font-bold transition-all shadow-lg shadow-orchid-200 active:scale-95 ml-auto"
                    >
                        Filtrar
                    </button>
                </form>
            </div>

            {/* Table Container - Clean and High Contrast */}
            <div className="bg-white rounded-[40px] border border-orchid-100 shadow-2xl shadow-orchid-200/20 overflow-hidden border-t-4 border-t-orchid-600">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-orchid-50/50 border-b border-orchid-100">
                                <th className="px-8 py-6 text-[10px] font-black text-orchid-400 uppercase tracking-[0.2em]">Fecha / Hora</th>
                                <th className="px-8 py-6 text-[10px] font-black text-orchid-400 uppercase tracking-[0.2em]">Producto</th>
                                <th className="px-8 py-6 text-[10px] font-black text-orchid-400 uppercase tracking-[0.2em]">Tipo Movimiento</th>
                                <th className="px-8 py-6 text-[10px] font-black text-orchid-400 uppercase tracking-[0.2em] text-center">Variación</th>
                                <th className="px-8 py-6 text-[10px] font-black text-orchid-400 uppercase tracking-[0.2em] text-center">Stock Flow</th>
                                <th className="px-8 py-6 text-[10px] font-black text-orchid-400 uppercase tracking-[0.2em]">Motivo / Referencia</th>
                                <th className="px-8 py-6 text-[10px] font-black text-orchid-400 uppercase tracking-[0.2em]">Responsable</th>
                                <th className="px-8 py-6 text-[10px] font-black text-orchid-400 uppercase tracking-[0.2em]">Auditoría</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-orchid-50">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="8" className="px-8 py-6"><div className="h-10 bg-orchid-50 rounded-xl w-full"></div></td>
                                    </tr>
                                ))
                            ) : movimientos.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-20 h-20 bg-orchid-50 rounded-full flex items-center justify-center text-orchid-200">
                                                <Search size={40} />
                                            </div>
                                            <p className="text-orchid-400 font-bold text-lg">No se encontraron movimientos</p>
                                            <button onClick={() => setFiltros({buscar:'', tipo:'', sospechoso:'false', page:1, limit:20})} className="text-orchid-600 font-bold text-sm underline">Limpiar filtros</button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                movimientos.map((m) => (
                                    <tr key={m.id} className="hover:bg-orchid-50/30 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-orchid-950 text-sm font-bold flex items-center gap-2">
                                                    <Calendar className="text-orchid-300" size={14} />
                                                    {formatFecha(m.created_at)}
                                                </span>
                                                <span className="text-orchid-400 text-xs font-medium flex items-center gap-2 ml-1">
                                                    <Clock size={12} />
                                                    {formatHora(m.created_at)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-orchid-950 text-sm font-black group-hover:text-orchid-700 transition-colors">{m.producto}</span>
                                                <span className="text-orchid-300 text-[10px] font-black uppercase tracking-widest mt-0.5">{m.producto_codigo}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            {getTipoBadge(m.tipo)}
                                        </td>
                                        <td className={`px-8 py-5 text-center`}>
                                            <span className={`px-3 py-1.5 rounded-xl font-black text-sm ${m.tipo === 'entrada' || m.tipo === 'devolucion' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                {m.tipo === 'entrada' || m.tipo === 'devolucion' ? '+' : '-'}{m.cantidad}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center justify-center gap-3">
                                                <span className="text-orchid-300 text-xs font-bold">{m.stock_anterior}</span>
                                                <ArrowRight size={14} className="text-orchid-200" />
                                                <span className="text-orchid-950 text-sm font-black">{m.stock_nuevo}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-start gap-2 max-w-[250px]">
                                                <FileText size={16} className="text-orchid-200 mt-0.5 flex-shrink-0" />
                                                <p className="text-orchid-800 text-sm font-medium leading-snug line-clamp-2" title={m.motivo}>
                                                    {m.motivo}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-2xl bg-orchid-100 flex items-center justify-center text-xs font-black text-orchid-700 shadow-sm border border-white">
                                                    {(m.usuario || 'U').substring(0, 2).toUpperCase()}
                                                </div>
                                                <span className="text-orchid-900 text-sm font-bold">{m.usuario || 'Sistema'}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            {m.sospechoso ? (
                                                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm animate-pulse">
                                                    <AlertTriangle size={14} />
                                                    Sospechoso
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-[10px] uppercase tracking-widest bg-emerald-50/50 px-3 py-1.5 rounded-xl border border-emerald-100">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                    Validado
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination - More stylized */}
                {!loading && movimientos.length > 0 && (
                    <div className="px-8 py-6 bg-orchid-50/30 border-t border-orchid-100 flex items-center justify-between">
                        <p className="text-orchid-400 text-xs font-bold uppercase tracking-widest">
                            Mostrando <span className="text-orchid-950">{movimientos.length}</span> de <span className="text-orchid-950">{total}</span> registros
                        </p>
                        <div className="flex gap-3">
                            <button
                                disabled={filtros.page === 1}
                                onClick={() => setFiltros({ ...filtros, page: filtros.page - 1 })}
                                className="flex items-center gap-2 px-6 py-2.5 bg-white border border-orchid-100 rounded-2xl text-orchid-700 text-sm font-bold hover:bg-orchid-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                <ChevronLeft size={18} />
                                Anterior
                            </button>
                            <button
                                disabled={filtros.page * filtros.limit >= total}
                                onClick={() => setFiltros({ ...filtros, page: filtros.page + 1 })}
                                className="flex items-center gap-2 px-6 py-2.5 bg-orchid-800 text-white rounded-2xl text-sm font-bold hover:bg-orchid-950 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-orchid-200"
                            >
                                Siguiente
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
