package com.magic.trackflow.data.model

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class NfcValidationRequest(
    val cardId: String
)

@JsonClass(generateAdapter = true)
data class NfcValidationResponse(
    val data: UserData
)

@JsonClass(generateAdapter = true)
data class UserData(
    val userId: String,
    val profileId: String,
    val fullName: String,
    val role: String,
    val workerType: String,
    val cardId: String
) : android.os.Parcelable {
    constructor(parcel: android.os.Parcel) : this(
        parcel.readString() ?: "",
        parcel.readString() ?: "",
        parcel.readString() ?: "",
        parcel.readString() ?: "",
        parcel.readString() ?: "",
        parcel.readString() ?: ""
    )

    override fun writeToParcel(parcel: android.os.Parcel, flags: Int) {
        parcel.writeString(userId)
        parcel.writeString(profileId)
        parcel.writeString(fullName)
        parcel.writeString(role)
        parcel.writeString(workerType)
        parcel.writeString(cardId)
    }

    override fun describeContents(): Int {
        return 0
    }

    companion object CREATOR : android.os.Parcelable.Creator<UserData> {
        override fun createFromParcel(parcel: android.os.Parcel): UserData {
            return UserData(parcel)
        }

        override fun newArray(size: Int): Array<UserData?> {
            return arrayOfNulls(size)
        }
    }
}

@JsonClass(generateAdapter = true)
data class Assembly(
    val data: AssemblyData
) : android.os.Parcelable {
    constructor(parcel: android.os.Parcel) : this(
        data = parcel.readParcelable(AssemblyData::class.java.classLoader) ?: AssemblyData(
            id = "",
            name = "",
            projectId = "",
            projectName = "",
            projectNumber = "",
            client = "",
            weight = 0,
            quantity = 0,
            status = "",
            paintingSpec = "",
            dimensions = Dimensions(0, 0, 0)
        )
    )

    override fun writeToParcel(parcel: android.os.Parcel, flags: Int) {
        parcel.writeParcelable(data, flags)
    }

    override fun describeContents(): Int {
        return 0
    }

    companion object CREATOR : android.os.Parcelable.Creator<Assembly> {
        override fun createFromParcel(parcel: android.os.Parcel): Assembly {
            return Assembly(parcel)
        }

        override fun newArray(size: Int): Array<Assembly?> {
            return arrayOfNulls(size)
        }
    }
}

@JsonClass(generateAdapter = true)
data class AssemblyData(
    val id: String,
    val name: String,
    val projectId: String,
    val projectName: String,
    val projectNumber: String,
    val client: String,
    val weight: Int,
    val quantity: Int,
    val status: String,
    val paintingSpec: String,
    val dimensions: Dimensions,
    @Json(name = "quality_control_status") val qualityControlStatus: String = "",
    @Json(name = "quality_control_notes") val qualityControlNotes: String = ""
) : android.os.Parcelable {
    constructor(parcel: android.os.Parcel) : this(
        id = parcel.readString() ?: "",
        name = parcel.readString() ?: "",
        projectId = parcel.readString() ?: "",
        projectName = parcel.readString() ?: "",
        projectNumber = parcel.readString() ?: "",
        client = parcel.readString() ?: "",
        weight = parcel.readInt(),
        quantity = parcel.readInt(),
        status = parcel.readString() ?: "",
        paintingSpec = parcel.readString() ?: "",
        dimensions = parcel.readParcelable(Dimensions::class.java.classLoader) ?: Dimensions(0, 0, 0),
        qualityControlStatus = parcel.readString() ?: "",
        qualityControlNotes = parcel.readString() ?: ""
    )

    override fun writeToParcel(parcel: android.os.Parcel, flags: Int) {
        parcel.writeString(id)
        parcel.writeString(name)
        parcel.writeString(projectId)
        parcel.writeString(projectName)
        parcel.writeString(projectNumber)
        parcel.writeString(client)
        parcel.writeInt(weight)
        parcel.writeInt(quantity)
        parcel.writeString(status)
        parcel.writeString(paintingSpec)
        parcel.writeParcelable(dimensions, flags)
        parcel.writeString(qualityControlStatus)
        parcel.writeString(qualityControlNotes)
    }

    override fun describeContents(): Int {
        return 0
    }

    companion object CREATOR : android.os.Parcelable.Creator<AssemblyData> {
        override fun createFromParcel(parcel: android.os.Parcel): AssemblyData {
            return AssemblyData(parcel)
        }

        override fun newArray(size: Int): Array<AssemblyData?> {
            return arrayOfNulls(size)
        }
    }
}

@JsonClass(generateAdapter = true)
data class Dimensions(
    val width: Int,
    val height: Int,
    val length: Int
) : android.os.Parcelable {
    constructor(parcel: android.os.Parcel) : this(
        width = parcel.readInt(),
        height = parcel.readInt(),
        length = parcel.readInt()
    )

    override fun writeToParcel(parcel: android.os.Parcel, flags: Int) {
        parcel.writeInt(width)
        parcel.writeInt(height)
        parcel.writeInt(length)
    }

    override fun describeContents(): Int {
        return 0
    }

    companion object CREATOR : android.os.Parcelable.Creator<Dimensions> {
        override fun createFromParcel(parcel: android.os.Parcel): Dimensions {
            return Dimensions(parcel)
        }

        override fun newArray(size: Int): Array<Dimensions?> {
            return arrayOfNulls(size)
        }
    }
}

@JsonClass(generateAdapter = true)
data class StatusUpdateRequest(
    val assemblyId: String,
    val status: String,
    val userId: String,
    val cardId: String,
    val deviceInfo: DeviceInfo
)

@JsonClass(generateAdapter = true)
data class DeviceInfo(
    val appVersion: String,
    val deviceModel: String,
    val manufacturer: String,
    val osVersion: String,
    val timestamp: String
)

@JsonClass(generateAdapter = true)
data class StatusUpdateResponse(
    val data: StatusUpdateData,
    val message: String
)

@JsonClass(generateAdapter = true)
data class StatusUpdateData(
    val id: String,
    val name: String,
    val project_id: String,
    val status: String,
    val updated_at: String
)
