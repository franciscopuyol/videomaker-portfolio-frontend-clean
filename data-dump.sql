-- Francisco Puyol Video Portfolio - Sample Data Export
-- This file contains sample data from the current working system

-- Insert admin user
INSERT INTO "users" ("id", "email", "first_name", "last_name", "role", "profile_image_url") VALUES
('admin', 'admin@franciscopuyol.com', 'Francisco', 'Puyol', 'admin', NULL)
ON CONFLICT ("id") DO UPDATE SET
  "email" = EXCLUDED."email",
  "first_name" = EXCLUDED."first_name",
  "last_name" = EXCLUDED."last_name",
  "role" = EXCLUDED."role";

-- Insert biography data
INSERT INTO "biography" ("id", "hero_title", "bio_text", "locations", "courses", "clients", "member_of", "skills", "profile_image_url") VALUES
(1, 
'I tell stories with motion, sound and a cinematic eye.',
'Francisco Puyol is a filmmaker and motion designer focused on visual storytelling across digital platforms. With a strong cinematic sensibility and detail-oriented approach, he brings depth and rhythm to every frame.',
ARRAY['Brazil 🇧🇷', 'Argentina 🇦🇷', 'Uruguay 🇺🇾', 'USA 🇺🇸'],
ARRAY['Color Grading for Storytelling – Domestika', 'Cinematic Composition – FutureLearn', 'Creative Editing Techniques – Masterclass'],
ARRAY['Netflix', 'iFit', 'John Deer', 'Coca Cola', 'Ambev', 'Mercado Libre'],
ARRAY['Puyol Films'],
ARRAY['Motion Design', 'Color Grading', 'Video Editing', 'Cinematography', 'Storytelling'],
'https://res.cloudinary.com/dsxafrysa/image/upload/c_fill,dpr_auto,f_auto,h_800,q_auto,w_800/v1/portfolio/profiles/profile_43497246_1749690504942.webp?_a=BAMClqcc0')
ON CONFLICT ("id") DO UPDATE SET
  "hero_title" = EXCLUDED."hero_title",
  "bio_text" = EXCLUDED."bio_text",
  "locations" = EXCLUDED."locations",
  "courses" = EXCLUDED."courses",
  "clients" = EXCLUDED."clients",
  "member_of" = EXCLUDED."member_of",
  "skills" = EXCLUDED."skills",
  "profile_image_url" = EXCLUDED."profile_image_url";

-- Insert contact settings
INSERT INTO "contact_settings" ("id", "cta_text", "destination_email", "form_enabled") VALUES
(1, 'Let''s Chat.', 'franciscopuyol@gmail.com', true)
ON CONFLICT ("id") DO UPDATE SET
  "cta_text" = EXCLUDED."cta_text",
  "destination_email" = EXCLUDED."destination_email",
  "form_enabled" = EXCLUDED."form_enabled";

-- Insert categories
INSERT INTO "categories" ("name", "slug", "display_order") VALUES
('Commercial', 'commercial', 1),
('Music Video', 'music-video', 2),
('Documentary', 'documentary', 3),
('Short Film', 'short-film', 4),
('Corporate', 'corporate', 5),
('Fashion', 'fashion', 6)
ON CONFLICT ("name") DO NOTHING;