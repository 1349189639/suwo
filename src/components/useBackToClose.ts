import { useEffect, useRef } from 'react'
import { addBackHandler, ensureGuard } from '../data/backnav'

/**
 * 浮层打开时：返回手势 / 返回键 = 关闭浮层，而不是退出 App。
 * 具体的历史守卫由 data/backnav 统一管理。
 */
export function useBackToClose(onClose: () => void, active = true) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!active) return
    ensureGuard()
    return addBackHandler('overlay', () => {
      closeRef.current()
      return true
    })
  }, [active])
}
