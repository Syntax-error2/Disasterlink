# 🚀 DisasterLink Hostinger Deployment Guide

I have set up the files you need for a smooth deployment to Hostinger! Since I cannot log into your Hostinger account directly, simply follow these steps to get your backend live on `https://darkgoldenrod-anteater-579870.hostingersite.com`.

## 1. Prepare the `.env` file
1. In this folder, you will see a new file called `.env.hostinger`.
2. Open it and fill in the 3 database variables under the `DB_` section using the credentials from your Hostinger Database Management page.
3. Rename the file from `.env.hostinger` to exactly `.env` (overwriting the old one).

## 2. Upload to Hostinger File Manager
1. Zip the entire `disasterlink-backend` folder on your computer.
2. Go to your Hostinger hPanel and open the **File Manager**.
3. Navigate to `public_html`.
4. Upload your Zip file into `public_html` and **Extract** it.
5. Move the contents out of the extracted folder so that everything (including the `public` folder) sits directly inside `public_html`.

## 3. Run the Database Migrations
Hostinger provides a Terminal (SSH) for your account!
1. Go to your hPanel and look for **SSH Access** or **Terminal**.
2. Open the terminal.
3. Navigate to your files by typing: `cd public_html`
4. Run this exact command to build all the tables in your new database and insert the LGU superadmin:
   ```bash
   php artisan migrate:fresh --seed
   ```

## 4. (Final Step) Point Vercel to Hostinger
Once your backend is live on Hostinger, go to your **Vercel** dashboard for the frontend, go to **Environment Variables**, and set:
`VITE_API_BASE_URL` = `https://darkgoldenrod-anteater-579870.hostingersite.com/api`

Redeploy Vercel, and your LGU Command Center is officially 100% LIVE in production!
