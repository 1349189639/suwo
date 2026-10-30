import { useEffect, useRef } from 'react'
import { addBackHandler } from '../data/backnav'

/** 浮层打开时：返回手势 = 关闭浮层，而不是退出 App */
export function useBackToClose(onClose: () => void, active = true) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!active) return
    return addBackHandler('overlay', () => {
      closeRef.current()
      return true
    })
  }, [active])
}
