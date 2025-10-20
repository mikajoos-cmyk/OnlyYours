import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { UploadIcon, CalendarIcon } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export default function PostEditor() {
  const [caption, setCaption] = useState('');
  const [price, setPrice] = useState('');
  const [tier, setTier] = useState('all');
  const [scheduledDate, setScheduledDate] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();

  const handlePublish = () => {
    toast({
      title: 'Beitrag veröffentlicht!',
      description: 'Ihr Beitrag wurde erfolgreich veröffentlicht.',
    });
    navigate('/vault');
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-serif text-foreground">Neuer Beitrag</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Medien hochladen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-secondary transition-colors cursor-pointer">
                <UploadIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" strokeWidth={1.5} />
                <p className="text-foreground mb-2">
                  Klicken oder ziehen Sie Dateien hierher
                </p>
                <p className="text-sm text-muted-foreground">
                  Unterstützt: Bilder und Videos
                </p>
              </div>
            </CardContent>
          </Card>

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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price" className="text-foreground">
                  Preis (optional)
                </Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="bg-background text-foreground border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tier" className="text-foreground">
                  Zugriffsstufe
                </Label>
                <Select value={tier} onValueChange={setTier}>
                  <SelectTrigger className="bg-background text-foreground border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card text-foreground border-border">
                    <SelectItem value="all">Alle Abonnenten</SelectItem>
                    <SelectItem value="vip">Nur VIP</SelectItem>
                    <SelectItem value="vip-gold">Nur VIP Gold</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="schedule" className="text-foreground">
                  Zeitplan (optional)
                </Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                  <Input
                    id="schedule"
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="pl-10 bg-background text-foreground border-border"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  onClick={handlePublish}
                  className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal"
                >
                  Veröffentlichen
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 bg-background text-foreground border-border hover:bg-neutral font-normal"
                >
                  Als Entwurf speichern
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
