# CodeAlpha_SimpleEcommerceStore (TechKart)

A full-stack E-Commerce web application built for **Task 1** of the **CodeAlpha Full Stack Development Internship**.

## Features Implemented
- **Product Listings & Filtering:** Search products by keyword or filter by category (`Peripherals`, `Audio`, `Accessories`).
- **Product Details Modal:** View complete product specifications, ratings, and real-time stock count.
- **Shopping Cart:** Add items, adjust quantities, and persist cart state in `localStorage`.
- **User Registration & Login:** Password hashing (`SHA-256`) and user session support.
- **Order Processing & Inventory Deduction:** Placing an order automatically deducts product stock on the backend and records order history.

## Tech Stack
- **Frontend:** HTML5, CSS3, Vanilla JavaScript (Fetch API)
- **Backend:** Node.js, Express.js
- **Database:** Local JSON persistence (`data/store_db.json` auto-seeded on first start)

## How to Run Locally
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```
3. Open `http://localhost:5000` in your browser.

---
**Developed by:** Shaquib Tanveer (`tanveershaquib@gmail.com`)
