# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **HubSpot CMS theme** for an educational/real estate platform called "Academia Rooftop". The theme includes:

- **Custom HubSpot modules** for business/deal management
- **Tailwind CSS v4** for styling with custom build process
- **HubSpot CRM integration** via GraphQL queries and associations
- **Real estate business workflows** including deals, commissions, appointments, and reporting
- **Responsive design** with Flowbite components

## Architecture

### Theme Structure
- `academia-rooftop/` - Main theme directory (extends @marketplace/MakeWebBetter/Academia)
- `modules/` - Custom HubSpot modules (each with .html, .js, .css, fields.json, meta.json)
- `templates/` - Page templates and partials
- `sections/` - Reusable content sections
- `queries/` - GraphQL queries for HubSpot CRM data

### Key Modules
- **negocios.module** - Main business/deals management interface with filtering, status tracking, and N8N integration
- **dashboard.module** - Dashboard overview
- **comissoes.module** - Commission tracking
- **compromissos.module** - Appointments/commitments
- **relatorios.module** - Reports and analytics

### Data Flow
1. HubSpot CRM data (deals, tickets, contacts) retrieved via HubL
2. JavaScript modules process and display data with real-time filtering
3. N8N webhooks handle business logic updates (deal status changes, etc.)
4. Mock data fallback for development when CRM data unavailable

## Development Commands

### CSS Build (Tailwind)
```bash
# Build CSS for production
npm run build

# Build with all classes (no purging)
npm run build:all

# Development with watch mode
npm run dev
```

### File Structure for New Modules
```
modules/new-module.module/
├── module.html          # HubL template
├── module.js            # JavaScript logic
├── module.css           # Module-specific styles
├── meta.json            # Module metadata
├── fields.json          # Editable fields
└── _locales/           # Internationalization (if needed)
```

## HubSpot Integration Patterns

### CRM Data Access
- Use `crm_associations()` HubL function to get related CRM objects
- Implement GraphQL queries in `/queries/` directory
- Always provide mock data fallback for development
- Handle data processing in JavaScript, not HubL templates

### Module Development Pattern
```javascript
// Standard module structure
(function() {
  'use strict';
  
  var module = {
    init: function() {
      // Initialize module
    },
    loadData: function() {
      // Load from HubSpot or fallback to mock
    },
    handleResponse: function(data) {
      // Process and render data
    }
  };
  
  window.moduleNameModule = module;
  // Initialize on DOM ready
})();
```

### N8N Integration
- Base URL: `https://n8n2.rooftop.com.br/webhook/portal`
- Endpoints: `/update-ticket`, `/update-deal`
- Always include error handling and user feedback
- Log all API interactions for debugging

## Business Logic

### Deal Status Mapping
- **HomeCash Pipeline (hs_pipeline: '0')** - Internal processing
- **Franquia Pipeline (hs_pipeline: '714520128')** - Franchise workflow
- Status codes map to specific business stages (see negocios.module/module.js for full mapping)

### Filtering System
- Status filters: todos, abertos, ganhos, perdidos
- Date filters: hoje, semana, mes, trimestre
- Priority filters: LOW, MEDIUM, HIGH, URGENT
- Real-time filtering without page reload

## Styling Guidelines

### Tailwind Configuration
- Content paths include all module files: `./academia-rooftop/**/*.{html,css,js}`
- Uses Flowbite components for UI elements
- Custom CSS in `system-custom.css` for theme-specific styles

### Responsive Design
- Mobile-first approach with Tailwind breakpoints
- Theme defines custom mobile breakpoint at 992px
- Test all modules on mobile devices

## Testing and Development

### Mock Data
- All modules include mock data for development
- Use `?debug=true` URL parameter to enable debug controls
- Console logging for all data processing steps

### Debugging
- Check browser console for module-specific logs (prefixed with module name)
- Verify HubSpot CRM data availability before implementation
- Test N8N webhook endpoints separately

## Deployment Notes

- Theme version managed in `theme.json`
- Remove debug controls and console logs for production
- Test all HubSpot CRM integrations in staging environment
- Verify N8N webhook availability before deployment

## Common Development Tasks

- **Adding new module**: Copy existing module structure, update meta.json and fields.json
- **Modifying CRM queries**: Update GraphQL files and corresponding JavaScript data processing
- **Styling changes**: Use Tailwind classes, run `npm run dev` for live updates
- **N8N integration**: Follow existing pattern in negocios.module for API calls