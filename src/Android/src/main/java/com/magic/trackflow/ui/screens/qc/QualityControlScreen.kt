package com.magic.trackflow.ui.screens.qc

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Environment
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Camera
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider

import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QualityControlScreen(
    qcState: QualityControlViewModel.QcState,
    qcNotesState: QualityControlViewModel.QcNotesState,
    qcStatusOptions: List<String>,
    onImageUpload: (File, String, String) -> Unit,
    onUpdateQcNotes: (String, String) -> Unit,
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val snackbarHostState = remember { SnackbarHostState() }
    
    var qcStatus by remember { mutableStateOf("") }
    var qcNotes by remember { mutableStateOf("") }
    var isStatusExpanded by remember { mutableStateOf(false) }
    var photoFile by remember { mutableStateOf<File?>(null) }
    var photoUri by remember { mutableStateOf<Uri?>(null) }
    
    // Check permissions directly
    var hasCameraPermission by remember { 
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context, 
                Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED
        ) 
    }
    
    var hasStoragePermission by remember { 
        mutableStateOf(
            android.os.Build.VERSION.SDK_INT >= 29 || 
            ContextCompat.checkSelfPermission(
                context, 
                Manifest.permission.WRITE_EXTERNAL_STORAGE
            ) == PackageManager.PERMISSION_GRANTED
        ) 
    }
    
    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicture(),
        onResult = { success ->
            if (success) {
                // Photo was taken successfully
            }
        }
    )
    
    // Request permissions launcher
    val requestPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions(),
        onResult = { permissions ->
            hasCameraPermission = permissions[Manifest.permission.CAMERA] ?: hasCameraPermission
            if (android.os.Build.VERSION.SDK_INT < 29) {
                hasStoragePermission = permissions[Manifest.permission.WRITE_EXTERNAL_STORAGE] 
                    ?: hasStoragePermission
            }
        }
    )
    
    // Handle image upload state
    LaunchedEffect(qcState) {
        when (qcState) {
            is QualityControlViewModel.QcState.Success -> {
                snackbarHostState.showSnackbar("Image upload successful: ${qcState.message}")
                // After successful image upload, trigger the notes update
                if (qcStatus.isNotEmpty()) {
                    onUpdateQcNotes(qcStatus, qcNotes)
                }
            }
            is QualityControlViewModel.QcState.Error -> {
                snackbarHostState.showSnackbar("Image upload error: ${qcState.message}")
            }
            else -> {}
        }
    }
    
    // Handle QC notes update state separately
    LaunchedEffect(qcNotesState) {
        when (qcNotesState) {
            is QualityControlViewModel.QcNotesState.Success -> {
                snackbarHostState.showSnackbar("Status update successful: ${qcNotesState.message}")
                // Reset form after the complete QC process is done
                qcStatus = ""
                qcNotes = ""
                photoFile = null
                photoUri = null
            }
            is QualityControlViewModel.QcNotesState.Error -> {
                snackbarHostState.showSnackbar("Status update error: ${qcNotesState.message}")
            }
            else -> {}
        }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Quality Control") },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(hostState = snackbarHostState) }
    ) { innerPadding ->
        Column(
            modifier = modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            Card(
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                ) {
                    Text(
                        text = "Quality Control Status",
                        style = MaterialTheme.typography.titleMedium
                    )
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    ExposedDropdownMenuBox(
                        expanded = isStatusExpanded,
                        onExpandedChange = { isStatusExpanded = it }
                    ) {
                        TextField(
                            value = qcStatus,
                            onValueChange = {},
                            readOnly = true,
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = isStatusExpanded) },
                            colors = ExposedDropdownMenuDefaults.textFieldColors(),
                            modifier = Modifier
                                .fillMaxWidth()
                                .menuAnchor()
                        )
                        
                        ExposedDropdownMenu(
                            expanded = isStatusExpanded,
                            onDismissRequest = { isStatusExpanded = false }
                        ) {
                            qcStatusOptions.forEach { option ->
                                DropdownMenuItem(
                                    text = { Text(option) },
                                    onClick = {
                                        qcStatus = option
                                        isStatusExpanded = false
                                    }
                                )
                            }
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    Text(
                        text = "Quality Control Notes",
                        style = MaterialTheme.typography.titleMedium
                    )
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    OutlinedTextField(
                        value = qcNotes,
                        onValueChange = { qcNotes = it },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(120.dp),
                        placeholder = { Text("Enter quality control notes here...") }
                    )
                    
                    Spacer(modifier = Modifier.height(24.dp))
                    
                    Button(
                        onClick = {
                            if (hasCameraPermission && hasStoragePermission) {
                                photoFile = createImageFile(context)
                                val uri = FileProvider.getUriForFile(
                                    context,
                                    "${context.packageName}.fileprovider",
                                    photoFile!!
                                )
                                photoUri = uri
                                cameraLauncher.launch(uri)
                            } else {
                                // Request permissions
                                val permissionsToRequest = mutableListOf(Manifest.permission.CAMERA)
                                if (android.os.Build.VERSION.SDK_INT < 29) {
                                    permissionsToRequest.add(Manifest.permission.WRITE_EXTERNAL_STORAGE)
                                }
                                requestPermissionLauncher.launch(permissionsToRequest.toTypedArray())
                            }
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(
                            imageVector = Icons.Default.Camera,
                            contentDescription = "Take Photo"
                        )
                        Text(
                            text = "Capture QC Image",
                            modifier = Modifier.padding(start = 8.dp)
                        )
                    }
                    
                    Spacer(modifier = Modifier.height(24.dp))
                    
                    Button(
                        onClick = {
                            photoFile?.let { file ->
                                // First step: upload the image with QC data
                                onImageUpload(file, qcStatus, qcNotes)
                                // Second step: updateQcNotes will be called automatically from LaunchedEffect
                                // after successful image upload
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        enabled = photoFile != null && qcStatus.isNotEmpty() && 
                                qcState !is QualityControlViewModel.QcState.Loading &&
                                qcNotesState !is QualityControlViewModel.QcNotesState.Loading
                    ) {
                        if (qcState is QualityControlViewModel.QcState.Loading || 
                            qcNotesState is QualityControlViewModel.QcNotesState.Loading) {
                            CircularProgressIndicator(
                                modifier = Modifier.padding(end = 8.dp),
                                color = MaterialTheme.colorScheme.onPrimary,
                                strokeWidth = 2.dp
                            )
                        }
                        Text("Submit QC Report")
                    }
                    
                    if (photoFile == null) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Please take a photo before submitting",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error
                        )
                    }
                }
            }
            
            if (qcState is QualityControlViewModel.QcState.Loading || 
               qcNotesState is QualityControlViewModel.QcNotesState.Loading) {
                Box(
                    modifier = Modifier.fillMaxWidth(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        CircularProgressIndicator(
                            modifier = Modifier.padding(16.dp)
                        )
                        
                        val loadingText = when {
                            qcState is QualityControlViewModel.QcState.Loading -> "Uploading image..."
                            qcNotesState is QualityControlViewModel.QcNotesState.Loading -> "Updating QC status..."
                            else -> "Processing..."
                        }
                        
                        Text(
                            text = loadingText,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            }
        }
    }
}

private fun createImageFile(context: Context): File {
    val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
    val storageDir = context.getExternalFilesDir(Environment.DIRECTORY_PICTURES)
    return File.createTempFile(
        "JPEG_${timeStamp}_",
        ".jpg",
        storageDir
    )
}
