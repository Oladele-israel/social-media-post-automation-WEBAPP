-- migrations/000004_create_posts.up.sql

CREATE TYPE post_status AS ENUM (
    'draft',        -- saved but not scheduled
    'scheduled',    -- queued to go out at scheduled_at
    'published',    -- successfully sent to all platforms
    'failed',       -- attempted publish but at least one platform errored
    'cancelled'     -- user cancelled before it went out
);

-- ══════════════════════════════════════════════════════════════
--  POSTS TABLE
-- ══════════════════════════════════════════════════════════════

CREATE TABLE posts (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id  UUID        NOT NULL REFERENCES categories(id),

    title        VARCHAR(255),          -- optional internal label, not published
    content      TEXT        NOT NULL,  -- the actual post body
    status       post_status NOT NULL DEFAULT 'draft',

    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,           
    -- PLATFORM TARGETING
    -- Stores which platforms this post should go to.
    -- e.g. ["linkedin", "instagram", "x"]
    --
    -- WHY JSONB ARRAY INSTEAD OF A JUNCTION TABLE?
    -- ────────────────────────────────────────────
    -- A junction table (post_platforms) would be the "pure relational" design.
    -- But here the platform list is always read and written as a unit
    -- alongside the post — you never query "give me all posts targeting linkedin"
    -- as a primary access pattern (that's an analytics query, not a hot path).
    -- JSONB is simpler, avoids a JOIN on every post fetch, and PostgreSQL
    -- lets you index into JSONB if you ever need it.
    -- If you later need "all scheduled linkedin posts" for a worker, a GIN index
    -- on this column (shown below) makes that fast.
    platforms    JSONB       NOT NULL DEFAULT '[]',

    -- METADATA / EXTRAS
    -- Free-form JSONB bag for platform-specific options:
    -- hashtags, first-comment text, location, alt text, etc.
    -- Keeps the main table clean while being extensible.
    -- Example: {"hashtags": ["#go", "#startup"], "first_comment": "Link in bio"}
    metadata     JSONB       NOT NULL DEFAULT '{}',

    -- Soft-delete: we never hard-delete posts so users can recover them
    -- and we keep an audit trail. Filter with WHERE deleted_at IS NULL.
    deleted_at   TIMESTAMPTZ,

    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes on posts ────────────────────────────────────────────────────────

-- Most common query: "all posts for user X, newest first"
CREATE INDEX idx_posts_user_id        ON posts (user_id, created_at DESC);

-- Scheduler worker query: "all scheduled posts due now that aren't deleted"
CREATE INDEX idx_posts_scheduled      ON posts (scheduled_at)
    WHERE status = 'scheduled' AND deleted_at IS NULL;

-- Filter by status (e.g. drafts page, published feed)
CREATE INDEX idx_posts_status         ON posts (user_id, status)
    WHERE deleted_at IS NULL;

-- GIN index: enables fast queries like
--   WHERE platforms @> '["linkedin"]'   (posts targeting linkedin)
CREATE INDEX idx_posts_platforms_gin  ON posts USING GIN (platforms);

-- Filter by category
CREATE INDEX idx_posts_category_id    ON posts (category_id);


-- ══════════════════════════════════════════════════════════════
--  POST MEDIA TABLE
-- ══════════════════════════════════════════════════════════════
--
-- WHY A SEPARATE TABLE FOR MEDIA?
-- ────────────────────────────────
-- A post can have 0 media files (text post) or many (carousel = up to 10 images).
-- Storing media URLs in a JSONB array on the posts table would work for simple cases
-- but loses the ability to:
--   • Track per-file upload status
--   • Store per-file metadata (dimensions, duration, alt text)
--   • Order files independently
--   • Query "all media uploaded by user X" for storage management
--
-- A dedicated table with a display_order column gives us full control.

CREATE TYPE media_type AS ENUM (
    'image',    -- jpg, png, webp, gif
    'video',    -- mp4, mov
    'document'  -- pdf (for LinkedIn document posts)
);

CREATE TABLE post_media (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id       UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,

    media_type    media_type  NOT NULL,
    url           TEXT        NOT NULL,  -- URL to the stored file (S3, Cloudflare R2, etc.)
    thumbnail_url TEXT,                  -- video thumbnail or image preview

    -- Original filename as uploaded — useful for display in the UI
    filename      VARCHAR(255),

    -- File size in bytes — used for storage quota checks
    file_size     BIGINT,

    -- Alt text for accessibility and some platforms require it
    alt_text      TEXT,

    -- For videos: duration in seconds
    duration_secs INTEGER,

    -- For images/videos: pixel dimensions
    width         INTEGER,
    height        INTEGER,

    -- Order within the post (carousel slide 1, 2, 3 ...)
    -- Using INTEGER not SERIAL so we can reorder without gaps
    display_order INTEGER     NOT NULL DEFAULT 0,

    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()

    -- No updated_at: media rows are immutable.
    -- If a user "changes" a media file, we delete and re-insert.
);

-- Speed up: "all media for post X ordered by display_order"
CREATE INDEX idx_post_media_post_id ON post_media (post_id, display_order);


-- ══════════════════════════════════════════════════════════════
--  POST PUBLISH RESULTS TABLE
-- ══════════════════════════════════════════════════════════════
--
-- When a post is published to multiple platforms, each platform
-- can succeed or fail independently. We track each attempt here.
-- This gives users visibility ("your LinkedIn post succeeded but
-- your Instagram post failed because...") and lets the worker
-- retry individual platform failures without re-publishing to
-- platforms that already succeeded.

CREATE TABLE post_publish_results (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id             UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    platform            social_platform NOT NULL,  -- reuse the ENUM from migration 002

    -- 'success' or 'failed'
    status              VARCHAR(20) NOT NULL,

    -- The platform's own ID for the published content (for linking back)
    platform_post_id    VARCHAR(255),

    -- Error message if it failed — shown to the user
    error_message       TEXT,

    attempted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_publish_results_post_id ON post_publish_results (post_id);