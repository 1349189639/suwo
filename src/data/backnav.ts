import { useStore } from './store'

type BackHandler = () => boolean

const handlers: { id: string; fn: BackHandler }[] = []
let installed = false

export function addBackHandler(id: string, fn: BackHandler): () => void {
  handlers.push({ id, fn })
  return () => {
    const i = handlers.findIndex((h) => h.id === id)
    if (i >= 0) handlers.splice(i, 1)
  }
}

/** 保证历史里恰好有一条「守卫」记录，返回手势才会被我们接住 */
export function ensureGuard(): void {
  try {
    const st = history.state as { __suwoGuard?: boolean } | null
    if (!st?.__suwoGuard) history.pushState({ __suwoGuard: true }, '')
  } catch {
    /* 个别 WebView 禁止 pushState，忽略 */
  }
}

export function installBackNav(): void {
  if (installed) return
  installed = true
  ensureGuard()
  window.addEventListener('popstate', () => {
    let consumed = false
    for (let i = handlers.length - 1; i >= 0; i--) {
      try {
        if (handlers[i].fn()) {
          consumed = true
          break
        }
      } catch {
        /* 单个处理器出错不影响其它 */
      }
    }
    if (consumed) {
      ensureGuard()
      return
    }
    useStore.getState().setToast('再滑动一次退出应用')
    // 不补守卫：下一次返回手势就交给系统，真正退出
  })
}
