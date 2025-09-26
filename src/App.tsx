import React from "react";
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

// Create QueryClient with proper configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
            <div className="min-h-screen bg-background">
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
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AppLayout>
                } />
              </Routes>
            </div>
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;