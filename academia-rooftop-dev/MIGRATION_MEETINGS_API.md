# 🔄 Migração para Nova API de Reuniões - Ações do Progresso do Negócio

## 📋 **Objetivo**
Migrar as ações existentes no módulo `negocios-detalhe.module` para usar a nova API de reuniões (`/portal/meetings`), mantendo o fluxo atual de progresso dos negócios para alimentar corretamente o funil de vendas.

## 🎯 **Escopo da Migração**
- ✅ **INCLUIR**: Ações do progresso do negócio que geram dados para o funil
- ❌ **EXCLUIR**: Endpoints diversos, funcionalidades novas, melhorias de UX

---

## 📊 **Mapeamento de Ações Atuais → Nova API**

### **1️⃣ Marcar Visita (Lead inicial → Visita marcada)**

#### **Situação Atual:**
```javascript
// openMarcarReuniaoModal() - linha ~2865
fetch('https://n8n2.rooftop.com.br/webhook/portal/register-activities/meeting', {
  method: 'POST',
  // payload antigo...
})
```

#### **Nova Implementação:**
```javascript
// Migrar para: POST /portal/meetings
{
  "type": "visita_marcada",
  "title": "Visita - [Nome Cliente]",
  "start_time": "2025-09-10T10:00:00-03:00",
  "end_time": "2025-09-10T11:00:00-03:00", 
  "contact_id": "123456789",
  "ticket_id": "987654321",
  "description": "Visita para apresentação do produto"
}
```

### **2️⃣ Confirmar Visita Realizada (Visita marcada → Visita realizada)**

#### **Situação Atual:**
```javascript
// openReuniaoRealizadaModal() - linha ~2572
// Atualmente SÓ atualiza step, não registra meeting
```

#### **Nova Implementação:**
```javascript
// Adicionar: POST /portal/meetings/completed
{
  "contact_id": "123456789",
  "ticket_id": "987654321",
  "meeting_id": "88237206711",  // ID da visita marcada
  "notes": "Cliente demonstrou interesse",
  "outcome": "COMPLETED"
}
```

### **3️⃣ Registrar Envio de Documentos**

#### **Situação Atual:**
```javascript
// Upload de documentos - linha ~2724
fetch('https://n8n2.rooftop.com.br/webhook/portal/register-activities/meeting/OI - Entregou documentos', {
  // payload específico...
})
```

#### **Nova Implementação:**
```javascript
// Migrar para: POST /portal/meetings/completed (meeting já fechada)
{
  "type": "documentos_recebidos",
  "title": "Documentos Recebidos - [Nome Cliente]",
  "start_time": "2025-09-09T14:00:00-03:00",
  "end_time": "2025-09-09T14:00:00-03:00",
  "status": "COMPLETED",  // Já fechada
  "contact_id": "123456789",
  "ticket_id": "987654321",
  "description": "Documentos enviados pelo cliente"
}
```

### **4️⃣ Apresentação da Proposta**

#### **Situação Atual:**
```javascript
// openApresentacaoRealizadaModal() - linha ~3028
// Atualmente SÓ atualiza step, não registra meeting
```

#### **Nova Implementação:**
```javascript
// Criar: POST /portal/meetings/completed (meeting já fechada)
{
  "type": "apresentacao_realizada", 
  "title": "Apresentação Realizada - [Nome Cliente]",
  "start_time": "2025-09-09T15:00:00-03:00",
  "end_time": "2025-09-09T16:00:00-03:00",
  "status": "COMPLETED",
  "contact_id": "123456789",
  "ticket_id": "987654321",
  "description": "Apresentação da proposta ao cliente"
}
```

---

## 🔧 **Implementações Técnicas Necessárias**

### **Alta Prioridade - Migração Obrigatória:**

#### **1. Atualizar `openMarcarReuniaoModal()`**
- **Arquivo**: `negocios-detalhe.module/module.js:~2865`
- **Ação**: Trocar endpoint para `/portal/meetings`
- **Payload**: Usar novo formato da API
- **Resultado**: Meeting criada com status `SCHEDULED`

#### **2. Implementar `completarVisita()` no `openReuniaoRealizadaModal()`**
- **Arquivo**: `negocios-detalhe.module/module.js:~2572`
- **Ação**: Adicionar chamada para `/portal/meetings/completed`
- **Trigger**: Após confirmar visita realizada
- **Requisito**: Usar `meeting_id` da visita marcada

#### **3. Migrar Registro de Documentos**
- **Arquivo**: `negocios-detalhe.module/module.js:~2724`
- **Ação**: Trocar endpoint antigo para `/portal/meetings`
- **Comportamento**: Criar meeting já como `COMPLETED`
- **Tipo**: `documentos_recebidos`

#### **4. Implementar Registro de Apresentação**
- **Arquivo**: `negocios-detalhe.module/module.js:~3028`
- **Ação**: Adicionar criação de meeting no modal existente
- **Comportamento**: Criar meeting já como `COMPLETED`
- **Tipo**: `apresentacao_realizada`

---

## 📈 **Alimentação do Funil de Vendas**

### **Indicadores Afetados no `funil-vendas.module.js`:**

#### **1. Visitas Marcadas** 
- **Fonte**: Meetings com `type: "visita_marcada"` e `status: "SCHEDULED"`
- **API Field**: `visitas_marcadas`

#### **2. Visitas Realizadas**
- **Fonte**: Meetings com `type: "visita_marcada"` e `status: "COMPLETED"`  
- **API Field**: `visitas_realizadas`

#### **3. Documentos Recebidos**
- **Fonte**: Meetings com `type: "documentos_recebidos"` e `status: "COMPLETED"`
- **API Field**: `documentos_rececebidos` (manter typo da API)

#### **4. Apresentações Realizadas**
- **Fonte**: Meetings com `type: "apresentacao_realizada"` e `status: "COMPLETED"`
- **API Field**: `apresentacoes_realizadas` (manter typo da API)

---

## 🚧 **Etapas Controladas pelo Backoffice (NÃO MIGRAR)**

### **Etapas que permanecem sem API:**
- ✋ **Avaliação do imóvel** - Só backoffice move para "Apresentação da proposta"
- ✋ **Análise de crédito** - Backoffice controla aprovação/rejeição  
- ✋ **Aprovação final** - Backoffice finaliza processo
- ✋ **Reajuste de proposta** - Backoffice processa solicitações

### **Ações do franqueado nessas etapas:**
- 📞 **Contato via WhatsApp** - Manter botões atuais
- 📋 **Aguardar processing** - Status passivo, sem meeting

---

## ⚡ **Outras Ações que Precisam de Meeting (Identificadas)**

### **5️⃣ Ligações/Contatos Telefônicos**
- **Situação**: Atualmente não registradas como meetings
- **Implementação Futura**: `type: "ligacao"` → `"T.A (Ligação)"`
- **Localização**: Onde houver botões de "Entrar em contato"

### **6️⃣ Follow-ups e Reagendamentos**  
- **Situação**: Não implementados ainda
- **Implementação Futura**: Status `RESCHEDULED`, `NO_SHOW`, `CANCELED`

---

## 🎯 **Resultado Final**

### **Após a Migração:**

#### **Fluxo Completo com Meetings:**
1. **Lead inicial** → `Marcar Visita` → Meeting `SCHEDULED`
2. **Visita marcada** → `Confirmar Realizada` → Meeting `COMPLETED`  
3. **Aguardando docs** → `Upload Docs` → Meeting `COMPLETED` (`documentos_recebidos`)
4. **Apresentação** → `Confirmar Apresentação` → Meeting `COMPLETED` (`apresentacao_realizada`)

#### **Funil de Vendas Alimentado:**
- ✅ Dados consistentes da nova API de meetings
- ✅ Indicadores corretos por período
- ✅ Rastreamento completo do pipeline de vendas
- ✅ Base sólida para dashboards e relatórios

---

## 📝 **Checklist de Implementação**

### **Etapa 1 - Meetings Básicas:**
- [ ] Migrar `openMarcarReuniaoModal()` para `/portal/meetings`
- [ ] Adicionar `completarVisita()` no modal de visita realizada
- [ ] Testar fluxo completo: agendar → completar

### **Etapa 2 - Documentos e Apresentação:**
- [ ] Migrar registro de documentos para meetings
- [ ] Implementar meeting na apresentação da proposta
- [ ] Validar tipos corretos na API (`documentos_recebidos`, `apresentacao_realizada`)

### **Etapa 3 - Validação do Funil:**
- [ ] Confirmar que API retorna meetings no dashboard
- [ ] Testar indicadores no `funil-vendas.module.js`
- [ ] Verificar consistência dos dados por período

### **Etapa 4 - Tratamento de Erros:**
- [ ] Implementar tratamento 400/404/500 da nova API
- [ ] Fallback em caso de falha na criação de meetings
- [ ] Logs detalhados para debugging

---

## 🚨 **Pontos Críticos**

### **⚠️ ATENÇÃO:**
1. **Meeting ID**: Guardar ID da visita marcada para usar no `/completed`
2. **Timezone**: API usa `América/São_Paulo (-03:00)`
3. **Typos da API**: Manter `documentos_rececebidos` e `apresentacoes_realizadas`
4. **Backward Compatibility**: Manter endpoints antigos funcionando durante transição

### **✅ VALIDAÇÕES:**
- Contact ID e Ticket ID sempre presentes
- Datas no formato ISO correto com timezone
- Status transitions válidas (SCHEDULED → COMPLETED)
- Tipos de meeting conforme documentação da API