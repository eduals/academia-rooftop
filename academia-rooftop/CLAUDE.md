# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **HubSpot CMS theme** for Academia Rooftop, a real estate/business platform. The theme extends `@marketplace/MakeWebBetter/Academia` and provides specialized modules for:

- **Real estate deal management** - Complete CRM workflow with filtering and status tracking
- **Commission tracking** - Commission management for sales teams
- **Appointment scheduling** - Business commitments and calendar management  
- **Property registration** - Real estate listing and management
- **Business reporting** - Analytics and performance dashboards

## Architecture

### Theme Structure
```
academia-rooftop/
├── modules/               # Custom HubSpot modules
├── templates/             # Page templates and layouts
├── sections/              # Reusable content sections
├── queries/               # GraphQL queries for HubSpot CRM
├── css/                   # Tailwind CSS and custom styles
├── js/                    # JavaScript functionality
└── images/                # Static assets and icons
```

### Key Business Modules
- **negocios.module/** - Main deals management with N8N integration
- **negocios-detalhe.module/** - Individual deal detail views
- **cadastrar-imovel.module/** - Property registration forms
- **comissoes.module/** - Commission tracking and calculations
- **compromissos.module/** - Appointment and commitment management
- **dashboard.module/** - Overview dashboard with metrics
- **ranking.module/** - Performance ranking and leaderboards
- **relatorios.module/** - Business reports and analytics

### Portal Infrastructure
- **header_portal.module/** - Portal navigation with localization
- **menu.module/** - Dynamic menu system
- **perfil.module/** - User profile management
- **configuracoes.module/** - System configuration interface

## Development Commands

This project uses **Tailwind CSS v4** with a custom build process. Since there's no package.json, build commands are likely handled by HubSpot's CLI or custom scripts:

### CSS Development
```bash
# Likely commands (verify in your environment):
npx tailwindcss -i css/tailwind.css -o css/output.css --watch
```

### File Structure for New Modules
```
modules/new-module.module/
├── module.html          # HubL template with HubSpot tags
├── module.js            # JavaScript logic and API integration
├── module.css           # Module-specific styles
├── meta.json            # Module metadata and configuration
├── fields.json          # Editable fields for content editors
└── _locales/           # Internationalization (Portuguese)
    └── pt/
        └── messages.json
```

## HubSpot Integration Patterns

### CRM Data Flow
1. **GraphQL Queries** - Located in `/queries/myDeals.graphql` for deal collection
2. **HubL Processing** - Templates use `crm_associations()` to fetch related objects
3. **JavaScript Enhancement** - Modules process and filter data client-side
4. **Mock Data Fallback** - All modules include development mock data

### Module Development Pattern
```javascript
// Standard module structure (from negocios.module)
(function () {
  'use strict';
  
  var module = {
    n8nConfig: {
      baseUrl: 'https://n8n2.rooftop.com.br/webhook/portal',
      endpoints: {
        updateTicket: '/update-ticket',
        updateDeal: '/update-deal'
      }
    },
    init: function() {
      this.container = document.querySelector('[data-module="moduleName"]');
      if (!this.container) return;
      this.loadData();
    },
    loadData: function() {
      // Load from HubSpot or fallback to mock data
    }
  };
  
  window.moduleNameModule = module;
})();
```

### N8N Webhook Integration
- **Base URL**: `https://n8n2.rooftop.com.br/webhook/portal`
- **Key Endpoints**: `/update-ticket`, `/update-deal`
- **Error Handling**: All API calls include comprehensive error handling
- **Logging**: Console logging for debugging (remove in production)

## Business Logic Implementation

### Deal Pipeline Management
- **HomeCash Pipeline** (`hs_pipeline: '0'`) - Internal processing workflow
- **Franquia Pipeline** (`hs_pipeline: '714520128'`) - Franchise partner workflow
- **Status Mapping** - Comprehensive stage mapping in negocios.module/module.js:1-100

### Real Estate Data Types
The system uses specific property types and value ranges:

**Property Types**:
- Apartamento, Casa de Rua, Casa em Condomínio
- Terreno, Sala Comercial, Apartamento Duplex/Cobertura

**Value Ranges** (instead of exact values):
- Abaixo de R$ 500 mil
- De R$ 501 mil a R$ 800 mil  
- De R$ 801 mil a R$ 1 milhão
- De R$ 1 milhão a R$ 3 milhões
- De R$ 3 milhões a R$ 6 milhões

### Filtering System Implementation
- **Status Filters**: todos, abertos, ganhos, perdidos
- **Date Filters**: hoje, semana, mes, trimestre
- **Priority Filters**: LOW, MEDIUM, HIGH, URGENT
- **Real-time Updates**: Client-side filtering without page reload

## Styling Guidelines

### Tailwind CSS v4 Configuration
- **Content Paths**: `./academia-rooftop/**/*.{html,css,js}`
- **Components**: Flowbite UI components (`css/flowbite.min.css`)
- **Custom Styles**: `css/system-custom.css` for theme-specific overrides
- **Output**: Compiled to `css/output.css`

### Responsive Design
- **Mobile Breakpoint**: Custom 992px breakpoint (theme.json:8-16)
- **Mobile-first**: Tailwind's responsive approach
- **Testing**: All modules must work on mobile devices

## Development Workflow

### Mock Data Development
- All modules include Portuguese mock data for offline development
- Use `?debug=true` URL parameter for debug controls
- Console logging prefixed with module names for debugging

### Module Creation Process
1. Copy existing module structure from similar module
2. Update `meta.json` with new module metadata
3. Configure `fields.json` for content editor fields
4. Implement HubL template in `module.html`
5. Add JavaScript logic in `module.js`
6. Style with Tailwind classes in `module.css`

### CRM Integration Testing
- Verify HubSpot CRM data availability before implementation
- Test GraphQL queries in HubSpot's GraphQL explorer
- Validate N8N webhook endpoints independently
- Use browser console for comprehensive debugging

## Deployment Considerations

- **Version Management**: Update `theme.json` version for releases
- **Production Cleanup**: Remove debug controls and console logs
- **CRM Testing**: Validate all HubSpot integrations in staging
- **Webhook Validation**: Confirm N8N endpoint availability
- **Responsive Testing**: Verify mobile functionality across devices

## Portuguese Language Support

The theme is fully localized for Portuguese (Brazil):
- Module labels and content in Portuguese
- Localization files in `_locales/pt/messages.json`
- Brazilian currency formatting (R$)
- Date formatting for Brazilian locale
- Business terminology specific to Brazilian real estate market

## HubDB Sequential Data Fetching

### Overview

The content detail module implements a **sequential and relational data fetching pattern** using the N8N `/get-content-detail` endpoint. This approach fetches data progressively, following relationships between HubDB tables.

### Table Structure and IDs

```javascript
// HubDB Table Configuration
const tables = {
  categories: '128861234',      // Content categories
  materials: '128861235',       // Learning materials  
  modules: '128888896',         // Course modules
  material_progress: '128861236', // User material progress
  module_progress: '128861237'  // User module progress
};
```

### Sequential Fetch Pattern

```javascript
// 1. Fetch primary material
const material = await fetchSingleRecord(contentId, tables.materials);

// 2. Extract relationship IDs
const categoryId = getRelationshipId(material.values.category);

// 3. Fetch related data in parallel
const [category, modules, materialProgress, moduleProgress] = await Promise.all([
  fetchSingleRecord(categoryId, tables.categories),
  fetchRelatedRecords(tables.modules, { materialId: material.id }),
  fetchRelatedRecords(tables.material_progress, { 
    contactId: userId, 
    materialId: material.id 
  }),
  fetchRelatedRecords(tables.module_progress, { contactId: userId })
]);
```

### Relationship Structure (foreignid)

HubDB relationships are stored as arrays of objects with `foreignid` type:

```javascript
// Old format (deprecated)
"category_id": 194483580084

// New foreignid format  
"category": [
  {
    "id": "194483580084",
    "name": "194483580084", 
    "type": "foreignid"
  }
]
```

### Helper Functions

```javascript
// Extract ID from foreignid relationship
function getRelationshipId(relationshipField) {
  if (Array.isArray(relationshipField) && relationshipField.length > 0) {
    return relationshipField[0].id;
  }
  return relationshipField; // Backward compatibility
}

// Process tags array (options or strings)
function processTags(tagsField) {
  if (Array.isArray(tagsField)) {
    return tagsField.map(tag => tag.name || tag.label || tag.id);
  }
  if (typeof tagsField === 'string') {
    return tagsField.split(',').map(t => t.trim());
  }
  return [];
}
```

### API Integration Pattern

```javascript
// Endpoint: /get-content-detail
// Parameters:
{
  content_id: "194483580087",  // Record ID to fetch
  table_id: "128861235",       // HubDB table ID
  contact_id: "12345"          // User context (optional)
}

// For fetching all records from a table:
{
  table_id: "128888896",
  fetch_all: "true",
  contact_id: "12345"  // For filtering user-specific data
}
```

### Implementation in detalhe-conteudo.module

The module follows this workflow:

1. **Primary Fetch**: Material by content_id from materials table
2. **Relationship Extraction**: Extract category and other relationship IDs  
3. **Parallel Fetching**: Fetch all related data simultaneously
4. **Client-side Filtering**: Filter related records by relationships
5. **Data Processing**: Combine all data into complete content object

### Benefits

- **Performance**: Optimized with parallel requests where possible
- **Flexibility**: Can fetch any combination of related data
- **Maintainability**: Clear separation between fetching and processing
- **Debugging**: Comprehensive logging for each fetch operation
- **Compatibility**: Supports both old ID and new foreignid formats