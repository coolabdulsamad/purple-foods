-- 0008_item_options.sql
-- Per-item topping groups ("choose up to N" add-ons with prices) and
-- per-line kitchen details (options snapshot, note, allergy, cutlery)
-- on order_items. Idempotent: IF NOT EXISTS + NOT EXISTS guards.

BEGIN;

CREATE TABLE IF NOT EXISTS menu_item_option_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name text NOT NULL,
  min_select integer NOT NULL DEFAULT 0,
  max_select integer NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_miog_item ON menu_item_option_groups (menu_item_id);

CREATE TABLE IF NOT EXISTS menu_item_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES menu_item_option_groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  price_kobo bigint NOT NULL DEFAULT 0,
  is_available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT menu_item_options_price_nonneg CHECK (price_kobo >= 0)
);

CREATE INDEX IF NOT EXISTS idx_mio_group ON menu_item_options (group_id);

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS options_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS note text NOT NULL DEFAULT '';
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS allergy text NOT NULL DEFAULT '';
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS cutlery boolean NOT NULL DEFAULT false;

-- ── Seed topping groups by menu category (every restaurant benefits) ──

-- Rice & Bowls: protein extras (max 2) + sides (max 3)
INSERT INTO menu_item_option_groups (menu_item_id, name, min_select, max_select, sort_order)
SELECT m.id, 'Protein extras', 0, 2, 1 FROM menu_items m
WHERE m.category = 'Rice & Bowls'
  AND NOT EXISTS (SELECT 1 FROM menu_item_option_groups g WHERE g.menu_item_id = m.id AND g.name = 'Protein extras');

INSERT INTO menu_item_options (group_id, name, price_kobo, sort_order)
SELECT g.id, x.name, x.price, x.ord
FROM menu_item_option_groups g
JOIN menu_items m ON m.id = g.menu_item_id
CROSS JOIN (VALUES
  ('Fried chicken', 80000, 1),
  ('Beef', 50000, 2),
  ('Croaker fish', 90000, 3),
  ('Turkey', 120000, 4)
) AS x(name, price, ord)
WHERE g.name = 'Protein extras' AND m.category = 'Rice & Bowls'
  AND NOT EXISTS (SELECT 1 FROM menu_item_options o WHERE o.group_id = g.id AND o.name = x.name);

INSERT INTO menu_item_option_groups (menu_item_id, name, min_select, max_select, sort_order)
SELECT m.id, 'Sides', 0, 3, 2 FROM menu_items m
WHERE m.category = 'Rice & Bowls'
  AND NOT EXISTS (SELECT 1 FROM menu_item_option_groups g WHERE g.menu_item_id = m.id AND g.name = 'Sides');

INSERT INTO menu_item_options (group_id, name, price_kobo, sort_order)
SELECT g.id, x.name, x.price, x.ord
FROM menu_item_option_groups g
JOIN menu_items m ON m.id = g.menu_item_id
CROSS JOIN (VALUES
  ('Fried plantain', 40000, 1),
  ('Coleslaw', 30000, 2),
  ('Moi moi', 50000, 3),
  ('Extra stew sauce', 20000, 4)
) AS x(name, price, ord)
WHERE g.name = 'Sides' AND m.category = 'Rice & Bowls'
  AND NOT EXISTS (SELECT 1 FROM menu_item_options o WHERE o.group_id = g.id AND o.name = x.name);

-- Swallow & Soup / Native Soups: extra swallow (max 2) + protein (max 3)
INSERT INTO menu_item_option_groups (menu_item_id, name, min_select, max_select, sort_order)
SELECT m.id, 'Extra swallow', 0, 2, 1 FROM menu_items m
WHERE m.category IN ('Swallow & Soup', 'Native Soups')
  AND NOT EXISTS (SELECT 1 FROM menu_item_option_groups g WHERE g.menu_item_id = m.id AND g.name = 'Extra swallow');

INSERT INTO menu_item_options (group_id, name, price_kobo, sort_order)
SELECT g.id, x.name, x.price, x.ord
FROM menu_item_option_groups g
JOIN menu_items m ON m.id = g.menu_item_id
CROSS JOIN (VALUES
  ('Amala', 30000, 1),
  ('Eba', 30000, 2),
  ('Pounded yam', 40000, 3),
  ('Fufu', 30000, 4)
) AS x(name, price, ord)
WHERE g.name = 'Extra swallow' AND m.category IN ('Swallow & Soup', 'Native Soups')
  AND NOT EXISTS (SELECT 1 FROM menu_item_options o WHERE o.group_id = g.id AND o.name = x.name);

INSERT INTO menu_item_option_groups (menu_item_id, name, min_select, max_select, sort_order)
SELECT m.id, 'Protein', 0, 3, 2 FROM menu_items m
WHERE m.category IN ('Swallow & Soup', 'Native Soups')
  AND NOT EXISTS (SELECT 1 FROM menu_item_option_groups g WHERE g.menu_item_id = m.id AND g.name = 'Protein');

INSERT INTO menu_item_options (group_id, name, price_kobo, sort_order)
SELECT g.id, x.name, x.price, x.ord
FROM menu_item_option_groups g
JOIN menu_items m ON m.id = g.menu_item_id
CROSS JOIN (VALUES
  ('Assorted meat', 70000, 1),
  ('Ponmo', 30000, 2),
  ('Stockfish', 60000, 3),
  ('Beef', 50000, 4)
) AS x(name, price, ord)
WHERE g.name = 'Protein' AND m.category IN ('Swallow & Soup', 'Native Soups')
  AND NOT EXISTS (SELECT 1 FROM menu_item_options o WHERE o.group_id = g.id AND o.name = x.name);

-- Suya & Grill / Grill / Bole & Grill: toppings (max 3) + sides (max 2)
INSERT INTO menu_item_option_groups (menu_item_id, name, min_select, max_select, sort_order)
SELECT m.id, 'Toppings', 0, 3, 1 FROM menu_items m
WHERE m.category IN ('Suya & Grill', 'Grill', 'Bole & Grill')
  AND NOT EXISTS (SELECT 1 FROM menu_item_option_groups g WHERE g.menu_item_id = m.id AND g.name = 'Toppings');

INSERT INTO menu_item_options (group_id, name, price_kobo, sort_order)
SELECT g.id, x.name, x.price, x.ord
FROM menu_item_option_groups g
JOIN menu_items m ON m.id = g.menu_item_id
CROSS JOIN (VALUES
  ('Extra yaji', 10000, 1),
  ('Sliced onions', 10000, 2),
  ('Fresh tomatoes', 10000, 3),
  ('Extra pepper', 10000, 4)
) AS x(name, price, ord)
WHERE g.name = 'Toppings' AND m.category IN ('Suya & Grill', 'Grill', 'Bole & Grill')
  AND NOT EXISTS (SELECT 1 FROM menu_item_options o WHERE o.group_id = g.id AND o.name = x.name);

INSERT INTO menu_item_option_groups (menu_item_id, name, min_select, max_select, sort_order)
SELECT m.id, 'Add sides', 0, 2, 2 FROM menu_items m
WHERE m.category IN ('Suya & Grill', 'Grill', 'Bole & Grill')
  AND NOT EXISTS (SELECT 1 FROM menu_item_option_groups g WHERE g.menu_item_id = m.id AND g.name = 'Add sides');

INSERT INTO menu_item_options (group_id, name, price_kobo, sort_order)
SELECT g.id, x.name, x.price, x.ord
FROM menu_item_option_groups g
JOIN menu_items m ON m.id = g.menu_item_id
CROSS JOIN (VALUES
  ('Fried plantain', 40000, 1),
  ('Masa', 30000, 2),
  ('Roast yam', 35000, 3)
) AS x(name, price, ord)
WHERE g.name = 'Add sides' AND m.category IN ('Suya & Grill', 'Grill', 'Bole & Grill')
  AND NOT EXISTS (SELECT 1 FROM menu_item_options o WHERE o.group_id = g.id AND o.name = x.name);

-- Burgers / Shawarma & Wraps: extras (max 3)
INSERT INTO menu_item_option_groups (menu_item_id, name, min_select, max_select, sort_order)
SELECT m.id, 'Extras', 0, 3, 1 FROM menu_items m
WHERE m.category IN ('Burgers', 'Shawarma & Wraps')
  AND NOT EXISTS (SELECT 1 FROM menu_item_option_groups g WHERE g.menu_item_id = m.id AND g.name = 'Extras');

INSERT INTO menu_item_options (group_id, name, price_kobo, sort_order)
SELECT g.id, x.name, x.price, x.ord
FROM menu_item_option_groups g
JOIN menu_items m ON m.id = g.menu_item_id
CROSS JOIN (VALUES
  ('Cheese slice', 30000, 1),
  ('Fried egg', 20000, 2),
  ('Double meat', 80000, 3),
  ('Extra sauce', 15000, 4)
) AS x(name, price, ord)
WHERE g.name = 'Extras' AND m.category IN ('Burgers', 'Shawarma & Wraps')
  AND NOT EXISTS (SELECT 1 FROM menu_item_options o WHERE o.group_id = g.id AND o.name = x.name);

-- Small Chops / Pastries: dips (max 2)
INSERT INTO menu_item_option_groups (menu_item_id, name, min_select, max_select, sort_order)
SELECT m.id, 'Dips', 0, 2, 1 FROM menu_items m
WHERE m.category IN ('Small Chops', 'Pastries')
  AND NOT EXISTS (SELECT 1 FROM menu_item_option_groups g WHERE g.menu_item_id = m.id AND g.name = 'Dips');

INSERT INTO menu_item_options (group_id, name, price_kobo, sort_order)
SELECT g.id, x.name, x.price, x.ord
FROM menu_item_option_groups g
JOIN menu_items m ON m.id = g.menu_item_id
CROSS JOIN (VALUES
  ('Pepper sauce', 20000, 1),
  ('Garlic mayo', 20000, 2),
  ('Ketchup', 10000, 3)
) AS x(name, price, ord)
WHERE g.name = 'Dips' AND m.category IN ('Small Chops', 'Pastries')
  AND NOT EXISTS (SELECT 1 FROM menu_item_options o WHERE o.group_id = g.id AND o.name = x.name);

-- Pepper Soup / Seafood & Grill: protein boost (max 2) + sides (max 2)
INSERT INTO menu_item_option_groups (menu_item_id, name, min_select, max_select, sort_order)
SELECT m.id, 'Protein boost', 0, 2, 1 FROM menu_items m
WHERE m.category IN ('Pepper Soup', 'Seafood & Grill')
  AND NOT EXISTS (SELECT 1 FROM menu_item_option_groups g WHERE g.menu_item_id = m.id AND g.name = 'Protein boost');

INSERT INTO menu_item_options (group_id, name, price_kobo, sort_order)
SELECT g.id, x.name, x.price, x.ord
FROM menu_item_option_groups g
JOIN menu_items m ON m.id = g.menu_item_id
CROSS JOIN (VALUES
  ('Catfish', 120000, 1),
  ('Goat meat', 90000, 2),
  ('Chicken', 80000, 3),
  ('Prawns', 150000, 4)
) AS x(name, price, ord)
WHERE g.name = 'Protein boost' AND m.category IN ('Pepper Soup', 'Seafood & Grill')
  AND NOT EXISTS (SELECT 1 FROM menu_item_options o WHERE o.group_id = g.id AND o.name = x.name);

INSERT INTO menu_item_option_groups (menu_item_id, name, min_select, max_select, sort_order)
SELECT m.id, 'Sides', 0, 2, 2 FROM menu_items m
WHERE m.category IN ('Pepper Soup', 'Seafood & Grill')
  AND NOT EXISTS (SELECT 1 FROM menu_item_option_groups g WHERE g.menu_item_id = m.id AND g.name = 'Sides');

INSERT INTO menu_item_options (group_id, name, price_kobo, sort_order)
SELECT g.id, x.name, x.price, x.ord
FROM menu_item_option_groups g
JOIN menu_items m ON m.id = g.menu_item_id
CROSS JOIN (VALUES
  ('White rice', 40000, 1),
  ('Boiled yam', 40000, 2),
  ('Agidi', 30000, 3)
) AS x(name, price, ord)
WHERE g.name = 'Sides' AND m.category IN ('Pepper Soup', 'Seafood & Grill')
  AND NOT EXISTS (SELECT 1 FROM menu_item_options o WHERE o.group_id = g.id AND o.name = x.name);

COMMIT;
