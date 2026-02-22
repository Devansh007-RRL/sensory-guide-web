import { motion, AnimatePresence } from "framer-motion";
import { Mic } from "lucide-react";

interface Props {
  isActive: boolean;
  isWakeListening: boolean;
}

const VoiceActivationIndicator = ({ isActive, isWakeListening }: Props) => {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="mb-2 bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-display shadow-lg"
          >
            Listening for command...
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        animate={isActive ? { scale: [1, 1.2, 1] } : {}}
        transition={{ repeat: Infinity, duration: 1 }}
        className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-colors ${
          isActive
            ? "bg-primary text-primary-foreground"
            : isWakeListening
            ? "bg-muted/80 text-muted-foreground"
            : "bg-destructive text-destructive-foreground"
        }`}
      >
        <Mic className="w-5 h-5" />
      </motion.div>
    </div>
  );
};

export default VoiceActivationIndicator;
