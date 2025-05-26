package com.magic.trackflow.data.model

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class QcNotesRequest(
    val qcStatus: String,
    val notes: String,
    val userId: String,
    val cardId: String,
    val deviceInfo: DeviceInfo
)

@JsonClass(generateAdapter = true)
data class QcNotesResponse(
    val data: QcNotesData,
    val message: String
)

@JsonClass(generateAdapter = true)
data class QcNotesData(
    @Json(name = "assembly_id") val assemblyId: String,
    @Json(name = "quality_control_status") val qualityControlStatus: String,
    @Json(name = "quality_control_notes") val qualityControlNotes: String
)

@JsonClass(generateAdapter = true)
data class GetQcImagesRequest(
    val userId: String,
    val cardId: String
)

@JsonClass(generateAdapter = true)
data class QcImage(
    val id: String,
    @Json(name = "assembly_id") val assemblyId: String,
    @Json(name = "image_path") val imagePath: String,
    @Json(name = "file_name") val fileName: String,
    @Json(name = "file_size") val fileSize: Long,
    @Json(name = "content_type") val contentType: String,
    val notes: String,
    @Json(name = "qc_status") val qcStatus: String,
    @Json(name = "created_by") val createdBy: String,
    @Json(name = "created_at") val createdAt: String,
    @Json(name = "image_url") val imageUrl: String,
    @Json(name = "created_by_info") val createdByInfo: QcImageCreatedBy
)

@JsonClass(generateAdapter = true)
data class QcImageCreatedBy(
    val id: String,
    val email: String,
    val name: String
)

object QcStatus {
    const val NOT_STARTED = "Not Started"
    const val IN_PROGRESS = "In Progress"
    const val PASSED = "Passed"
    const val FAILED = "Failed"
    const val CONDITIONAL_PASS = "Conditional Pass"
    
    val values = listOf(NOT_STARTED, IN_PROGRESS, PASSED, FAILED, CONDITIONAL_PASS)
}