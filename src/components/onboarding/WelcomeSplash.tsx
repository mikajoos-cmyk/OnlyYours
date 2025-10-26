import { motion } from 'framer-motion';
import { Button } from '../ui/button';

interface WelcomeSplashProps {
  onComplete: () => void;
}

export default function WelcomeSplash({ onComplete }: WelcomeSplashProps) {
  // --- HIER: Definiere deine RGB-Werte ---
  const backgroundColorRgb = "0, 0, 0"; // Beispiel: Dunkles Violett (ersetze diese Werte)
  // --- ENDE RGB-Werte ---

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      // Relative Positionierung, Flexbox-Layout und Inline-Style für Hintergrundfarbe
      className="relative flex flex-col items-center justify-between min-h-screen p-8 overflow-hidden"
      // --- Inline-Style für die RGB-Hintergrundfarbe ---
      style={{ backgroundColor: `rgb(${backgroundColorRgb})` }}
      // --- Ende Inline-Style ---
    >
      {/* Hintergrundbild - Klassen für Zentrierung bleiben */}
      <img
        // --- ERSETZE DIESEN PFAD MIT DEINEM BILD IM STATIC-ORDNER ---
        src="/splash-background.jpg"
        alt=""
        className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 h-full w-auto max-w-full object-cover object-center z-0"
        aria-hidden="true"
      />

      {/* Verdunkelungs-Overlay über dem Bild (optional, falls benötigt) */}
      {/* Du könntest dieses Overlay entfernen, wenn der Vollfarb-Hintergrund ausreicht */}
      {/* <div className="absolute inset-0 bg-black/40 z-0"></div> */}


      {/* Leeres oberes Element */}
      <div className="flex-grow z-10"></div>

      {/* Hauptinhalt (Text) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
        className="text-center space-y-8 z-10"
      >
        <div className="space-y-2">
          <h2 className="text-4xl md:text-5xl font-serif text-secondary">
            Was sie dir zeigt...
          </h2>
          <p className="text-3xl md:text-4xl font-serif text-secondary">
            ist nur für dich.
          </p>
        </div>
      </motion.div>

      {/* Button am unteren Rand */}
      <motion.div
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: 0.6, duration: 0.8 }}
         className="w-full max-w-xs pt-12 z-10 flex-grow flex items-end pb-8"
      >
        <Button
          onClick={onComplete}
          variant="outline"
          className="w-full bg-transparent border-2 border-secondary text-secondary hover:bg-secondary/10 hover:text-secondary rounded-full py-5 text-lg font-normal"
        >
          Jetzt entdecken
        </Button>
      </motion.div>
    </motion.div>
  );
}