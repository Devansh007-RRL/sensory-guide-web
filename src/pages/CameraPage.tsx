import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera as CameraIcon, Moon, Mic, Power, PowerOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const CameraPage = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [nightMode, setNightMode] = useState(false);
  const [voiceControl, setVoiceControl] = useState(false);
  const [lastDescription, setLastDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);

  // Start camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 640, height: 480 },
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Camera access denied:", err);
        speak("Camera access was denied. Please allow camera access to use this feature.");
      }
    };
    startCamera();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  const speak = useCallback((text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  }, []);

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    canvas.width = 640;
    canvas.height = 480;

    if (nightMode) {
      ctx.filter = "brightness(2) contrast(1.5)";
    }
    ctx.drawImage(videoRef.current, 0, 0, 640, 480);
    ctx.filter = "none";
    return canvas.toDataURL("image/jpeg", 0.6);
  }, [nightMode]);

  const analyzeFrame = useCallback(async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    const frame = captureFrame();
    if (!frame) {
      setIsAnalyzing(false);
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vision-analyze`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ image: frame, nightMode }),
        }
      );

      if (!response.ok) throw new Error("Analysis failed");
      const data = await response.json();
      if (data.description && data.description !== lastDescription) {
        setLastDescription(data.description);
        speak(data.description);
      }
    } catch (err) {
      console.error("Analysis error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [captureFrame, nightMode, lastDescription, speak, isAnalyzing]);

  const startDetection = useCallback(() => {
    setIsDetecting(true);
    speak("Object detection started.");
    analyzeFrame();
    intervalRef.current = setInterval(analyzeFrame, 5000);
  }, [analyzeFrame, speak]);

  const stopDetection = useCallback(() => {
    setIsDetecting(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    speak("Object detection stopped.");
  }, [speak]);

  // Voice control
  useEffect(() => {
    if (!voiceControl) {
      if (recognitionRef.current) recognitionRef.current.stop();
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      speak("Voice control is not supported in this browser.");
      setVoiceControl(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-IN";
    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
      if (transcript.includes("night mode on") || transcript.includes("enable night mode")) {
        setNightMode(true);
        speak("Night mode enabled.");
      } else if (transcript.includes("night mode off") || transcript.includes("disable night mode")) {
        setNightMode(false);
        speak("Night mode disabled.");
      } else if (transcript.includes("start") || transcript.includes("detect")) {
        startDetection();
      } else if (transcript.includes("stop")) {
        stopDetection();
      }
    };
    recognition.start();
    recognitionRef.current = recognition;
    speak("Voice control activated. Say start, stop, night mode on, or night mode off.");

    return () => recognition.stop();
  }, [voiceControl, speak, startDetection, stopDetection]);

  return (
    <div className="min-h-screen bg-background relative">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => {
            stream?.getTracks().forEach((t) => t.stop());
            navigate("/dashboard");
          }}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-display">Back</span>
        </motion.button>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-2xl font-bold text-foreground mb-4"
        >
          <CameraIcon className="inline w-6 h-6 text-primary mr-2" />
          Smart Camera
        </motion.h1>

        {/* Video feed */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`relative rounded-2xl overflow-hidden border-2 mb-6 ${
            isDetecting ? "border-primary glow-border" : "border-border"
          }`}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full aspect-[4/3] object-cover ${nightMode ? "brightness-150 contrast-125" : ""}`}
          />
          {isAnalyzing && (
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-primary/20 px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
              <span className="text-xs font-display text-primary">Analyzing...</span>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </motion.div>

        {/* Controls */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={isDetecting ? stopDetection : startDetection}
            className={`flex items-center justify-center gap-2 p-4 rounded-xl font-display font-semibold transition-all ${
              isDetecting
                ? "bg-destructive text-destructive-foreground"
                : "bg-primary text-primary-foreground glow-button"
            }`}
          >
            {isDetecting ? <PowerOff className="w-5 h-5" /> : <Power className="w-5 h-5" />}
            {isDetecting ? "Stop" : "Start Detection"}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setNightMode(!nightMode);
              speak(nightMode ? "Night mode disabled." : "Night mode enabled.");
            }}
            className={`flex items-center justify-center gap-2 p-4 rounded-xl font-display font-semibold transition-all ${
              nightMode ? "bg-warning text-primary-foreground" : "glass"
            }`}
          >
            <Moon className="w-5 h-5" />
            Night Mode
          </motion.button>
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setVoiceControl(!voiceControl)}
          className={`w-full flex items-center justify-center gap-2 p-4 rounded-xl font-display font-semibold transition-all ${
            voiceControl ? "bg-accent text-accent-foreground" : "glass"
          }`}
        >
          <Mic className="w-5 h-5" />
          {voiceControl ? "Voice Control Active" : "Enable Voice Control"}
        </motion.button>

        {/* Last description */}
        {lastDescription && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 glass rounded-2xl p-5"
          >
            <h3 className="font-display text-sm text-primary mb-2">Last Detection</h3>
            <p className="text-foreground leading-relaxed">{lastDescription}</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CameraPage;
