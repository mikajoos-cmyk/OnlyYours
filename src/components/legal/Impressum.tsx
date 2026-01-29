export default function Impressum() {
  return (
    <div className="min-h-screen max-h-screen overflow-y-auto bg-background text-foreground p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-3xl font-serif">Impressum</h1>

        <div className="space-y-4 text-muted-foreground">
          <h2 className="text-xl font-medium text-foreground">Angaben gemäß § 5 TMG</h2>
          <p>
            OnlyYours UG (haftungsbeschränkt)<br />
            Musterstraße 123<br />
            12345 Berlin<br />
            Deutschland
          </p>

          <h2 className="text-xl font-medium text-foreground">Vertreten durch</h2>
          <p>Max Mustermann (Geschäftsführer)</p>

          <h2 className="text-xl font-medium text-foreground">Kontakt</h2>
          <p>
            Telefon: +49 (0) 123 456789<br />
            E-Mail: support@onlyyours.app
          </p>

          <h2 className="text-xl font-medium text-foreground">Registereintrag</h2>
          <p>
            Eintragung im Handelsregister.<br />
            Registergericht: Amtsgericht Berlin-Charlottenburg<br />
            Registernummer: HRB 12345
          </p>

          <h2 className="text-xl font-medium text-foreground">Umsatzsteuer-ID</h2>
          <p>
            Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br />
            DE 123 456 789
          </p>

          <h2 className="text-xl font-medium text-foreground">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
          <p>
            Max Mustermann<br />
            Musterstraße 123<br />
            12345 Berlin
          </p>

          <h2 className="text-xl font-medium text-foreground">Haftungsausschluss</h2>
          <p>
            Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.
          </p>
        </div>
      </div>
    </div>
  );
}