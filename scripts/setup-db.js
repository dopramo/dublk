/**
 * Run database schema against Supabase using the Management API
 */
const fs = require('fs');
const path = require('path');

const PROJECT_REF = 'jpkcywwrszbypoivftea';
const ACCESS_TOKEN = 'sbp_0b508595930c4f21df2bba8647ea5cbbd9ba328b';

async function runSQL(query) {
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SQL execution failed (${res.status}): ${text}`);
  }

  return await res.json();
}

async function main() {
  console.log('🔧 Setting up DubLK database schema...\n');

  const statements = [
    // Enable UUID
    `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,
    
    // Profiles table
    `CREATE TABLE IF NOT EXISTS public.profiles (
      id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
      email TEXT,
      full_name TEXT,
      avatar_url TEXT,
      is_admin BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now()
    );`,

    // Auto-create profile trigger
    `CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO public.profiles (id, email, full_name, avatar_url)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
      );
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;`,

    `DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;`,
    
    `CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`,

    // Movies table
    `CREATE TABLE IF NOT EXISTS public.movies (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      tmdb_id INTEGER UNIQUE NOT NULL,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      poster_url TEXT,
      backdrop_url TEXT,
      genres TEXT[] DEFAULT '{}',
      rating NUMERIC(3,1) DEFAULT 0,
      release_year INTEGER,
      runtime INTEGER,
      bunny_video_id TEXT,
      is_published BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now()
    );`,

    `CREATE INDEX IF NOT EXISTS idx_movies_slug ON public.movies(slug);`,
    `CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON public.movies(tmdb_id);`,

    // Purchases table
    `CREATE TABLE IF NOT EXISTS public.purchases (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
      movie_id UUID REFERENCES public.movies(id) ON DELETE SET NULL,
      type TEXT CHECK (type IN ('single', 'full')) NOT NULL,
      amount NUMERIC(10,2) NOT NULL,
      status TEXT CHECK (status IN ('pending', 'verified', 'rejected')) DEFAULT 'pending',
      payment_method TEXT,
      payment_proof_url TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );`,

    `CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON public.purchases(user_id);`,

    // RLS
    `ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;`,

    // Policies - profiles
    `DO $$ BEGIN
      CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;`,

    `DO $$ BEGIN
      CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;`,

    // Policies - movies
    `DO $$ BEGIN
      CREATE POLICY "Published movies are viewable by everyone" ON public.movies FOR SELECT USING (is_published = true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;`,

    `DO $$ BEGIN
      CREATE POLICY "Admins can do everything with movies" ON public.movies FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;`,

    // Policies - purchases
    `DO $$ BEGIN
      CREATE POLICY "Users can view own purchases" ON public.purchases FOR SELECT USING (auth.uid() = user_id);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;`,

    `DO $$ BEGIN
      CREATE POLICY "Users can create purchases" ON public.purchases FOR INSERT WITH CHECK (auth.uid() = user_id);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;`,

    `DO $$ BEGIN
      CREATE POLICY "Admins can view all purchases" ON public.purchases FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;`,

    `DO $$ BEGIN
      CREATE POLICY "Admins can update purchases" ON public.purchases FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;`,
  ];

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.replace(/\s+/g, ' ').substring(0, 80);
    process.stdout.write(`[${i + 1}/${statements.length}] ${preview}... `);
    
    try {
      await runSQL(stmt);
      console.log('✅');
    } catch (err) {
      console.log(`❌ ${err.message}`);
    }
  }

  console.log('\n✨ Schema setup complete!');
}

main().catch(console.error);
