-- 0007_multicity_merchants.sql
-- Seed merchants + menus for the five cities added in 0006 so every
-- selectable zone has live kitchens (previously Abuja-only).
-- Idempotent: fixed UUIDs + ON CONFLICT DO NOTHING.

BEGIN;

INSERT INTO merchants
  (id, area_id, name, slug, tags, promo, delivery_fee_kobo,
   eta_min_minutes, eta_max_minutes, rating, review_count, lat, lng,
   is_approved, is_listed)
VALUES
  ('5574df2f-ba23-5a9a-ae7a-fab980bc7419',
   (SELECT a.id FROM areas a JOIN cities c ON c.id = a.city_id WHERE c.name = 'Lagos' AND a.name = 'Lekki'),
   'Lekki Seafood Grill', 'lekki-seafood-grill', ARRAY['Seafood & Grill','Rice & Bowls']::text[], 'Free drink on orders above ₦8,000', 150000, 25, 40, 4.7, 862, 6.4698, 3.5852, true, true),
  ('cb3ae52e-ef66-5e95-be9e-33fcbd0b61aa',
   (SELECT a.id FROM areas a JOIN cities c ON c.id = a.city_id WHERE c.name = 'Lagos' AND a.name = 'Ikeja'),
   'Ikeja City Kitchen', 'ikeja-city-kitchen', ARRAY['Swallow & Soup','Rice & Bowls']::text[], NULL, 90000, 20, 35, 4.6, 1204, 6.6018, 3.3515, true, true),
  ('8ab381e4-de36-5de2-8e87-a5b68c83c0e3',
   (SELECT a.id FROM areas a JOIN cities c ON c.id = a.city_id WHERE c.name = 'Enugu' AND a.name = 'GRA'),
   'Coal City Pot', 'coal-city-pot', ARRAY['Swallow & Soup','Pepper Soup']::text[], '10% off first order', 80000, 25, 35, 4.5, 433, 6.4521, 7.5103, true, true),
  ('2fa8e0e7-ca2b-5c7c-8d5d-44e5e865ab8f',
   (SELECT a.id FROM areas a JOIN cities c ON c.id = a.city_id WHERE c.name = 'Enugu' AND a.name = 'New Haven'),
   'New Haven Chops', 'new-haven-chops', ARRAY['Small Chops','Suya & Grill']::text[], NULL, 70000, 15, 25, 4.4, 287, 6.4679, 7.5121, true, true),
  ('837bbab8-a8da-5921-884d-01e22cee6f50',
   (SELECT a.id FROM areas a JOIN cities c ON c.id = a.city_id WHERE c.name = 'Ibadan' AND a.name = 'Bodija'),
   'Bodija Amala Spot', 'bodija-amala-spot', ARRAY['Swallow & Soup']::text[], NULL, 60000, 20, 30, 4.6, 691, 7.4123, 3.9046, true, true),
  ('21b9c4f9-55e2-50e2-8608-cd95e6c188d9',
   (SELECT a.id FROM areas a JOIN cities c ON c.id = a.city_id WHERE c.name = 'Ibadan' AND a.name = 'Dugbe'),
   'Dugbe Delights', 'dugbe-delights', ARRAY['Rice & Bowls','Pastries']::text[], 'Buy 2 meat pies, get 1 free', 70000, 15, 30, 4.3, 352, 7.3928, 3.8821, true, true),
  ('dfefd913-5882-506d-9a52-7d942839dc74',
   (SELECT a.id FROM areas a JOIN cities c ON c.id = a.city_id WHERE c.name = 'Kano' AND a.name = 'Nassarawa GRA'),
   'Kano Suya Palace', 'kano-suya-palace', ARRAY['Suya & Grill']::text[], 'Free kilishi sample tonight', 80000, 20, 35, 4.8, 1540, 11.9952, 8.5318, true, true),
  ('f8d81ec3-cd01-5ea3-913b-d8599e3678e9',
   (SELECT a.id FROM areas a JOIN cities c ON c.id = a.city_id WHERE c.name = 'Kano' AND a.name = 'Sabon Gari'),
   'Sabon Gari Tuwo House', 'sabon-gari-tuwo', ARRAY['Swallow & Soup','Grill']::text[], NULL, 60000, 25, 35, 4.5, 428, 12.0022, 8.5220, true, true),
  ('c874c9d9-c78a-5aef-ba82-3face216c255',
   (SELECT a.id FROM areas a JOIN cities c ON c.id = a.city_id WHERE c.name = 'Port Harcourt' AND a.name = 'GRA'),
   'PH Bole & Fish', 'ph-bole-fish', ARRAY['Bole & Grill','Seafood & Grill']::text[], 'Bole special: free extra fish', 100000, 20, 35, 4.7, 977, 4.8242, 7.0106, true, true),
  ('a16ce5e4-9a47-548b-a57e-bd18c9758dbc',
   (SELECT a.id FROM areas a JOIN cities c ON c.id = a.city_id WHERE c.name = 'Port Harcourt' AND a.name = 'Woji'),
   'Woji Native Kitchen', 'woji-native-kitchen', ARRAY['Native Soups','Swallow & Soup']::text[], NULL, 90000, 25, 40, 4.6, 513, 4.8577, 7.0321, true, true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO menu_items
  (id, merchant_id, name, description, price_kobo, category, is_spicy, is_popular)
VALUES
  ('0e6bdb0e-3f14-5b86-97f1-56940adf7d88', '5574df2f-ba23-5a9a-ae7a-fab980bc7419', 'Grilled Croaker & Plantain', 'Whole croaker, peppered butter, fried plantain', 450000, 'Seafood & Grill', true, true),
  ('5a3f69b8-2583-503a-92fb-4453f45c1ed6', '5574df2f-ba23-5a9a-ae7a-fab980bc7419', 'Seafood Okra & Eba', 'Prawns, fish and periwinkle okra with eba', 380000, 'Swallow & Soup', false, true),
  ('5666ea35-771e-5e97-9852-0249230c8fee', '5574df2f-ba23-5a9a-ae7a-fab980bc7419', 'Jollof Rice & Prawns', 'Smoky jollof topped with jumbo prawns', 350000, 'Rice & Bowls', false, false),
  ('17787cac-88df-540b-ac1a-ed16e2a71415', 'cb3ae52e-ef66-5e95-be9e-33fcbd0b61aa', 'Efo Riro & Pounded Yam', 'Rich spinach stew with assorted meat', 320000, 'Swallow & Soup', true, true),
  ('c4a97b93-81c4-5541-bf79-06c7af8730fa', 'cb3ae52e-ef66-5e95-be9e-33fcbd0b61aa', 'Ofada Rice & Ayamase', 'Local ofada with green pepper sauce', 300000, 'Rice & Bowls', true, false),
  ('83fa2e9b-7ca4-5dcd-a9d5-e498ed17e2c0', 'cb3ae52e-ef66-5e95-be9e-33fcbd0b61aa', 'Peppered Chicken', 'Tossed in ata dudu glaze', 250000, 'Grill', true, false),
  ('80ad4734-c6a1-53b6-aef3-b52dac47e06e', '8ab381e4-de36-5de2-8e87-a5b68c83c0e3', 'Oha Soup & Fufu', 'Fresh oha leaves, stockfish, cocoyam thickener', 300000, 'Swallow & Soup', false, true),
  ('2919bd9c-8b99-5ffe-9a9f-faa0eb85a9c3', '8ab381e4-de36-5de2-8e87-a5b68c83c0e3', 'Nsala (White Soup) & Pounded Yam', 'Catfish nsala, utazi finish', 350000, 'Swallow & Soup', false, false),
  ('ff609772-9f25-55cc-9ecb-799b74605283', '8ab381e4-de36-5de2-8e87-a5b68c83c0e3', 'Goat Meat Pepper Soup', 'Native spice blend, scent leaf', 220000, 'Pepper Soup', true, true),
  ('262c24e1-b2cf-587d-9b96-d6e399fc47b8', '2fa8e0e7-ca2b-5c7c-8d5d-44e5e865ab8f', 'Small Chops Platter', 'Samosa, spring roll, puff puff, peppered gizzard', 200000, 'Small Chops', true, true),
  ('73b31949-a738-528c-8bbc-59b55f791a7f', '2fa8e0e7-ca2b-5c7c-8d5d-44e5e865ab8f', 'Chicken Suya', 'Whole grilled chicken in suya spice', 280000, 'Suya & Grill', true, false),
  ('c6e1c36c-770a-57cb-8839-aa320aaf6002', '2fa8e0e7-ca2b-5c7c-8d5d-44e5e865ab8f', 'Puff Puff (6 pcs)', 'Soft, golden, fresh from the fryer', 80000, 'Small Chops', false, false),
  ('2b9d280e-b5fe-51ab-86ce-a0c912199fb4', '837bbab8-a8da-5921-884d-01e22cee6f50', 'Amala + Ewedu + Gbegiri', 'Classic Ibadan combo with assorted beef', 250000, 'Swallow & Soup', false, true),
  ('12dda892-6139-5b2b-a25d-2a6b5eeae730', '837bbab8-a8da-5921-884d-01e22cee6f50', 'Amala & Ewedu with Bushmeat', 'Hunter-style assorted game meat', 400000, 'Swallow & Soup', false, false),
  ('afb6e04e-5761-58ce-8b5e-4c94a48e76e7', '837bbab8-a8da-5921-884d-01e22cee6f50', 'Gbegiri Extra Bowl', 'Bean soup side, palm oil swirl', 90000, 'Swallow & Soup', false, false),
  ('8827d240-ae30-54a4-b22e-f8676bc63d93', '21b9c4f9-55e2-50e2-8608-cd95e6c188d9', 'Ibadan Jollof & Chicken', 'Party-style jollof, fried chicken quarter', 280000, 'Rice & Bowls', false, true),
  ('a8f11aad-e8b4-5197-b6f2-ccd9dbf2cd72', '21b9c4f9-55e2-50e2-8608-cd95e6c188d9', 'Meat Pie', 'Flaky crust, minced beef filling', 90000, 'Pastries', false, false),
  ('f63604d2-9538-5f95-9421-e7353d684b16', '21b9c4f9-55e2-50e2-8608-cd95e6c188d9', 'Moin Moin (2 wraps)', 'Steamed bean pudding, leaves wrap', 120000, 'Sides', false, false),
  ('31018041-6125-5ef4-912e-0eaab1d2b467', 'dfefd913-5882-506d-9a52-7d942839dc74', 'Beef Suya (300g)', 'Yaji-heavy, flame-grilled, onions', 300000, 'Suya & Grill', true, true),
  ('7cf1209a-7a33-5fc3-8f05-c694b1fd6d35', 'dfefd913-5882-506d-9a52-7d942839dc74', 'Kilishi (100g)', 'Sun-dried spiced beef sheets', 400000, 'Suya & Grill', false, false),
  ('e479091a-87fd-55f8-babe-e7e6cc4ee04c', 'dfefd913-5882-506d-9a52-7d942839dc74', 'Ram Suya Platter', 'Feeds three — with fresh onions and cabbage', 750000, 'Suya & Grill', true, false),
  ('3fb70997-a973-55e0-9f33-6257252e4987', 'f8d81ec3-cd01-5ea3-913b-d8599e3678e9', 'Tuwo Shinkafa & Miyan Kuka', 'Rice tuwo with baobab-leaf soup', 220000, 'Swallow & Soup', false, true),
  ('78585020-e83a-5ab4-a103-6211fbb755b5', 'f8d81ec3-cd01-5ea3-913b-d8599e3678e9', 'Miyan Taushe & Tuwo', 'Pumpkin soup with spinach and meat', 250000, 'Swallow & Soup', false, false),
  ('c0af1a75-e9c8-5352-8e85-727fe1d91c1b', 'f8d81ec3-cd01-5ea3-913b-d8599e3678e9', 'Fried Waina (Masa)', 'Rice cakes with yaji dip (6 pcs)', 100000, 'Sides', false, false),
  ('18a8f209-7386-57af-b20e-2e8f00c3d33c', 'c874c9d9-c78a-5aef-ba82-3face216c255', 'Bole & Roasted Fish', 'Roast plantain, whole fish, pepper sauce', 350000, 'Bole & Grill', true, true),
  ('a46fa5e0-a474-594e-bb82-6d535d5d6148', 'c874c9d9-c78a-5aef-ba82-3face216c255', 'Bole & Yam Combo', 'Roast plantain and yam with palm-oil sauce', 250000, 'Bole & Grill', false, false),
  ('4fbba405-6d52-5b2d-bee7-88f328d189bd', 'c874c9d9-c78a-5aef-ba82-3face216c255', 'Peppered Snails', 'Tossed in hot pepper sauce', 400000, 'Bole & Grill', true, false),
  ('2c9fb874-f7b0-56ae-84a2-f8aa8a15b22b', 'a16ce5e4-9a47-548b-a57e-bd18c9758dbc', 'Fisherman Soup & Fufu', 'Fresh catch, native spice, periwinkle', 380000, 'Native Soups', false, true),
  ('5f0a8395-d06c-5c57-8872-26496af4cc16', 'a16ce5e4-9a47-548b-a57e-bd18c9758dbc', 'Onunu & Fresh Fish Stew', 'Pounded yam-plantain with peppered fish stew', 320000, 'Swallow & Soup', true, false),
  ('050f202c-aeac-57ff-bd67-80082b15fb0c', 'a16ce5e4-9a47-548b-a57e-bd18c9758dbc', 'Banga Soup & Starch', 'Palm-fruit soup, Delta style', 350000, 'Native Soups', false, false)
ON CONFLICT (id) DO NOTHING;

COMMIT;
