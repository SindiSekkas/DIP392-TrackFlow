package com.magic.trackflow.data.network

import com.magic.trackflow.data.model.Assembly
import com.magic.trackflow.data.model.Batch
import com.magic.trackflow.data.model.BatchAssembly
import com.magic.trackflow.data.model.BatchAssemblyRequest
import com.magic.trackflow.data.model.BatchValidationRequest
import com.magic.trackflow.data.model.GetBatchAssembliesRequest
import com.magic.trackflow.data.model.GetQcImagesRequest
import com.magic.trackflow.data.model.NfcValidationRequest
import com.magic.trackflow.data.model.NfcValidationResponse
import com.magic.trackflow.data.model.QcImage
import com.magic.trackflow.data.model.QcNotesRequest
import com.magic.trackflow.data.model.QcNotesResponse
import com.magic.trackflow.data.model.RemoveBatchAssemblyRequest
import com.magic.trackflow.data.model.StatusUpdateRequest
import com.magic.trackflow.data.model.StatusUpdateResponse
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Path
import retrofit2.http.Query

interface ApiService {
    companion object {
        // Note that the API documentation defines the base URL without the trailing /api/
        // Fixing to match the documentation
        const val BASE_URL = "https://api.trackflow.pl/"
    }
    
    @POST("api/nfc/validate")
    suspend fun validateNfcCard(@Body request: NfcValidationRequest): Response<NfcValidationResponse>
    
    @GET("api/mobile/assemblies/barcode/{barcode}")
    suspend fun getAssemblyByBarcode(
        @Path("barcode") barcode: String,
        @Query("userId") userId: String
    ): Response<Assembly>
    
    // CRITICAL FIX: This endpoint doesn't exist in the API docs
    // Removing this method to prevent any calls to a non-existent endpoint
    // All assembly lookups should use the barcode endpoint only
    
    @POST("api/mobile/assemblies/status")
    suspend fun updateAssemblyStatus(@Body request: StatusUpdateRequest): Response<StatusUpdateResponse>
    
    // QC endpoints
    @Multipart
    @POST("api/mobile/assemblies/{assemblyId}/qc-upload")
    suspend fun uploadQcImage(
        @Path("assemblyId") assemblyId: String,
        @Part image: MultipartBody.Part,
        @Part("qcStatus") qcStatus: RequestBody,
        @Part("notes") notes: RequestBody,
        @Part("userId") userId: RequestBody,
        @Part("cardId") cardId: RequestBody,
        @Part("deviceInfo") deviceInfo: RequestBody
    ): Response<Any>
    
    @POST("api/mobile/assemblies/{assemblyId}/qc-notes")
    suspend fun updateQcNotes(
        @Path("assemblyId") assemblyId: String,
        @Body request: QcNotesRequest
    ): Response<QcNotesResponse>
    
    @POST("api/mobile/assemblies/{assemblyId}/qc-images")
    suspend fun getQcImages(
        @Path("assemblyId") assemblyId: String,
        @Body request: GetQcImagesRequest
    ): Response<List<QcImage>>
    
    // Logistics endpoints
    @POST("api/mobile/logistics/batches/validate")
    suspend fun validateBatchBarcode(
        @Body request: BatchValidationRequest
    ): Response<Batch>
    
    @POST("api/mobile/logistics/batches/add-assembly")
    suspend fun addAssemblyToBatch(
        @Body request: BatchAssemblyRequest
    ): Response<BatchAssembly>
    
    @POST("api/mobile/logistics/batches/{batchId}/assemblies")
    suspend fun getBatchAssemblies(
        @Path("batchId") batchId: String,
        @Body request: GetBatchAssembliesRequest
    ): Response<Batch>
    
    @DELETE("api/mobile/logistics/batch-assemblies/{batchAssemblyId}")
    suspend fun removeAssemblyFromBatch(
        @Path("batchAssemblyId") batchAssemblyId: String,
        @Body request: RemoveBatchAssemblyRequest
    ): Response<BatchAssembly>
}
