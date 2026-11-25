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
  ('9384273d-ca5e-5556-a16c-7ea654493d25', 'b0582e09-f488-5a3c-a222-5e0229d7c5b3', 'Chop Life Kitchen', 'chop-life', ARRAY['Rice & Bowls','Drinks']::text[], 'Free delivery this week', 150000, 25, 40, 4.6, 1677, true, true),
  ('3beec4b0-0783-517a-8b90-1bf982ceafb7', 'a71b78fd-fe38-5a75-8cce-fc8849935de9', 'Shawarma Central', 'shawarma-central', ARRAY['Shawarma & Wraps']::text[], NULL, 80000, 15, 25, 4.4, 845, true, true),
  ('ea735b6b-3f47-5ef9-ad5d-82dae17c1dbc', '47349e00-6449-51f4-a4eb-bd8dd300db28', 'Burger Lag', 'burger-lag', ARRAY['Burgers']::text[], NULL, 100000, 20, 30, 4.5, 1102, true, true),
  ('fb575644-6abc-5d9a-988e-247bf296d670', 'c9cf2e1b-dfb2-5e82-8e27-3e080859a14e', 'Pepper Dem', 'pepper-dem', ARRAY['Pepper Soup']::text[], NULL, 90000, 25, 35, 4.6, 764, true, true),
  ('ee4e1b83-b5c5-5fd7-980d-882f461d4be2', 'aa44ace6-d389-5332-b54c-6c155af90727', 'Crumb & Craft', 'crumb-craft', ARRAY['Pastries','Drinks']::text[], 'Buy 2 pastries, get 1 free', 110000, 15, 25, 4.9, 1489, true, true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO menu_items
  (id, merchant_id, name, description, price_kobo, category, is_spicy, is_popular)
VALUES
  ('965f4edb-cee5-5233-be31-e821ccbc92c8', 'e401feec-c514-577d-93e7-d75ac0a8c650', 'Amala + Ewedu + Gbegiri', 'Soft amala with ewedu, gbegiri and assorted beef', 280000, 'Swallow & Soup', false, true),
  ('33ce561d-e238-5707-a9fa-b20ca35b2f49', 'e401feec-c514-577d-93e7-d75ac0a8c650', 'Pounded Yam & Egusi', 'Pounded yam with melon-seed soup and ponmo', 320000, 'Swallow & Soup', false, false),
  ('7f0ce994-b0f8-5e78-9022-136890d15e3b', 'e401feec-c514-577d-93e7-d75ac0a8c650', 'Ofada Rice & Ayamase', 'Local ofada rice with green pepper sauce', 350000, 'Rice & Bowls', true, false),
  ('5c57bcbe-eb71-59d7-926c-2e6220a1a899', 'e401feec-c514-577d-93e7-d75ac0a8c650', 'Jollof Rice & Chicken', 'Smoky party jollof with fried chicken quarter', 300000, 'Rice & Bowls', false, true),
  ('1dc5063f-3aef-5e3c-87fa-2574339e143a', 'e401feec-c514-577d-93e7-d75ac0a8c650', 'Peppered Goat Meat', 'Asun-style tossed goat meat', 280000, 'Swallow & Soup', true, false),
  ('6aaa12f2-2d4c-5957-8236-80cdbb13d125', 'e401feec-c514-577d-93e7-d75ac0a8c650', 'Chapman', 'Classic Lagos chapman, chilled', 150000, 'Drinks', false, false),
  ('8c697790-547a-52ad-8122-0644ae16652d', '390ce027-119c-5498-8ac5-8281ae009c6c', 'Beef Suya (200g)', 'Flame-grilled, yaji-heavy, onions and pepper', 250000, 'Suya & Grill', true, true),
  ('492497b1-6bae-58e6-9020-6a637278407a', '390ce027-119c-5498-8ac5-8281ae009c6c', 'Chicken Suya', 'Whole grilled chicken in suya spice', 300000, 'Suya & Grill', true, false),
  ('a1136b40-c42d-54b0-8011-5d3648b57581', '390ce027-119c-5498-8ac5-8281ae009c6c', 'Suya Platter (Mixed)', 'Beef, chicken, gizzard and tozo — feeds two', 650000, 'Suya & Grill', false, true),
  ('97a67558-935d-56d2-8a4a-0079a21075c3', '390ce027-119c-5498-8ac5-8281ae009c6c', 'Kilishi', 'Dried spiced beef sheets, 100g pack', 400000, 'Suya & Grill', false, false),
  ('28bef070-ab25-572f-ab7d-e7f0511fccd1', '390ce027-119c-5498-8ac5-8281ae009c6c', 'Grilled Catfish', 'Point-and-kill style, peppered sauce on the side', 550000, 'Suya & Grill', true, false),
  ('a33eb423-95c4-5aa5-81eb-bae75c48a12a', '390ce027-119c-5498-8ac5-8281ae009c6c', 'Zobo', 'Hibiscus drink, ginger-forward, 50cl', 90000, 'Drinks', false, false),
  ('950d6bb4-6dc2-5cce-ba56-74e4b0e344ac', 'bcf8d00d-e03a-51e5-8298-5451e196c37b', 'Amala Dudu & Abula', 'Dark amala, ewedu-gbegiri combo, assorted meat', 250000, 'Swallow & Soup', false, true),
  ('b3f58899-44c9-5545-a43e-6ca4bba87ca3', 'bcf8d00d-e03a-51e5-8298-5451e196c37b', 'Eba & Okro Soup', 'Garri with fresh okro, tilapia cut', 230000, 'Swallow & Soup', false, false),
  ('fdcce9a8-bbfd-5800-964e-b1a198f27930', 'bcf8d00d-e03a-51e5-8298-5451e196c37b', 'Fufu & Ogbono', 'Cassava fufu with draw soup and stockfish', 260000, 'Swallow & Soup', false, false),
  ('c203275b-b9a8-53b6-be32-3a9c207d023e', 'bcf8d00d-e03a-51e5-8298-5451e196c37b', 'Assorted Meat Bowl', 'Shaki, ponmo, roundabout in pepper sauce', 220000, 'Swallow & Soup', true, false),
  ('dbb586b4-1154-52d8-8287-40c0e7ec1b4f', 'bcf8d00d-e03a-51e5-8298-5451e196c37b', 'Palm Wine (Palmie, 50cl)', 'Bottled palm wine, chilled', 120000, 'Drinks', false, false),
  ('296f3720-16c5-5878-96fe-d20ad59716a0', '9384273d-ca5e-5556-a16c-7ea654493d25', 'Native Rice & Peppered Snail', 'Palm-oil native rice, snail and smoked fish', 520000, 'Rice & Bowls', true, true),
  ('3192fd07-4e56-512b-b72c-63cb5c28d176', '9384273d-ca5e-5556-a16c-7ea654493d25', 'Coconut Rice & Shrimp', 'Coconut-infused rice with grilled shrimp skewers', 480000, 'Rice & Bowls', false, false),
  ('13e4ef06-cc70-5ae8-96b3-2f8884d74e12', '9384273d-ca5e-5556-a16c-7ea654493d25', 'Fried Rice & Turkey', 'Village-style fried rice with turkey wing', 420000, 'Rice & Bowls', false, false),
  ('9bb8fc98-62ae-5324-b0c5-3cf0af5494ed', '9384273d-ca5e-5556-a16c-7ea654493d25', 'Asun Rice Bowl', 'Spicy goat meat over basmati', 450000, 'Rice & Bowls', true, false),
  ('092db0c8-61f4-56b2-b4a1-57ae9ea1edc2', '9384273d-ca5e-5556-a16c-7ea654493d25', 'Fresh Tigernut Milk', 'Kunun aya, date-sweetened, 40cl', 180000, 'Drinks', false, false),
  ('c28810be-d36b-5758-855e-ba33ecf01c39', '3beec4b0-0783-517a-8b90-1bf982ceafb7', 'Chicken Shawarma (Regular)', 'Double chicken, extra sauce, toasted', 280000, 'Shawarma & Wraps', false, true),
  ('8359a175-fff3-5bfa-8e06-af52b9354853', '3beec4b0-0783-517a-8b90-1bf982ceafb7', 'Beef & Chicken Mix', 'Half-and-half, garlic sauce, pickles', 320000, 'Shawarma & Wraps', false, false),
  ('229348e6-a815-5513-a819-7169eebbbe1f', '3beec4b0-0783-517a-8b90-1bf982ceafb7', 'Jumbo Shawarma', 'Triple meat, double cheese, extra large', 450000, 'Shawarma & Wraps', false, true),
  ('62a9dc4e-f0f8-51c6-be99-0e9ac0a0aab4', '3beec4b0-0783-517a-8b90-1bf982ceafb7', 'Spicy Suya Shawarma', 'Suya-spiced beef wrap with yaji mayo', 350000, 'Shawarma & Wraps', true, false),
  ('fc6a07ef-8c50-5e54-abca-80548e5c16de', '3beec4b0-0783-517a-8b90-1bf982ceafb7', 'Smoothie (Mango)', 'Fresh mango-banana smoothie, 40cl', 200000, 'Drinks', false, false),
  ('251accce-e1df-54a0-906e-f820c8726aa4', 'ea735b6b-3f47-5ef9-ad5d-82dae17c1dbc', 'Lagos Smash Burger', 'Double smashed patty, suya-spiced onions, agege bun', 550000, 'Burgers', false, true),
  ('a43c3b43-a75e-5153-ac2f-5f929acbdf41', 'ea735b6b-3f47-5ef9-ad5d-82dae17c1dbc', 'Chicken Suya Burger', 'Crispy chicken, yaji slaw, plantain chips inside', 500000, 'Burgers', true, false),
  ('92d89930-3bc5-5856-a584-1dbe8a3194e3', 'ea735b6b-3f47-5ef9-ad5d-82dae17c1dbc', 'Double Trouble', 'Two patties, double cheese, house sauce', 680000, 'Burgers', false, false),
  ('a7a49054-7a9f-5549-95d0-0dbfd335dea9', 'ea735b6b-3f47-5ef9-ad5d-82dae17c1dbc', 'Sweet Potato Fries', 'With pepper-salt dust', 220000, 'Burgers', false, false),
  ('29d5b8bb-7a51-51a6-94a6-4da30bdd34c7', 'ea735b6b-3f47-5ef9-ad5d-82dae17c1dbc', 'Malt Shake', 'Thick chocolate malt shake', 250000, 'Drinks', false, false),
  ('9f9fff37-3944-5a72-b952-c57fe7b787db', 'fb575644-6abc-5d9a-988e-247bf296d670', 'Catfish Pepper Soup', 'Fresh point-and-kill catfish, native spices', 450000, 'Pepper Soup', true, true),
  ('5bf2192a-d29e-54ec-83ac-3f8c5c71aede', 'fb575644-6abc-5d9a-988e-247bf296d670', 'Goat Meat Pepper Soup', 'Slow-simmered, scent-leaf finish', 380000, 'Pepper Soup', true, false),
  ('f689da2f-b3f9-509c-a9b4-68cee1774afe', 'fb575644-6abc-5d9a-988e-247bf296d670', 'Chicken Pepper Soup', 'Old-layer chicken, extra broth', 320000, 'Pepper Soup', false, false),
  ('0b928840-ace0-5f5a-9055-d27d41fa2a22', 'fb575644-6abc-5d9a-988e-247bf296d670', 'White Rice Side', 'Steamed rice to soak the broth', 100000, 'Pepper Soup', false, false),
  ('78ba69f0-060d-5b03-bb22-9c8bbcceae13', 'fb575644-6abc-5d9a-988e-247bf296d670', 'Kunu (50cl)', 'Millet drink, lightly spiced', 80000, 'Drinks', false, false),
  ('11ccd035-3479-5f1e-87bd-27a29a24ea4d', 'ee4e1b83-b5c5-5fd7-980d-882f461d4be2', 'Meat Pie (Butter Crust)', 'Flaky crust, minced beef and irish potato', 180000, 'Pastries', false, true),
  ('6cfa5f92-8828-5a20-9812-f0707e13ee30', 'ee4e1b83-b5c5-5fd7-980d-882f461d4be2', 'Chicken Pie', 'Shredded chicken filling, golden crust', 200000, 'Pastries', false, false),
  ('549509dc-9748-56e9-8828-04317c745018', 'ee4e1b83-b5c5-5fd7-980d-882f461d4be2', 'Sausage Roll (2 pcs)', 'Beef sausage in soft pastry', 150000, 'Pastries', false, false),
  ('f2d39100-d09b-510b-8d08-fa8cb1a0586d', 'ee4e1b83-b5c5-5fd7-980d-882f461d4be2', 'Agege Bread & Ewa Agoyin', 'Soft agege loaf with spicy beans sauce', 250000, 'Pastries', true, false),
  ('ff5d8786-4ca9-56e3-83fd-962a0e857f69', 'ee4e1b83-b5c5-5fd7-980d-882f461d4be2', 'Cold Brew Zobo Spritz', 'Zobo, lime and soda, 40cl', 160000, 'Drinks', false, false)
ON CONFLICT (id) DO NOTHING;

COMMIT;
