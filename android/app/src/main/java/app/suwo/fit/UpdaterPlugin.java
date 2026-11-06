package app.suwo.fit;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.content.pm.SigningInfo;
import android.net.Uri;
import android.os.Build;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.security.MessageDigest;

/**
 * 应用内更新：把下载好的 APK 交给系统安装器。
 * 下载由前端用 @capacitor/filesystem 完成。
 *
 * 安全要点：安装前在“原生层”校验待安装 APK 的签名证书指纹。
 * 前端页面是远程加载的、可被篡改，所以校验不能放在前端；这里拿内置常量做比对，
 * 不一致直接拒绝安装（防止被投毒的更新包顶替）。
 */
@CapacitorPlugin(name = "Updater")
public class UpdaterPlugin extends Plugin {

    /** 正式 release 证书指纹（keytool -list -v 的 SHA256，带冒号大写）。换签名时同步更新这里和 version.json。 */
    private static final String EXPECTED_CERT_SHA256 =
            "09:27:46:07:4E:C9:9D:27:46:DD:CF:9F:B3:40:9F:A5:A3:37:E6:46:DF:DD:18:46:0B:6E:B6:91:52:8B:F3:FE";

    @PluginMethod
    public void install(PluginCall call) {
        String path = call.getString("path");
        if (path == null || path.isEmpty()) {
            call.reject("缺少安装包路径");
            return;
        }
        File file = new File(path);
        if (!file.exists()) {
            call.reject("安装包不存在");
            return;
        }

        // 1) 签名校验：先验，再装
        String actual;
        try {
            actual = apkCertSha256(file);
        } catch (Exception e) {
            call.reject("读不到安装包签名，已拒绝安装：" + e.getMessage());
            return;
        }
        if (actual == null || actual.isEmpty()) {
            call.reject("安装包没有有效签名，已拒绝安装");
            return;
        }
        if (!EXPECTED_CERT_SHA256.isEmpty()
                && !normalize(actual).equals(normalize(EXPECTED_CERT_SHA256))) {
            call.reject("安装包签名校验失败，已拒绝安装。实际证书 " + actual
                    + "，期望 " + EXPECTED_CERT_SHA256 + "。请从官方渠道重新下载。");
            return;
        }

        // 2) 调起系统安装器
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW);
            Uri uri;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                uri = FileProvider.getUriForFile(
                        getContext(),
                        getContext().getPackageName() + ".fileprovider",
                        file);
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } else {
                uri = Uri.fromFile(file);
            }
            intent.setDataAndType(uri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("ok", true);
            ret.put("signerCertSha256", actual);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("无法启动安装：" + e.getMessage());
        }
    }

    /** 读 APK 的签名证书 SHA-256；Android 11+ 走 GET_SIGNING_CERTIFICATES，低版本回退 GET_SIGNATURES */
    private String apkCertSha256(File apk) throws Exception {
        PackageManager pm = getContext().getPackageManager();
        String p = apk.getAbsolutePath();
        Signature[] sigs = null;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            PackageInfo info = pm.getPackageArchiveInfo(p, PackageManager.GET_SIGNING_CERTIFICATES);
            if (info != null) {
                SigningInfo si = info.signingInfo;
                if (si != null) {
                    sigs = si.getApkContentsSigners();
                }
            }
        }
        if (sigs == null) {
            PackageInfo info = pm.getPackageArchiveInfo(p, PackageManager.GET_SIGNATURES);
            if (info != null) sigs = info.signatures;
        }
        if (sigs == null || sigs.length == 0) return null;
        return sha256Hex(sigs[0].toByteArray());
    }

    private static String sha256Hex(byte[] data) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] digest = md.digest(data);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < digest.length; i++) {
            if (i > 0) sb.append(':');
            sb.append(String.format("%02X", digest[i]));
        }
        return sb.toString();
    }

    private static String normalize(String s) {
        return s.replace(":", "").trim().toUpperCase();
    }

    /** 是否已允许安装未知来源应用（Android 8+） */
    @PluginMethod
    public void canInstall(PluginCall call) {
        boolean allowed = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            allowed = getContext().getPackageManager().canRequestPackageInstalls();
        }
        JSObject ret = new JSObject();
        ret.put("allowed", allowed);
        call.resolve(ret);
    }
}
