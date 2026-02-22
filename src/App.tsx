import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import CameraPage from "./pages/CameraPage";
import NavigationPage from "./pages/NavigationPage";
import ChatbotPage from "./pages/ChatbotPage";
import NotFound from "./pages/NotFound";
import VoiceActivationIndicator from "./components/VoiceActivationIndicator";
import { useVoiceActivation } from "./hooks/useVoiceActivation";

const queryClient = new QueryClient();

const AppContent = () => {
  const { isActive, isWakeListening } = useVoiceActivation();

  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/camera" element={<CameraPage />} />
        <Route path="/navigation" element={<NavigationPage />} />
        <Route path="/chatbot" element={<ChatbotPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <VoiceActivationIndicator isActive={isActive} isWakeListening={isWakeListening} />
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
