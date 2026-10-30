package app.suwo.fit;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.PermissionRequest;

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
        super.onCreate(savedInstanceState);

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
