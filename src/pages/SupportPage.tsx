import React from 'react';
import { Mail, HelpCircle, FileText, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';

export default function SupportPage() {
    const supportEmail = "support@onlyyours.app"; // Deine Support-Email hier anpassen

    return (
        <div className="container mx-auto max-w-4xl p-6 space-y-8 pb-20">
            {/* Header Bereich */}
            <div className="text-center space-y-4">
                <h1 className="text-3xl font-bold tracking-tight">Wie können wir dir helfen?</h1>
                <p className="text-muted-foreground text-lg">
                    Durchsuche unsere FAQs oder kontaktiere unser Support-Team direkt.
                </p>
            </div>

            {/* Kontakt Box */}
            <Card className="bg-primary/5 border-primary/20">
                <CardContent className="flex flex-col sm:flex-row items-center justify-between p-6 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-background rounded-full shadow-sm">
                            <Mail className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Noch Fragen offen?</h3>
                            <p className="text-sm text-muted-foreground">Unser Team antwortet in der Regel innerhalb von 24h.</p>
                        </div>
                    </div>
                    <Button asChild>
                        <a href={`mailto:${supportEmail}`}>
                            E-Mail schreiben
                        </a>
                    </Button>
                </CardContent>
            </Card>

            {/* FAQ Sektion */}
            <div className="grid gap-6 md:grid-cols-1">

                {/* Sektion: Allgemein & Account */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <HelpCircle className="h-5 w-5" /> Allgemein & Account
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="item-1">
                                <AccordionTrigger>Wie erstelle ich einen Account?</AccordionTrigger>
                                <AccordionContent>
                                    Klicke auf der Startseite auf "Registrieren". Du kannst dich als Fan anmelden, um Inhalte zu sehen, oder dich als Creator verifizieren lassen, um eigene Inhalte zu verkaufen.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-2">
                                <AccordionTrigger>Wie kann ich mein Passwort zurücksetzen?</AccordionTrigger>
                                <AccordionContent>
                                    Gehe zur Login-Seite und klicke auf "Passwort vergessen". Wir senden dir eine E-Mail mit Anweisungen zum Zurücksetzen deines Passworts.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-3">
                                <AccordionTrigger>Wie lösche ich meinen Account?</AccordionTrigger>
                                <AccordionContent>
                                    Du kannst deinen Account in den Einstellungen unter "Profil verwalten" löschen. Bitte beachte, dass dies endgültig ist und alle deine Daten entfernt werden.
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>
                </Card>

                {/* Sektion: Zahlungen & Abos */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5" /> Zahlungen & Sicherheit
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="pay-1">
                                <AccordionTrigger>Welche Zahlungsmethoden werden akzeptiert?</AccordionTrigger>
                                <AccordionContent>
                                    Wir akzeptieren alle gängigen Kreditkarten (Visa, Mastercard, Amex) über unseren sicheren Zahlungsdienstleister Stripe.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="pay-2">
                                <AccordionTrigger>Wie kündige ich ein Abonnement?</AccordionTrigger>
                                <AccordionContent>
                                    Gehe auf das Profil des Creators oder in deine Einstellung unter "Meine Abonnements". Dort kannst du das Abo jederzeit zum Ende des aktuellen Abrechnungszeitraums kündigen.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="pay-3">
                                <AccordionTrigger>Erscheint der Name der App auf meiner Abrechnung?</AccordionTrigger>
                                <AccordionContent>
                                    Zum Schutz deiner Privatsphäre erscheint auf deiner Kreditkartenabrechnung ein neutraler Verwendungszweck (z.B. "OY-Services").
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>
                </Card>

                {/* Sektion: Für Creator */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" /> Für Creator
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="creator-1">
                                <AccordionTrigger>Wann werden meine Einnahmen ausgezahlt?</AccordionTrigger>
                                <AccordionContent>
                                    Auszahlungen erfolgen automatisch auf dein verknüpftes Bankkonto. In der Regel geschieht dies wöchentlich, sobald der Mindestauszahlungsbetrag erreicht ist.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="creator-2">
                                <AccordionTrigger>Wie verifiziere ich mich?</AccordionTrigger>
                                <AccordionContent>
                                    Um Creator zu werden, musst du einen gültigen Lichtbildausweis hochladen und unser Verifizierungsverfahren durchlaufen. Dies dient der Sicherheit unserer Plattform.
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}