![Sharden Banner](./docs/sharden-banner.png)

Sharden is a fintech-based secure data transfer platform designed to enable financial institutions and fintech companies to exchange sensitive data seamlessly over APIs and through encrypted file transfers. It has been built with end-to-end encryption, role-based access control, and real-time monitoring which ensures confidentiality, integrity, and compliance with industry standards while providing a developer-friendly API-first architecture for effortless integration.


## Table of Contents

- [Features](#features)
- [Technical Stack](#technical-stack)
- [Architecture](#architecture)
- [API Endpoints](#api-endpoints)
- [Screenshots](#screenshots)
- [Installation](#installation)
- [Usage](#usage)
- [Security Highlights](#security-highlights)
- [Challenges We Solved](#challenges-we-solved)
- [Future Improvements](#future-improvements)


## Features

### **1. Multi-Role Authentication & Access Control**
- **Separate Logins:** Supports three distinct roles — `User`, `Bank Employee (Fintech Employee)`, and `Third-Party Vendor` — each with dedicated access and permissions.
- **Secure Session Management:** User and vendor sessions last 24 hours by default when fintech company shares data of user with vendor and can be **revoked by the bank at any time** for enhanced security.
- **Role-Based Data Flow:** Each role has specific access to data and transfer services, ensuring that no unauthorized entity can view or tamper with information.


### **2. Secure Data Transfer via APIs**
- **Vendor Onboarding with Verification:**  
  New vendors must submit a **registration form** and get **verified by the bank** before receiving access credentials and a **unique API token**.
- **Token-Based Authentication:**  
  API access requires a **user email**, **password**, **user token**, and **vendor token**, ensuring that no external or unauthorized party can interact with the service.
- **Audit Logging:**  
  All API interactions, tokens, and data transfer events are **logged in the database** for complete auditability.
- **Rate Limiting:**  
  Built-in **rate limiting** protects the platform against DDoS attacks or malicious API calls.
- **Mailer Alerts:**  
  Users are **instantly notified via email** whenever their data is accessed or transferred.


### **3. Secure File Transfer (AES Encryption)**
- **Client-Side AES Encryption:**  
  Files are encrypted **in the browser** using AES before being uploaded, ensuring **no plaintext file** ever reaches the server.
- **Ephemeral Keys:**  
  The **encryption key is never stored in the database**; only **metadata and the IV vector** are stored for verification.
- **Secure Decryption:**  
  Vendors can decrypt files **only if they possess the correct key or decryption link**.  
  If the key is missing or invalid, decryption and download are impossible.
- **Automatic Browser Decryption:**  
  Upon download, files are automatically decrypted **in the browser** and then delivered as readable content.
- **Transfer Expiry:**  
  Every file transfer has an **expiry time** — expired files are completely inaccessible, even with the key.
- **Revocable Access:**  
  Fintech employees can **revoke file access at any time**, preventing decryption even if the key/link is shared.
- **Mailer Notifications:**  
  Users receive **alert emails** for every file transfer event, adding another layer of transparency and trust.


### **4. Security Highlights**
- **End-to-End Encryption** with AES for files and secure token-based API communication.
- **24-Hour Session Management** with instant revocation by the bank.
- **Detailed Activity Logs** for both API calls and file transfers by storing everything in the database
- **Rate Limiting & Anti-DDoS** mechanisms to ensure service availability and resilience.


## Technical Stack

### **Frontend**
- **Next.js** – For server-side rendering and routing.
- **React** – Component-based UI for dynamic and interactive user interfaces.
- **TypeScript** – Ensures type safety and maintainable code for the frontend.

---

### **Backend**
- **Node.js (API Backend)** – Handles secure API endpoints, authentication, token management, and rate limiting for data transfer.
- **Flask (File Transfer Backend)** – Powers secure file upload/download with AES encryption and decryption flows.

---

### **Database**
- **PostgreSQL** – Stores user credentials, session tokens, vendor details, file metadata (excluding encryption keys), and logs for audit and monitoring.


