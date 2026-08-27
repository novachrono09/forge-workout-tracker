package com.forge.strengthos

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.WindowManager
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "ForgeNative")
class ForgeNativePlugin : Plugin() {

    private fun vibrator(): Vibrator? =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            (context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager)?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        }

    /**
     * Composite haptic waveform: pattern = [delayMs, onMs, offMs, onMs, ...]
     * Used for failure-set double buzz and rest-end long–pause–long.
     */
    @PluginMethod
    fun hapticWaveform(call: PluginCall) {
        val arr: JSArray = call.getArray("pattern") ?: JSArray()
        if (arr.length() == 0) { call.reject("pattern[] required"); return }
        val timings = LongArray(arr.length()) { i -> arr.optLong(i, 0L) }

        val v = vibrator()
        if (v == null || !v.hasVibrator()) { call.resolve(); return }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
            v.vibrate(VibrationEffect.createWaveform(timings, -1))
        else {
            @Suppress("DEPRECATION")
            v.vibrate(timings, -1)
        }
        call.resolve()
    }

    /** Keep-awake via window flag — no WAKE_LOCK permission; auto-released on destroy. */
    @PluginMethod
    fun keepScreenOn(call: PluginCall) {
        val keep = call.getBoolean("keep", true) ?: true
        val act = activity ?: run { call.reject("activity unavailable"); return }
        act.runOnUiThread {
            if (keep) act.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            else act.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
        call.resolve()
    }

    /** Real system-bar insets (px) — authoritative fallback for env(safe-area-inset-*). */
    @PluginMethod
    fun getSafeAreaInsets(call: PluginCall) {
        val act = activity ?: run { call.reject("activity unavailable"); return }
        val ret = JSObject()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val ins = act.window.decorView.rootWindowInsets
            if (ins != null) {
                ret.put("top", ins.systemWindowInsetTop)
                ret.put("bottom", ins.systemWindowInsetBottom)
                ret.put("left", ins.systemWindowInsetLeft)
                ret.put("right", ins.systemWindowInsetRight)
            } else {
                ret.put("top", 0); ret.put("bottom", 0); ret.put("left", 0); ret.put("right", 0)
            }
        } else {
            ret.put("top", 0); ret.put("bottom", 0); ret.put("left", 0); ret.put("right", 0)
        }
        call.resolve(ret)
    }
}
