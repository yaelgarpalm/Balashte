import { createContext, useContext, useState } from 'react'

const UIContext = createContext()

export const UIProvider = ({ children }) => {
    const [buscar, setBuscar] = useState('')
    const [titulo, setTitulo] = useState('')
    const [subtitulo, setSubtitulo] = useState('')

    return (
        <UIContext.Provider value={{ buscar, setBuscar, titulo, setTitulo, subtitulo, setSubtitulo }}>
            {children}
        </UIContext.Provider>
    )
}

export const useUI = () => useContext(UIContext)
