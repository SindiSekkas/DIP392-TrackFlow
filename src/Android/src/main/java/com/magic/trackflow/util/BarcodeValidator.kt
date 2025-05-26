package com.magic.trackflow.util

/**
 * Utility class for validating barcodes according to TrackFlow API formats
 */
object BarcodeValidator {
    
    // Updated regex patterns to match exact formats from documentation examples
    // Examples: ASM-MA3WU7N6-P42NG, ASM-MA3WU7N4-ZT0GV, ASM-MA3WU7N2-JL7IJ, ASM-MA3WU7MX-5YJED
    // NOTE: The pattern should allow both numeric and alphabetic characters in all positions
    private val ASSEMBLY_BARCODE_REGEX = Regex("ASM-[A-Z0-9]{7}-[A-Z0-9]{5}")
    // Examples: BATCH-MA19A96M-25F0, BATCH-MA1BAE59-ZJ587
    private val BATCH_BARCODE_REGEX = Regex("BATCH-[A-Z0-9]{8}-[A-Z0-9]{5}")
    private val UUID_REGEX = Regex("[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}")
    
    /**
     * Checks if the string is a valid assembly barcode format
     */
    fun isValidAssemblyBarcode(code: String): Boolean {
        return ASSEMBLY_BARCODE_REGEX.matches(code)
    }
    
    /**
     * Checks if the string is a valid batch barcode format
     */
    fun isValidBatchBarcode(code: String): Boolean {
        return BATCH_BARCODE_REGEX.matches(code)
    }
    
    /**
     * Checks if the string is in UUID format
     */
    fun isUuid(code: String): Boolean {
        return UUID_REGEX.matches(code)
    }
    
    /**
     * Checks the type of barcode or ID
     */
    fun identifyCodeType(code: String): CodeType {
        return when {
            isValidAssemblyBarcode(code) -> CodeType.ASSEMBLY_BARCODE
            isValidBatchBarcode(code) -> CodeType.BATCH_BARCODE
            isUuid(code) -> CodeType.UUID
            else -> CodeType.UNKNOWN
        }
    }
    
    /**
     * Validates that barcode is in the correct format based on expected type
     */
    fun validateBarcode(code: String, expectedType: CodeType): ValidationResult {
        val actualType = identifyCodeType(code)
        
        return if (actualType == expectedType) {
            ValidationResult(true, null)
        } else {
            val errorMessage = when (expectedType) {
                CodeType.ASSEMBLY_BARCODE -> "Invalid assembly barcode format. Expected format: ASM-XXXXXXX-XXXXX"
                CodeType.BATCH_BARCODE -> "Invalid batch barcode format. Expected format: BATCH-XXXXXXXX-XXXXX"
                CodeType.UUID -> "Invalid UUID format"
                CodeType.UNKNOWN -> "Invalid code format"
            }
            ValidationResult(false, errorMessage)
        }
    }
    
    /**
     * Code types that can be identified
     */
    enum class CodeType {
        ASSEMBLY_BARCODE,
        BATCH_BARCODE,
        UUID,
        UNKNOWN
    }
    
    /**
     * Result of validation containing success flag and optional error message
     */
    data class ValidationResult(
        val isValid: Boolean,
        val errorMessage: String?
    )
}