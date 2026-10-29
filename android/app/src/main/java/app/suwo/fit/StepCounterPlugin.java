package app.suwo.fit;

import android.Manifest;
import android.content.SharedPreferences;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * 读取系统计步传感器（TYPE_STEP_COUNTER）。
 *
 * 传感器返回「本次开机以来的累计步数」，不提供「今天零点时的累计值」。
 * 2026-10-29 #9 修复 + 诊断增强：
 * 1. 监听器只在确认拿到 ACTIVITY_RECOGNITION 权限后才注册，授权成功回调里重新注册。
 * 2. 今天才开机：累计值即今日步数，基准取 0；跨天未重启走基准法。
 * 3. 已有缓存值立即返回，不再白等 1.5 秒。
 * 4. 诊断返回开机时间、基准、保存日期、命中分支，便于在真机定位「今日步数偏低」。
 */
@CapacitorPlugin(
    name = "StepCounter",
    permissions = {
        @Permission(alias = "activity", strings = { Manifest.permission.ACTIVITY_RECOGNITION })
    }
)
public class StepCounterPlugin extends Plugin implements SensorEventListener {

    private static final String PREFS = "suwo_steps";
    private static final String KEY_DATE = "date";
    private static final String KEY_BASE = "base";

    private SensorManager sensorManager;
    private Sensor stepSensor;
    private float latest = -1f;
    private boolean listening = false;

    @Override
    public void load() {
        sensorManager = (SensorManager) getContext().getSystemService(android.content.Context.SENSOR_SERVICE);
        if (sensorManager != null) {
            stepSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
        }
        // 这里不要 startListening()：Android 10+ 未授权时注册会静默收不到数据，
        // 且后续授权不会自动重新生效。
    }

    private boolean hasActivityPermission() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.Q
            || getPermissionState("activity") == PermissionState.GRANTED;
    }

    private void startListening() {
        if (listening || sensorManager == null || stepSensor == null) return;
        sensorManager.registerListener(this, stepSensor, SensorManager.SENSOR_DELAY_NORMAL);
        listening = true;
    }

    @Override
    protected void handleOnResume() {
        if (hasActivityPermission()) {
            startListening();
        }
    }

    @Override
    protected void handleOnPause() {
        if (sensorManager != null && listening) {
            sensorManager.unregisterListener(this);
            listening = false;
        }
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() == Sensor.TYPE_STEP_COUNTER && event.values.length > 0) {
            latest = event.values[0];
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
        // 不需要处理
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("available", stepSensor != null);
        ret.put("apiLevel", Build.VERSION.SDK_INT);
        call.resolve(ret);
    }

    @PluginMethod
    public void getToday(final PluginCall call) {
        if (stepSensor == null) {
            call.reject("这台设备没有计步传感器");
            return;
        }
        if (!hasActivityPermission()) {
            requestPermissionForAlias("activity", call, "activityPermsCallback");
            return;
        }
        startListening();
        respond(call);
    }

    @PermissionCallback
    private void activityPermsCallback(PluginCall call) {
        if (getPermissionState("activity") == PermissionState.GRANTED) {
            startListening();
            respond(call);
        } else {
            call.reject("没有活动识别权限，无法读取步数");
        }
    }

    private static final class Calc {
        long steps;
        String branch;
        boolean bootToday;
        float base;
        String savedDate = "";
        long bootUptimeMs;
    }

    private void respond(final PluginCall call) {
        if (latest >= 0) {
            Calc c = todaySteps();
            JSObject ret = new JSObject();
            ret.put("steps", c.steps);
            ret.put("total", (long) latest);
            ret.put("available", true);
            ret.put("apiLevel", Build.VERSION.SDK_INT);
            ret.put("branch", c.branch);
            ret.put("bootToday", c.bootToday);
            ret.put("base", c.base);
            ret.put("savedDate", c.savedDate);
            ret.put("latest", (long) latest);
            ret.put("bootUptimeMs", c.bootUptimeMs);
            call.resolve(ret);
            return;
        }
        // 传感器是异步回调，等第一帧数据最多 1.5 秒。
        final long deadline = System.currentTimeMillis() + 1500;
        final android.os.Handler handler = new android.os.Handler(android.os.Looper.getMainLooper());
        Runnable waitForSensor = new Runnable() {
            @Override
            public void run() {
                if (latest < 0) {
                    if (System.currentTimeMillis() < deadline) {
                        handler.postDelayed(this, 100);
                        return;
                    }
                    JSObject ret = new JSObject();
                    ret.put("steps", 0);
                    ret.put("available", false);
                    ret.put("apiLevel", Build.VERSION.SDK_INT);
                    call.resolve(ret);
                    return;
                }
                Calc c = todaySteps();
                JSObject ret = new JSObject();
                ret.put("steps", c.steps);
                ret.put("total", (long) latest);
                ret.put("available", true);
                ret.put("apiLevel", Build.VERSION.SDK_INT);
                ret.put("branch", c.branch);
                ret.put("bootToday", c.bootToday);
                ret.put("base", c.base);
                ret.put("savedDate", c.savedDate);
                ret.put("latest", (long) latest);
                ret.put("bootUptimeMs", c.bootUptimeMs);
                call.resolve(ret);
            }
        };
        handler.post(waitForSensor);
    }

    private Calc todaySteps() {
        Calc c = new Calc();
        long now = System.currentTimeMillis();
        java.util.Calendar cal = java.util.Calendar.getInstance();
        cal.set(java.util.Calendar.HOUR_OF_DAY, 0);
        cal.set(java.util.Calendar.MINUTE, 0);
        cal.set(java.util.Calendar.SECOND, 0);
        cal.set(java.util.Calendar.MILLISECOND, 0);
        long midnight = cal.getTimeInMillis();
        long bootTime = now - android.os.SystemClock.elapsedRealtime();
        c.bootUptimeMs = android.os.SystemClock.elapsedRealtime();
        c.base = -1f;
        c.savedDate = "";

        if (bootTime >= midnight) {
            // 今天才开机：累计值从本次开机算起、本来就落在今天，直接用，基准取 0。
            c.bootToday = true;
            c.branch = "todayBoot";
            c.steps = Math.max(0, (long) latest);
            return c;
        }

        // 跨天未重启：基准法（App 没在零点运行时可能偏低，属已知限制）。
        c.bootToday = false;
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS, android.content.Context.MODE_PRIVATE);
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        c.savedDate = prefs.getString(KEY_DATE, "");
        c.base = prefs.getFloat(KEY_BASE, -1f);
        boolean newDay = !today.equals(c.savedDate);
        boolean rebooted = c.base < 0 || latest < c.base;

        if (newDay) {
            c.branch = "baselineNewDay";
            prefs.edit().putString(KEY_DATE, today).putFloat(KEY_BASE, latest).apply();
            c.base = latest;
            c.steps = 0;
        } else if (rebooted) {
            c.branch = "baselineRebooted";
            prefs.edit().putString(KEY_DATE, today).putFloat(KEY_BASE, latest).apply();
            c.base = latest;
            c.steps = 0;
        } else {
            c.branch = "baselineDiff";
            c.steps = Math.max(0, (long) (latest - c.base));
        }
        return c;
    }
}
