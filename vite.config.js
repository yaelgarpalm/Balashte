import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiTarget = process.env.VITE_API_TARGET || 'http://[::1]:4000'
const host = process.env.VITE_HOST || '::'

export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        host,
        proxy: {
            '/api': { target: apiTarget, changeOrigin: true },
            '/uploads': { target: apiTarget, changeOrigin: true }
        }
    },
    preview: {
        port: 3000,
        host
    }
})
