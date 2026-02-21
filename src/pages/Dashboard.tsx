import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Camera, MapPin, MessageCircle, Shield, ArrowLeft } from "lucide-react";

const options = [
  {
    icon: Camera,
    title: "Camera",
    description: "AI-powered object detection & scene description",
    route: "/camera",
    enabled: true,
  },
  {
    icon: MapPin,
    title: "Navigation",
    description: "Voice-guided directions to any place in India",
    route: "/navigation",
    enabled: true,
  },
  {
    icon: MessageCircle,
    title: "AI Chatbot",
    description: "Ask anything about the app or get help",
    route: "/chatbot",
    enabled: true,
  },
  {
    icon: Shield,
    title: "SOS",
    description: "Emergency assistance (coming soon)",
    route: "/sos",
    enabled: false,
  },
];

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 gradient-radial pointer-events-none" />

      <div className="max-w-2xl mx-auto px-6 py-12">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-display">Back</span>
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
            What would you like to do?
          </h1>
          <p className="text-muted-foreground">Choose a feature to get started</p>
        </motion.div>

        <div className="space-y-4">
          {options.map((option, i) => (
            <motion.button
              key={option.title}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={option.enabled ? { scale: 1.02, x: 8 } : {}}
              whileTap={option.enabled ? { scale: 0.98 } : {}}
              onClick={() => option.enabled && navigate(option.route)}
              disabled={!option.enabled}
              className={`w-full flex items-center gap-5 p-6 rounded-2xl text-left transition-all ${
                option.enabled
                  ? "glass hover:border-primary/30 cursor-pointer"
                  : "bg-muted/20 border border-border/30 opacity-40 cursor-not-allowed"
              }`}
            >
              <div className={`flex items-center justify-center w-14 h-14 rounded-xl ${
                option.enabled ? "bg-primary/10 border border-primary/20" : "bg-muted"
              }`}>
                <option.icon className={`w-7 h-7 ${option.enabled ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1">
                <h2 className="font-display text-xl font-semibold text-foreground">{option.title}</h2>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
