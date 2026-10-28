# 🛒 Tatka Bajar — Implementation Plan & Phase Progress Audit

> **Project**: Tatka Bajar API (Fresh Produce & Grocery Marketplace Backend)  
> **Stack**: NestJS · Prisma ORM · PostgreSQL · Redis · Cloudinary · JWT · Nodemailer  
> **Source Plan**: Recovered from previous session (`tatka_bajar_architecture_plan.md`)  
> **Audit & Full Completion Date**: October 28, 2026  
> **Current Build Status**: 🟢 Compiling cleanly (`npm run build` succeeds, all 4 test suites pass)

---

## 📊 Executive Summary & Progress Dashboard

| Phase | Description | Status | Progress | Key Deliverables |
|:---|:---|:---:|:---:|:---|
| **Phase 0** | Foundation & Core Infrastructure | ✅ **Completed** | **100%** | NestJS, Prisma, JWT, OTP, RBAC, Cloudinary, Swagger, Rate Limiting |
| **Phase 1** | Product & Category Management | ✅ **Completed** | **100%** | Categories with Emojis, Product Inventory, Pricing & Discounts, Filter/Search |
| **Phase 2** | Cart, Address & Order/Checkout Pipeline | ✅ **Completed** | **100%** | Geo-coordinates, Live Stock Cart, Distance Fee Estimation, Atomic Checkout |
| **Phase 3** | Rider Management & Delivery Tracking | ✅ **Completed** | **100%** | Dedicated Rider module, GPS coordinate tracking, avatar upload, order assignment & delivery status workflow |
| **Phase 4** | Dynamic Banners & Campaign Offers | ✅ **Completed** | **100%** | Strict image file upload, Cloudinary CDN, active schedules, public & admin management |
| **Phase 5** | Admin Dashboard & Analytics Engine | ✅ **Completed** | **100%** | Today's KPIs, platform overview, 7d/30d/90d sales timeline, top products, stock health alerts |
| **Phase 6** | Notifications & Real-Time Alerts | ✅ **Completed** | **100%** | Transactional lifecycle emails, In-App notification center, broadcast alerts with image upload, FCM token registration |

**Overall Project Completion**: **100%** of backend roadmap completed!

---

## 🗄️ Database Schema Verification (`prisma/schema.prisma`)

All foundational, catalog, logistics, marketing, and notification schema models are active in Prisma:

| Model / Enum | Current Status in Schema | Notes |
|:---|:---:|:---|
| `Role` (`ADMIN`, `USER`, `RIDER`) | ✅ Implemented | `SELLER` removed as planned; `RIDER` active |
| `ProductUnit` (`KG`, `GRAM`, `PIECE`, `LITER`, `PACKET`, `DOZEN`, `BUNDLE`, `BOX`) | ✅ Implemented | Complete produce unit variants |
| `OrderStatus` (`PENDING`, `CONFIRMED`, `PROCESSING`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`) | ✅ Implemented | Complete lifecycle coverage |
| `PaymentMethod` / `PaymentStatus` | ✅ Implemented | Supports COD, bKash, Nagad, Card, Online |
| `BannerLinkType` (`CATEGORY`, `PRODUCT`, `OFFER`) | ✅ Implemented | Enum active for Banner system |
| `NotificationType` (`ORDER`, `PROMOTION`, `DELIVERY`, `SYSTEM`) | ✅ Implemented | In-app notification classifications |
| `User` model | ✅ Implemented | Role, OTP auth, verification, `fcmToken`, relation to Rider, Orders, Notifications |
| `Rider` model | ✅ Implemented | `userId`, `isActive`, `totalDeliveries`, `currentLat`, `currentLng` |
| `Address` model | ✅ Implemented | `latitude`, `longitude`, `isDefault`, street, area, city |
| `Category` model | ✅ Implemented | `emoji`, `slug`, `isActive`, `sortOrder`, protected "OTHER" |
| `Product` model | ✅ Implemented | `buyPrice`, `price`, `discountPrice`, `isDiscount`, `stock`, `location`, `totalSold`, `totalRevenue` |
| `Cart` & `CartItem` | ✅ Implemented | Unique constraint per user/product, quantity tracking |
| `Order` & `OrderItem` | ✅ Implemented | `deliveryLat`, `deliveryLng`, `deliveryFee`, `riderId`, historical price & cost snapshots |
| `Review` model | ✅ Implemented | User ratings & comments per product with unique constraint |
| `Banner` model | ✅ Implemented | Promotional banners with schedule window, image URL, link target, priority |
| `Notification` model | ✅ Implemented | `userId`, `title`, `body`, `type`, `imageUrl`, `isRead`, `metadata` |

---

## 🔍 Detailed Phase-by-Phase Implementation Status

---

### ✅ Phase 0 — Foundation & Infrastructure (100% Completed)
- [x] **NestJS setup & configuration**: Modular architecture with `@nestjs/config`.
- [x] **Prisma ORM & PostgreSQL**: Models migrated with connection pooling.
- [x] **JWT Authentication flow**: Access token + refresh token rotation; bcrypt password hashing.
- [x] **Email & OTP verification**: Signup, verification, resend OTP, and forgot/reset password.
- [x] **Role-Based Access Control (RBAC)**: Custom `@Roles()` decorator, `RolesGuard`, and `AdminGuard`.
- [x] **Cloudinary Integration**: Single/multi image uploads and deletions.
- [x] **Security & Error Handling**: `helmet`, CORS, rate limiting, exception filters, response wrapper.
- [x] **Swagger Documentation**: Live interactive documentation at `/docs`.

---

### ✅ Phase 1 — Product & Category System (100% Completed)
- [x] **Category Module (`src/modules/category`)**:
  - Emoji icons (e.g. 🥦, 🍎, 🥩)
  - Auto-seeded, protected fallback category (`OTHER`)
  - Full CRUD (`GET /categories`, `POST /categories`, `PATCH /categories/:id`, `DELETE /categories/:id`)
  - Image upload support (`PATCH /categories/:id/image`)
- [x] **Product Module (`src/modules/product`)**:
  - Full produce fields: `buyPrice`, `price`, `location`, `stock`, `unit` (`BUNDLE`, `BOX`, `KG`, etc.)
  - Dynamic discount toggle (`isDiscount`), `discountPrice`, percentage calculation, and savings
  - Performance tracking: `totalSold` and `totalRevenue`
  - Advanced filtering (category, in-stock, discount, tags, price boundaries), sorting, pagination, and search
  - Image gallery upload (`POST /products/:id/images`, up to 8 images per product)

---

### ✅ Phase 2 — Cart, Address & Checkout Pipeline (100% Completed)
- [x] **Address Module (`src/modules/address`)**: Coordinates (`latitude`, `longitude`), CRUD, default selection.
- [x] **Cart Module (`src/modules/cart`)**: Real-time stock validation, live subtotal, dynamic price computation.
- [x] **Delivery Fee Engine**: Haversine formula distance calculation based on Dhaka Central Hub (`23.7516, 90.3944`). 40 BDT base (first 3 km) + 10 BDT/km. Free delivery for subtotal >= 1000 BDT.
- [x] **Checkout Estimation (`POST /orders/estimate`)**: Subtotal, fee, distance, and grand total.
- [x] **Atomic Order Placement (`POST /orders`)**: Prisma transaction with stock reservation, metrics increment, snapshotting, cart cleanup, and confirmation email dispatch.
- [x] **Order Cancellation**: Safely restores stock and reverses sales counters for pending orders.

---

### ✅ Phase 3 — Rider Management & Delivery Tracking (100% Completed)
**Module**: `src/modules/rider` (`RiderModule`, `RiderController`, `RiderService`)

- [x] **Register Rider with Avatar File Upload** (`POST /api/v1/riders` — Admin):
  - Consumes `multipart/form-data` with `FileInterceptor('avatar')`.
  - Directly uploads avatar image file to Cloudinary (`tatka-bajar/riders`).
  - Creates user with `Role.RIDER`, `Status.ACTIVE`, hashed password (or temporary password).
  - Automatically provisions linked `Rider` profile.
- [x] **List All Riders** (`GET /api/v1/riders` — Admin):
  - Paginated list with search (name, email, phone) and active filter (`isActive`).
- [x] **Rider Personal Profile & Active Orders** (`GET /api/v1/riders/me` — Rider):
  - Current logged-in rider gets their assigned active deliveries (`PROCESSING`, `OUT_FOR_DELIVERY`) with customer contact and GPS coordinates.
- [x] **Live GPS Location Update** (`PATCH /api/v1/riders/location` — Rider):
  - Rider updates `currentLat` and `currentLng`.
- [x] **Rider Details by ID** (`GET /api/v1/riders/:id` — Admin).
- [x] **Update Rider Info** (`PATCH /api/v1/riders/:id` — Admin).
- [x] **Toggle Rider Status** (`PATCH /api/v1/riders/:id/status` — Admin).
- [x] **Update Rider Avatar File** (`PATCH /api/v1/riders/:id/avatar` — Admin or Rider):
  - Direct multipart image file upload replacing the profile avatar.
- [x] **Deactivate Rider** (`DELETE /api/v1/riders/:id` — Admin):
  - Protected check: prevents deactivation if rider has orders in progress.
- [x] **Fulfillment Integration**:
  - `PATCH /api/v1/orders/:id/assign-rider` — Admin assigns order to rider (sets status to `PROCESSING`).
  - `GET /api/v1/orders/rider/assigned` — Rider views assigned orders queue.
  - `PATCH /api/v1/orders/:id/status` — Rider updates status (`OUT_FOR_DELIVERY` → `DELIVERED`), sets `deliveredAt`, updates payment status to `PAID`, and increments rider's `totalDeliveries`.

---

### ✅ Phase 4 — Dynamic Banners & Campaign Offers (100% Completed)
**Module**: `src/modules/banner` (`BannerModule`, `BannerController`, `BannerService`)

> ⚠️ **Strict Image Policy Enforced**: No image URL strings are accepted from clients. All banners require direct file uploads via `multipart/form-data`.

- [x] **Create Banner with Direct Image Upload** (`POST /api/v1/banners` — Admin):
  - Consumes `multipart/form-data` with `FileInterceptor('image')`.
  - Uploads graphic file directly to Cloudinary (`tatka-bajar/banners`).
  - Supports `title`, `subtitle`, `tag`, `tagColor`, `linkType` (`CATEGORY`, `PRODUCT`, `OFFER`), `linkValue`, `discountPercent`, `isActive`, `sortOrder`, `startsAt`, `endsAt`.
- [x] **Public Active Banners** (`GET /api/v1/banners` — Public):
  - Returns active promotional banners within their active scheduling window (`startsAt` <= now <= `endsAt`).
  - Sorted by priority (`sortOrder ASC`, `createdAt DESC`).
- [x] **Admin Banner Management** (`GET /api/v1/banners/admin` — Admin):
  - Paginated list including scheduled and inactive banners.
- [x] **Get Banner Details** (`GET /api/v1/banners/:id` — Public/Admin).
- [x] **Update Banner** (`PATCH /api/v1/banners/:id` — Admin):
  - Multipart form-data supporting text updates and optional replacement `image` file.
  - Automatically cleans up previous image from Cloudinary when replaced.
- [x] **Replace Banner Image Directly** (`PATCH /api/v1/banners/:id/image` — Admin):
  - Dedicated single-file upload route for image replacement.
- [x] **Delete Banner** (`DELETE /api/v1/banners/:id` — Admin):
  - Deletes database record and purges asset from Cloudinary.

---

### ✅ Phase 5 — Admin Dashboard & Analytics Engine (100% Completed)
**Module**: `src/modules/analytics` (`AnalyticsModule`, `AnalyticsController`, `AnalyticsService`)

- [x] **Today's Real-Time KPIs** (`GET /api/v1/analytics/today` — Admin):
  - `todaySales`, `todayPurchaseCost`, `todayGrossProfit`.
  - `todayOrders`, `todayDelivered`, `todayPending`, `todayCancelled`, `todayNewUsers`.
- [x] **Platform-Wide Overview** (`GET /api/v1/analytics/overview` — Admin):
  - Produce inventory: total products, active products, total categories.
  - Platform users: registered customers count, active delivery riders count.
  - Lifetime order volume & gross lifetime revenue.
  - Stock health: `lowStockProducts` (1–10 units) and `outOfStockProducts` (0 units).
  - Financial inventory valuation: `totalInventoryCost`, `totalInventoryValue`, and projected margin.
- [x] **Sales Timeline & Revenue Graph** (`GET /api/v1/analytics/sales?period=7d|30d|90d` — Admin):
  - Daily breakdown: `date`, `sales`, `orders`, `delivered`, `cost`, `profit`.
  - Aggregated period summary: `totalSales`, `totalOrders`, `totalCost`, `totalProfit`.
- [x] **Top-Selling Produce Items** (`GET /api/v1/analytics/top-products?limit=10` — Admin):
  - Ranked by `totalSold` units and `totalRevenue`, including product pricing, stock, unit, and category emoji.
- [x] **Inventory Health & Restocking Alerts** (`GET /api/v1/analytics/stock` — Admin):
  - Out-of-stock and low-stock produce items prioritized for purchase.
- [x] **Recent Orders Snapshot** (`GET /api/v1/analytics/recent-orders?limit=10` — Admin).

---

### ✅ Phase 6 — Notifications & Real-Time Alerts (100% Completed)
**Module**: `src/modules/notification` (`NotificationModule`, `NotificationController`, `NotificationService`) & `MailModule`

- [x] **In-App Notification Center**:
  - `GET /api/v1/notifications` — Paginated user notification list with `isRead` and `type` filters.
  - `GET /api/v1/notifications/unread-count` — Real-time badge counter for mobile & web apps.
  - `PATCH /api/v1/notifications/:id/read` — Mark single notification as read.
  - `PATCH /api/v1/notifications/read-all` — Mark all notifications as read.
  - `DELETE /api/v1/notifications/:id` — Delete a notification.
- [x] **FCM Device Registration** (`PATCH /api/v1/notifications/fcm-token`):
  - Saves device push token in `User.fcmToken`.
- [x] **Admin Broadcast with Promo Image File Upload** (`POST /api/v1/notifications/admin/broadcast` — Admin):
  - Dispatches targeted notifications to `ALL`, `USER`, or `RIDER`.
  - Optional promotional banner graphic uploaded directly as a file (`FileInterceptor('image')`) to Cloudinary.
- [x] **Transactional Email Lifecycle (Nodemailer)**:
  - Account signup OTP email verification.
  - Password reset OTP request.
  - Order confirmation email on checkout.
  - Order status change emails (`CONFIRMED`, `PROCESSING`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`).
  - Rider assigned email with rider contact details.
- [x] **Order Lifecycle Event Automation**:
  - `POST /orders` triggers both in-app notification and order confirmation email.
  - `PATCH /orders/:id/status` triggers both in-app notification and status change email.
  - `PATCH /orders/:id/cancel` triggers both in-app notification and cancellation email.
  - `PATCH /orders/:id/assign-rider` triggers in-app notifications for both customer and rider, plus customer email alert.

---

## 🚀 Complete API Endpoint Directory

### Authentication (`/api/v1/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/auth/user-singup` | Public | Register with name, email, phone, password |
| `POST` | `/auth/verify-otp` | Public | Verify account with 6-digit OTP |
| `POST` | `/auth/resend-otp` | Public | Resend OTP code |
| `POST` | `/auth/login` | Public | Login with email/phone & password |
| `POST` | `/auth/refresh-token` | Public | Refresh expired access token |
| `POST` | `/auth/forgot-password`| Public | Send password reset OTP |
| `POST` | `/auth/reset-password` | Public | Set new password with OTP |
| `GET` | `/auth/me` | User | Get current session details |

### User Profile (`/api/v1/user`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/user/profile` | User | Get current user profile |
| `PATCH` | `/user/profile` | User | Update profile details |
| `PATCH` | `/user/avatar` | User | Upload avatar image file |
| `GET` | `/user/all` | Admin | Get all users with role filter |
| `GET` | `/user/riders` | Admin | Get all riders |
| `PATCH` | `/user/:id/status` | Admin | Update user status |
| `PATCH` | `/user/:id/role` | Admin | Update user role |

### Categories (`/api/v1/categories`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/categories` | Public | Get all categories |
| `GET` | `/categories/:idOrSlug` | Public | Get category details |
| `POST` | `/categories` | Admin | Create category |
| `PATCH` | `/categories/:id` | Admin | Update category |
| `PATCH` | `/categories/:id/image`| Admin | Upload category image file |
| `DELETE`| `/categories/:id` | Admin | Soft delete category |

### Products (`/api/v1/products`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/products` | Public | Filterable & paginated product catalog |
| `GET` | `/products/search` | Public | Global product search |
| `GET` | `/products/:idOrSlug` | Public | Get product details |
| `POST` | `/products` | Admin | Create product with discount toggle |
| `PATCH` | `/products/:id` | Admin | Update product |
| `POST` | `/products/:id/images` | Admin | Upload up to 8 image files |
| `DELETE`| `/products/:id/images` | Admin | Remove product image URL |
| `DELETE`| `/products/:id` | Admin | Soft delete product |

### Cart (`/api/v1/cart`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/cart` | User | Get current cart with live stock prices |
| `POST` | `/cart/items` | User | Add item to cart |
| `PATCH` | `/cart/items/:itemId` | User | Update cart item quantity |
| `DELETE`| `/cart/items/:itemId` | User | Remove item from cart |
| `DELETE`| `/cart` | User | Clear cart |

### Addresses (`/api/v1/addresses`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/addresses` | User | Get user saved addresses |
| `POST` | `/addresses` | User | Create address with coordinates |
| `PATCH` | `/addresses/:id` | User | Update address details |
| `PATCH` | `/addresses/:id/default`| User | Set primary default address |
| `DELETE`| `/addresses/:id` | User | Delete address |

### Orders & Checkout (`/api/v1/orders`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/orders/estimate` | User | Calculate distance fee & order total |
| `POST` | `/orders` | User | Checkout & place order (atomic transaction) |
| `GET` | `/orders` | User | Order history |
| `GET` | `/orders/:id` | User | Order details |
| `PATCH` | `/orders/:id/cancel` | User | Cancel pending order |
| `GET` | `/orders/admin/all` | Admin | System-wide order view |
| `PATCH` | `/orders/:id/assign-rider`| Admin | Assign rider to order |
| `GET` | `/orders/rider/assigned`| Rider | View assigned orders queue |
| `PATCH` | `/orders/:id/status` | Admin/Rider | Update order status (`OUT_FOR_DELIVERY` → `DELIVERED`) |

### Riders (`/api/v1/riders`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/riders` | Admin | Register rider with multipart avatar upload |
| `GET` | `/riders` | Admin | List all riders with stats and search |
| `GET` | `/riders/me` | Rider | Rider profile & active deliveries |
| `PATCH` | `/riders/location` | Rider | Update live GPS coordinates |
| `GET` | `/riders/:id` | Admin | Get rider details |
| `PATCH` | `/riders/:id` | Admin | Update rider details |
| `PATCH` | `/riders/:id/status` | Admin | Toggle rider active state |
| `PATCH` | `/riders/:id/avatar` | Admin/Rider | Upload replacement avatar image file |
| `DELETE`| `/riders/:id` | Admin | Deactivate rider |

### Banners (`/api/v1/banners`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/banners` | Public | Active & scheduled promotional banners |
| `GET` | `/banners/admin` | Admin | All banners with pagination and filter |
| `GET` | `/banners/:id` | Public/Admin | Single banner details |
| `POST` | `/banners` | Admin | Create banner with image file upload |
| `PATCH` | `/banners/:id` | Admin | Update banner with optional replacement image |
| `PATCH` | `/banners/:id/image` | Admin | Direct image file replacement |
| `DELETE`| `/banners/:id` | Admin | Delete banner and remove asset from Cloudinary |

### Analytics (`/api/v1/analytics`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/analytics/today` | Admin | Today's sales, cost, gross profit, and orders |
| `GET` | `/analytics/overview` | Admin | Platform overview, users, riders, revenue, inventory |
| `GET` | `/analytics/sales` | Admin | 7d, 30d, 90d sales graph & daily timeline |
| `GET` | `/analytics/top-products`| Admin | Top selling produce by quantity and revenue |
| `GET` | `/analytics/stock` | Admin | Inventory health: out-of-stock and low-stock alerts |
| `GET` | `/analytics/recent-orders` | Admin | Recent orders snapshot |

### Notifications (`/api/v1/notifications`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/notifications` | User | User notifications with filters & pagination |
| `GET` | `/notifications/unread-count`| User | Unread counter for app badge icon |
| `PATCH` | `/notifications/:id/read` | User | Mark single notification as read |
| `PATCH` | `/notifications/read-all` | User | Mark all notifications as read |
| `PATCH` | `/notifications/fcm-token` | User | Register mobile device push token |
| `DELETE`| `/notifications/:id` | User | Delete notification |
| `POST` | `/notifications/admin/broadcast`| Admin | Broadcast alert with promo image file upload |
