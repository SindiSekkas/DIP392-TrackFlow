# Mobile Quality Control API Documentation

## Introduction

This documentation outlines the API interfaces for the mobile application that will integrate with the TrackFlow system to perform quality control operations in a manufacturing environment. The mobile app will allow QC personnel to authenticate using their NFC cards, scan assembly barcodes, and document quality control issues including status updates and photo documentation.

## System Overview

The TrackFlow quality control system consists of:
- A PostgreSQL database storing assembly quality control data
- RESTful API endpoints for mobile QC application integration
- NFC card management for worker authentication
- Barcode scanning for assembly identification
- Photo capture and storage capabilities for documenting quality issues

The mobile QC application will work as follows:
1. Worker authenticates by tapping their NFC card to the phone
2. Worker scans an assembly's barcode
3. Worker inspects the assembly for quality issues
4. Worker updates QC status and adds notes
5. Worker captures and uploads photos of any defects or issues
6. All data is logged with worker information and timestamp

## API Base URL

- **Development**: `http://localhost:3001/api`
- **Production**: `https://api.trackflow.pl/api`

## Authentication

The mobile app uses NFC card-based authentication without requiring conventional login credentials.

### NFC Card Validation

#### `POST /api/nfc/validate`

Validates an NFC card and returns associated user information.

**Request Body:**
```json
{
  "cardId": "NFC-CARD-123456"
}
```

**Successful Response: (200 OK)**
```json
{
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "profileId": "112233-abcdef-998877",
    "fullName": "John Smith",
    "role": "worker",
    "workerType": "welder",
    "cardId": "NFC-CARD-123456"
  }
}
```

**Error Responses:**
- `404 Not Found`: NFC card not found or inactive
- `404 Not Found`: User profile not found
- `403 Forbidden`: NFC card is inactive

**Implementation Notes:**
- After successful validation, store the `userId` and `cardId` for subsequent requests
- Store other user information for display in the UI
- No traditional session is maintained; the `userId` and `cardId` must be sent with each request

## QC API Endpoints

### Get Assembly by Barcode

#### `GET /api/mobile/assemblies/barcode/:barcode?userId=:userId`

Retrieves assembly details by scanning a barcode to perform QC operations.

**URL Parameters:**
- `barcode`: The scanned barcode string

**Query Parameters:**
- `userId`: User ID retrieved from NFC card validation

**Successful Response: (200 OK)**
```json
{
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Frame Assembly A-123",
    "projectId": "998877-abcdef-112233",
    "projectName": "Factory Building Extension",
    "projectNumber": "P-2025-0123",
    "client": "ABC Construction",
    "weight": 450,
    "quantity": 2,
    "status": "Waiting",
    "paintingSpec": "RAL 9010",
    "dimensions": {
      "width": 1200,
      "height": 800,
      "length": 2400
    },
    "quality_control_status": "Not Started",
    "quality_control_notes": ""
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing userId
- `404 Not Found`: Barcode not found
- `404 Not Found`: Assembly not found

### Upload QC Image

#### `POST /api/mobile/assemblies/:assemblyId/qc-upload`

Uploads a quality control image with issue-specific notes.

**URL Parameters:**
- `assemblyId`: UUID of the assembly

**Request Headers:**
```
Content-Type: multipart/form-data
```

**Request Body:**
```
image: <image file> (optional)
qcStatus: "Failed" (optional)
notes: "Specific defect: Poor painting of fasteners" (optional)
userId: "550e8400-e29b-41d4-a716-446655440000"
cardId: "NFC-CARD-123456"
deviceInfo: { 
  "deviceType": "Mobile", 
  "appVersion": "1.0.0" 
}
```

**Successful Response: (201 Created)**
```json
{
  "data": {
    "assembly_id": "123e4567-e89b-12d3-a456-426614174000",
    "qc_status": "Failed",
    "qc_image": {
      "id": "67890abc-def0-1234-5678-abcdef123456",
      "assembly_id": "123e4567-e89b-12d3-a456-426614174000",
      "image_path": "qc-images/123e4567-e89b-12d3-a456-426614174000/1617293845123_image.jpg",
      "file_name": "image.jpg",
      "file_size": 1024000,
      "content_type": "image/jpeg",
      "notes": "Specific defect: Poor painting of fasteners",
      "qc_status": "Failed",
      "created_by": "550e8400-e29b-41d4-a716-446655440000",
      "created_at": "2025-04-01T12:34:56.789Z"
    },
    "message": "QC image uploaded successfully"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Missing required files or invalid parameters
- `401 Unauthorized`: Invalid NFC card for this user
- `404 Not Found`: Assembly not found

### Update Assembly QC Notes

#### `POST /api/mobile/assemblies/:assemblyId/qc-notes`

Updates the overall quality control notes and status for an assembly.

**URL Parameters:**
- `assemblyId`: UUID of the assembly

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "qcStatus": "Conditional Pass",
  "notes": "Overall assessment: There are several paint defects, additional inspection is required before shipping",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "cardId": "NFC-CARD-123456",
  "deviceInfo": {
    "deviceType": "Mobile",
    "appVersion": "1.0.0"
  }
}
```

**Successful Response: (200 OK)**
```json
{
  "data": {
    "assembly_id": "123e4567-e89b-12d3-a456-426614174000",
    "quality_control_status": "Conditional Pass",
    "quality_control_notes": "Overall assessment: There are several paint defects, additional inspection is required before shipping",
    "message": "Quality control notes updated successfully"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation error (invalid status or notes)
- `401 Unauthorized`: Invalid or missing authentication
- `403 Forbidden`: NFC card validation failed
- `404 Not Found`: Assembly not found

### Get QC Images for Assembly

#### `POST /api/mobile/assemblies/:assemblyId/qc-images`

Retrieves all quality control images for an assembly.

**URL Parameters:**
- `assemblyId`: UUID of the assembly

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "cardId": "NFC-CARD-123456"
}
```

**Successful Response: (200 OK)**
```json
{
  "data": [
    {
      "id": "67890abc-def0-1234-5678-abcdef123456",
      "assembly_id": "123e4567-e89b-12d3-a456-426614174000",
      "image_path": "qc-images/123e4567-e89b-12d3-a456-426614174000/1617293845123_image.jpg",
      "file_name": "image.jpg",
      "file_size": 1024000,
      "content_type": "image/jpeg",
      "notes": "Specific defect: Poor painting of fasteners",
      "qc_status": "Failed",
      "created_by": "550e8400-e29b-41d4-a716-446655440000",
      "created_at": "2025-04-01T12:34:56.789Z",
      "image_url": "https://kvienvajqivmgzizkbxb.supabase.co/storage/v1/object/public/files/qc-images/123e4567-e89b-12d3-a456-426614174000/1617293845123_image.jpg",
      "created_by_info": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "john.smith@example.com",
        "name": "John Smith"
      }
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing authentication
- `403 Forbidden`: NFC card validation failed
- `404 Not Found`: Assembly not found

## Data Models

### QC Status Values

| Status Value       | Description                                          |
|--------------------|------------------------------------------------------|
| `Not Started`      | QC inspection has not been performed                 |
| `In Progress`      | QC inspection is currently underway                  |
| `Passed`           | Assembly passed QC inspection                        |
| `Failed`           | Assembly failed QC inspection                        |
| `Conditional Pass` | Assembly passes with conditions or further review    |

### QC Image Model

| Field          | Type     | Description                                    |
|----------------|----------|------------------------------------------------|
| `id`           | UUID     | Unique identifier for the QC image             |
| `assembly_id`  | UUID     | ID of the assembly this image belongs to       |
| `image_path`   | Text     | Storage path for the image                     |
| `file_name`    | Text     | Original file name of the image                |
| `file_size`    | Bigint   | Size of the image in bytes                     |
| `content_type` | Text     | MIME type of the image                         |
| `notes`        | Text     | Issue-specific notes for this image            |
| `qc_status`    | Text     | QC status specific to this issue               |
| `created_by`   | UUID     | User ID who uploaded the image                 |
| `created_at`   | Timestamp| When the image was uploaded                    |

## Error Handling

The API returns standard HTTP status codes along with a JSON response body that contains error details:

```json
{
  "error": {
    "message": "Error message here",
    "details": "Additional details when available"
  }
}
```

### Common Error Status Codes:

- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict
- `500 Internal Server Error`: Server-side error

## Implementation Guidelines

### QC Image Capture

1. Use the device's camera API to capture images of defects or issues
2. Compress images to a reasonable size (max 5MB) before uploading
3. Set appropriate image dimensions (max 2000x2000 pixels) for usable detail without excessive file size
4. Ensure adequate lighting for clear quality control documentation
5. Include reference objects for scale when applicable

### Offline Support Recommendations

For environments with unreliable network connectivity:
1. Store assembly QC data locally when offline
2. Queue image uploads when connectivity is lost
3. Implement sync mechanism to upload pending images when connectivity is restored
4. Store the most recent QC status and notes for each assembly locally
5. Clearly indicate to users when working in offline mode

### Security Considerations

1. Do not store sensitive information in shared preferences or unencrypted storage
2. Implement automatic timeout after a period of inactivity
3. Validate all data received from the server before processing
4. Use HTTPS for all API communications
5. Secure image data both in transit and at rest

## Testing

### Test NFC Cards

The following test NFC cards are available for development:

| Card ID           | User            | Worker Type | Status |
|-------------------|-----------------|-------------|--------|
| 73:3A:79:25       | John Painter    | painter     | Active |
| D3:71:79:25       | John Welder     | welder      | Active |
| F3:F7:D6:19       | John Assembler  | assembler   | Inactive |

### Test Barcodes

The following test barcodes are available for development:

| Barcode           | Assembly Name   | Current Status |
|-------------------|-----------------|----------------|
| ASM-MA3WU7N6-P42NG| Assembly 5      | Waiting        |
| ASM-MA3WU7MX-5YJED| Assembly 4      | Waiting        |

## Conclusion

This documentation provides the necessary information to develop the quality control features of the mobile application that integrates with the TrackFlow system. For additional information or clarification, please contact the backend development team.