import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useStore } from './store'

type BackHandler = () => boolean

const handlers: { id: string; fn: BackHandler }[] = []
let installed = false
let lastPromptAt = 0
let exitArmed = false
let lastHandleAt = 0

declare global {
  interface Window {
    __suwoBack?: () => void
  }
}

export function addBackHandler(id: string, fn: BackHandler): () => void {
  handlers.push({ id, fn })
  return () => {
    const i = handlers.findIndex((h) => h.id === id)
    if (i >= 0) handlers.splice(i, 1)
  }
}

/** 兼容旧调用（现在不需要历史守卫了，保留空实现避免改动面过大） */
export function ensureGuard(): void {
  /* 不再使用 history 守卫 */
}

function handleBack(): void {
  // 原生回调与插件事件可能同时到达，250ms 内只处理一次
  const now0 = Date.now()
  if (now0 - lastHandleAt < 250) return
  lastHandleAt = now0
  // 从后往前问：后注册的（更内层）优先
  for (let i = handlers.length - 1; i >= 0; i--) {
    try {
      if (handlers[i].fn()) return
    } catch {
      /* 单个处理器出错不影响其它 */
    }
  }

  // 没人认领 = 在首页且没有浮层
  const now = Date.now()
  if (exitArmed && now - lastPromptAt < 2000) {
    void CapApp.exitApp()
    return
  }
  exitArmed = true
  lastPromptAt = now
  useStore.getState().setToast('再滑动一次退出应用')
  window.setTimeout(() => {
    if (Date.now() - lastPromptAt >= 2000) exitArmed = false
  }, 2100)
}

export function installBackNav(): void {
  if (installed) return
  installed = true

  if (!Capacitor.isNativePlatform()) {
    // 网页版：用浏览器返回键兜底
    window.addEventListener('popstate', () => {
      for (let i = handlers.length - 1; i >= 0; i--) {
        try {
          if (handlers[i].fn()) return
        } catch {
          /* ignore */
        }
      }
    })
    return
  }

  // 主通道：原生 MainActivity 通过 evaluateJavascript 调 window.__suwoBack
  window.__suwoBack = handleBack
  // 备用通道：@capacitor/app 的 backButton 事件（两者有 250ms 去重）
  void CapApp.addListener('backButton', () => handleBack())
}
