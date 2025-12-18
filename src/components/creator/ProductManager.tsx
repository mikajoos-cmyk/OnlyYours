// src/components/creator/ProductManager.tsx
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { UploadIcon, Loader2Icon, Trash2Icon } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { storageService } from '../../services/storageService';
import { shopService } from '../../services/shopService';
import { cn } from '../../lib/utils';
import { SecureMedia } from '../ui/SecureMedia';

interface Product {
    id: string;
    title: string;
    description?: string;
    price: number;
    imageUrl: string;
    isActive: boolean;
}

interface ProductManagerProps {
    showOnly?: 'list' | 'form';
}

export default function ProductManager({ showOnly }: ProductManagerProps) {
    const { user } = useAuthStore();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    // Form-State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [isActive, setIsActive] = useState(true);

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            const data = await shopService.getMyProducts();
            setProducts(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (file: File | undefined) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast({ title: 'Ungültiger Dateityp', description: 'Bitte laden Sie nur Bilder hoch.', variant: 'destructive' });
            return;
        }
        setSelectedFile(file);
        if (filePreview) URL.revokeObjectURL(filePreview);
        setFilePreview(URL.createObjectURL(file));
    };

    const clearFile = () => {
        if (filePreview && selectedFile) URL.revokeObjectURL(filePreview);
        setSelectedFile(null);
        setFilePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const resetForm = () => {
        setEditingId(null);
        setTitle('');
        setDescription('');
        setPrice('');
        setIsActive(true);
        clearFile();
    };

    const handleEdit = (product: Product) => {
        if (showOnly === 'list') {
            // Wenn nur Liste angezeigt wird, navigieren wir zum Editor
            // In diesem Fall müssen wir evtl. eine Route für Edit haben oder 
            // den State globaler verwalten. Aber laut User-Request soll 
            // das Erstellungsfeld in der Vault weg.
            // Wir lassen die Edit-Funktion hier erstmal nur zu, wenn das Formular da ist.
            navigate('/post/new');
            return;
        }
        setEditingId(product.id);
        setTitle(product.title);
        setDescription(product.description || '');
        setPrice(product.price.toString());
        setIsActive(product.isActive);
        setFilePreview(product.imageUrl);
        setSelectedFile(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Produkt wirklich löschen?')) return;
        try {
            await shopService.deleteProduct(id);
            toast({ title: 'Gelöscht', description: 'Produkt wurde entfernt.' });
            loadProducts();
        } catch (e: any) {
            toast({ title: 'Fehler', description: e.message, variant: 'destructive' });
        }
    };

    const handleSubmit = async () => {
        if (!title || !price || (!selectedFile && !filePreview)) {
            toast({ title: 'Fehler', description: 'Bitte füllen Sie alle Pflichtfelder aus und laden Sie ein Bild hoch.', variant: 'destructive' });
            return;
        }
        if (!user) return;

        setIsSubmitting(true);
        try {
            let imageUrl = filePreview;
            if (selectedFile) {
                imageUrl = await storageService.uploadMedia(selectedFile, user.id);
            }

            if (editingId) {
                await shopService.updateProduct(editingId, {
                    title,
                    description,
                    price: parseFloat(price),
                    imageUrl: imageUrl || '',
                    isActive
                });
                toast({ title: 'Aktualisiert', description: 'Produkt wurde gespeichert.' });
            } else {
                await shopService.createProduct({
                    title,
                    description,
                    price: parseFloat(price),
                    imageUrl: imageUrl || ''
                });
                toast({ title: 'Erfolgreich', description: 'Produkt wurde erstellt.' });
            }

            resetForm();
            loadProducts();

            // Wenn wir im Editor-Modus sind, können wir zurück zur Vault
            if (showOnly === 'form') {
                navigate('/vault');
            }
        } catch (e: any) {
            console.error(e);
            toast({ title: 'Fehler', description: e.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-12">
            {showOnly !== 'list' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Card className="bg-card border-border">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-foreground">
                                {editingId ? 'Produkt bearbeiten' : 'Neues Produktbild'}
                            </CardTitle>
                            {filePreview && (
                                <Button variant="ghost" size="icon" onClick={clearFile} disabled={isSubmitting}>
                                    <Trash2Icon className="w-5 h-5 text-destructive" />
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent>
                            {filePreview ? (
                                <div className="w-full aspect-square rounded-lg overflow-hidden bg-background">
                                    <SecureMedia path={filePreview} type="image" alt="Vorschau" className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileChange(e.dataTransfer.files[0]); }}
                                    className={cn(
                                        "border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-secondary transition-colors cursor-pointer",
                                        dragOver && "border-secondary bg-secondary/10"
                                    )}
                                >
                                    <UploadIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                    <p>Bild hochladen</p>
                                    <input type="file" ref={fileInputRef} onChange={(e) => handleFileChange(e.target.files?.[0])} accept="image/*" className="hidden" />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardTitle>{editingId ? 'Details anpassen' : 'Produktdetails'}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Titel</Label>
                                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Produkt Name" disabled={isSubmitting} />
                            </div>
                            <div className="space-y-2">
                                <Label>Beschreibung</Label>
                                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Was verkaufst du?" className="min-h-32" disabled={isSubmitting} />
                            </div>
                            <div className="space-y-2">
                                <Label>Preis (€)</Label>
                                <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" disabled={isSubmitting} />
                            </div>
                            {editingId && (
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} id="is_active" />
                                    <Label htmlFor="is_active">Produkt aktiv (sichtbar im Shop)</Label>
                                </div>
                            )}
                            <div className="flex gap-2">
                                <Button onClick={handleSubmit} className="flex-1 bg-secondary text-secondary-foreground" disabled={isSubmitting || (!selectedFile && !filePreview)}>
                                    {isSubmitting ? <Loader2Icon className="animate-spin mr-2" /> : (editingId ? 'Speichern' : 'Produkt erstellen')}
                                </Button>
                                {editingId && (
                                    <Button variant="ghost" onClick={resetForm} disabled={isSubmitting}>Abbrechen</Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {showOnly !== 'form' && (
                <div className="space-y-4">
                    <h2 className="text-2xl font-serif text-foreground">Deine Produkte</h2>
                    {loading ? (
                        <p>Lade Produkte...</p>
                    ) : products.length === 0 ? (
                        <p className="text-muted-foreground">Du hast noch keine Produkte erstellt.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {products.map(p => (
                                <Card key={p.id} className={cn("bg-card border-border overflow-hidden", !p.isActive && "opacity-60")}>
                                    <div className="aspect-video relative bg-neutral">
                                        <SecureMedia path={p.imageUrl} type="image" className="w-full h-full object-cover" />
                                        {!p.isActive && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                                <span className="text-white font-bold px-2 py-1 bg-black/60 rounded">Inaktiv</span>
                                            </div>
                                        )}
                                    </div>
                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="font-bold">{p.title}</h3>
                                                <p className="text-secondary font-serif">{p.price.toFixed(2)}€</p>
                                            </div>
                                            <div className="flex gap-1">
                                                {showOnly !== 'list' && (
                                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(p)}>
                                                        <UploadIcon className="w-4 h-4" />
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="text-destructive">
                                                    <Trash2Icon className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

