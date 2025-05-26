package com.magic.trackflow.ui.screens.scanner

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.magic.trackflow.data.model.Assembly
import com.magic.trackflow.data.model.Batch
import com.magic.trackflow.data.model.UserData
import com.magic.trackflow.data.repository.TrackFlowRepository
import com.magic.trackflow.util.BarcodeValidator
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class BarcodeScannerViewModel(
    private val repository: TrackFlowRepository,
    private val userPreferences: com.magic.trackflow.data.preferences.UserPreferences
) : ViewModel() {
    
    private val _scanState = MutableStateFlow<ScanState>(ScanState.Idle)
    val scanState: StateFlow<ScanState> = _scanState.asStateFlow()
    
    private var userData: UserData? = null
    private var _originalBarcode: String = ""
    
    // Public access to the original barcode
    val originalBarcode: String
        get() = _originalBarcode
    
    fun setUserData(userData: UserData) {
        this.userData = userData
    }
    
    fun processBarcode(barcode: String) {
        // Try to get user data from the view model or preferences
        val userId = userData?.userId ?: run {
            // Try to get from preferences
            val prefsUserData = userPreferences.getUserData()
            if (prefsUserData != null) {
                userData = prefsUserData
                android.util.Log.d("BarcodeScannerVM", "Retrieved user data from preferences: ${prefsUserData.fullName}")
                prefsUserData.userId
            } else {
                android.util.Log.e("BarcodeScannerVM", "Cannot process barcode: userData is null")
                _scanState.value = ScanState.Error("User data not available. Please log in again.")
                return
            }
        }
        
        // Log the barcode processing
        android.util.Log.d("BarcodeScannerVM", "Processing barcode: $barcode, userId: $userId")
        
        // Prevent duplicate processing
        if (_scanState.value is ScanState.Loading) {
            android.util.Log.d("BarcodeScannerVM", "Already processing a barcode, ignoring new request")
            return
        }
        
        viewModelScope.launch {
            try {
                _scanState.value = ScanState.Loading
                
                // Clean the barcode - remove any spaces or special characters if needed
                val cleanBarcode = barcode.trim()
                
                // Check the barcode type
                val codeType = BarcodeValidator.identifyCodeType(cleanBarcode)
                android.util.Log.d("BarcodeScannerVM", "Barcode type identified as: $codeType")
                
                // If it's a UUID, don't try to use the barcode endpoint
                if (codeType == BarcodeValidator.CodeType.UUID) {
                    android.util.Log.e("BarcodeScannerVM", "UUID detected instead of barcode format: $cleanBarcode")
                    _scanState.value = ScanState.Error(
                        "Invalid barcode format. UUID detected: $cleanBarcode\n\n" +
                        "Please scan a valid barcode with format:\n" +
                        "Assembly: ASM-XXXXXXX-XXXXX\n" +
                        "Batch: BATCH-XXXXXXXX-XXXXX\n\n" +
                        "Examples: ASM-MA3WU7N6-P42NG, BATCH-MA19A96M-25F0"
                    )
                    return@launch
                } 
                
                // Always save the raw barcode for reference
                // We'll need this later if we want to load the batch directly from barcode
                _originalBarcode = cleanBarcode
                
                when (codeType) {
                    BarcodeValidator.CodeType.BATCH_BARCODE -> {
                        // Process as a batch barcode
                        android.util.Log.d("BarcodeScannerVM", "Processing as batch barcode: $cleanBarcode")
                        processBatchBarcode(cleanBarcode, userId)
                    }
                    BarcodeValidator.CodeType.ASSEMBLY_BARCODE -> {
                        // Process as an assembly barcode
                        android.util.Log.d("BarcodeScannerVM", "Processing as assembly barcode: $cleanBarcode")
                        processAssemblyBarcode(cleanBarcode, userId)
                    }
                    else -> {
                        // For unknown formats, try to process as assembly
                        android.util.Log.w("BarcodeScannerVM", "Unknown barcode format: $cleanBarcode, trying as assembly")
                        processAssemblyBarcode(cleanBarcode, userId)
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("BarcodeScannerVM", "Exception during barcode processing", e)
                _scanState.value = ScanState.Error("An unexpected error occurred: ${e.message}")
            }
        }
    }
    
    private suspend fun processAssemblyBarcode(barcode: String, userId: String) {
        repository.getAssemblyByBarcode(barcode, userId).collectLatest { result ->
            result.fold(
                onSuccess = { assembly ->
                    android.util.Log.d("BarcodeScannerVM", "Assembly found: ${assembly.data.name}")
                    _scanState.value = ScanState.AssemblySuccess(assembly)
                },
                onFailure = { error ->
                    android.util.Log.e("BarcodeScannerVM", "Error processing assembly barcode: ${error.message}", error)
                    _scanState.value = ScanState.Error(error.message ?: "Unknown error")
                }
            )
        }
    }
    
    private suspend fun processBatchBarcode(barcode: String, userId: String) {
        repository.validateBatchBarcode(barcode, userId).collectLatest { result ->
            result.fold(
                onSuccess = { batch ->
                    android.util.Log.d("BarcodeScannerVM", "Batch found: ${batch.data.batchNumber}")
                    _scanState.value = ScanState.BatchSuccess(batch)
                },
                onFailure = { error ->
                    android.util.Log.e("BarcodeScannerVM", "Error processing batch barcode: ${error.message}", error)
                    _scanState.value = ScanState.Error(error.message ?: "Unknown error")
                }
            )
        }
    }
    
    fun resetState() {
        _scanState.value = ScanState.Idle
    }
    
    sealed class ScanState {
        object Idle : ScanState()
        object Loading : ScanState()
        data class AssemblySuccess(val assembly: Assembly) : ScanState()
        data class BatchSuccess(val batch: Batch) : ScanState()
        data class Error(val message: String) : ScanState()
    }
}
