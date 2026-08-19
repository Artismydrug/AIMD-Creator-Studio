import galleryImg from '@assets/generated_images/gallery-wall.jpg';
import fineArtImg from '@assets/generated_images/workshop-fine-art.jpg';
import flashImg from '@assets/generated_images/workshop-tattoo.jpg';
import spatialImg from '@assets/generated_images/workshop-spatial.jpg';
import logoImg from '@assets/aimd-logo.jpg';

export const STORE_IMAGES: Record<string, string> = {
  'signature-tee': spatialImg,
  'vision-tee': flashImg,
  'freestyle-original': fineArtImg,
  'split-smile-book': flashImg,
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

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}
