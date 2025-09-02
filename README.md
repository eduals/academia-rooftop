# Módulo de Negócios (Deals Module)

Este módulo exibe uma lista de negócios do HubSpot CRM com interface moderna e responsiva.

## Funcionalidades

- ✅ Lista de negócios em cards visuais
- ✅ Informações detalhadas (valor, estágio, data, responsável)
- ✅ Estatísticas resumo (total, valor total, ganhos, abertos)
- ✅ Design responsivo e moderno
- ✅ Estados de loading e erro
- ✅ Integração com GraphQL do HubSpot
- ✅ Dados mock para desenvolvimento

## Como Usar

### 1. Adicionar o Módulo a uma Página

```hubl
{% dnd_module
  path="/academia-rooftop/modules/dealsModule",
  label="Módulo de Negócios"
%}
{% end_dnd_module %}
```

### 2. Estrutura de Arquivos

```
dealsModule.module/
├── module.html          # Template HTML
├── module.js            # Lógica JavaScript
├── module.css           # Estilos CSS
├── meta.json            # Configuração do módulo
├── fields.json          # Campos do módulo (vazio)
└── README.md            # Esta documentação
```

### 3. Query GraphQL

O módulo usa a query `myDeals.graphql` que retorna:

```graphql
query myDeals {
  CRM {
    deal_collection {
      items {
        id
        dealname
        amount
        dealstage
        closedate
        dealowner
        pipeline
      }
    }
  }
}
```

### 4. Dados Esperados

O módulo espera receber dados no formato:

```javascript
{
  data: {
    CRM: {
      deal_collection: {
        items: [
          {
            id: "123",
            dealname: "Nome do Negócio",
            amount: 5000,
            dealstage: "closedwon",
            closedate: "2024-01-15",
            dealowner: "João Silva",
            pipeline: "Vendas de Cursos"
          }
        ]
      }
    }
  }
}
```

## Estados do Módulo

### Loading
- Exibe um spinner de carregamento
- Mostra mensagem "Carregando negócios..."

### Erro
- Exibe mensagem de erro
- Fundo vermelho claro
- Logs no console para debugging

### Vazio
- Exibe mensagem "Nenhum negócio encontrado"
- Design limpo e informativo

### Sucesso
- Renderiza cards de negócios
- Exibe estatísticas resumo
- Interface interativa

## Estágios de Negócio

O módulo suporta os seguintes estágios com cores específicas:

- `appointmentscheduled` - Azul
- `qualifiedtobuy` - Amarelo
- `presentationscheduled` - Roxo
- `decisionmakerboughtin` - Índigo
- `contractsent` - Laranja
- `closedwon` - Verde
- `closedlost` - Vermelho

## Personalização

### CSS
Os estilos podem ser personalizados editando `module.css`:

```css
.deal-card {
  /* Personalizar cards */
}

.deal-button {
  /* Personalizar botões */
}
```

### JavaScript
A lógica pode ser modificada em `module.js`:

```javascript
// Personalizar formatação de moeda
formatCurrency: function(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
}
```

## Desenvolvimento

### Dados Mock
Para desenvolvimento, o módulo inclui dados mock que são usados quando a API do HubSpot não está disponível.

### Debugging
- Abra o console do navegador para ver logs
- Verifique se a query GraphQL está retornando dados
- Teste com dados mock primeiro

## Compatibilidade

- ✅ HubSpot CMS
- ✅ Navegadores modernos
- ✅ Dispositivos móveis
- ✅ GraphQL API do HubSpot

## Próximos Passos

1. Implementar filtros por estágio
2. Adicionar paginação
3. Implementar busca
4. Adicionar exportação de dados
5. Integrar com outras APIs

## Suporte

Para dúvidas ou problemas, consulte:
- Documentação do HubSpot CMS
- Console do navegador para erros
- Logs do módulo JavaScript 



## dados tipados para serem usados
## Use os seguintes objetivos e envie o label para o endpoint
 getPrincipaisObjetivos: function() {
      return [
          { value: 'quero_investir_em_minha_empresa_usando_meu_imovel', label: 'Quero investir em minha empresa' },
          { value: 'quero_quitar_as_dividas_usando_meu_imovel', label: 'Quero quitar as dívidas usando meu imóvel' },
          { value: 'quero_somente_vender_meu_imovel', label: 'Quero somente vender meu imóvel' },
          { value: 'tenho_outros_objetivos_financeiros', label: 'Tenho outros objetivos financeiros' },
          { value: 'quero_comprar_imoveis_rooftop', label: 'Quero comprar imóveis Rooftop' },
          { value: 'Quero reduzir o valor da minha dívida', label: 'Quero reduzir o valor da minha dívida' },
          { value: 'Quero regularizar pendências jurídicas', label: 'Quero regularizar pendências jurídicas' }
      ];
    },

## Use os seguintes tipos de imoveis
'tipo_de_imovel': [
    {"label":"Apartamento","value":"Apartamento","displayOrder":0},
    {"label":"Apartamento Duplex","value":"Apartamento Duplex","displayOrder":1},
    {"label":"Apartamento Cobertura","value":"Apartamento Cobertura","displayOrder":2},
    {"label":"Casa de Rua","value":"Casa","displayOrder":3},
    {"label":"Casa em Condomínio","value":"Casa em Condomínio","displayOrder":4},
    {"label":"Terreno","value":"Terreno","displayOrder":5},
    {"label":"Sala Comercial","value":"Sala Comercial","displayOrder":6}
]

Campo: motivo_da_perda
Label: Nome interno
Valor de avaliação: Valor de avaliação
Valor do aluguel: Valor do aluguel
Valor de liquidez: Valor de liquidez
Sem necessidade imediata - Interessado: Sem necessidade imediata - Interessado
Prazo de recompra: Prazo de recompra
Produtos de mercado - Venda do imóvel: Produtos de mercado - Venda do imóvel
Produtos de mercado - Empréstimo: Produtos de mercado - Empréstimo
Produtos de mercado - Outros: Produtos de mercado - Outros
Influências familiares: Influências familiares
Contato sem sucesso: Contato sem sucesso
Cliente parou de responder: Cliente parou de responder
Dados incorretos: Dados incorretos
Não informou o motivo: Não informou o motivo
Pediu para descartar: Pediu para descartar
Outros: Outros



## Use essas faixas de valores ao inves de inserir o valor do imovel
Abaixo de R$ 500 mil: Abaixo de R$ 500 mil
De R$ 501 mil a R$ 800 mil: De R$ 501 mil a R$ 800 mil
De R$ 801 mil a R$ 1 milhão: De R$ 801 mil a R$ 1 milhão
De R$ 1 milhão a R$ 3 milhões: De R$ 1 milhão a R$ 3 milhões
De R$ 3 milhões a R$ 6 milhões: De R$ 3 milhões a R$ 6 milhões


## Todos
[x]Logo correto no header
[x]Formatacao da pagina de login
[]Tirando condicionais para exibir dados de teste
[x]Subir e testar o formulario de cadastro do imovel
[-]Mexer nas automacoes do fluxo de criacao e atribuicao.
[] Incluir o CPF no cadastro e a regra de deduplicacao.
[] Alterar ação Descartar para Finalizar e dar a opcao de descartar e perder - explicar os conceitos.
