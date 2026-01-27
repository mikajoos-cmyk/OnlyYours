import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { ArrowLeftIcon } from 'lucide-react';

export default function AGB() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
            <div className="max-w-3xl mx-auto space-y-8">
                <Button variant="ghost" onClick={() => navigate(-1)} className="pl-0 hover:bg-transparent hover:text-secondary">
                    <ArrowLeftIcon className="mr-2 h-4 w-4" />
                    Zurück
                </Button>

                <h1 className="text-3xl font-serif">Allgemeine Geschäftsbedingungen (AGB)</h1>

                <div className="space-y-6 text-muted-foreground">
                    <section className="space-y-3">
                        <h2 className="text-xl font-medium text-foreground">1. Geltungsbereich</h2>
                        <p>
                            Diese AGB regeln die Nutzung der Plattform OnlyYours durch:
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Creator (Inhaltsanbieter)</li>
                            <li>Nutzer/Kunden (Abonnenten)</li>
                            <li>Besucher</li>
                        </ul>
                        <p>
                            Mit der Registrierung oder Nutzung der Plattform erklärst du dich mit diesen Bedingungen einverstanden.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-medium text-foreground">2. Leistungsbeschreibung</h2>
                        <p>
                            OnlyYours ist eine digitale Plattform zur:
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Veröffentlichung und Monetarisierung von nutzererstellten Inhalten</li>
                            <li>Abwicklung von Abonnements und digitalen Zahlungen</li>
                            <li>Bereitstellung technischer Infrastruktur</li>
                        </ul>
                        <p>
                            OnlyYours ist kein Vertragspartner für Inhalte, sondern stellt ausschließlich die technische Plattform bereit.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-medium text-foreground">3. Registrierung & Nutzerkonto</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Die Nutzung erfordert eine Registrierung.</li>
                            <li>Nutzer müssen:
                                <ul className="list-disc pl-5 mt-1">
                                    <li>mindestens 18 Jahre alt sein</li>
                                    <li>wahrheitsgemäße Angaben machen</li>
                                </ul>
                            </li>
                            <li>Mehrfachkonten sind untersagt.</li>
                            <li>Zugangsdaten sind vertraulich zu behandeln.</li>
                        </ol>
                        <p>
                            OnlyYours behält sich vor, Konten bei Verstößen zu sperren oder zu löschen.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-medium text-foreground">4. Creator-Konten</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Creator dürfen Inhalte hochladen, veröffentlichen und monetarisieren.</li>
                            <li>Creator versichern:
                                <ul className="list-disc pl-5 mt-1">
                                    <li>volljährig zu sein</li>
                                    <li>alle Rechte an den Inhalten zu besitzen</li>
                                    <li>keine Rechte Dritter zu verletzen</li>
                                </ul>
                            </li>
                            <li>Verboten sind u. a.:
                                <ul className="list-disc pl-5 mt-1">
                                    <li>illegale Inhalte</li>
                                    <li>Minderjährige</li>
                                    <li>Gewalt, Zwang, Menschenhandel</li>
                                    <li>Inhalte, die gegen geltendes Recht verstoßen</li>
                                </ul>
                            </li>
                        </ol>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-medium text-foreground">5. Inhalte & Rechte</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Creator behalten alle Urheberrechte an ihren Inhalten.</li>
                            <li>Creator räumen OnlyYours ein:
                                <ul className="list-disc pl-5 mt-1">
                                    <li>nicht-exklusives</li>
                                    <li>weltweites</li>
                                    <li>widerrufliches Nutzungsrecht</li>
                                </ul>
                                ein, ausschließlich zur Plattformdarstellung.
                            </li>
                            <li>Nutzer erhalten kein Eigentum, sondern nur ein Nutzungsrecht zum privaten Konsum.</li>
                        </ol>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-medium text-foreground">6. Zahlungen & Abonnements</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Preise werden vom Creator festgelegt.</li>
                            <li>Zahlungen erfolgen digital über Drittanbieter.</li>
                            <li>Abonnements verlängern sich automatisch, sofern nicht gekündigt.</li>
                            <li>Rückerstattungen sind grundsätzlich ausgeschlossen, außer bei technischen Fehlern.</li>
                        </ol>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-medium text-foreground">7. Auszahlungen an Creator</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Creator erhalten ihre Einnahmen abzüglich der Plattformgebühr.</li>
                            <li>Auszahlungen erfolgen regelmäßig (z. B. innerhalb von 2 Werktagen).</li>
                            <li>Creator sind selbst verantwortlich für Steuern und Abgaben.</li>
                            <li>OnlyYours stellt keine Steuerberatung.</li>
                        </ol>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-medium text-foreground">8. Plattformgebühr</h2>
                        <p>
                            OnlyYours behält eine prozentuale Servicegebühr ein.
                            Die genaue Höhe wird im Creator-Dashboard angezeigt oder separat vereinbart.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-medium text-foreground">9. Verhalten & Community-Regeln</h2>
                        <p>Untersagt sind:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Belästigung</li>
                            <li>Betrug</li>
                            <li>Manipulation</li>
                            <li>Missbrauch von Zahlungsfunktionen</li>
                            <li>Umgehung der Plattform</li>
                        </ul>
                        <p>Verstöße führen zu:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Verwarnung</li>
                            <li>Sperrung</li>
                            <li>dauerhafter Löschung</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-medium text-foreground">10. Haftung</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>OnlyYours haftet nicht für:
                                <ul className="list-disc pl-5 mt-1">
                                    <li>Inhalte von Creatorn</li>
                                    <li>Nutzerinteraktionen</li>
                                    <li>Einnahmeausfälle</li>
                                </ul>
                            </li>
                            <li>Haftung nur bei Vorsatz oder grober Fahrlässigkeit.</li>
                            <li>Keine Garantie für ständige Verfügbarkeit.</li>
                        </ol>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-medium text-foreground">11. Kündigung</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Nutzer können ihr Konto jederzeit kündigen.</li>
                            <li>OnlyYours kann Konten fristlos kündigen bei:
                                <ul className="list-disc pl-5 mt-1">
                                    <li>Verstößen gegen AGB</li>
                                    <li>rechtlichen Risiken</li>
                                    <li>Missbrauch</li>
                                </ul>
                            </li>
                        </ol>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-medium text-foreground">12. Datenschutz</h2>
                        <p>
                            Die Verarbeitung personenbezogener Daten erfolgt gemäß der Datenschutzerklärung und DSGVO.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-medium text-foreground">13. Änderungen der AGB</h2>
                        <p>
                            OnlyYours behält sich vor, diese AGB zu ändern.
                            Änderungen werden rechtzeitig angekündigt.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-medium text-foreground">14. Schlussbestimmungen</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Es gilt deutsches Recht.</li>
                            <li>Gerichtsstand ist der Sitz der Gesellschaft.</li>
                            <li>Sollten einzelne Bestimmungen unwirksam sein, bleibt der Rest gültig.</li>
                        </ol>
                    </section>

                    <hr className="border-border my-12" />

                    <h1 className="text-3xl font-serif text-foreground">Zahlungs- & Auszahlungsrichtlinie</h1>

                    <section className="space-y-3">
                        <h2 className="text-xl font-medium text-foreground">1. Allgemeines</h2>
                        <p>
                            Diese Richtlinie regelt die Abwicklung von Zahlungen und Auszahlungen auf OnlyYours.
                            OnlyYours nutzt externe Zahlungsdienstleister zur sicheren Abwicklung.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-medium text-foreground">2. Einnahmen</h2>
                        <p>Creator erzielen Einnahmen durch:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Abonnements</li>
                            <li>kostenpflichtige Inhalte</li>
                            <li>individuelle Angebote</li>
                        </ul>
                        <p>Alle Einnahmen werden dem Creator-Konto gutgeschrieben.</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-medium text-foreground">3. Plattformgebühr</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>OnlyYours behält eine Servicegebühr auf erzielte Umsätze ein.</li>
                            <li>Die Gebühr deckt u. a.:
                                <ul className="list-disc pl-5 mt-1">
                                    <li>technische Infrastruktur</li>
                                    <li>Zahlungsabwicklung</li>
                                    <li>Support & Sicherheit</li>
                                </ul>
                            </li>
                            <li>Die jeweils gültige Gebühr ist transparent im Creator-Dashboard einsehbar.</li>
                        </ol>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-medium text-foreground">4. Auszahlungen</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Auszahlungen erfolgen regelmäßig, in der Regel innerhalb von 2 Werktagen.</li>
                            <li>Ausgezahlt wird der verfügbare Saldo abzüglich:
                                <ul className="list-disc pl-5 mt-1">
                                    <li>Plattformgebühr</li>
                                    <li>Zahlungsanbietergebühren</li>
                                </ul>
                            </li>
                            <li>OnlyYours behält sich vor, Mindestbeträge für Auszahlungen festzulegen.</li>
                        </ol>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-medium text-foreground">5. Rückbuchungen & Streitfälle</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Bei Rückbuchungen (Chargebacks) kann der entsprechende Betrag vorübergehend einbehalten werden.</li>
                            <li>Missbräuchliches Verhalten kann zur Kontosperrung führen.</li>
                        </ol>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-medium text-foreground">6. Steuern</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Creator sind selbst für:
                                <ul className="list-disc pl-5 mt-1">
                                    <li>Umsatzsteuer</li>
                                    <li>Einkommensteuer</li>
                                    <li>sonstige Abgaben</li>
                                </ul>
                                verantwortlich.
                            </li>
                            <li>OnlyYours stellt keine Steuerberatung dar.</li>
                        </ol>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-medium text-foreground">7. Zahlungsstörungen</h2>
                        <p>OnlyYours haftet nicht für:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Verzögerungen durch Zahlungsanbieter</li>
                            <li>technische Störungen außerhalb des Einflussbereichs</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-medium text-foreground">8. Änderungen</h2>
                        <p>
                            OnlyYours behält sich vor, diese Richtlinie anzupassen.
                            Änderungen werden rechtzeitig kommuniziert.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
