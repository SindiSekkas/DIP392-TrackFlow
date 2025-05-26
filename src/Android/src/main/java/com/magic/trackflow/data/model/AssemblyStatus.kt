package com.magic.trackflow.data.model

object AssemblyStatus {
    const val WAITING = "Waiting"
    const val IN_PRODUCTION = "In Production"
    const val WELDING = "Welding"
    const val PAINTING = "Painting"
    const val COMPLETED = "Completed"
    
    val values = listOf(WAITING, IN_PRODUCTION, WELDING, PAINTING, COMPLETED)
    
    // Map of which worker types can update to which statuses
    val workerTypePermissions = mapOf(
        "engineer" to values,
        "welder" to listOf(WAITING, IN_PRODUCTION, WELDING),
        "assembler" to listOf(WAITING, IN_PRODUCTION),
        "painter" to listOf(WELDING, PAINTING, COMPLETED),
        "logistics" to listOf(COMPLETED)
    )
    
    fun canWorkerChangeToStatus(workerType: String, newStatus: String): Boolean {
        return workerTypePermissions[workerType]?.contains(newStatus) ?: false
    }
}