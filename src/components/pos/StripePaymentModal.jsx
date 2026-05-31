import { useState, useEffect } from 'react';
import { stripeAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { X, CreditCard, ShieldCheck, Loader2, ExternalLink } from 'lucide-react';

export default function StripePaymentModal({ isOpen, amount, onSuccess, onCancel, metadata = {} }) {
    const [isLoading, setIsLoading] = useState(false);

    const handleCheckout = async () => {
        setIsLoading(true);
        try {
            // Guardar estado actual para recuperarlo al volver (opcional, depende de cómo maneje el POS el retorno)
            // localStorage.setItem('orchid_pos_temp_sale', JSON.stringify({ amount, metadata }));

            const res = await stripeAPI.createCheckoutSession({ 
                amount,
                // Pasamos la URL actual como base para éxito/cancelación
                success_url: `${window.location.origin}${window.location.pathname}?stripe_success=true&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${window.location.origin}${window.location.pathname}?stripe_cancel=true`,
                metadata
            });

            if (res.data.url) {
                window.location.href = res.data.url;
            } else {
                throw new Error("No se recibió la URL de redirección");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error al iniciar el pago con Stripe");
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-orchid-50/30">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-orchid-700 flex items-center justify-center text-white shadow-md">
                            <CreditCard size={16} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-gray-800 leading-none">Pago Seguro</h2>
                            <p className="text-[9px] font-bold text-orchid-500 uppercase tracking-widest mt-1">Stripe Checkout</p>
                        </div>
                    </div>
                    <button onClick={onCancel} className="p-2 hover:bg-white rounded-xl transition-colors text-gray-400 hover:text-gray-600">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6">
                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 mb-6 text-center">
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Total a pagar</p>
                        <p className="text-3xl font-black text-gray-900">${Number(amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50/50 border border-blue-100">
                            <ShieldCheck size={18} className="text-blue-600 mt-0.5 shrink-0" />
                            <p className="text-[11px] text-blue-800 font-medium leading-tight">
                                Serás redirigido a una página segura de Stripe para completar tu pago de forma protegida.
                            </p>
                        </div>

                        <button
                            onClick={handleCheckout}
                            disabled={isLoading}
                            className="w-full bg-orchid-700 hover:bg-orchid-800 text-white font-black py-4 px-4 rounded-2xl shadow-lg shadow-orchid-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>
                                    <span>Pagar con Tarjeta</span>
                                    <ExternalLink size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={onCancel}
                            className="w-full py-3 px-4 rounded-xl text-gray-400 text-xs font-bold hover:text-gray-600 transition-all"
                            disabled={isLoading}
                        >
                            Volver al punto de venta
                        </button>
                    </div>
                </div>
                
                <div className="bg-gray-50/50 px-6 py-3 border-t border-gray-50 flex items-center justify-center gap-4">
                    <img src="https://checkout.stripe.com/img/v3/home/twitter.png" alt="Visa" className="h-4 grayscale opacity-50" />
                    <img src="https://checkout.stripe.com/img/v3/home/twitter.png" alt="Mastercard" className="h-4 grayscale opacity-50" />
                    <div className="w-px h-3 bg-gray-200"></div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Conexión Cifrada SSL</p>
                </div>
            </div>
        </div>
    );
}

