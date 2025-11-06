import { useState, useRef, useEffect } from 'react'; // useEffect importiert
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { UploadIcon, CalendarIcon, Loader2Icon, Trash2Icon, XIcon, LockIcon, GlobeIcon, UsersIcon } from 'lucide-react'; // Icons hinzugefügt
import { useToast } from '../../hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { storageService } from '../../services/storageService';
import { postService } from '../../services/postService';
import { cn } from '../../lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { TimePicker } from '../ui/time-picker';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
// --- NEUE IMPORTS ---
import { tierService, Tier } from '../../services/tierService';
// --- ENDE NEUE IMPORTS ---

export default function PostEditor() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Formular-States
  const [caption, setCaption] = useState('');
  const [price, setPrice] = useState(''); // Dies ist jetzt der PPV-Preis

  // --- AKTUALISIERT: tier-State ---
  const [accessLevel, setAccessLevel] = useState('all_subscribers'); // 'public', 'all_subscribers', oder tier.id
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loadingTiers, setLoadingTiers] = useState(true);
  // --- ENDE ---

  // Date/Time States
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("12:00");
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Datei-States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO' | null>(null);

  // UI-State
  const [isLoading, setIsLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- NEU: Tiers laden ---
  useEffect(() => {
    const fetchTiers = async () => {
      if (!user?.id) return;
      setLoadingTiers(true);
      try {
        const fetchedTiers = await tierService.getCreatorTiers(user.id);
        setTiers(fetchedTiers);
      } catch (error) {
        toast({ title: "Fehler", description: "Abo-Stufen konnten nicht geladen werden.", variant: "destructive" });
      } finally {
        setLoadingTiers(false);
      }
    };
    fetchTiers();
  }, [user?.id, toast]);
  // --- ENDE ---

  // ... (handleFileChange, onDragOver, onDragLeave, onDrop, clearFile bleiben gleich) ...
    // Handler für Dateiauswahl (Klick oder Drag & Drop)
  const handleFileChange = (file: File | undefined) => {
    if (!file) return;

    // Medientyp prüfen
    if (file.type.startsWith('image/')) {
      setMediaType('IMAGE');
    } else if (file.type.startsWith('video/')) {
      setMediaType('VIDEO');
    } else {
      toast({
        title: 'Ungültiger Dateityp',
        description: 'Bitte laden Sie nur Bilder oder Videos hoch.',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);

    // Vorschau generieren
    const previewUrl = URL.createObjectURL(file);
    setFilePreview(previewUrl);
  };

  // Aufräumen der Object-URL, wenn die Komponente verlässt oder die Datei ändert
  useState(() => () => {
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
    }
  });

  // Handler für Drag & Drop
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };
  const onDragLeave = () => setDragOver(false);
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileChange(file);
  };

  // Handler zum Entfernen der Datei
  const clearFile = () => {
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
    }
    setSelectedFile(null);
    setFilePreview(null);
    setMediaType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Input-Feld zurücksetzen
    }
  };


  // Helper: Datum/Zeit
  const getCombinedIsoString = (): string | null => {
    if (!selectedDate) return null;
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const combinedDate = new Date(selectedDate);
    combinedDate.setHours(hours);
    combinedDate.setMinutes(minutes);
    combinedDate.setSeconds(0);
    combinedDate.setMilliseconds(0);
    return combinedDate.toISOString();
  };

  const displayScheduledDate = () => {
    if (!selectedDate) return 'Zeitplan (optional)';
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const combinedDate = new Date(selectedDate);
    combinedDate.setHours(hours);
    combinedDate.setMinutes(minutes);
    return format(combinedDate, "dd. MMMM yyyy 'um' HH:mm", { locale: de });
  };
  // --- ENDE HELPER ---


  // Haupt-Submit-Handler
  const handleSubmit = async (isDraft: boolean) => {
    if (!selectedFile || !mediaType) {
      toast({ title: 'Fehler', description: 'Bitte wählen Sie eine Mediendatei aus.', variant: 'destructive' });
      return;
    }
    if (!user) {
      toast({ title: 'Fehler', description: 'Nicht authentifiziert.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    try {
      let thumbnailUrl: string | null = null;

      // 1. Mediendatei hochladen
      const mediaUrl = await storageService.uploadMedia(selectedFile, user.id);

      // 2. Thumbnail generieren und hochladen (nur für Bilder)
      if (mediaType === 'IMAGE') {
        try {
          const thumbFile = await storageService.generateThumbnail(selectedFile);
          thumbnailUrl = await storageService.uploadMedia(thumbFile, user.id);
        } catch (thumbError) {
          console.error("Thumbnail-Erstellung fehlgeschlagen:", thumbError);
        }
      }

      const scheduledForISO = getCombinedIsoString();

      // --- AKTUALISIERTE POST-DATEN LOGIK ---
      let postPrice = parseFloat(price) || 0;
      let postTierId: string | null = null;

      if (accessLevel === 'public') {
        postPrice = 0; // Public ist immer kostenlos
        postTierId = null;
      } else if (accessLevel === 'all_subscribers') {
        postTierId = null; // 'null' bedeutet "Alle Abonnenten"
        // postPrice bleibt der vom Benutzer eingegebene PPV-Preis
      } else {
        postTierId = accessLevel; // UUID der Tier
        // postPrice bleibt der vom Benutzer eingegebene PPV-Preis
      }

      if (postPrice > 0 && accessLevel === 'public') {
         toast({ title: 'Logikfehler', description: 'Öffentliche Posts können keinen Preis haben.', variant: 'destructive' });
         setIsLoading(false);
         return;
      }
      // --- ENDE ---


      // 3. Post-Daten für den Service vorbereiten
      const postData = {
        mediaUrl: mediaUrl,
        thumbnail_url: thumbnailUrl,
        mediaType: mediaType,
        caption: caption,
        price: postPrice,
        tierId: postTierId,
        scheduledFor: scheduledForISO,
        is_published: !isDraft,
      };

      // 4. Post in der Datenbank erstellen
      await postService.createPost(postData);

      setIsLoading(false);

      // Erfolgs-Feedback
      if (isDraft) {
        toast({ title: 'Entwurf gespeichert!', description: 'Ihr Beitrag wurde im Content Vault gespeichert.' });
      } else if (postData.scheduledFor) {
        toast({ title: 'Beitrag geplant!', description: 'Ihr Beitrag wird automatisch veröffentlicht.' });
      } else {
        toast({ title: 'Beitrag veröffentlicht!', description: 'Ihr Beitrag ist jetzt live.' });
      }

      navigate('/vault'); // Zurück zum Vault

    } catch (error: any) {
      setIsLoading(false);
      console.error("Fehler beim Erstellen des Beitrags:", error);
      toast({
        title: 'Fehler beim Erstellen des Beitrags',
        description: error.message || 'Ein unbekannter Fehler ist aufgetreten.',
        variant: 'destructive',
      });
    }
  };

  const isPublic = accessLevel === 'public';

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-serif text-foreground">Neuer Beitrag</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* --- DATEI-UPLOAD-KARTE (Unverändert) --- */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-foreground">Medien hochladen</CardTitle>
              {filePreview && (
                <Button variant="ghost" size="icon" onClick={clearFile} disabled={isLoading}>
                  <Trash2Icon className="w-5 h-5 text-destructive" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {filePreview ? (
                <div className="w-full aspect-square rounded-lg overflow-hidden bg-background">
                  {mediaType === 'IMAGE' && (
                    <img src={filePreview} alt="Vorschau" className="w-full h-full object-cover" />
                  )}
                  {mediaType === 'VIDEO' && (
                    <video src={filePreview} controls className="w-full h-full object-cover" />
                  )}
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  className={cn(
                    "border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-secondary transition-colors cursor-pointer",
                    dragOver && "border-secondary bg-secondary/10"
                  )}
                >
                  <UploadIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" strokeWidth={1.5} />
                  <p className="text-foreground mb-2">
                    Klicken oder ziehen Sie Dateien hierher
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Unterstützt: Bilder und Videos
                  </p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => handleFileChange(e.target.files?.[0])}
                    accept="image/*,video/*"
                    className="hidden"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* --- POST-DETAILS-KARTE (Aktualisiert) --- */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Beitragsdetails</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="caption" className="text-foreground">
                  Beschreibung
                </Label>
                <Textarea
                  id="caption"
                  placeholder="Schreiben Sie eine Beschreibung..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="min-h-32 bg-background text-foreground border-border"
                  disabled={isLoading}
                />
              </div>

              {/* --- AKTUALISIERT: Zugriffsstufe --- */}
              <div className="space-y-2">
                <Label htmlFor="access-level" className="text-foreground">
                  Wer kann diesen Beitrag sehen?
                </Label>
                <Select value={accessLevel} onValueChange={setAccessLevel} disabled={isLoading || loadingTiers}>
                  <SelectTrigger className="bg-background text-foreground border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card text-foreground border-border">
                    <SelectItem value="public">
                      <div className="flex items-center gap-2">
                        <GlobeIcon className="w-4 h-4" />
                        Alle Benutzer (Öffentlich & Kostenlos)
                      </div>
                    </SelectItem>
                    <SelectItem value="all_subscribers">
                       <div className="flex items-center gap-2">
                        <UsersIcon className="w-4 h-4" />
                        Alle Abonnenten
                      </div>
                    </SelectItem>
                    {tiers.map((tier) => (
                      <SelectItem key={tier.id} value={tier.id}>
                         <div className="flex items-center gap-2">
                          <LockIcon className="w-4 h-4" />
                          {tier.name} (Stufe)
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* --- AKTUALISIERT: Preis (PPV) --- */}
              <div className="space-y-2">
                <Label htmlFor="price" className="text-foreground">
                  Pay-per-View Preis (optional)
                </Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="0.00"
                  value={isPublic ? '0.00' : price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="bg-background text-foreground border-border"
                  disabled={isLoading || isPublic}
                />
                {isPublic && (
                  <p className="text-xs text-muted-foreground">Öffentliche Posts sind immer kostenlos.</p>
                )}
                {!isPublic && (
                  <p className="text-xs text-muted-foreground">
                    Abonnenten (mit passender Stufe) erhalten diesen Inhalt kostenlos.
                    Andere müssen diesen Preis bezahlen.
                  </p>
                )}
              </div>


              {/* --- KALENDER/ZEIT-PICKER (Unverändert) --- */}
              <div className="space-y-2">
                <Label className="text-foreground">
                  Zeitplan (optional)
                </Label>
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-10 px-3 py-2 bg-background text-foreground border-border hover:bg-neutral",
                        !selectedDate && "text-muted-foreground"
                      )}
                      disabled={isLoading}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {displayScheduledDate()}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                      locale={de}
                    />
                    <div className="p-4 border-t border-border flex items-center justify-between">
                      <Label className="text-foreground">Uhrzeit</Label>
                      <TimePicker
                        value={selectedTime}
                        onChange={setSelectedTime}
                        disabled={!selectedDate}
                      />
                    </div>
                    <div className="p-4 pt-0 flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => setSelectedDate(undefined)}
                        disabled={!selectedDate}
                      >
                        Löschen
                      </Button>
                       <Button
                        className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                        onClick={() => setPopoverOpen(false)}
                      >
                        Übernehmen
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* --- SUBMIT-BUTTONS (Unverändert) --- */}
              <div className="flex gap-4 pt-4">
                <Button
                  onClick={() => handleSubmit(false)} // 'false' = kein Entwurf
                  className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal"
                  disabled={isLoading || !selectedFile}
                >
                  {isLoading ? (
                    <Loader2Icon className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    getCombinedIsoString() ? 'Planen' : 'Veröffentlichen'
                  )}
                </Button>
                <Button
                  onClick={() => handleSubmit(true)} // 'true' = Entwurf
                  variant="outline"
                  className="flex-1 bg-background text-foreground border-border hover:bg-neutral font-normal"
                  disabled={isLoading || !selectedFile}
                >
                  {isLoading ? (
                    <Loader2Icon className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    'Als Entwurf speichern'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}