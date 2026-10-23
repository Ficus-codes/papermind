# AI Research Assistant - Auth API Guide

This guide provides example requests for testing the authentication system.

## Base URL
`http://localhost:5000/api/auth`

---

## 1. Register a New User
Creates a new user account.

- **Endpoint**: `POST /register`
- **Authentication**: None
- **Request Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securepassword123"
  }
  ```
- **Success Response**: `201 Created`
- **Error Responses**:
  - `400 Bad Request`: Invalid email or password too short.
  - `409 Conflict`: Email already exists.

---

## 2. Login
Authenticates user and returns a JWT token.

- **Endpoint**: `POST /login`
- **Authentication**: None
- **Request Body**:
  ```json
  {
    "email": "john@example.com",
    "password": "securepassword123"
  }
  ```
- **Success Response**: `200 OK`
  ```json
  {
    "message": "Login successful",
    "token": "eyJhbG...",
    "user": {
      "userId": "...",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
  ```
- **Error Response**:
  - `401 Unauthorized`: Invalid credentials.

---

## 3. Access Protected Route
Verifies that the JWT token is working.

- **Endpoint**: `GET /me`
- **Authentication**: `Bearer <token>` (from login response)
- **Header**: `Authorization: Bearer eyJhbG...`
- **Success Response**: `200 OK`
  ```json
  {
    "message": "Authentication successful",
    "user": {
      "userId": "...",
      "email": "john@example.com"
    }
  }
  ```
- **Error Response**:
  - `401 Unauthorized`: Token missing or invalid.
