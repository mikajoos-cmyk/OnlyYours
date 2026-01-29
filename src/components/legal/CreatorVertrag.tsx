export default function CreatorVertrag() {
    return (
        <div className="min-h-screen max-h-screen overflow-y-auto bg-background text-foreground p-4 md:p-8">
            <div className="max-w-3xl mx-auto space-y-8">
                <h1 className="text-3xl font-serif">Digitaler Creator-Vertrag</h1>

                <div className="space-y-6 text-muted-foreground">
                    <section className="space-y-3">
                        <p className="font-medium text-foreground">zwischen</p>
                        <p>
                            <strong>OnlyYours UG (haftungsbeschränkt)</strong><br />
                            – nachfolgend „Plattform" –
                        </p>
                        <p>und</p>
                        <p>
                            <strong>dem registrierten Creator</strong><br />
                            – nachfolgend „Creator" –
                        </p>
                    </section>

                    <hr className="border-border my-6" />

                    <section className="space-y-3">
                        <h2 className="text-xl font-medium text-foreground">§1 Vertragsschluss (digital)</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Dieser Vertrag kommt ausschließlich elektronisch zustande.</li>
                            <li>Mit Anklicken der Schaltfläche<br />
                                <strong>„Ich akzeptiere den Creator-Vertrag und die AGB"</strong><br />
                                schließt der Creator einen rechtsverbindlichen Vertrag mit der Plattform.
                            </li>
                            <li>Der Vertrag wird digital gespeichert und ist im Creator-Account abrufbar.</li>
                        </ol>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-medium text-foreground">§2 Vertragsgegenstand</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Die Plattform stellt eine technische Infrastruktur zur Verfügung, über die Creator Inhalte veröffentlichen und monetarisieren können.</li>
                            <li>Die Plattform ist nicht Anbieter der Inhalte und nicht Vertragspartner der Fans.</li>
                            <li>Verträge über Inhalte kommen ausschließlich zwischen Creator und Endnutzer zustande.</li>
                        </ol>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-medium text-foreground">§3 Rechtsstellung des Creators</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Der Creator handelt selbstständig und eigenverantwortlich.</li>
                            <li>Es besteht kein Arbeits-, Dienst- oder Gesellschaftsverhältnis.</li>
                            <li>Der Creator ist selbst verantwortlich für:
                                <ul className="list-disc pl-5 mt-1">
                                    <li>Steuern</li>
                                    <li>Abgaben</li>
                                    <li>rechtliche Zulässigkeit der Inhalte</li>
                                </ul>
                            </li>
                        </ol>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-medium text-foreground">§4 Voraussetzungen</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Registrierung ist nur zulässig, wenn der Creator:
                                <ul className="list-disc pl-5 mt-1">
                                    <li>mindestens 18 Jahre alt ist</li>
                                    <li>voll geschäftsfähig ist</li>
                                    <li>eine erfolgreiche Identitäts- und Altersverifikation durchgeführt hat</li>
                                </ul>
                            </li>
                            <li>Die Plattform kann Registrierungen ohne Angabe von Gründen ablehnen.</li>
                        </ol>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-medium text-foreground">§5 Inhalte & Verantwortung</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Der Creator versichert, dass:
                                <ul className="list-disc pl-5 mt-1">
                                    <li>er alle Rechte an den Inhalten besitzt</li>
                                    <li>alle dargestellten Personen volljährig sind</li>
                                    <li>alle erforderlichen Einwilligungen vorliegen</li>
                                </ul>
                            </li>
                            <li>Verboten sind insbesondere Inhalte mit:
                                <ul className="list-disc pl-5 mt-1">
                                    <li>Minderjährigen</li>
                                    <li>Gewalt, Zwang oder illegalen Handlungen</li>
                                    <li>strafbaren Darstellungen</li>
                                </ul>
                            </li>
                            <li>Der Creator haftet allein für seine Inhalte.</li>
                        </ol>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-medium text-foreground">§6 Nutzungsrechte</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Alle Urheberrechte verbleiben beim Creator.</li>
                            <li>Der Creator räumt der Plattform ein:
                                <ul className="list-disc pl-5 mt-1">
                                    <li>nicht-exklusives</li>
                                    <li>weltweites</li>
                                    <li>unentgeltliches</li>
                                </ul>
                                Nutzungsrecht ein, die Inhalte:
                                <ul className="list-disc pl-5 mt-1">
                                    <li>zu hosten</li>
                                    <li>technisch zu verarbeiten</li>
                                    <li>innerhalb der Plattform darzustellen und zu bewerben</li>
                                </ul>
                            </li>
                            <li>Das Nutzungsrecht endet mit Löschung der Inhalte oder Vertragsbeendigung.</li>
                        </ol>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-medium text-foreground">§7 Vergütung & Servicegebühr (20 %)</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Der Creator legt Preise und Angebote selbst fest.</li>
                            <li>Die Plattform erhebt eine Servicegebühr von 20 % auf sämtliche vom Creator erzielten Umsätze.</li>
                            <li>80 % der Umsätze stehen dem Creator zu.</li>
                            <li>Die Servicegebühr wird automatisch vor Auszahlung einbehalten.</li>
                            <li>Gebühren von Zahlungsdienstleistern können zusätzlich abgezogen werden.</li>
                        </ol>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-medium text-foreground">§8 Auszahlungen</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Einnahmen werden dem Creator-Konto gutgeschrieben.</li>
                            <li>Auszahlungen erfolgen regelmäßig, in der Regel innerhalb von 2 Werktagen.</li>
                            <li>Die Plattform kann:
                                <ul className="list-disc pl-5 mt-1">
                                    <li>Mindestbeträge</li>
                                    <li>Sicherheitsfristen</li>
                                    <li>Einbehalte bei Rückbuchungen</li>
                                </ul>
                                festlegen.
                            </li>
                            <li>Der Creator ist selbst für die steuerliche Behandlung verantwortlich.</li>
                        </ol>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-medium text-foreground">§9 Kein Exklusivverhältnis</h2>
                        <p>
                            Der Creator ist nicht exklusiv an die Plattform gebunden und darf andere Plattformen parallel nutzen.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-medium text-foreground">§10 Sperrung & Kündigung</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Der Vertrag läuft auf unbestimmte Zeit.</li>
                            <li>Beide Parteien können den Vertrag jederzeit kündigen.</li>
                            <li>Die Plattform kann Konten sperren oder kündigen bei:
                                <ul className="list-disc pl-5 mt-1">
                                    <li>Verstößen gegen AGB oder diesen Vertrag</li>
                                    <li>rechtlichen Risiken</li>
                                    <li>Betrug oder Missbrauch</li>
                                </ul>
                            </li>
                            <li>Rechtmäßig erzielte Einnahmen bleiben vorbehaltlich Prüfungen erhalten.</li>
                        </ol>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-medium text-foreground">§11 Haftung & Freistellung</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Der Creator stellt die Plattform von allen Ansprüchen Dritter frei, die aus seinen Inhalten entstehen.</li>
                            <li>Die Plattform haftet nur bei Vorsatz oder grober Fahrlässigkeit.</li>
                        </ol>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-medium text-foreground">§12 Schlussbestimmungen</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Es gilt deutsches Recht.</li>
                            <li>Gerichtsstand ist der Sitz der Plattform.</li>
                            <li>Sollte eine Klausel unwirksam sein, bleibt der Vertrag im Übrigen wirksam.</li>
                        </ol>
                    </section>
                </div>
            </div>
        </div>
    );
}
