import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { LogOut, Users, BarChart3, Settings, FolderOpen } from "lucide-react";

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-crm-gray">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-background">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Sempre CRM
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-crm-gray">
                Olá, {user.email}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="transition-smooth hover:shadow-medium"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-crm-navy mb-2">
            Dashboard
          </h2>
          <p className="text-crm-gray">
            Bem-vindo ao seu painel de controle
          </p>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-card/80 backdrop-blur-sm rounded-lg p-6 shadow-medium hover:shadow-glow transition-smooth border">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-gradient-primary rounded-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-crm-navy mb-2">
              Clientes
            </h3>
            <p className="text-crm-gray text-sm mb-4">
              Gerencie seus clientes e contatos
            </p>
            <Button variant="outline" className="w-full transition-smooth">
              Ver Clientes
            </Button>
          </div>

          <div className="bg-card/80 backdrop-blur-sm rounded-lg p-6 shadow-medium hover:shadow-glow transition-smooth border">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-gradient-primary rounded-lg">
                <FolderOpen className="h-6 w-6 text-white" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-crm-navy mb-2">
              Projetos
            </h3>
            <p className="text-crm-gray text-sm mb-4">
              Gerencie seus projetos ativos
            </p>
            <Button 
              variant="outline" 
              className="w-full transition-smooth"
              onClick={() => navigate("/projetos")}
            >
              Ver Projetos
            </Button>
          </div>

          <div className="bg-card/80 backdrop-blur-sm rounded-lg p-6 shadow-medium hover:shadow-glow transition-smooth border">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-gradient-primary rounded-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-crm-navy mb-2">
              Relatórios
            </h3>
            <p className="text-crm-gray text-sm mb-4">
              Analise métricas e performance
            </p>
            <Button variant="outline" className="w-full transition-smooth">
              Ver Relatórios
            </Button>
          </div>

          <div className="bg-card/80 backdrop-blur-sm rounded-lg p-6 shadow-medium hover:shadow-glow transition-smooth border">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-gradient-primary rounded-lg">
                <Settings className="h-6 w-6 text-white" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-crm-navy mb-2">
              Configurações
            </h3>
            <p className="text-crm-gray text-sm mb-4">
              Personalize seu sistema
            </p>
            <Button variant="outline" className="w-full transition-smooth">
              Configurar
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
