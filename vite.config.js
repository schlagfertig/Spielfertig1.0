import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const cap = process.env.CAPACITOR === '1'

export default defineConfig({
  plugins: [react()],
  // Store-Hülle lädt aus der App. Relative Pfade. Die Website bleibt bei "/".
  base: cap ? './' : '/',
  build: {
    outDir: 'dist',
  },
})
