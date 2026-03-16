import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera as CameraIcon, Moon, Mic, Power, PowerOff } from "lucide-react";

const CameraPage = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  // UI States
  const [isDetecting, setIsDetecting] = useState(false);
  const [nightMode, setNightMode] = useState(false);
  const [voiceControl, setVoiceControl] = useState(false);
  const [lastDescription, setLastDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Logic Refs (crucial for setInterval closures)
  const isAnalyzingRef = useRef(false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const stopDetection = useCallback(() => {
    setIsDetecting(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    speak("Object detection stopped.");
  }, [speak]);

  const analyzeFrame = useCallback(async () => {
    if (isAnalyzingRef.current) return;
    
    isAnalyzingRef.current = true;
    setIsAnalyzing(true);
    
    const frame = captureFrame();
    if (!frame) {
      isAnalyzingRef.current = false;
      setIsAnalyzing(false);
      return;
    }

    try {
      // 1. Get the API key from your Vite environment variables
      const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
      if (!GEMINI_API_KEY) throw new Error("VITE_GEMINI_API_KEY not configured in .env");

      // 2. Extract the base64 data by stripping the "data:image/jpeg;base64," prefix
      const base64Data = frame.split(",")[1];

      // 3. Construct the system prompt
      const systemPrompt = `You are an AI assistant helping a visually impaired person understand their surroundings through a camera feed. Analyze the image and provide a concise, clear description focused on:

1. **Obstacles**: Objects that could block the path (furniture, walls, poles, steps, etc.) with approximate distance
2. **People/Crowds**: Number of people visible, whether it's crowded
3. **Currency**: If any banknotes or coins are visible, identify them (Indian Rupees)
4. **Environment**: Indoor/outdoor, lighting conditions${nightMode ? ", note this is night mode with enhanced brightness" : ""}
5. **Safety**: Any potential hazards

Keep descriptions under 3 sentences. Be direct and practical. Example: "Two people ahead about 3 meters away. A chair on your left about 1 meter. Clear path to the right."

${lastDescription ? `IMPORTANT: The previous description was: "${lastDescription}". Compare carefully with what you see NOW. Only respond with EXACTLY "NO_CHANGE" (nothing else) if the scene is virtually identical - same objects in same positions, same number of people, same environment. If ANYTHING has visibly changed (different objects, people moved, items added/removed, different angle, different lighting), provide a full new description. When in doubt, provide a new description rather than saying NO_CHANGE.` : "This is the first analysis - provide a full description."}`;

      // 4. Call Google directly
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: [
            {
              role: "user",
              parts: [
                { text: "Describe what you see in this camera frame for a visually impaired person." },
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: base64Data
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 150,
          }
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.error("Rate limit hit! Stopping detection to prevent freeze.");
          stopDetection();
          speak("API rate limit reached. Please wait a moment before trying again.");
          return;
        }
        throw new Error(`Analysis failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      // 5. Parse native Gemini response
      const description = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (description && description !== "NO_CHANGE") {
        setLastDescription(description);
        speak(description);
      }
    } catch (err) {
      console.error("Analysis error:", err);
    } finally {
      isAnalyzingRef.current = false;
      setIsAnalyzing(false);
    }
  }, [captureFrame, nightMode, lastDescription, speak, stopDetection]);

  const startDetection = useCallback(() => {
    if (intervalRef.current) return; 

    setIsDetecting(true);
    speak("Object detection started.");
    analyzeFrame();
    intervalRef.current = setInterval(analyzeFrame, 5000); 
  }, [analyzeFrame, speak]);

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