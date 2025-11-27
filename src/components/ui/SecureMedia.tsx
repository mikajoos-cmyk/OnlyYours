import { useState, useEffect } from 'react';
import { storageService } from '../../services/storageService';
import { cn } from '../../lib/utils';

interface SecureMediaProps extends React.ImgHTMLAttributes<HTMLImageElement | HTMLVideoElement> {
  path: string;
  type: 'image' | 'video' | 'IMAGE' | 'VIDEO';
  className?: string;
  alt?: string;
  // Für Videos:
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  playsInline?: boolean;
  controls?: boolean;
}

export function SecureMedia({ path, type, className, alt, ...props }: SecureMediaProps) {
  const [src, setSrc] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
        if (!path) return;
        // Falls es schon eine Blob-URL (lokal) oder volle HTTP-URL ist
        if (path.startsWith('blob:') || path.startsWith('http')) {
            setSrc(path);
            setLoading(false);
            return;
        }

        try {
            const signedUrl = await storageService.getSignedUrl(path);
            if (isMounted && signedUrl) {
                setSrc(signedUrl);
            }
        } catch (e) {
            console.error("Failed to load secure media", e);
        } finally {
            if (isMounted) setLoading(false);
        }
    };
    load();
    return () => { isMounted = false; };
  }, [path]);

  const normalizedType = type.toLowerCase();

  if (loading) {
      return <div className={cn("bg-neutral/20 animate-pulse w-full h-full", className)} />;
  }

  if (normalizedType === 'video') {
      return (
          // @ts-ignore
          <video
              src={src}
              className={cn("object-cover", className)}
              {...props}
          />
      );
  }

  return (
      <img
          src={src}
          alt={alt || ""}
          className={cn("object-cover", className)}
          {...props}
      />
  );
}