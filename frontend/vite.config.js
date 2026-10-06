import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const destDir = path.resolve(__dirname, 'public')
if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })

const imagesToCopy = [
  {
    src: 'C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\ae578e38-97a5-450b-b471-45451c15337a\\heritage_drapery_banner_1790331769155.jpg',
    dest: 'heritage-drapery-banner.jpg'
  },
  {
    src: 'C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\ae578e38-97a5-450b-b471-45451c15337a\\fabric_swatch_card_1790331857654.jpg',
    dest: 'fabric-swatch-card.jpg'
  },
  {
    src: 'C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\ae578e38-97a5-450b-b471-45451c15337a\\sidebar_gold_embroidery_1790334800935.jpg',
    dest: 'sidebar-gold-embroidery.jpg'
  },
  {
    src: 'C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\ae578e38-97a5-450b-b471-45451c15337a\\couture_drapery_bleed_1790334841275.jpg',
    dest: 'couture-drapery-bleed.jpg'
  }
]

imagesToCopy.forEach(({ src, dest }) => {
  try {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(destDir, dest))
    }
  } catch (e) {
    // Ignore error
  }
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: false,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})
