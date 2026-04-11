# J&F Auto - Car Dealership Website

A complete single-dealership car website with admin panel built with Next.js, Supabase, and Tailwind CSS.

## Features

### Public Website
- **Home Page** - Hero section, featured vehicles, about section, hours & contact info
- **Inventory Page** - Browse all available cars with filters (search, body type, year range, price range) and sorting
- **Car Detail Page** - Full car specifications, gallery, lead forms (request info, schedule test drive)
- **Contact Page** - General inquiry form

### Admin Panel
- **Dashboard** - Overview stats (total cars, published, sold, new leads) and recent activity
- **Cars Management** - Add, edit, and manage inventory with full CRUD operations
- **Leads Management** - View and manage customer inquiries with status tracking
- **Settings** - Configure dealership information, hours, colors, and branding
- **Profile** - Manage admin profile information

### Authentication & Authorization
- Role-based access control (admin, staff, readonly)
- Protected admin routes
- Secure Supabase authentication

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL + RLS)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Deployment**: Vercel

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- A Supabase account and project

### 2. Clone and Install

```bash
git clone https://github.com/ichillous/J-and-F-Auto-Columbus.git
cd J-and-F-Auto-Columbus
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

You can find these values in your [Supabase project's API settings](https://supabase.com/dashboard/project/_/settings/api).

### 4. Set Up Database

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the migration files in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_storage_setup.sql`

This will create:
- `profiles` table (linked to auth.users)
- `settings` table (singleton row for dealership)
- `cars` table (inventory)
- `leads` table (customer inquiries)
- Row Level Security (RLS) policies
- Auto-create profile trigger for new users
- Seed initial settings data for "J&F Auto"
- Storage bucket for car images

### 5. Create Admin User

After running the migration, you need to create an admin user:

1. Sign up a new user through the app (or Supabase Auth dashboard)
2. Go to Supabase SQL Editor and run:

```sql
-- Replace with your actual email
UPDATE profiles 
SET role = 'admin' 
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'your-email@example.com'
);
```

### 6. Run Development Server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### 7. Access Admin Panel

1. Navigate to `/admin/login`
2. Sign in with your admin account
3. You'll be redirected to `/admin` dashboard

## Project Structure

```
├── app/
│   ├── admin/              # Admin panel routes
│   │   ├── cars/           # Car management
│   │   ├── leads/          # Lead management
│   │   ├── settings/       # Dealership settings
│   │   ├── profile/        # User profile
│   │   └── login/          # Admin login
│   ├── cars/               # Public car detail pages
│   ├── inventory/          # Public inventory listing
│   ├── contact/            # Public contact page
│   └── page.tsx           # Public home page
├── components/
│   ├── admin/              # Admin-specific components
│   └── ui/                 # Reusable UI components
├── lib/
│   ├── auth.ts             # Authentication helpers
│   ├── types.ts            # TypeScript types
│   └── supabase/           # Supabase client configs
└── supabase/
    └── migrations/          # Database migrations
```

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. Deploy

## Roles

- **admin** - Full access to all features including settings
- **staff** - Can manage cars and leads, but cannot change settings
- **readonly** - Can only view data, cannot make changes

## License

MIT
