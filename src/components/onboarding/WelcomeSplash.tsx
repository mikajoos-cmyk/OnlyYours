import { motion } from 'framer-motion';
import { Button } from '../ui/button'; // Importiere Button

interface WelcomeSplashProps {
  onComplete: () => void;
}

export default function WelcomeSplash({ onComplete }: WelcomeSplashProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      // Flexbox für die Zentrierung und Anordnung, kein Hintergrundbild mehr
      className="flex flex-col items-center justify-between min-h-screen p-8 bg-gradient-1" // bg-gradient-1 vom Parent OnboardingFlow wird vermutlich verwendet
    >
      {/* Leeres oberes Element, um Inhalt nach unten zu schieben */}
      <div className="flex-grow"></div>

      {/* Hauptinhalt (Text + Logo) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
        className="text-center space-y-8 z-10"
      >
        <div className="space-y-2">
          {/* Text angepasst an das Bild */}
          <h2 className="text-4xl md:text-5xl font-serif text-secondary">
            Was sie dir zeigt...
          </h2>
          <p className="text-3xl md:text-4xl font-serif text-secondary">
            ist nur für dich.
          </p>
        </div>

        {/* Logo */}
        <div className="flex flex-col items-center justify-center pt-4"> {/* Etwas Abstand nach oben */}
          <img src="/logo.PNG" alt="OnlyYours Logo" className="h-24 md:h-32 lg:h-40 w-auto" /> {/* Pfad zum Logo im static-Ordner */}
        </div>
      </motion.div>

      {/* Button am unteren Rand */}
      <motion.div
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: 0.6, duration: 0.8 }}
         className="w-full max-w-xs pt-12 z-10 flex-grow flex items-end pb-8" // Flex-grow schiebt nach unten, pt für Abstand
      >
        <Button
          onClick={onComplete} // onComplete beim Klick auslösen
          variant="outline"
          // Styling angepasst an das Bild
          className="w-full bg-transparent border-2 border-secondary text-secondary hover:bg-secondary/10 hover:text-secondary rounded-full py-5 text-lg font-normal" // Border-2 und py-5 für Optik
        >
          Jetzt entdecken
        </Button>
      </motion.div>
    </motion.div>
  );
}