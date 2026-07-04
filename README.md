# 🍽️ RestroKit v2

> A modern, full-stack white-label restaurant website and management platform built for restaurants to manage their online presence, reservations, menus, offers, galleries, and more—all from a powerful admin dashboard.

---

## 🌐 Live Demo

**Website:** https://restrokit-v2.vercel.app/

---

# ✨ Features

## 🌍 Public Restaurant Website

* Responsive modern UI
* Hero Section
* About Section
* Dynamic Menu
* Chef Section
* Special Offers Carousel
* Gallery
* Customer Reviews
* Why Choose Us
* Reservation System
* Contact Section
* Mobile Friendly
* SEO Ready

---

## 🛠️ Restaurant Owner Dashboard

Restaurant owners can manage only their restaurant.

### Dashboard

* Overview & Statistics
* Reservations
* Customer Messages
* Menu Management
* Category Image Management
* Offers
* Gallery
* Chef Information
* Restaurant Information
* Hero Section
* About Section

---

## 👑 Super Admin Dashboard

Administrator has complete platform control.

### Admin can manage

* Restaurant Information
* Website Settings
* Hero Section
* About Section
* Menu
* Offers
* Gallery
* Chef Details
* User Profiles
* Restaurant Owners
* Audit Logs

---

# 🍴 Dynamic Menu Management

* Unlimited menu categories
* Veg / Non-Veg support
* Popular Badge
* Chef's Special Badge
* Availability Badge
* Category Image Management
* Cloudinary Image Storage
* Dynamic Rendering

---

# 🖼️ Cloudinary Integration

All editable media is stored securely on Cloudinary.

Supported uploads:

* Hero Images
* Chef Images
* Gallery Images
* Offer Banners
* Restaurant Images
* Menu Category Images

No editable images rely on local storage.

---

# 📅 Reservation Management

Customers can:

* Reserve a table online

Restaurant owners can:

* View reservations
* Confirm reservations
* Cancel reservations
* Resend confirmation emails
* Contact customers via WhatsApp
* Call customers directly

Reservation Status

* 🟡 Pending
* 🟢 Confirmed
* 🔴 Cancelled

---

# 📧 Email Notifications

Professional HTML emails are automatically sent.

Supported templates:

* Reservation Confirmed
* Reservation Cancelled

Architecture is ready for:

* Reservation Received
* Reservation Reminder
* Reservation Completed
* Feedback Request
* Welcome Email
* Password Reset

---

# 💬 WhatsApp Integration

One-click WhatsApp messaging.

Restaurant owners can instantly open WhatsApp with pre-filled messages.

Supported message types:

* Reservation Request Received
* Reservation Confirmed
* Reservation Cancelled

No WhatsApp Business API required.

No additional cost.

---

# ☎️ Quick Customer Actions

From the Reservation Dashboard:

* 📧 Resend Email
* 💬 WhatsApp Customer
* 📞 Call Customer

Making customer communication fast and effortless.

---

# 🔐 Authentication & Authorization

Secure JWT Authentication with Role-Based Access Control.

Roles:

* Super Admin
* Restaurant Owner

Permissions are enforced across the application.

---

# 📊 Audit Logs

Track important administrative actions across the platform, providing accountability and easier troubleshooting.

---

# 🚀 Tech Stack

## Frontend

* React
* JavaScript
* Tailwind CSS
* React Router
* Framer Motion
* Axios

## Backend

* FastAPI
* Python
* MongoDB
* JWT Authentication
* Pydantic

## Database

* MongoDB Atlas

## Media Storage

* Cloudinary

## Email Service

* SMTP (Nodemailer equivalent architecture using Python email service)

## Deployment

* Frontend: Vercel
* Backend: Render
* Database: MongoDB Atlas
* Media: Cloudinary

---

# 📁 Project Structure

```text
RestroKit-v2
│
├── frontend/
│   ├── src/
│   │   ├── admin/
│   │   ├── components/
│   │   ├── services/
│   │   ├── pages/
│   │   └── ...
│   │
│   └── package.json
│
├── backend/
│   ├── routes/
│   ├── models/
│   ├── services/
│   ├── email_service.py
│   ├── server.py
│   └── ...
│
└── README.md
```

---

# ⚡ Getting Started

## Clone Repository

```bash
git clone https://github.com/Arpithbhat-07/restrokit-v2.git
```

---

## Frontend

```bash
cd frontend

npm install

npm start
```

---

## Backend

```bash
cd backend

python -m venv venv

venv\Scripts\activate

pip install -r requirements.txt

uvicorn server:app --reload
```

---

# 🔧 Environment Variables

Create a `.env` file inside the backend folder.

```env
MONGODB_URI=

JWT_SECRET=

CLOUDINARY_CLOUD_NAME=

CLOUDINARY_API_KEY=

CLOUDINARY_API_SECRET=

EMAIL_USER=

EMAIL_PASS=

EMAIL_FROM=

SMTP_HOST=smtp.gmail.com

SMTP_PORT=587

SMTP_TLS=true
```

---

# 📸 Screenshots

Consider adding screenshots of:

* Landing Page
* Menu
* Reservation Section
* Admin Dashboard
* Restaurant Owner Dashboard
* Menu Management
* Offer Management
* Reservation Management

---

# 🗺️ Roadmap

Future enhancements planned:

* Online Payments
* QR Code Digital Menu
* Table Management
* Reservation Reminders
* Customer Feedback Collection
* Analytics Dashboard
* Multi-Restaurant (SaaS) Support
* Subscription Plans
* Custom Domains
* Multi-language Support

---

# 👨‍💻 Developer

**Arpith Bhat C**

Bachelor of Engineering (B.E.) – Artificial Intelligence & Machine Learning

GitHub: https://github.com/Arpithbhat-07

LinkedIn: https://www.linkedin.com/in/arpith-bhat

---

# ⭐ Acknowledgements

This project was built as a comprehensive full-stack learning project with a focus on scalable architecture, clean UI/UX, and real-world restaurant management workflows. It demonstrates modern web development practices, including role-based authentication, cloud media storage, transactional email workflows, dynamic content management, and production deployment.

If you find this project useful or inspiring, consider giving it a ⭐ on GitHub!
