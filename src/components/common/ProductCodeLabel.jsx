import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import JsBarcode from 'jsbarcode'
import { Download, Printer, QrCode, Barcode } from 'lucide-react'

export default function ProductCodeLabel({ code, name, price }) {
    const qrRef = useRef(null)
    const barcodeRef = useRef(null)
    const [mode, setMode] = useState('barcode')

    useEffect(() => {
        const cleanCode = String(code || '').trim()
        if (!cleanCode) return

        QRCode.toCanvas(qrRef.current, cleanCode, {
            width: 180,
            margin: 1,
            errorCorrectionLevel: 'M',
            color: { dark: '#1f2937', light: '#ffffff' },
        })

        try {
            JsBarcode(barcodeRef.current, cleanCode, {
                format: 'CODE128',
                width: 2,
                height: 72,
                displayValue: true,
                fontSize: 14,
                margin: 8,
                lineColor: '#1f2937',
            })
        } catch {
            JsBarcode(barcodeRef.current, cleanCode.replace(/[^\x20-\x7E]/g, ''), {
                format: 'CODE128',
                width: 2,
                height: 72,
                displayValue: true,
                fontSize: 14,
                margin: 8,
                lineColor: '#1f2937',
            })
        }
    }, [code])

    const download = () => {
        const filename = `${String(code || 'codigo').trim() || 'codigo'}-${mode}.png`
        if (mode === 'qr') {
            const link = document.createElement('a')
            link.href = qrRef.current.toDataURL('image/png')
            link.download = filename
            link.click()
            return
        }

        const svg = barcodeRef.current
        const data = new XMLSerializer().serializeToString(svg)
        const canvas = document.createElement('canvas')
        const image = new Image()
        const blob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        image.onload = () => {
            canvas.width = image.width || 420
            canvas.height = image.height || 140
            canvas.getContext('2d').drawImage(image, 0, 0)
            URL.revokeObjectURL(url)
            const link = document.createElement('a')
            link.href = canvas.toDataURL('image/png')
            link.download = filename
            link.click()
        }
        image.src = url
    }

    const print = () => {
        document.body.classList.add('code-label-printing')
        const cleanup = () => {
            document.body.classList.remove('code-label-printing')
            window.removeEventListener('afterprint', cleanup)
        }
        window.addEventListener('afterprint', cleanup)
        window.print()
        setTimeout(cleanup, 500)
    }

    if (!String(code || '').trim()) {
        return <div className="rounded-2xl border border-dashed border-gray-200 p-5 text-center text-sm text-gray-400">Agrega un código para generar QR o barras.</div>
    }

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setMode('barcode')} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${mode === 'barcode' ? 'border-orchid-700 bg-orchid-700 text-white' : 'border-gray-200 bg-white text-gray-500 hover:border-orchid-200'}`}>
                    <Barcode size={15} /> Barras
                </button>
                <button onClick={() => setMode('qr')} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${mode === 'qr' ? 'border-orchid-700 bg-orchid-700 text-white' : 'border-gray-200 bg-white text-gray-500 hover:border-orchid-200'}`}>
                    <QrCode size={15} /> QR
                </button>
            </div>

            <div className="code-print-area rounded-2xl border border-gray-100 bg-white p-4 text-center">
                <p className="truncate text-sm font-black text-gray-800">{name || 'Producto'}</p>
                {price !== undefined && <p className="mb-2 text-xs font-bold text-orchid-700">${Number(price || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>}
                <div className={mode === 'qr' ? 'flex justify-center' : 'hidden'}>
                    <canvas ref={qrRef} />
                </div>
                <div className={mode === 'barcode' ? 'flex justify-center overflow-hidden' : 'hidden'}>
                    <svg ref={barcodeRef} className="max-w-full" />
                </div>
            </div>

            <div className="flex gap-2 no-print">
                <button onClick={download} className="btn-secondary flex-1 justify-center text-xs"><Download size={14} /> Descargar</button>
                <button onClick={print} className="btn-primary flex-1 justify-center text-xs"><Printer size={14} /> Imprimir</button>
            </div>
        </div>
    )
}
