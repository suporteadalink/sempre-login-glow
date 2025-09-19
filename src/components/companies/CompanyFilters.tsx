import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Search, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSalespeople } from "@/hooks/useSalespeople";

interface CompanyFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filters: {
    type: string;
    sector: string;
    city: string;
    state: string;
    size: string;
    owner: string;
  };
  onFilterChange: (filterKey: string, value: string) => void;
  onClearFilters: () => void;
}

export function CompanyFilters({
  searchTerm,
  onSearchChange,
  filters,
  onFilterChange,
  onClearFilters
}: CompanyFiltersProps) {
  const { data: salespeople } = useSalespeople();
  const hasActiveFilters = Object.values(filters).some(value => value !== "" && value !== "all");

  return (
    <Card className="p-4 mb-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtros de Pesquisa</span>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              className="ml-auto"
            >
              <X className="h-3 w-3 mr-1" />
              Limpar Filtros
            </Button>
          )}
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CNPJ, email, telefone..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Select value={filters.type} onValueChange={(value) => onFilterChange("type", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="Lead">Lead</SelectItem>
              <SelectItem value="Cliente">Cliente</SelectItem>
              <SelectItem value="Inativa">Inativa</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.sector} onValueChange={(value) => onFilterChange("sector", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Setor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os setores</SelectItem>
              <SelectItem value="Tecnologia">Tecnologia</SelectItem>
              <SelectItem value="Varejo">Varejo</SelectItem>
              <SelectItem value="Serviços">Serviços</SelectItem>
              <SelectItem value="Indústria">Indústria</SelectItem>
              <SelectItem value="Saúde">Saúde</SelectItem>
              <SelectItem value="Educação">Educação</SelectItem>
              <SelectItem value="Financeiro">Financeiro</SelectItem>
              <SelectItem value="Imobiliário">Imobiliário</SelectItem>
              <SelectItem value="Alimentício">Alimentício</SelectItem>
              <SelectItem value="Outro">Outro</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.city} onValueChange={(value) => onFilterChange("city", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Cidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as cidades</SelectItem>
              <SelectItem value="São Paulo">São Paulo</SelectItem>
              <SelectItem value="Rio de Janeiro">Rio de Janeiro</SelectItem>
              <SelectItem value="Belo Horizonte">Belo Horizonte</SelectItem>
              <SelectItem value="Salvador">Salvador</SelectItem>
              <SelectItem value="Brasília">Brasília</SelectItem>
              <SelectItem value="Curitiba">Curitiba</SelectItem>
              <SelectItem value="Recife">Recife</SelectItem>
              <SelectItem value="Porto Alegre">Porto Alegre</SelectItem>
              <SelectItem value="Fortaleza">Fortaleza</SelectItem>
              <SelectItem value="Manaus">Manaus</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.state} onValueChange={(value) => onFilterChange("state", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estados</SelectItem>
              <SelectItem value="SP">São Paulo</SelectItem>
              <SelectItem value="RJ">Rio de Janeiro</SelectItem>
              <SelectItem value="MG">Minas Gerais</SelectItem>
              <SelectItem value="BA">Bahia</SelectItem>
              <SelectItem value="DF">Distrito Federal</SelectItem>
              <SelectItem value="PR">Paraná</SelectItem>
              <SelectItem value="PE">Pernambuco</SelectItem>
              <SelectItem value="RS">Rio Grande do Sul</SelectItem>
              <SelectItem value="CE">Ceará</SelectItem>
              <SelectItem value="AM">Amazonas</SelectItem>
              <SelectItem value="SC">Santa Catarina</SelectItem>
              <SelectItem value="GO">Goiás</SelectItem>
              <SelectItem value="ES">Espírito Santo</SelectItem>
              <SelectItem value="MT">Mato Grosso</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.size} onValueChange={(value) => onFilterChange("size", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Porte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os portes</SelectItem>
              <SelectItem value="Microempresa">Microempresa</SelectItem>
              <SelectItem value="Pequena">Pequena</SelectItem>
              <SelectItem value="Média">Média</SelectItem>
              <SelectItem value="Grande">Grande</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.owner} onValueChange={(value) => onFilterChange("owner", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Vendedor/Gerente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os vendedores</SelectItem>
              {salespeople?.map((salesperson) => (
                <SelectItem key={salesperson.id} value={salesperson.id}>
                  {salesperson.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
}