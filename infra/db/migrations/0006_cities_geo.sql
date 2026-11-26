-- 0006_cities_geo.sql — geo coordinates + multi-city launch zones.
-- Idempotent: safe to re-run (boot self-heal replays anything missing from the
-- _pf_migrations ledger, and the Neon guided flow does not write that ledger).
BEGIN;

ALTER TABLE cities
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;

ALTER TABLE areas
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;

-- Abuja (FCT) centroid + zone centroids (powers "use my location" + maps).
UPDATE cities SET lat = 9.0765, lng = 7.3986 WHERE name = 'Abuja' AND state = 'FCT';

UPDATE areas a SET lat = 9.0788, lng = 7.4772 FROM cities c WHERE a.city_id = c.id AND c.name = 'Abuja' AND a.name = 'Wuse 2';
UPDATE areas a SET lat = 9.0895, lng = 7.4947 FROM cities c WHERE a.city_id = c.id AND c.name = 'Abuja' AND a.name = 'Maitama';
UPDATE areas a SET lat = 9.0367, lng = 7.5215 FROM cities c WHERE a.city_id = c.id AND c.name = 'Abuja' AND a.name = 'Asokoro';
UPDATE areas a SET lat = 9.0310, lng = 7.4820 FROM cities c WHERE a.city_id = c.id AND c.name = 'Abuja' AND a.name = 'Garki';
UPDATE areas a SET lat = 9.0712, lng = 7.4234 FROM cities c WHERE a.city_id = c.id AND c.name = 'Abuja' AND a.name = 'Jabi';
UPDATE areas a SET lat = 9.1104, lng = 7.4057 FROM cities c WHERE a.city_id = c.id AND c.name = 'Abuja' AND a.name = 'Gwarinpa';

-- Merchant coordinates (near their zone centroid; the tracking map plots these).
UPDATE merchants SET lat = 9.0298, lng = 7.4865 WHERE slug = 'amala-junction';
UPDATE merchants SET lat = 9.0698, lng = 7.4250 WHERE slug = 'burger-buja';
UPDATE merchants SET lat = 9.0380, lng = 7.5190 WHERE slug = 'chop-life';
UPDATE merchants SET lat = 9.0880, lng = 7.4925 WHERE slug = 'crumb-craft';
UPDATE merchants SET lat = 9.1085, lng = 7.4075 WHERE slug = 'mama-nkechi';
UPDATE merchants SET lat = 9.1120, lng = 7.4040 WHERE slug = 'pepper-dem';
UPDATE merchants SET lat = 9.0800, lng = 7.4755 WHERE slug = 'shawarma-central';
UPDATE merchants SET lat = 9.0725, lng = 7.4215 WHERE slug = 'suya-republic';

-- New launch cities. Zones are selectable everywhere; kitchens are live in
-- Abuja first, the storefront shows a "launching soon" state elsewhere.
INSERT INTO cities (name, state, lat, lng) VALUES
  ('Lagos', 'Lagos', 6.5244, 3.3792),
  ('Port Harcourt', 'Rivers', 4.8156, 7.0498),
  ('Ibadan', 'Oyo', 7.3775, 3.9470),
  ('Kano', 'Kano', 12.0022, 8.5920),
  ('Enugu', 'Enugu', 6.4527, 7.5103)
ON CONFLICT (name, state) DO NOTHING;

INSERT INTO areas (city_id, name, lat, lng)
SELECT c.id, v.zone, v.lat, v.lng
FROM cities c
JOIN (VALUES
  ('Lagos', 'Ikeja', 6.6018, 3.3515),
  ('Lagos', 'Victoria Island', 6.4281, 3.4219),
  ('Lagos', 'Lekki', 6.4698, 3.5852),
  ('Lagos', 'Surulere', 6.4969, 3.3607),
  ('Lagos', 'Yaba', 6.5074, 3.3711),
  ('Port Harcourt', 'GRA', 4.8242, 7.0106),
  ('Port Harcourt', 'Woji', 4.8577, 7.0321),
  ('Port Harcourt', 'Trans-Amadi', 4.8156, 7.0366),
  ('Port Harcourt', 'Rumuola', 4.8597, 7.0034),
  ('Ibadan', 'Bodija', 7.4123, 3.9046),
  ('Ibadan', 'Dugbe', 7.3928, 3.8821),
  ('Ibadan', 'Jericho GRA', 7.4019, 3.8695),
  ('Ibadan', 'Ring Road', 7.3775, 3.9470),
  ('Kano', 'Nassarawa GRA', 11.9952, 8.5318),
  ('Kano', 'Sabon Gari', 12.0022, 8.5220),
  ('Kano', 'Fagge', 11.9908, 8.5203),
  ('Enugu', 'Independence Layout', 6.4412, 7.4986),
  ('Enugu', 'GRA', 6.4521, 7.5103),
  ('Enugu', 'New Haven', 6.4679, 7.5121)
) AS v(city_name, zone, lat, lng) ON c.name = v.city_name
ON CONFLICT (city_id, name) DO NOTHING;

COMMIT;
