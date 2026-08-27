package com.forge.strengthos;

import android.content.Context;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.view.WindowManager;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ForgeNative")
public class ForgeNativePlugin extends Plugin {

    private Vibrator getVibrator() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager vm = (VibratorManager) getContext().getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            return vm != null ? vm.getDefaultVibrator() : null;
        } else {
            return (Vibrator) getContext().getSystemService(Context.VIBRATOR_SERVICE);
        }
    }

    @PluginMethod
    public void hapticWaveform(PluginCall call) {
        JSArray arr = call.getArray("pattern");
        if (arr == null || arr.length() == 0) {
            call.reject("pattern[] required");
            return;
        }
        long[] timings = new long[arr.length()];
        for (int i = 0; i < arr.length(); i++) {
            timings[i] = arr.optLong(i, 0L);
        }

        Vibrator v = getVibrator();
        if (v == null || !v.hasVibrator()) {
            call.resolve();
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            v.vibrate(VibrationEffect.createWaveform(timings, -1));
        } else {
            v.vibrate(timings, -1);
        }
        call.resolve();
    }

    @PluginMethod
    public void keepScreenOn(PluginCall call) {
        boolean keep = call.getBoolean("keep", true);
        if (getActivity() == null) {
            call.reject("activity unavailable");
            return;
        }
        getActivity().runOnUiThread(() -> {
            if (keep) {
                getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            } else {
                getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            }
        });
        call.resolve();
    }

    @PluginMethod
    public void getSafeAreaInsets(PluginCall call) {
        if (getActivity() == null) {
            call.reject("activity unavailable");
            return;
        }
        JSObject ret = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && getActivity().getWindow().getDecorView().getRootWindowInsets() != null) {
            android.view.WindowInsets ins = getActivity().getWindow().getDecorView().getRootWindowInsets();
            ret.put("top", ins.getSystemWindowInsetTop());
            ret.put("bottom", ins.getSystemWindowInsetBottom());
            ret.put("left", ins.getSystemWindowInsetLeft());
            ret.put("right", ins.getSystemWindowInsetRight());
        } else {
            ret.put("top", 0);
            ret.put("bottom", 0);
            ret.put("left", 0);
            ret.put("right", 0);
        }
        call.resolve(ret);
    }
}
