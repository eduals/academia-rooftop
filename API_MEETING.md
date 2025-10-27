# 📋 Portal de Franqueados - API de Reuniões

## 🎯 Endpoints Disponíveis

### **1️⃣ Criar Reunião (Agendada)**
```
POST /portal/meetings
```

#### 📥 **Request Body:**
```json
{
  "type": "visita_marcada",
  "title": "Visita - João Silva",
  "start_time": "2025-09-10T10:00:00-03:00",
  "end_time": "2025-09-10T11:00:00-03:00",
  "contact_id": "123456789",
  "ticket_id": "987654321",
  "description": "Visita para apresentação do imóvel"
}
```

#### 📤 **Response (Success 201):**
```json
{
  "success": true,
  "data": {
    "id": "88237206711",
    "type": "visita_marcada",
    "title": "Visita - João Silva + T.A (Marcar visita)",
    "start_time": "2025-09-10T10:00:00-03:00",
    "end_time": "2025-09-10T11:00:00-03:00",
    "status": "SCHEDULED",
    "contact_id": "123456789",
    "ticket_id": "987654321",
    "description": "Visita para apresentação do imóvel",
    "created_at": "2025-09-09T16:07:56-03:00",
    "hubspot_data": {
      "hs_object_id": "88237206711",
      "hs_meeting_outcome": "SCHEDULED",
      "hs_activity_type": "T.A (Marcar visita)",
      "hs_meeting_source": "CRM_UI",
      "hs_object_source": "INTEGRATION"
    }
  }
}
```

---

### **2️⃣ Criar Reunião Concluída (Fechar)**
```
POST /portal/meetings/completed
```

#### 📥 **Request Body (Simplificado):**
```json
{
  "contact_id": "123456789",
  "ticket_id": "987654321", 
  "meeting_id": "88237206711",
  "notes": "Cliente demonstrou muito interesse, solicitou proposta",
  "end_time": "2025-09-09T15:30:00-03:00",
  "outcome": "COMPLETED"
}
```

#### 📤 **Response (Success 200):**
```json
{
  "success": true,
  "data": {
    "meeting_id": "88237206711",
    "status": "COMPLETED",
    "end_time": "2025-09-09T15:30:00-03:00",
    "notes": "Cliente demonstrou muito interesse, solicitou proposta",
    "updated_at": "2025-09-09T15:45:00-03:00",
    "hubspot_data": {
      "hs_meeting_outcome": "COMPLETED",
      "hs_outcome_completed_count": "1",
      "hs_meeting_body": "Cliente demonstrou muito interesse, solicitou proposta"
    }
  }
}
```

---

### **3️⃣ Listar Todas as Reuniões**
```
GET /portal/meetings
GET /portal/meetings?franqueado_id=123
```

#### 📤 **Response (Success 200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "88237206711",
      "type": "visita_marcada",
      "title": "Visita - João Silva + T.A (Marcar visita)",
      "start_time": "2025-09-10T10:00:00-03:00",
      "end_time": "2025-09-10T11:00:00-03:00",
      "status": "COMPLETED",
      "contact_id": "123456789",
      "ticket_id": "987654321",
      "created_at": "2025-09-09T16:07:56-03:00",
      "hubspot_data": {
        "hs_meeting_outcome": "COMPLETED",
        "hs_activity_type": "T.A (Marcar visita)",
        "hs_outcome_completed_count": "1",
        "hs_outcome_scheduled_count": "0"
      }
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 100
  }
}
```

---

### **4️⃣ Filtrar Reuniões**
```
GET /portal/meetings/filter
```

#### 📥 **Query Parameters:**
```
?type=visita_marcada
&status=COMPLETED
&date_from=2025-09-01
&date_to=2025-09-30
&contact_id=123456789
&ticket_id=987654321
```

#### 📤 **Response (Success 200):**
```json
{
  "success": true,
  "filters_applied": {
    "type": "visita_marcada",
    "status": "COMPLETED",
    "date_range": "2025-09-01 to 2025-09-30"
  },
  "data": [
    {
      "id": "88237206711",
      "type": "visita_marcada", 
      "title": "Visita - João Silva + T.A (Marcar visita)",
      "status": "COMPLETED",
      "start_time": "2025-09-10T10:00:00-03:00",
      "contact_id": "123456789",
      "ticket_id": "987654321"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 100
  }
}
```
---

## 🔧 **Mapeamento de Tipos de Atividades**

```json
{
  "visita_marcada": "T.A (Marcar visita)",
  "apresentacao_realizada": "PC - Realizado",
  "documentos_recebidos": "OI - Entregou documentos",
  "ligacao": "T.A (Ligação)"
}
```

## 📊 **Status Possíveis**

| Status | Descrição | HubSpot Value |
|--------|-----------|---------------|
| `SCHEDULED` | Reunião agendada | `SCHEDULED` |
| `COMPLETED` | Reunião concluída | `COMPLETED` |
| `CANCELED` | Reunião cancelada | `CANCELED` |
| `NO_SHOW` | Cliente faltou | `NO_SHOW` |
| `RESCHEDULED` | Reagendada | `RESCHEDULED` |

## ⏰ **Timezone**

- **Portal Input/Output**: `América/São_Paulo` (`-03:00`)
- **HubSpot Internal**: `UTC` (`Z`)
- **Conversão automática** entre timezones

## 🚨 **Tratamento de Erros**

### **400 - Bad Request**
```json
{
  "success": false,
  "error": "Dados inválidos",
  "details": {
    "field": "contact_id",
    "message": "Contact ID é obrigatório"
  }
}
```

### **404 - Not Found**
```json
{
  "success": false,
  "error": "Reunião não encontrada",
  "meeting_id": "88237206711"
}
```

### **500 - Internal Error**
```json
{
  "success": false,
  "error": "Erro interno do servidor",
  "details": "Falha na comunicação com HubSpot API"
}
```

## 🔗 **HubSpot Integration Details**

### **Endpoints Internos Utilizados:**
- `POST /crm/v3/objects/meetings` - Criar reunião
- `PATCH /crm/v3/objects/meetings/{id}` - Atualizar reunião
- `POST /crm/v3/objects/meetings/search` - Buscar reuniões
- `DELETE /crm/v3/objects/meetings/{id}` - Deletar reunião

### **Association Types:**
- **Contact → Meeting**: `associationTypeId: 194`
- **Ticket → Meeting**: `associationTypeId: 214`

### **Propriedades HubSpot Utilizadas:**
- `hs_meeting_title` - Título da reunião
- `hs_meeting_start_time` - Data/hora início
- `hs_meeting_end_time` - Data/hora fim
- `hs_meeting_outcome` - Status da reunião
- `hs_activity_type` - Tipo de atividade
- `hs_meeting_body` - Descrição/Notas
- `hs_object_id` - ID único no HubSpot

## 📝 **Exemplo de Resposta Completa do HubSpot**

```json
[
  {
    "id": "88237206711",
    "properties": {
      "hs_activity_type": "T.A (Marcar visita)",
      "hs_body_preview": "Visita para apresentação do imóvel",
      "hs_createdate": "2025-09-09T19:07:56.729Z",
      "hs_meeting_body": "Visita para apresentação do imóvel",
      "hs_meeting_end_time": "2025-09-10T14:00:00Z",
      "hs_meeting_outcome": "COMPLETED",
      "hs_meeting_start_time": "2025-09-10T13:00:00Z",
      "hs_meeting_title": "Visita - João Silva + T.A (Marcar visita)",
      "hs_object_id": "88237206711",
      "hs_outcome_completed_count": "1",
      "hs_outcome_scheduled_count": "0"
    },
    "createdAt": "2025-09-09T19:07:56.729Z",
    "updatedAt": "2025-09-09T19:07:56.729Z",
    "archived": false
  }
]
```
