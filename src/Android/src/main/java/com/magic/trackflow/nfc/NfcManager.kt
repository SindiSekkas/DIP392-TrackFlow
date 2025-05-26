package com.magic.trackflow.nfc

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.nfc.NfcAdapter
import android.nfc.NfcManager
import android.nfc.Tag
import android.nfc.tech.MifareClassic
import android.nfc.tech.NfcA
import android.os.Build
import android.provider.Settings
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.io.IOException

class NfcManager(private val context: Context) {
    
    private val nfcAdapter: NfcAdapter? by lazy {
        val nfcManager = context.getSystemService(Context.NFC_SERVICE) as? NfcManager
        nfcManager?.defaultAdapter
    }
    
    private val _nfcState = MutableStateFlow<NfcState>(NfcState.Idle)
    val nfcState: StateFlow<NfcState> = _nfcState.asStateFlow()
    
    fun isNfcAvailable(): Boolean = nfcAdapter != null
    
    fun isNfcEnabled(): Boolean = nfcAdapter?.isEnabled == true
    
    fun openNfcSettings() {
        val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            Intent(Settings.Panel.ACTION_NFC)
        } else {
            Intent(Settings.ACTION_NFC_SETTINGS)
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
    }
    
    fun enableReaderMode(activity: Activity) {
        nfcAdapter?.enableReaderMode(
            activity,
            { tag -> processTag(tag) },
            NfcAdapter.FLAG_READER_NFC_A or
                    NfcAdapter.FLAG_READER_NFC_B or
                    NfcAdapter.FLAG_READER_NFC_F or
                    NfcAdapter.FLAG_READER_NFC_V or
                    NfcAdapter.FLAG_READER_NO_PLATFORM_SOUNDS,
            null
        )
    }
    
    fun disableReaderMode(activity: Activity) {
        nfcAdapter?.disableReaderMode(activity)
    }
    
    fun processIntent(intent: Intent) {
        if (NfcAdapter.ACTION_TAG_DISCOVERED == intent.action ||
            NfcAdapter.ACTION_TECH_DISCOVERED == intent.action ||
            NfcAdapter.ACTION_NDEF_DISCOVERED == intent.action) {
            
            val tag = intent.getParcelableExtra<Tag>(NfcAdapter.EXTRA_TAG)
            tag?.let { processTag(it) }
        }
    }
    
    private fun processTag(tag: Tag) {
        try {
            val id = tag.id
            val cardId = bytesToHexString(id)
            _nfcState.value = NfcState.CardDetected(cardId)
        } catch (e: IOException) {
            _nfcState.value = NfcState.Error("Error reading NFC card: ${e.message}")
        }
    }
    
    private fun bytesToHexString(bytes: ByteArray): String {
        val hexArray = "0123456789ABCDEF".toCharArray()
        val hexChars = CharArray(bytes.size * 2)
        
        for (i in bytes.indices) {
            val v = bytes[i].toInt() and 0xFF
            hexChars[i * 2] = hexArray[v ushr 4]
            hexChars[i * 2 + 1] = hexArray[v and 0x0F]
        }
        
        // Format as XX:XX:XX:XX consistent with the API expected format
        return String(hexChars).chunked(2).joinToString(":")
    }
    
    sealed class NfcState {
        object Idle : NfcState()
        data class CardDetected(val cardId: String) : NfcState()
        data class Error(val message: String) : NfcState()
    }
}
