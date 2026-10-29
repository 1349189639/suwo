import type { CapacitorConfig } from '@capacitor/cli'

/**
 * 线上托管地址（CloudBase 静态托管，A 方案免费路径）。
 * 原生 APK 启动时直接加载该线上页面；数据读写走 CloudBase，换机/重装登录同账号即可恢复。
 * 浏览器 `npm run dev` 不受 server.url 影响。若需要用本地 dist 跑原生壳调试，注释掉 server.url 即可回退。
 */
const REMOTE_URL = 'https://suwo-suwo-fitnessapp-d7fn2a359e4760f8.webapps.tcloudbase.com'

const config: CapacitorConfig = {
  appId: 'app.suwo.fit',
  appName: '塑我',
  webDir: 'dist',
  android: {
    // 允许 WebView 使用 https 之外的本地方案（默认 https 即可，这里保持收紧）
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    url: REMOTE_URL,
    // 线上页面由 Service Worker 缓存最近版本；远程页面不做本地内置兜底。
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      backgroundColor: '#0a0e13',
      showSpinner: false,
      launchAutoHide: true,
    },
  },
}

export default config
