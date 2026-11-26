-- 0010_merchant_branding.sql
-- Restaurant branding: cover photo (signature dish) + generated logo badge.
-- Covers reuse the real dish photography already in public/dishes; logos are
-- generated brand marks served from public/logos (deploy asset, not in git).

ALTER TABLE merchants ADD COLUMN IF NOT EXISTS cover_url text;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS logo_url text;

UPDATE merchants SET cover_url = '/dishes/amala.jpg', logo_url = '/logos/amala-junction.png' WHERE slug = 'amala-junction';
UPDATE merchants SET cover_url = '/dishes/amala.jpg', logo_url = '/logos/bodija-amala-spot.png' WHERE slug = 'bodija-amala-spot';
UPDATE merchants SET cover_url = '/dishes/burger.jpg', logo_url = '/logos/burger-buja.png' WHERE slug = 'burger-buja';
UPDATE merchants SET cover_url = '/dishes/native-rice.jpg', logo_url = '/logos/chop-life.png' WHERE slug = 'chop-life';
UPDATE merchants SET cover_url = '/dishes/pepper-soup-goat.jpg', logo_url = '/logos/coal-city-pot.png' WHERE slug = 'coal-city-pot';
UPDATE merchants SET cover_url = '/dishes/meat-pie.jpg', logo_url = '/logos/crumb-craft.png' WHERE slug = 'crumb-craft';
UPDATE merchants SET cover_url = '/dishes/jollof.jpg', logo_url = '/logos/dugbe-delights.png' WHERE slug = 'dugbe-delights';
UPDATE merchants SET cover_url = '/dishes/efo-riro.jpg', logo_url = '/logos/ikeja-city-kitchen.png' WHERE slug = 'ikeja-city-kitchen';
UPDATE merchants SET cover_url = '/dishes/suya-beef.jpg', logo_url = '/logos/kano-suya-palace.png' WHERE slug = 'kano-suya-palace';
UPDATE merchants SET cover_url = '/dishes/croaker.jpg', logo_url = '/logos/lekki-seafood-grill.png' WHERE slug = 'lekki-seafood-grill';
UPDATE merchants SET cover_url = '/dishes/egusi.jpg', logo_url = '/logos/mama-nkechi.png' WHERE slug = 'mama-nkechi';
UPDATE merchants SET cover_url = '/dishes/small-chops.jpg', logo_url = '/logos/new-haven-chops.png' WHERE slug = 'new-haven-chops';
UPDATE merchants SET cover_url = '/dishes/catfish-peppersoup.jpg', logo_url = '/logos/pepper-dem.png' WHERE slug = 'pepper-dem';
UPDATE merchants SET cover_url = '/dishes/bole.jpg', logo_url = '/logos/ph-bole-fish.png' WHERE slug = 'ph-bole-fish';
UPDATE merchants SET cover_url = '/dishes/tuwo.jpg', logo_url = '/logos/sabon-gari-tuwo.png' WHERE slug = 'sabon-gari-tuwo';
UPDATE merchants SET cover_url = '/dishes/shawarma.jpg', logo_url = '/logos/shawarma-central.png' WHERE slug = 'shawarma-central';
UPDATE merchants SET cover_url = '/dishes/suya-platter.jpg', logo_url = '/logos/suya-republic.png' WHERE slug = 'suya-republic';
UPDATE merchants SET cover_url = '/dishes/banga.jpg', logo_url = '/logos/woji-native-kitchen.png' WHERE slug = 'woji-native-kitchen';
