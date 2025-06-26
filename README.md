# Francisco Puyol Video Portfolio - Complete Project Export

This is a complete export of the Francisco Puyol video portfolio platform for external deployment.

## Project Overview

A professional full-stack video portfolio application featuring:
- React 18 + TypeScript frontend with modern UI components
- Express.js + Node.js backend with comprehensive API
- PostgreSQL database with Drizzle ORM
- AI-powered content generation using OpenAI GPT-4
- Cloud storage integration with Cloudinary
- Email functionality via SendGrid
- JWT authentication system
- Mobile-optimized responsive design

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with shadcn/ui components
- **Animations**: Framer Motion
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Forms**: React Hook Form with Zod validation

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT-based system
- **File Upload**: Multer with Cloudinary integration
- **Email**: SendGrid and Nodemailer
- **AI Integration**: OpenAI GPT-4 for content generation

### Database Schema
- users: Admin user management
- projects: Video project metadata
- categories: Project categorization
- sessions: Authentication sessions
- contact_submissions: Contact form tracking
- video_uploads: Video file management
- biography: Dynamic about page content
- contact_settings: Configurable contact form

## Environment Variables Required

Create a `.env` file in the root directory with these variables:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
PGHOST=localhost
PGPORT=5432
PGUSER=username
PGPASSWORD=password
PGDATABASE=database_name

# Cloudinary (Video/Image Storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# OpenAI (AI Content Generation)
OPENAI_API_KEY=sk-your_openai_api_key

# SendGrid (Email)
SENDGRID_API_KEY=SG.your_sendgrid_api_key
SENDGRID_VERIFIED_SENDER=your_verified_email@domain.com

# Authentication
SESSION_SECRET=your_very_secure_session_secret_key_here
```

## Installation & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup
```bash
# Run database migrations
npm run db:push
```

### 3. Development
```bash
# Start development server (frontend + backend)
npm run dev
```

### 4. Production Build
```bash
# Build frontend and backend
npm run build

# Start production server
npm run start
```

## Deployment Instructions

### Frontend Deployment (Netlify/Vercel)

1. **Build the frontend:**
   ```bash
   npm run build
   ```

2. **Deploy the `dist/public` folder to your chosen platform**

3. **Configure environment variables** in your deployment platform

4. **Set up redirects** for single-page application routing

### Backend Deployment (Railway/Render/Heroku)

1. **Prepare the backend:**
   ```bash
   npm run build
   ```

2. **Deploy the entire project** with these configurations:
   - **Start Command**: `npm run start`
   - **Build Command**: `npm run build`
   - **Node Version**: 18 or higher

3. **Configure environment variables** in your deployment platform

4. **Set up PostgreSQL database** and update DATABASE_URL

### Database Migration

The project includes a complete PostgreSQL schema. Run this after setting up your database:

```bash
npm run db:push
```

## Key Features

### Admin Panel
- Complete project management (CRUD operations)
- AI-powered content generation
- Drag & drop project reordering
- Biography and contact settings management
- Video upload with Cloudinary integration

### Public Portfolio
- Responsive video showcase
- Project detail pages with full video playback
- Mobile-optimized navigation
- Contact form with email integration
- SEO-optimized pages

### AI Integration
- Automatic project descriptions
- Content suggestions for titles, tags, and roles
- Multilingual support (English, Spanish, French)
- Quota management and fallback systems

## Default Admin Credentials

- **Email**: admin@franciscopuyol.com
- **Password**: videomaker2025

**Important**: Change these credentials immediately after deployment.

## File Structure

```
PROJECT_EXPORT/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/          # Utility functions
│   │   └── contexts/     # React contexts
│   └── index.html
├── server/                # Express backend
│   ├── routes.ts         # API routes
│   ├── db.ts            # Database connection
│   ├── storage.ts       # Data access layer
│   ├── ai-suggestions.ts # AI integration
│   ├── cloudinary.ts    # File upload handling
│   └── openai.ts        # OpenAI integration
├── shared/                # Shared TypeScript types
│   └── schema.ts         # Drizzle database schema
├── package.json
├── tsconfig.json
├── vite.config.ts
├── drizzle.config.ts
└── tailwind.config.ts
```

## Support & Maintenance

This export includes all source code and configurations needed for independent deployment and maintenance. The codebase is well-documented and follows modern development practices.

For any deployment issues, ensure all environment variables are properly configured and the database is accessible.