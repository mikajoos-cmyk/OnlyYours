import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { userService, UserProfile } from '../../services/userService';
import { shopService, Product } from '../../services/shopService';
import { paymentService } from '../../services/paymentService';
import { messageService } from '../../services/messageService';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ArrowLeftIcon, ShoppingBagIcon, Loader2Icon } from 'lucide-react';
import PaymentModal from './PaymentModal';
import { useToast } from '../../hooks/use-toast';
import { SecureMedia } from '../ui/SecureMedia';
import { useAuthStore } from '../../stores/authStore';

export default function CreatorShop() {
    const { username } = useParams<{ username: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { user: currentUser } = useAuthStore();

    const [creator, setCreator] = useState<UserProfile | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [showPayment, setShowPayment] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            if (!username) return;
            try {
                const creatorData = await userService.getUserByUsername(username);
                if (creatorData) {
                    setCreator(creatorData);
                    const productList = await shopService.getProductsByCreator(creatorData.id);
                    setProducts(productList);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [username]);

    const handleBuyClick = (product: Product) => {
        if (!currentUser) {
            toast({ title: "Bitte anmelden", description: "Du musst eingeloggt sein, um einzukaufen.", variant: "destructive" });
            return;
        }
        setSelectedProduct(product);
        setShowPayment(true);
    };

    const handlePaymentSuccess = async () => {
        // Debugging: Startzustand prüfen
        console.log('--- KAUF PROZESS START ---');

        if (!selectedProduct || !creator || !currentUser) {
            console.error('Fehlende Daten für den Kaufabschluss');
            return;
        }

        try {
            // SCHRITT 1: Zahlung in DB speichern
            toast({ title: "Verarbeite...", description: "Speichere Kauf in Datenbank..." });

            await paymentService.purchaseProduct(
                creator.id,
                selectedProduct.id,
                selectedProduct.price,
                selectedProduct.title
            );
            console.log('Schritt 1 (Payment DB) OK');

            // SCHRITT 2: Info-Nachricht vom FAN an CREATOR (ZUERST)
            // "Ich habe X gekauft..."
            const fanToCreatorMessage = `📦 Neuer Einkauf: Ich habe "${selectedProduct.title}" für ${selectedProduct.price.toFixed(2)}€ gekauft.`;

            await messageService.sendMessage(creator.id, fanToCreatorMessage);
            console.log('Schritt 2 (Fan-Message) OK');

            // SCHRITT 3: Auto-Antwort vom CREATOR an den FAN (DANACH)
            // "Danke für den Einkauf..."
            // Hinweis: Stellen Sie sicher, dass messageService.sendAutomatedShopMessage in messageService.ts existiert (siehe vorheriger Schritt)
            await messageService.sendAutomatedShopMessage(
                creator.id,
                currentUser.id,
                selectedProduct.title
            );
            console.log('Schritt 3 (Auto-Message) OK');

            // ERFOLG
            toast({
                title: "Kauf erfolgreich!",
                description: "Der Creator wurde benachrichtigt. Bitte kläre die Versanddetails im Chat.",
                duration: 5000
            });

            // Zum Chat weiterleiten
            navigate('/messages');

        } catch (e: any) {
            console.error("KAUF PROZESS FEHLER:", e);

            toast({
                title: "Fehler beim Abschluss",
                description: `Technischer Fehler: ${e.message || JSON.stringify(e)}. Bitte Support kontaktieren.`,
                variant: "destructive",
                duration: 10000
            });
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2Icon className="animate-spin" /></div>;
    if (!creator) return <div>Creator nicht gefunden.</div>;

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 pl-0 hover:bg-transparent">
                    <ArrowLeftIcon className="mr-2 h-4 w-4" /> Zurück zum Profil
                </Button>

                <div className="flex items-center gap-4 mb-8 border-b border-border pb-6">
                    <Avatar className="w-16 h-16">
                        <AvatarImage src={creator.avatarUrl || undefined} />
                        <AvatarFallback>{creator.displayName[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-3xl font-serif text-foreground">Shop von {creator.displayName}</h1>
                        <p className="text-muted-foreground">Exklusive Produkte und Merchandise</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {products.length === 0 && <p className="text-muted-foreground col-span-full text-center py-12">Dieser Creator bietet aktuell keine Produkte an.</p>}

                    {products.map(product => (
                        <Card key={product.id} className="bg-card border-border overflow-hidden flex flex-col">
                            <div className="aspect-square w-full bg-neutral relative">
                                <SecureMedia
                                    path={product.imageUrl}
                                    type="image"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg">{product.title}</CardTitle>
                                <div className="flex flex-col">
                                    <p className="text-2xl font-serif text-secondary">{product.price.toFixed(2)}€</p>
                                    <p className="text-sm text-muted-foreground">
                                        {product.shippingIncluded ? 'inkl. Versand' : `+ ${product.shippingCost.toFixed(2)}€ Versand`}
                                    </p>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col justify-between">
                                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                                    {product.description}
                                </p>
                                <Button
                                    className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
                                    onClick={() => handleBuyClick(product)}
                                >
                                    <ShoppingBagIcon className="w-4 h-4 mr-2" />
                                    Kaufen
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {showPayment && selectedProduct && (
                <PaymentModal
                    isOpen={showPayment}
                    onClose={() => setShowPayment(false)}
                    amount={selectedProduct.price}
                    description={`Kauf: ${selectedProduct.title}`}
                    metadata={{
                        type: 'PRODUCT',
                        productId: selectedProduct.id,
                        creatorId: creator.id
                    }}
                    onPaymentSuccess={handlePaymentSuccess}
                />
            )}
        </div>
    );
}
