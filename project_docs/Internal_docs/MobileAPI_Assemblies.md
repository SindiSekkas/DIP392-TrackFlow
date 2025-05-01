# Mobile API Documentation for Assembly Tracking System

## Introduction

This documentation outlines the API interfaces for the mobile application that will integrate with the TrackFlow system to update assembly statuses in a manufacturing environment. The mobile app will be an Android APK that allows workers to authenticate using their NFC cards and update assembly statuses by scanning barcodes.

## System Overview

The TrackFlow assembly tracking system consists of:
- A PostgreSQL database storing project, assembly, and user data
- RESTful API endpoints for mobile application integration
- NFC card management for worker authentication
- Barcode generation and scanning for assembly identification

The mobile application will work as follows:
1. Worker authenticates by tapping their NFC card to the phone
2. Worker scans an assembly's barcode
3. Worker selects and submits a new status for the assembly
4. The status change is logged with worker information and device details

## API Base URL

- **Development**: `http://localhost:3001/api`
- **Production**: `https://api.trackflow.pl/api`

## Application Types

This API supports two application types:
1. **Web Application**: Admin/manager interface for project management and barcode generation
2. **Mobile Application**: Worker interface for NFC authentication and assembly status updates

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

## Assembly Management

### Get Assembly by Barcode

#### `GET /api/mobile/assemblies/barcode/:barcode?userId=:userId`

Retrieves assembly details by scanning a barcode.

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
    }
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing userId
- `404 Not Found`: Barcode not found
- `404 Not Found`: Assembly not found

### Update Assembly Status

#### `POST /api/mobile/assemblies/status`

Updates the status of an assembly and logs the change.

**Request Body:**
```json
{
  "assemblyId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "In Production",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "cardId": "NFC-CARD-123456",
  "deviceInfo": {
    "appVersion": "1.0.0",
    "deviceModel": "Samsung Galaxy S22",
    "manufacturer": "Samsung",
    "osVersion": "Android 13",
    "timestamp": "2025-03-22T14:30:45.123Z"
  }
}
```

**Successful Response: (200 OK)**
```json
{
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Frame Assembly A-123",
    "project_id": "998877-abcdef-112233",
    "status": "In Production",
    "updated_at": "2025-03-22T14:30:45.123Z"
  },
  "message": "Assembly status updated to In Production"
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid NFC card for this user
- `404 Not Found`: Assembly not found
- `400 Bad Request`: Invalid status value

**Implementation Notes:**
- Valid status values: `"Waiting"`, `"In Production"`, `"Welding"`, `"Painting"`, `"Completed"`
- Device info should be collected programmatically on the device
- Include as much device information as reasonable to help with troubleshooting

## Data Models

### Assembly Status

| Status Value    | Description                            |
|-----------------|----------------------------------------|
| `Waiting`       | Assembly has not started production    |
| `In Production` | Assembly is currently being produced   |
| `Welding`       | Assembly is in the welding stage       |
| `Painting`      | Assembly is in the painting stage      |
| `Completed`     | Assembly has completed all production  |

### Worker Types

| Worker Type | Description                           |
|-------------|---------------------------------------|
| `engineer`  | Engineering and design personnel      |
| `welder`    | Performs welding operations           |
| `assembler` | Assembles components                  |
| `painter`   | Performs painting and finishing       |
| `logistics` | Handles logistics and transportation  |

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

### NFC Reading

1. Use Android's NFC API to read NFC card data
2. Extract serial number of the card
3. Send the card ID to the validation endpoint
4. Store the returned user information for the session duration



### Barcode Scanning

1. Use a barcode scanning library (e.g., ZXing or ML Kit)
2. Configure the scanner for Code 128 or QR codes as needed
3. When a barcode is scanned, fetch the assembly details using the API


### Status Updates

1. Present a user interface showing the current assembly status
2. Allow the worker to select a new status
3. Send the status update request to the API
4. Show a confirmation message upon success

### Offline Support Recommendations

For environments with unreliable network connectivity:
1. Cache scanned assembly data locally
2. Queue status update requests when offline
3. Sync with the server when connectivity is restored
4. Implement conflict resolution for delayed updates

### Security Considerations

1. Do not store sensitive information in shared preferences or unencrypted storage
2. Implement an automatic logout/timeout after a period of inactivity
3. Request only necessary Android permissions
4. Validate all data received from the server before processing
5. Use HTTPS for all API communications
6. Include a unique device identifier in requests for audit purposes

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
| ASM-M8KLRSNN-F8N7G| Assembly 1      | Waiting        |
| ASM-M8KLRSD5-5XK61| Assembly 2      | Waiting  |

## Conclusion

This documentation provides the necessary information to develop a mobile application that integrates with the TrackFlow system. For additional information or clarification, please contact the backend development team.
