/** Browser-specific preparation: decode fully, then crop; never flatten alpha onto black. */
export async function prepareWebStudioPhoto(
  uri: string,
  cropFor: (width: number, height: number) => { originX: number; originY: number; width: number; height: number },
  resizeFor: (width: number, height: number) => { width: number; height: number } | null,
): Promise<Blob> {
  const response = await fetch(uri);
  if (!response.ok) throw new Error('Could not read this photo. Choose it again.');
  const original = await response.blob();
  const objectUrl = URL.createObjectURL(original);
  try {
    const image = new globalThis.Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('This photo could not be decoded. Try PNG or JPEG.'));
      image.src = objectUrl;
    });
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('This photo has no readable dimensions.');
    const crop = cropFor(image.naturalWidth, image.naturalHeight);
    const size = resizeFor(crop.width, crop.height) ?? crop;
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Your browser could not prepare this photo.');
    context.drawImage(image, crop.originX, crop.originY, crop.width, crop.height, 0, 0, size.width, size.height);
    // PNG preserves transparent artwork even if the picker supplied the wrong MIME type.
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      blob => blob?.size ? resolve(blob) : reject(new Error('Photo preparation failed. Your draft is still here.')),
      'image/png',
    ));
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
