package com.magic.trackflow.data.model

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass
import android.os.Parcel
import android.os.Parcelable

@JsonClass(generateAdapter = true)
data class BatchValidationRequest(
    val barcode: String,
    val userId: String,
    val deviceInfo: DeviceInfo
)

@JsonClass(generateAdapter = true)
data class Batch(
    val data: BatchData
) : Parcelable {
    constructor(parcel: Parcel) : this(
        data = parcel.readParcelable(BatchData::class.java.classLoader) ?: BatchData(
            id = "",
            batchId = "",
            batchNumber = "",
            status = "",
            client = "",
            project = "",
            projectId = "",
            deliveryAddress = null,
            totalWeight = null,
            assemblyCount = 0,
            assemblies = null
        )
    )

    override fun writeToParcel(parcel: Parcel, flags: Int) {
        parcel.writeParcelable(data, flags)
    }

    override fun describeContents(): Int {
        return 0
    }

    companion object CREATOR : Parcelable.Creator<Batch> {
        override fun createFromParcel(parcel: Parcel): Batch {
            return Batch(parcel)
        }

        override fun newArray(size: Int): Array<Batch?> {
            return arrayOfNulls(size)
        }
    }
}

@JsonClass(generateAdapter = true)
data class BatchData(
    @Json(name = "id") val id: String = "", // Handle case where field is named 'id'
    @Json(name = "batch_id") val batchId: String = "", // Handle case where field is named 'batch_id'
    @Json(name = "batch_number") val batchNumber: String,
    val status: String,
    val client: String,
    val project: String = "Unknown Project",
    @Json(name = "project_id") val projectId: String = "",
    @Json(name = "delivery_address") val deliveryAddress: String?,
    @Json(name = "total_weight") val totalWeight: Double?,
    @Json(name = "assembly_count") val assemblyCount: Int,
    val assemblies: List<BatchAssemblyItem>? = null
) : Parcelable {
    // Helper property to get the batch ID regardless of which field is populated
    val effectiveId: String
        get() = if (id.isNotEmpty()) id else batchId
    constructor(parcel: Parcel) : this(
        id = parcel.readString() ?: "",
        batchId = parcel.readString() ?: "",
        batchNumber = parcel.readString() ?: "",
        status = parcel.readString() ?: "",
        client = parcel.readString() ?: "",
        project = parcel.readString() ?: "",
        projectId = parcel.readString() ?: "",
        deliveryAddress = parcel.readString(),
        totalWeight = if (parcel.readByte() == 0.toByte()) null else parcel.readDouble(),
        assemblyCount = parcel.readInt(),
        assemblies = parcel.createTypedArrayList(BatchAssemblyItem.CREATOR)
    )

    override fun writeToParcel(parcel: Parcel, flags: Int) {
        parcel.writeString(id)
        parcel.writeString(batchId)
        parcel.writeString(batchNumber)
        parcel.writeString(status)
        parcel.writeString(client)
        parcel.writeString(project)
        parcel.writeString(projectId)
        parcel.writeString(deliveryAddress)
        if (totalWeight == null) {
            parcel.writeByte(0)
        } else {
            parcel.writeByte(1)
            parcel.writeDouble(totalWeight)
        }
        parcel.writeInt(assemblyCount)
        parcel.writeTypedList(assemblies)
    }

    override fun describeContents(): Int {
        return 0
    }

    companion object CREATOR : Parcelable.Creator<BatchData> {
        override fun createFromParcel(parcel: Parcel): BatchData {
            return BatchData(parcel)
        }

        override fun newArray(size: Int): Array<BatchData?> {
            return arrayOfNulls(size)
        }
    }
}

@JsonClass(generateAdapter = true)
data class BatchAssemblyItem(
    val id: String,
    @Json(name = "assembly_id") val assemblyId: String,
    val name: String,
    val weight: Double,
    val quantity: Int,
    val dimensions: NullableDimensions,
    @Json(name = "painting_spec") val paintingSpec: String?,
    @Json(name = "is_child") val isChild: Boolean,
    @Json(name = "child_number") val childNumber: Int?,
    val status: String,
    @Json(name = "added_at") val addedAt: String,
    @Json(name = "added_by") val addedBy: BatchAssemblyAddedBy
) : Parcelable {
    constructor(parcel: Parcel) : this(
        id = parcel.readString() ?: "",
        assemblyId = parcel.readString() ?: "",
        name = parcel.readString() ?: "",
        weight = parcel.readDouble(),
        quantity = parcel.readInt(),
        dimensions = parcel.readParcelable(NullableDimensions::class.java.classLoader) ?: NullableDimensions(null, null, null),
        paintingSpec = parcel.readString(),
        isChild = parcel.readByte() != 0.toByte(),
        childNumber = if (parcel.readByte() == 0.toByte()) null else parcel.readInt(),
        status = parcel.readString() ?: "",
        addedAt = parcel.readString() ?: "",
        addedBy = parcel.readParcelable(BatchAssemblyAddedBy::class.java.classLoader) ?: 
          BatchAssemblyAddedBy(null, "Unknown User")
    )

    override fun writeToParcel(parcel: Parcel, flags: Int) {
        parcel.writeString(id)
        parcel.writeString(assemblyId)
        parcel.writeString(name)
        parcel.writeDouble(weight)
        parcel.writeInt(quantity)
        parcel.writeParcelable(dimensions, flags)
        parcel.writeString(paintingSpec)
        parcel.writeByte(if (isChild) 1 else 0)
        if (childNumber == null) {
            parcel.writeByte(0)
        } else {
            parcel.writeByte(1)
            parcel.writeInt(childNumber)
        }
        parcel.writeString(status)
        parcel.writeString(addedAt)
        parcel.writeParcelable(addedBy, flags)
    }

    override fun describeContents(): Int {
        return 0
    }

    companion object CREATOR : Parcelable.Creator<BatchAssemblyItem> {
        override fun createFromParcel(parcel: Parcel): BatchAssemblyItem {
            return BatchAssemblyItem(parcel)
        }

        override fun newArray(size: Int): Array<BatchAssemblyItem?> {
            return arrayOfNulls(size)
        }
    }
}

@JsonClass(generateAdapter = true)
data class BatchAssemblyAddedBy(
    val id: String?,
    val name: String
) : Parcelable {
    constructor(parcel: Parcel) : this(
        id = parcel.readString(),
        name = parcel.readString() ?: ""
    )

    override fun writeToParcel(parcel: Parcel, flags: Int) {
        parcel.writeString(id)
        parcel.writeString(name)
    }

    override fun describeContents(): Int {
        return 0
    }

    companion object CREATOR : Parcelable.Creator<BatchAssemblyAddedBy> {
        override fun createFromParcel(parcel: Parcel): BatchAssemblyAddedBy {
            return BatchAssemblyAddedBy(parcel)
        }

        override fun newArray(size: Int): Array<BatchAssemblyAddedBy?> {
            return arrayOfNulls(size)
        }
    }
}

@JsonClass(generateAdapter = true)
data class BatchAssemblyRequest(
    val batchId: String,
    val assemblyBarcode: String,
    val userId: String,
    val cardId: String,
    val deviceInfo: DeviceInfo
)

@JsonClass(generateAdapter = true)
data class BatchAssembly(
    val data: BatchAssemblyData
) : Parcelable {
    constructor(parcel: Parcel) : this(
        data = parcel.readParcelable(BatchAssemblyData::class.java.classLoader) ?: BatchAssemblyData(
            id = "",
            assemblyId = "",
            assemblyName = "",
            batchId = "", 
            status = "",
            alreadyAdded = null,
            message = "",
            assembliesRemaining = null
        )
    )

    override fun writeToParcel(parcel: Parcel, flags: Int) {
        parcel.writeParcelable(data, flags)
    }

    override fun describeContents(): Int {
        return 0
    }

    companion object CREATOR : Parcelable.Creator<BatchAssembly> {
        override fun createFromParcel(parcel: Parcel): BatchAssembly {
            return BatchAssembly(parcel)
        }

        override fun newArray(size: Int): Array<BatchAssembly?> {
            return arrayOfNulls(size)
        }
    }
}

@JsonClass(generateAdapter = true)
data class BatchAssemblyData(
    val id: String,
    @Json(name = "assembly_id") val assemblyId: String,
    @Json(name = "assembly_name") val assemblyName: String,
    @Json(name = "batch_id") val batchId: String,
    val status: String,
    @Json(name = "already_added") val alreadyAdded: Boolean? = null,
    val message: String,
    @Json(name = "assemblies_remaining") val assembliesRemaining: Int? = null
) : Parcelable {
    constructor(parcel: Parcel) : this(
        id = parcel.readString() ?: "",
        assemblyId = parcel.readString() ?: "",
        assemblyName = parcel.readString() ?: "",
        batchId = parcel.readString() ?: "",
        status = parcel.readString() ?: "",
        alreadyAdded = if (parcel.readByte() == 0.toByte()) null else parcel.readByte() != 0.toByte(),
        message = parcel.readString() ?: "",
        assembliesRemaining = if (parcel.readByte() == 0.toByte()) null else parcel.readInt()
    )

    override fun writeToParcel(parcel: Parcel, flags: Int) {
        parcel.writeString(id)
        parcel.writeString(assemblyId)
        parcel.writeString(assemblyName)
        parcel.writeString(batchId)
        parcel.writeString(status)
        if (alreadyAdded == null) {
            parcel.writeByte(0)
        } else {
            parcel.writeByte(1)
            parcel.writeByte(if (alreadyAdded) 1 else 0)
        }
        parcel.writeString(message)
        if (assembliesRemaining == null) {
            parcel.writeByte(0)
        } else {
            parcel.writeByte(1)
            parcel.writeInt(assembliesRemaining)
        }
    }

    override fun describeContents(): Int {
        return 0
    }

    companion object CREATOR : Parcelable.Creator<BatchAssemblyData> {
        override fun createFromParcel(parcel: Parcel): BatchAssemblyData {
            return BatchAssemblyData(parcel)
        }

        override fun newArray(size: Int): Array<BatchAssemblyData?> {
            return arrayOfNulls(size)
        }
    }
}

@JsonClass(generateAdapter = true)
data class GetBatchAssembliesRequest(
    val userId: String,
    val deviceInfo: DeviceInfo
)

@JsonClass(generateAdapter = true)
data class RemoveBatchAssemblyRequest(
    val userId: String,
    val cardId: String,
    val deviceInfo: DeviceInfo
)

@JsonClass(generateAdapter = true)
data class NullableDimensions(
    val width: Int?,
    val height: Int?,
    val length: Int?
) : Parcelable {
    constructor(parcel: Parcel) : this(
        width = if (parcel.readByte() == 0.toByte()) null else parcel.readInt(),
        height = if (parcel.readByte() == 0.toByte()) null else parcel.readInt(),
        length = if (parcel.readByte() == 0.toByte()) null else parcel.readInt()
    )

    override fun writeToParcel(parcel: Parcel, flags: Int) {
        if (width == null) {
            parcel.writeByte(0)
        } else {
            parcel.writeByte(1)
            parcel.writeInt(width)
        }
        if (height == null) {
            parcel.writeByte(0)
        } else {
            parcel.writeByte(1)
            parcel.writeInt(height)
        }
        if (length == null) {
            parcel.writeByte(0)
        } else {
            parcel.writeByte(1)
            parcel.writeInt(length)
        }
    }

    override fun describeContents(): Int {
        return 0
    }

    companion object CREATOR : Parcelable.Creator<NullableDimensions> {
        override fun createFromParcel(parcel: Parcel): NullableDimensions {
            return NullableDimensions(parcel)
        }

        override fun newArray(size: Int): Array<NullableDimensions?> {
            return arrayOfNulls(size)
        }
    }
}