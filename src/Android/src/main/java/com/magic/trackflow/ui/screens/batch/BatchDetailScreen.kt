package com.magic.trackflow.ui.screens.batch

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Divider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.magic.trackflow.data.model.BatchAssemblyItem
import com.magic.trackflow.data.model.BatchData
import com.magic.trackflow.data.model.NullableDimensions

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BatchDetailScreen(
    batchState: BatchDetailViewModel.BatchState,
    addAssemblyState: BatchDetailViewModel.AddAssemblyState,
    removeAssemblyState: BatchDetailViewModel.RemoveAssemblyState,
    onRefresh: () -> Unit,
    onScanAssembly: () -> Unit,
    onRemoveAssembly: (String) -> Unit,
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val snackbarHostState = remember { SnackbarHostState() }
    
    // Monitor add/remove assembly states and show appropriate snackbars
    LaunchedEffect(addAssemblyState) {
        when (addAssemblyState) {
            is BatchDetailViewModel.AddAssemblyState.Success -> {
                val message = if (addAssemblyState.alreadyAdded) {
                    "Assembly ${addAssemblyState.assemblyName} was already in this batch"
                } else {
                    "Assembly ${addAssemblyState.assemblyName} added to batch"
                }
                snackbarHostState.showSnackbar(message)
                // Refresh the batch assemblies list
                onRefresh()
            }
            is BatchDetailViewModel.AddAssemblyState.Error -> {
                snackbarHostState.showSnackbar("Error: ${addAssemblyState.message}")
            }
            else -> {}
        }
    }
    
    LaunchedEffect(removeAssemblyState) {
        when (removeAssemblyState) {
            is BatchDetailViewModel.RemoveAssemblyState.Success -> {
                snackbarHostState.showSnackbar("Assembly removed from batch")
                // Refresh the batch assemblies list
                onRefresh()
            }
            is BatchDetailViewModel.RemoveAssemblyState.Error -> {
                snackbarHostState.showSnackbar("Error: ${removeAssemblyState.message}")
            }
            else -> {}
        }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Batch Details") },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = onScanAssembly,
                containerColor = MaterialTheme.colorScheme.primary
            ) {
                Icon(
                    imageVector = Icons.Default.QrCodeScanner,
                    contentDescription = "Scan Assembly"
                )
            }
        },
        snackbarHost = { SnackbarHost(hostState = snackbarHostState) }
    ) { innerPadding ->
        when (batchState) {
            is BatchDetailViewModel.BatchState.Loading -> {
                LoadingScreen(modifier.padding(innerPadding))
            }
            is BatchDetailViewModel.BatchState.Success -> {
                BatchContent(
                    batchData = batchState.batch,
                    assemblyItems = batchState.batch.assemblies ?: emptyList(),
                    onRemoveAssembly = onRemoveAssembly,
                    modifier = modifier.padding(innerPadding)
                )
            }
            is BatchDetailViewModel.BatchState.Error -> {
                ErrorScreen(
                    message = batchState.message,
                    onRetry = onRefresh,
                    onScanBarcode = onScanAssembly,
                    modifier = modifier.padding(innerPadding)
                )
            }
            else -> {
                // Idle state
                Box(
                    modifier = modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                    contentAlignment = Alignment.Center
                ) {
                    Text("Loading batch information...")
                }
            }
        }
    }
}

@Composable
private fun BatchContent(
    batchData: BatchData,
    assemblyItems: List<BatchAssemblyItem>,
    onRemoveAssembly: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        item {
            BatchInfoCard(batchData)
            Spacer(modifier = Modifier.height(16.dp))
            
            Text(
                text = "Assemblies (${batchData.assemblyCount})",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(8.dp))
        }
        
        if (assemblyItems.isEmpty()) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            imageVector = Icons.Default.Add,
                            contentDescription = null,
                            modifier = Modifier.size(48.dp),
                            tint = MaterialTheme.colorScheme.primary.copy(alpha = 0.5f)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "No assemblies in this batch yet",
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Use the scan button to add assemblies",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                        )
                    }
                }
            }
        } else {
            items(assemblyItems) { item ->
                AssemblyItemCard(
                    assemblyItem = item,
                    onRemove = { onRemoveAssembly(item.id) }
                )
                Spacer(modifier = Modifier.height(8.dp))
            }
        }
    }
}

@Composable
private fun BatchInfoCard(batchData: BatchData) {
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Text(
                text = batchData.batchNumber,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
            
            Spacer(modifier = Modifier.height(4.dp))
            
            Text(
                text = "Status: ${batchData.status}",
                style = MaterialTheme.typography.bodyMedium
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            Divider()
            Spacer(modifier = Modifier.height(8.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Client",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                    )
                    Text(
                        text = batchData.client,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
                
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Project",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                    )
                    Text(
                        text = batchData.project,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Delivery Address",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                    )
                    Text(
                        text = batchData.deliveryAddress ?: "Not specified",
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
                
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Total Weight",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                    )
                    Text(
                        text = if (batchData.totalWeight != null) "${batchData.totalWeight} kg" else "Not specified",
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AssemblyItemCard(
    assemblyItem: BatchAssemblyItem,
    onRemove: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    text = assemblyItem.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                
                Spacer(modifier = Modifier.height(4.dp))
                
                Text(
                    text = "Status: ${assemblyItem.status}",
                    style = MaterialTheme.typography.bodyMedium
                )
                
                Spacer(modifier = Modifier.height(4.dp))
                
                Text(
                    text = "Weight: ${assemblyItem.weight} kg",
                    style = MaterialTheme.typography.bodySmall
                )
                
                if (assemblyItem.paintingSpec != null) {
                    Spacer(modifier = Modifier.height(4.dp))
                    
                    Text(
                        text = "Painting Spec: ${assemblyItem.paintingSpec}",
                        style = MaterialTheme.typography.bodySmall
                    )
                }
                
                Spacer(modifier = Modifier.height(4.dp))
                
                Text(
                    text = "Added: ${assemblyItem.addedAt}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                )
            }
            
            IconButton(onClick = onRemove) {
                Icon(
                    Icons.Default.Delete,
                    contentDescription = "Remove assembly",
                    tint = MaterialTheme.colorScheme.error
                )
            }
        }
    }
}

@Composable
private fun LoadingScreen(modifier: Modifier = Modifier) {
    Box(
        modifier = modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            CircularProgressIndicator()
            Spacer(modifier = Modifier.height(16.dp))
            Text("Loading batch details...")
        }
    }
}

@Composable
private fun ErrorScreen(
    message: String,
    onRetry: () -> Unit,
    onScanBarcode: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = "Error Loading Batch",
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.error
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = message,
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Row(
                horizontalArrangement = Arrangement.Center,
                modifier = Modifier.fillMaxWidth()
            ) {
                Button(onClick = onRetry) {
                    Text("Retry")
                }
                
                Spacer(modifier = Modifier.width(8.dp))
                
                Button(
                    onClick = onScanBarcode,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.secondary
                    )
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.QrCodeScanner,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Scan Barcode")
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Text(
                text = "If you are having trouble loading this batch, try scanning the batch barcode again.",
                style = MaterialTheme.typography.bodySmall,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
            )
        }
    }
}