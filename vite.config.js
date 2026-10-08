import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // node_modules is a symlink to node_modules.nosync (keeps iCloud from evicting it)
  resolve: { preserveSymlinks: true },
})
