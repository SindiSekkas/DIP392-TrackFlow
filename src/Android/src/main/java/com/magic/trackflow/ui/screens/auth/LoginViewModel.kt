package com.magic.trackflow.ui.screens.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.magic.trackflow.data.model.UserData
import com.magic.trackflow.data.repository.TrackFlowRepository
import com.magic.trackflow.nfc.NfcManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class LoginViewModel(
    private val repository: TrackFlowRepository,
    private val nfcManager: NfcManager,
    private val userPreferences: com.magic.trackflow.data.preferences.UserPreferences
) : ViewModel() {
    
    private val _loginState = MutableStateFlow<LoginState>(LoginState.Idle)
    val loginState: StateFlow<LoginState> = _loginState.asStateFlow()
    
    init {
        observeNfcState()
    }
    
    private fun observeNfcState() {
        viewModelScope.launch {
            nfcManager.nfcState.collectLatest { state ->
                when (state) {
                    is NfcManager.NfcState.CardDetected -> {
                        validateNfcCard(state.cardId)
                    }
                    is NfcManager.NfcState.Error -> {
                        _loginState.value = LoginState.Error(state.message)
                    }
                    else -> {
                        // Do nothing
                    }
                }
            }
        }
    }
    
    private fun validateNfcCard(cardId: String) {
        viewModelScope.launch {
            _loginState.value = LoginState.Loading
            
            repository.validateNfcCard(cardId).collectLatest { result ->
                _loginState.value = result.fold(
                    onSuccess = { userData ->
                        // Save user data to preferences
                        userPreferences.saveUserData(userData)
                        LoginState.Success(userData)
                    },
                    onFailure = { error ->
                        LoginState.Error(error.message ?: "Unknown error")
                    }
                )
            }
        }
    }
    
    sealed class LoginState {
        object Idle : LoginState()
        object Loading : LoginState()
        data class Success(val userData: UserData) : LoginState()
        data class Error(val message: String) : LoginState()
    }
}
