-- ===========================================================================
-- Starter catalogue, inspiration board and assistant knowledge.
-- Safe to re-run: every insert is guarded by ON CONFLICT / NOT EXISTS.
--     psql "$DATABASE_URL" -f migrations/0002_seed_data.sql
-- ===========================================================================

INSERT INTO products (name, slug, category, description, base_price, lead_time, image_url)
VALUES
  ('Classic Cotton Tee', 'classic-cotton-tee', 'apparel',
   'Heavyweight 180gsm cotton, screen printed. The studio workhorse.',
   18000, '3-5 days', NULL),
  ('Premium Hoodie', 'premium-hoodie', 'apparel',
   'Brushed fleece interior, ribbed cuffs, DTF or embroidery.',
   52000, '5-7 days', NULL),
  ('A2 Art Poster', 'a2-art-poster', 'print',
   '200gsm matte stock, giclee inks, colour matched to your file.',
   12000, '2-3 days', NULL),
  ('Vinyl Sticker Sheet', 'vinyl-sticker-sheet', 'print',
   'Die-cut weatherproof vinyl, gloss or matte laminate.',
   6000, '2 days', NULL),
  ('Canvas Tote Bag', 'canvas-tote-bag', 'apparel',
   '12oz natural canvas, reinforced handles, one or two colour print.',
   15000, '4-6 days', NULL),
  ('Business Card Pack', 'business-card-pack', 'print',
   '350gsm silk, 100 cards, optional spot UV on the logo.',
   25000, '3-4 days', NULL)
ON CONFLICT (slug) DO NOTHING;

-- Options for the tee, as an example of how the option table is meant to look.
INSERT INTO product_options (product_id, option_type, option_value, swatch, price_delta, sort_order)
SELECT p.id, v.option_type, v.option_value, v.swatch, v.price_delta, v.sort_order
  FROM products p
  CROSS JOIN (VALUES
      ('size',  'S',      NULL,      0,    1),
      ('size',  'M',      NULL,      0,    2),
      ('size',  'L',      NULL,      0,    3),
      ('size',  'XL',     NULL,      1500, 4),
      ('colour','Black',  'black',   0,    5),
      ('colour','White',  'white',   0,    6),
      ('colour','Sand',   'tan',     0,    7)
  ) AS v(option_type, option_value, swatch, price_delta, sort_order)
 WHERE p.slug = 'classic-cotton-tee'
ON CONFLICT (product_id, option_type, option_value) DO NOTHING;

INSERT INTO inspiration_items (title, source, external_url, image_url, tags)
SELECT * FROM (VALUES
  ('Bold typographic tee layout', 'pinterest',
   'https://www.pinterest.com/', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800',
   'apparel,typography'),
  ('Duotone poster study', 'pinterest',
   'https://www.pinterest.com/', 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800',
   'print,poster,duotone'),
  ('Sticker pack composition', 'pinterest',
   'https://www.pinterest.com/', 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800',
   'print,stickers')
) AS v(title, source, external_url, image_url, tags)
WHERE NOT EXISTS (SELECT 1 FROM inspiration_items);

INSERT INTO knowledge_base_entries (title, content, category)
SELECT * FROM (VALUES
  ('Turnaround times',
   'Posters and stickers ship in 2-3 working days. Screen printed tees and tote bags take 3-5 working days. Hoodies and embroidery take 5-7 working days. Rush work is possible for an extra 30 percent when the press schedule allows; ask before placing the order.',
   'orders'),
  ('Artwork requirements',
   'Send vector artwork (SVG, AI, PDF) whenever possible. Raster files must be at least 300 DPI at final print size, with a transparent background for apparel. The studio checks every file before printing and will contact you if something will not reproduce well.',
   'artwork'),
  ('Payment and deposits',
   'Orders under 50,000 are paid in full up front. Larger orders take a 50 percent deposit to enter production and the balance before collection. The studio marks the payment state on your order, so the status you see is the state the studio has recorded.',
   'payment'),
  ('Order tracking',
   'Every order moves through pending, confirmed, in production, quality check, ready, then delivered. Each change is timestamped on the order timeline. You will also get a WhatsApp message from the studio when the order is ready.',
   'orders'),
  ('Reprints and corrections',
   'If a print does not match the approved artwork, the studio reprints it at no charge. Changes to the artwork after approval are treated as a new order. Colour on fabric can vary slightly from a screen; ask for a sample if exact colour matters.',
   'policy')
) AS v(title, content, category)
WHERE NOT EXISTS (SELECT 1 FROM knowledge_base_entries);
