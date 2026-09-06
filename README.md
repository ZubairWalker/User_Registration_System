# User Registration System

A small TypeScript and Express API for learning how a complete user registration flow works.

## Features

- MongoDB storage with Mongoose
- Password hashing with bcrypt
- Email format validation
- Email verification tokens
- Login with short-lived bearer tokens
- Protected user profile routes
- Basic input sanitization and helpful error messages

## Requirements

- Node.js 18 or newer
- MongoDB connection string

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root:

   ```env
   MONGO_DB=mongodb+srv://username:password@cluster.mongodb.net/user-registration
   PORT=5000
   AUTH_SECRET=replace-this-with-a-long-random-secret
   ```

   Do not commit the `.env` file. It is already listed in `.gitignore`.

3. Build and start the API:

   ```bash
   npm run build
   npm start
   ```

   The API runs at `http://localhost:5000` by default.

## Development

To rebuild TypeScript whenever a source file changes:

```bash
npm run dev
```

To rebuild and restart the server automatically:

```bash
npm run devStart
```

## API Endpoints

All authentication endpoints use the `/api/auth` prefix.

### Register

`POST /api/auth/register`

```json
{
  "fullName": "Jane Doe",
  "email": "jane@example.com",
  "password": "strong-password"
}
```

The server prints a verification URL to the terminal. In a production app,
`src/utils/emailService.ts` should send this URL through an email provider.

### Verify email

`GET /api/auth/verify-email?token=YOUR_TOKEN`

The token is included in the verification URL printed by the server.

### Login

`POST /api/auth/login`

```json
{
  "email": "jane@example.com",
  "password": "strong-password"
}
```

The response includes a bearer token:

```json
{
  "message": "Login successful",
  "user": {
    "id": "USER_ID",
    "fullName": "Jane Doe",
    "email": "jane@example.com",
    "isVerified": true
  },
  "token": "TOKEN"
}
```

### Get a profile

`GET /api/auth/profile/USER_ID`

Include the login token:

```text
Authorization: Bearer TOKEN
```

Users can only view their own profile.

### Update a profile

`PATCH /api/auth/profile/USER_ID`

```json
{
  "fullName": "Jane Smith"
}
```

This endpoint also requires the `Authorization: Bearer TOKEN` header.

## Project Structure

```text
src/
├── models/User.ts                 User database schema
├── services/registrationService.ts Registration and authentication logic
├── routes/auth.ts                 HTTP endpoints and request validation
├── routes/routes.ts               Main router
├── utils/emailService.ts          Development email placeholder
└── index.ts                       Express and MongoDB startup
```

## Validation

Build the project with:

```bash
npm run build
```

The project currently does not include automated tests yet.
