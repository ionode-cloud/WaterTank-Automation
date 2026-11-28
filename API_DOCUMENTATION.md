# WaterTank Automation System — Complete API Documentation

Comprehensive REST API and WebSocket specification for the **WaterTank Automation System**, covering IoT hardware communication, user authentication, role-based access control, motor telemetry, sensor records, and administrative controls.

---

## 1. Global Architecture & Standards

### 1.1 Base URLs
- **Local Development Backend**: `http://localhost:5010/api`
- **Socket.IO Real-Time Server**: `http://localhost:5010`
- **Default Frontend Port**: `http://localhost:5173`

### 1.2 Authentication & Authorization Headers
All protected endpoints require a valid JSON Web Token (JWT) sent via the `Authorization` header:
```http
Authorization: Bearer <your_jwt_token_here>
Content-Type: application/json
```

### 1.3 User Roles & Permission Levels
| Role | Access Scope |
| :--- | :--- |
| **Public / Guest** | Can register, log in, verify factory device IDs, and check system health. |
| **Standard User (`USER`)** | Can view assigned and approved devices, telemetry history for owned devices, toggle owned motors, claim devices, and update profile. |
| **Administrator (`ADMIN`)** | Full system access: manage users, approve/reject device registrations, manage hardware inventory, add motor models, resolve faults, and inspect all telemetry across all devices. |

### 1.4 Standard JSON Response Formats

#### Success Response (200 / 201)
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

#### Paginated List Response (200)
```json
{
  "success": true,
  "pagination": {
    "total": 1250,
    "page": 1,
    "limit": 25,
    "totalPages": 50
  },
  "data": [ ... ]
}
```

#### Error Response (400 / 401 / 403 / 404 / 409 / 500)
```json
{
  "success": false,
  "message": "Specific error description explaining what went wrong",
  "error": "Optional internal trace or validation error"
}
```

---

## 2. API Endpoints Table of Contents

1. [Authentication & Profile (`/api/auth`)](#3-authentication--profile-apiauth)
2. [User Account Administration (`/api/users`)](#4-user-account-administration-apiusers)
3. [Hardware Inventory & Verification (`/api/inventory`)](#5-hardware-inventory--verification-apiinventory)
4. [Motor Models Catalog (`/api/models`)](#6-motor-models-catalog-apimodels)
5. [Devices & Claiming (`/api/device`, `/api/devices`)](#7-devices--claiming-apidevice-apidevices)
6. [Telemetry Data & Records (`/api/data`)](#8-telemetry-data--records-apidata)
7. [Dashboard Analytics (`/api/dashboard`)](#9-dashboard-analytics-apidashboard)
8. [Sensors & Power History (`/api/sensors`, `/api/power`, `/api/water-level`)](#10-sensors--power-history)
9. [Motor Controls & Run Hours (`/api/motor`)](#11-motor-controls--run-hours-apimotor)
10. [Fault Incident Management (`/api/faults`)](#12-fault-incident-management-apifaults)
11. [IoT Bridge & System Health (`/api/iot`, `/api/system`)](#13-iot-bridge--system-health)
12. [Socket.IO Real-Time Events](#14-socketio-real-time-events)

---

## 3. Authentication & Profile (`/api/auth`)

### 3.1 Register New User Account
Creates a new standard user or administrator account.

- **Method**: `POST`
- **Endpoint**: `/api/auth/register`
- **Access**: Public
- **Request Headers**: `Content-Type: application/json`

#### Request Body
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "Password123!",
  "username": "janedoe",
  "phone": "+91 9876543210",
  "location": "Tower A, Mumbai",
  "role": "USER"
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "id": "6b06d70a8988742f1f9074a6",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "username": "janedoe",
    "role": "USER",
    "phone": "+91 9876543210",
    "location": "Tower A, Mumbai"
  }
}
```

---

### 3.2 User Login
Authenticates an existing user via email (or username) and password, returning a JWT token.

- **Method**: `POST`
- **Endpoint**: `/api/auth/login`
- **Access**: Public

#### Request Body
```json
{
  "email": "jane@example.com",
  "password": "Password123!"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "id": "6b06d70a8988742f1f9074a6",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "USER"
  }
}
```

---

### 3.3 Google OAuth 2.0 Login / Sign Up
Verifies Google OAuth credentials and signs in or registers the user automatically.

- **Method**: `POST`
- **Endpoint**: `/api/auth/google`
- **Access**: Public

#### Request Body
```json
{
  "credential": "eyJhbGciOiJSUzI1NiIsImtpZCI6...",
  "email": "jane.google@gmail.com",
  "name": "Jane Google",
  "picture": "https://lh3.googleusercontent.com/a/ACg8oc...",
  "googleId": "104928374928374928374"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Google authentication successful",
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "id": "6b06d70a8988742f1f9074b7",
    "name": "Jane Google",
    "email": "jane.google@gmail.com",
    "picture": "https://lh3.googleusercontent.com/a/ACg8oc...",
    "role": "USER"
  }
}
```

---

### 3.4 Get Current User Profile
Returns the authenticated user's current account details.

- **Method**: `GET`
- **Endpoint**: `/api/auth/me`
- **Access**: Authenticated (`USER` or `ADMIN`)
- **Headers**: `Authorization: Bearer <token>`

#### Response (200 OK)
```json
{
  "success": true,
  "user": {
    "_id": "6b06d70a8988742f1f9074a6",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "username": "janedoe",
    "role": "USER",
    "phone": "+91 9876543210",
    "location": "Tower A, Mumbai",
    "createdAt": "2026-11-25T10:00:00.000Z"
  }
}
```

---

### 3.5 Update Profile Details
Updates contact details for the logged-in user.

- **Method**: `PUT`
- **Endpoint**: `/api/auth/profile`
- **Access**: Authenticated (`USER` or `ADMIN`)
- **Headers**: `Authorization: Bearer <token>`

#### Request Body
```json
{
  "name": "Jane Smith",
  "phone": "+91 9123456780",
  "location": "Building B, Rooftop Tank, Mumbai"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    "_id": "6b06d70a8988742f1f9074a6",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "+91 9123456780",
    "location": "Building B, Rooftop Tank, Mumbai"
  }
}
```

---

## 4. User Account Administration (`/api/users`)

All `/api/users` routes require `Authorization: Bearer <token>`.

### 4.1 List All Users (Admin)
- **Method**: `GET`
- **Endpoint**: `/api/users`
- **Access**: Admin only
- **Query Parameters**:
  - `page` (integer, default: 1)
  - `limit` (integer, default: 20)
  - `search` (string, optional: filters by name, email, or username)
  - `role` (string, optional: `ADMIN` or `USER`)

#### Response (200 OK)
```json
{
  "success": true,
  "count": 2,
  "total": 2,
  "page": 1,
  "totalPages": 1,
  "data": [
    {
      "_id": "6b06d70a8988742f1f9074a6",
      "name": "Boyfzx",
      "email": "boyfzx@gmail.com",
      "role": "USER",
      "isActive": true,
      "deviceCount": 1
    }
  ]
}
```

---

### 4.2 Create New User (Admin)
- **Method**: `POST`
- **Endpoint**: `/api/users`
- **Access**: Admin only

#### Request Body
```json
{
  "name": "Operator Mike",
  "email": "mike@facility.com",
  "password": "TempPassword2026!",
  "role": "USER",
  "phone": "+91 9988776655",
  "location": "Main Water Facility"
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "6b06d70a8988742f1f9074cc",
    "name": "Operator Mike",
    "email": "mike@facility.com",
    "role": "USER"
  }
}
```

---

### 4.3 Update User by ID (Admin)
- **Method**: `PUT`
- **Endpoint**: `/api/users/:id`
- **Access**: Admin only

#### Request Body
```json
{
  "name": "Operator Michael",
  "role": "ADMIN",
  "isActive": true,
  "phone": "+91 9988776655"
}
```

---

### 4.4 Delete User by ID (Admin)
Permanently deletes a user account.
- **Method**: `DELETE`
- **Endpoint**: `/api/users/:id`
- **Access**: Admin only

#### Response (200 OK)
```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": { "id": "6b06d70a8988742f1f9074cc" }
}
```

---

### 4.5 Reset User Password (Admin)
- **Method**: `POST`
- **Endpoint**: `/api/users/:id/reset-password`
- **Access**: Admin only

#### Request Body
```json
{
  "newPassword": "NewSecurePassword2026!"
}
```

---

### 4.6 Reassign Device to Another User (Admin)
Transfers hardware device ownership from one user to another.
- **Method**: `POST`
- **Endpoint**: `/api/users/reassign-device`
- **Access**: Admin only

#### Request Body
```json
{
  "deviceId": "WT-DEV-001",
  "newUserId": "6b06d70a8988742f1f9074a6"
}
```

---

### 4.7 Administrator & Operator Credentials (`/api/admin/users`)

Manage system administrator and operator staff accounts, role authorization, and per-account tab access permissions (`allowedTabs`).

#### 4.7.1 List Administrator & Operator Accounts
- **Method**: `GET`
- **Endpoint**: `/api/admin/users`
- **Access**: Admin only
- **Query Parameters**:
  - `search` *(optional)*: Filter by name, email, or phone.
  - `role` *(optional)*: `'all'`, `'admin'`, or `'operator'`.

#### 4.7.2 Create Administrator / Operator Credential
- **Method**: `POST`
- **Endpoint**: `/api/admin/users`
- **Access**: Admin only

##### Request Body
```json
{
  "name": "Plant Operator",
  "email": "operator@watertank.com",
  "password": "SecurePassword123",
  "role": "operator",
  "phone": "+91 98765 43210",
  "allowedTabs": ["dashboard", "devices", "history"]
}
```
*Note: For `role: "operator"`, `allowedTabs` defines the exact tabs shown in the Sidebar & Navbar for that operator's registered ID upon login (`dashboard`, `devices`, `user-devices`, `history`, `models`, `registered-users`, `admin`, `profile`).*

#### 4.7.3 Update Credential & Allowed Tabs
- **Method**: `PUT`
- **Endpoint**: `/api/admin/users/:id`
- **Access**: Admin only

##### Request Body
```json
{
  "name": "Senior Plant Operator",
  "role": "operator",
  "allowedTabs": ["dashboard", "devices", "user-devices", "history"]
}
```

#### 4.7.4 Delete Credential
- **Method**: `DELETE`
- **Endpoint**: `/api/admin/users/:id`
- **Access**: Admin only

---

## 5. Hardware Inventory & Verification (`/api/inventory`)

### 5.1 Verify Device ID for Registration (Public)
Used during device setup when a customer enters a hardware Device ID to verify it exists in manufactured inventory.

- **Method**: `GET`
- **Endpoint**: `/api/inventory/verify/:deviceId`
- **Access**: Public
- **URL Parameter**: `deviceId` (e.g. `WT-DEV-001`)

#### Response (200 OK)
```json
{
  "success": true,
  "verified": true,
  "message": "Manufactured device 'WT-DEV-001' verified and available for registration.",
  "data": {
    "deviceId": "WT-DEV-001",
    "manufacturingModelNumber": "SG-1PS-1.5",
    "manufacturingDate": "2026-10-15T00:00:00.000Z",
    "status": "UNREGISTERED",
    "batchNumber": "BATCH-2026-Q4"
  }
}
```

#### Error (404 Not Found)
```json
{
  "success": false,
  "verified": false,
  "message": "Device ID 'WT-FAKE-999' is not found in the manufactured device inventory. Please check the hardware label."
}
```

---

### 5.2 List Hardware Inventory (Admin)
- **Method**: `GET`
- **Endpoint**: `/api/inventory`
- **Access**: Admin only
- **Query Parameters**: `status` (`UNREGISTERED`, `REGISTERED`, `DISABLED`), `search`, `page`, `limit`

---

### 5.3 Provision Single Device into Inventory (Admin)
- **Method**: `POST`
- **Endpoint**: `/api/inventory`
- **Access**: Admin only

#### Request Body
```json
{
  "deviceId": "WT-DEV-005",
  "manufacturingModelNumber": "SG-1PS-2.0",
  "batchNumber": "BATCH-2026-NOV",
  "manufacturingDate": "2026-11-20",
  "notes": "Produced at Factory Unit 2"
}
```

---

### 5.4 Batch Import Inventory (Admin)
- **Method**: `POST`
- **Endpoint**: `/api/inventory/batch`
- **Access**: Admin only

#### Request Body
```json
{
  "devices": [
    { "deviceId": "WT-DEV-006", "manufacturingModelNumber": "SG-1PS-1.5", "batchNumber": "B-01" },
    { "deviceId": "WT-DEV-007", "manufacturingModelNumber": "SG-3PS-3.0", "batchNumber": "B-01" }
  ]
}
```

---

### 5.5 Update Inventory Item Status (Admin)
- **Method**: `PUT`
- **Endpoint**: `/api/inventory/:deviceId`
- **Access**: Admin only

#### Request Body
```json
{
  "status": "DISABLED",
  "notes": "Hardware marked for factory calibration"
}
```

---

## 6. Motor Models Catalog (`/api/models`)

The system defines 4 standardized industrial motor model specifications:
1. `SG-1PS-1.5` — Single Phase Single Tank (1.5 HP)
2. `SG-1PD-1.5` — Single Phase Double Tank (1.5 HP)
3. `SG-3PS-3.0` — Three Phase Single Tank (3.0 HP)
4. `SG-3PD-3.0` — Three Phase Double Tank (3.0 HP)

### 6.1 Get All Models
- **Method**: `GET`
- **Endpoint**: `/api/models`
- **Access**: Public / Authenticated
- **Query Parameters**: `motorType` (`Single Phase` | `Three Phase`), `phase` (`1` | `3`), `search`

#### Response (200 OK)
```json
{
  "success": true,
  "count": 4,
  "data": [
    {
      "modelNumber": "SG-1PS-1.5",
      "modelName": "Single Phase Single Tank 1.5HP",
      "motorType": "Single Phase",
      "hpRating": { "value": 1.5, "label": "1.5 HP" },
      "phase": 1,
      "startingType": "DOL",
      "maxCurrentAmps": 12,
      "tanksSupported": ["OVERHEAD"],
      "compatibleTanksCount": 1
    }
  ]
}
```

---

### 6.2 Get Model by Model Number
- **Method**: `GET`
- **Endpoint**: `/api/models/:modelNumber` (e.g. `/api/models/SG-1PS-1.5`)
- **Access**: Public / Authenticated

---

### 6.3 Create Custom Model Specification (Admin)
- **Method**: `POST`
- **Endpoint**: `/api/models`
- **Access**: Authenticated (`ADMIN`)

#### Request Body
```json
{
  "modelNumber": "SG-3PD-5.0",
  "modelName": "Three Phase Double Tank 5.0HP",
  "motorType": "Three Phase",
  "hpRating": { "value": 5.0, "label": "5.0 HP" },
  "phase": 3,
  "startingType": "Star-Delta",
  "maxCurrentAmps": 18,
  "tanksSupported": ["SUMP", "OVERHEAD"],
  "description": "Heavy industrial multi-tank booster pump"
}
```

---

### 6.4 Update Model Specification
- **Method**: `PUT`
- **Endpoint**: `/api/models/:modelNumber`
- **Access**: Authenticated (`ADMIN`)

---

### 6.5 Delete Model Specification
- **Method**: `DELETE`
- **Endpoint**: `/api/models/:modelNumber`
- **Access**: Admin only

---

## 7. Devices & Claiming (`/api/device`, `/api/devices`)

Both `/api/device` and `/api/devices` map to the same endpoints.

### 7.1 Claim / Register a Device ID (User)
Enables a standard user to register an admin-provisioned device. The device enters `approvalStatus: "PENDING"` awaiting Admin approval.

- **Method**: `POST`
- **Endpoint**: `/api/device/claim`
- **Access**: Authenticated User
- **Headers**: `Authorization: Bearer <token>`

#### Request Body
```json
{
  "deviceId": "WT-DEV-001",
  "name": "Tower A Overhead Pump",
  "location": "Rooftop Tank, Tower A"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Registration request for Device 'WT-DEV-001' submitted successfully! Awaiting Administrator approval before appearing on your dashboard.",
  "data": {
    "deviceId": "WT-DEV-001",
    "name": "Tower A Overhead Pump",
    "location": "Rooftop Tank, Tower A",
    "approvalStatus": "PENDING",
    "isApproved": false,
    "requestedAt": "2026-11-28T08:00:00.000Z"
  }
}
```

---

### 7.2 Get All Devices
Returns devices scoped by user role:
- **Standard User**: Returns only approved devices assigned to the logged-in user (pass `?includePending=true` to view pending requests).
- **Admin**: Returns all devices in the system.

- **Method**: `GET`
- **Endpoint**: `/api/device`
- **Access**: Authenticated
- **Query Parameters**:
  - `status` (string, optional: `Active`, `Fault`, `Inactive`)
  - `search` (string, optional: keyword in deviceId, name, location)
  - `includePending` (`true` | `false`)

#### Response (200 OK)
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "_id": "6b06d70a8988742f1f9074ee",
      "deviceId": "WT-DEV-001",
      "name": "Water Controller Tower A",
      "location": "Rooftop Tank",
      "modelNumber": "SG-1PS-1.5",
      "status": "Active",
      "approvalStatus": "APPROVED",
      "isApproved": true,
      "data": {
        "voltage": 230,
        "current": 4.5,
        "power": 950,
        "waterLevel": 78,
        "motorStatus": "ON",
        "timestamp": "2026-11-28T08:05:00.000Z"
      }
    }
  ]
}
```

---

### 7.3 Get Device by ID
- **Method**: `GET`
- **Endpoint**: `/api/device/:id` (supports MongoDB `_id` or `deviceId`)
- **Access**: Authenticated

---

### 7.4 Save / Update Device Telemetry or Settings
- **Method**: `POST` or `PUT`
- **Endpoint**: `/api/device` or `/api/device/:id`
- **Access**: Authenticated

#### Request Body
```json
{
  "deviceId": "WT-DEV-001",
  "name": "Water Controller Tower A - Updated",
  "location": "Rooftop Tank - Sector 4",
  "tankCapacity": 2000,
  "description": "Primary rooftop supply controller"
}
```

---

### 7.5 Delete / Remove Device
- **Regular User**: **Soft Unlink**. Removes the device from the user account (`assignedUserId = null`, `approvalStatus = 'PENDING'`). Hardware remains in inventory for Admin, and the user can re-register the same device later. Telemetry records are **never deleted**.
- **Admin**: Removes the device hardware record from inventory. Telemetry history (`SensorData`, `MotorHistory`) is **never deleted** and preserved for historical analysis.

- **Method**: `DELETE`
- **Endpoint**: `/api/device/:id` (or `/api/device?deviceId=WT-DEV-001`)
- **Access**: Authenticated

#### Response for User Unlink (200 OK)
```json
{
  "success": true,
  "message": "Device 'WT-DEV-001' removed from your account. The hardware remains in inventory.",
  "data": {
    "deviceId": "WT-DEV-001",
    "assignedUserId": null,
    "approvalStatus": "PENDING"
  }
}
```

---

### 7.6 User Registered Devices Review (Admin Only)
Returns device registration requests submitted by users.

- **Method**: `GET`
- **Endpoint**: `/api/device/user-registered-devices`
- **Access**: Admin only

#### Response (200 OK)
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "_id": "6b06d70a8988742f1f9074ee",
      "deviceId": "WT-DEV-001",
      "name": "Pump Controller WT-DEV-001",
      "approvalStatus": "PENDING",
      "isApproved": false,
      "requestedAt": "2026-11-28T08:00:00.000Z",
      "assignedUser": {
        "id": "6b06d70a8988742f1f9074a6",
        "name": "Boyfzx",
        "email": "boyfzx@gmail.com"
      }
    }
  ]
}
```

---

### 7.7 Approve User Device Request (Admin)
Approves a pending registration request. The device immediately appears on the user's Dashboard, Devices, and History tabs.

- **Method**: `PUT`
- **Endpoint**: `/api/device/user-registered-devices/:id/approve`
- **Access**: Admin only

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Device 'WT-DEV-001' approved successfully for user 'Boyfzx'!",
  "data": {
    "deviceId": "WT-DEV-001",
    "approvalStatus": "APPROVED",
    "isApproved": true,
    "approvedAt": "2026-11-28T08:15:00.000Z"
  }
}
```

---

### 7.8 Reject User Device Request (Admin)
- **Method**: `PUT`
- **Endpoint**: `/api/device/user-registered-devices/:id/reject`
- **Access**: Admin only

#### Request Body (Optional)
```json
{
  "reason": "Hardware model does not match the facility location specified"
}
```

---

### 7.9 Force Motor ON on Device
Overrides motor status to **ON** for the specified device.
- **Rule**: If `forceOn` is `true`, `motorStatus` is forced to `'ON'` (even if it was previously `'OFF'`), and `forceOff` is set to `false`.

- **Method**: `POST` | `PUT`
- **Endpoint**: `/api/device/:id/force-on` (supports `deviceId` or MongoDB `_id`)
- **Access**: Authenticated

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Force ON successfully executed for device WT-DEV-001",
  "data": {
    "deviceId": "WT-DEV-001",
    "name": "Tower A Overhead Pump",
    "forceOn": true,
    "forceOff": false,
    "motorStatus": "ON"
  }
}
```

---

### 7.10 Force Motor OFF on Device
Overrides motor status to **OFF** for the specified device.
- **Rule**: If `forceOff` is `true`, `motorStatus` is forced to `'OFF'` (even if it was previously `'ON'`), and `forceOn` is set to `false`.

- **Method**: `POST` | `PUT`
- **Endpoint**: `/api/device/:id/force-off` (supports `deviceId` or MongoDB `_id`)
- **Access**: Authenticated

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Force OFF successfully executed for device WT-DEV-001",
  "data": {
    "deviceId": "WT-DEV-001",
    "name": "Tower A Overhead Pump",
    "forceOn": false,
    "forceOff": true,
    "motorStatus": "OFF"
  }
}
```

---

## 8. Telemetry Data & Records (`/api/data`)

### 8.1 Query Telemetry History (GET)
Returns paginated historical sensor records.
- **Regular User**: Scoped strictly to their assigned and approved devices.
- **Admin**: Returns all telemetry records across all devices (past and present).

- **Method**: `GET`
- **Endpoint**: `/api/data`
- **Access**: Authenticated
- **Query Parameters**:
  - `page` (integer, default: 1)
  - `limit` (integer, default: 25, max: 500)
  - `deviceId` (string, optional: filters by specific device ID)
  - `motorStatus` (`ON` | `OFF`, optional)
  - `startDate` (ISO 8601 string, e.g. `2026-11-01T00:00:00.000Z`)
  - `endDate` (ISO 8601 string, e.g. `2026-11-28T23:59:59.000Z`)
  - `devicesOnly` (`true` | `false`: returns a list of all distinct device IDs that have telemetry)

#### Response (200 OK)
```json
{
  "success": true,
  "pagination": {
    "total": 5420,
    "page": 1,
    "limit": 25,
    "totalPages": 217
  },
  "data": [
    {
      "_id": "674589abcdef123456789012",
      "deviceId": "WT-DEV-001",
      "voltage": 231.4,
      "current": 4.62,
      "power": 985,
      "powerFactor": 0.92,
      "frequency": 50.1,
      "waterLevel": 78,
      "tankCapacity": 1000,
      "waterConsumption": 780,
      "motorStatus": "ON",
      "energyConsumption": 1.45,
      "timestamp": "2026-11-28T08:10:00.000Z"
    }
  ]
}
```

#### Querying Distinct Device IDs (`devicesOnly=true`)
```http
GET /api/data?devicesOnly=true
```
```json
{
  "success": true,
  "data": ["WT-DEV-001", "WT-DEV-002", "WT-DEV-003"]
}
```

---

### 8.2 Ingest Telemetry Record (POST)
- **Method**: `POST`
- **Endpoint**: `/api/data`
- **Access**: Public / Hardware Gateway / Backend Service

#### Request Body
```json
{
  "deviceId": "WT-DEV-001",
  "voltage": 230.5,
  "current": 4.5,
  "power": 950,
  "powerFactor": 0.92,
  "frequency": 50.0,
  "waterLevel": 75,
  "tankCapacity": 1000,
  "motorStatus": "ON",
  "status": "Active"
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Telemetry data saved successfully",
  "data": {
    "_id": "674589abcdef123456789013",
    "deviceId": "WT-DEV-001",
    "voltage": 230.5,
    "waterLevel": 75,
    "timestamp": "2026-11-28T08:15:00.000Z"
  }
}
```

---

### 8.3 Update Telemetry Record (PUT)
- **Method**: `PUT`
- **Endpoint**: `/api/data/:id`
- **Access**: Authenticated

#### Request Body
```json
{
  "tankCapacity": 1500,
  "notes": "Recalibrated sensor offset"
}
```

---

### 8.4 Delete Single Telemetry Record (DELETE)
- **Method**: `DELETE`
- **Endpoint**: `/api/data/:id`
- **Access**: Admin only

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Telemetry record deleted successfully",
  "deletedId": "674589abcdef123456789013"
}
```

---

## 9. Dashboard Analytics (`/api/dashboard`)

### 9.1 Dashboard Overview
Returns aggregated statistics for the high-level dashboard metrics cards.

- **Method**: `GET`
- **Endpoint**: `/api/dashboard/overview`
- **Access**: Authenticated
- **Query Parameters**: `deviceId` (optional)

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "totalDevices": 4,
    "onlineDevices": 3,
    "offlineDevices": 1,
    "activeFaults": 0,
    "totalEnergyKWh": 142.8,
    "averagePowerFactor": 0.93,
    "latestReading": {
      "deviceId": "WT-DEV-001",
      "waterLevel": 78,
      "motorStatus": "ON",
      "voltage": 230.5,
      "current": 4.5,
      "power": 950
    }
  }
}
```

---

## 10. Sensors & Power History

### 10.1 Latest Sensor Reading
- **Method**: `GET`
- **Endpoint**: `/api/sensors/latest`
- **Query Parameters**: `deviceId` (e.g. `?deviceId=WT-DEV-001`)

---

### 10.2 Sensor History List
- **Method**: `GET`
- **Endpoint**: `/api/sensors/history`
- **Query Parameters**: `deviceId`, `limit` (default: 50)

---

### 10.3 Power History Graph Data
Returns time-series power analytics formatted for line and area charts.

- **Method**: `GET`
- **Endpoint**: `/api/power/history`
- **Access**: Authenticated
- **Query Parameters**:
  - `deviceId` (required: e.g. `WT-DEV-001`)
  - `range` (`24H` | `7D` | `30D` | `1Y`, default: `24H`)

#### Response (200 OK)
```json
{
  "success": true,
  "deviceId": "WT-DEV-001",
  "range": "24H",
  "count": 24,
  "data": [
    { "timestamp": "2026-11-28T00:00:00.000Z", "time": "00:00", "power": 0, "voltage": 230, "current": 0 },
    { "timestamp": "2026-11-28T01:00:00.000Z", "time": "01:00", "power": 945, "voltage": 228, "current": 4.4 }
  ]
}
```

---

### 10.4 Water Level History Graph Data
- **Method**: `GET`
- **Endpoint**: `/api/water-level/history`
- **Access**: Authenticated
- **Query Parameters**: `deviceId`, `limit` (default: 50)

---

## 11. Motor Controls & Run Hours (`/api/motor`)

### 11.1 Get Current Motor Status
- **Method**: `GET`
- **Endpoint**: `/api/motor/status`
- **Query Parameters**: `deviceId` (optional)

#### Response (200 OK)
```json
{
  "success": true,
  "deviceId": "WT-DEV-001",
  "motorStatus": "ON",
  "lastToggle": "2026-11-28T07:45:00.000Z",
  "operatingMode": "MANUAL"
}
```

---

### 11.2 Force Motor ON
Sends an actuation command to turn ON the motor pump.

- **Method**: `POST`
- **Endpoint**: `/api/motor/force-on`
- **Access**: Authenticated

#### Request Body
```json
{
  "deviceId": "WT-DEV-001",
  "triggeredBy": "dashboard_button",
  "timeoutMinutes": 60
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Motor turned ON successfully",
  "data": {
    "deviceId": "WT-DEV-001",
    "motorStatus": "ON",
    "startTime": "2026-11-28T08:20:00.000Z"
  }
}
```

---

### 11.3 Force Motor OFF
Sends an actuation command to shut down the motor pump.

- **Method**: `POST`
- **Endpoint**: `/api/motor/force-off`
- **Access**: Authenticated

#### Request Body
```json
{
  "deviceId": "WT-DEV-001",
  "triggeredBy": "dashboard_button"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Motor turned OFF successfully",
  "data": {
    "deviceId": "WT-DEV-001",
    "motorStatus": "OFF",
    "endTime": "2026-11-28T08:25:00.000Z",
    "runDurationMinutes": 5
  }
}
```

---

### 11.4 Motor Run History Log
Returns past motor operating cycles, run hours, and start/stop timestamps.

- **Method**: `GET`
- **Endpoint**: `/api/motor/history`
- **Access**: Authenticated
- **Query Parameters**: `deviceId`, `limit` (default: 20)

#### Response (200 OK)
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "_id": "674589ab9876543210fedcba",
      "deviceId": "WT-DEV-001",
      "startTime": "2026-11-28T07:00:00.000Z",
      "endTime": "2026-11-28T07:45:00.000Z",
      "durationMinutes": 45,
      "energyUsedKWh": 0.71,
      "triggeredBy": "AUTO_LOW_WATER"
    }
  ]
}
```

---

### 11.5 Motor Consumption & Switch Cycle Stats
- **Method**: `GET`
- **Endpoint**: `/api/motor/consumption`
- **Query Parameters**: `deviceId`

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "totalOnEvents": 14,
    "totalOffEvents": 14,
    "totalEvents": 28,
    "dailyActivity": [
      { "date": "2026-11-27", "onEvents": 4, "offEvents": 4 }
    ]
  }
}
```

---

## 12. Fault Incident Management (`/api/faults`)

### 12.1 Get Fault Logs
- **Method**: `GET`
- **Endpoint**: `/api/faults`
- **Access**: Authenticated
- **Query Parameters**: `deviceId`, `status` (`Active` | `Resolved`), `limit`, `page`

#### Response (200 OK)
```json
{
  "success": true,
  "count": 1,
  "total": 1,
  "data": [
    {
      "_id": "674589ab0011223344556677",
      "deviceId": "WT-DEV-001",
      "deviceName": "Water Controller Tower A",
      "faultDescription": "Dry run protection triggered - Zero water flow detected while motor running",
      "faultStatus": "Active",
      "timestamp": "2026-11-28T08:10:00.000Z"
    }
  ]
}
```

---

### 12.2 Report Hardware Fault
- **Method**: `POST`
- **Endpoint**: `/api/faults`
- **Access**: Hardware Gateway / Authenticated

#### Request Body
```json
{
  "deviceId": "WT-DEV-001",
  "faultDescription": "Overcurrent detected: 14.8A exceeds maximum rating 12.0A",
  "deviceName": "Water Controller Tower A"
}
```

---

### 12.3 Resolve Fault Incident
- **Method**: `PUT`
- **Endpoint**: `/api/faults/:id/resolve`
- **Access**: Authenticated (`ADMIN`)

#### Request Body
```json
{
  "resolutionNotes": "Suction line cleaned and thermal overload switch reset"
}
```

---

## 13. IoT Bridge & System Health

### 13.1 System Health Check
- **Method**: `GET`
- **Endpoint**: `/api/system/health`
- **Access**: Public

#### Response (200 OK)
```json
{
  "status": "UP",
  "database": "CONNECTED",
  "uptimeSeconds": 86420,
  "timestamp": "2026-11-28T08:00:00.000Z",
  "environment": "development",
  "simulationMode": false,
  "isHardwareConnected": true,
  "activeMode": "hardware"
}
```

---

### 13.2 1-Second IoT Acknowledgement Heartbeat
Used by microcontrollers to maintain persistent online connectivity status.

- **Method**: `GET`
- **Endpoint**: `/api/iot/ack`
- **Access**: Public / Microcontroller

#### Response (200 OK)
```json
{
  "success": true,
  "status": "Active",
  "acknowledgedAt": "2026-11-28T08:00:01.000Z",
  "serverTime": 1764316801000
}
```

---

### 13.3 Hardware Telemetry Ingestion Bridge
The dedicated endpoint for physical hardware (ESP32, Arduino, Raspberry Pi, GSM module, or PLC).

- **Method**: `POST`
- **Endpoint**: `/api/iot/telemetry`
- **Access**: Public / Hardware Gateway

#### Request Body (Single Phase Setup)
```json
{
  "deviceId": "WT-DEV-001",
  "voltage": 230.8,
  "current": 4.55,
  "power": 960,
  "powerFactor": 0.93,
  "frequency": 50.0,
  "waterLevel": 78,
  "waterConsumption": 780,
  "tankCapacity": 1000,
  "motorStatus": "ON",
  "status": "Active"
}
```

#### Request Body (Three Phase Setup)
```json
{
  "deviceId": "WT-DEV-002",
  "vol1": 230.1,
  "vol2": 229.8,
  "vol3": 231.0,
  "cu1": 6.1,
  "cu2": 6.0,
  "cu3": 6.2,
  "powerFactor": 0.94,
  "frequency": 50.0,
  "overheadTank": 85,
  "sumpTank": 92,
  "motorStatus": "ON",
  "status": "Active"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Telemetry received and broadcast successfully",
  "deviceId": "WT-DEV-001",
  "timestamp": "2026-11-28T08:00:00.000Z"
}
```

---

## 14. Socket.IO Real-Time Events

Connect to the Socket.IO server at `http://localhost:5010`.

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5010', {
  transports: ['websocket', 'polling'],
});

socket.on('connect', () => {
  console.log('Connected to real-time telemetry stream:', socket.id);
});
```

### 14.1 Server-to-Client Broadcast Events

| Event Name | Payload Description |
| :--- | :--- |
| `sensor_update` | Emitted every 1 second when new telemetry arrives. Contains voltage, current, power, water level, and tank stats. |
| `motor_status_update` | Emitted immediately when a motor turns ON or OFF. Contains `{ deviceId, motorStatus, timestamp }`. |
| `new_fault` | Emitted immediately when a fault is detected. Contains `{ deviceId, faultDescription, faultStatus, timestamp }`. |
| `fault_resolved` | Emitted when an admin resolves an active fault. Contains `{ _id, faultStatus: 'Resolved' }`. |
| `device_status_update` | Emitted when device state changes between `Active`, `Standby`, or `Fault`. |

---

## 15. Quick Reference: Common `curl` Recipes

### Register a User
```bash
curl -X POST http://localhost:5010/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"Password123!","username":"johndoe"}'
```

### Log in and Extract JWT
```bash
curl -X POST http://localhost:5010/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"Password123!"}'
```

### Claim a Device (As Authenticated User)
```bash
curl -X POST http://localhost:5010/api/device/claim \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"WT-DEV-001","name":"Rooftop Pump","location":"Tower A"}'
```

### Fetch Telemetry History with Pagination
```bash
curl -X GET "http://localhost:5010/api/data?page=1&limit=25&deviceId=WT-DEV-001" \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

### Toggle Motor ON
```bash
curl -X POST http://localhost:5010/api/motor/force-on \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"WT-DEV-001","triggeredBy":"cli_test"}'
```

### Hardware Telemetry Ingestion (ESP32 / Arduino)
```bash
curl -X POST http://localhost:5010/api/iot/telemetry \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"WT-DEV-001","voltage":230.5,"current":4.5,"power":950,"waterLevel":82,"motorStatus":"ON"}'
```
