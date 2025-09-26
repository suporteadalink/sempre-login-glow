import * as React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Pipeline from "./pages/Pipeline";
import Projects from "./pages/Projects";
import Companies from "./pages/Companies";

import Tasks from "./pages/Tasks";
import Proposals from "./pages/Proposals";
import Settings from "./pages/Settings";
import AIMonitoring from "./pages/AIMonitoring";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  console.log("DEBUG: App component mounting");
  
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <SafeTooltipProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="*" element={
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/pipeline" element={<Pipeline />} />
                    <Route path="/projetos" element={<Projects />} />
                    <Route path="/empresas" element={<Companies />} />
                    
                    <Route path="/tarefas" element={<Tasks />} />
                    <Route path="/propostas" element={<Proposals />} />
                    <Route path="/configuracoes" element={<Settings />} />
                    <Route path="/ai-monitoring" element={<AIMonitoring />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </AppLayout>
              } />
            </Routes>
          </SafeTooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Safe wrapper for TooltipProvider to prevent useRef errors
const SafeTooltipProvider = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = React.useState(false);
  
  React.useEffect(() => {
    setMounted(true);
  }, []);
  
  // If not mounted yet, render children without TooltipProvider
  if (!mounted) {
    return <>{children}</>;
  }
  
  // Once mounted, safely render with TooltipProvider
  try {
    return <TooltipProvider>{children}</TooltipProvider>;
  } catch (error) {
    console.error("TooltipProvider error:", error);
    return <>{children}</>;
  }
};

export default App;
