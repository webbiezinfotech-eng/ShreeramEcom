# Shreeram General Store - Unified Application

This is a unified React application that combines both the website and admin panel functionality.

## Project Structure

```
src/
├── Components/          # Website components
├── contexts/           # Website contexts (Cart, etc.)
├── admin/              # Admin panel components
│   ├── components/     # Admin components
│   ├── pages/          # Admin pages
│   ├── layout/         # Admin layout
│   ├── hooks/          # Admin hooks
│   ├── context/        # Admin contexts
│   ├── services/       # Admin services
│   └── icons/          # Admin icons
├── api/                # PHP API files
└── shared/             # Shared assets and utilities
```

## How to Run

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Access the application:
   - **Website**: http://localhost:3000/
   - **Admin Panel**: http://localhost:3000/admin/

## Routes

### Website Routes
- `/` - Home page
- `/login` - Login page
- `/register` - Register page
- `/products` - Products page
- `/cart` - Shopping cart
- `/checkout` - Checkout page
- And more...

### Admin Routes
- `/admin/` - Admin dashboard
- `/admin/products` - Product management
- `/admin/orders` - Order management
- `/admin/customers` - Customer management
- `/admin/signin` - Admin login
- And more...

## Build

```bash
npm run build
```

The built files will be in the `dist/` folder.