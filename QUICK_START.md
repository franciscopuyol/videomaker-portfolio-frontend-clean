# Quick Start Guide - Francisco Puyol Portfolio

## 🚀 Deploy in 15 Minutes

### Step 1: Database Setup (3 minutes)
```bash
# Create Neon database at neon.tech
# Copy connection string
export DATABASE_URL="postgresql://user:pass@host/db"

# Import schema
psql $DATABASE_URL < database-schema.sql
psql $DATABASE_URL < data-dump.sql
```

### Step 2: Environment Variables (2 minutes)
```bash
# Copy template
cp .env.example .env

# Fill in your values:
# - DATABASE_URL (from Step 1)
# - CLOUDINARY_* (from cloudinary.com)
# - OPENAI_API_KEY (from openai.com)
# - SENDGRID_* (from sendgrid.com)
# - SESSION_SECRET (generate random string)
```

### Step 3: Install & Deploy (5 minutes)
```bash
# Install dependencies
npm install

# Deploy to Railway
# 1. Connect GitHub repo to Railway
# 2. Add environment variables in Railway dashboard
# 3. Deploy automatically triggers

# OR deploy to Vercel + Railway
npm run build  # For Vercel frontend
# Deploy backend separately to Railway
```

### Step 4: Test & Configure (5 minutes)
```bash
# Access admin panel
# Login: admin@franciscopuyol.com
# Password: videomaker2025

# Test features:
# ✅ Upload video
# ✅ Generate AI content
# ✅ Update biography
# ✅ Send contact form
```

## Default Login Credentials
- **Email**: admin@franciscopuyol.com  
- **Password**: videomaker2025

**⚠️ Change immediately after deployment**

## Verify Working Features
- [ ] Video upload and playback
- [ ] AI content generation (4 buttons in admin)
- [ ] Contact form email delivery
- [ ] Mobile responsive design
- [ ] Biography editing

## Need Help?
Check `DEPLOYMENT.md` for detailed platform-specific instructions.