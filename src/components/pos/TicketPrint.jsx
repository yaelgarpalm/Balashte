import React, { forwardRef, useState, useEffect } from 'react';
import { configuracionAPI } from '../../services/api';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

const TicketPrint = forwardRef(({ ticket }, ref) => {
    const [config, setConfig] = useState(null);

    useEffect(() => {
        configuracionAPI.get().then(r => setConfig(r.data.config));
    }, []);

    if (!ticket) return null;

    const fecha = new Date(ticket.created_at).toLocaleString('es-MX', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: true
    });

    return (
        <div style={{ position: 'absolute', left: '-9999px', top: '0' }}>
            <div ref={ref} className="ticket-container" style={{
                width: '72mm',
                padding: '4mm',
                paddingBottom: '10mm',
                fontFamily: "'Courier New', Courier, monospace",
                fontSize: '12px',
                color: '#000',
                backgroundColor: '#fff',
                lineHeight: '1.4'
            }}>
                <style type="text/css" media="print">
                    {`
                    @page { size: auto; margin: 0mm; }
                    body { margin: 0; padding: 0; }
                    .ticket-container { display: block !important; width: 72mm !important; }
                    `}
                </style>

                {/* Encabezado Personalizado */}
                <div style={{ textAlign: 'center', marginBottom: '4mm' }}>
                    {config?.ticket_logo && (
                        <img
                            src={config.ticket_logo}
                            style={{ maxHeight: '20mm', maxWidth: '40mm', marginBottom: '2mm', filter: 'grayscale(100%) brightness(0.8)' }}
                            alt="logo"
                        />
                    )}
                    <div style={{ fontSize: '18px', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase' }}>
                        {config?.ticket_nombre_negocio || 'BALASHTE ORQUIDEAS Y ANTURIOS'}
                    </div>
                    {config?.ticket_direccion && <div style={{ fontSize: '10px', marginTop: '2px' }}>{config.ticket_direccion}</div>}

                    <div style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '4px', textDecoration: 'underline' }}>
                        {ticket.is_pago ? 'COMPROBANTE DE ABONO' : (ticket.is_entrega ? 'COMPROBANTE DE ENTREGA' : (ticket.is_apartado ? 'COMPROBANTE DE APARTADO' : 'TICKET DE VENTA'))}
                    </div>

                    <div style={{ fontSize: '10px', marginTop: '4px' }}>
                        {config?.ticket_rfc && <span>RFC: {config.ticket_rfc}</span>}
                        {config?.ticket_rfc && config?.ticket_telefono && <span> | </span>}
                        {config?.ticket_telefono && <span>Tel: {config.ticket_telefono}</span>}
                    </div>
                </div>

                <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }}></div>

                {/* Info Venta */}
                <div style={{ marginBottom: '3mm', fontSize: '11px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 'bold' }}>Folio:</span>
                        <span>{ticket.folio}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 'bold' }}>Fecha:</span>
                        <span>{fecha}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 'bold' }}>Cliente:</span>
                        <span style={{ maxWidth: '40mm', textAlign: 'right' }}>{ticket.cliente || 'Público General'}</span>
                    </div>
                    {ticket.fecha_limite && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#000' }}>
                            <span style={{ fontWeight: 'bold' }}>VENCE EL:</span>
                            <span>{new Date(ticket.fecha_limite).toLocaleDateString()}</span>
                        </div>
                    )}
                </div>

                <div style={{ borderTop: '1px solid #000', margin: '2mm 0' }}></div>

                {ticket.is_pago ? (
                    /* Vista de Abono */
                    <div style={{ padding: '2mm 0', fontSize: '12px' }}>
                        <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '4mm', fontSize: '14px' }}>
                            DETALLE DEL PAGO
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2mm' }}>
                            <span>SALDO ANTERIOR:</span>
                            <span>{fmt(ticket.saldo_anterior)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2mm', fontWeight: 'bold', fontSize: '14px' }}>
                            <span>MONTO ABONADO:</span>
                            <span>{fmt(ticket.monto_pago)}</span>
                        </div>
                        <div style={{ borderTop: '1px solid #000', paddingTop: '2mm', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '15px' }}>
                            <span>SALDO ACTUAL:</span>
                            <span>{fmt(ticket.saldo_actual)}</span>
                        </div>
                    </div>
                ) : (
                    /* Vista de Venta/Apartado Normal */
                    <>
                        {/* Encabezado Tabla */}
                        <div style={{ display: 'flex', gap: '3mm', fontSize: '10px', fontWeight: 'bold', paddingBottom: '1mm', borderBottom: '1px solid #000', marginBottom: '2mm' }}>
                            <div style={{ width: '12mm' }}>CANT</div>
                            <div style={{ flex: 1 }}>DESCRIPCIÓN</div>
                            <div style={{ width: '20mm', textAlign: 'right' }}>TOTAL</div>
                        </div>

                        {/* Items */}
                        <div style={{ marginBottom: '3mm' }}>
                            {ticket.items.map((item, idx) => (
                                <div key={idx} style={{ marginBottom: '2mm', fontSize: '11px' }}>
                                    <div style={{ display: 'flex', gap: '3mm', justifyContent: 'space-between' }}>
                                        <div style={{ width: '12mm' }}>{item.cantidad}</div>
                                        <div style={{ flex: 1, fontWeight: '500' }}>{item.nombre}</div>
                                        <div style={{ width: '20mm', textAlign: 'right' }}>{fmt(item.precio_unitario * item.cantidad * (1 - (item.descuento || 0) / 100))}</div>
                                    </div>
                                    <div style={{ marginLeft: '12mm', paddingLeft: '3mm', fontSize: '9px', color: '#444' }}>
                                        {fmt(item.precio_unitario)} c/u {item.descuento > 0 ? `(-${item.descuento}%)` : ''}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }}></div>

                        {/* Totales */}
                        <div style={{ fontSize: '11px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>TOTAL PRODUCTOS:</span>
                                <span>{fmt(ticket.total)}</span>
                            </div>

                            {ticket.is_apartado ? (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginTop: '1mm' }}>
                                        <span>ANTICIPO:</span>
                                        <span>{fmt(ticket.anticipo)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', borderTop: '1px solid #000', marginTop: '1mm', paddingTop: '1mm' }}>
                                        <span>SALDO PENDIENTE:</span>
                                        <span>{fmt(ticket.saldo)}</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>IVA (16%):</span>
                                        <span>{fmt(ticket.iva || 0)}</span>
                                    </div>
                                    {ticket.descuento_global > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                                            <span>DESCUENTO ({ticket.descuento_global}%):</span>
                                            <span>-{fmt((ticket.total / (1 - ticket.descuento_global / 100)) * (ticket.descuento_global / 100))}</span>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '15px', marginTop: '2mm', borderTop: '1px solid #000', paddingTop: '1mm' }}>
                                        <span>TOTAL A PAGAR:</span>
                                        <span>{fmt(ticket.total)}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </>
                )}

                {/* Pago */}
                <div style={{ marginTop: '3mm', fontSize: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>MÉTODO DE PAGO:</span>
                        <span style={{ textTransform: 'uppercase' }}>{ticket.metodoPago}</span>
                    </div>
                    {ticket.cambio > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '12px', marginTop: '1mm' }}>
                            <span>CAMBIO:</span>
                            <span>{fmt(ticket.cambio)}</span>
                        </div>
                    )}
                </div>

                {/* Pie de Ticket Personalizado */}
                <div style={{ textAlign: 'center', marginTop: '8mm', borderTop: '1px double #000', paddingTop: '4mm' }}>
                    <div style={{ fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '2mm' }}>
                        {config?.ticket_mensaje_piso || '¡GRACIAS POR SU COMPRA!'}
                    </div>

                    {config?.ticket_politicas && (
                        <div style={{ fontSize: '8px', color: '#000', marginTop: '4px', borderTop: '1px dashed #eee', paddingTop: '2mm', lineHeight: '1.2' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '1px' }}>POLÍTICAS Y DEVOLUCIONES:</div>
                            <div style={{ whiteSpace: 'pre-line' }}>{config.ticket_politicas}</div>
                        </div>
                    )}

                    {config?.ticket_garantia && (
                        <div style={{ fontSize: '8px', color: '#000', marginTop: '4px', borderTop: '1px dashed #eee', paddingTop: '2mm', lineHeight: '1.2' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '1px' }}>GARANTÍA:</div>
                            <div style={{ whiteSpace: 'pre-line' }}>{config.ticket_garantia}</div>
                        </div>
                    )}

                    <div style={{ fontSize: '8px', color: '#666', marginTop: '6mm', fontStyle: 'italic' }}>
                        Balashte - Sistema de Gestión
                    </div>
                </div>
            </div>
        </div>
    );
});

export default TicketPrint;

