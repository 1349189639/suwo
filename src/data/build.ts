/** 当前页面到底是哪一版（取打包后 JS 文件名里的哈希） */
export function pageBuildId(): string {
  try {
    const s = document.querySelector(
      'script[type="module"][src*="/assets/index-"]',
    ) as HTMLScriptElement | null
    const name = s?.src.split('/').pop() ?? ''
    const m = name.match(/index-([A-Za-z0-9_-]+)\.js/)
    return m ? m[1] : 'dev'
  } catch {
    return 'unknown'
  }
}
