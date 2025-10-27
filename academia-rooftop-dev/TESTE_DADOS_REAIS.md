# Guia para Teste com Dados Reais

Este guia explica como testar o módulo de negócios com dados reais do HubSpot CRM.

## 🔧 Configuração Inicial

### 1. Verificar Configuração do HubSpot

Certifique-se de que seu HubSpot tem:
- ✅ CRM ativo
- ✅ Negócios (deals) cadastrados
- ✅ Permissões de acesso aos dados
- ✅ API GraphQL habilitada

### 2. Verificar Query GraphQL

A query `myDeals.graphql` deve estar configurada corretamente:

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

## 🧪 Como Testar

### Método 1: Usando Controles de Debug

1. **Acesse a página** onde o módulo está implementado
2. **Adicione `?debug=true`** na URL para mostrar os controles de debug
3. **Clique em "Forçar Dados Reais"** para testar com dados reais
4. **Clique em "Usar Dados Mock"** para testar com dados simulados

### Método 2: Console do Navegador

1. **Abra o console** do navegador (F12)
2. **Procure por logs** que começam com "DealsModule:"
3. **Verifique o status** de cada tentativa de carregamento

### Método 3: Verificar API do HubSpot

1. **Acesse o HubSpot Developer Tools**
2. **Teste a query GraphQL** diretamente
3. **Verifique se retorna dados** no formato esperado

## 📊 Logs de Debug

O módulo gera logs detalhados no console:

```
DealsModule: Inicializando módulo
DealsModule: Iniciando carregamento de dados
DealsModule: Tentando usar hubspot.dataQueries...
DealsModule: Data query executada com sucesso!
DealsModule: Processando 5 negócios
DealsModule: Renderizando 5 negócios...
DealsModule: Negócios renderizados com sucesso!
```

## 🔍 Troubleshooting

### Problema: "Data query falhou"
**Solução:**
- Verifique se a query GraphQL está correta
- Confirme se há dados no CRM
- Verifique permissões de acesso

### Problema: "GraphQL falhou"
**Solução:**
- Teste a query no GraphQL Playground do HubSpot
- Verifique se a API está habilitada
- Confirme a sintaxe da query

### Problema: "API REST falhou"
**Solução:**
- Esta é uma tentativa de fallback
- Normalmente não é necessária se GraphQL funciona
- Pode ser ignorada se outros métodos funcionam

### Problema: "Nenhum negócio encontrado"
**Solução:**
- Verifique se há deals no CRM
- Confirme se os campos estão preenchidos
- Teste com dados mock primeiro

## 🎯 Testando Diferentes Cenários

### Cenário 1: Dados Reais Existentes
1. Certifique-se de ter deals no CRM
2. Teste com "Forçar Dados Reais"
3. Verifique se os dados são exibidos corretamente

### Cenário 2: Sem Dados Reais
1. Teste com "Usar Dados Mock"
2. Verifique se os dados mock são exibidos
3. Confirme que o fallback funciona

### Cenário 3: Erro de API
1. Simule um erro (desconecte internet)
2. Verifique se o fallback para mock funciona
3. Confirme que a mensagem de erro é exibida

## 📝 Checklist de Teste

- [ ] Controles de debug aparecem com `?debug=true`
- [ ] "Forçar Dados Reais" carrega dados do CRM
- [ ] "Usar Dados Mock" carrega dados simulados
- [ ] Logs aparecem no console
- [ ] Estados de loading funcionam
- [ ] Estados de erro funcionam
- [ ] Cards de negócios são renderizados
- [ ] Estatísticas resumo são calculadas
- [ ] Design responsivo funciona
- [ ] Botões de ação funcionam

## 🚀 Próximos Passos

Após confirmar que funciona com dados reais:

1. **Remover controles de debug** para produção
2. **Otimizar performance** se necessário
3. **Adicionar mais funcionalidades** (filtros, busca, etc.)
4. **Implementar cache** para melhor performance
5. **Adicionar testes automatizados**

## 📞 Suporte

Se encontrar problemas:

1. **Verifique os logs** no console
2. **Teste a query GraphQL** diretamente
3. **Confirme a configuração** do HubSpot
4. **Use dados mock** para isolar o problema
5. **Consulte a documentação** do HubSpot CMS 