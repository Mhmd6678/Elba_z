# Deploy the project to GitHub and Vercel

## 1. Create the database

1. Create a project in Supabase.
2. In Supabase **SQL Editor**, run [`supabase/schema.sql`](supabase/schema.sql).
3. Copy the project URL and the server-only `service_role` key. Never put the key in browser code or commit it to GitHub.

## 2. Upload the project to GitHub

Upload the project files, including `api/`, `lib/`, and `supabase/`. `.gitignore` excludes local environment files and preview data. Do not force-add `.env` or any secret key.

## 3. Deploy with Vercel

1. In Vercel, select **Add New → Project** and import the GitHub repository.
2. Keep the project root as the repository root. No build command is required for this static site and its Vercel Functions.
3. In **Project → Settings → Environment Variables**, add these variables to **Production** (and **Preview** if needed):
   - `SUPABASE_URL`: your Supabase project URL, such as `https://<project-ref>.supabase.co`.
   - `SUPABASE_SERVICE_ROLE_KEY`: the Supabase server-only `service_role` key.
   - `ADMIN_PASSWORD`: `01029627902` (enter it as text so the leading zero is preserved).
   - `SESSION_SECRET`: a unique random secret, for example the output of `openssl rand -hex 32`.
4. Save the variables and redeploy the project.

The admin username is `El Baz`. The password and session secret are read only by server functions and are not stored in the repository.

## 4. Check customer requests

Submit a request through **Request to join** on the deployed site, then sign in as admin and open **Join requests**. New requests are stored in Supabase and remain available after reloads and on other devices. Approving or rejecting a request updates its database status.

Requests previously stored in a visitor's browser `localStorage` are not migrated automatically. Other current application data, including student accounts, courses, settings, comments, and quiz results, is still browser-local and is not shared across devices. This Supabase integration currently covers join requests only.
