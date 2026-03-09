export default function Impressum() {
  return (
    <div className="min-h-screen max-h-screen overflow-y-auto bg-background text-foreground p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-3xl font-serif">Impressum</h1>

        <div className="space-y-4 text-muted-foreground">
          <h2 className="text-xl font-medium text-foreground">Angaben gemäß § 5 DDG</h2>
          <p>
            OnlyYours UG (haftungsbeschränkt)<br />
            Hauptstr. 53<br />
            78586 Deilingen<br />
            Deutschland
          </p>

          <h2 className="text-xl font-medium text-foreground">Vertreten durch</h2>
          <p>
            Konstantin Martin (Geschäftsführer & Inhaber)<br />
            Hauptstr. 53<br />
            78586 Deilingen
          </p>

          <h2 className="text-xl font-medium text-foreground">Kontakt</h2>
          <p>
            Telefon: +49 (0) 123 456789<br />
            E-Mail: support@onlyyours.app
          </p>

          <h2 className="text-xl font-medium text-foreground">Registereintrag</h2>
          <p>
            Eintragung im Handelsregister.<br />
            Registergericht: Amtsgericht Stuttgart<br />
            Registernummer: HRB 804226<br />
            EUID: DEB2609.HRB804226
          </p>

          <h2 className="text-xl font-medium text-foreground">Umsatzsteuer-ID</h2>
          <p>
            Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br />
            DE 123 456 789
          </p>

          <h2 className="text-xl font-medium text-foreground">Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
          <p>
            Konstantin Martin<br />
            Hauptstr. 53<br />
            78586 Deilingen
          </p>

          <h2 className="text-xl font-medium text-foreground">Haftungsausschluss</h2>
          <p>
            Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.
          </p>

          <h2 className="text-xl font-medium text-foreground">Verbraucherstreitbeilegung/Universalschlichtungsstelle</h2>
          <p>
            Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </div>
      </div>
    </div>
  );
}