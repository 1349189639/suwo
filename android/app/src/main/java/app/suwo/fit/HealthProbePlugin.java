package app.suwo.fit;

import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.ext.SdkExtensions;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.List;
import java.util.Locale;

/**
 * Health Connect 可行性探测（第一阶段：纯系统层，不引入 HC SDK）。
 * 目的：先判断这台机器上 Google Health Connect 存不存在、是否内置、有没有健康类应用，
 * 再决定第二阶段是否值得引入 HC SDK 做授权 + 读取今日步数。
 *
 * 只探测、不改动任何计步逻辑。
 */
@CapacitorPlugin(name = "HealthProbe")
public class HealthProbePlugin extends Plugin {

    private static final String HC_PROVIDER = "com.google.android.apps.healthdata";

    @PluginMethod
    public void probe(PluginCall call) {
        JSObject r = new JSObject();
        r.put("apiLevel", Build.VERSION.SDK_INT);
        r.put("androidRelease", Build.VERSION.RELEASE);
        r.put("deviceBrand", Build.BRAND == null ? "" : Build.BRAND);
        r.put("deviceModel", Build.MODEL == null ? "" : Build.MODEL);

        // SDK 扩展版本：Android 14+ 设备端步数要求扩展 20 以上
        int ext = -1;
        String extError = "";
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                ext = SdkExtensions.getExtensionVersion(Build.VERSION_CODES.UPSIDE_DOWN_CAKE);
            } else {
                ext = -2; // 低于 API 34，不存在设备端步数能力
            }
        } catch (Throwable t) {
            extError = t.getClass().getSimpleName() + ": " + t.getMessage();
            ext = -3;
        }
        r.put("sdkExtension", ext);
        r.put("sdkExtensionError", extError);
        r.put("builtInHC", Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE);

        PackageManager pm = getContext().getPackageManager();
        boolean installed = false;
        boolean enabled = false;
        String providerVersion = "";
        String providerReason = "";
        try {
            PackageInfo pi = pm.getPackageInfo(HC_PROVIDER, 0);
            installed = true;
            enabled = pi.applicationInfo.enabled;
            providerVersion = pi.versionName == null ? "" : pi.versionName;
        } catch (PackageManager.NameNotFoundException e) {
            installed = false;
            providerReason = "not_installed";
        } catch (Throwable t) {
            providerReason = t.getClass().getSimpleName() + ": " + t.getMessage();
        }
        r.put("providerInstalled", installed);
        r.put("providerEnabled", enabled);
        r.put("providerVersion", providerVersion);
        r.put("providerReason", providerReason);

        // 列出本机健康 / 运动相关已安装包（探测版临时加 QUERY_ALL_PACKAGES 才能看到其他应用）
        JSObject packs = new JSObject();
        StringBuilder sb = new StringBuilder();
        int matchCount = 0;
        String packError = "";
        try {
            List<PackageInfo> all = pm.getInstalledPackages(0);
            for (PackageInfo p : all) {
                String name = p.packageName;
                if (name == null) continue;
                String lc = name.toLowerCase(Locale.ROOT);
                boolean hit = lc.contains("health") || lc.contains("fit") || lc.contains("sport")
                        || lc.contains("exercise") || lc.contains("step");
                if (hit) {
                    boolean isSystem = (p.applicationInfo != null
                            && (p.applicationInfo.flags & ApplicationInfo.FLAG_SYSTEM) != 0);
                    if (matchCount < 50) {
                        sb.append(name).append(isSystem ? " [系统]" : "").append("; ");
                    }
                    matchCount++;
                }
            }
        } catch (Throwable t) {
            packError = t.getClass().getSimpleName() + ": " + t.getMessage();
        }
        packs.put("matches", sb.toString());
        packs.put("matchCount", matchCount);
        packs.put("error", packError);
        r.put("healthPackages", packs);

        call.resolve(r);
    }
}
