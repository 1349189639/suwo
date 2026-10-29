import type { CapacitorConfig } from '@capacitor/cli'

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
