/**
 * Deterministic Unsplash image URLs for seed data.
 * IDs are verified live; avoid picsum (unreliable redirects / 405s).
 */

const PRODUCT_PHOTO_IDS = [
  '1505740420928-5e560c06d30e', // headphones
  '1523275335684-37898b6baf30', // watch
  '1542291026-7eec264c27ff', // sneakers
  '1560343090-f0409e92791a', // product
  '1526170375885-4d8ecf77b99f', // camera
  '1572635196237-14b3f281503f', // sunglasses
  '1585386959984-a4155224a1ad', // perfume
  '1553062407-98eeb64c6a62', // backpack
  '1548036328-c9fa89d128fa', // bag
  '1483985988355-763728e1935b', // fashion
  '1441986300917-64674bd600d8', // store
  '1542291026-7eec264c27ff', // sneakers
  '1591047139829-d91aecb6caea', // jacket
  '1512496015851-a90fb38ba796', // makeup
  '1556228578-0d85b1a4d571', // skincare
  '1571019613454-1cb2f99b2d8b', // fitness
  '1517836357463-d25dfeac3438', // gym
  '1495474472287-4d71bcdd2085', // coffee
  '1546069901-ba9599a7e63c', // food
  '1512820790803-83ca734da794', // books
  '1544947950-fa07a98d237f', // books
  '1566576912321-d58ddd7a6088', // toys
  '1492144534655-ae79c964c9d7', // car
  '1506126613408-eca07ce68773', // wellness
  '1544367567-0f2fcb009e0b', // yoga
  '1555041469-a586c61ea9bc', // sofa
  '1616486338812-3dadae4b4ace', // interior
  '1586023492125-27b2c045efd7', // home
  '1566150905458-1bf1fc113f0d', // handbag
  '1584917865442-de89df76afd3', // purse
];

function unsplash(id: string, w = 800, q = 80): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=${q}`;
}

export function getProductImageUrls(
  _categoryName: string,
  productIndex: number,
  imageCount: number,
): string[] {
  const urls: string[] = [];

  for (let i = 0; i < imageCount; i++) {
    const id = PRODUCT_PHOTO_IDS[(productIndex * 3 + i) % PRODUCT_PHOTO_IDS.length];
    urls.push(unsplash(id));
  }

  return urls;
}

export function getBrandLogo(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff&size=128&bold=true`;
}

export function getBannerImage(index: number): string {
  const ids = [
    '1441986300917-64674bd600d8',
    '1483985988355-763728e1935b',
    '1445205170230-053b83016050',
    '1472851294608-062f824d29cc',
    '1469334031218-e382a71b716b',
  ];
  return unsplash(ids[index % ids.length], 1600);
}

export function getCategoryImage(index: number): string {
  const ids = [
    '1441986300917-64674bd600d8',
    '1483985988355-763728e1935b',
    '1586023492125-27b2c045efd7',
    '1512496015851-a90fb38ba796',
    '1571019613454-1cb2f99b2d8b',
    '1512820790803-83ca734da794',
    '1566576912321-d58ddd7a6088',
    '1492144534655-ae79c964c9d7',
    '1495474472287-4d71bcdd2085',
    '1506126613408-eca07ce68773',
  ];
  return unsplash(ids[index % ids.length], 600);
}
