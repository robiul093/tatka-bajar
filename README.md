# Tatka Bajar API (NestJS + Prisma + PostgreSQL)

Welcome to the **Tatka Bajar API**! Tatka Bajar is a fresh produce & grocery marketplace backend built using NestJS, Prisma ORM, and PostgreSQL, preconfigured with authentication, security best practices, and Vercel serverless deployment support.

## 🚀 Features

This template is packed with features to get your project off the ground quickly:

- **NestJS Framework:** A progressive Node.js framework for building efficient, reliable, and scalable server-side applications.
- **Prisma ORM:** Next-generation Node.js and TypeScript ORM for interacting with the PostgreSQL database.
- **PostgreSQL Database:** Reliable and robust relational database integration.
- **Authentication & Authorization:** 
  - JWT (JSON Web Token) based authentication.
  - Access and Refresh token flows for enhanced security.
  - Role-based access control (RBAC) with 3 roles: `ADMIN`, `USER`, and `RIDER`.
  - Passwords are securely hashed using `bcrypt`.
- **Swagger API Documentation:** Auto-generated interactive API documentation available at `/docs`.
- **E-Commerce Modules:**
  - **Category**: Dynamic categories with emoji icons and product counters.
  - **Product**: Admin inventory management, buy/sell pricing, dynamic discount toggle, unit types (`KG`, `GRAM`, `PIECE`, `LITER`, `PACKET`, `DOZEN`, `BUNDLE`, `BOX`), origin location, sales tracking (`totalSold`, `totalRevenue`).
  - **Address**: Delivery addresses with latitude & longitude coordinates and default address selection.
  - **Cart**: User persistent shopping cart with live stock check and discounted price calculation.
  - **Order & Checkout**: Full checkout transaction pipeline, stock reservation, rider assignment, delivery coordinates, status workflow.
  - **Review**: Product reviews and ratings with auto-computed average ratings.
- **Security Best Practices:**
  - `helmet` integration for securing HTTP headers.
  - CORS (Cross-Origin Resource Sharing) enabled.
  - Rate limiting configured to prevent brute-force and DDoS attacks (with Redis support for distributed environments).
- **Cloudinary Integration:** Pre-configured module for seamless image and file uploads to Cloudinary.
- **Robust Error Handling & Logging:**
  - Global exception filters for consistent error responses (HTTP and Prisma errors).
  - Request logging and transformation interceptors.
- **Environment Configuration:** Strongly typed environment variable validation and configuration using `@nestjs/config`.

## 🛠️ Tech Stack

- **Framework:** [NestJS](https://nestjs.com/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **ORM:** [Prisma](https://www.prisma.io/)
- **Database:** [PostgreSQL](https://www.postgresql.org/)
- **Authentication:** `passport-jwt`, `bcrypt`
- **API Documentation:** Swagger (`@nestjs/swagger`)

## 📦 Getting Started

Follow these instructions to set up the project locally.

### 1. Prerequisites

Make sure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (v16 or higher)
- [npm](https://www.npmjs.com/) or [Yarn](https://yarnpkg.com/)
- [PostgreSQL](https://www.postgresql.org/)
- [Prisma CLI](https://www.prisma.io/docs/concepts/components/prisma-cli) (optional, but recommended)

### 2. Installation

Clone the repository and install the dependencies:

```bash
# Clone the repository (or copy the template)
git clone <repository-url>
cd tatka-bajar

# Install dependencies
npm install
```

### 3. Environment Variables

1. Copy the sample environment file to create your local `.env` file:
   ```bash
   cp .env.example .env
   ```
2. Open the `.env` file and update the variables with your local configuration (Database URL, JWT Secrets, Cloudinary keys, etc.).

> **Important:** Ensure your `DATABASE_URL` points to a valid running PostgreSQL instance.

### 4. Database Setup

Run the following commands to set up your database schema using Prisma:

```bash
# Generate Prisma Client
npx prisma generate

# Apply migrations to the database
npx prisma migrate dev --name init
```

### 5. Running the Application

You can start the application in different modes:

```bash
# Development mode
npm run start

# Watch mode (recommended for development)
npm run start:dev

# Production mode
npm run start:prod
```

Once the server is running, you can access:
- **API Base URL:** `http://localhost:3000/api/v1`
- **Swagger Documentation:** `http://localhost:3000/docs`

## 🏗️ Project Structure

```
├── prisma/
│   └── schema.prisma         # Prisma schema defining the database models
├── src/
│   ├── cloudinary/           # Cloudinary service and provider for file uploads
│   ├── common/
│   │   ├── constants/        # Application-wide constants and messages
│   │   ├── decorator/        # Custom NestJS decorators (e.g., @GetCurrentUser)
│   │   ├── filters/          # Global exception filters (HttpException, PrismaException)
│   │   ├── guards/           # Route guards for authentication and authorization
│   │   ├── interceptors/     # Request/Response interceptors (Logging, Timeout, etc.)
│   │   └── server/           # Server bootstrapping utilities (Rate limiting, APM, etc.)
│   ├── config/
│   │   └── env.config.ts     # Environment variable validation and typing
│   ├── modules/
│   │   ├── address/          # Delivery addresses & coordinates
│   │   ├── auth/             # Authentication & OTP flows
│   │   ├── cart/             # Shopping cart management
│   │   ├── category/         # Dynamic product categories
│   │   ├── mail/             # Nodemailer email service
│   │   ├── order/            # Checkout, orders & rider assignment
│   │   ├── product/          # Product inventory, pricing & search
│   │   ├── review/           # Customer reviews & ratings
│   │   └── user/             # User profile & administration
│   ├── prisma/               # Prisma service wrapper
│   ├── app.module.ts         # Main application module
│   └── main.ts               # Application entry point
├── .env.example              # Sample environment variables
└── package.json
```

## 🔒 Authentication Flow

1. **Sign Up:** Users register via `POST /api/v1/auth/user-singup`.
2. **Login:** Users log in via `POST /api/v1/auth/login` to receive an `accessToken` and a `refreshToken`.
3. **Protected Routes:** Attach the `accessToken` as a Bearer Token in the `Authorization` header to access protected endpoints.
4. **Refresh Token:** When the `accessToken` expires, use `POST /api/v1/auth/refresh-token` with the `refreshToken` to get a new pair of tokens.

## 📝 Available Scripts

- `npm run dev`: Generates Prisma client, applies migrations, and starts the app in watch mode.
- `npm run build`: Compiles the TypeScript application into the `dist` folder.
- `npm run format`: Formats the code using Prettier.
- `npm run lint`: Checks for linting errors using ESLint.
- `npm run test`: Runs unit tests using Jest.

## 👥 Contributing

When using this template, you can easily extend it by generating new resources using the Nest CLI:

```bash
nest generate module <module-name>
nest generate controller <module-name>
nest generate service <module-name>
```

Remember to update `prisma/schema.prisma` and run `npx prisma migrate dev` whenever you need to add or modify database tables.

---

## ⚡ Vercel Deployment

This project includes native Vercel serverless deployment support via [vercel.json](file:///c:/Users/HP/Desktop/Project/tatka-bajar/vercel.json) and [api/index.ts](file:///c:/Users/HP/Desktop/Project/tatka-bajar/api/index.ts):

1. **Deploy to Vercel via CLI or GitHub:**
   ```bash
   npx vercel
   ```
2. **Environment Variables on Vercel:**
   Configure the following in your Vercel Project Settings > Environment Variables:
   - `DATABASE_URL` (Use a connection pooled connection string like Supabase session mode, Neon pooled, or Prisma Accelerate)
   - `JWT_SECRET`, `JWT_REFRESH_SECRET`
   - `APP_NAME`, `NODE_ENV=production`
   - `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

