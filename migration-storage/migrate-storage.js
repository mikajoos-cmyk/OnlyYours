// migrate-storage.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');

// --- KONFIGURATION START ---

// 1. ALTES PROJEKT (Quelle)
const OLD_SUPABASE_URL = 'https://kaucocsucpyresggilkt.supabase.co';
const OLD_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthdWNvY3N1Y3B5cmVzZ2dpbGt0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTY1NzQ5NCwiZXhwIjoyMDc3MjMzNDk0fQ.K8FtIEgl7gTnJyJI4dd_sIw5m_8RDM3dEsPf9Uq_Sjw'; // WICHTIG: Service Role Key nehmen!

// 2. NEUES PROJEKT (Ziel)
const NEW_SUPABASE_URL = 'https://udauiunzhgzfcivpbbws.supabase.co';
const NEW_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkYXVpdW56aGd6ZmNpdnBiYndzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTEyOTk3NiwiZXhwIjoyMDg2NzA1OTc2fQ.A9pSYZvI0e3KKo6EvqwCN9hKGw-hHAla5rudFof9woc'; // WICHTIG: Service Role Key nehmen!

// 3. Welche Buckets willst du kopieren? (Namen müssen exakt stimmen)
const BUCKETS_TO_COPY = ['media'];

// --- KONFIGURATION ENDE ---

const oldClient = createClient(OLD_SUPABASE_URL, OLD_SERVICE_ROLE_KEY);
const newClient = createClient(NEW_SUPABASE_URL, NEW_SERVICE_ROLE_KEY);

async function migrateBucket(bucketName) {
    console.log(`\n--- Starte Migration für Bucket: ${bucketName} ---`);

    // 1. Prüfen, ob Bucket im neuen Projekt existiert, sonst erstellen
    const { data: buckets } = await newClient.storage.listBuckets();
    const bucketExists = buckets.find(b => b.name === bucketName);

    if (!bucketExists) {
        console.log(`Bucket '${bucketName}' existiert nicht im Ziel. Erstelle ihn...`);
        const { error: createError } = await newClient.storage.createBucket(bucketName, {
            public: true, // Oder false, je nach deinen Einstellungen
            fileSizeLimit: null,
            allowedMimeTypes: null
        });
        if (createError) {
            console.error(`Fehler beim Erstellen von Bucket ${bucketName}:`, createError.message);
            return;
        }
    }

    // 2. Alle Dateien aus dem alten Bucket auflisten (Rekursiv wäre besser, hier vereinfacht flach)
    // Supabase listet standardmäßig nur Root. Wir brauchen eine rekursive Funktion.
    const files = await listAllFiles(oldClient, bucketName);
    console.log(`Gefunden: ${files.length} Dateien in '${bucketName}'.`);

    // 3. Download & Upload Loop
    for (const file of files) {
        // Ordner überspringen (Supabase listet manchmal leere Folder-Placeholder)
        if (file.name.endsWith('/.emptyFolderPlaceholder')) continue;

        console.log(`Verarbeite: ${file.name}...`);

        try {
            // Download vom alten Projekt
            const { data: blob, error: downloadError } = await oldClient
                .storage
                .from(bucketName)
                .download(file.name);

            if (downloadError) throw downloadError;

            // In Buffer umwandeln (für Node.js Upload)
            const buffer = Buffer.from(await blob.arrayBuffer());

            // Upload ins neue Projekt
            const { error: uploadError } = await newClient
                .storage
                .from(bucketName)
                .upload(file.name, buffer, {
                    contentType: file.metadata.mimetype,
                    upsert: true // Überschreiben, falls schon da
                });

            if (uploadError) throw uploadError;
            console.log(`✅ Kopiert: ${file.name}`);

        } catch (err) {
            console.error(`❌ Fehler bei ${file.name}:`, err.message);
        }
    }
}

// Hilfsfunktion: Rekursives Auflisten aller Dateien
async function listAllFiles(client, bucketName, path = '') {
    let allFiles = [];
    const { data, error } = await client.storage.from(bucketName).list(path, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
        console.error(`Fehler beim Listen von ${path}:`, error.message);
        return [];
    }

    for (const item of data) {
        if (item.id === null) {
            // Es ist ein Ordner -> Rekursion
            const subFolderFiles = await listAllFiles(client, bucketName, `${path}${item.name}/`);
            allFiles = allFiles.concat(subFolderFiles);
        } else {
            // Es ist eine Datei -> Pfad zusammenbauen
            // Wichtig: Der Pfad darf vorne keinen Slash haben für .download()
            const fullPath = path ? `${path}${item.name}` : item.name;
            allFiles.push({ ...item, name: fullPath });
        }
    }
    return allFiles;
}

// Hauptfunktion starten
(async () => {
    for (const bucket of BUCKETS_TO_COPY) {
        await migrateBucket(bucket);
    }
    console.log('\n--- MIGRATION ABGESCHLOSSEN ---');
})();