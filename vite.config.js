import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Set to your repo name for GitHub Pages. Change '/ambria-feedback/' if you name the repo differently.
// For local dev this has no effect.
export default defineConfig({
  plugins: [react()],
  base: '/ambria-feedback/',
})
