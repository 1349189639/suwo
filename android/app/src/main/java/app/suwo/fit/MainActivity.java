package app.suwo.fit;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.PermissionRequest;

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
     * 返回键 / 侧滑手势：只要 WebView 里有历史（浮层打开时前端会 push 一条），
     * 就后退一步关掉浮层；没有历史才真正退出 App。
     */
    @Override
    public void onBackPressed() {
        Bridge b = getBridge();
        if (b != null && b.getWebView() != null && b.getWebView().canGoBack()) {
            b.getWebView().goBack();
            return;
        }
        super.onBackPressed();
    }}
