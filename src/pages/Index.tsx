import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Eye, ArrowRight, Camera, MapPin, MessageCircle, Shield } from "lucide-react";

const features = [
  {
    icon: Camera,
    title: "Smart Camera",
    description: "AI-powered object detection describes your surroundings with voice feedback",
  },
  {
    icon: MapPin,
    title: "Voice Navigation",
    description: "Speak your destination and get step-by-step voice-guided directions",
  },
  {
    icon: MessageCircle,
    title: "AI Assistant",
    description: "Your intelligent companion that understands and helps navigate the app",
  },
  {
    icon: Shield,
    title: "SOS Emergency",
    description: "Quick emergency assistance at the tap of a button (coming soon)",
  },
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 gradient-radial pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl mx-auto"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border border-primary/20 mb-8 glow-border"
          >
            <Eye className="w-10 h-10 text-primary" />
          </motion.div>

          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight mb-6">
            <span className="text-foreground">See the World</span>
            <br />
            <span className="text-primary glow-text">With AI Eyes</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            An AI-powered accessibility companion that helps visually impaired individuals 
            navigate the world through smart camera detection, voice navigation, and 
            intelligent assistance.
          </p>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-primary text-primary-foreground font-display font-semibold text-lg glow-button transition-all hover:brightness-110"
          >
            Get Started
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </motion.div>

        {/* Features preview */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto w-full"
        >
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="glass rounded-2xl p-6 text-left"
            >
              <feature.icon className="w-8 h-8 text-primary mb-3" />
              <h3 className="font-display font-semibold text-foreground mb-1">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </div>
  );
};

export default Index;
