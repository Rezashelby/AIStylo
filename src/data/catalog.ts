import type { Product } from '@/types'
import { productImage } from './imagery'

type Seed = Omit<Product, 'image' | 'id'> & { id?: string }

const seeds: Seed[] = [
  // ── Tops ────────────────────────────────────────────────────────────────
  { name: 'Silk Charmeuse Blouse', brand: 'Maison Verre', price: 268, slot: 'top', formality: 4,
    seasons: ['spring','summer','autumn'], occasions: ['work','evening'], color: '#E8DCCB', colorName: 'Bone',
    tags: ['silk','fluid','drape','minimal','tucked'], material: 'Silk charmeuse',
    description: 'A bias-cut blouse in weighty silk that catches light without shine. Cut long to tuck cleanly.' },
  { name: 'Fine-Gauge Merino Crew', brand: 'Atelier Nord', price: 195, slot: 'top', formality: 3,
    seasons: ['autumn','winter','spring'], occasions: ['work','weekend','travel'], color: '#2E3440', colorName: 'Ink',
    tags: ['merino','knit','layerable','soft','essential'], material: 'Extra-fine merino',
    description: 'Knitted from 19.5-micron merino to sit close without weight. The layer everything else goes over.' },
  { name: 'Poplin Oversized Shirt', brand: 'Studio Lin', price: 165, slot: 'top', formality: 3,
    seasons: ['spring','summer'], occasions: ['work','weekend','travel'], color: '#FAFAF7', colorName: 'Optic White',
    tags: ['cotton','crisp','relaxed','classic','tailored'], material: 'Compact cotton poplin',
    description: 'Dropped shoulder, generous body, mother-of-pearl buttons. Crisp enough to hold a collar all day.' },
  { name: 'Ribbed Cashmere Tank', brand: 'Maison Verre', price: 210, slot: 'top', formality: 2,
    seasons: ['summer','spring'], occasions: ['weekend','evening'], color: '#C4A986', colorName: 'Camel',
    tags: ['cashmere','rib','fitted','luxe'], material: 'Cashmere rib',
    description: 'A close-fitting rib tank in two-ply cashmere. Reads as underpinning or as the whole point.' },
  { name: 'Striped Breton Tee', brand: 'Côte Atelier', price: 88, slot: 'top', formality: 2,
    seasons: ['spring','summer','autumn'], occasions: ['weekend','travel'], color: '#1B3A5C', colorName: 'Navy',
    tags: ['cotton','stripe','casual','nautical','easy'], material: 'Heavy jersey',
    description: 'Woven in Brittany on old-gauge machines. Heavy enough to keep its shape through a decade of washes.' },
  { name: 'Draped Jersey Turtleneck', brand: 'Atelier Nord', price: 145, slot: 'top', formality: 3,
    seasons: ['autumn','winter'], occasions: ['work','evening','travel'], color: '#3B322C', colorName: 'Espresso',
    tags: ['jersey','turtleneck','sleek','layerable'], material: 'Viscose jersey',
    description: 'A high neck that falls in soft folds rather than gripping. Cut for a long, unbroken line.' },

  // ── Bottoms ─────────────────────────────────────────────────────────────
  { name: 'Wide-Leg Wool Trouser', brand: 'Atelier Nord', price: 325, slot: 'bottom', formality: 4,
    seasons: ['autumn','winter','spring'], occasions: ['work','formal','evening'], color: '#36393F', colorName: 'Charcoal',
    tags: ['wool','tailored','pleated','high-waist','fluid'], material: 'Italian wool crepe',
    description: 'Double-pleated and cut long to break over the shoe. Wool crepe keeps the leg moving.' },
  { name: 'Straight Selvedge Denim', brand: 'Côte Atelier', price: 198, slot: 'bottom', formality: 2,
    seasons: ['autumn','winter','spring'], occasions: ['weekend','travel'], color: '#4A6076', colorName: 'Mid Indigo',
    tags: ['denim','selvedge','straight','rigid','casual'], material: '13oz Japanese selvedge',
    description: 'Rigid denim from a Kojima mill that fades to your own map of wear. Straight through the leg.' },
  { name: 'Pleated Midi Skirt', brand: 'Maison Verre', price: 245, slot: 'bottom', formality: 4,
    seasons: ['spring','autumn'], occasions: ['work','evening'], color: '#6B7A5E', colorName: 'Sage',
    tags: ['pleat','midi','fluid','movement','elegant'], material: 'Washed satin',
    description: 'Knife pleats set into a fitted waistband, falling to mid-calf. Moves a half-beat behind you.' },
  { name: 'Tailored Cigarette Pant', brand: 'Studio Lin', price: 285, slot: 'bottom', formality: 4,
    seasons: ['autumn','winter','spring'], occasions: ['work','formal'], color: '#22242A', colorName: 'Black',
    tags: ['tailored','slim','cropped','sharp','minimal'], material: 'Stretch wool suiting',
    description: 'A narrow leg cropped just at the ankle. Enough stretch to sit in all day without memory.' },
  { name: 'Linen Drawstring Trouser', brand: 'Côte Atelier', price: 158, slot: 'bottom', formality: 2,
    seasons: ['summer','spring'], occasions: ['weekend','travel'], color: '#D8CBB4', colorName: 'Sand',
    tags: ['linen','relaxed','breathable','summer','easy'], material: 'Washed European linen',
    description: 'Garment-washed until the linen goes soft. A drawstring waist that stays put.' },

  // ── Dresses ─────────────────────────────────────────────────────────────
  { name: 'Bias-Cut Slip Dress', brand: 'Maison Verre', price: 395, slot: 'dress', formality: 4,
    seasons: ['summer','spring','autumn'], occasions: ['evening','formal'], color: '#7D2E3F', colorName: 'Oxblood',
    tags: ['silk','bias','slip','evening','fluid'], material: 'Sandwashed silk',
    description: 'Cut on the true bias so it traces rather than clings. Adjustable straps, no closures.' },
  { name: 'Poplin Shirt Dress', brand: 'Studio Lin', price: 275, slot: 'dress', formality: 3,
    seasons: ['spring','summer'], occasions: ['work','weekend','travel'], color: '#F2EFE8', colorName: 'Chalk',
    tags: ['cotton','shirtdress','belted','versatile','crisp'], material: 'Cotton poplin',
    description: 'A shirt taken to mid-calf with a self-belt. Wear it closed, or open over everything.' },
  { name: 'Knitted Column Dress', brand: 'Atelier Nord', price: 340, slot: 'dress', formality: 4,
    seasons: ['autumn','winter'], occasions: ['work','evening'], color: '#3B322C', colorName: 'Espresso',
    tags: ['knit','column','long','sleek','warm'], material: 'Merino-silk blend',
    description: 'A single unbroken column of fine knit, weighted at the hem so it hangs true.' },

  // ── Outerwear ───────────────────────────────────────────────────────────
  { name: 'Double-Breasted Wool Coat', brand: 'Atelier Nord', price: 745, slot: 'outerwear', formality: 4,
    seasons: ['autumn','winter'], occasions: ['work','formal','evening'], color: '#3E3226', colorName: 'Chocolate',
    tags: ['wool','coat','structured','tailored','warm'], material: 'Double-faced wool cashmere',
    description: 'Double-faced cloth means no lining and no bulk — just two finished sides and a clean edge.' },
  { name: 'Relaxed Trench', brand: 'Studio Lin', price: 585, slot: 'outerwear', formality: 3,
    seasons: ['spring','autumn'], occasions: ['work','travel','weekend'], color: '#C7B291', colorName: 'Stone',
    tags: ['trench','cotton','classic','belted','rain'], material: 'Waxed cotton gabardine',
    description: 'The classic redrawn with a dropped shoulder and a longer line. Lightly waxed to shed rain.' },
  { name: 'Cropped Leather Jacket', brand: 'Côte Atelier', price: 890, slot: 'outerwear', formality: 3,
    seasons: ['spring','autumn'], occasions: ['evening','weekend'], color: '#2A2422', colorName: 'Black',
    tags: ['leather','moto','cropped','edge','structured'], material: 'Lambskin',
    description: 'Lambskin tanned in Tuscany, cut short and close. Softens into shape within a season.' },
  { name: 'Boiled Wool Cardigan', brand: 'Maison Verre', price: 385, slot: 'outerwear', formality: 3,
    seasons: ['autumn','winter','spring'], occasions: ['work','weekend','travel'], color: '#8A8377', colorName: 'Fog',
    tags: ['wool','cardigan','cocoon','soft','layer'], material: 'Boiled wool',
    description: 'Boiled until dense enough to stand as a jacket, with the give of a cardigan.' },

  // ── Shoes ───────────────────────────────────────────────────────────────
  { name: 'Leather Loafer', brand: 'Côte Atelier', price: 395, slot: 'shoes', formality: 3,
    seasons: ['spring','autumn','winter'], occasions: ['work','weekend','travel'], color: '#3A2C22', colorName: 'Walnut',
    tags: ['leather','loafer','flat','classic','polished'], material: 'Box calf',
    description: 'Blake-stitched so it stays slim underfoot. Box calf that takes a shine and keeps it.' },
  { name: 'Sculpted Heel Pump', brand: 'Maison Verre', price: 465, slot: 'shoes', formality: 5,
    seasons: ['spring','summer','autumn','winter'], occasions: ['formal','evening','work'], color: '#22242A', colorName: 'Black',
    tags: ['heel','pump','evening','elegant','pointed'], material: 'Nappa leather',
    description: 'A 70mm heel set forward to carry weight properly. Pointed, but not punishingly so.' },
  { name: 'Minimal Leather Sneaker', brand: 'Studio Lin', price: 285, slot: 'shoes', formality: 2,
    seasons: ['spring','summer','autumn'], occasions: ['weekend','travel','active'], color: '#F0EDE6', colorName: 'Off-White',
    tags: ['sneaker','leather','clean','casual','everyday'], material: 'Full-grain leather',
    description: 'One piece of full-grain over a cupsole, no branding. Made to be worn to nothing.' },
  { name: 'Ankle Boot', brand: 'Atelier Nord', price: 520, slot: 'shoes', formality: 4,
    seasons: ['autumn','winter'], occasions: ['work','evening','weekend'], color: '#2A2422', colorName: 'Black',
    tags: ['boot','ankle','leather','block-heel','sturdy'], material: 'Calf leather',
    description: 'A 50mm block heel and a clean shaft that sits just above the ankle bone.' },

  // ── Bags ────────────────────────────────────────────────────────────────
  { name: 'Structured Top-Handle', brand: 'Maison Verre', price: 890, slot: 'bag', formality: 4,
    seasons: ['spring','summer','autumn','winter'], occasions: ['work','formal','evening'], color: '#6B4A32', colorName: 'Cognac',
    tags: ['leather','structured','top-handle','polished','work'], material: 'Saffiano leather',
    description: 'Holds its shape empty. Fits a 13-inch laptop without looking like it was designed to.' },
  { name: 'Soft Leather Tote', brand: 'Côte Atelier', price: 625, slot: 'bag', formality: 3,
    seasons: ['spring','summer','autumn','winter'], occasions: ['work','travel','weekend'], color: '#3A2C22', colorName: 'Walnut',
    tags: ['leather','tote','slouch','roomy','everyday'], material: 'Vegetable-tanned leather',
    description: 'Unlined and unstructured, so it slumps properly. Vegetable-tanned to darken with use.' },
  { name: 'Evening Clutch', brand: 'Studio Lin', price: 340, slot: 'bag', formality: 5,
    seasons: ['spring','summer','autumn','winter'], occasions: ['evening','formal'], color: '#22242A', colorName: 'Black',
    tags: ['clutch','evening','compact','sleek'], material: 'Satin-finish leather',
    description: 'Phone, card case, lipstick. A concealed strap for when your hands are needed.' },

  // ── Accessories ─────────────────────────────────────────────────────────
  { name: 'Cashmere Scarf', brand: 'Atelier Nord', price: 225, slot: 'accessory', formality: 3,
    seasons: ['autumn','winter'], occasions: ['work','travel','weekend'], color: '#9C6B52', colorName: 'Rust',
    tags: ['cashmere','scarf','warm','soft','wrap'], material: 'Mongolian cashmere',
    description: 'Woven wide enough to double as a wrap on a plane. Brushed for loft, not fuzz.' },
  { name: 'Gold Signet Ring', brand: 'Maison Verre', price: 480, slot: 'accessory', formality: 4,
    seasons: ['spring','summer','autumn','winter'], occasions: ['work','evening','formal'], color: '#C9A227', colorName: 'Gold',
    tags: ['gold','ring','minimal','jewelry','signet'], material: '14k solid gold',
    description: 'Solid, not plated, with a face left blank. Weighted so you notice it.' },
  { name: 'Leather Belt', brand: 'Côte Atelier', price: 165, slot: 'accessory', formality: 3,
    seasons: ['spring','summer','autumn','winter'], occasions: ['work','weekend'], color: '#3A2C22', colorName: 'Walnut',
    tags: ['leather','belt','classic','brass','waist'], material: 'Bridle leather',
    description: 'A single thickness of bridle leather with a solid brass buckle. No stitching to fail.' },
  { name: 'Oversized Sunglasses', brand: 'Studio Lin', price: 275, slot: 'accessory', formality: 3,
    seasons: ['spring','summer'], occasions: ['travel','weekend','evening'], color: '#4A403A', colorName: 'Tortoise',
    tags: ['sunglasses','acetate','oversized','summer'], material: 'Italian acetate',
    description: 'Hand-polished acetate in a wide square. Lenses cut for actual glare, not just looks.' },
]

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export const catalog: Product[] = seeds.map((s, i) => ({
  ...s,
  id: s.id ?? slug(`${s.brand}-${s.name}`),
  image: productImage(s.slot, s.color, i),
}))

export const byId = (id: string) => catalog.find((p) => p.id === id)

export const brands = [...new Set(catalog.map((p) => p.brand))].sort()
