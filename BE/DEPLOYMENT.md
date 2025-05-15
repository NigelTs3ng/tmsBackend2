# Deployment Guide for HR Application

## Render Deployment

### Required Environment Variables

When deploying to Render, set up the following environment variables:

- `PORT` (Render may set this automatically)
- `NODE_ENV` (set to 'production')
- `JWT_SECRET` (use a secure random string)
- `JWT_EXPIRY_TIME` (e.g., '7d')
- `SUPABASE_URL` (your Supabase project URL)
- `SUPABASE_KEY` (your Supabase key)
- `FRONTEND_URL` (the URL of your deployed frontend)
- Optional: `NODE_MAILER_USER` and `NODE_MAILER_PW` if email functionality is needed

### Deployment Steps

1. Push your code to a Git repository (GitHub, GitLab, etc.)
2. Create a new Web Service in Render
3. Connect to your Git repository
4. Configure the following:
   - **Name**: hr-app-backend (or your preferred name)
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm run start:prod`
5. Add all the environment variables listed above
6. Click "Create Web Service"

### CORS Configuration

The application is configured to handle CORS in both development and production environments. Make sure to set the `FRONTEND_URL` environment variable to your deployed frontend URL.

### Database Configuration

This application uses Supabase as its database. Ensure your Supabase instance is properly configured with the correct tables and relationships as set up in the development environment.

### Initial Data Setup

After deployment, you may need to run the following commands to ensure your database is properly set up:

```
npm run check:tables
npm run setupInitialData
```

This will ensure your tables exist and create an initial admin user if one doesn't exist yet. 