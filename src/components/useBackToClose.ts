import { useEffect, useRef } from 'react'

/**
 * 让系统返回手势 / 返回键关闭浮层，而不是直接退出 App。
 * 做法：浮层打开时压入一条历史记录，返回时消费掉它。
 */
export function useBackToClose(onClose: () => void, active = true) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!active) return
    let pushed = false
    try {
      history.pushState({ __suwo: true }, '')
      pushed = true
    } catch {
      /* 某些 WebView 可能禁止 pushState，忽略即可 */
    }
    const onPop = () => closeRef.current()
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      if (pushed) {
        try {
          if ((history.state as { __suwo?: boolean } | null)?.__suwo) history.back()
        } catch {
          /* ignore */
        }
      }
    }
  }, [active])
}
