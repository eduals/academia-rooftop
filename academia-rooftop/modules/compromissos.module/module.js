// Módulo de Compromissos - HomeCash Rooftop
(function() {
    'use strict';
  
    var module = {
      init: function() {
        this.container = document.querySelector('[data-module="compromissosModule"]');
        if (!this.container) return;
        
        this.loadingEl = this.container.querySelector('.compromissos-loading');
        this.contentEl = this.container.querySelector('.compromissos-content');
        this.emptyEl = this.container.querySelector('.compromissos-empty');
        
        this.currentView = 'lista';
        this.loadCompromissos();
      },
  
      loadCompromissos: function() {
        var self = this;
        
        this.hideAllSections();
        if (this.loadingEl) this.loadingEl.style.display = 'block';
  
        setTimeout(function() {
          var compromissos = self.getMockCompromissos();
          self.renderCompromissos(compromissos);
        }, 500);
      },
  
      hideAllSections: function() {
        if (this.loadingEl) this.loadingEl.style.display = 'none';
        if (this.contentEl) this.contentEl.style.display = 'none';
        if (this.emptyEl) this.emptyEl.style.display = 'none';
      },
  
      renderCompromissos: function(compromissos) {
        if (!this.contentEl) return;
  
        var html = this.generateCompromissosHTML(compromissos);
        this.contentEl.innerHTML = html;
        this.contentEl.style.display = 'block';
        
        this.addEventListeners();
      },
  
      generateCompromissosHTML: function(compromissos) {
        var proximosCompromissos = this.getProximosCompromissos(compromissos);
        var compromissosAgendados = this.getCompromissosAgendados(compromissos);
        var compromissosFinalizados = this.getCompromissosFinalizados(compromissos);
  
        return `
          <div class="space-y-6">
            <!-- Resumo -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div class="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div class="flex items-center">
                  <div class="flex-1">
                    <p class="text-sm font-medium text-gray-500">Próximos</p>
                    <p class="text-2xl font-semibold text-blue-600">${proximosCompromissos.length}</p>
                  </div>
                  <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                      <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
  
              <div class="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div class="flex items-center">
                  <div class="flex-1">
                    <p class="text-sm font-medium text-gray-500">Agendados</p>
                    <p class="text-2xl font-semibold text-yellow-600">${compromissosAgendados.length}</p>
                  </div>
                  <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                      <svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
  
              <div class="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div class="flex items-center">
                  <div class="flex-1">
                    <p class="text-sm font-medium text-gray-500">Finalizados</p>
                    <p class="text-2xl font-semibold text-green-600">${compromissosFinalizados.length}</p>
                  </div>
                  <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                      <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
  
            <!-- Filtros -->
            <div class="bg-white rounded-lg shadow border border-gray-200 p-4">
              <div class="flex flex-wrap gap-2">
                <button onclick="window.compromissosModule.filterBy('todos')" class="filter-btn px-4 py-2 text-sm rounded-lg border transition-colors bg-blue-600 text-white border-blue-600">
                  Todos
                </button>
                <button onclick="window.compromissosModule.filterBy('proximos')" class="filter-btn px-4 py-2 text-sm rounded-lg border transition-colors bg-white text-gray-700 border-gray-300 hover:bg-gray-50">
                  Próximos
                </button>
                <button onclick="window.compromissosModule.filterBy('agendados')" class="filter-btn px-4 py-2 text-sm rounded-lg border transition-colors bg-white text-gray-700 border-gray-300 hover:bg-gray-50">
                  Agendados
                </button>
                <button onclick="window.compromissosModule.filterBy('finalizados')" class="filter-btn px-4 py-2 text-sm rounded-lg border transition-colors bg-white text-gray-700 border-gray-300 hover:bg-gray-50">
                  Finalizados
                </button>
              </div>
            </div>
  
            <!-- Lista de Compromissos -->
            <div class="bg-white rounded-lg shadow border border-gray-200">
              <div class="px-6 py-4 border-b border-gray-200">
                <h3 class="text-lg font-medium text-gray-900">Lista de Compromissos</h3>
              </div>
              <div class="divide-y divide-gray-200" id="compromissos-list">
                ${this.getFilteredCompromissos(compromissos).map(compromisso => this.generateCompromissoCard(compromisso)).join('')}
              </div>
            </div>
          </div>
        `;
      },
  
      generateCompromissoCard: function(compromisso) {
        var statusInfo = this.getStatusInfo(compromisso.status);
        var dataFormatada = this.formatDateTime(compromisso.dataHora);
        
        return `
          <div class="px-6 py-4 hover:bg-gray-50 transition-colors">
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div class="flex items-center">
                  <h4 class="text-sm font-medium text-gray-900">${compromisso.titulo}</h4>
                  <span class="ml-2 px-2 py-1 text-xs rounded-full ${statusInfo.color}">${statusInfo.label}</span>
                </div>
                <p class="text-sm text-gray-500 mt-1">${compromisso.cliente}</p>
                <div class="flex items-center text-sm text-gray-500 mt-2">
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  ${dataFormatada}
                </div>
                ${compromisso.endereco ? `
                  <div class="flex items-center text-sm text-gray-500 mt-1">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    ${compromisso.endereco}
                  </div>
                ` : ''}
              </div>
              <div class="flex items-center space-x-2">
                <button onclick="window.compromissosModule.editarCompromisso('${compromisso.id}')" class="text-blue-600 hover:text-blue-800 text-sm">
                  Editar
                </button>
                <button onclick="window.compromissosModule.finalizarCompromisso('${compromisso.id}')" class="text-green-600 hover:text-green-800 text-sm">
                  Finalizar
                </button>
              </div>
            </div>
          </div>
        `;
      },
  
      getProximosCompromissos: function(compromissos) {
        var hoje = new Date();
        var amanha = new Date(hoje);
        amanha.setDate(amanha.getDate() + 1);
        
        return compromissos.filter(function(compromisso) {
          var dataCompromisso = new Date(compromisso.dataHora);
          return dataCompromisso >= hoje && dataCompromisso <= amanha && compromisso.status !== 'finalizado';
        });
      },
  
      getCompromissosAgendados: function(compromissos) {
        return compromissos.filter(function(compromisso) {
          return compromisso.status === 'agendado';
        });
      },
  
      getCompromissosFinalizados: function(compromissos) {
        return compromissos.filter(function(compromisso) {
          return compromisso.status === 'finalizado';
        });
      },
  
      getFilteredCompromissos: function(compromissos) {
        switch (this.currentFilter) {
          case 'proximos':
            return this.getProximosCompromissos(compromissos);
          case 'agendados':
            return this.getCompromissosAgendados(compromissos);
          case 'finalizados':
            return this.getCompromissosFinalizados(compromissos);
          default:
            return compromissos;
        }
      },
  
      getStatusInfo: function(status) {
        var statusMap = {
          'agendado': { label: 'Agendado', color: 'bg-blue-100 text-blue-800' },
          'confirmado': { label: 'Confirmado', color: 'bg-green-100 text-green-800' },
          'finalizado': { label: 'Finalizado', color: 'bg-gray-100 text-gray-800' },
          'cancelado': { label: 'Cancelado', color: 'bg-red-100 text-red-800' }
        };
  
        return statusMap[status] || { label: 'Desconhecido', color: 'bg-gray-100 text-gray-800' };
      },
  
      formatDateTime: function(dateTimeString) {
        try {
          var date = new Date(dateTimeString);
          return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        } catch (e) {
          return dateTimeString;
        }
      },
  
      filterBy: function(filter) {
        this.currentFilter = filter;
        
        // Atualiza os botões de filtro
        var buttons = this.container.querySelectorAll('.filter-btn');
        buttons.forEach(function(btn) {
          btn.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
          btn.classList.add('bg-white', 'text-gray-700', 'border-gray-300');
        });
        
        // Marca o botão ativo
        var activeBtn = this.container.querySelector(`[onclick="window.compromissosModule.filterBy('${filter}')"]`);
        if (activeBtn) {
          activeBtn.classList.remove('bg-white', 'text-gray-700', 'border-gray-300');
          activeBtn.classList.add('bg-blue-600', 'text-white', 'border-blue-600');
        }
        
        // Atualiza a lista
        var compromissos = this.getMockCompromissos();
        var filteredCompromissos = this.getFilteredCompromissos(compromissos);
        var listContainer = this.container.querySelector('#compromissos-list');
        
        if (listContainer) {
          listContainer.innerHTML = filteredCompromissos.map(compromisso => this.generateCompromissoCard(compromisso)).join('');
        }
      },
  
      novoCompromisso: function() {
        alert('Funcionalidade de novo compromisso em desenvolvimento');
      },
  
      editarCompromisso: function(id) {
        alert('Editar compromisso ID: ' + id);
      },
  
      finalizarCompromisso: function(id) {
        alert('Finalizar compromisso ID: ' + id);
      },
  
      getMockCompromissos: function() {
        var hoje = new Date();
        var amanha = new Date(hoje);
        amanha.setDate(amanha.getDate() + 1);
        
        return [
          {
            id: '1',
            titulo: 'Visita ao imóvel - Rua das Flores',
            cliente: 'João Silva',
            dataHora: hoje.toISOString(),
            endereco: 'Rua das Flores, 123 - Centro',
            status: 'confirmado',
            tipo: 'visita'
          },
          {
            id: '2',
            titulo: 'Reunião com proprietário',
            cliente: 'Maria Santos',
            dataHora: amanha.toISOString(),
            endereco: 'Av. Principal, 456 - Jardim',
            status: 'agendado',
            tipo: 'reuniao'
          },
          {
            id: '3',
            titulo: 'Assinatura de contrato',
            cliente: 'Pedro Costa',
            dataHora: new Date(hoje.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            endereco: 'Escritório Rooftop',
            status: 'confirmado',
            tipo: 'assinatura'
          },
          {
            id: '4',
            titulo: 'Avaliação de imóvel',
            cliente: 'Ana Paula',
            dataHora: new Date(hoje.getTime() - 24 * 60 * 60 * 1000).toISOString(),
            endereco: 'Rua do Comércio, 789',
            status: 'finalizado',
            tipo: 'avaliacao'
          },
          {
            id: '5',
            titulo: 'Vistoria final',
            cliente: 'Carlos Lima',
            dataHora: new Date(hoje.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            endereco: 'Condomínio Fechado, Casa 15',
            status: 'finalizado',
            tipo: 'vistoria'
          }
        ];
      },
  
      addEventListeners: function() {
        // Listeners já são adicionados via onclick nos botões
      }
    };
  
    // Expor o módulo globalmente
    window.compromissosModule = module;
  
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        module.init();
      });
    } else {
      module.init();
    }
  
  })();