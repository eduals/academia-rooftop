// Módulo de Listagem de Franqueados - Portal Administrativo Rooftop
(function() {
  'use strict';

  var module = {
    init: function() {
      document.getElementById('header').style.display = 'none';
      document.getElementById('header').classList.add('hidden');
      this.container = document.querySelector('[data-module="franqueadosListModule"]');
      if (!this.container) return;

      this.loadingEl = this.container.querySelector('.franqueados-loading');
      this.contentEl = this.container.querySelector('.franqueados-content');
      this.errorEl = this.container.querySelector('.franqueados-error');
      this.emptyEl = this.container.querySelector('.franqueados-empty');
      this.tableBody = this.container.querySelector('.franqueados-table-body');

      this.loadFranqueados();
    },

    loadFranqueados: function() {
      var self = this;

      this.hideAllSections();
      if (this.loadingEl) this.loadingEl.style.display = 'block';

      // Endpoint N8N para buscar franqueados
      var apiUrl = 'https://n8n2.rooftop.com.br/webhook/portal/admin/members';

      fetch(apiUrl)
        .then(function(response) {
          if (!response.ok) {
            throw new Error('Erro ao carregar franqueados');
          }
          return response.json();
        })
        .then(function(responseData) {
          console.log('[FranqueadosListModule] Dados recebidos:', responseData);

          // A API retorna um objeto com "data" que contém um array
          var data = responseData.data || responseData;

          if (!Array.isArray(data)) {
            throw new Error('Formato de resposta inválido');
          }

          self.handleFranqueadosResponse(data);
        })
        .catch(function(error) {
          console.error('[FranqueadosListModule] Erro ao carregar:', error);
          self.showError();
        });
    },

    handleFranqueadosResponse: function(data) {
      if (!data || data.length === 0) {
        this.showEmpty();
        return;
      }
      this.renderFranqueados(data);
    },

    renderFranqueados: function(franqueados) {
      if (!this.tableBody) return;

      var html = franqueados.map(function(franqueado) {
        return this.generateFranqueadoRow(franqueado);
      }.bind(this)).join('');

      this.tableBody.innerHTML = html;
      this.hideAllSections();
      this.contentEl.style.display = 'block';
    },

    generateFranqueadoRow: function(franqueado) {
      var properties = franqueado.properties || {};

      // Extrair dados do contato
      var nome = this.extractValue(properties.firstname) || 'Sem nome';
      var sobrenome = this.extractValue(properties.lastname) || '';
      var nomeCompleto = (nome + ' ' + sobrenome).trim();
      var email = this.extractValue(properties.email) || 'Sem email';
      var telefone = this.extractValue(properties.phone) || this.extractValue(properties.telefone) || '-';
      var cidade = this.extractValue(properties.city) || '-';
      var dataCadastro = this.extractValue(properties.createdate);
      var status = this.extractValue(properties.acessoportalfranqueado) || 'Inativo';
      var contactId = franqueado.vid || franqueado['canonical-vid'];

      // Formatar data de cadastro
      var dataFormatada = this.formatDate(dataCadastro);

      // Definir classe do badge de status
      var statusClass = status === 'Ativo' ? 'badge-success' : 'badge-gray';

      // URL do portal do franqueado
      var portalUrl = 'https://portal.rooftop.com.br/negocios?view_contact_id=' + contactId;

      return `
        <tr>
          <td>
            <div class="font-semibold text-slate-900">${nomeCompleto}</div>
          </td>
          <td>
            <a href="mailto:${email}" class="text-blue-600 hover:text-blue-800">${email}</a>
          </td>
          <td>${this.formatPhone(telefone)}</td>
          <td>${cidade}</td>
          <td>${dataFormatada}</td>
          <td>
            <span class="badge ${statusClass}">${status}</span>
          </td>
          <td class="text-center">
            <a href="${portalUrl}" target="_blank" class="btn btn-primary btn-sm">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
              </svg>
              Acessar Portal
            </a>
          </td>
        </tr>
      `;
    },

    // Função auxiliar para extrair valor de propriedades HubSpot
    extractValue: function(property) {
      if (!property) return null;
      if (typeof property === 'string') return property;
      if (typeof property === 'object' && property.value) return property.value;
      return null;
    },

    // Formatar data timestamp para DD/MM/YYYY
    formatDate: function(timestamp) {
      if (!timestamp) return '-';

      var date;
      if (typeof timestamp === 'string') {
        timestamp = parseInt(timestamp, 10);
      }

      date = new Date(timestamp);

      if (isNaN(date.getTime())) return '-';

      var day = String(date.getDate()).padStart(2, '0');
      var month = String(date.getMonth() + 1).padStart(2, '0');
      var year = date.getFullYear();

      return day + '/' + month + '/' + year;
    },

    // Formatar telefone
    formatPhone: function(phone) {
      if (!phone || phone === '-') return '-';

      // Remove caracteres não numéricos
      var cleaned = phone.replace(/\D/g, '');

      // Formata conforme o padrão brasileiro
      if (cleaned.length === 11) {
        return '(' + cleaned.substring(0, 2) + ') ' + cleaned.substring(2, 7) + '-' + cleaned.substring(7);
      } else if (cleaned.length === 10) {
        return '(' + cleaned.substring(0, 2) + ') ' + cleaned.substring(2, 6) + '-' + cleaned.substring(6);
      }

      return phone;
    },

    hideAllSections: function() {
      if (this.loadingEl) this.loadingEl.style.display = 'none';
      if (this.contentEl) this.contentEl.style.display = 'none';
      if (this.errorEl) this.errorEl.style.display = 'none';
      if (this.emptyEl) this.emptyEl.style.display = 'none';
    },

    showError: function() {
      this.hideAllSections();
      if (this.errorEl) this.errorEl.style.display = 'block';
    },

    showEmpty: function() {
      this.hideAllSections();
      if (this.emptyEl) this.emptyEl.style.display = 'block';
    }
  };

  // Expõe o módulo globalmente
  window.franqueadosListModule = module;

  // Inicializa quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      module.init();
    });
  } else {
    module.init();
  }
})();
