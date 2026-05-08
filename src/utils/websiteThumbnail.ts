export const getWebsiteThumbnailUrl = (url: string, width = 1200, height = 675) => {
  const normalizedUrl = url.trim();
  if (!normalizedUrl) return '/placeholder.svg';
  return `https://image.thum.io/get/width/${width}/crop/${height}/${normalizedUrl}`;
};