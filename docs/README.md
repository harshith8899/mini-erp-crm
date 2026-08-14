# Mini ERP + CRM Operations Portal

A full-stack ERP/CRM application built for a wholesale and distribution business. The system provides role-based authentication, customer management, inventory management, stock movements, sales challans, and PDF export.

## 🚀 Live Demo

**Frontend:**  
https://mini-erp-crm-silk.vercel.app

**Backend API:**  
https://mini-erp-crm-backend-h4j1.onrender.com

**API Health Check:**  
https://mini-erp-crm-backend-h4j1.onrender.com/api/health

---

## 🔐 Demo Login Credentials

Use the following seeded accounts to test the different role-based permissions.

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@mini-erp.local` | `Admin@123` |
| **Sales** | `sales@mini-erp.local` | `Sales@123` |
| **Warehouse** | `warehouse@mini-erp.local` | `Warehouse@123` |
| **Accounts** | `accounts@mini-erp.local` | `Accounts@123` |

### Role Overview

- **Admin** — Full system access.
- **Sales** — Customer management, follow-ups, and sales challan operations.
- **Warehouse** — Product, warehouse, and stock management.
- **Accounts** — Access to permitted operational and reporting data.

> ⚠️ These are demo credentials created by the database seed script for evaluation purposes. They should be replaced with secure credentials before any real production use.

---

## 📌 Project Overview

The Mini ERP + CRM Operations Portal is designed for internal business teams such as:

- Admin
- Sales
- Warehouse
- Accounts

The application manages customers, products, warehouses, inventory, stock movements, and sales challans through a REST-based backend and responsive React frontend.

The main objective was to demonstrate:

- Full-stack development
- REST API development
- Database design
- Authentication and authorization
- Business logic
- Inventory management
- Responsive UI
- Deployment
- CI/CD

---

## 🛠️ Tech Stack

### Frontend

- React
- TypeScript
- Vite
- React Router
- HTML
- CSS

### Backend

- Node.js
- TypeScript
- Express.js
- REST API
- JWT Authentication
- bcrypt
- Prisma ORM

### Database

- PostgreSQL
- Neon PostgreSQL

### Deployment

- Vercel — Frontend
- Render — Backend
- Neon — Database
- GitHub Actions — CI

---

## 🏗️ Architecture

```text
                    ┌──────────────────┐
                    │      Browser     │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │      Vercel      │
                    │ React + Vite     │
                    └────────┬─────────┘
                             │
                       REST API / HTTPS
                             │
                             ▼
                    ┌──────────────────┐
                    │      Render      │
                    │ Node + Express   │
                    └────────┬─────────┘
                             │
                          Prisma
                             │
                             ▼
                    ┌──────────────────┐
                    │       Neon       │
                    │    PostgreSQL    │
                    └──────────────────┘
