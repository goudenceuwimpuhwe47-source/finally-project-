# Chronic Care Connect: A Distributed Orchestration Platform for Chronic Disease Management

## 1. Abstract
Chronic Care Connect is an advanced, full-stack medical orchestration system designed to mitigate the complexities of chronic disease management. By leveraging a distributed architecture, the platform synchronizes the workflows of Patients, Physicians, Pharmacists (Providers), and System Administrators. The project aims to reduce communication latency, improve medication adherence, and provide a secure repository for longitudinal patient data.

## 2. Theoretical Framework & Architecture
The application is built on a **Modular Micro-Monolith Architecture**, ensuring high cohesion and low coupling between system components.

### 2.1 Frontend Specification (Client-Side)
Developed as a high-performance Single Page Application (SPA):
- **Reactive State Management**: Utilizing `TanStack Query` for de-duplicating network requests, managing server-side state, and providing intelligent caching.
- **Component-Driven UI**: Built with `Vite`, `React 18`, and `TypeScript`. UI components are derived from `Radix UI` primitives for maximum accessibility (WCAG compliance).
- **Styling Paradigm**: Implementation of a dynamic design system using `Tailwind CSS`, featuring customized theme tokens for healthcare environments.
- **Real-time Event Handling**: Bi-directional communication facilitated by `Socket.io-client` for low-latency notifications and chat.

### 2.2 Backend Specification (Server-Side)
A robust RESTful API layer optimized for data integrity and security:
- **Environment**: Node.js (v18+) with Express.js.
- **Data Persistence**: MySQL Relational Database with strict schema enforcement to maintain ACID properties (Atomicity, Consistency, Isolation, Durability) for medical records.
- **Stateless Authentication**: JSON Web Tokens (JWT) for secure, scalable authentication across distributed nodes.
- **Asynchronous Services**: Nodemailer integration for automated transactional email workflows.

## 3. Core Functional Modules
- **Patient Engagement Module**: Enables longitudinal tracking of chronic symptoms, medication history, and direct consultation requests.
- **Clinical Decision Support (Doctor)**: A dedicated interface for medical professionals to review patient data, issue validated digital prescriptions, and provide specialized clinical advice.
- **Pharmacy & Fulfillment (Provider)**: Inventory-linked medication fulfillment system with integrated real-time order tracking.
- **Orchestration Layer (Admin)**: Holistic system monitoring, role-based access control, and master data management.

## 4. Security & Ethical Considerations
- **Data Privacy**: Implementation of secure hashing (Bcrypt) for credential storage.
- **Access Control**: Role-Based Access Control (RBAC) middleware ensuring data silos are maintained between different user tiers.
- **CORS Protection**: Hardened Cross-Origin Resource Sharing policies to prevent unauthorized cross-site interactions.
- **Stateless Logic**: JWT-based session management reduces server-side session-fixation risks.

## 5. Technical Stack
| Category | Technology |
| :--- | :--- |
| **Frontend** | React, Vite, TypeScript, Tailwind CSS, Radix UI |
| **Backend** | Node.js, Express.js, JWT, Bcrypt |
| **Real-time** | Socket.io |
| **Database** | MySQL |
| **Testing** | ESLint, TypeScript Compiler |
| **Design** | Shadcn/UI, Lucide Icons |

## 6. Installation & Deployment
For detailed deployment instructions, including cloud configuration for Render and Vercel, please refer to the [Deployment Walkthrough](./Chronic%20Care/deployment_walkthrough.md).

### Quick Setup (Local)
1.  **Backend**: Navigate to `medication-backend`, run `npm install` and `npm start`.
2.  **Frontend**: Navigate to `chronic-care-connect-well`, run `npm install` and `npm run dev`.

---
**Lead Researcher/Developer:** Uwimpuhwe Gaudence  
**Faculty:** Computing information sciences  
**Department:** Software engineering  
**Contact:** [goudenceuwimpuhwe47@gmail.com](mailto:goudenceuwimpuhwe47@gmail.com)
