# FinTrack — Personal Finance & Portfolio Tracker

FinTrack is a comprehensive, full-stack personal finance application designed to help you track your income, expenses, budgets, stock portfolio, and personal loans all in one place.

![FinTrack Dashboard](frontend/dist/vite.svg) *// Replace with actual screenshot*

## 🌟 Features

*   **Secure Authentication**: Password hashing with bcrypt, JSON Web Tokens (JWT) for session management, and robust Email OTP verification for new registrations.
*   **Transaction Management**: Add, edit, and categorize your daily income and expenses.
*   **Budget Tracking**: Set up category-wise budgets and monitor your spending limits visually.
*   **Live Stock Portfolio**: Search for global stocks and track your investments with real-time price fetching directly from Yahoo Finance APIs. Includes P/L calculations and allocation charts.
*   **Loans Tracker**: Keep a detailed ledger of money you've lent out, add notes, and mark loans as pending or repaid.
*   **Analytics Dashboard**: Visual breakdowns and historical trends of your financial data.
*   **Responsive UI**: Modern, glassmorphism-inspired design with Light/Dark mode transitions.

## 🛠️ Tech Stack

### Frontend
*   **Framework**: React 18 (bootstrapped with Vite)
*   **Routing**: React Router DOM
*   **State Management**: React Context API
*   **Styling**: Pure CSS (Custom properties, Flexbox/Grid, CSS Variables for theming)
*   **Charts & Visuals**: Chart.js (`react-chartjs-2`) for rich data visualization

### Backend
*   **Runtime**: Node.js
*   **Framework**: Express.js
*   **Database**: SQLite (`better-sqlite3` for high performance synchronous queries)
*   **Emailing**: `nodemailer` (Supports dev-mode via Ethereal and production via Gmail)
*   **Security**: `bcryptjs` (password hashing), `jsonwebtoken` (auth tokens), `express-validator` (input sanitization)

### APIs Integrated
*   **Yahoo Finance API**:
    *   `v1/finance/search` for real-time stock ticker auto-completion.
    *   `v8/finance/chart` for fetching live, accurate stock quotes without stringent rate-limit/auth requirements.

## 🗄️ Database Schema (SQLite)

The application uses an embedded SQLite database (`data/finance.db`). Tables are auto-generated on first run:
*   `users`: Stores user credentials and OTP data.
*   `transactions`: Logs all financial activities (income/expense).
*   `budgets`: Tracks category spending limits.
*   `stocks`: Stores stock symbol, buy price, and quantity.
*   `loans`: Ledger for lent money and repayment status.
*   `migration_flags`: Tracks internal database migrations to prevent duplicate runs.

## 🚀 Getting Started (Local Development)

### Prerequisites
*   Node.js (v18+ recommended)
*   Git

### Installation
1.  **Clone the repository:**
    ```bash
    git clone https://github.com/YOUR_USER/finance-tracker.git
    cd finance-tracker
    ```

2.  **Install dependencies:**
    ```bash
    # Install backend dependencies
    cd backend
    npm install

    # Install frontend dependencies
    cd ../frontend
    npm install
    ```

3.  **Environment Variables (`backend/.env`):**
    Create a `.env` file in the `backend/` directory:
    ```env
    PORT=4000
    JWT_SECRET=your_super_secret_jwt_key
    DB_PATH=./data/finance.db
    # To enable real OTP emails, add your Gmail credentials:
    EMAIL_USER=your_email@gmail.com
    EMAIL_PASS=your_gmail_app_password
    ```

4.  **Run the Application:**
    You'll need two terminal windows.
    *   Terminal 1 (Backend):
        ```bash
        cd backend
        node server.js
        ```
    *   Terminal 2 (Frontend):
        ```bash
        cd frontend
        npm run dev
        ```
    Visit `http://localhost:5173` in your browser.

## 📦 Production Deployment

The project is configured to be deployed as a monolithic full-stack app. The Express backend is set up to automatically serve the statically built React frontend.

1.  **Build the Frontend:**
    ```bash
    cd frontend
    npm run build
    ```
2.  **Deploy the Backend:**
    You can deploy the root or `backend` directory to services like **Railway**, **Render**, or a custom **VPS**.
    *   Set the root directory to `backend`.
    *   Set the build command to install both frontend and backend deps, and build the frontend: `cd ../frontend && npm install && npm run build && cd ../backend && npm install`
    *   Set the start command to `node server.js`.
    *   Ensure your production Environment Variables are set in the hosting dashboard.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome!

## 📝 License
This project is open-source and available under the MIT License.
