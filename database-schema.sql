-- Francisco Puyol Video Portfolio - Database Schema
-- PostgreSQL Schema Export for External Deployment

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sessions table for authentication
CREATE TABLE IF NOT EXISTS "sessions" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
) WITH (OIDS=FALSE);

ALTER TABLE "sessions" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX "IDX_session_expire" ON "sessions" ("expire");

-- Users table for admin management
CREATE TABLE IF NOT EXISTS "users" (
  "id" varchar PRIMARY KEY NOT NULL,
  "email" varchar UNIQUE,
  "first_name" varchar,
  "last_name" varchar,
  "profile_image_url" varchar,
  "role" varchar NOT NULL DEFAULT 'user',
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Categories table for project organization
CREATE TABLE IF NOT EXISTS "categories" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL UNIQUE,
  "slug" text NOT NULL UNIQUE,
  "display_order" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Projects table for video portfolio items
CREATE TABLE IF NOT EXISTS "projects" (
  "id" serial PRIMARY KEY,
  "title" text NOT NULL,
  "description" text,
  "thumbnail_url" text,
  "video_url" text,
  "category" text,
  "year" integer,
  "featured" boolean DEFAULT false,
  "client" text,
  "agency" text,
  "role" text,
  "tags" text,
  "duration" integer,
  "display_order" integer DEFAULT 0,
  "status" varchar NOT NULL DEFAULT 'draft',
  "created_by" varchar REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Video uploads table for file management
CREATE TABLE IF NOT EXISTS "video_uploads" (
  "id" serial PRIMARY KEY,
  "project_id" integer REFERENCES "projects"("id"),
  "original_file_name" text NOT NULL,
  "file_name" text NOT NULL,
  "file_size" integer,
  "mime_type" text,
  "duration" integer,
  "upload_status" varchar NOT NULL DEFAULT 'uploading',
  "processing_progress" integer DEFAULT 0,
  "error_message" text,
  "thumbnail_file_name" text,
  "uploaded_by" varchar REFERENCES "users"("id"),
  "description" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Biography table for about page content
CREATE TABLE IF NOT EXISTS "biography" (
  "id" serial PRIMARY KEY,
  "hero_title" text,
  "bio_text" text,
  "locations" text[],
  "courses" text[],
  "clients" text[],
  "member_of" text[],
  "skills" text[],
  "profile_image_url" text,
  "updated_at" timestamp DEFAULT now(),
  "updated_by" varchar REFERENCES "users"("id")
);

-- Contact settings table for configurable contact form
CREATE TABLE IF NOT EXISTS "contact_settings" (
  "id" serial PRIMARY KEY,
  "cta_text" text NOT NULL DEFAULT 'Let''s Chat.',
  "destination_email" text NOT NULL DEFAULT 'franciscopuyol@gmail.com',
  "form_enabled" boolean NOT NULL DEFAULT true,
  "updated_at" timestamp DEFAULT now(),
  "updated_by" varchar REFERENCES "users"("id")
);

-- Contact submissions table for form tracking
CREATE TABLE IF NOT EXISTS "contact_submissions" (
  "id" serial PRIMARY KEY,
  "name" text,
  "email" text NOT NULL,
  "message" text NOT NULL,
  "status" varchar NOT NULL DEFAULT 'pending',
  "submitted_at" timestamp DEFAULT now(),
  "processed_at" timestamp
);

-- Insert default admin user
INSERT INTO "users" ("id", "email", "first_name", "last_name", "role") 
VALUES ('admin', 'admin@franciscopuyol.com', 'Francisco', 'Puyol', 'admin')
ON CONFLICT ("id") DO NOTHING;

-- Insert default categories
INSERT INTO "categories" ("name", "slug", "display_order") VALUES
('Commercial', 'commercial', 1),
('Music Video', 'music-video', 2),
('Documentary', 'documentary', 3),
('Short Film', 'short-film', 4),
('Corporate', 'corporate', 5)
ON CONFLICT ("name") DO NOTHING;

-- Insert default biography content
INSERT INTO "biography" ("hero_title", "bio_text", "locations", "courses", "clients", "member_of", "skills") VALUES
('Francisco Puyol', 
'Creative director and filmmaker based in São Paulo, specializing in visual storytelling and brand narratives.', 
ARRAY['São Paulo, Brazil', 'Miami, USA'], 
ARRAY['Film Direction Workshop', 'Color Grading Masterclass'],
ARRAY['Nike', 'Coca-Cola', 'Mercedes-Benz'],
ARRAY['Directors Guild', 'Creative Collective'],
ARRAY['Direction', 'Editing', 'Color Grading', 'Motion Graphics'])
ON CONFLICT ("id") DO NOTHING;

-- Insert default contact settings
INSERT INTO "contact_settings" ("cta_text", "destination_email", "form_enabled") VALUES
('Let''s Chat.', 'franciscopuyol@gmail.com', true)
ON CONFLICT ("id") DO NOTHING;