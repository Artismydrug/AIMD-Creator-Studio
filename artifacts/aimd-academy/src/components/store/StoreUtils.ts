import galleryImg from '@assets/generated_images/gallery-wall.jpg';
import fineArtImg from '@assets/generated_images/workshop-fine-art.jpg';
import flashImg from '@assets/generated_images/workshop-tattoo.jpg';
import spatialImg from '@assets/generated_images/workshop-spatial.jpg';
import logoImg from '@assets/aimd-logo.jpg';

export const AIMD_STORE_URL = 'https://www.artismydrug.org/category/all-products';

type StorefrontProductDetail = {
  imageUrl: string;
  productUrl: string;
  apparelNote?: string;
};

const STOREFRONT_PRODUCT_DETAILS: Record<string, StorefrontProductDetail> = {
  'signature-tee': {
    imageUrl: 'https://static.wixstatic.com/media/71a471_70672f8ac553445a812263ac1f9e39c9~mv2.png/v1/fit/w_500,h_500,q_90/file.png',
    productUrl: 'https://www.artismydrug.org/product-page/aimd-signature-art-is-my-drug-tee-buy-one-donate-one',
    apparelNote: 'Choose your size and available color on the secure AIMD store.',
  },
  'freestyle-original': {
    imageUrl: 'https://static.wixstatic.com/media/71a471_85de300ee81e45088d85dd98b64a0168~mv2.png/v1/fit/w_500,h_500,q_90/file.png',
    productUrl: 'https://www.artismydrug.org/product-page/freestyle-signature-pattern-handcrafted-piece',
  },
  'vision-tee': {
    imageUrl: 'https://static.wixstatic.com/media/71a471_407066533e6443ec8dc71a0cc206bc23~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg',
    productUrl: 'https://www.artismydrug.org/product-page/art-is-my-drug-vision-graphic-tee',
    apparelNote: 'Choose your size and available color on the secure AIMD store.',
  },
  'split-smile-book': {
    imageUrl: 'https://static.wixstatic.com/media/71a471_2440f3b34d724911a18e4e3038f9e613~mv2.jpeg/v1/fit/w_500,h_500,q_90/file.jpg',
    productUrl: 'https://www.artismydrug.org/product-page/split-smile-coloring-book-smile-through-it-all',
  },
};

export const STORE_IMAGES: Record<string, string> = {
  'signature-tee': STOREFRONT_PRODUCT_DETAILS['signature-tee'].imageUrl,
  'vision-tee': STOREFRONT_PRODUCT_DETAILS['vision-tee'].imageUrl,
  'freestyle-original': STOREFRONT_PRODUCT_DETAILS['freestyle-original'].imageUrl,
  'split-smile-book': STOREFRONT_PRODUCT_DETAILS['split-smile-book'].imageUrl,
  'transform-canvas': galleryImg,
  'digital-flash': flashImg,
  'gallery-wall': galleryImg,
  'workshop-fine-art': fineArtImg,
  'workshop-tattoo': flashImg,
  'workshop-spatial': spatialImg,
  'aimd-logo': logoImg,
};

export function getProductImage(imageKey: string): string {
  return STORE_IMAGES[imageKey] || STORE_IMAGES['gallery-wall'];
}

export function getProductStoreUrl(imageKey: string): string {
  return STOREFRONT_PRODUCT_DETAILS[imageKey]?.productUrl ?? AIMD_STORE_URL;
}

export function getApparelNote(imageKey: string): string | undefined {
  return STOREFRONT_PRODUCT_DETAILS[imageKey]?.apparelNote;
}

export function isVerifiedStorefrontProduct(imageKey: string): boolean {
  return imageKey in STOREFRONT_PRODUCT_DETAILS;
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}
