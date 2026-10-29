/* 塑我 Service Worker v2（2026-10-29）
 * 目标：APK 壳加载线上托管页，弱网/断网时仍能打开最近一次页面；HTML 永远优先拿最新，保证更新生效。
 * 策略：
 *  - HTML / 导航请求 / version.json：network-first，断网回退缓存；
 *  - 同源静态资源（js / css / svg / 图片 / 字体）：cache-first + 后台更新（stale-while-revalidate）；
 *  - 跨源请求（CloudBase 数据库 / 认证 / CDN）：直接放行，不做缓存。
 */

const CACHE = 'suwo-v2'
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

function isHtmlOrVersion(req, url) {
  if (req.mode === 'navigate') return true
  if (url.pathname === '/version.json') return true
  return url.pathname.endsWith('.html')
}

function isStaticAsset(url) {
  return /\.(js|css|svg|png|jpg|jpeg|webp|gif|ico|woff2?|ttf|otf)$/.test(url.pathname)
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  // 只缓存同源资源；CloudBase API、认证、第三方 CDN 一律不碰
  if (url.origin !== self.location.origin) return

  // HTML / 版本清单：network-first，保证用户总是拿到最新页面
  if (isHtmlOrVersion(req, url)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
          }
          return res
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html'))),
    )
    return
  }

  // 静态资源：cache-first，后台刷新
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone()
              caches.open(CACHE).then((c) => c.put(req, copy))
            }
            return res
          })
          .catch(() => cached)
        return cached || network
      }),
    )
  }
})
