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

        // API 33+ 的返回手势 / 返回键由 OnBackPressedDispatcher 经系统
        // OnBackInvokedDispatcher 分发；只覆写旧版 onBackPressed() 不会被调用，
        // 必须在这里注册回调，才能接住返回并交给 WebView 历史栈处理。
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                Bridge b = getBridge();
                if (b != null && b.getWebView() != null && b.getWebView().canGoBack()) {
                    b.getWebView().goBack();
                    return;
                }
                // WebView 没有可回退历史：关闭本回调，交还 dispatcher 走兜底退出
                setEnabled(false);
                getOnBackPressedDispatcher().onBackPressed();
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

    /**
     * 兼容 API 24–32：旧系统直接回调 onBackPressed()，逻辑与 dispatcher 回调一致。
     * 只要 WebView 里有历史（浮层打开时前端会 push 一条守卫），就后退一步；
     * 没有历史才交给系统退出 App。
     */
    @Override
    public void onBackPressed() {
        Bridge b = getBridge();
        if (b != null && b.getWebView() != null && b.getWebView().canGoBack()) {
            b.getWebView().goBack();
            return;
        }
        super.onBackPressed();
    }
}
