package com.magic.trackflow.ui.screens.scanner

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.layout.size
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat

import com.magic.trackflow.data.model.Assembly
import com.magic.trackflow.data.model.Batch
import com.magic.trackflow.di.AppModule

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BarcodeScannerScreen(
    scanState: BarcodeScannerViewModel.ScanState,
    onBarcodeDetected: (String) -> Unit,
    onAssemblyFound: (Assembly) -> Unit,
    onBatchFound: (Batch) -> Unit = {},
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    
    // Check camera permission directly
    var hasCameraPermission by remember { 
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context, 
                Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED
        ) 
    }
    
    // Use ActivityResultLauncher for permission request
    val requestPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission(),
        onResult = { isGranted ->
            hasCameraPermission = isGranted
            if (isGranted) {
                android.util.Log.d("BarcodeScannerScreen", "Camera permission granted")
            } else {
                android.util.Log.e("BarcodeScannerScreen", "Camera permission denied")
            }
        }
    )
    
    // Request permission if needed
    LaunchedEffect(Unit) {
        if (!hasCameraPermission) {
            android.util.Log.d("BarcodeScannerScreen", "Requesting camera permission")
            requestPermissionLauncher.launch(Manifest.permission.CAMERA)
        } else {
            android.util.Log.d("BarcodeScannerScreen", "Camera permission already granted")
        }
    }
    
    LaunchedEffect(scanState) {
        when (scanState) {
            is BarcodeScannerViewModel.ScanState.AssemblySuccess -> {
                onAssemblyFound(scanState.assembly)
            }
            is BarcodeScannerViewModel.ScanState.BatchSuccess -> {
                onBatchFound(scanState.batch)
            }
            else -> {
                // No action needed for other states
            }
        }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Scan Barcode") },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { innerPadding ->
        Box(
            modifier = modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            when {
                !hasCameraPermission -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            imageVector = Icons.Default.Warning,
                            contentDescription = "Camera Permission Required",
                            modifier = Modifier.padding(bottom = 16.dp),
                            tint = MaterialTheme.colorScheme.error
                        )
                        
                        Text(
                            text = "Camera permission is required to scan barcodes",
                            textAlign = TextAlign.Center,
                            style = MaterialTheme.typography.bodyLarge
                        )
                        
                        Spacer(modifier = Modifier.height(16.dp))
                        
                        Button(onClick = { 
                            requestPermissionLauncher.launch(Manifest.permission.CAMERA)
                        }) {
                            Text("Grant Permission")
                        }
                    }
                }
                scanState is BarcodeScannerViewModel.ScanState.Loading -> {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color.Black.copy(alpha = 0.7f)),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = Color.White)
                    }
                }
                scanState is BarcodeScannerViewModel.ScanState.Error -> {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color.Black.copy(alpha = 0.7f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                imageVector = Icons.Default.Warning,
                                contentDescription = "Error",
                                tint = Color.White
                            )
                            
                            Text(
                                text = (scanState as BarcodeScannerViewModel.ScanState.Error).message,
                                color = Color.White,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.padding(16.dp)
                            )
                            
                            Button(onClick = { onBackClick() }) {
                                Text("Go Back")
                            }
                        }
                    }
                }
                else -> {
                    val barcodeScanner = remember { AppModule.provideBarcodeScanner() }
                    
                    // Create a variable to track if camera is started
                    var isCameraStarted by remember { mutableStateOf(false) }
                    
                    // Add states to track the detected barcode and processing state
                    var detectedBarcode by remember { mutableStateOf<String?>(null) }
                    
                    AndroidView(
                        factory = { ctx ->
                            PreviewView(ctx).apply {
                                implementationMode = PreviewView.ImplementationMode.COMPATIBLE
                            }
                        },
                        modifier = Modifier.fillMaxSize(),
                        update = { previewView ->
                            if (!isCameraStarted) {
                                barcodeScanner.startCamera(
                                    context = context,
                                    lifecycleOwner = lifecycleOwner,
                                    previewView = previewView,
                                    onBarcodeDetected = { barcode ->
                                        // Update the UI with the detected barcode
                                        android.util.Log.d("BarcodeScannerScreen", "Barcode detected and being processed: $barcode")
                                        detectedBarcode = barcode
                                    }
                                )
                                isCameraStarted = true
                            }
                        }
                    )
                    
                    // Use DisposableEffect at the Composable level, not inside AndroidView
                    DisposableEffect(lifecycleOwner) {
                        onDispose {
                            if (isCameraStarted) {
                                barcodeScanner.stopCamera()
                            }
                        }
                    }
                    
                    // Get scan state to determine if we're loading
                    val isLoading = scanState is BarcodeScannerViewModel.ScanState.Loading
                    
                    // Show different UI based on whether a barcode has been detected
                    if (isLoading) {
                        // Show loading overlay
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(Color.Black.copy(alpha = 0.7f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                modifier = Modifier.padding(16.dp)
                            ) {
                                CircularProgressIndicator(color = Color.White)
                                
                                Spacer(modifier = Modifier.height(16.dp))
                                
                                Text(
                                    text = "Processing barcode...",
                                    color = Color.White,
                                    style = MaterialTheme.typography.bodyLarge
                                )
                            }
                        }
                    } else if (detectedBarcode != null) {
                        // Show barcode detected overlay with proceed button
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(Color.Black.copy(alpha = 0.7f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                modifier = Modifier.padding(16.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.CheckCircle,
                                    contentDescription = "Barcode Detected",
                                    tint = Color.White,
                                    modifier = Modifier.size(64.dp)
                                )
                                
                                Spacer(modifier = Modifier.height(16.dp))
                                
                                Text(
                                    text = "Barcode Detected",
                                    color = Color.White,
                                    style = MaterialTheme.typography.headlineSmall
                                )
                                
                                Spacer(modifier = Modifier.height(8.dp))
                                
                                Text(
                                    text = detectedBarcode ?: "",
                                    color = Color.White,
                                    style = MaterialTheme.typography.bodyLarge,
                                    textAlign = TextAlign.Center
                                )
                                
                                Spacer(modifier = Modifier.height(24.dp))
                                
                                Button(
                                    onClick = { 
                                        android.util.Log.d("BarcodeScannerScreen", "Proceed button clicked with barcode: ${detectedBarcode!!}")
                                        // Process the barcode and call the API
                                        onBarcodeDetected(detectedBarcode!!)
                                        // Show loading state while processing
                                        detectedBarcode = null
                                    },
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = MaterialTheme.colorScheme.primary,
                                        contentColor = MaterialTheme.colorScheme.onPrimary
                                    )
                                ) {
                                    Text("Proceed")
                                }
                                
                                Spacer(modifier = Modifier.height(16.dp))
                                
                                TextButton(
                                    onClick = { 
                                        detectedBarcode = null
                                        // Reset the barcode scanner processing state
                                        barcodeScanner.resetProcessingState()
                                    }
                                ) {
                                    Text("Cancel", color = Color.White)
                                }
                            }
                        }
                    } else {
                        // Show the standard camera overlay
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(16.dp),
                            contentAlignment = Alignment.BottomCenter
                        ) {
                            Text(
                                text = "Point camera at barcode",
                                color = Color.White,
                                style = MaterialTheme.typography.bodyLarge,
                                modifier = Modifier
                                    .background(
                                        color = Color.Black.copy(alpha = 0.6f),
                                        shape = MaterialTheme.shapes.small
                                    )
                                    .padding(8.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}
