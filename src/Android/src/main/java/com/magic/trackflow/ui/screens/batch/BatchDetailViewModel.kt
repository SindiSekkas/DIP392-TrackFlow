package com.magic.trackflow.ui.screens.batch

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.magic.trackflow.data.model.Batch
import com.magic.trackflow.data.model.BatchAssembly
import com.magic.trackflow.data.model.BatchData
import com.magic.trackflow.data.model.UserData
import com.magic.trackflow.data.repository.TrackFlowRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class BatchDetailViewModel(
    private val repository: TrackFlowRepository
) : ViewModel() {
    
    private val _batchState = MutableStateFlow<BatchState>(BatchState.Idle)
    val batchState: StateFlow<BatchState> = _batchState.asStateFlow()
    
    private val _addAssemblyState = MutableStateFlow<AddAssemblyState>(AddAssemblyState.Idle)
    val addAssemblyState: StateFlow<AddAssemblyState> = _addAssemblyState.asStateFlow()
    
    private val _removeAssemblyState = MutableStateFlow<RemoveAssemblyState>(RemoveAssemblyState.Idle)
    val removeAssemblyState: StateFlow<RemoveAssemblyState> = _removeAssemblyState.asStateFlow()
    
    private var userData: UserData? = null
    private var batchData: Batch? = null
    
    fun setUserData(userData: UserData) {
        this.userData = userData
    }
    
    fun setBatch(batch: Batch) {
        this.batchData = batch
        // Initialize the UI state with the batch data
        _batchState.value = BatchState.Success(batch.data)
    }
    
    fun loadBatchAssemblies() {
        val userId = userData?.userId ?: return
        val batchId = batchData?.data?.effectiveId ?: return
        
        viewModelScope.launch {
            _batchState.value = BatchState.Loading
            
            android.util.Log.d("BatchDetailVM", "Loading batch assemblies - batchId: $batchId, userId: $userId")
            
            repository.getBatchAssemblies(batchId, userId)
                .collectLatest { result ->
                    _batchState.value = result.fold(
                        onSuccess = { batch ->
                            android.util.Log.d("BatchDetailVM", "Batch assemblies loaded successfully: ${batch.data.batchNumber}")
                            BatchState.Success(batch.data)
                        },
                        onFailure = { error ->
                            android.util.Log.e("BatchDetailVM", "Error loading batch assemblies: ${error.message}")
                            BatchState.Error(error.message ?: "Unknown error")
                        }
                    )
                }
        }
    }
    
    // Method to validate a batch barcode and load data directly
    fun loadBatchByBarcode(barcode: String) {
        val userId = userData?.userId ?: return
        
        viewModelScope.launch {
            _batchState.value = BatchState.Loading
            
            android.util.Log.d("BatchDetailVM", "Validating and loading batch by barcode: $barcode, userId: $userId")
            
            repository.validateBatchBarcode(barcode, userId)
                .collectLatest { result ->
                    result.fold(
                        onSuccess = { batch ->
                            android.util.Log.d("BatchDetailVM", "Batch loaded successfully from barcode: ${batch.data.batchNumber}")
                            batchData = batch
                            _batchState.value = BatchState.Success(batch.data)
                            
                            // Now that we have the batch ID, load the assemblies too
                            loadBatchAssemblies()
                        },
                        onFailure = { error ->
                            android.util.Log.e("BatchDetailVM", "Error loading batch by barcode: ${error.message}")
                            _batchState.value = BatchState.Error(error.message ?: "Unknown error")
                        }
                    )
                }
        }
    }
    
    fun addAssemblyToBatch(assemblyBarcode: String) {
        val userId = userData?.userId ?: return
        val cardId = userData?.cardId ?: return
        val batchId = batchData?.data?.effectiveId ?: return
        
        viewModelScope.launch {
            _addAssemblyState.value = AddAssemblyState.Loading
            
            repository.addAssemblyToBatch(batchId, assemblyBarcode, userId, cardId)
                .collectLatest { result ->
                    _addAssemblyState.value = result.fold(
                        onSuccess = { assembly ->
                            AddAssemblyState.Success(
                                assembly.data.assemblyName,
                                assembly.data.alreadyAdded == true
                            )
                        },
                        onFailure = { error ->
                            AddAssemblyState.Error(error.message ?: "Unknown error")
                        }
                    )
                }
        }
    }
    
    fun removeAssemblyFromBatch(batchAssemblyId: String) {
        val userId = userData?.userId ?: return
        val cardId = userData?.cardId ?: return
        
        viewModelScope.launch {
            _removeAssemblyState.value = RemoveAssemblyState.Loading
            
            repository.removeAssemblyFromBatch(batchAssemblyId, userId, cardId)
                .collectLatest { result ->
                    _removeAssemblyState.value = result.fold(
                        onSuccess = { assembly ->
                            RemoveAssemblyState.Success(assembly.data.assembliesRemaining ?: 0)
                        },
                        onFailure = { error ->
                            RemoveAssemblyState.Error(error.message ?: "Unknown error")
                        }
                    )
                }
        }
    }
    
    fun resetAddAssemblyState() {
        _addAssemblyState.value = AddAssemblyState.Idle
    }
    
    fun resetRemoveAssemblyState() {
        _removeAssemblyState.value = RemoveAssemblyState.Idle
    }
    
    sealed class BatchState {
        object Idle : BatchState()
        object Loading : BatchState()
        data class Success(val batch: BatchData) : BatchState()
        data class Error(val message: String) : BatchState()
    }
    
    sealed class AddAssemblyState {
        object Idle : AddAssemblyState()
        object Loading : AddAssemblyState()
        data class Success(val assemblyName: String, val alreadyAdded: Boolean) : AddAssemblyState()
        data class Error(val message: String) : AddAssemblyState()
    }
    
    sealed class RemoveAssemblyState {
        object Idle : RemoveAssemblyState()
        object Loading : RemoveAssemblyState()
        data class Success(val assembliesRemaining: Int) : RemoveAssemblyState()
        data class Error(val message: String) : RemoveAssemblyState()
    }
}