import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 4000,        // change this to your desired port
    strictPort: true,  // fail if port is taken
  },
})
