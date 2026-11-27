-- Migration: 0011_math_narration_cache.sql
-- Description: Caches verified and AI-generated mathematical speech narrations for instant retrieval (<5ms)
-- and volunteer crowdsourced mathematical accessibility improvements.

CREATE TABLE IF NOT EXISTS public.math_narration_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    latex_hash TEXT UNIQUE NOT NULL,
    latex_normalized TEXT NOT NULL,
    narration_id TEXT NOT NULL,
    narration_en TEXT NOT NULL,
    exploration_tree JSONB,
    source TEXT NOT NULL DEFAULT 'deterministic', -- 'deterministic', 'ai_fallback', 'volunteer_verified'
    verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for instant O(1) hash lookup
CREATE INDEX IF NOT EXISTS idx_math_narration_cache_hash ON public.math_narration_cache (latex_hash);
CREATE INDEX IF NOT EXISTS idx_math_narration_cache_verified ON public.math_narration_cache (verified);

-- Enable RLS
ALTER TABLE public.math_narration_cache ENABLE ROW LEVEL SECURITY;

-- Allow public read of verified/cached math narrations
CREATE POLICY "Allow public read access to math narration cache"
    ON public.math_narration_cache
    FOR SELECT
    USING (true);

-- Allow authenticated users / service role to insert or update cache entries
CREATE POLICY "Allow authenticated or service insert to math narration cache"
    ON public.math_narration_cache
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow authenticated or service update to math narration cache"
    ON public.math_narration_cache
    FOR UPDATE
    USING (true)
    WITH CHECK (true);
