# Deployment Guide - Francisco Puyol Video Portfolio

## Quick Deployment Options

### Option 1: Railway (Recommended for Full-Stack)

1. **Create Railway Account**: Sign up at railway.app
2. **Connect GitHub**: Import your repository
3. **Configure Environment Variables** in Railway dashboard:
   ```
   DATABASE_URL=postgresql://user:pass@host:port/db
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   OPENAI_API_KEY=sk-your_key
   SENDGRID_API_KEY=SG.your_key
   SENDGRID_VERIFIED_SENDER=your_email
   SESSION_SECRET=your_secret
   ```
4. **Deploy**: Railway will auto-deploy on git push

### Option 2: Vercel + Railway (Frontend + Backend Separate)

**Frontend (Vercel):**
1. Connect repository to Vercel
2. Set build command: `npm run build`
3. Set output directory: `dist/public`
4. Configure environment variables for frontend

**Backend (Railway):**
1. Deploy backend separately
2. Update frontend API endpoints to point to Railway backend

### Option 3: Render

1. **Create Render Account**
2. **Web Service Setup**:
   - Repository: Connect your GitHub repo
   - Environment: Node
   - Build Command: `npm run build`
   - Start Command: `npm run start`
3. **Configure Environment Variables**
4. **Database Setup**: Use Render PostgreSQL add-on

## Database Setup

### PostgreSQL Database

1. **Create PostgreSQL Database** on your hosting platform
2. **Import Schema**:
   ```bash
   psql $DATABASE_URL < database-schema.sql
   ```
3. **Run Migrations**:
   ```bash
   npm run db:push
   ```

### Neon Database (Recommended)

1. **Create Account**: Sign up at neon.tech
2. **Create Database**: Get connection string
3. **Update DATABASE_URL** in environment variables

## Environment Configuration

### Required Services Setup

**Cloudinary (File Storage):**
1. Create account at cloudinary.com
2. Get cloud name, API key, and secret from dashboard
3. Configure upload presets if needed

**OpenAI (AI Features):**
1. Create account at openai.com
2. Generate API key
3. Set billing limits as needed

**SendGrid (Email):**
1. Create account at sendgrid.com
2. Verify sender email
3. Generate API key with mail send permissions

## Production Optimizations

### Performance
- Enable gzip compression (already configured)
- Use CDN for static assets
- Configure proper caching headers
- Optimize images and videos

### Security
- Update SESSION_SECRET to strong random string
- Enable HTTPS only
- Configure CORS properly
- Set up rate limiting (already included)

### Monitoring
- Set up error tracking (Sentry recommended)
- Configure health checks
- Monitor database performance
- Set up log aggregation

## Custom Domain Setup

### DNS Configuration
1. **Point domain to hosting provider**
2. **Configure SSL certificate** (usually automatic)
3. **Update CORS settings** if needed

### Environment Updates
- Update any hardcoded URLs
- Configure proper base URLs for APIs
- Update OAuth redirect URLs if applicable

## Scaling Considerations

### Database
- Consider read replicas for high traffic
- Set up proper indexing
- Monitor query performance

### File Storage
- Cloudinary auto-scales
- Consider CDN configuration
- Set up automatic image optimization

### Backend
- Configure auto-scaling on hosting platform
- Set up load balancing if needed
- Monitor memory and CPU usage

## Troubleshooting

### Common Issues

**Database Connection Errors:**
- Verify DATABASE_URL format
- Check network connectivity
- Ensure database exists

**File Upload Issues:**
- Verify Cloudinary credentials
- Check upload size limits
- Ensure proper CORS configuration

**Email Not Sending:**
- Verify SendGrid API key permissions
- Check sender email verification
- Monitor SendGrid logs

**AI Features Not Working:**
- Verify OpenAI API key
- Check billing and usage limits
- Monitor API quotas

### Debug Mode
Set `NODE_ENV=development` to enable detailed error messages.

## Backup Strategy

### Database Backups
- Set up automated daily backups
- Test restore procedures
- Store backups in separate location

### File Backups
- Cloudinary provides automatic backups
- Consider exporting important assets
- Document asset organization

## Maintenance

### Regular Updates
- Update dependencies monthly
- Monitor security advisories
- Test updates in staging environment

### Performance Monitoring
- Set up database query monitoring
- Monitor API response times
- Track user engagement metrics