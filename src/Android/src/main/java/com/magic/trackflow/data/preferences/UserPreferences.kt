package com.magic.trackflow.data.preferences

import android.content.Context
import android.content.SharedPreferences
import com.magic.trackflow.data.model.UserData
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory

class UserPreferences(context: Context) {
    
    private val prefs: SharedPreferences = context.getSharedPreferences(
        PREFS_NAME, Context.MODE_PRIVATE
    )
    
    private val moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()
    
    private val userDataAdapter = moshi.adapter(UserData::class.java)
    
    fun saveUserData(userData: UserData) {
        val userDataJson = userDataAdapter.toJson(userData)
        prefs.edit().putString(KEY_USER_DATA, userDataJson).apply()
        android.util.Log.d(TAG, "User data saved to preferences: ${userData.fullName}")
    }
    
    fun getUserData(): UserData? {
        val userDataJson = prefs.getString(KEY_USER_DATA, null) ?: return null
        return try {
            val userData = userDataAdapter.fromJson(userDataJson)
            android.util.Log.d(TAG, "User data retrieved from preferences: ${userData?.fullName}")
            userData
        } catch (e: Exception) {
            android.util.Log.e(TAG, "Error parsing user data from preferences", e)
            null
        }
    }
    
    fun clearUserData() {
        prefs.edit().remove(KEY_USER_DATA).apply()
        android.util.Log.d(TAG, "User data cleared from preferences")
    }
    
    companion object {
        private const val TAG = "UserPreferences"
        private const val PREFS_NAME = "trackflow_prefs"
        private const val KEY_USER_DATA = "user_data"
    }
}
