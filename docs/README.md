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
