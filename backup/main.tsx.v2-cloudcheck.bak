import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { CloudCheckV2 } from './screens/CloudCheckV2.tsx'

const root = createRoot(document.getElementById('root')!)

// v2 云连接自检旁路：地址栏末尾加 #cloud-v2 直接进入，不影响原有 App 启动流程。
// 旧版 main.tsx 已备份到 backup/main.tsx.v1-20261029.bak。
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

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* 离线缓存失败不影响主流程 */
    })
  })
}
