
# Petrol Pump Loyalty System

A customer loyalty and promotion management system for a petrol pump, built with Supabase for database, authentication, and storage. The system supports customer data management, loyalty points (1 point per liter, 100 points = ₹100 discount), promotions (e.g., ₹5/liter discount, 2% UPI cashback), and analytics for tracking effectiveness. It is designed for self-hosted deployment without reliance on external cloud platforms like AWS or GCP.

## Design Overview

### Objectives

- **Customer Data Management**: Store and manage customer profiles (name, mobile, preferences), transaction history, and loyalty points.
- **Loyalty Program**: Award points for fuel purchases and enable redemptions for discounts.
- **Promotions**: Automate discounts, cashback, and free services (e.g., windshield cleaning) at the Point of Sale (POS).
- **Analytics**: Track promotion effectiveness (redemption rates, customer retention) and transaction volumes.
- **Notifications**: Send SMS for offers, points updates, and redemptions.
- **Scalability**: Handle up to 1,000 daily transactions with low latency.

### System Architecture

#### Frontend:
- **Customer Web Interface**: React.js-based portal for customers to view points, offers, and transaction history.
- **Admin Dashboard**: Web-based interface for managers to monitor customers, transactions, and promotions.

#### Backend:
- **Framework**: Node.js with Express.js for RESTful APIs.
- **Database**: Supabase PostgreSQL for structured data (customers, transactions, loyalty points, promotions).
- **Authentication**: Supabase Auth for secure customer and admin logins (mobile/email-based).
- **Storage**: Supabase Storage for promotion images and receipts.
- **Notifications**: Integrated with a low-cost SMS API (e.g., TextLocal) for offer alerts.

#### Database Schema:
- **customers**: Stores customer details (id, name, mobile, email, preferences, created_at).
- **transactions**: Records fuel purchases (id, customer_id, liters, amount, payment_method, discount_applied, timestamp).
- **loyalty_points**: Tracks points earned/redeemed (id, customer_id, points_earned, points_redeemed, transaction_id, timestamp).
- **promotions**: Manages promotions (id, type [discount/cashback/free_service], value, start_date, end_date, active).

#### APIs:
- **POST /register**: Register a new customer.
- **POST /transaction**: Record a transaction, apply discounts, and award points.
- **GET /customer/:id/points**: Fetch customer's loyalty points balance.
- **POST /redeem**: Redeem points for discounts.
- **GET /promotions**: List active promotions.
- **GET /analytics**: Retrieve promotion effectiveness metrics.

#### Security:
- **Supabase Row-Level Security (RLS)** for data access control.
- **JWT-based authentication** for APIs.
- **Encrypted storage** for sensitive data (e.g., mobile numbers).

#### Deployment: 
Self-hosted using Docker Compose for Supabase, Node.js backend, and React frontend.

### Key Features

- **Loyalty Points**: Earn 1 point per liter of fuel; redeem 100 points for ₹100 discount.
- **Promotions**: Apply ₹5/liter discounts, 2% UPI cashback, or free services automatically.
- **Analytics**: Monitor redemption rates, customer retention, and transaction trends.
- **Notifications**: Send SMS for offers and points updates using TextLocal API.
- **Scalability**: Optimized for 1,000 daily transactions with Supabase's real-time capabilities.

## Project Info

**URL**: https://lovable.dev/projects/33f78860-493e-4e74-8141-528dc0dc8dc7

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/33f78860-493e-4e74-8141-528dc0dc8dc7) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/33f78860-493e-4e74-8141-528dc0dc8dc7) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
