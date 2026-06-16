-- migrations/000004_create_posts.down.sql
-- Drop in reverse dependency order

DROP TABLE IF EXISTS post_publish_results;
DROP TABLE IF EXISTS post_media;
DROP TABLE IF EXISTS posts;
DROP TYPE  IF EXISTS media_type;
DROP TYPE  IF EXISTS post_status;