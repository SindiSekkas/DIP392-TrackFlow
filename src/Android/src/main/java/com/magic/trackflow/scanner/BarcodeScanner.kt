package com.magic.trackflow.scanner

import android.annotation.SuppressLint
import android.content.Context
import android.util.Log
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import com.google.mlkit.vision.barcode.BarcodeScanner
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class BarcodeScanner {
    
    private var cameraExecutor: ExecutorService = Executors.newSingleThreadExecutor()
    private var barcodeScanner: BarcodeScanner
    private val _processingBarcode = java.util.concurrent.atomic.AtomicBoolean(false)
    
    init {
        val options = BarcodeScannerOptions.Builder()
            .setBarcodeFormats(
                Barcode.FORMAT_CODE_128,
                Barcode.FORMAT_QR_CODE,
                Barcode.FORMAT_CODE_39,
                Barcode.FORMAT_CODE_93,
                Barcode.FORMAT_EAN_13,
                Barcode.FORMAT_EAN_8,
                Barcode.FORMAT_UPC_A,
                Barcode.FORMAT_UPC_E
            )
            .build()
        
        barcodeScanner = BarcodeScanning.getClient(options)
    }
    
    fun startCamera(
        context: Context,
        lifecycleOwner: LifecycleOwner,
        previewView: androidx.camera.view.PreviewView,
        onBarcodeDetected: (String) -> Unit
    ) {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
        
        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()
            
            val preview = Preview.Builder()
                .build()
                .also {
                    it.setSurfaceProvider(previewView.surfaceProvider)
                }
            
            val imageAnalyzer = ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build()
                .also {
                    it.setAnalyzer(cameraExecutor, BarcodeAnalyzer { barcode ->
                        onBarcodeDetected(barcode)
                    })
                }
            
            try {
                cameraProvider.unbindAll()
                
                cameraProvider.bindToLifecycle(
                    lifecycleOwner,
                    CameraSelector.DEFAULT_BACK_CAMERA,
                    preview,
                    imageAnalyzer
                )
                
            } catch (e: Exception) {
                Log.e(TAG, "Use case binding failed", e)
            }
            
        }, ContextCompat.getMainExecutor(context))
    }
    
    fun stopCamera() {
        cameraExecutor.shutdown()
    }
    
    // Reset processing state
    fun resetProcessingState() {
        _processingBarcode.set(false)
        Log.d(TAG, "Barcode processing state reset, ready for next barcode")
    }
    
    private inner class BarcodeAnalyzer(private val onBarcodeDetected: (String) -> Unit) :
        ImageAnalysis.Analyzer {
        
        private var lastAnalyzedTimestamp = 0L
        private val minimumInterval = 1000L // Increased interval to 1 second
        private var lastDetectedValue: String? = null
        // Use the shared atomic boolean
        
        @SuppressLint("UnsafeOptInUsageError")
        override fun analyze(imageProxy: ImageProxy) {
            val currentTimestamp = System.currentTimeMillis()
            val mediaImage = imageProxy.image
            
            // Skip processing if we're already handling a barcode
            if (_processingBarcode.get()) {
                imageProxy.close()
                return
            }
            
            if (mediaImage != null) {
                try {
                    val image = InputImage.fromMediaImage(
                        mediaImage,
                        imageProxy.imageInfo.rotationDegrees
                    )
                    
                    barcodeScanner.process(image)
                        .addOnSuccessListener { barcodes ->
                            if (barcodes.isNotEmpty()) {
                                Log.d(TAG, "Found ${barcodes.size} barcodes")
                                
                                // Only process the first barcode found
                                val barcode = barcodes.firstOrNull()
                                
                                barcode?.rawValue?.let { value ->
                                    Log.d(TAG, "Detected barcode: $value (format: ${barcode.format})")
                                    
                                    // Format the barcode correctly if needed
                                    // Use the raw value directly - let the app handle any conversions
                                    // This gives the app the actual scanned barcode and lets it decide
                                    // how to handle it based on its type
                                    val formattedValue = value
                                    
                                    // Only process if it's a new barcode or enough time has passed
                                    if ((formattedValue != lastDetectedValue || 
                                         currentTimestamp - lastAnalyzedTimestamp >= minimumInterval) &&
                                        !_processingBarcode.get()) {
                                        
                                        _processingBarcode.set(true)
                                        lastAnalyzedTimestamp = currentTimestamp
                                        lastDetectedValue = formattedValue
                                        
                                        Log.d(TAG, "Processing barcode: $formattedValue")
                                        onBarcodeDetected(formattedValue)
                                        
                                        // Keep the processing flag true until manually reset
                                        // This prevents further barcode detection until user interaction
                                        Log.d(TAG, "Barcode processing locked until user interaction")
                                    } else {
                                        Log.d(TAG, "Skipping duplicate barcode: $formattedValue")
                                    }
                                }
                            }
                        }
                        .addOnFailureListener { e ->
                            Log.e(TAG, "Barcode scanning failed: ${e.message}", e)
                        }
                        .addOnCompleteListener {
                            imageProxy.close()
                        }
                } catch (e: Exception) {
                    Log.e(TAG, "Error processing image for barcode scanning", e)
                    imageProxy.close()
                }
            } else {
                Log.w(TAG, "Null mediaImage received")
                imageProxy.close()
            }
        }
    }
    
    companion object {
        private const val TAG = "BarcodeScanner"
    }
}
