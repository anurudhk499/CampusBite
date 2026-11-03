<div align="center">

# CampusBite

### Smart Campus Canteen Pre-Ordering System

Skip the queue. Browse the menu. Pre-order your meals. Pick them up on time.

<img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python">
<img src="https://img.shields.io/badge/Flask-3.x-000000?style=for-the-badge&logo=flask&logoColor=white" alt="Flask">
<img src="https://img.shields.io/badge/SQLite-Database-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite">
<img src="https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
<img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5">
<img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3">

</div>

---

## Table of Contents

- [About the Project](#about-the-project)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Installation and Setup](#installation-and-setup)
- [Staff Account Setup](#staff-account-setup)
- [Order Workflow](#order-workflow)
- [Future Enhancements](#future-enhancements)
- [Security and Deployment Notes](#security-and-deployment-notes)
- [Developer](#developer)

---

## About the Project

**CampusBite** is a web-based canteen pre-ordering system that makes food ordering simple for students and order handling easier for canteen staff.

Campus canteens often suffer from long queues, overcrowding, and delays during peak hours. CampusBite solves this by letting students browse the menu, build a cart, choose a pickup slot, and place an order online. Staff get a dedicated dashboard to manage incoming orders, search records, and update preparation status.

> **Goal:** Make campus food ordering faster, smarter, and more convenient.

---

## Key Features

### Student Module

- Interactive food menu with images and descriptions
- Categories: South Indian, Snacks, Rice & Noodles, Beverages
- Search and filter food items
- Add, remove, and adjust item quantities in the cart
- Automatic price and total calculation
- Pickup date and time slot selection with availability and capacity checks
- Unique order tracking token for every order
- Real-time order status tracking through server-backed updates
- Order cancellation while still in the confirmed stage

### Staff Module

- Secure staff login and protected dashboard
- View and search incoming orders with customer and order details
- Update order status across the full lifecycle:
  `Confirmed` > `Preparing` > `Ready for Pickup` > `Completed` (or `Cancelled`)
- Register additional staff accounts through authenticated access
- Auto-refreshing dashboard

### Interface

- Responsive design for desktop and mobile
- Purple, gold, and white theme
- Separate student and staff interfaces

---

## Technology Stack

| Technology | Purpose |
|---|---|
| Python | Backend programming |
| Flask | Web framework and REST APIs |
| SQLite | Database |
| HTML5 | Page structure |
| CSS3 | Styling and responsive layout |
| JavaScript | Cart logic and frontend interactions |
| Jinja2 | Dynamic HTML templating |
| Werkzeug | Password hashing and authentication utilities |

---

## Architecture

```text
                CAMPUSBITE
                    |
          ---------------------
          |                   |
     Student Module      Staff Module
          |                   |
     Food Menu            Staff Login
     Shopping Cart        Dashboard
     Pickup Slots         Order Management
     Place Orders         Update Status
     Track Orders         Search Orders
          |                   |
          ---------------------
                    |
              Flask Backend
                    |
                REST APIs
                    |
             SQLite Database
```

---

## Project Structure

```text
CampusBite/
├── app.py
├── create_staff.py
├── campusbite.db
├── requirements.txt
├── README.md
│
├── static/
│   ├── campusbite-hero.png
│   ├── logo.png
│   ├── script.js
│   └── style.css
│
└── templates/
    ├── auth.html
    ├── index.html
    ├── staff.html
    ├── staff_login.html
    └── staff_register.html
```

---

## Installation and Setup

**Prerequisites:** Python 3.10 or higher and Git.

**1. Clone the repository**

```bash
git clone https://github.com/YOUR-USERNAME/CampusBite.git
cd CampusBite
```

**2. Create and activate a virtual environment**

```bash
python -m venv .venv
```

Windows (PowerShell):

```powershell
.\.venv\Scripts\Activate.ps1
```

Linux / macOS:

```bash
source .venv/bin/activate
```

**3. Install dependencies**

```bash
pip install -r requirements.txt
```

**4. Set the secret key**

Windows (PowerShell):

```powershell
$env:CAMPUSBITE_SECRET_KEY = python -c "import secrets; print(secrets.token_hex(32))"
```

Linux / macOS:

```bash
export CAMPUSBITE_SECRET_KEY=$(python -c "import secrets; print(secrets.token_hex(32))")
```

**5. Run the application**

```bash
python app.py
```

**6. Open in your browser**

| Module | URL |
|---|---|
| Welcome Page | http://127.0.0.1:5000/ |
| Student Portal | http://127.0.0.1:5000/student |
| Staff Login | http://127.0.0.1:5000/staff/login |

---

## Staff Account Setup

With the secret key configured, create the first staff account:

```bash
python create_staff.py
```

Follow the prompts to set the credentials. Further staff accounts can be registered from the authenticated staff dashboard.

---

## Order Workflow

```text
Student browses menu
        |
        v
Adds items to cart
        |
        v
Selects pickup slot
        |
        v
Places order
        |
        v
Receives order token
        |
        v
Staff confirms order
        |
        v
Preparing  >  Ready for Pickup  >  Completed
```

---

## Future Enhancements

- [ ] Online payment gateway integration
- [ ] QR-code-based order verification
- [ ] Push notifications for order updates
- [ ] Analytics dashboard for canteen administrators
- [ ] Food recommendations based on user preferences
- [ ] Mobile application
- [ ] Improved role-based access control

---

## Security and Deployment Notes

CampusBite is an academic demonstration project. Before any production deployment, the following are recommended:

- Add CSRF protection
- Validate menu prices and pickup slots on the server
- Strengthen order-token privacy
- Add API rate limiting
- Use a production-grade WSGI server such as Gunicorn or Waitress
- Use secure environment variables and HTTPS

> **Warning:** Do not expose Flask's development server directly to the public internet.

---

## Project Objective

To digitize campus canteen operations by giving students an efficient ordering experience and giving canteen staff a simple, reliable order management system.

---

## Developer

**Anurudh K**
B.Tech, Artificial Intelligence & Machine Learning
Srinivas University Institute of Engineering and Technology
Mangaluru, Karnataka, India

---

<div align="center">

**CampusBite: Your Campus, Your Food, Your Convenience.**

If you find this project useful, consider giving the repository a star.

</div>
