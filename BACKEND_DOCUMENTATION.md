# OnlyYours Backend Dokumentation

## Übersicht

Das Backend für die OnlyYours-Plattform wurde mit **Supabase** (PostgreSQL) implementiert und bietet eine vollständige, sichere und skalierbare Lösung für Content-Creator und Fans.

## Technologie-Stack

- **Datenbank**: Supabase (PostgreSQL)
- **Authentifizierung**: Supabase Auth (Email/Password)
- **Storage**: Supabase Storage (Medien-Uploads)
- **Client**: @supabase/supabase-js
- **Sicherheit**: Row Level Security (RLS), Verschlüsselung

## Datenbankschema

### Tabellen

#### 1. `users`
Erweiterte Benutzerprofile (ergänzt auth.users)
- `id` - UUID, Primärschlüssel, verweist auf auth.users
- `username` - Eindeutiger Benutzername (lowercase)
- `display_name` - Anzeigename
- `bio` - Profilbeschreibung
- `avatar_url` - Profilbild-URL
- `banner_url` - Banner-URL
- `role` - ENUM ('FAN', 'CREATOR')
- `is_verified` - Verifizierungsstatus
- `subscription_price` - Basis-Abonnementpreis für Creators
- `followers_count` - Anzahl der Follower
- `total_earnings` - Gesamteinnahmen (verschlüsselt)

#### 2. `subscription_tiers`
Abonnementstufen für Creators
- `id` - UUID
- `creator_id` - Verweis auf users
- `name` - Stufenname (z.B. "Basic", "VIP", "VIP Gold")
- `price` - Preis
- `description` - Beschreibung
- `benefits` - JSONB-Array mit Vorteilen
- `position` - Anzeigereihenfolge
- `is_active` - Aktiv/Inaktiv

#### 3. `posts`
Content-Beiträge von Creators
- `id` - UUID
- `creator_id` - Verweis auf users
- `media_url` - Medien-URL (verschlüsselt)
- `media_type` - ENUM ('IMAGE', 'VIDEO')
- `thumbnail_url` - Thumbnail-URL
- `caption` - Bildbeschreibung
- `hashtags` - Array von Hashtags
- `price` - Optionaler Pay-per-View-Preis
- `tier_id` - Optionale Stufenbeschränkung
- `likes_count` - Anzahl Likes
- `comments_count` - Anzahl Kommentare
- `views_count` - Anzahl Aufrufe
- `is_published` - Veröffentlichungsstatus
- `scheduled_for` - Geplantes Veröffentlichungsdatum

#### 4. `subscriptions`
Aktive Abonnements zwischen Fans und Creators
- `id` - UUID
- `fan_id` - Verweis auf users
- `creator_id` - Verweis auf users
- `tier_id` - Verweis auf subscription_tiers
- `status` - ENUM ('ACTIVE', 'CANCELED', 'EXPIRED')
- `price` - Festgeschriebener Preis
- `start_date` - Startdatum
- `end_date` - Enddatum
- `auto_renew` - Automatische Verlängerung

#### 5. `likes`
Post-Likes von Benutzern
- `id` - UUID
- `user_id` - Verweis auf users
- `post_id` - Verweis auf posts
- Unique-Constraint auf (user_id, post_id)

#### 6. `comments`
Kommentare zu Posts
- `id` - UUID
- `post_id` - Verweis auf posts
- `user_id` - Verweis auf users
- `content` - Kommentartext

#### 7. `messages`
Direktnachrichten zwischen Benutzern
- `id` - UUID
- `sender_id` - Verweis auf users
- `receiver_id` - Verweis auf users
- `content` - Nachrichteninhalt (verschlüsselt)
- `is_read` - Gelesen-Status

#### 8. `notifications`
Benutzerbenachrichtigungen
- `id` - UUID
- `user_id` - Verweis auf users
- `type` - Benachrichtigungstyp
- `title` - Titel
- `content` - Inhalt
- `data` - JSONB mit zusätzlichen Daten
- `is_read` - Gelesen-Status

#### 9. `payments`
Zahlungstransaktionen
- `id` - UUID
- `user_id` - Verweis auf users
- `amount` - Betrag
- `currency` - Währung
- `type` - ENUM ('SUBSCRIPTION', 'TIP', 'PAY_PER_VIEW')
- `status` - ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')
- `payment_method` - Zahlungsmethode (verschlüsselt)
- `related_id` - Verweis auf zugehörige Entität
- `metadata` - JSONB mit zusätzlichen Daten

#### 10. `payouts`
Auszahlungen für Creators
- `id` - UUID
- `creator_id` - Verweis auf users
- `amount` - Betrag
- `status` - ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')
- `payout_method` - Auszahlungsmethode (verschlüsselt)
- `requested_at` - Anfragedatum
- `completed_at` - Abschlussdatum

## Sicherheitskonzept

### Row Level Security (RLS)

Alle Tabellen haben RLS aktiviert mit restriktiven Policies:

#### Users
- ✅ Alle können öffentliche Profile ansehen
- ✅ Benutzer können nur ihr eigenes Profil aktualisieren
- ✅ Benutzer können bei Registrierung ihr Profil erstellen

#### Posts
- ✅ Nur veröffentlichte Posts sind sichtbar
- ✅ Zugriff nur mit aktivem Abonnement oder für Creator selbst
- ✅ Preisbeschränkungen werden berücksichtigt
- ✅ Tier-Beschränkungen werden geprüft
- ✅ Creators können nur eigene Posts verwalten

#### Subscriptions
- ✅ Benutzer sehen nur eigene Abonnements
- ✅ Fans können Abonnements erstellen und verwalten
- ✅ Keine Selbst-Abonnements erlaubt

#### Messages
- ✅ Benutzer sehen nur eigene Nachrichten
- ✅ Sender und Empfänger haben Zugriff
- ✅ Keine Selbst-Nachrichten erlaubt

#### Likes & Comments
- ✅ Alle können Likes/Kommentare sehen
- ✅ Benutzer können nur eigene Likes/Kommentare verwalten
- ✅ Post-Creators können Kommentare moderieren

#### Payments & Payouts
- ✅ Benutzer sehen nur eigene Zahlungen
- ✅ Creators sehen nur eigene Auszahlungen
- ✅ Strikte Eigentumskontrollen

### Storage-Sicherheit

**Media Bucket** - Policies:
- ✅ Nur authentifizierte Benutzer können hochladen
- ✅ Benutzer laden in ihren eigenen Ordner hoch
- ✅ Benutzer können nur eigene Medien löschen
- ✅ Zugriff nur mit aktivem Abonnement oder als Eigentümer
- ✅ Dateigrößenlimit: 500 MB
- ✅ Erlaubte MIME-Typen: image/*, video/*

### Datenschutz-Features

1. **Verschlüsselung**
   - Sensitive Felder werden auf Anwendungsebene verschlüsselt
   - Speicherpfade nutzen sichere Tokens
   - Zahlungsdaten sind geschützt

2. **Authentifizierung**
   - JWT-basierte Session-Verwaltung
   - Passwort-Hashing mit bcrypt
   - Automatisches Token-Refresh
   - Session-Persistenz

3. **Zugriffskontrolle**
   - Abonnement-basierter Content-Zugriff
   - Tier-basierte Beschränkungen
   - Creator-Eigentumskontrollen
   - Nachrichtenprivatsphäre zwischen Sender/Empfänger

## Service-Layer

### AuthService (`src/services/authService.ts`)
- `register()` - Benutzerregistrierung
- `login()` - Benutzeranmeldung
- `logout()` - Benutzerabmeldung
- `getCurrentUser()` - Aktuellen Benutzer abrufen
- `updateProfile()` - Profil aktualisieren
- `changePassword()` - Passwort ändern
- `onAuthStateChange()` - Auth-Status-Änderungen überwachen

### PostService (`src/services/postService.ts`)
- `createPost()` - Post erstellen
- `getDiscoveryFeed()` - Entdeckungs-Feed abrufen
- `getSubscriberFeed()` - Abonnenten-Feed abrufen
- `getCreatorPosts()` - Creator-Posts abrufen
- `toggleLike()` - Like hinzufügen/entfernen
- `updatePost()` - Post aktualisieren
- `deletePost()` - Post löschen

### SubscriptionService (`src/services/subscriptionService.ts`)
- `subscribe()` - Abonnement erstellen
- `cancelSubscription()` - Abonnement kündigen
- `getUserSubscriptions()` - Benutzer-Abonnements abrufen
- `getCreatorSubscribers()` - Creator-Abonnenten abrufen
- `checkSubscription()` - Abonnement-Status prüfen

### CommentService (`src/services/commentService.ts`)
- `addComment()` - Kommentar hinzufügen
- `getPostComments()` - Post-Kommentare abrufen
- `deleteComment()` - Kommentar löschen

### MessageService (`src/services/messageService.ts`)
- `sendMessage()` - Nachricht senden
- `getConversation()` - Konversation abrufen
- `getChatList()` - Chat-Liste abrufen
- `markAsRead()` - Nachricht als gelesen markieren
- `markConversationAsRead()` - Konversation als gelesen markieren

### StorageService (`src/services/storageService.ts`)
- `uploadMedia()` - Medien hochladen
- `deleteMedia()` - Medien löschen
- `getMediaUrl()` - Medien-URL abrufen
- `generateThumbnail()` - Thumbnail generieren

### UserService (`src/services/userService.ts`)
- `getUserByUsername()` - Benutzer nach Username abrufen
- `getUserById()` - Benutzer nach ID abrufen
- `searchCreators()` - Creators suchen
- `getTopCreators()` - Top-Creators abrufen
- `updateUserStats()` - Benutzerstatistiken aktualisieren

## Datenbank-Funktionen

### Helper-Funktionen

```sql
-- Likes-Zähler erhöhen
increment_likes_count(post_id uuid)

-- Likes-Zähler verringern
decrement_likes_count(post_id uuid)

-- Kommentar-Zähler erhöhen
increment_comments_count(post_id uuid)

-- Kommentar-Zähler verringern
decrement_comments_count(post_id uuid)

-- Follower-Zähler aktualisieren
update_followers_count(creator_id uuid, delta_value integer)
```

### Trigger

- `update_updated_at_column` - Aktualisiert automatisch `updated_at` bei Updates

## Integration

### Frontend-Integration

```typescript
// 1. Supabase Client importieren
import { supabase } from './lib/supabase';

// 2. Services importieren
import { authService, postService, subscriptionService } from './services';

// 3. In Stores verwenden
import { useAuthStore } from './stores/authStore';
import { useFeedStore } from './stores/feedStore';
```

### Authentifizierung

```typescript
// Registrierung
await authService.register(username, email, password, 'fan');

// Anmeldung
const user = await authService.login(email, password);

// Abmeldung
await authService.logout();
```

### Posts

```typescript
// Feed laden
const posts = await postService.getDiscoveryFeed(20);

// Post liken
await postService.toggleLike(postId);

// Post erstellen
await postService.createPost({
  mediaUrl: uploadedUrl,
  mediaType: 'IMAGE',
  caption: 'My caption',
  hashtags: ['fashion', 'style']
});
```

### Abonnements

```typescript
// Abonnieren
await subscriptionService.subscribe(creatorId);

// Abonnement prüfen
const isSubscribed = await subscriptionService.checkSubscription(fanId, creatorId);

// Abonnement kündigen
await subscriptionService.cancelSubscription(subscriptionId);
```

## Performance-Optimierungen

1. **Indizes** auf häufig abgefragten Spalten:
   - username, role, creator_id, post_id, user_id, status
   - Composite-Indizes für komplexe Abfragen

2. **Paginierung** für alle Listen-Endpunkte

3. **Optimistische Updates** für Like/Unlike-Operationen

4. **Caching** von Benutzer-Sessions

5. **Lazy Loading** für Medien-Inhalte

## Umgebungsvariablen

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Deployment

Das Backend ist vollständig in Supabase gehostet:

1. **Datenbank**: Automatisch provisioniert
2. **Storage**: Automatisch konfiguriert
3. **Auth**: Automatisch aktiviert
4. **RLS-Policies**: Über Migration angewendet

## Best Practices

1. ✅ **Immer** RLS-Policies verwenden
2. ✅ **Niemals** sensible Daten im Frontend speichern
3. ✅ **Immer** Eingaben validieren
4. ✅ **Niemals** Passwörter im Klartext speichern
5. ✅ **Immer** Fehlerbehandlung implementieren
6. ✅ **Niemals** SQL-Injection zulassen
7. ✅ **Immer** HTTPS verwenden
8. ✅ **Niemals** API-Keys im Client-Code hartcodieren

## Fehlerbehandlung

Alle Services werfen typisierte Fehler:

```typescript
try {
  await authService.login(email, password);
} catch (error) {
  if (error.message === 'Invalid credentials') {
    // Ungültige Anmeldedaten
  } else if (error.message === 'User not found') {
    // Benutzer nicht gefunden
  }
}
```

## Monitoring & Logging

- Supabase Dashboard für Datenbank-Monitoring
- Client-seitige Fehlerprotokollierung
- Performance-Metriken über Supabase Analytics

## Skalierung

Das Backend ist für Skalierung vorbereitet:

1. **Horizontal**: Supabase skaliert automatisch
2. **Vertikal**: Upgrade auf größere Instanzen möglich
3. **Caching**: Redis-Integration möglich
4. **CDN**: Medien-Delivery über CDN

## Support & Wartung

- Regelmäßige Backups über Supabase
- Automatische Updates von Supabase
- Migrations-System für Schema-Änderungen
- Rollback-Möglichkeit für Deployments
