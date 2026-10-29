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
 * 这是 Android 原生能力，和 vivo 健康 / 华为运动健康读的是同一份硬件步数
 * （都来自计步器 HAL），区别只是厂商 App 会合并手环设备。
 *
 * 传感器返回的是「开机以来的累计步数」，所以这里按天保存一个基准值：
 * 当天首次读取时把当前值记为基准，之后用「当前 - 基准」得到今天的步数；
 * 如果当前值反而变小（手机重启），自动把基准重置为当前值。
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
        startListening();
    }

    private void startListening() {
        if (listening || sensorManager == null || stepSensor == null) return;
        sensorManager.registerListener(this, stepSensor, SensorManager.SENSOR_DELAY_NORMAL);
        listening = true;
    }

    @Override
    protected void handleOnResume() {
        startListening();
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
        call.resolve(ret);
    }

    @PluginMethod
    public void getToday(final PluginCall call) {
        if (stepSensor == null) {
            call.reject("这台设备没有计步传感器");
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
            && getPermissionState("activity") != PermissionState.GRANTED) {
            requestPermissionForAlias("activity", call, "activityPermsCallback");
            return;
        }
        respond(call);
    }

    @PermissionCallback
    private void activityPermsCallback(PluginCall call) {
        if (getPermissionState("activity") == PermissionState.GRANTED) {
            respond(call);
        } else {
            call.reject("没有活动识别权限，无法读取步数");
        }
    }

    private void respond(final PluginCall call) {
        // 传感器是异步回调，等第一帧数据最多 1.5 秒
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
                    call.resolve(ret);
                    return;
                }
                JSObject ret = new JSObject();
                ret.put("steps", todaySteps());
                ret.put("total", (long) latest);
                ret.put("available", true);
                call.resolve(ret);
            }
        };
        handler.post(waitForSensor);
    }

    private long todaySteps() {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS, android.content.Context.MODE_PRIVATE);
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());

        String savedDate = prefs.getString(KEY_DATE, "");
        float base = prefs.getFloat(KEY_BASE, -1f);

        boolean newDay = !today.equals(savedDate);
        boolean rebooted = base < 0 || latest < base;

        if (newDay || rebooted) {
            prefs.edit().putString(KEY_DATE, today).putFloat(KEY_BASE, latest).apply();
            return 0;
        }
        return Math.max(0, (long) (latest - base));
    }
}
