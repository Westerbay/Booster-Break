import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { paraglideVitePlugin } from '@inlang/paraglide-js'
import path from 'node:path'
import { readdir } from 'node:fs/promises'
import { z } from 'zod'

const missingDirectoryErrorSchema = z.object({ code: z.literal('ENOENT') })

const devLabNames = new Set(['foils', 'opening'])

const devLabsPlugin = (): Plugin => ({
  name: 'dev-labs',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      const [pathname, query] = request.url?.split('?', 2) ?? []
      const labMatch = pathname?.match(/\/dev\/([^/]+)\/?$/)
      const labName = labMatch?.[1]
      if (!labName || !devLabNames.has(labName)) {
        next()
        return
      }

      if (pathname?.endsWith('/')) {
        response.statusCode = 307
        response.setHeader('Location', `${pathname.slice(0, -1)}${query ? `?${query}` : ''}`)
        response.end()
        return
      }
      if (pathname?.endsWith(`/dev/${labName}`)) {
        request.url = `${pathname}.html${query ? `?${query}` : ''}`
      }
      next()
    })
  },
})

// Match nginx's JSON directory listing in local development, without writing files.
const radioDirectoryPlugin = (): Plugin => ({
  name: 'radio-directory',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use(async (request, response, next) => {
      const pathname = request.url?.split('?', 1)[0]
      if (pathname !== `${server.config.base}radio/`) return next()
      try {
        const entries = await readdir(path.join(server.config.publicDir, 'radio'), {
          withFileTypes: true,
        })
        const files = entries
          .filter((entry) => entry.isFile() && /\.mp3$/i.test(entry.name))
          .map((entry) => ({ name: entry.name, type: 'file' }))
        response.setHeader('Content-Type', 'application/json')
        response.setHeader('Cache-Control', 'no-store')
        response.end(JSON.stringify(files))
      } catch (error) {
        const missing = missingDirectoryErrorSchema.safeParse(error).success
        if (!missing) server.config.logger.error(`Unable to list radio directory: ${String(error)}`)
        response.statusCode = missing ? 200 : 500
        response.setHeader('Content-Type', 'application/json')
        response.end(JSON.stringify(missing ? [] : { message: 'Unable to list radio directory' }))
      }
    })
  },
})

const excludeDevModulesPlugin = (): Plugin => ({
  name: 'exclude-dev-modules',
  apply: 'build',
  generateBundle(_options, bundle) {
    for (const output of Object.values(bundle)) {
      if (
        output.type === 'chunk' &&
        Object.keys(output.modules).some((moduleId) => moduleId.includes('/src/dev/'))
      ) {
        this.error('Development-only modules were included in the production bundle')
      }
    }
  },
})

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
      strategy: ['localStorage', 'baseLocale'],
      emitTsDeclarations: true,
    }),
    react(),
    tailwindcss(),
    devLabsPlugin(),
    radioDirectoryPlugin(),
    excludeDevModulesPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    // Audio changes are discovered by polling and must not reload the player.
    watch: { ignored: ['**/public/radio/**'] },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3100',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
