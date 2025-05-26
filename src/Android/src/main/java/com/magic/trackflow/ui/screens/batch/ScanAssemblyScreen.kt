package com.magic.trackflow.ui.screens.batch

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
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
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.magic.trackflow.di.AppModule
import com.magic.trackflow.util.BarcodeValidator

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScanAssemblyScreen(
    scanState: ScanAssemblyViewModel.ScanState,
    batchNumber: String,
    onBarcodeDetected: (String) -> Unit,
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
        }
    )
    
    // Request permission if needed
    LaunchedEffect(Unit) {
        if (!hasCameraPermission) {
            requestPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Scan Assembly for Batch") },
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
                            text = "Camera permission is required to scan assembly barcodes",
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
                scanState is ScanAssemblyViewModel.ScanState.Loading -> {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color.Black.copy(alpha = 0.7f)),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = Color.White)
                    }
                }
                scanState is ScanAssemblyViewModel.ScanState.Error -> {
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
                                text = (scanState as ScanAssemblyViewModel.ScanState.Error).message,
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
                    
                    // Add states to track the detected barcode
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
                                        detectedBarcode = barcode
                                    }
                                )
                                isCameraStarted = true
                            }
                        }
                    )
                    
                    // Use DisposableEffect to stop camera
                    DisposableEffect(lifecycleOwner) {
                        onDispose {
                            if (isCameraStarted) {
                                barcodeScanner.stopCamera()
                            }
                        }
                    }
                    
                    // Get scan state to determine if we're loading
                    val isLoading = scanState is ScanAssemblyViewModel.ScanState.Loading
                    
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
                                    text = "Processing assembly barcode...",
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
                                    text = "Assembly Barcode Detected",
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
                                
                                // Check if it's an assembly barcode
                                val isAssemblyBarcode = detectedBarcode?.let {
                                    BarcodeValidator.identifyCodeType(it) == BarcodeValidator.CodeType.ASSEMBLY_BARCODE
                                } ?: false
                                
                                if (!isAssemblyBarcode) {
                                    Text(
                                        text = "Warning: This doesn't appear to be an assembly barcode. Assembly barcodes should start with 'ASM-'.",
                                        color = Color.Yellow,
                                        style = MaterialTheme.typography.bodyMedium,
                                        textAlign = TextAlign.Center
                                    )
                                    
                                    Spacer(modifier = Modifier.height(16.dp))
                                }
                                
                                Row {
                                    Button(
                                        onClick = { 
                                            onBarcodeDetected(detectedBarcode!!)
                                            detectedBarcode = null
                                        },
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = MaterialTheme.colorScheme.primary,
                                            contentColor = MaterialTheme.colorScheme.onPrimary
                                        )
                                    ) {
                                        Text("Add to Batch")
                                    }
                                    
                                    Spacer(modifier = Modifier.padding(horizontal = 8.dp))
                                    
                                    TextButton(
                                        onClick = { 
                                            detectedBarcode = null
                                            barcodeScanner.resetProcessingState()
                                        }
                                    ) {
                                        Text("Cancel", color = Color.White)
                                    }
                                }
                                
                                Spacer(modifier = Modifier.height(24.dp))
                                
                                Text(
                                    text = "Adding to batch: $batchNumber",
                                    color = Color.White,
                                    style = MaterialTheme.typography.bodySmall,
                                    textAlign = TextAlign.Center
                                )
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
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(
                                    text = "Adding to batch: $batchNumber",
                                    color = Color.White,
                                    style = MaterialTheme.typography.bodyMedium,
                                    modifier = Modifier
                                        .background(
                                            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.8f),
                                            shape = MaterialTheme.shapes.small
                                        )
                                        .padding(8.dp)
                                )
                                
                                Spacer(modifier = Modifier.height(8.dp))
                                
                                Text(
                                    text = "Point camera at assembly barcode",
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
}