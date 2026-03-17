# Chronic Care Connect - System Setup & Walkflow

This guide outlines how to set up, run, and navigate the Chronic Care Connect system.

## 1. Prerequisites
- **Node.js**: Version 16.x or higher.
- **MySQL**: Installed and running locally.
- **Git** (optional): For version control.

---

## 2. Backend Setup (`medication-backend`)

The backend handles the API, Database management, and Real-time communication.

### Step 2.1: Database Preparation
1. Open your MySQL client (e.g., MySQL Workbench, CLI).
2. Create the system database:
   ```sql
   CREATE DATABASE medication_system;
   ```
3. (Optional) Run the initial [schema.sql](file:///c:/Users/STUDENTS/Documents/w/final2/final/Chronic_Care/Chronic%20Care/medication-backend/schema.sql) file located in the backend folder to pre-define the structure, though the backend will automatically add missing columns on startup.

### Step 2.2: Configuration
1. Navigate to the `medication-backend` directory.
2. Ensure the [.env](file:///c:/Users/STUDENTS/Documents/w/final2/final/Chronic_Care/Chronic%20Care/medication-backend/.env) file exists (or create it) with the following:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=YOUR_DB_PASSWORD
   DB_NAME=medication_system
   JWT_SECRET=mySuperSecretKey123
   MOMO_TARGET_ENV=sandbox
   MOMO_CURRENCY=EUR
   ```

### Step 2.3: Installation & Execution
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm run start
   ```
3. The server will run on **`http://localhost:5000`**. You should see "Server running on port 5000" in the logs.

---

## 3. Frontend Setup (`chronic-care-connect-well`)

The frontend is a modern React application powered by Vite and Tailwind CSS.

### Step 3.1: Installation & Execution
1. Navigate to the `chronic-care-connect-well` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. The application will be available at **`http://localhost:8080`**.

---

## 4. Full Operational Walkflow (End-to-End)

Follow these steps to experience the complete lifecycle of a medication order:

### Phase 1: Onboarding
1. **Patient Registration**: Navigate to `/auth`, select "Patient", and register.
2. **Email Verification**: Use the 6-digit code (simulated in logs or sent via email) to verify.
3. **Admin Verification**: Registered Providers (Pharmacies) and Doctors must be verified by an Admin before they can appear in assignment lists.

### Phase 2: Order Creation & Review
1. **Place Order**: As a Patient, go to "Request Medication", upload a medical certificate, and submit.
2. **Admin Review**: An Admin logs in, views the "Orders" dashboard, and assigns a **Doctor** to the pending order.
3. **Doctor Approval**: The assigned Doctor logs in, reviews the certificate, and approves the order with medicine details.

### Phase 3: Selection & Fulfillment
1. **Pharmacy Assignment**: The Admin selects the "Nearest Provider" (Pharmacy) based on the patient's location and assigns the order.
2. **Pharmacy Confirmation**: The Pharmacy logs in, confirms stock availability and price for the medication.
3. **Payment**: The Patient receives an invoice and triggers the **MTN MoMo payment**. (Succeeds automatically in sandbox).

### Phase 4: Delivery & Maintenance
1. **Fulfillment**: The Pharmacy marks the order as "Ready for Pickup" or "Dispatched".
2. **Reminders**: The Pharmacy sets up a daily medication reminder schedule for the patient via the "Reminders" tab.
3. **Support**: Patient and Doctor/Provider can use the real-time **Chat** feature at any time to discuss treatment.
