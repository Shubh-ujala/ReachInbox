# Deployment & Cloud Hosting Guide

This guide explains how to host the **ReachInbox Email Scheduler** online using **Render** or **Railway**.

---

## Option 1: Render (Recommended — 1-Click Blueprint)

We included a [`render.yaml`](../render.yaml) blueprint file in the repository root. This automatically configures:
* **API Web Service**: Node.js Express server with in-process BullMQ worker (`RUN_WORKER_IN_PROCESS=true`).
* **Frontend Web App**: High-speed static SPA with client-side routing.
* **Managed Redis**: Private Redis instance communicating over internal network.

### Steps to Deploy:
1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "feat: clerk auth, theme toggle and render blueprint"
   git push origin main
   ```
2. **Open Render**:
   * Go to [dashboard.render.com](https://dashboard.render.com) and click **New + > Blueprint**.
   * Connect your GitHub repository.
   * Render will detect `render.yaml` and list the 3 components (`email-scheduler-api`, `email-scheduler-client`, `email-scheduler-redis`).
3. **Fill in your Environment Variables**:
   * `CLERK_PUBLISHABLE_KEY`: `pk_test_...`
   * `CLERK_SECRET_KEY`: `sk_test_...`
   * `SMTP_USER`: `shubhujala.code@gmail.com`
   * `SMTP_PASS`: `kwxyuoifsnytgego`
   * `SMTP_FROM`: `ReachInbox Scheduler <shubhujala.code@gmail.com>`
   * `MONGODB_URI`: (Your MongoDB Atlas connection string, or leave empty for in-memory)
   * `VITE_CLERK_PUBLISHABLE_KEY`: `pk_test_...`
4. **Click "Apply"**:
   * Render will build and deploy the entire system.
   * Your public frontend URL will be generated (e.g., `https://email-scheduler-client.onrender.com`).

---

## Option 2: Railway

1. **Sign in to Railway**:
   * Go to [railway.app](https://railway.app) and create a new project.
2. **Add Redis**:
   * Click **New > Database > Add Redis**. Railway will provide a `REDIS_URL`.
3. **Deploy the Backend Server**:
   * Click **New > GitHub Repo** and select this repo.
   * In Settings:
     * Set **Root Directory** to `/server`.
     * Build Command: `npm install && npm run build`
     * Start Command: `npm start`
     * Variables:
       * `REDIS_URL`: `${{Redis.REDIS_URL}}`
       * `RUN_WORKER_IN_PROCESS`: `true`
       * `PORT`: `3001`
       * `CLERK_PUBLISHABLE_KEY`: `pk_test_...`
       * `CLERK_SECRET_KEY`: `sk_test_...`
       * `SMTP_USER`: `shubhujala.code@gmail.com`
       * `SMTP_PASS`: `kwxyuoifsnytgego`
       * `SMTP_FROM`: `ReachInbox Scheduler <shubhujala.code@gmail.com>`
       * `MONGODB_URI`: (Your MongoDB Atlas URI)
   * Generate Domain for the server (e.g. `https://api-production.up.railway.app`).
4. **Deploy the Frontend Client**:
   * Click **New > GitHub Repo** and select this repo.
   * In Settings:
     * Set **Root Directory** to `/client`.
     * Build Command: `npm install && npm run build`
     * Start Command: `npm run preview -- --port $PORT --host 0.0.0.0` (or host on Vercel)
     * Variables:
       * `VITE_API_URL`: Your Railway API URL (e.g. `https://api-production.up.railway.app`)
       * `VITE_CLERK_PUBLISHABLE_KEY`: `pk_test_...`
   * Generate Domain for client.

---

## Important: Clerk Google OAuth Redirect URLs

Once your frontend is deployed to your custom domain (e.g. `https://your-app.onrender.com`):
1. Open your [Clerk Dashboard](https://dashboard.clerk.com).
2. Go to **Configure > Paths** / **Domains**.
3. Add your production domain so Clerk allows Google OAuth redirects from your live site.
