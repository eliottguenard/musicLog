-- Exécutez ce code SQL dans l'éditeur SQL de votre tableau de bord Supabase

CREATE TABLE IF NOT EXISTS public.albums (
    id text PRIMARY KEY,
    title text NOT NULL,
    artist text NOT NULL,
    genre text,
    "releaseYear" text,
    format text,
    "listenDate" date,
    rating integer,
    review text,
    "coverUrl" text,
    "aotyLink" text,
    "createdAt" timestamp with time zone DEFAULT timezone('utc'::text, now()),
    "updatedAt" timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Autoriser l'accès anonyme (RLS policies)
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre à n'importe qui de lire
CREATE POLICY "Allow anonymous read access" ON public.albums
    FOR SELECT USING (true);

-- Politique pour permettre à n'importe qui d'insérer
CREATE POLICY "Allow anonymous insert access" ON public.albums
    FOR INSERT WITH CHECK (true);

-- Politique pour permettre à n'importe qui de modifier
CREATE POLICY "Allow anonymous update access" ON public.albums
    FOR UPDATE USING (true);

-- Politique pour permettre à n'importe qui de supprimer
CREATE POLICY "Allow anonymous delete access" ON public.albums
    FOR DELETE USING (true);
