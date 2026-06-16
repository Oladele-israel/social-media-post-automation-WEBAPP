-- migrations/000003_create_categories.up.sql
CREATE TABLE categories (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID        REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    slug        VARCHAR(100) NOT NULL,

    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,

    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE UNIQUE INDEX uq_system_category_slug
    ON categories (slug)
    WHERE user_id IS NULL;

-- Enforce uniqueness of slugs per user (user_id IS NOT NULL)
CREATE UNIQUE INDEX uq_user_category_slug
    ON categories (user_id, slug)
    WHERE user_id IS NOT NULL;

-- Speed up the common query: "give me all categories for user X plus system ones"
CREATE INDEX idx_categories_user_id ON categories (user_id);

-- ── Seed built-in system categories ───────────────────────────────────────
-- user_id is NULL → system-owned, visible to all users
INSERT INTO categories (name, slug, description) VALUES
    ('Written Post',  'written-post',  'Text-based posts and articles'),
    ('Video',         'video',         'Video content and reels'),
    ('Carousel',      'carousel',      'Multi-image carousel posts'),
    ('Image',         'image',         'Single image posts'),
    ('Story',         'story',         'Short-lived story content'),
    ('Poll',          'poll',          'Polls and interactive content'),
    ('Thread',        'thread',        'Multi-part thread posts'),
    ('Link Share',    'link-share',    'Sharing external links with commentary');