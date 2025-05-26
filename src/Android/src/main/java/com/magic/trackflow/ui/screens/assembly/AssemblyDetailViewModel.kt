package com.magic.trackflow.ui.screens.assembly

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.magic.trackflow.data.model.Assembly
import com.magic.trackflow.data.model.AssemblyStatus
import com.magic.trackflow.data.model.StatusUpdateResponse
import com.magic.trackflow.data.model.UserData
import com.magic.trackflow.data.repository.TrackFlowRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class AssemblyDetailViewModel(
    private val repository: TrackFlowRepository
) : ViewModel() {
    
    private val _assemblyState = MutableStateFlow<AssemblyState>(AssemblyState.Idle)
    val assemblyState: StateFlow<AssemblyState> = _assemblyState.asStateFlow()
    
    private val _updateState = MutableStateFlow<UpdateState>(UpdateState.Idle)
    val updateState: StateFlow<UpdateState> = _updateState.asStateFlow()
    
    private var userData: UserData? = null
    // Made public so MainActivity can access the assembly data if needed
    // Using a different name to avoid JVM signature clash with setAssembly method
    var assemblyData: Assembly? = null
    
    fun setUserData(userData: UserData) {
        this.userData = userData
    }
    
    fun setAssembly(assembly: Assembly) {
        this.assemblyData = assembly
        _assemblyState.value = AssemblyState.Loaded(assembly)
    }
    
    fun loadAssembly(assemblyId: String) {
        val userId = userData?.userId
        if (userId == null) {
            _assemblyState.value = AssemblyState.Error("User data not available")
            return
        }
        
        _assemblyState.value = AssemblyState.Loading
        
        viewModelScope.launch {
            try {
                // Use getAssemblyByBarcode since the API only supports barcode lookups
                repository.getAssemblyByBarcode(assemblyId, userId).collectLatest { result ->
                    result.fold(
                        onSuccess = { assembly ->
                            this@AssemblyDetailViewModel.assemblyData = assembly
                            _assemblyState.value = AssemblyState.Loaded(assembly)
                        },
                        onFailure = { error ->
                            android.util.Log.e("AssemblyDetailVM", "Error loading assembly: ${error.message}", error)
                            _assemblyState.value = AssemblyState.Error(error.message ?: "Unknown error")
                        }
                    )
                }
            } catch (e: Exception) {
                android.util.Log.e("AssemblyDetailVM", "Exception loading assembly", e)
                _assemblyState.value = AssemblyState.Error("Failed to load assembly: ${e.message}")
            }
        }
    }
    
    fun updateAssemblyStatus(status: String) {
        val userId = userData?.userId ?: return
        val cardId = userData?.cardId ?: return
        val assemblyId = assemblyData?.data?.id ?: return
        val workerType = userData?.workerType ?: return
        
        // Validate if worker has permission to update to this status
        if (!AssemblyStatus.canWorkerChangeToStatus(workerType, status)) {
            _updateState.value = UpdateState.Error("You don't have permission to change assembly to $status status")
            return
        }
        
        viewModelScope.launch {
            _updateState.value = UpdateState.Loading
            
            repository.updateAssemblyStatus(assemblyId, status, userId, cardId)
                .collectLatest { result ->
                    _updateState.value = result.fold(
                        onSuccess = { response ->
                            // Update the local assembly status
                            assemblyData = assemblyData?.copy(
                                data = assemblyData?.data?.copy(status = status) ?: assemblyData?.data!!
                            )
                            UpdateState.Success(response)
                        },
                        onFailure = { error ->
                            UpdateState.Error(error.message ?: "Unknown error")
                        }
                    )
                }
        }
    }
    
    fun getAvailableStatuses(): List<String> {
        val workerType = userData?.workerType
        return if (workerType != null) {
            // Filter statuses based on worker type
            AssemblyStatus.workerTypePermissions[workerType] ?: AssemblyStatus.values
        } else {
            AssemblyStatus.values
        }
    }
    
    fun resetUpdateState() {
        _updateState.value = UpdateState.Idle
    }
    
    sealed class AssemblyState {
        object Idle : AssemblyState()
        object Loading : AssemblyState()
        data class Loaded(val assembly: Assembly) : AssemblyState()
        data class Error(val message: String) : AssemblyState()
    }
    
    sealed class UpdateState {
        object Idle : UpdateState()
        object Loading : UpdateState()
        data class Success(val response: StatusUpdateResponse) : UpdateState()
        data class Error(val message: String) : UpdateState()
    }
}
