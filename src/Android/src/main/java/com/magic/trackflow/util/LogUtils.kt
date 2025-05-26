package com.magic.trackflow.util

import android.util.Log

object LogUtils {
    private const val DEFAULT_TAG = "TrackFlow"
    private var isDebugEnabled = true
    
    fun setDebugEnabled(enabled: Boolean) {
        isDebugEnabled = enabled
    }
    
    fun d(tag: String = DEFAULT_TAG, message: String) {
        if (isDebugEnabled) {
            Log.d(tag, message)
        }
    }
    
    fun i(tag: String = DEFAULT_TAG, message: String) {
        Log.i(tag, message)
    }
    
    fun w(tag: String = DEFAULT_TAG, message: String) {
        Log.w(tag, message)
    }
    
    fun e(tag: String = DEFAULT_TAG, message: String, throwable: Throwable? = null) {
        if (throwable != null) {
            Log.e(tag, message, throwable)
        } else {
            Log.e(tag, message)
        }
    }
    
    fun v(tag: String = DEFAULT_TAG, message: String) {
        if (isDebugEnabled) {
            Log.v(tag, message)
        }
    }
    
    fun network(message: String) {
        d("NetworkDebug", message)
    }
    
    fun api(message: String) {
        d("ApiDebug", message)
    }
    
    fun barcode(message: String) {
        d("BarcodeDebug", message)
    }
    
    fun nfc(message: String) {
        d("NfcDebug", message)
    }
}
