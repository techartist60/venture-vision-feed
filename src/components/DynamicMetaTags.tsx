import { useEffect } from 'react';

interface DynamicMetaTagsProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}

/**
 * Component to dynamically update OG meta tags for shared links
 * Note: For full SSR OG support, you'd need server-side rendering
 * This is a client-side fallback for SPA
 */
export function DynamicMetaTags({
  title,
  description,
  image,
  url,
  type = 'article'
}: DynamicMetaTagsProps) {
  useEffect(() => {
    // Update document title
    if (title) {
      document.title = `${title} - Idestrim`;
    }

    // Helper to update or create meta tags
    const updateMetaTag = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    const updateNameMetaTag = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Update OG tags
    if (title) {
      updateMetaTag('og:title', title);
      updateNameMetaTag('twitter:title', title);
    }

    if (description) {
      updateMetaTag('og:description', description);
      updateNameMetaTag('twitter:description', description);
      updateNameMetaTag('description', description);
    }

    if (image) {
      updateMetaTag('og:image', image);
      updateNameMetaTag('twitter:image', image);
    }

    if (url) {
      updateMetaTag('og:url', url);
    }

    if (type) {
      updateMetaTag('og:type', type);
    }

    // Set Twitter card type
    updateNameMetaTag('twitter:card', 'summary_large_image');

    // Cleanup on unmount - restore defaults
    return () => {
      document.title = 'Idestrim - Share Your Innovation';
      updateMetaTag('og:title', 'Idestrim - Share Your Innovation');
      updateMetaTag('og:description', 'Discover and share innovative ideas through videos and photos. Join the creative community building the future.');
      updateMetaTag('og:image', `${window.location.origin}/idestrim-og-logo.png`);
    };
  }, [title, description, image, url, type]);

  return null;
}

export default DynamicMetaTags;
