# Finanzas Rincon Integral

## Overview

Finanzas Rincon Integral is a financial management application designed for managing two retail stores ("20 de Julio" and "Tunal"). The system tracks income, expenses, account balances, transfers between accounts, inventory, and daily cash operations (opening/closing). Built as a full-stack web application with a React frontend and Express backend, it currently uses in-memory storage but is configured to support PostgreSQL through Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- React 18 with TypeScript using Vite as the build tool
- Client-side routing with Wouter (lightweight alternative to React Router)
- Single Page Application (SPA) architecture

**State Management:**
- Zustand with persistence middleware for client-side state
- All application data (transactions, accounts, products, transfers, openings) stored in browser localStorage
- Multi-store support with store-specific data isolation

**UI Component Library:**
- Shadcn/ui components built on Radix UI primitives
- Tailwind CSS for styling with a custom fintech-inspired design system
- Recharts for data visualization (pie charts, bar charts)
- Typography: Outfit font for headings, Inter for UI text

**Form Handling:**
- React Hook Form for form state management
- Zod for schema validation with @hookform/resolvers integration

**Key Design Patterns:**
- Component composition with clear separation between pages, layout, and reusable UI components
- Private route pattern for authentication protection
- Store selection at login determines data context for entire session

### Backend Architecture

**Server Framework:**
- Express.js with TypeScript running on Node.js
- HTTP server (not using WebSockets despite ws dependency)

**Current Storage:**
- In-memory storage implementation (MemStorage class)
- Interface-based design (IStorage) allows easy swap to database implementation

**API Structure:**
- RESTful endpoints prefixed with `/api`
- Static file serving for the built React application
- Request/response logging middleware

**Build Process:**
- Custom build script using esbuild for server bundling
- Vite for client bundling
- Selective dependency bundling (allowlist pattern) to optimize cold start times
- Production builds output to `dist/` directory

### Data Storage Solutions

**Current Implementation:**
- Client-side localStorage through Zustand persist middleware
- No server-side persistence currently implemented

**Database Configuration:**
- Drizzle ORM configured for PostgreSQL (Neon serverless driver)
- Schema defined in `shared/schema.ts` with a basic users table
- Migration setup in place (`drizzle.config.ts`) but not actively used
- Database URL expected via environment variable

**Data Models (Client-Side):**
- **Accounts:** 8 fixed accounts categorized by type (cajas, nequi, bold, daviplata) and tier (mayor/menor), track balances
- **Transactions:** Income/expense records with payment method (Efectivo, Nequi, Daviplata, Bolt), amount, description, date, optional productId link
- **Transfers:** Movement of funds between any of the 8 accounts with atomic validation
- **Products:** Inventory items with name, price, IVA status, supplier, brand, quantity, presentation (unidad, jarabe, liquido, polvo, tabletas, capsulas, crema, otro), optional weight
- **Openings:** Daily cash register opening balances
- **Stores:** Multi-tenancy with "20 de Julio" and "Tunal" stores

**Inventory Features:**
- Password-protected access (admin password: 1234)
- Full CRUD for products with extended fields
- Filters by presentation, supplier, and brand
- Search by name, brand, or supplier
- IVA products highlighted in blue

**Income Page Features:**
- Product search with autocomplete
- Auto-fill price and description when selecting product
- Product linked to transactions for tracking

### Authentication and Authorization

**Current Implementation:**
- Minimal authentication - store selection at login
- No password protection in web version (localStorage flag for authenticated state)
- Inventory module includes admin password validation (hardcoded in client state)

**Session Management:**
- Client-side session via Zustand store
- No server-side session management currently implemented
- Dependencies installed: express-session, connect-pg-simple (not actively used)

## External Dependencies

**Database & ORM:**
- Drizzle ORM (0.39.1) with drizzle-kit for migrations
- @neondatabase/serverless (0.10.4) - PostgreSQL driver for serverless environments
- connect-pg-simple (10.0.0) - PostgreSQL session store (available but not configured)

**Frontend Libraries:**
- @tanstack/react-query (5.60.5) - Server state management (installed but minimal usage)
- Radix UI components (@radix-ui/*) - Accessible UI primitives
- date-fns (3.6.0) - Date manipulation and formatting
- recharts - Data visualization
- Wouter - Client-side routing
- Zustand - State management

**Form & Validation:**
- react-hook-form
- zod - Schema validation
- @hookform/resolvers - Bridge between React Hook Form and Zod

**Development Tools:**
- Vite with React plugin
- @replit/vite-plugin-runtime-error-modal - Development error overlay
- @replit/vite-plugin-cartographer - Replit-specific dev tools
- TypeScript with strict mode enabled

**Build & Bundling:**
- esbuild - Fast JavaScript bundler for server code
- Tailwind CSS with @tailwindcss/vite plugin
- PostCSS with Autoprefixer

**Python Desktop Version:**
- Separate Python/PyQt5 implementation exists in `python_src/` directory
- Uses SQLite for local storage
- Intended for Windows desktop deployment with PyInstaller

**Note:** The application has PostgreSQL database configured but not currently connected. All data operations happen client-side in localStorage. The server currently uses in-memory storage with an interface designed for easy migration to PostgreSQL.