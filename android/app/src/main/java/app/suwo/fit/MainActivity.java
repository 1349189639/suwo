package app.suwo.fit;

import android.Manifest;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
    private static final int REQ_CAMERA = 7001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 本地插件必须在 super.onCreate 之前注册
        registerPlugin(StepCounterPlugin.class);
        registerPlugin(HealthProbePlugin.class);
        registerPlugin(UpdaterPlugin.class);

        // release 包一律关掉 WebView 远程调试（chrome://inspect 连不上）；
        // 用 FLAG_DEBUGGABLE 判断，避免依赖 BuildConfig 生成开关。
        boolean debuggable =
                (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        if (!debuggable) {
            WebView.setWebContentsDebuggingEnabled(false);
        }

        super.onCreate(savedInstanceState);

        // Capacitor 初始化时可能会再打开一次，这里兜底再关一遍
        if (!debuggable) {
            WebView.setWebContentsDebuggingEnabled(false);
        }

        // 每次「版本号变化」时清一次 WebView 的 HTTP 缓存，并立即重新加载。
        // 背景：页面是远程托管的，WebView 会缓存 index.html，导致「部署了但用户还是旧版」。
        // 前端虽有自检逻辑，但旧页面里没有那段代码，无法自举；必须由原生踢一脚。
        try {
            int code = getPackageManager().getPackageInfo(getPackageName(), 0).versionCode;
            android.content.SharedPreferences p =
                    getSharedPreferences("suwo_cache", MODE_PRIVATE);
            if (p.getInt("cleared_code", -1) != code) {
                p.edit().putInt("cleared_code", code).apply();
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().clearCache(true);
                    getBridge().getWebView().reload();
                }
            }
        } catch (Exception ignored) {
            // 清缓存失败不影响启动
        }

        // 返回手势 / 返回键一律交给前端决策（关浮层 / 回首页 / 二次确认退出）。
        // 关键：这里绝不能让 WebView 自己 goBack，也不能 setEnabled(false) ——
        // 之前那版一旦执行 setEnabled(false)，本回调就永久失效，之后每次侧滑都直接退出。
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                Bridge b = getBridge();
                if (b == null || b.getWebView() == null) {
                    return;
                }
                String url = b.getWebView().getUrl();
                // 页面还没起来（或加载失败）时，别把用户困在 App 里
                if (url == null || url.startsWith("about:")) {
                    finish();
                    return;
                }
                b.getWebView().evaluateJavascript(
                    "window.__suwoBack && window.__suwoBack()", null);
            }
        });

        // 申请相机权限（扫码 / 拍照识别都要）
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[] { Manifest.permission.CAMERA }, REQ_CAMERA);
        }

        // 让 WebView 里的 getUserMedia（摄像头）能拿到授权
        getBridge().getWebView().setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            request.grant(request.getResources());
                        } catch (Exception ignored) {
                            request.deny();
                        }
                    }
                });
            }
        });
    }


}
