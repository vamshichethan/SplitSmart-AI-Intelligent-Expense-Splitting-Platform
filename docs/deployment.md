# Deployment Checklist

This project is ready for separate frontend and backend deployment.

Live URLs:

- Frontend: `https://splitsmart-ai-client.vercel.app`
- Backend API: `https://splitsmart-ai-api.onrender.com`
- Health check: `https://splitsmart-ai-api.onrender.com/api/health`

## Frontend

Recommended: Vercel or Netlify.

- Build command: `npm run build --workspace client`
- Output directory: `client/dist`
- Environment variable: `VITE_API_BASE_URL=https://splitsmart-ai-api.onrender.com/api`

## Backend

Recommended: Render, Railway, or Fly.io.

- Root directory: repository root
- Build command: `npm install`
- Start command: `npm run start --workspace server`
- Health check: `/api/health`

## Keys Needed For Full Placement-Level Version

- `DATABASE_URL`: PostgreSQL from Neon, Supabase, Railway, or Render.
- `JWT_SECRET`: long random production secret.
- `GEMINI_API_KEY`: receipt normalization and AI spending insights.
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`: test payment orders.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: receipt image uploads.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: reminder emails. For Brevo, use `SMTP_HOST=smtp-relay.brevo.com`, `SMTP_PORT=587`, `SMTP_USER=<Brevo SMTP login>`, and `SMTP_PASS=<Brevo SMTP key>`.
- Optional: WhatsApp/SMS provider credentials for payment reminders.

## Next Production Hardening

- Replace in-memory arrays with Prisma + PostgreSQL.
- Store receipt images in Cloudinary.
- Add real OCR/AI extraction behind the existing mock extraction shape.
- Verify Razorpay signatures before marking online payments complete.
- Add server-side authorization checks for group membership on every route.
