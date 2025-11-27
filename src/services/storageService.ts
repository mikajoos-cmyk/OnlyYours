import { supabase } from '../lib/supabase';

export class StorageService {
  private bucketName = 'media';

  async uploadMedia(file: File, userId: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;
    if (!data) throw new Error('Upload failed');

    // WICHTIG: Wir geben nur den Pfad zurück, keine öffentliche URL mehr!
    return data.path;
  }

  async deleteMedia(filePath: string) {
    const path = this.extractPathFromUrl(filePath);
    const { error } = await supabase.storage
      .from(this.bucketName)
      .remove([path]);

    if (error) throw error;
  }

  // NEU: Generiert einen signierten Link, der nur 1 Stunde gültig ist
  async getSignedUrl(filePath: string): Promise<string | null> {
    if (!filePath) return null;
    const path = this.extractPathFromUrl(filePath);

    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .createSignedUrl(path, 3600);

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }
    return data.signedUrl;
  }

  private extractPathFromUrl(url: string): string {
    if (!url.startsWith('http')) return url;
    if (url.includes(`/${this.bucketName}/`)) {
        const urlParts = url.split(`/${this.bucketName}/`);
        return urlParts[urlParts.length - 1];
    }
    return url;
  }

  async generateThumbnail(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      img.onload = () => {
        const maxWidth = 400; const maxHeight = 400;
        let width = img.width; let height = img.height;
        if (width > height) { if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; } }
        else { if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; } }
        canvas.width = width; canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(new File([blob], `thumb_${file.name}`, { type: 'image/jpeg' }));
          else reject(new Error('Failed to create thumbnail'));
        }, 'image/jpeg', 0.8);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }
}

export const storageService = new StorageService();