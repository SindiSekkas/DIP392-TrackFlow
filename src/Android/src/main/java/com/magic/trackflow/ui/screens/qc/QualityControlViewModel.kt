package com.magic.trackflow.ui.screens.qc

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.magic.trackflow.data.model.Assembly
import com.magic.trackflow.data.model.QcImage
import com.magic.trackflow.data.model.QcStatus
import com.magic.trackflow.data.model.UserData
import com.magic.trackflow.data.repository.TrackFlowRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import java.io.File

class QualityControlViewModel(
    private val repository: TrackFlowRepository
) : ViewModel() {
    
    private val _qcState = MutableStateFlow<QcState>(QcState.Idle)
    val qcState: StateFlow<QcState> = _qcState.asStateFlow()
    
    private val _qcImagesState = MutableStateFlow<QcImagesState>(QcImagesState.Idle)
    val qcImagesState: StateFlow<QcImagesState> = _qcImagesState.asStateFlow()
    
    private val _qcNotesState = MutableStateFlow<QcNotesState>(QcNotesState.Idle)
    val qcNotesState: StateFlow<QcNotesState> = _qcNotesState.asStateFlow()
    
    private var userData: UserData? = null
    private var assembly: Assembly? = null
    
    fun setUserData(userData: UserData) {
        this.userData = userData
    }
    
    fun setAssembly(assembly: Assembly) {
        this.assembly = assembly
    }
    
    fun uploadQcImage(imageFile: File, qcStatus: String, notes: String) {
        val userId = userData?.userId ?: return
        val cardId = userData?.cardId ?: return
        val assemblyId = assembly?.data?.id ?: return
        
        viewModelScope.launch {
            _qcState.value = QcState.Loading
            
            repository.uploadQcImage(assemblyId, imageFile, qcStatus, notes, userId, cardId)
                .collectLatest { result ->
                    _qcState.value = result.fold(
                        onSuccess = {
                            QcState.Success("QC image uploaded successfully")
                        },
                        onFailure = { error ->
                            QcState.Error(error.message ?: "Unknown error")
                        }
                    )
                }
        }
    }
    
    fun getQcStatusOptions(): List<String> {
        return QcStatus.values
    }
    
    fun updateQcNotes(qcStatus: String, notes: String) {
        val userId = userData?.userId ?: return
        val cardId = userData?.cardId ?: return
        val assemblyId = assembly?.data?.id ?: return
        
        viewModelScope.launch {
            _qcNotesState.value = QcNotesState.Loading
            
            repository.updateQcNotes(assemblyId, qcStatus, notes, userId, cardId)
                .collectLatest { result ->
                    _qcNotesState.value = result.fold(
                        onSuccess = { response ->
                            // Update local assembly data with new QC status and notes
                            assembly = assembly?.copy(
                                data = assembly?.data?.copy(
                                    qualityControlStatus = qcStatus,
                                    qualityControlNotes = notes
                                ) ?: assembly?.data!!
                            )
                            QcNotesState.Success(response.message)
                        },
                        onFailure = { error ->
                            QcNotesState.Error(error.message ?: "Unknown error")
                        }
                    )
                }
        }
    }
    
    fun loadQcImages() {
        val userId = userData?.userId ?: return
        val cardId = userData?.cardId ?: return
        val assemblyId = assembly?.data?.id ?: return
        
        viewModelScope.launch {
            _qcImagesState.value = QcImagesState.Loading
            
            repository.getQcImages(assemblyId, userId, cardId)
                .collectLatest { result ->
                    _qcImagesState.value = result.fold(
                        onSuccess = { images ->
                            QcImagesState.Success(images)
                        },
                        onFailure = { error ->
                            QcImagesState.Error(error.message ?: "Unknown error")
                        }
                    )
                }
        }
    }
    
    fun resetState() {
        _qcState.value = QcState.Idle
        _qcNotesState.value = QcNotesState.Idle
        _qcImagesState.value = QcImagesState.Idle
    }
    
    sealed class QcState {
        object Idle : QcState()
        object Loading : QcState()
        data class Success(val message: String) : QcState()
        data class Error(val message: String) : QcState()
    }
    
    sealed class QcImagesState {
        object Idle : QcImagesState()
        object Loading : QcImagesState()
        data class Success(val images: List<QcImage>) : QcImagesState()
        data class Error(val message: String) : QcImagesState()
    }
    
    sealed class QcNotesState {
        object Idle : QcNotesState()
        object Loading : QcNotesState()
        data class Success(val message: String) : QcNotesState()
        data class Error(val message: String) : QcNotesState()
    }
}
