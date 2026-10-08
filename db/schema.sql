-- =========================================================================
-- AI CREATOR MARKETPLACE - POSTGRESQL + PGVECTOR DATABASE SCHEMA
-- Compatible with PostgreSQL 15+ and pgvector extension (Supabase/Neon/AWS RDS)
-- =========================================================================

-- Enable pgvector extension for semantic search & creator matching
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CREATORS TABLE
CREATE TABLE IF NOT EXISTS creators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    professional_title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'Beauty & Skincare', 'Technology', etc.
    avatar_url TEXT,
    bio TEXT,
    location VARCHAR(150),
    followers_count INTEGER DEFAULT 0,
    engagement_rate NUMERIC(4, 2) DEFAULT 0.00,
    client_rating NUMERIC(3, 2) DEFAULT 5.00,
    reviews_count INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    availability_status VARCHAR(100) DEFAULT 'Available for immediate hire',
    min_budget NUMERIC(10, 2) DEFAULT 20000,
    max_budget NUMERIC(10, 2) DEFAULT 40000,
    platforms TEXT[] DEFAULT '{}',
    content_types TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. CREATOR PORTFOLIOS (WITH 768-DIM PGVECTOR EMBEDDINGS)
-- Uses 768 dimensions corresponding to Google Gemini text-embedding-004
CREATE TABLE IF NOT EXISTS creator_portfolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content_type VARCHAR(100),
    tools_used TEXT[] DEFAULT '{}',
    image_url TEXT,
    results_summary TEXT,
    engagement_reach VARCHAR(100),
    embedding vector(768), -- Semantic embedding of project title, description & tools
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- HNSW Vector Index for ultra-fast approximate cosine similarity search
CREATE INDEX IF NOT EXISTS creator_portfolios_embedding_idx 
ON creator_portfolios USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 3. CREATOR SKILLS & AUDIT EVIDENCE
CREATE TABLE IF NOT EXISTS creator_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
    skill_name VARCHAR(150) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE, -- AI provides evidence, human verifies
    evidence_notes TEXT,
    verified_at TIMESTAMP WITH TIME ZONE
);

-- 4. CAMPAIGNS TABLE
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    brief_text TEXT NOT NULL,
    target_audience TEXT,
    required_skills TEXT[] DEFAULT '{}',
    content_formats TEXT[] DEFAULT '{}',
    budget_min NUMERIC(10, 2),
    budget_max NUMERIC(10, 2),
    deadline VARCHAR(100),
    brief_embedding vector(768), -- Vector embedding of the natural language brief
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS campaigns_brief_embedding_idx 
ON campaigns USING hnsw (brief_embedding vector_cosine_ops);

-- 5. CREATOR MATCHES & AUDIT LOGS
CREATE TABLE IF NOT EXISTS creator_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
    total_score NUMERIC(5, 2) NOT NULL, -- e.g. 94.00%
    skill_match_score NUMERIC(5, 2) NOT NULL, -- 40% weight
    verification_score NUMERIC(5, 2) NOT NULL, -- 25% weight
    portfolio_score NUMERIC(5, 2) NOT NULL, -- 15% weight
    experience_score NUMERIC(5, 2) NOT NULL, -- 10% weight
    client_rating_score NUMERIC(5, 2) NOT NULL, -- 10% weight
    reasons JSONB DEFAULT '[]'::jsonb,
    potential_gaps JSONB DEFAULT '[]'::jsonb,
    is_shortlisted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- STORED FUNCTION: HYBRID VECTOR + ATTRIBUTE SIMILARITY SEARCH
-- =========================================================================
CREATE OR REPLACE FUNCTION match_creators_semantic(
    query_embedding vector(768),
    target_category VARCHAR(100),
    match_threshold FLOAT,
    match_count INT
)
RETURNS TABLE (
    creator_id UUID,
    creator_name VARCHAR(255),
    similarity FLOAT,
    portfolio_id UUID,
    portfolio_title VARCHAR(255)
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id AS creator_id,
        c.name AS creator_name,
        1 - (cp.embedding <=> query_embedding) AS similarity,
        cp.id AS portfolio_id,
        cp.title AS portfolio_title
    FROM creator_portfolios cp
    JOIN creators c ON cp.creator_id = c.id
    WHERE 
        (target_category IS NULL OR c.category = target_category)
        AND 1 - (cp.embedding <=> query_embedding) > match_threshold
    ORDER BY cp.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
