# 📋 Plano: Módulo de Atividades para Negócios

## 🎯 **Objetivo**
Criar um módulo HubSpot para exibir e registrar atividades de follow-up relacionadas aos negócios no sistema Academia Rooftop.

## 📊 **Análise dos Agentes Especializados**

### **Requisitos Funcionais Identificados:**
- **Exibição de atividades** em duas abas (Próximas e Histórico)
- **Criação de novas atividades** via modal responsivo
- **Tipos de atividade**: Ligação, E-mail, Reunião, Anotação, Tarefa
- **Gestão de status**: Pendente, Concluída, Cancelada
- **Integração contextual** com negocios-detalhe.module

### **Requisitos Não-Funcionais:**
- **Performance**: < 2 segundos para listar até 50 atividades
- **Paginação**: Implementar para > 20 atividades por aba
- **Responsividade**: Mobile-first (breakpoint 992px)
- **Acessibilidade**: ARIA labels e navegação por teclado
- **Segurança**: Validação client-side e server-side

### **Arquitetura Técnica Definida:**
- **HubSpot CRM Activities API** para persistência de dados
- **N8N webhooks** seguindo padrão existente do projeto
- **Event Bus pattern** para comunicação entre módulos
- **Fallback para mock data** durante desenvolvimento

## 🛠️ **Implementação Planejada**

### **1. Estrutura do Módulo**
```
modules/negocio-atividades.module/
├── module.html          # Interface com abas e modais
├── module.js            # Lógica JavaScript modular
├── module.css           # Estilos Tailwind + customizações
├── meta.json            # Configuração do módulo
├── fields.json          # Campos editáveis (vazio)
└── _locales/pt/messages.json  # Localização PT-BR
```

### **2. Funcionalidades Core**

#### **Exibição de Atividades**
- Lista organizada em duas abas: "Próximas" e "Histórico"
- Filtros por tipo, status, prioridade e data
- Cards com informações resumidas (título, tipo, data, responsável)
- Estados visuais: Loading skeletons, Empty state, Error state

#### **Criação de Atividades**
- Modal responsivo com formulário validado
- Campos obrigatórios: Tipo, Título, Data/Hora
- Campos opcionais: Descrição, Prioridade, Responsável, Duração
- Templates pré-configurados para contexto imobiliário brasileiro

#### **Gestão de Status**
- Botão "Concluir" para tarefas pendentes
- Modal de visualização detalhada
- Histórico de alterações com timestamps
- Soft delete para exclusões

### **3. Integração com Sistema Existente**

#### **Comunicação entre Módulos**
```javascript
// Event Bus para receber dealId do negocios-detalhe.module
window.addEventListener('dealContextChange', function(event) {
  this.state.currentDealId = event.detail.dealId;
  this.loadActivities();
}.bind(this));
```

#### **N8N Endpoints Necessários**
- `GET /get-deal-activities` - Buscar atividades do deal
- `POST /create-activity` - Criar nova atividade
- `PUT /update-activity` - Atualizar atividade
- `DELETE /delete-activity` - Remover atividade

#### **Schema HubSpot CRM**
```javascript
const activityProperties = {
  hs_activity_type: 'CALL|EMAIL|MEETING|NOTE|TASK',
  hs_timestamp: 'Unix timestamp',
  activity_outcome: 'positivo|neutro|negativo|pendente',
  next_action_required: 'boolean',
  priority_level: 'LOW|MEDIUM|HIGH|URGENT',
  activity_description: 'text'
};
```

### **4. Interface e UX**

#### **Design System**
- **Cores por prioridade**: Alta (vermelho), Média (amarelo), Baixa (cinza)
- **Ícones contextuais**: phone, mail, calendar, note, check
- **Badges de status**: pendente, concluída, cancelada
- **Tipografia**: Inter (seguindo tema Academia)

#### **Templates de Atividade Pré-configurados**
- **Visita Técnica**: Template para agendamento de visitas
- **Follow-up Proposta**: Acompanhamento de propostas apresentadas
- **Coleta Documentos**: Checklist de documentação necessária
- **Apresentação Produtos**: Reunião com cliente

#### **Estados Visuais**
```javascript
// Loading state com skeleton
this.showLoadingSkeleton();

// Empty state contextual
this.showEmptyState('Nenhuma atividade encontrada');

// Error state com retry
this.showErrorState('Erro ao carregar', this.retryLoad.bind(this));
```

### **5. Performance e Qualidade**

#### **Otimizações**
- **Cache local**: 5 minutos para atividades carregadas
- **Paginação incremental**: 20 atividades por página
- **Lazy loading**: Detalhes carregados sob demanda
- **Debounce**: 300ms para filtros de busca

#### **Error Handling**
```javascript
handleAPIError: function(error, context) {
  console.error(`❌ [negocio-atividades] ${context}:`, error);

  // Fallback para mock data
  if (context === 'loadActivities') {
    return this.getMockActivities();
  }

  // Toast de erro amigável
  this.showToast('Erro ao carregar atividades. Usando dados de exemplo.', 'warning');
}
```

#### **Mock Data para Desenvolvimento**
```javascript
getMockActivities: function() {
  return [
    {
      id: 'mock-1',
      type: 'CALL',
      title: 'Ligação inicial - Apresentação da proposta HomeCash',
      description: 'Primeira ligação para apresentar os benefícios do HomeCash',
      outcome: 'positivo',
      timestamp: Date.now() - (24 * 60 * 60 * 1000),
      contact_name: 'Maria Silva',
      next_action_required: true,
      next_action_date: Date.now() + (2 * 24 * 60 * 60 * 1000),
      priority: 'HIGH',
      status: 'completed'
    },
    {
      id: 'mock-2',
      type: 'MEETING',
      title: 'Agendamento de vistoria técnica',
      description: 'Visita ao imóvel para avaliação técnica',
      outcome: 'pendente',
      timestamp: Date.now() + (3 * 24 * 60 * 60 * 1000),
      contact_name: 'João Santos',
      next_action_required: false,
      priority: 'MEDIUM',
      status: 'pending'
    }
  ];
}
```

## 🔄 **Fluxo de Dados**

### **1. Inicialização**
```
negocios-detalhe.module carrega →
Event Bus notifica dealId →
negocio-atividades.module recebe →
Busca atividades via N8N →
Renderiza interface
```

### **2. Criação de Atividade**
```
Usuário clica "Nova Atividade" →
Modal abre com formulário →
Validação client-side →
POST para N8N →
Atualização HubSpot CRM →
Refresh da lista →
Toast de confirmação
```

### **3. Conclusão de Tarefa**
```
Usuário clica "Concluir" →
Confirmação via modal →
PUT para N8N (status = completed) →
Atualização visual →
Movimento para aba "Histórico"
```

## 📝 **Validações e Regras de Negócio**

### **Validações de Formulário**
- **Título**: 5-200 caracteres, obrigatório
- **Descrição**: Máximo 1000 caracteres
- **Data/Hora**: Não pode ser anterior à data atual
- **Tipo**: Lista fechada (call/email/meeting/note/task)
- **Prioridade**: Lista fechada (low/medium/high/urgent)

### **Regras de Negócio**
- **Visibilidade**: Usuário só vê atividades dos seus negócios
- **Edição**: Criador pode editar apenas atividades não concluídas
- **Exclusão**: Soft delete (status = 'cancelled')
- **Histórico**: Log de todas as alterações com timestamps

## 🎨 **Considerações UX/UI - Contexto Imobiliário Brasileiro**

### **Linguagem e Terminologia**
- **Português BR**: Interface totalmente localizada
- **Termos específicos**: "Visita ao imóvel", "Apresentação da proposta", "Documentação"
- **Datas BR**: Formato dd/mm/yyyy hh:mm
- **Moeda**: R$ quando aplicável

### **Indicadores Visuais**
- **Timeline visual**: Atividades organizadas cronologicamente
- **Relacionamento**: Link visual com etapas do negócio
- **Métricas**: Contador de atividades por status na interface

## ✅ **Entregáveis**

### **Arquivos do Módulo**
1. **module.html** - Interface completa com abas e modais
2. **module.js** - Lógica JavaScript seguindo padrões do projeto
3. **module.css** - Estilos Tailwind + customizações específicas
4. **meta.json** - Configuração e metadados do módulo
5. **fields.json** - Arquivo vazio seguindo padrão
6. **_locales/pt/messages.json** - Localização portuguesa

### **Documentação**
1. **README_ATIVIDADES.md** - Guia de uso e configuração
2. **Comentários no código** - Documentação inline
3. **Mock data examples** - Dados de exemplo para desenvolvimento

### **Testes e Validação**
1. **Teste de integração** com negocios-detalhe.module
2. **Validação responsiva** em dispositivos móveis
3. **Teste de performance** com múltiplas atividades
4. **Validação de acessibilidade** (ARIA, keyboard navigation)

## 🚀 **Cronograma de Implementação**

### **Fase 1: Estrutura Base (2 horas)**
- Criar arquivos do módulo (meta.json, fields.json)
- Estrutura HTML básica com abas
- CSS inicial com Tailwind

### **Fase 2: Lógica JavaScript (3 horas)**
- Implementar padrão modular
- Event Bus para comunicação
- CRUD de atividades via N8N
- Mock data para desenvolvimento

### **Fase 3: Interface e UX (2 horas)**
- Modais responsivos
- Estados visuais (loading, error, empty)
- Validações de formulário
- Toasts de feedback

### **Fase 4: Integração e Testes (1 hora)**
- Integração com negocios-detalhe.module
- Testes de funcionalidade
- Validação responsiva
- Ajustes finais

**Estimativa Total**: ~8 horas de desenvolvimento
**Prioridade**: Alta (funcionalidade core para gestão de negócios)

## 🚨 **Riscos e Mitigações**

### **Riscos Técnicos**
- **Performance HubDB**: Muitas consultas podem impactar performance
  - *Mitigação*: Cache inteligente de 5 minutos
- **Rate Limits**: Limites de API do HubSpot
  - *Mitigação*: Batch operations e throttling
- **Dependência N8N**: Sistema depende de webhook externo
  - *Mitigação*: Fallback robusto para mock data

### **Riscos de UX**
- **Complexidade de interface**: Muitas funcionalidades podem confundir
  - *Mitigação*: Progressive disclosure e templates pré-configurados
- **Performance mobile**: Loading lento em dispositivos móveis
  - *Mitigação*: Lazy loading e paginação otimizada

## 📊 **Métricas de Sucesso**

### **Performance**
- **Tempo de carregamento**: < 2 segundos para 50 atividades
- **Responsividade**: Funcional em dispositivos com largura ≥ 320px
- **Uptime**: 99.9% de disponibilidade (dependente do N8N)

### **Usabilidade**
- **Taxa de conclusão**: Usuários conseguem criar atividades em < 30 segundos
- **Taxa de erro**: < 5% de erro em formulários submetidos
- **Satisfação**: Interface intuitiva para contexto imobiliário brasileiro

### **Integração**
- **Compatibilidade**: 100% compatível com negocios-detalhe.module
- **Sincronização**: Dados sempre sincronizados com HubSpot CRM
- **Fallback**: Funcional mesmo com N8N indisponível (modo mock)