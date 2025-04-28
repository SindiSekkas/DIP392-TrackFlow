# Mobile Logistics API Documentation

## Introduction

This document outlines the API endpoints for the mobile logistics barcode scanning functionality in the TrackFlow system. These endpoints allow mobile workers to scan, validate, and manage batches and assemblies using barcode scanning.

## API Base URL

- **Development**: `http://localhost:3001/api` or as configured in environment variable `API_URL`

## Authentication

All mobile endpoints require authentication using an NFC card. The workflow is:

1. Validate NFC card using `/api/nfc/validate` endpoint
2. Use the returned user ID in subsequent requests

Some endpoints that modify data also require NFC card verification by including the `cardId` in the request body.

### NFC Card Validation

#### `POST /api/nfc/validate`

**Description:** Validates an NFC card and returns associated user information

**Request Body:**
```json
{
  "cardId": "73:3A:79:25"
}
```

**Response (200 OK):**
```json
{
  "data": {
    "userId": "d9e9f4c4-35a6-4fac-b961-8ac85f61b181",
    "profileId": "fa3957a3-08ed-4fa6-bede-44f0960f0ead",
    "fullName": "John Painter",
    "role": "worker",
    "workerType": "painter",
    "cardId": "73:3A:79:25"
  }
}
```

**Error Responses:**
- `404 Not Found`: NFC card not found or inactive
- `404 Not Found`: User profile not found
- `403 Forbidden`: NFC card is inactive

## Endpoints

### 1. Validate Batch Barcode

#### `POST /api/mobile/logistics/batches/validate`

**Description:** Validates a batch barcode and returns batch details

**Authentication:** Mobile authentication required

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "barcode": "BATCH-MA1BAE59-ZJ587",
  "userId": "d9e9f4c4-35a6-4fac-b961-8ac85f61b181",
  "deviceInfo": {
    "deviceType": "Mobile",
    "appVersion": "1.0.0",
    "testMode": true
  }
}
```

**Response (200 OK):**
```json
{
  "data": {
    "id": "7371054e-53da-4502-b986-3027d63777ef",
    "batch_number": "BATCH-MA19A96M-25F0",
    "status": "Pending",
    "client": "Baltic Construction Solutions Lietuva, UAB",
    "project": "25/03 - Test3",
    "project_id": "043c4346-6bd4-44b8-b714-6fa82c90354e",
    "delivery_address": "Soska bobka",
    "total_weight": null,
    "assembly_count": 0
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation error (missing or invalid barcode)
- `401 Unauthorized`: Invalid or missing authentication
- `404 Not Found`: Batch barcode not found

### 2. Add Assembly to Batch via Barcode

#### `POST /api/mobile/logistics/batches/add-assembly`

**Description:** Adds an assembly to a batch via barcode scan

**Authentication:** Mobile authentication required, NFC verification required

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "batchId": "7371054e-53da-4502-b986-3027d63777ef",
  "assemblyBarcode": "ASM-MA1EOAB3-VH5NM",
  "userId": "d9e9f4c4-35a6-4fac-b961-8ac85f61b181",
  "cardId": "73:3A:79:25",
  "deviceInfo": {
    "deviceType": "Mobile",
    "appVersion": "1.0.0",
    "scanType": "barcode",
    "testMode": true
  }
}
```

**Response (201 Created):**
```json
{
  "data": {
    "id": "83a120b0-6d80-4179-a229-0efed6005784",
    "assembly_id": "b5fafd24-109f-4e5b-9d48-20a5c4822fde",
    "assembly_name": "TestAssembly",
    "batch_id": "7371054e-53da-4502-b986-3027d63777ef",
    "status": "Completed",
    "message": "Assembly added to batch successfully"
  }
}
```

**Duplicate Assembly Response (200 OK):**
```json
{
  "data": {
    "id": "83a120b0-6d80-4179-a229-0efed6005784",
    "assembly_id": "b5fafd24-109f-4e5b-9d48-20a5c4822fde",
    "assembly_name": "TestAssembly",
    "batch_id": "7371054e-53da-4502-b986-3027d63777ef",
    "status": "Completed",
    "already_added": true,
    "message": "Assembly was already in this batch"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation error (missing or invalid parameters)
- `401 Unauthorized`: Invalid or missing authentication
- `403 Forbidden`: NFC card validation failed
- `404 Not Found`: Batch or assembly not found
- `400 Bad Request`: Assembly belongs to a different project than the batch

### 3. Get Batch Assemblies

#### `POST /api/mobile/logistics/batches/:batchId/assemblies`

**Description:** Gets all assemblies in a batch

**Authentication:** Mobile authentication required

**URL Parameters:**
- `batchId`: UUID of the batch

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "userId": "d9e9f4c4-35a6-4fac-b961-8ac85f61b181",
  "deviceInfo": {
    "deviceType": "Mobile",
    "appVersion": "1.0.0",
    "testMode": true
  }
}
```

**Response (200 OK):**
```json
{
  "data": {
    "batch_id": "7371054e-53da-4502-b986-3027d63777ef",
    "batch_number": "BATCH-MA19A96M-25F0",
    "client": "Baltic Construction Solutions Lietuva, UAB",
    "status": "Pending",
    "total_weight": 0,
    "assembly_count": 1,
    "assemblies": [
      {
        "id": "83a120b0-6d80-4179-a229-0efed6005784",
        "assembly_id": "b5fafd24-109f-4e5b-9d48-20a5c4822fde",
        "name": "TestAssembly",
        "weight": 150.5,
        "quantity": 1,
        "dimensions": {
          "width": 1200,
          "height": 800,
          "length": 2400
        },
        "painting_spec": "RAL 9010",
        "is_child": false,
        "child_number": null,
        "status": "Completed",
        "added_at": "2025-04-28T14:30:00Z",
        "added_by": {
          "id": "d9e9f4c4-35a6-4fac-b961-8ac85f61b181",
          "name": "John Painter"
        }
      }
    ]
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation error (invalid batch ID)
- `401 Unauthorized`: Invalid or missing authentication
- `404 Not Found`: Batch not found
- `500 Internal Server Error`: Server processing error

### 4. Remove Assembly from Batch

#### `DELETE /api/mobile/logistics/batch-assemblies/:batchAssemblyId`

**Description:** Removes an assembly from a batch

**Authentication:** Mobile authentication required, NFC verification required

**URL Parameters:**
- `batchAssemblyId`: UUID of the batch assembly relationship to remove

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "userId": "d9e9f4c4-35a6-4fac-b961-8ac85f61b181",
  "cardId": "73:3A:79:25",
  "deviceInfo": {
    "deviceType": "Mobile",
    "appVersion": "1.0.0",
    "testMode": true
  }
}
```

**Response (200 OK):**
```json
{
  "data": {
    "id": "83a120b0-6d80-4179-a229-0efed6005784",
    "batch_id": "7371054e-53da-4502-b986-3027d63777ef",
    "assembly_id": "b5fafd24-109f-4e5b-9d48-20a5c4822fde",
    "assembly_name": "TestAssembly",
    "message": "Assembly removed from batch successfully",
    "assemblies_remaining": 0
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation error (invalid batch assembly ID)
- `401 Unauthorized`: Invalid or missing authentication
- `403 Forbidden`: NFC card validation failed
- `404 Not Found`: Batch assembly not found

## Device Information

The `deviceInfo` object is recommended in all requests to help with debugging and auditing. Include as much relevant information as possible:

```json
{
  "deviceInfo": {
    "deviceType": "Mobile",
    "appVersion": "1.0.0",
    "manufacturer": "Samsung",
    "model": "Galaxy S22",
    "osVersion": "Android 13",
    "scanType": "barcode" 
  }
}
```

## Testing

You can test these endpoints using Postman or the included test script:

```bash
node src/Web_part/Backend/tests/mobile-logistics-api-test.js
```

The test script performs a complete workflow testing all endpoints in sequence.