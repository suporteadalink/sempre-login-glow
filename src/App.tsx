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
import Contacts from "./pages/Contacts";
import Tasks from "./pages/Tasks";
import Proposals from "./pages/Proposals";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={
              <AppLayout>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/pipeline" element={<Pipeline />} />
                  <Route path="/projetos" element={<Projects />} />
                  <Route path="/empresas" element={<Companies />} />
                  <Route path="/contatos" element={<Contacts />} />
                  <Route path="/tarefas" element={<Tasks />} />
                  <Route path="/propostas" element={<Proposals />} />
                  <Route path="/configuracoes" element={<Settings />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AppLayout>
            } />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
