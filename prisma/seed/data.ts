export const FIRST_NAMES = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
];

export const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
];

export const CATEGORIES = [
  { name: 'Electronics', description: 'Phones, laptops, gadgets and smart devices', icon: 'cpu' },
  { name: 'Fashion', description: 'Clothing, shoes and accessories for every style', icon: 'shirt' },
  { name: 'Home & Living', description: 'Furniture, decor and essentials for your home', icon: 'home' },
  { name: 'Beauty & Personal Care', description: 'Skincare, makeup and wellness products', icon: 'sparkles' },
  { name: 'Sports & Outdoors', description: 'Gear for fitness, hiking and outdoor adventure', icon: 'activity' },
  { name: 'Books & Media', description: 'Books, magazines and entertainment media', icon: 'book' },
  { name: 'Toys & Games', description: 'Toys, board games and playsets for all ages', icon: 'puzzle' },
  { name: 'Automotive', description: 'Car accessories, tools and maintenance products', icon: 'car' },
  { name: 'Grocery & Gourmet', description: 'Pantry staples, snacks and specialty foods', icon: 'shopping-bag' },
  { name: 'Health & Wellness', description: 'Supplements, medical supplies and wellness tools', icon: 'heart' },
];

export const BRANDS = [
  { name: 'AetherTech', website: 'https://aethertech.example.com', description: 'Premium consumer electronics' },
  { name: 'NovaWear', website: 'https://novawear.example.com', description: 'Modern lifestyle apparel' },
  { name: 'LumenHome', website: 'https://lumenhome.example.com', description: 'Contemporary home furnishings' },
  { name: 'VelvetGlow', website: 'https://velvetglow.example.com', description: 'Clean beauty essentials' },
  { name: 'PeakForge', website: 'https://peakforge.example.com', description: 'Performance sports gear' },
  { name: 'PageCraft', website: 'https://pagecraft.example.com', description: 'Curated publishing house' },
  { name: 'PlayNest', website: 'https://playnest.example.com', description: 'Creative toys and games' },
  { name: 'DriveAxis', website: 'https://driveaxis.example.com', description: 'Automotive lifestyle products' },
  { name: 'HarvestLane', website: 'https://harvestlane.example.com', description: 'Artisan gourmet foods' },
  { name: 'VitalCore', website: 'https://vitalcore.example.com', description: 'Science-backed wellness' },
  { name: 'OrbitAudio', website: 'https://orbitaudio.example.com', description: 'Immersive audio systems' },
  { name: 'SilkThread', website: 'https://silkthread.example.com', description: 'Luxury fabric fashion' },
  { name: 'CedarWorks', website: 'https://cedarworks.example.com', description: 'Handcrafted wood furniture' },
  { name: 'AquaPure', website: 'https://aquapure.example.com', description: 'Hydration and skincare' },
  { name: 'TrailBound', website: 'https://trailbound.example.com', description: 'Outdoor expedition gear' },
];

export const PRODUCT_PRICE_RANGES: Record<string, [number, number]> = {
  Electronics: [49, 899],
  Fashion: [28, 220],
  'Home & Living': [18, 349],
  'Beauty & Personal Care': [12, 78],
  'Sports & Outdoors': [19, 189],
  'Books & Media': [12, 42],
  'Toys & Games': [15, 89],
  Automotive: [14, 149],
  'Grocery & Gourmet': [6, 48],
  'Health & Wellness': [14, 64],
};

export const PRODUCT_TEMPLATES: Record<string, string[]> = {
  Electronics: [
    'Wireless Noise-Cancelling Headphones', 'Ultra Slim Laptop 14"', 'Smartwatch Pro Series',
    '4K Action Camera', 'Portable Bluetooth Speaker', 'USB-C Hub Multiport', 'Mechanical Keyboard RGB',
    'Wireless Charging Pad', 'True Wireless Earbuds', 'Gaming Mouse Precision',
  ],
  Fashion: [
    'Merino Wool Crewneck', 'Slim Fit Chino Pants', 'Leather Crossbody Bag', 'Canvas Sneakers Classic',
    'Cashmere Scarf', 'Denim Jacket Vintage Wash', 'Silk Blouse Everyday', 'Performance Joggers',
    'Wool Overcoat', 'Minimalist Leather Belt',
  ],
  'Home & Living': [
    'Ceramic Table Lamp', 'Organic Cotton Bedding Set', 'Modular Bookshelf', 'Scented Soy Candle Trio',
    'Memory Foam Pillow', 'Acacia Cutting Board', 'Linen Throw Blanket', 'Steel Cookware Set',
    'Wall Mirror Round', 'Desk Organizer Bamboo',
  ],
  'Beauty & Personal Care': [
    'Vitamin C Brightening Serum', 'Hydrating Face Moisturizer', 'Matte Lip Color Set',
    'Gentle Foaming Cleanser', 'SPF 50 Daily Sunscreen', 'Nourishing Hair Oil',
    'Clay Detox Mask', 'Rose Water Toner', 'Eyeshadow Palette Nude', 'Hand Cream Shea Butter',
  ],
  'Sports & Outdoors': [
    'Yoga Mat Extra Thick', 'Adjustable Dumbbell Pair', 'Insulated Hiking Bottle',
    'Trail Running Shoes', 'Resistance Band Set', 'Camping Lantern LED',
    'Fitness Tracker Band', 'Foam Roller Firm', 'Bike Repair Kit', 'Waterproof Daypack 25L',
  ],
  'Books & Media': [
    'The Architecture of Habits', 'Coastal Fiction Anthology', 'Modern Photography Guide',
    'Startup Playbook Revised', 'Mindful Living Journal', 'World Cuisine Cookbook',
    'Sci-Fi Odyssey Vol. 1', 'Design Systems Handbook', 'Children Story Collection', 'Vinyl Classics Remastered',
  ],
  'Toys & Games': [
    'Strategy Board Game Set', 'Building Blocks Deluxe Kit', 'Remote Control Race Car',
    'Puzzle 1000 Pieces Landscape', 'Plush Companion Bear', 'STEM Robot Kit Junior',
    'Card Game Family Edition', 'Wooden Train Set', 'Art Supplies Starter Box', 'Outdoor Badminton Set',
  ],
  Automotive: [
    'Car Phone Mount Magnetic', 'Premium Floor Mat Set', 'LED Headlight Bulbs',
    'Portable Jump Starter', 'Tire Pressure Gauge Digital', 'Trunk Organizer Collapsible',
    'Car Vacuum Cordless', 'Steering Wheel Cover Leather', 'Dash Cam Full HD', 'Microfiber Care Kit',
  ],
  'Grocery & Gourmet': [
    'Single Origin Coffee Beans', 'Artisan Dark Chocolate Bar', 'Extra Virgin Olive Oil',
    'Organic Honey Wildflower', 'Spice Collection Gift Box', 'Sourdough Starter Kit',
    'Matcha Green Tea Powder', 'Gourmet Pasta Trio', 'Smoked Sea Salt Flakes', 'Trail Mix Premium Blend',
  ],
  'Health & Wellness': [
    'Omega-3 Fish Oil Softgels', 'Vitamin D3 Daily Support', 'Protein Powder Vanilla',
    'Sleep Support Herbal Blend', 'Electrolyte Hydration Mix', 'Magnesium Complex Capsules',
    'Collagen Peptides Unflavored', 'Probiotic Daily Capsules', 'Turmeric Curcumin Formula', 'Multivitamin Complete',
  ],
};

export const REVIEW_COMMENTS = [
  'Excellent quality and arrived quickly. Highly recommended.',
  'Exactly as described. Great value for the price.',
  'Solid product overall. Packaging was neat and secure.',
  'I use this daily and it has held up very well.',
  'Good build quality. Would buy again without hesitation.',
  'Looks premium and performs better than expected.',
  'Comfortable, stylish, and practical for everyday use.',
  'Customer service was helpful when I had a sizing question.',
  'A bit pricey but the quality justifies it.',
  'Perfect gift item. Recipient loved it.',
  'The details and finish feel thoughtfully designed.',
  'Works as advertised. Setup was straightforward.',
  'Color matches the photos accurately.',
  'Durable materials and attention to small details.',
  'Exceeded my expectations for this price range.',
];

export const CITIES = [
  { city: 'New York', state: 'NY', postalCode: '10001' },
  { city: 'Los Angeles', state: 'CA', postalCode: '90001' },
  { city: 'Chicago', state: 'IL', postalCode: '60601' },
  { city: 'Houston', state: 'TX', postalCode: '77001' },
  { city: 'Phoenix', state: 'AZ', postalCode: '85001' },
  { city: 'Seattle', state: 'WA', postalCode: '98101' },
  { city: 'Miami', state: 'FL', postalCode: '33101' },
  { city: 'Denver', state: 'CO', postalCode: '80201' },
  { city: 'Boston', state: 'MA', postalCode: '02101' },
  { city: 'Austin', state: 'TX', postalCode: '73301' },
];

export const COUPON_DEFS = [
  { code: 'WELCOME10', type: 'PERCENTAGE', value: 10, min: 25 },
  { code: 'SAVE20', type: 'PERCENTAGE', value: 20, min: 75, max: 40 },
  { code: 'FLAT15', type: 'FIXED', value: 15, min: 50 },
  { code: 'FLAT25', type: 'FIXED', value: 25, min: 100 },
  { code: 'SUMMER25', type: 'PERCENTAGE', value: 25, min: 60, max: 50 },
  { code: 'FREESHIP', type: 'FIXED', value: 9.99, min: 0 },
  { code: 'VIP30', type: 'PERCENTAGE', value: 30, min: 150, max: 75 },
  { code: 'NEWUSER5', type: 'FIXED', value: 5, min: 20 },
  { code: 'BUNDLE12', type: 'PERCENTAGE', value: 12, min: 40 },
  { code: 'FLASH50', type: 'PERCENTAGE', value: 50, min: 30, max: 30 },
  { code: 'LOYALTY15', type: 'PERCENTAGE', value: 15, min: 50 },
  { code: 'WEEKEND10', type: 'PERCENTAGE', value: 10, min: 35 },
  { code: 'HOLIDAY20', type: 'PERCENTAGE', value: 20, min: 80, max: 45 },
  { code: 'CLEARANCE35', type: 'PERCENTAGE', value: 35, min: 45, max: 60 },
  { code: 'APPONLY8', type: 'PERCENTAGE', value: 8, min: 25 },
  { code: 'REFER20', type: 'FIXED', value: 20, min: 70 },
  { code: 'STUDENT15', type: 'PERCENTAGE', value: 15, min: 30 },
  { code: 'FIRSTORDER', type: 'FIXED', value: 12, min: 40 },
  { code: 'MEGA40', type: 'PERCENTAGE', value: 40, min: 200, max: 100 },
  { code: 'SPRING18', type: 'PERCENTAGE', value: 18, min: 55 },
];

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

export function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
