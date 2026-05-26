# Glunity Mobile — Project Status & Run Guide

This report provides a comprehensive status of the **Glunity Mobile** monorepo workspace.

---

## 1. Project Overview & Current State

The workspace is structured as a **monorepo** using **npm workspaces**, split into two primary components:
1. **`api/` (Backend):** A Node.js & Express.js REST API with Mongoose (MongoDB) database connectivity and Socket.io integration.
2. **`mobile/` (Frontend):** A React Native / Expo cross-platform mobile application.

### Backend (`api/`) Status
* **Core Boilerplate:** Fully established. Includes environmental configuration validation (`env.js`), request logger, DB connection bootstrap, and global error handling middleware.
* **Database Connection:** Confirmed config is pointing to an external MongoDB Atlas cluster:
  * `mongodb+srv://yassinedrira3_db_user:...@glutenmobile.vxtr1qm.mongodb.net/?appName=GlutenMOBILE`
* **Implemented Modules:**
  * **Auth (`api/src/app/modules/auth`):** Fully operational. Implements Registration, Login, JWT refresh/access token cycle, Email Verification, Forgot/Reset Password flows.
  * **Users (`api/src/app/modules/users`):** Operational. Implements user profile queries and profile updates (`PATCH /api/users/me`).
* **Placeholder/Empty Modules:**
  * The folders `recipes`, `locations`, `products`, `events`, `channels`, `seller`, `badges`, `notifications`, `reviews`, and `search` are present in `api/src/app/modules/`, but the routes, controllers, and services in these subfolders are currently empty placeholders. Only `auth` and `users` are active and registered in the root router `app.js`.

### Frontend (`mobile/`) Status
* **Core Boilerplate:** Fully set up using React Native and Expo (SDK 55). Navigation structures (`NavigationContainer`), fonts (`Poppins`), and TypeScript settings are configured.
* **Authentication UI & State:**
  * **Context Store (`auth.context.ts`):** Complete state management using SecureStore to store access/refresh tokens.
  * **Screens:** Fully implemented login, register, welcome, intro, forgot password, reset password, and email verified screens.
* **Home Module:** Implemented `HomeScreen.tsx` showing gamification features (streaks, badges) and quick access cards using mock data.
* **Profile Module:** Implemented user profile screens (`ProfileScreen`, `SettingsScreen`, `EditProfileScreen`).

---

## 2. Environment Variables Configuration

* **Backend (`api/.env`):** Done and configured with dev port `5000` and MongoDB Atlas connection string.
* **Frontend (`mobile/.env`):** Created by this agent:
  * Key: `EXPO_PUBLIC_API_BASE_URL=http://localhost:5000/api`
  * This matches the backend's local setup port.

---

## 3. Runner Executable Limitations

> [!WARNING]
> During our attempt to start the development servers automatically, the environment runner threw an error:
> `exec: "powershell": executable file not found in %PATH%`
>
> This indicates that the automated runner's local execution environment does not have access to standard system paths where `powershell` or system shells reside. Therefore, you will need to run the launch commands manually in your local terminal.

---

## 4. Instructions to Run the Project

Follow these steps in your terminal to start the development servers locally:

### Step 1: Install Monorepo Dependencies
Ensure all dependencies are synchronized at the root level:
```bash
npm install
```

### Step 2: Start the Backend (API)
Open a new terminal window in the root directory and run:
```bash
npm run dev:api
```
* The API server will boot up using `nodemon` at **`http://localhost:5000`**.
* The server will verify its connection to the remote MongoDB cluster.

### Step 3: Start the Mobile Application (Frontend)
Open another terminal window in the root directory and run:
```bash
npm run dev:mobile
```
* This runs `expo start` using the Metro bundler.
* **To run in web browser:** Press `w` in the terminal to start the web version.
* **To run in an emulator:** Press `a` (Android Emulator) or `i` (iOS Simulator).
* **To run on a physical device:** Download the **Expo Go** app on your phone, ensure your computer and phone are on the same Wi-Fi network, and scan the QR code displayed in the terminal.

---

## 5. Summary of Mounted API Endpoints

* `POST /api/auth/register` — Register a new account
* `POST /api/auth/login` — Login and receive JWT access token + refresh cookie
* `POST /api/auth/refresh` — Issue a new access token
* `POST /api/auth/logout` — Clear auth credentials
* `GET /api/auth/verify-email/:token` — Confirm email verification
* `POST /api/auth/forgot-password` — Request password reset email
* `POST /api/auth/reset-password` — Perform password reset
* `GET /api/auth/me` — Retrieve active user details
* `PATCH /api/users/me` — Update active user details
