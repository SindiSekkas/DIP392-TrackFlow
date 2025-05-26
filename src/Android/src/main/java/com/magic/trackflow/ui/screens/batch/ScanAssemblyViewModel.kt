package com.magic.trackflow.ui.screens.batch

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.magic.trackflow.data.model.BatchAssembly
import com.magic.trackflow.data.model.UserData
import com.magic.trackflow.data.repository.TrackFlowRepository
import com.magic.trackflow.util.BarcodeValidator
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class ScanAssemblyViewModel(
    private val repository: TrackFlowRepository,
    private val userPreferences: com.magic.trackflow.data.preferences.UserPreferences
) : ViewModel() {
    
    private val _scanState = MutableStateFlow<ScanState>(ScanState.Idle)
    val scanState: StateFlow<ScanState> = _scanState.asStateFlow()
    
    private var userData: UserData? = null
    private var batchId: String = ""
    
    fun setUserData(userData: UserData) {
        this.userData = userData
    }
    
    fun setBatchId(batchId: String) {
        this.batchId = batchId
    }
    
    fun processAssemblyBarcode(barcode: String) {
        // Try to get user data from the view model or preferences
        val userId = userData?.userId ?: run {
            // Try to get from preferences
            val prefsUserData = userPreferences.getUserData()
            if (prefsUserData != null) {
                userData = prefsUserData
                android.util.Log.d("ScanAssemblyVM", "Retrieved user data from preferences: ${prefsUserData.fullName}")
                prefsUserData.userId
            } else {
                android.util.Log.e("ScanAssemblyVM", "Cannot process barcode: userData is null")
                _scanState.value = ScanState.Error("User data not available. Please log in again.")
                return
            }
        }
        
        val cardId = userData?.cardId ?: run {
            android.util.Log.e("ScanAssemblyVM", "Cannot process barcode: cardId is null")
            _scanState.value = ScanState.Error("NFC card data not available. Please tap your card on the reader.")
            return
        }
        
        // If batch ID is empty, show error
        if (batchId.isEmpty()) {
            android.util.Log.e("ScanAssemblyVM", "Cannot process barcode: batchId is empty")
            _scanState.value = ScanState.Error("Batch ID not available. Please try again.")
            return
        }
        
        // Log the barcode processing
        android.util.Log.d("ScanAssemblyVM", "Processing assembly barcode: $barcode for batch: $batchId")
        
        // Prevent duplicate processing
        if (_scanState.value is ScanState.Loading) {
            android.util.Log.d("ScanAssemblyVM", "Already processing a barcode, ignoring new request")
            return
        }
        
        viewModelScope.launch {
            try {
                _scanState.value = ScanState.Loading
                
                // Clean the barcode - remove any spaces or special characters if needed
                val cleanBarcode = barcode.trim()
                
                // Check if it's actually an assembly barcode
                val codeType = BarcodeValidator.identifyCodeType(cleanBarcode)
                android.util.Log.d("ScanAssemblyVM", "Barcode type identified as: $codeType")
                
                if (codeType != BarcodeValidator.CodeType.ASSEMBLY_BARCODE) {
                    android.util.Log.w("ScanAssemblyVM", "Not an assembly barcode: $cleanBarcode, but proceeding anyway")
                    // Continue anyway, just log a warning - the API should validate
                }
                
                // Add the assembly to the batch
                repository.addAssemblyToBatch(batchId, cleanBarcode, userId, cardId)
                    .collectLatest { result ->
                        result.fold(
                            onSuccess = { batchAssembly ->
                                val isAlreadyAdded = batchAssembly.data.alreadyAdded == true
                                val message = if (isAlreadyAdded) {
                                    "Assembly was already in this batch: ${batchAssembly.data.assemblyName}"
                                } else {
                                    "Assembly ${batchAssembly.data.assemblyName} added to batch successfully"
                                }
                                
                                android.util.Log.d("ScanAssemblyVM", message)
                                _scanState.value = ScanState.Success(batchAssembly, isAlreadyAdded)
                            },
                            onFailure = { error ->
                                android.util.Log.e("ScanAssemblyVM", "Error processing assembly barcode: ${error.message}", error)
                                _scanState.value = ScanState.Error(error.message ?: "Unknown error")
                            }
                        )
                    }
            } catch (e: Exception) {
                android.util.Log.e("ScanAssemblyVM", "Exception during assembly barcode processing", e)
                _scanState.value = ScanState.Error("An unexpected error occurred: ${e.message}")
            }
        }
    }
    
    fun resetState() {
        _scanState.value = ScanState.Idle
    }
    
    sealed class ScanState {
        object Idle : ScanState()
        object Loading : ScanState()
        data class Success(val batchAssembly: BatchAssembly, val alreadyAdded: Boolean) : ScanState()
        data class Error(val message: String) : ScanState()
    }
}