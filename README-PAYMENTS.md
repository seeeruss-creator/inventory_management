# 💸 Implementing GCash / Online Payments

This guide provides a high-level overview of how you can integrate GCash or other inline payments into your existing React + Express inventory management system. 

**Note:** No code has been modified in your project. This is purely an architectural guide for your reference.

---

## 1. How It Works (The Payment Flow)
Integrating a payment system means your application must communicate securely with a **Payment Gateway**. You cannot process GCash directly on your own servers due to highly strict financial regulations; instead, you rely on authorized gateways to do the heavy lifting.

**The Step-by-Step Flow:**
1. **Initiation (Frontend):** A user selects items in your React app and clicks "Pay with GCash".
2. **Intent Creation (Backend):** Your React app sends a request with the total amount to your Express.js server (e.g., `POST /api/checkout`).
3. **Gateway Communication:** Your Express server securely contacts the Payment Gateway API (using secret API keys) to create a "Payment Link" or "Checkout Session" for that specific amount.
4. **Redirection (Frontend):** The Express server receives the payment link and passes it back to React. React redirects the user's browser to the secure GCash payment page provided by the gateway.
5. **The Transaction:** The user logs into GCash on their phone and authenticates the payment.
6. **The Webhook (Backend):** Once the user pays successfully, the gateway sends a hidden background HTTP request (called a **Webhook**) directly to your Express server (e.g., `POST /api/webhook/payment-success`).
7. **Fulfillment:** Your Express server receives the webhook, verifies it is legitimate, updates your database (e.g., automatically deducting the items from stock using your `transactions` table), and marks the order as Paid.

---

## 2. Recommended Payment Gateways (Philippines)
To accept GCash, you need a provider that supports Philippine payment methods natively.

1. **PayMongo (Highly Recommended)**
   - Easiest API to work with heavily focused on the PH market.
   - Supports GCash, Maya, GrabPay, and standard Credit/Debit Cards.
   - Very clear documentation for Next.js/React and Node.js.
2. **Xendit**
   - Extremely robust and used globally across Southeast Asia.
   - Offers incredible flexibility with direct API integration or hosted UI checkouts.

---

## 3. How to Implement it in Your Specific System

If you decide to execute this in the future, here is how you would map it to your specific stack (`Vite/React` + `Express` + `MySQL`).

### Phase 1: Database Updates
You currently track items and simple in/out transactions. You would need to add an `orders` table to track pending payments.
- **`orders` table:** `id`, `user_id`, `total_amount`, `status` (pending, paid, failed), `payment_id` (from the gateway), `created_at`.

### Phase 2: Express Backend (`server/index.js`)
You would need to install the SDK of your gateway (e.g., `npm install paymongo`) and add two main routes:
1. **The Checkout Route:**
   - A secure endpoint that receives an array of item IDs from React, calculates the total price by querying the `items` database (never trust the frontend price!), and asks the gateway for a URL.
2. **The Webhook Route:**
   - A public, unsecured endpoint that the gateway can hit when the user pays successfully. It verifies the payload cryptographically, finds the `order` in the database, and calls your existing `UPDATE items SET stock = stock - ?` logic.

### Phase 3: React Frontend (`DashboardPage.jsx`)
1. Add a shopping cart or checkout modal where users can tally up their total.
2. Add a `Checkout with GCash` button.
3. When clicked, Axios hits your backend checkout route, waits for the returned URL, and runs `window.location.href = data.checkoutUrl` to send them to GCash.

### Phase 4: Security
- **Never expose your Secret Keys:** Your Payment Gateway will give you a "Public Key" and a "Secret Key". The Secret Key MUST stay inside your `server/.env` file. Never put it in your React app.
- **Always verify Webhooks:** Anyone can spoof a request to your Webhook URL saying "I paid!". You must use cryptographic signature validation (provided rigidly in the gateway documentation) to prove the webhook physically originated from PayMongo/Xendit before you deduct stock.
