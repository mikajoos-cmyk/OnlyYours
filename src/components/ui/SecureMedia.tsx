import { useState, useEffect } from 'react';
import { storageService } from '../../services/storageService';
import { cn } from '../../lib/utils';
import { Loader2Icon } from 'lucide-react';

interface SecureMediaProps extends React.ImgHTMLAttributes<HTMLImageElement | HTMLVideoElement> {
  path: string;
  type: 'image' | 'video' | 'IMAGE' | 'VIDEO';
  className?: string;
  alt?: string;
  // Video-spezifische Props explizit definieren
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  playsInline?: boolean;
  controls?: boolean;
}

export function SecureMedia({ path, type, className, alt, ...props }: SecureMediaProps) {
  const [src, setSrc] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
        if (!path) {
            setLoading(false);
            return;
        }

        // Lokale Blobs oder volle URLs (z.B. Placeholders) direkt nutzen
        if (path.startsWith('blob:') || path.startsWith('http')) {
            setSrc(path);
            setLoading(false);
            return;
        }

        try {
            const signedUrl = await storageService.getSignedUrl(path);
            if (isMounted && signedUrl) {
                setSrc(signedUrl);
            } else if (isMounted) {
                setError(true);
            }
        } catch (e) {
            console.error("Failed to load secure media", e);
            if (isMounted) setError(true);
        } finally {
            if (isMounted) setLoading(false);
        }
    };
    load();
    return () => { isMounted = false; };
  }, [path]);

  const normalizedType = type.toLowerCase();

  if (loading) {
      return (
        <div className={cn("bg-neutral/20 flex items-center justify-center w-full h-full", className)}>
            <Loader2Icon className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      );
  }

  if (error || !src) {
      return (
        <div className={cn("bg-neutral/20 flex items-center justify-center w-full h-full", className)}>
            <span className="text-xs text-muted-foreground">Medienfehler</span>
        </div>
      );
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