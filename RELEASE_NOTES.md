# Release Notes

## Filtro Multi-Select de Status - Negócios

### Novidades
- **Filtro de status aprimorado**: Agora é possível selecionar múltiplos status simultaneamente através de um dropdown com checkboxes
- **Seleção rápida**: Botões "Selecionar todos" e "Deselecionar todos" para facilitar a seleção em massa
- **Status pré-selecionados**: Por padrão, todos os status vêm selecionados, exceto "Perdido" e "Descartado"

### Melhorias
- Interface mais intuitiva para filtrar negócios por status
- Visualização clara de quantos status estão selecionados
- Dropdown permanece aberto durante a seleção para facilitar o uso

---

## Melhorias no Agendamento e Visualização de Propostas

### Validação de Agendamento da 2ª Reunião
- **Campo de data/hora obrigatório**: O sistema agora exige que a data e hora sejam preenchidas antes de permitir o agendamento da 2ª reunião
- **Prevenção de erros**: Evita que reuniões sejam agendadas sem data/hora, resolvendo casos onde o franqueado clicava sem preencher e não conseguia editar depois
- **Feedback visual**: O campo mostra claramente quando está faltando informação

### Ajustes na Nomenclatura de Propostas para Imóveis Acima de R$ 2 milhões
- **Renomeação automática**: Para imóveis com valor igual ou superior a R$ 2 milhões, a etapa "Segunda proposta cliente" agora é exibida como "Proposta Comitê Investidor"
- **Clareza no processo**: A nomenclatura reflete melhor que esta é a única proposta disponível para imóveis de alto valor, já que passou diretamente pelo comitê investidor

### Ocultação de Informações Prematuras
- **Resumo da Aprovação**: A seção "Resumo da Aprovação pós comitê investidor" só aparece quando o negócio já chegou ou passou pela etapa "Proposta Comitê Investidor"
- **Experiência mais limpa**: Evita confusão mostrando informações que ainda não são relevantes para a etapa atual do negócio

---

## Ajustes no Fluxo de Avaliação e Valores (Fluxo 2 - Acima de R$ 2 milhões)

### Implementações Baseadas nos Comentários do Neder

#### PARTE 1: Campo Valor de Liquidez (Bruto)
- **✅ Campo adicionado no Comitê Interno**: O box "Valores de Avaliação pós comitê interno" agora exibe o campo "Valor de Liquidez (Bruto)" além do "Valor de Liquidez (Líquido)" para permitir comparação posterior
- **✅ Campo adicionado no Comitê Investidor**: O box "Resumo da Aprovação pós comitê investidor" também exibe o "Valor de Liquidez (Bruto)" no mesmo formato, permitindo que o franqueado compare os valores entre os dois comitês
- **Nota sobre notificação**: A notificação para precificacao@rooftop.com.br é gerenciada via workflow do HubSpot, que é disparado automaticamente pela criação da meeting de avaliação externa

#### PARTE 3: Lógica de Exibição para Fluxo 2 (Acima de R$ 2 milhões)
- **✅ Ocultação de valores na fase de Avaliação Externa**: Para imóveis acima de R$ 2 milhões, os valores do box "Valores de Avaliação do Comitê Interno" são ocultados durante a etapa "Avaliação externa", mesmo que já estejam preenchidos no backend
- **✅ Primeira proposta não disponível no Fluxo 2**: A primeira proposta não é exibida para imóveis acima de R$ 2 milhões, pois neste fluxo a proposta só é gerada após o comitê investidor
- **✅ Exibição condicional baseada em valores do comitê investidor**: Como o card permanece na etapa "Avaliação externa" mesmo após aprovação do comitê investidor, a exibição é baseada na presença de valores preenchidos:
  - Quando os valores do comitê investidor estão preenchidos (compra e locação), o sistema exibe:
    - Todos os valores do box "Valores de Avaliação do Comitê Interno"
    - Botão da 1ª proposta (usando o link da proposta final do comitê investidor - mesma da 2ª)
    - Todos os valores do box "Valores de Avaliação do Comitê Investidor"
    - Botão da 2ª proposta (usando o link da proposta final do comitê investidor)
- **Observação**: No fluxo 2, nunca é disponibilizada a primeira proposta separadamente - apenas a segunda proposta após o comitê investidor aprovar. A primeira proposta exibida é uma repetição da segunda para manter consistência visual

### Implementações Baseadas nos Comentários do Giovanni

#### Validação de Data/Hora na Avaliação Externa
- **✅ Campo obrigatório**: O campo de data e hora na solicitação de avaliação externa é obrigatório e não permite submissão sem preenchimento
- **✅ Validação aprimorada**: Sistema valida formato e exige preenchimento completo, evitando casos onde o franqueado clicava sem data e hora e não conseguia editar depois
- **✅ Feedback visual**: O campo mostra claramente quando está faltando informação e recebe destaque visual em caso de erro

#### Nomenclatura para Imóveis Acima de R$ 2 milhões
- **✅ Renomeação automática**: Para imóveis acima de R$ 2 milhões, a etapa "Segunda proposta cliente" é exibida como "Proposta Comitê Investidor"
- **✅ Descrição atualizada**: A descrição da etapa também é atualizada para refletir que esta é a proposta que passou pelo comitê investidor
- **Clareza no processo**: A nomenclatura reflete que para imóveis acima de R$ 2 milhões, o franqueado terá apenas uma proposta (que já passou pelo comitê mais fundo), não sendo uma "segunda proposta"

### Correções Técnicas
- **Correção de blur**: O campo "Valor de Liquidez (Bruto)" no box do comitê investidor agora aplica corretamente o efeito de blur quando os valores ainda não estão disponíveis, mantendo consistência visual com os outros campos
- **Correção de template strings**: Resolvido problema de template strings aninhadas que impedia a página de carregar corretamente
- **Escape de caracteres**: URLs de propostas agora são corretamente escapadas para evitar problemas de sintaxe JavaScript

---

## Em Estudo / Próximas Implementações

### Visualização Organizada de Múltiplas Propostas
**Solicitado por**: Giovanni  
**Status**: Em estudo

- **Exibição separada das três propostas**: Implementar visualização clara e organizada de:
  - Primeira proposta - Comitê interno
  - Segunda proposta - Comitê investidor
  - Terceira proposta - Reajuste/contra-proposta
- **Objetivo**: Facilitar a visualização e acesso a todos os arquivos de propostas de forma organizada e intuitiva
- **Observação**: Esta funcionalidade requer análise da estrutura de dados e definição de como identificar e organizar as diferentes versões de propostas

### Notificação para Time de Precificação
**Solicitado por**: Neder  
**Status**: Gerenciado via workflow do HubSpot

- **Notificação automática**: Após o franqueado sugerir data/hora para vistoria, notificar o time de precificacao@rooftop.com.br
- **Objetivo**: Permitir que o time de precificação inclua a nova avaliação externa na planilha de controle de agendamento com Ermosso
- **Observação**: Atualmente esta funcionalidade é gerenciada via workflow do HubSpot que é disparado pela criação da meeting de avaliação externa. Se necessário, pode ser implementada notificação adicional direta no código

