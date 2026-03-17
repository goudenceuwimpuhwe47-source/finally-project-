# Chronic Care Connect - System Analysis

Based on the analysis of the project files, here is a detailed breakdown of what the "Chronic Care Connect" system is all about.

## Overview
The system is a comprehensive **Medication Ordering and Management Platform** designed to connect Patients, Doctors, Pharmacy Providers, and Administrators. It facilitates the end-to-end process of ordering medication for chronic diseases, getting doctor approvals, finding providers, managing payments, and tracking deliveries.

## System Architecture

The project is divided into two main components:

### 1. Frontend (`chronic-care-connect-well`)
- **Technology Stack**: React, TypeScript, Vite, Tailwind CSS, and `shadcn-ui` for UI components. It uses `react-router-dom` for navigation and `@tanstack/react-query` for data fetching.
- **User Roles & Dashboards**: The application provides specialized dashboards for different types of users:
  - **Patient Dashboard (`/dashboard`)**: To place medication orders, view prescriptions, chat with providers/doctors, and track order statuses.
  - **Doctor Dashboard (`/doctor`)**: To review patient orders, provide medical guidance, approve or reject medication requests, and communicate with patients.
  - **Provider Dashboard (`/provider`)**: For pharmacies to receive assigned orders, confirm stock availability, quote prices, manage inventory, and update pharmacy/delivery statuses.
  - **Admin Dashboard (`/admin`)**: For system administrators to oversee the entire platform, manage users, assign doctors to orders, assign providers, confirm payments, and view analytics reports.

### 2. Backend (`medication-backend`)
- **Technology Stack**: Node.js, Express.js, MySQL (via `mysql2`), Socket.IO (for real-time features), and JWT for authentication.
- **Core Modules**:
  - **Authentication ([auth.js](file:///c:/Users/STUDENTS/Documents/w/final2/final/Chronic_Care/Chronic%20Care/medication-backend/auth.js))**: Handles user registration, login, and Role-Based Access Control (RBAC).
  - **Orders ([orders.js](file:///c:/Users/STUDENTS/Documents/w/final2/final/Chronic_Care/Chronic%20Care/medication-backend/orders.js))**: The core workflow of the system. An order goes through multiple statuses: `admin_status`, `doctor_status`, `payment_status`, and `pharmacy_status`.
  - **Real-time Chat & Presence ([chat.js](file:///c:/Users/STUDENTS/Documents/w/final2/final/Chronic_Care/Chronic%20Care/medication-backend/chat.js) & [index.js](file:///c:/Users/STUDENTS/Documents/w/final2/final/Chronic_Care/Chronic%20Care/medication-backend/index.js))**: Uses Socket.IO to allow real-time messaging between Patients, Doctors, Providers, and Admins. It also tracks who is currently online.
  - **Stock Management ([stock.js](file:///c:/Users/STUDENTS/Documents/w/final2/final/Chronic_Care/Chronic%20Care/medication-backend/stock.js))**: Allows providers to manage their medication inventory, track stock items, and adjust quantities.
  - **Payments ([payments.js](file:///c:/Users/STUDENTS/Documents/w/final2/final/Chronic_Care/Chronic%20Care/medication-backend/payments.js))**: Integrates with MTN Mobile Money (MoMo) to process payments for the orders.
  - **Prescriptions & Reminders ([reminders.js](file:///c:/Users/STUDENTS/Documents/w/final2/final/Chronic_Care/Chronic%20Care/medication-backend/reminders.js))**: Allows providers/doctors to create digital prescriptions and set up medication reminders for patients.
  - **Notifications**: System-wide notifications (e.g., when an order is approved, or a message is received) using MySQL persistence and Socket.IO for real-time delivery.

## Typical Order Workflow
1. **Patient Places Order**: A patient submits their details, disease, requested dosage, and uploads a medical certificate.
2. **Admin Assigns Doctor**: The Admin reviews the new order and assigns it to a registered Doctor.
3. **Doctor Review**: The Doctor reviews the medical certificate. If approved, they provide guidance, exact medicine name, and dosage instructions.
4. **Admin Assigns Provider**: Once the doctor approves, the Admin assigns a Pharmacy Provider based on location proximity.
5. **Provider Confirmation**: The Provider confirms if they have the stock and provides a price quote.
6. **Payment**: The Patient pays (e.g., via MTN MoMo).
7. **Fulfillment**: The Provider prepares the order and updates the delivery status (`ready_pickup`, `dispatched`, `delivered`).

## Conclusion
"Chronic Care Connect" is a fully-featured telemedicine and e-pharmacy platform. It emphasizes real-time communication, strict workflow approvals (Doctor -> Admin -> Provider), and integrated tools like stock management and mobile payments to serve patients with chronic care needs efficiently.
