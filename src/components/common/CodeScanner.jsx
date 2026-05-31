import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { Camera, Keyboard, ScanLine } from 'lucide-react'
import Modal from './Modal'

export default function CodeScanner({ title = 'Escanear código', onDetected, onClose }) {
    const videoRef = useRef(null)
    const controlsRef = useRef(null)
    const [manualCode, setManualCode] = useState('')
    const [error, setError] = useState('')
    const [cameraReady, setCameraReady] = useState(false)

    useEffect(() => {
        let mounted = true
        const reader = new BrowserMultiFormatReader()

        reader.decodeFromVideoDevice(undefined, videoRef.current, (result, err, controls) => {
            if (controls && !controlsRef.current) {
                controlsRef.current = controls
                if (mounted) setCameraReady(true)
            }

            if (result) {
                const code = result.getText()
                controlsRef.current?.stop()
                onDetected(code)
            } else if (err && err.name !== 'NotFoundException') {
                setError('No se pudo leer la cámara. Puedes capturar el código manualmente.')
            }
        }).catch(() => {
            if (mounted) setError('No se pudo iniciar la cámara. Revisa permisos o usa captura manual.')
        })

        return () => {
            mounted = false
            controlsRef.current?.stop()
        }
    }, [onDetected])

    const submitManual = (event) => {
        event.preventDefault()
        const code = manualCode.trim()
        if (code) onDetected(code)
    }

    return (
        <Modal title={title} onClose={onClose} maxWidth="max-w-xl">
            <div className="space-y-4">
                <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-gray-950 aspect-video">
                    <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-56 h-28 rounded-2xl border-2 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.28)] flex items-center justify-center">
                            <ScanLine size={34} className="text-white/80" />
                        </div>
                    </div>
                    <div className="absolute left-3 top-3 badge-purple bg-white/90">
                        <Camera size={12} /> {cameraReady ? 'Cámara activa' : 'Iniciando cámara'}
                    </div>
                </div>

                {error && <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">{error}</div>}

                <form onSubmit={submitManual} className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                    <label className="label flex items-center gap-1"><Keyboard size={13} /> Captura manual</label>
                    <div className="flex gap-2">
                        <input
                            className="input"
                            autoFocus
                            value={manualCode}
                            onChange={(event) => setManualCode(event.target.value)}
                            placeholder="Escanea con lector USB o escribe el código"
                        />
                        <button className="btn-primary shrink-0" type="submit">Usar</button>
                    </div>
                </form>
            </div>
        </Modal>
    )
}
