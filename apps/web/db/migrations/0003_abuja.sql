-- 0003_abuja.sql — switch launch city from Lagos to Abuja (FCT), in place.
-- Ids are kept stable on purpose: existing orders (e.g. PF-8759) reference
-- area ids, so we UPDATE rather than delete/re-insert.
-- Idempotent: re-running yields the same state.
-- NOTE for the Neon guided-migration flow: strip comment lines before
-- submitting (the splitter breaks on semicolons inside comments).

BEGIN;

-- City: Lagos, Lagos -> Abuja, FCT
UPDATE cities
SET name = 'Abuja', state = 'FCT'
WHERE id = 'e21b059e-6fc9-5043-8f9a-05b32ace00ab';

-- Areas renamed in place (Lagos district -> Abuja district):
--   Ikeja GRA       -> Wuse 2
--   Ikoyi           -> Maitama
--   Lekki Phase 1   -> Asokoro
--   Surulere        -> Garki
--   Victoria Island -> Jabi
--   Yaba            -> Gwarinpa
UPDATE areas SET name = 'Wuse 2'   WHERE id = 'a71b78fd-fe38-5a75-8cce-fc8849935de9';
UPDATE areas SET name = 'Maitama'  WHERE id = 'aa44ace6-d389-5332-b54c-6c155af90727';
UPDATE areas SET name = 'Asokoro'  WHERE id = 'b0582e09-f488-5a3c-a222-5e0229d7c5b3';
UPDATE areas SET name = 'Garki'    WHERE id = 'f15652ad-d735-5c5f-8d13-c8f634b20932';
UPDATE areas SET name = 'Jabi'     WHERE id = '47349e00-6449-51f4-a4eb-bd8dd300db28';
UPDATE areas SET name = 'Gwarinpa' WHERE id = 'c9cf2e1b-dfb2-5e82-8e27-3e080859a14e';

-- Merchant rebrand: Burger Lag -> Burger Buja (slug follows the name)
UPDATE merchants
SET name = 'Burger Buja', slug = 'burger-buja', updated_at = now()
WHERE id = 'ea735b6b-3f47-5ef9-ad5d-82dae17c1dbc';

-- Menu copy
UPDATE menu_items SET name = 'Abuja Smash Burger'
WHERE id = '251accce-e1df-54a0-906e-f820c8726aa4';
UPDATE menu_items SET description = 'Classic Abuja chapman, chilled'
WHERE id = '6aaa12f2-2d4c-5957-8236-80cdbb13d125';

COMMIT;
