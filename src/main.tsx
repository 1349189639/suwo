import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { CloudCheckV2 } from './screens/CloudCheckV2.tsx'

/**
 * 启动自检：比对「线上 index.html 引用的 JS」和「当前正在跑的 JS」。
 * 不一致说明 WebView / Service Worker 缓存了旧页面，强制带 ?v= 重新加载一次。
 * 这是「部署了但用户还是旧版」的根治办法。
 */
async function reloadIfStaleBundle(): Promise<boolean> {
  if (location.search.includes('v=')) return false
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 1500)
    const res = await fetch('./index.html?fresh=' + Date.now(), {
      cache: 'no-store',
      signal: ctrl.signal,
    })
    clearTimeout(timer)
    if (!res.ok) return false
    const html = await res.text()
    const m = html.match(/assets\/(index-[A-Za-z0-9_-]+\.js)/)
    if (!m) return false
    const remote = m[1]
    const cur = document.querySelector(
      'script[type="module"][src*="/assets/index-"]',
    ) as HTMLScriptElement | null
    const curName = cur?.src.split('/').pop() ?? ''
    if (curName && curName !== remote) {
      const u = new URL(location.href)
      u.searchParams.set('v', remote.replace(/\.js$/, ''))
      location.replace(u.toString())
      return true
    }
  } catch {
    /* 网络不通就用缓存版本，不阻塞启动 */
  }
  return false
}

const rootEl = document.getElementById('root')!

function render() {
  const root = createRoot(rootEl)
  if (window.location.hash === '#cloud-v2') {
    root.render(
      <StrictMode>
        <CloudCheckV2
          onClose={() => {
            window.location.hash = ''
            window.location.reload()
          }}
        />
      </StrictMode>,
    )
  } else {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  }
}

void (async () => {
  const reloading = await reloadIfStaleBundle()
  if (reloading) return
  render()
})()

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // 每次启动都检查一次 SW 更新，避免长期跑旧版本
        void reg.update()
      })
      .catch(() => {
        /* 离线缓存失败不影响主流程 */
      })
  })
}
