import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]

export default defineConfig({
  plugins: [react()],
  base: repositoryName ? `/${repositoryName}/` : '/',
  // Compile down for older phones (roughly iOS 13+ and Android Chrome 80+);
  // Vite's default only targets browsers from 2023 onward.
  build: {
    target: ['es2019', 'chrome80', 'safari13', 'firefox78'],
    cssTarget: ['chrome80', 'safari13', 'firefox78'],
  },
})

