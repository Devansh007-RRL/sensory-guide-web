import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Mic, MicOff, Navigation2 } from "lucide-react";

const NavigationPage = () => {
  const navigate = useNavigate();
  const [destination, setDestination] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [directions, setDirections] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const recognitionRef = useRef<any>(null);

  const speak = useCallback((text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;
    utterance.lang = "en-IN";
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  }, []);

  useEffect(() => {
    speak("Navigation page. Say or type where you want to go in India.");
    return () => {
      speechSynthesis.cancel();
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      speak("Voice recognition is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setDestination(transcript);
      speak(`You said ${transcript}. Getting directions now.`);
      setIsListening(false);
      getDirections(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
    speak("Listening. Tell me where you want to go.");
  };

  const getDirections = async (dest: string) => {
    setIsNavigating(true);
    setCurrentStep(0);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/navigation-guide`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ destination: dest }),
        }
      );

      if (!response.ok) throw new Error("Navigation failed");
      const data = await response.json();

      if (data.steps && data.steps.length > 0) {
        setDirections(data.steps);
        speak(data.steps[0]);
      } else if (data.message) {
        setDirections([data.message]);
        speak(data.message);
      }
    } catch (err) {
      console.error("Navigation error:", err);
      speak("Sorry, I could not get directions right now. Please try again.");
    }
  };

  const nextStep = () => {
    if (currentStep < directions.length - 1) {
      const next = currentStep + 1;
      setCurrentStep(next);
      speak(directions[next]);
    } else {
      speak("You have reached the final step of the directions.");
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      speak(directions[prev]);
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-display">Back</span>
        </motion.button>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-2xl font-bold text-foreground mb-2"
        >
          <MapPin className="inline w-6 h-6 text-primary mr-2" />
          Voice Navigation
        </motion.h1>
        <p className="text-muted-foreground mb-8">Tell me where you want to go in India</p>

        {/* Input area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-6 mb-6"
        >
          <div className="flex gap-3">
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && destination && getDirections(destination)}
              placeholder="Type a destination..."
              className="flex-1 bg-muted/50 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground font-body focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={startListening}
              className={`flex items-center justify-center w-12 h-12 rounded-xl transition-all ${
                isListening ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground glow-button"
              }`}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </motion.button>
          </div>

          {destination && !isNavigating && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => getDirections(destination)}
              className="w-full mt-4 flex items-center justify-center gap-2 p-4 rounded-xl bg-primary text-primary-foreground font-display font-semibold glow-button"
            >
              <Navigation2 className="w-5 h-5" />
              Get Directions
            </motion.button>
          )}
        </motion.div>

        {/* Directions */}
        {directions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <h2 className="font-display text-lg font-semibold text-primary mb-4">
              Directions to {destination}
            </h2>

            {directions.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`glass rounded-xl p-4 transition-all cursor-pointer ${
                  i === currentStep ? "border-primary/50 glow-border" : ""
                }`}
                onClick={() => {
                  setCurrentStep(i);
                  speak(step);
                }}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-display font-bold ${
                    i === currentStep ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {i + 1}
                  </div>
                  <p className={`flex-1 ${i === currentStep ? "text-foreground" : "text-muted-foreground"}`}>
                    {step}
                  </p>
                </div>
              </motion.div>
            ))}

            <div className="flex gap-3 mt-4">
              <button
                onClick={prevStep}
                disabled={currentStep === 0}
                className="flex-1 p-3 rounded-xl glass font-display disabled:opacity-30"
              >
                Previous Step
              </button>
              <button
                onClick={nextStep}
                disabled={currentStep === directions.length - 1}
                className="flex-1 p-3 rounded-xl bg-primary text-primary-foreground font-display disabled:opacity-30"
              >
                Next Step
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default NavigationPage;
