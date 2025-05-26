package com.magic.trackflow.ui.screens.home

import androidx.lifecycle.ViewModel
import com.magic.trackflow.data.model.UserData

class HomeViewModel(
    private val userPreferences: com.magic.trackflow.data.preferences.UserPreferences
) : ViewModel() {
    
    private var userData: UserData? = null
    
    init {
        // Try to load user data from preferences
        userData = userPreferences.getUserData()
    }
    
    fun setUserData(userData: UserData) {
        this.userData = userData
        userPreferences.saveUserData(userData)
    }
    
    fun getUserData(): UserData? = userData
    
    fun getUserName(): String = userData?.fullName ?: "User"
    
    fun getUserRole(): String = userData?.workerType?.capitalize() ?: "Worker"
}

private fun String.capitalize(): String {
    return this.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
}
