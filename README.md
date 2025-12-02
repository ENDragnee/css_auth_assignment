# Secure Access Control System

A comprehensive Next.js application demonstrating various **Access Control Models** (MAC, DAC, RBAC, RuBAC, ABAC) and robust security implementations including **Multi-Factor Authentication (MFA)**, **Encrypted Audit Logging**, and **Account Lockout Policies**.

Built with **Next.js 15 (App Router)**, **Tailwind CSS v4**, **MongoDB**, and **Docker**.

---

## 🚀 Features

### 🔐 Access Control Models

1.  **Mandatory Access Control (MAC):** Access based on strict security clearance levels (Public, Internal, Confidential).
2.  **Discretionary Access Control (DAC):** Resource owners can grant specific access to other users.
3.  **Role-Based Access Control (RBAC):** Permissions defined by hierarchical roles (Admin, Manager, Employee).
4.  **Rule-Based Access Control (RuBAC):** Access restricted by rules such as time of day (e.g., 9:00 AM - 5:00 PM).
5.  **Attribute-Based Access Control (ABAC):** Fine-grained logic based on user attributes (Department + Status).

### 🛡️ Security & Authentication

- **Multi-Factor Authentication (MFA):** TOTP implementation compatible with Google Authenticator/Authy.
- **Account Lockout:** Automatically locks accounts after 5 failed login attempts to prevent brute-force attacks.
- **Secure Registration:**
  - **Password Policy:** Enforces complexity (8+ chars, Uppercase, Number, Special char).
  - **Bot Prevention:** Custom Math CAPTCHA.
- **Audit Logging:** Tracks all access attempts and system events with **AES-256 encryption** in the database.
- **Session Management:** Secure token-based sessions using NextAuth.js.

### 💻 UI/UX

- **Theming:** Dark/Light mode support using `next-themes` and Tailwind CSS v4 (Dracula Theme).
- **Responsive Dashboard:** interactive interface to test different access scenarios.

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router)
- **Language:** TypeScript
- **Database:** MongoDB (via Mongoose)
- **Authentication:** NextAuth.js (v4 Configuration)
- **Styling:** Tailwind CSS v4, Lucide React (Icons)
- **Security Utils:** `bcrypt` (Hashing), `otplib` (MFA), `zod` (Validation), `crypto` (Log Encryption).
- **Containerization:** Docker & Docker Compose.
- **Package Manager:** pnpm

---

## ⚙️ System Setup & Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd css_auth
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Database (Localhost connection)
MONGODB_URI=mongodb://css_admin:qazwsxedc@localhost:27017/css_auth?authSource=admin

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=super_secret_random_string_here_123

# Logging Encryption (Must be a random string, code hashes it to 32 bytes)
LOG_ENCRYPTION_KEY=my_secure_logging_key_phrase
```

---

## 🐳 Running with Docker (Recommended)

This project is fully containerized. You can run the Database and the Next.js App together.

### 1. Build and Run

```bash
docker-compose up --build -d
```

### 2. Access the Application

- **App:** `http://localhost:3000`
- **MongoDB:** `localhost:27017`

### Docker Configuration Details

- **Database:** Uses `mongo:8.0.15`. Data is persisted in the `css_vol` volume.
- **App:** Uses a multi-stage `Dockerfile` (Base -> Builder -> Runner) based on `node:25.0-alpine` for an optimized production image.
- **Network:** Both services communicate via `css_network`.

---

## 🏃‍♂️ Running Locally (Development)

If you prefer to run the Next.js app on your machine while keeping the DB in Docker:

1.  **Start only MongoDB:**

    ```bash
    docker-compose up -d mongodb
    ```

2.  **Install Dependencies:**

    ```bash
    pnpm install
    ```

3.  **Seed the Database:**
    Open your browser or use curl to hit the seed endpoint. This creates the initial Admin, Manager, and Employee users.
    - URL: `http://localhost:3000/api/seed`

4.  **Run Development Server:**
    ```bash
    pnpm dev
    ```

---

## 🧪 How to Test (Walkthrough)

### 1. Database Seeding

Visit `http://localhost:3000/api/seed` to reset users and resources.

- **Default Password for all seeded users:** `password`

### 2. Testing Personas

The login page provides quick-select buttons for testing, or you can register a new account.

| Persona      | Email              | Role     | Clearance | Dept    | Best for Testing                                      |
| :----------- | :----------------- | :------- | :-------- | :------ | :---------------------------------------------------- |
| **Admin**    | `admin@test.com`   | Admin    | Level 3   | IT      | **MAC** (High clearance), **RBAC** (Admin actions)    |
| **Manager**  | `manager@test.com` | Manager  | Level 2   | Payroll | **ABAC** (Payroll access), **RBAC** (Manager actions) |
| **Employee** | `user@test.com`    | Employee | Level 1   | Sales   | **DAC** (Shared files), **RuBAC** (Time checks)       |

### 3. Testing Security Features

- **MFA:** Go to **Dashboard > Manage Profile**. Click "Setup MFA", scan the QR code with Google Authenticator, and verify. On next login, you will be asked for the code.
- **Account Lockout:** Try logging in with the wrong password 5 times. The account will lock for 15 minutes.
- **Audit Logs:** All actions (Login, Access Attempts, Registration) are encrypted and stored in the `auditlogs` collection in MongoDB.

---

## 📂 Project Structure

```
├── public/              # Static assets
├── scripts/             # Utility scripts (e.g., backup.sh)
├── src/
│   ├── app/             # Next.js App Router Pages
│   │   ├── api/         # API Routes (Auth, Seed)
│   │   ├── dashboard/   # Main Access Control Demo
│   │   ├── profile/     # MFA & Profile Settings
│   │   ├── register/    # Registration Page
│   │   └── actions.ts   # Server Actions (Logic)
│   ├── components/      # UI Components (ThemeSwitcher, etc.)
│   ├── lib/             # Utilities
│   │   ├── accessControl.ts # Logic for MAC, DAC, RBAC, etc.
│   │   ├── auth.ts          # NextAuth Configuration
│   │   ├── db.ts            # DB Connection
│   │   ├── logger.ts        # Encrypted Logging
│   │   └── password-utils.ts# Bcyrpt wrapper
│   └── models/          # Mongoose Schemas (User, Resource, AuditLog)
├── docker-compose.yml   # Docker Orchestration
├── Dockerfile           # Production Image Build
└── package.json
```

---

## 💾 Data Backups

A script is included to backup the MongoDB container.

1.  **Make executable:**
    ```bash
    chmod +x scripts/backup.sh
    ```
2.  **Run Backup:**
    ```bash
    ./scripts/backup.sh
    ```
    Backups are stored in the `./backups` folder as `.tar.gz` archives.

---

## 📜 License

This project is for educational purposes demonstrating system security and access control concepts.
