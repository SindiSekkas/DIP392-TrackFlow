package com.magic.trackflow.ui.screens.logistics

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.magic.trackflow.data.model.Batch
import com.magic.trackflow.data.model.BatchAssembly
import com.magic.trackflow.data.model.BatchAssemblyItem
import com.magic.trackflow.data.model.UserData
import com.magic.trackflow.data.repository.TrackFlowRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class BatchViewModel(
    private val repository: TrackFlowRepository
) : ViewModel() {
    
    private val _batchState = MutableStateFlow<BatchState>(BatchState.Idle)
    val batchState: StateFlow<BatchState> = _batchState.asStateFlow()
    
    private val _addAssemblyState = MutableStateFlow<AddAssemblyState>(AddAssemblyState.Idle)
    val addAssemblyState: StateFlow<AddAssemblyState> = _addAssemblyState.asStateFlow()
    
    private val _removeAssemblyState = MutableStateFlow<RemoveAssemblyState>(RemoveAssemblyState.Idle)
    val removeAssemblyState: StateFlow<RemoveAssemblyState> = _removeAssemblyState.asStateFlow()
    
    private var userData: UserData? = null
    private var currentBatch: Batch? = null
    
    fun setUserData(userData: UserData) {
        this.userData = userData
    }
    
    fun validateBatchBarcode(barcode: String) {
        val userId = userData?.userId ?: return
        
        viewModelScope.launch {
            _batchState.value = BatchState.Loading
            
            repository.validateBatchBarcode(barcode, userId)
                .collectLatest { result ->
                    _batchState.value = result.fold(
                        onSuccess = { batch ->
                            currentBatch = batch
                            loadBatchAssemblies(batch.data.id)
                            BatchState.BatchFound(batch)
                        },
                        onFailure = { error ->
                            BatchState.Error(error.message ?: "Unknown error")
                        }
                    )
                }
        }
    }
    
    fun loadBatchAssemblies(batchId: String) {
        val userId = userData?.userId ?: return
        
        viewModelScope.launch {
            // We don't change the state as this might be called automatically
            // after batch validation
            
            repository.getBatchAssemblies(batchId, userId)
                .collectLatest { result ->
                    result.fold(
                        onSuccess = { batch ->
                            currentBatch = batch
                            _batchState.value = BatchState.BatchFound(batch)
                        },
                        onFailure = { error ->
                            _batchState.value = BatchState.Error(error.message ?: "Unknown error")
                        }
                    )
                }
        }
    }
    
    fun addAssemblyToBatch(assemblyBarcode: String) {
        val userId = userData?.userId ?: return
        val cardId = userData?.cardId ?: return
        val batchId = currentBatch?.data?.id ?: return
        
        viewModelScope.launch {
            _addAssemblyState.value = AddAssemblyState.Loading
            
            repository.addAssemblyToBatch(batchId, assemblyBarcode, userId, cardId)
                .collectLatest { result ->
                    _addAssemblyState.value = result.fold(
                        onSuccess = { batchAssembly ->
                            // Reload batch assemblies to reflect the new assembly
                            loadBatchAssemblies(batchId)
                            
                            val isAlreadyAdded = batchAssembly.data.alreadyAdded == true
                            val message = if (isAlreadyAdded) {
                                "Assembly was already in this batch"
                            } else {
                                "Assembly added to batch successfully"
                            }
                            
                            AddAssemblyState.Success(batchAssembly, message)
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
                        onSuccess = { batchAssembly ->
                            // Reload batch assemblies to reflect the removal
                            currentBatch?.data?.id?.let { loadBatchAssemblies(it) }
                            
                            RemoveAssemblyState.Success(
                                batchAssembly,
                                "Assembly removed from batch successfully"
                            )
                        },
                        onFailure = { error ->
                            RemoveAssemblyState.Error(error.message ?: "Unknown error")
                        }
                    )
                }
        }
    }
    
    fun resetStates() {
        _addAssemblyState.value = AddAssemblyState.Idle
        _removeAssemblyState.value = RemoveAssemblyState.Idle
    }
    
    fun getCurrentBatch(): Batch? = currentBatch
    
    sealed class BatchState {
        object Idle : BatchState()
        object Loading : BatchState()
        data class BatchFound(val batch: Batch) : BatchState()
        data class Error(val message: String) : BatchState()
    }
    
    sealed class AddAssemblyState {
        object Idle : AddAssemblyState()
        object Loading : AddAssemblyState()
        data class Success(val batchAssembly: BatchAssembly, val message: String) : AddAssemblyState()
        data class Error(val message: String) : AddAssemblyState()
    }
    
    sealed class RemoveAssemblyState {
        object Idle : RemoveAssemblyState()
        object Loading : RemoveAssemblyState()
        data class Success(val batchAssembly: BatchAssembly, val message: String) : RemoveAssemblyState()
        data class Error(val message: String) : RemoveAssemblyState()
    }
}