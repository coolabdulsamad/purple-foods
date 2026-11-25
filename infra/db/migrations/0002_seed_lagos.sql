-- Purple Foods - Lagos launch seed (idempotent via fixed uuid5 ids)
-- Mirrors apps/web/src/data.ts. Money converted naira -> kobo (x100).

BEGIN;

INSERT INTO cities (id, name) VALUES
  ('e21b059e-6fc9-5043-8f9a-05b32ace00ab', 'Lagos')
ON CONFLICT (name, state) DO NOTHING;

INSERT INTO areas (id, city_id, name) VALUES
  ('47349e00-6449-51f4-a4eb-bd8dd300db28', 'e21b059e-6fc9-5043-8f9a-05b32ace00ab', 'Victoria Island'),
  ('b0582e09-f488-5a3c-a222-5e0229d7c5b3', 'e21b059e-6fc9-5043-8f9a-05b32ace00ab', 'Lekki Phase 1'),
  ('aa44ace6-d389-5332-b54c-6c155af90727', 'e21b059e-6fc9-5043-8f9a-05b32ace00ab', 'Ikoyi'),
  ('c9cf2e1b-dfb2-5e82-8e27-3e080859a14e', 'e21b059e-6fc9-5043-8f9a-05b32ace00ab', 'Yaba'),
  ('f15652ad-d735-5c5f-8d13-c8f634b20932', 'e21b059e-6fc9-5043-8f9a-05b32ace00ab', 'Surulere'),
  ('a71b78fd-fe38-5a75-8cce-fc8849935de9', 'e21b059e-6fc9-5043-8f9a-05b32ace00ab', 'Ikeja GRA')
ON CONFLICT (city_id, name) DO NOTHING;

INSERT INTO merchants
  (id, area_id, name, slug, tags, promo, delivery_fee_kobo,
   eta_min_minutes, eta_max_minutes, rating, review_count,
   is_approved, is_listed)
VALUES
  ('e401feec-c514-577d-93e7-d75ac0a8c650', 'c9cf2e1b-dfb2-5e82-8e27-3e080859a14e', 'Mama Nkechi''s Kitchen', 'mama-nkechi', ARRAY['Swallow & Soup','Rice & Bowls']::text[], '20% off orders above ₦5,000', 90000, 25, 35, 4.7, 1284, true, true),
  ('390ce027-119c-5498-8ac5-8281ae009c6c', '47349e00-6449-51f4-a4eb-bd8dd300db28', 'Suya Republic', 'suya-republic', ARRAY['Suya & Grill']::text[], NULL, 120000, 20, 30, 4.8, 2103, true, true),
  ('bcf8d00d-e03a-51e5-8298-5451e196c37b', 'f15652ad-d735-5c5f-8d13-c8f634b20932', 'Amala Junction', 'amala-junction', ARRAY['Swallow & Soup']::text[], NULL, 70000, 30, 40, 4.5, 932, true, true),
  ('4ea4dcda-41c5-5f7b-afea-1bd6a94ce4b2', 'b0582e09-f488-5a3c-a222-5e0229d7c5b3', 'Chop Life Kitchen', 'chop-life', ARRAY['Rice & Bowls','Drinks']::text[], 'Free delivery this week', 150000, 25, 40, 4.6, 1677, true, true),
  ('4e28d44b-2e0c-5a0a-a01d-8d4e9d5f15d8', 'a71b78fd-fe38-5a75-8cce-fc8849935de9', 'Shawarma Central', 'shawarma-central', ARRAY['Shawarma & Wraps']::text[], NULL, 80000, 15, 25, 4.4, 845, true, true),
  ('e35607a0-fc32-5535-9f04-0a78f489f6bd', '47349e00-6449-51f4-a4eb-bd8dd300db28', 'Burger Lag', 'burger-lag', ARRAY['Burgers']::text[], NULL, 100000, 20, 30, 4.5, 1102, true, true),
  ('b5cfbc28-86d3-54c0-9210-1fb1ab0d6e4b', 'c9cf2e1b-dfb2-5e82-8e27-3e080859a14e', 'Pepper Dem', 'pepper-dem', ARRAY['Pepper Soup']::text[], NULL, 90000, 25, 35, 4.6, 764, true, true),
  ('e96dbb78-a20a-5dc6-b65f-4ae3a181358a', 'aa44ace6-d389-5332-b54c-6c155af90727', 'Crumb & Craft', 'crumb-craft', ARRAY['Pastries','Drinks']::text[], 'Buy 2 pastries, get 1 free', 110000, 15, 25, 4.9, 1489, true, true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO menu_items
  (id, merchant_id, name, description, price_kobo, category, is_spicy, is_popular)
VALUES
  ('8a47d183-5843-50c9-8e8c-9c8f6f0a0001', 'e401feec-c514-577d-93e7-d75ac0a8c650', 'Amala + Ewedu + Gbegiri', 'Soft amala with ewedu, gbegiri and assorted beef', 280000, 'Swallow & Soup', false, true),
  ('8a47d183-5843-50c9-8e8c-9c8f6f0a0002', 'e401feec-c514-577d-93e7-d75ac0a8c650', 'Pounded Yam & Egusi', 'Pounded yam with melon-seed soup and ponmo', 320000, 'Swallow & Soup', false, false),
  ('8a47d183-5843-50c9-8e8c-9c8f6f0a0003', 'e401feec-c514-577d-93e7-d75ac0a8c650', 'Ofada Rice & Ayamase', 'Local ofada rice with green pepper sauce', 350000, 'Rice & Bowls', true, false),
  ('8a47d183-5843-50c9-8e8c-9c8f6f0a0004', 'e401feec-c514-577d-93e7-d75ac0a8c650', 'Jollof Rice & Chicken', 'Smoky party jollof with fried chicken quarter', 300000, 'Rice & Bowls', false, true),
  ('8a47d183-5843-50c9-8e8c-9c8f6f0a0005', 'e401feec-c514-577d-93e7-d75ac0a8c650', 'Peppered Goat Meat', 'Asun-style tossed goat meat', 280000, 'Swallow & Soup', true, false),
  ('8a47d183-5843-50c9-8e8c-9c8f6f0a0006', 'e401feec-c514-577d-93e7-d75ac0a8c650', 'Chapman', 'Classic Lagos chapman, chilled', 150000, 'Drinks', false, false)
ON CONFLICT (id) DO NOTHING;

COMMIT;
