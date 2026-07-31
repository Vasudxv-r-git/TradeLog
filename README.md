# TradeLog

A fully functional, production-ready personal trading journal built with Next.js and Supabase.

## Features

- **Authentication**: Google OAuth powered by Supabase Auth
- **Database & Storage**: Fully powered by Supabase (PostgreSQL & Storage)
- **Trading Journal Grid**: Spreadsheet-like interface with inline editing
- **Dynamic Columns & Pairs**: Add custom columns and trading pairs
- **Visualizations**: Automatic P&L calculation and Recharts graphs
- **Theme**: Dark and Light mode support

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Vanilla CSS (CSS Modules)
- **Icons**: Lucide React
- **Charts**: Recharts

## Setup Instructions

### 1. Environment Variables

Copy the example environment file and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

You need the following variables in your `.env.local`:

| Variable | Where to find it | Description |
|----------|------------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API | `anon` / `public` key |

### 2. Supabase Authentication

1. Go to **Supabase Dashboard → Authentication → Providers**
2. Enable **Google**
3. Configure your Google OAuth Client ID and Secret (from Google Cloud Console)

### 3. Supabase Database Schema

Run the SQL in `supabase-schema.sql` in your Supabase SQL Editor:
1. Go to **Supabase Dashboard → SQL Editor**
2. Paste the contents of `supabase-schema.sql`
3. Click **Run**

### 4. Supabase Storage Bucket

Create a storage bucket for trade images:
1. Go to **Supabase Dashboard → Storage**
2. Click **New Bucket**
3. Name it `trade-images`
4. Set it to **Public** (so image URLs are accessible)

## Local Development

```bash
cd tradelog
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Vercel

1. Push your code to a Git repository
2. Import the project in [Vercel](https://vercel.com)
3. Add environment variables in the Vercel dashboard
4. Deploy — zero config needed for Next.js

### Netlify

1. Push your code to a Git repository
2. Import the project in [Netlify](https://www.netlify.com)
3. Add environment variables in the Netlify dashboard
4. The `netlify.toml` file handles build configuration automatically
