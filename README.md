# Chronic Care Connect: A Comprehensive Telemedicine and E-Pharmacy Management System

## Abstract
Chronic Care Connect is an advanced digital healthcare platform engineered to streamline the medication lifecycle for patients with chronic conditions. By integrating teleconsultation, electronic prescription management, and real-time pharmacy fulfillment, the system bridges the gap between healthcare providers and patients. The platform employs a robust Role-Based Access Control (RBAC) model, ensuring secure and efficient collaboration between Patients, Doctors, Pharmacy Providers, and Administrators.

---

## 1. System Overview
Chronic Care Connect is designed to address the complexities of chronic disease management in a digital-first environment. Unlike generic e-commerce platforms, it implements a clinical workflow where medication dispensing is gated by professional medical review and administrative verification.

### Key Objectives:
- **Clinical Integrity**: Ensuring all medication requests are reviewed and approved by qualified medical professionals.
- **Supply Chain Efficiency**: Connecting patients with the nearest verified pharmacy providers.
- **Patient Adherence**: Improving health outcomes through automated medication reminders and symptom tracking.
- **Financial Integration**: Facilitating secure payments via widely adopted mobile money solutions (MTN MoMo).

---

## 2. Core Features

### 2.1 Multi-Dimensional Dashboards
- **Patient Portal**: Order medication, upload clinical documentation, track real-time delivery status, and maintain a daily symptom log.
- **Clinical Review (Doctor)**: Evaluate patient-submitted medical certificates, issue digital guidance, and authorize precise pharmaceutical regimens.
- **Pharmacy Operations (Provider)**: Manage inventory, confirm stock availability, issue price quotes, and fulfill deliveries.
- **System Oversight (Admin)**: Orchestrate the entire ecosystem, including user verification, doctor-order assignment, and repository analytics.

### 2.2 Advanced Communication
- **Real-time Synchronization**: Leveraging WebSocket (Socket.IO) technology for instantaneous messaging and system-wide notifications.
- **Presence Tracking**: Real-time status indicators (Online/Offline) and typing notifications to enhance user engagement.

### 2.3 Management & Adherence
- **Inventory Control**: Comprehensive stock management for providers with SKU tracking and movement history.
- **Adherence Engine**: Automated scheduling of medication reminders with patient-side confirmation mechanics.
- **Health Analytics**: Secure logging of patient pain and fatigue levels for longitudinal health assessment.

---

## 3. Technological Architecture

### 3.1 Frontend Infrastructure
- **Framework**: [React.js](https://reactjs.org/) (Version 18+)
- **Build Tool**: [Vite](https://vitejs.dev/) for high-performance HMR and optimized production bundling.
- **Language**: [TypeScript](https://www.typescriptlang.org/) ensuring type-safe development and reduced runtime errors.
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with [shadcn/ui](https://ui.shadcn.com/) for a modern, responsive, and accessible interface.
- **State Management**: [TanStack Query (React Query)](https://tanstack.com/query/latest) for declarative server-state management.

### 3.2 Backend Infrastructure
- **Runtime**: [Node.js](https://nodejs.org/) (LTS Version)
- **Web Framework**: [Express.js](https://expressjs.com/) for building a scalable RESTful API.
- **Database**: [MySQL](https://www.mysql.com/) for structured, ACID-compliant data persistence.
- **Security**: JSON Web Tokens (JWT) for stateless authentication and Bcrypt for advanced credential hashing.
- **Integration**: MTN MoMo Collections API for automated payment processing.

---

## 4. Operational Workflow

The system follows a strict, verification-gated workflow to ensure clinical safety:

1.  **Initiation**: Patient submits a medication request accompanied by a medical certificate.
2.  **Clinical Review**: An Administrator assigns the order to a Doctor, who performs a clinical audit and issues guidance.
3.  **Fulfillment Assignment**: Administrator identifies the most appropriate Pharmacy Provider based on geographical proximity.
4.  **Quote & Payment**: The Provider confirms stock; the Patient settles the invoice via mobile money.
5.  **Dispensing**: The Provider updates the logistical status from preparation to final delivery.

---

## 5. Getting Started

### Prerequisites
- Node.js (v16.x or later)
- MySQL Server (v8.0+)
- NPM or Yarn package manager

### Installation

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/goudenceuwimpuhwe47-source/finally-project-.git
    cd finally-project-
    ```

2.  **Backend Configuration**
    - Navigate to `Chronic Care/medication-backend`
    - Create a `.env` file based on the provided specifications.
    - Run `npm install` and `npm start`.

3.  **Frontend Configuration**
    - Navigate to `Chronic Care/chronic-care-connect-well`
    - Run `npm install` and `npm run dev`.

### Database Setup
The system features an automated schema synchronization engine that ensures all tables (Users, Orders, Prescriptions, Reminders, etc.) are correctly initialized upon the first server execution.

---

## 6. License & Acknowledgments
This project was developed for academic and professional advancement. All rights reserved.

**Developed by**: Uwimpuhwe Gaudence
**Contact**: goudenceuwimpuhwe47@gmail.com
