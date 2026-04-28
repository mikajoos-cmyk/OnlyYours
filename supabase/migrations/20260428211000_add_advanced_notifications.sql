-- 1. Neue Spalten für detaillierte Benachrichtigungseinstellungen
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS notify_new_post_in_app BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_new_post_email BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_new_message_in_app BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_new_message_email BOOLEAN DEFAULT true;

-- 2. Funktion zum Senden von Benachrichtigungen bei neuem Post
CREATE OR REPLACE FUNCTION public.handle_new_post_notification()
RETURNS TRIGGER AS $$
DECLARE
    follower_record RECORD;
    creator_name TEXT;
BEGIN
    -- Nur benachrichtigen, wenn der Post veröffentlicht ist
    IF NEW.is_published = true AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.is_published = false)) THEN
        
        -- Name des Creators holen
        SELECT display_name INTO creator_name FROM public.users WHERE id = NEW.creator_id;

        -- Alle Follower und Abonnenten finden (Distinct, falls jemand beides ist)
        FOR follower_record IN 
            SELECT DISTINCT user_id 
            FROM (
                SELECT follower_id AS user_id FROM public.followers WHERE creator_id = NEW.creator_id
                UNION
                SELECT fan_id AS user_id FROM public.subscriptions WHERE creator_id = NEW.creator_id AND status = 'ACTIVE'
            ) sub
        LOOP
            -- In-App Benachrichtigung erstellen, wenn gewünscht (In-App ist hier einfach ein Eintrag in die notifications Tabelle)
            IF EXISTS (SELECT 1 FROM public.users WHERE id = follower_record.user_id AND notify_new_post_in_app = true) THEN
                INSERT INTO public.notifications (user_id, type, title, content, data)
                VALUES (
                    follower_record.user_id,
                    'new_post',
                    'Neuer Post von ' || creator_name,
                    creator_name || ' hat einen neuen Beitrag hochgeladen.',
                    jsonb_build_object('postId', NEW.id, 'creatorId', NEW.creator_id, 'creatorName', creator_name)
                );
            END IF;
            
            -- E-Mail Benachrichtigung wird separat getriggert, wenn ein Eintrag in notifications erfolgt
            -- oder wir könnten hier direkt prüfen und eine E-Mail-Queue füllen.
            -- Da der Benutzer explizit die Edge Function erwähnt hat, sollten wir sicherstellen, dass diese gerufen wird.
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger für Posts
DROP TRIGGER IF EXISTS tr_new_post_notification ON public.posts;
CREATE TRIGGER tr_new_post_notification
AFTER INSERT OR UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.handle_new_post_notification();

-- 4. Funktion zum Senden von Benachrichtigungen bei neuer Nachricht
CREATE OR REPLACE FUNCTION public.handle_new_message_notification()
RETURNS TRIGGER AS $$
DECLARE
    sender_name TEXT;
BEGIN
    -- Name des Senders holen
    SELECT display_name INTO sender_name FROM public.users WHERE id = NEW.sender_id;

    -- In-App Benachrichtigung erstellen, wenn gewünscht
    -- Wir prüfen hier nur notify_new_message_in_app. 
    -- Die E-Mail-Prüfung erfolgt in der Edge Function, die wir gleich triggern.
    IF EXISTS (SELECT 1 FROM public.users WHERE id = NEW.receiver_id AND notify_new_message_in_app = true) THEN
        INSERT INTO public.notifications (user_id, type, title, content, data)
        VALUES (
            NEW.receiver_id,
            'new_message',
            'Neue Nachricht von ' || sender_name,
            'Du hast eine neue Nachricht erhalten.',
            jsonb_build_object('senderId', NEW.sender_id, 'senderName', sender_name, 'messageId', NEW.id)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger für Nachrichten
DROP TRIGGER IF EXISTS tr_new_message_notification ON public.messages;
CREATE TRIGGER tr_new_message_notification
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.handle_new_message_notification();

-- 5. Automatischer Aufruf der Edge Function bei neuer Benachrichtigung
-- Dies nutzt den Supabase Webhook Mechanismus via SQL
-- (Oder alternativ pg_net, falls verfügbar)

-- Wir aktivieren den Webhook für die notifications Tabelle
-- Hinweis: In einer echten Supabase Instanz macht man das oft im UI, 
-- aber hier ist der SQL-Weg für die Migration:
-- CREATE TRIGGER "on_notification_created" AFTER INSERT ON "public"."notifications" 
-- FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"(
--   'https://[PROJECT_REF].supabase.co/functions/v1/send-notification-email', 
--   'POST', 
--   '{"Content-Type":"application/json", "Authorization":"Bearer [SERVICE_ROLE_KEY]"}', 
--   '{}', 
--   '1000'
-- );

-- Da wir die [PROJECT_REF] und den Key nicht statisch in der Migration haben sollten,
-- ist es besser, die Edge Function direkt aus den Triggern oben zu rufen, 
-- wenn wir eine Möglichkeit haben, die URL dynamisch zu bekommen.
-- In Supabase Edge Functions ist es oft einfacher, den Webhook im Dashboard zu setzen.
-- Ich werde den Kommentar beibehalten und die manuelle Konfiguration erwähnen.
