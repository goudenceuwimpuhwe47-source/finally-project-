# Chronic Care Connect - Exhaustive System Use Cases

Below is the **100% complete and exhaustive list** of all possible actions and Use Cases for every role in the Chronic Care Connect system, extracted directly from the entire backend implementation.

---

## 1. Patient Use Cases (End User)

**Authentication & Profile:**
- **UC-PAT-01: Register Account:** Register as a Patient providing comprehensive personal details (Full name, 16-digit ID Card, Phone, Location [Province/District/Sector/Cell/Village], DOB, Gender), profile photo, and password.
- **UC-PAT-02: Verify Email:** Verify account using the 6-digit code sent via email to activate the login.
- **UC-PAT-03: Login & View Profile:** Authenticate to receive a JWT and fetch loaded profile data.
- **UC-PAT-21: View Full Profile Details:** Fetch all fields including medical history, diagnosis, and allergies.
- **UC-PAT-22: Update Contact Profile:** Update address (Location hierarchy), Phone, and Name.
- **UC-PAT-23: Update Medical Profile:** Update specific clinical data (Diagnosis, Allergies, Medical History, Primary Doctor Name).
- **UC-PAT-24: Change Password:** Securely update account password by verifying current credentials.

**Order & Payment Management:**
- **UC-PAT-04: Create Medication Order:** Submit a medication request with disease type, dosage, payment method, dynamic location tracking, and an uploaded medical certificate (PDF/JPEG/PNG). (Automatically updates the patient's location profile).
- **UC-PAT-05: Edit Pending Order:** Modify an order's details or re-upload a medical certificate *only* while the order is perfectly pending across all roles.
- **UC-PAT-06: Cancel Order:** Soft-cancel an order (preventing further processing) *only* if the order is still completely pending.
- **UC-PAT-07: Track Order Status:** Fetch a list of all active orders mapping the real-time statuses (`admin_status`, `doctor_status`, `payment_status`, `pharmacy_status`).
- **UC-PAT-25: Pay via MTN MoMo:** Trigger an "MTN Request to Pay" flow. Patient provides their MoMo Phone number (2507XXXXXXXX) to receive a USSD push for payment confirmation.
- **UC-PAT-26: View Payment History:** Track the status of active MoMo payments (`PENDING`, `SUCCESSFUL`, `FAILED`).

**Health & Symptom Tracking:**
- **UC-PAT-27: Log Daily Symptoms:** Submit daily tracking logs for `Pain Level` (0-10), `Fatigue Level` (0-10), and text-based `Notes`.
- **UC-PAT-28: View Today's Logs:** Retrieve the chronological list of symptom logs submitted in the last 24 hours.
- **UC-PAT-29: View Health Summary:** View a rapid dashboard summary showing the most recent pain/fatigue readings and the total log count for the day.

**Medical Guidance & Prescriptions:**
- **UC-PAT-08: View Prescriptions:** View a history of all digital prescriptions assigned to them by Doctors/Providers.
- **UC-PAT-09: View Doctor's Guidance:** Access specialized doctor guidance directly tied to an approved order (includes exact medicine name, prescription quantity, doctor instructions, and adherence plan).
- **UC-PAT-10: View Medication Overview:** View a combined list of recent approved orders directly mapped to their latest digital prescriptions.

**Reminders & Notifications:**
- **UC-PAT-11: View Scheduled Alerts:** Fetch a paginated list of all active medication reminders/events scheduled by their provider.
- **UC-PAT-12: Fetch Next Due Alert:** Fetch the exact next pending/sent medication alert due right now or within the next 2 minutes.
- **UC-PAT-13: View Alerts Badge Count:** Fetch the raw integer counts of pending vs. total alerts for UI badging.
- **UC-PAT-14: Mark Medication as Taken:** Mark a specific scheduled medication event as `taken`.
- **UC-PAT-30: View Notifications Box:** Fetch the general "System Notifications" list (unread/read) related to order updates, payments, and system alerts.
- **UC-PAT-31: Mark Notification Read:** Mark a specific system notification as read to clear UI indicators.

**Communication (Real-time Socket & REST):**
- **UC-PAT-15: Send/Receive Messages:** Dispatch/listen for real-time Socket.IO messages to assigned Doctors, assigned Providers, or global Admins.
- **UC-PAT-16: Fetch Message History (Admin):** Fetch paginated history of chats with the Admin.
- **UC-PAT-17: Fetch Message History (Doctor):** Fetch paginated history of chats with specific assigned Doctors.
- **UC-PAT-18: Fetch Message History (Provider):** Fetch paginated history of chats with specific assigned Providers.
- **UC-PAT-19: Mark Thread Read:** Mark specific threads with Admins, Doctors, or Providers as `read` to clear badges.
- **UC-PAT-20: Presence & Typing:** Send/Receive "User is Typing" and "User is Online/Offline" real-time indicators.

---

## 2. Doctor Use Cases (Clinical Approver)

**Clinical Order Management:**
- **UC-DOC-01: View Assigned Orders:** View the list of active orders assigned specifically to them by the Admin.
- **UC-DOC-02: Approve Medication Request:** Review patient certificates and approve orders. Must provide: `medicine_name`, `prescription_quantity`, `doctor_instructions`, `doctor_advice` (optional), and `adherence_plan` (optional).
- **UC-DOC-03: Reject Medication Request:** Reject an invalid medication request. Must submit a required `reason`.
- **UC-DOC-04: View Action History:** View a historical log of all the specific orders this doctor has explicitly approved or rejected.

**Account & Notifications:**
- **UC-DOC-09: Manage Profile:** Update contact and professional details.
- **UC-DOC-10: View System Notifications:** Access the personal notifications inbox for order assignments and chats.

**Communication:**
- **UC-DOC-05: View Assigned Patients:** Fetch a list of active patients that have orders assigned to the doctor, including last message preview and unread count.
- **UC-DOC-06: Fetch Patient Chat History:** Fetch paginated message history with a specific patient.
- **UC-DOC-07: Mark Thread Read:** Mark messages from a specific patient as read.
- **UC-DOC-08: Real-time Chat:** Send and receive real-time Socket.IO messages, presence, and typing indicators to/from their assigned patients.

---

## 3. Provider / Pharmacy Use Cases (Fulfillment)

**Stock / Inventory Management:**
- **UC-PRV-01: View Stock List:** View all current medical stock items managed by the provider.
- **UC-PRV-02: Create Stock Item:** Add a new stock entry ([name](file:///c:/Users/STUDENTS/Documents/w/final2/final/Chronic_Care/Chronic%20Care/medication-backend/orders.js#44-48), `sku`, `quantity`, `unit_price`, `mfg_date`, `exp_date`).
- **UC-PRV-03: Update Stock Item:** Modify the details or base quantity/price of an existing stock item.
- **UC-PRV-04: Delete Stock Item:** Completely remove a stock item from the inventory.
- **UC-PRV-05: Manage Stock Movements:** Manually log specific stock adjustments ([in](file:///c:/Users/STUDENTS/Documents/w/final2/final/Chronic_Care/Chronic%20Care/medication-backend/orders.js#39-44), `out`, or `adjust`) with corresponding notes, tracking historical movements.
- **UC-PRV-06: View Movement History:** Fetch the chronological transaction log of a specific stock item.

**Order Fulfillment:**
- **UC-PRV-07: View Assigned Orders:** Fetch orders explicitly assigned to the Provider by the Admin.
- **UC-PRV-08: Confirm Availability / Quote Details:** Accept an assigned order by linking it to a `stock_id`, committing a `quantity`, and automatically snapping the `unit_price` total. (Marks as `provider_confirmed=1`).
- **UC-PRV-09: Reject Order Assignment:** Reject an assigned order (e.g., due to stock-out) providing a required note. Automatically unassigns the provider and flags for Admin reassignment.
- **UC-PRV-10: Update Pharmacy Status:** Update the progression of a paid order (`ready_pickup`, `ready_delivery`, `dispatched`, `delivered`).

**Prescriptions & Reminders:**
- **UC-PRV-11: Generate Digital Prescription:** Explicitly create a formal digital prescription record based on an approved order, explicitly setting dosages, durations, and instructions.
- **UC-PRV-12: View Patient Summary:** Fetch a patient's historical profile fetching both past orders and past prescriptions handled by this provider.
- **UC-PRV-13: Create Medication Reminders:** Schedule automated reminder campaigns mapping to a patient, order, and prescription. Provider configures daily frequency, specific array of `times` (HH:MM), and a `start_date`/`end_date`. (This schedules cron-like events and emails).
- **UC-PRV-14: View Active Reminders:** List all active and tracked reminders managed by the provider.
- **UC-PRV-15: Cancel Reminder:** Stop an ongoing reminder schedule, marking future scheduled events as `skipped`.
- **UC-PRV-16: Delete Reminder:** Perform a hard database cascade delete on a reminder and all its tracking events.

**Communication & Account:**
- **UC-PRV-20: Manage Profile & Security:** Update pharmacy details and change login credentials.
- **UC-PRV-21: View Fulfillment Alerts:** Receive notifications for new payments and order assignments.
- **UC-PRV-17: View Patient Contacts:** Fetch a list of active assigned patients with last message previews and unread counts.
- **UC-PRV-18: Chat with Patient:** Fetch and mark read message histories, and use real-time sockets to chat with assigned patients.
- **UC-PRV-19: Chat with Admin:** Use the REST/Socket pipeline to communicate directly with central Administrators for support.

---

## 4. Admin Use Cases (System Management)

**System Analytics & Reports:**
- **UC-ADM-01: View Live Analytics Summary:** Fetch top-level dashboard metrics (Total Orders, Pending Orders, Total Patients, Total Providers, Total Doctors).
- **UC-ADM-02: Generate Analytics Report:** Instruct the backend to snapshot data and generate a formalized report (`patient_engagement`, `medication_usage`, or `provider_activity`).
- **UC-ADM-03: Export Report:** Export a generated report payload dynamically to either raw `JSON` or streamed `CSV` file formats.

**Global Order Management:**
- **UC-ADM-04: View Recent Orders:** Fetch a quick preview loop of the absolute newest orders.
- **UC-ADM-05: View Global Orders:** Fetch a heavily paginated, searchable, status-filterable (`adminStatus`, `pharmacyStatus`) view of all system orders.
- **UC-ADM-06: Assign Doctor:** Assign a specific doctor to a universally pending order. (Transitions `admin_status` to `under_review`).
- **UC-ADM-07: Search Nearest Providers:** Search the system for the closest geographical Pharmacy match for a specific order by cascading location match (`village` -> `cell` -> `sector` -> `district` -> `province` -> `all`).
- **UC-ADM-08: Assign Provider:** Explicitly assign a Pharmacy to a doctor-approved order.
- **UC-ADM-09: Update Payment Status:** Explicitly define the payment pipeline state (`pending`, `confirmed`, `approved`, `failed`).
- **UC-ADM-10: Final Approval (Admin_Status):** Issue the final system seal (`approved` or `rejected`) on an order, completing the workflow loops. Only allowed if Doctor is 'approved' and Payment is 'confirmed'. Emits final patient/provider Socket.IO emails/alerts.

**User & Entity Management:**
- **UC-ADM-11: List Patients:** Fetch a robust list of all patients on the platform.
- **UC-ADM-12: View Patient Details:** Fetch a deep-dive on a single patient including generated activity counts (`ordersCount`, `prescriptionsCount`, `remindersCount`).
- **UC-ADM-13: List Doctors:** Fetch a lightweight list of all doctors for dropdown assignments.
- **UC-ADM-14: List/Manage Providers & Pharmacies:** Fetch lists of all healthcare providers and explicitly manage their verification flag (`verified`, `rejected`, `pending`).
- **UC-ADM-15: Create Local Pharmacy:** Manually provision a direct pharmacy entity, auto-generating an active Provider user record with explicit delivery radiuses and license numbers.

**Global Administration:**
- **UC-ADM-16: Receive System Notifications:** Fetch internal MySQL notifications indicating new orders and alerts. Mark internal notifications as read.
- **UC-ADM-17: Global Inventory Review:** Pull a master list of all stock items compiled across EVERY provider in the system for auditing.
- **UC-ADM-18: Manage System Settings:** Edit application runtime JSON configurations including `email_notifications_enabled`, `backup_schedule_cron`, and `require_2fa`.
- **UC-ADM-19: Admin Chat Hub:** Read from a master list of all patient messages and pharmacy support messages. Send targeted chat responses globally.

---

## 5. Public / Landing Page Use Cases

- **UC-PUB-01: View System Statistics:** Any visitor can view the live count of active patients, providers, and doctors directly on the landing page.
- **UC-PUB-02: Browse Disease Support Areas:** View the list of chronic conditions supported by the platform.
- **UC-PUB-03: Contact Support:** Access general contact and branding information.

