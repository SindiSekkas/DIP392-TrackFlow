package com.magic.trackflow.di

import android.content.Context
import com.magic.trackflow.data.repository.TrackFlowRepository
import com.magic.trackflow.nfc.NfcManager
import com.magic.trackflow.scanner.BarcodeScanner

object AppModule {
    
    private var repository: TrackFlowRepository? = null
    private var nfcManager: NfcManager? = null
    private var barcodeScanner: BarcodeScanner? = null
    private var userPreferences: com.magic.trackflow.data.preferences.UserPreferences? = null
    
    fun provideRepository(): TrackFlowRepository {
        return repository ?: synchronized(this) {
            repository ?: TrackFlowRepository(NetworkModule.provideApiService()).also {
                repository = it
            }
        }
    }
    
    fun provideNfcManager(context: Context): NfcManager {
        return nfcManager ?: synchronized(this) {
            nfcManager ?: NfcManager(context).also {
                nfcManager = it
            }
        }
    }
    
    fun provideBarcodeScanner(): BarcodeScanner {
        return barcodeScanner ?: synchronized(this) {
            barcodeScanner ?: BarcodeScanner().also {
                barcodeScanner = it
            }
        }
    }
    
    fun provideUserPreferences(context: Context): com.magic.trackflow.data.preferences.UserPreferences {
        return userPreferences ?: synchronized(this) {
            userPreferences ?: com.magic.trackflow.data.preferences.UserPreferences(context).also {
                userPreferences = it
            }
        }
    }
    
    fun clearAll() {
        repository = null
        nfcManager = null
        barcodeScanner = null
        userPreferences = null
    }
}
