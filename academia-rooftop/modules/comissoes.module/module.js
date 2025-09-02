// Módulo de Comissões - HomeCash Rooftop
(function() {
    'use strict';
  
    var module = {
      init: function() {
        this.container = document.querySelector('[data-module="comissoesModule"]');
        if (!this.container) return;
        
        this.loadingEl = this.container.querySelector('.comissoes-loading');
        this.contentEl = this.container.querySelector('.comissoes-content');
        this.emptyEl = this.container.querySelector('.comissoes-empty');
        
        this.currentFilter = 'todas';
        this.loadComissoes();
      },
  
      loadComissoes: function() {
        var self = this;
        
        this.hideAllSections();
        if (this.loadingEl) this.loadingEl.style.display = 'block';
  
        setTimeout(function() {
          var comissoes = self.getMockComissoes();
          self.renderComissoes(comissoes);
        }, 500);
      },
  
      hideAllSections: function() {
        if (this.loadingEl) this.loadingEl.style.display = 'none';
        if (this.contentEl) this.contentEl.style.display = 'none';
        if (this.emptyEl) this.emptyEl.style.display = 'none';
      },
  
      renderComissoes: function(comissoes) {
        if (!this.contentEl) return;
  
        var html = this.generateComissoesHTML(comissoes);
        this.contentEl.innerHTML = html;
        this.contentEl.style.display = 'block';
        
        this.addEventListeners();
      },
  
      generateComissoesHTML: function(comissoes) {
        var totalComissoes = this.getTotalComissoes(comissoes);
        var comissoesPagas = this.getComissoesPagas(comissoes);
        var comissoesPendentes = this.getComissoesPendentes(comissoes);
        
        return `
          <div class="space-y-6">
            <!-- Cards de Resumo -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div class="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div class="flex items-center">
                  <div class="flex-1">
                    <p class="text-sm font-medium text-gray-500">Total de Comissões</p>
                    <p class="text-2xl font-semibold text-gray-900">${this.formatCurrency(totalComissoes)}</p>
                  </div>
                  <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                      <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
  
              <div class="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div class="flex items-center">
                  <div class="flex-1">
                    <p class="text-sm font-medium text-gray-500">Comissões Pagas</p>
                    <p class="text-2xl font-semibold text-green-600">${this.formatCurrency(comissoesPagas)}</p>
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
  
              <div class="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div class="flex items-center">
                  <div class="flex-1">
                    <p class="text-sm font-medium text-gray-500">Comissões Pendentes</p>
                    <p class="text-2xl font-semibold text-yellow-600">${this.formatCurrency(comissoesPendentes)}</p>
                  </div>
                  <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                      <svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
  
            <!-- Filtros -->
            <div class="bg-white rounded-lg shadow border border-gray-200 p-4">
              <div class="flex flex-wrap gap-2">
                <button onclick="window.comissoesModule.filterBy('todas')" class="filter-btn px-4 py-2 text-sm rounded-lg border transition-colors ${this.currentFilter === 'todas' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}">
                  Todas
                </button>
                <button onclick="window.comissoesModule.filterBy('pagas')" class="filter-btn px-4 py-2 text-sm rounded-lg border transition-colors ${this.currentFilter === 'pagas' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}">
                  Pagas
                </button>
                <button onclick="window.comissoesModule.filterBy('pendentes')" class="filter-btn px-4 py-2 text-sm rounded-lg border transition-colors ${this.currentFilter === 'pendentes' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}">
                  Pendentes
                </button>
                <button onclick="window.comissoesModule.filterBy('processando')" class="filter-btn px-4 py-2 text-sm rounded-lg border transition-colors ${this.currentFilter === 'processando' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}">
                  Processando
                </button>
              </div>
            </div>
  
            <!-- Lista de Comissões -->
            <div class="bg-white rounded-lg shadow border border-gray-200 w-full">
              <div class="px-6 py-4 border-b border-gray-200">
                <h3 class="text-lg font-medium text-gray-900">Lista de Comissões</h3>
              </div>
              <div class="overflow-x-auto w-full">
                <table class="w-full min-w-full divide-y divide-gray-200">
                  <thead class="bg-blue-800">
                    <tr>
                      <th class="px-6 py-3 text-left bg-blue-800 text-xs font-medium text-white uppercase tracking-wider">
                        Negócio
                      </th>
                      <th class="px-6 py-3 text-left bg-blue-800 text-xs font-medium text-white uppercase tracking-wider">
                        Valor do Negócio
                      </th>
                      <th class="px-6 py-3 text-left bg-blue-800 text-xs font-medium text-white uppercase tracking-wider">
                        Comissão
                      </th>
                      <th class="px-6 py-3 text-left bg-blue-800 text-xs font-medium text-white uppercase tracking-wider">
                        Status
                      </th>
                      <th class="px-6 py-3 text-left bg-blue-800 text-xs font-medium text-white uppercase tracking-wider">
                        Data
                      </th>
                      <th class="px-6 py-3 text-center bg-blue-800 text-xs font-medium text-white uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200" id="comissoes-tbody">
                    ${this.getFilteredComissoes(comissoes).map(comissao => this.generateComissaoRow(comissao)).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        `;
      },
  
      generateComissaoRow: function(comissao) {
        var statusInfo = this.getStatusInfo(comissao.status);
        
        return `
          <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-gray-900">${comissao.negocio}</div>
              <div class="text-sm text-gray-500">${comissao.cliente}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-900">${this.formatCurrency(comissao.valorNegocio)}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-gray-900">${this.formatCurrency(comissao.valorComissao)}</div>
              <div class="text-sm text-gray-500">${comissao.percentual}%</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="px-2 py-1 text-xs rounded-full ${statusInfo.color}">${statusInfo.label}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              ${this.formatDate(comissao.dataPagamento)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-center">
              <a href="comissoes/detalhe?comission_id=${comissao.id}" class="text-blue-600 hover:text-blue-900 text-sm font-medium">
                Visualizar detalhes
              </a>
            </td>
          </tr>
        `;
      },
  
      getFilteredComissoes: function(comissoes) {
        switch (this.currentFilter) {
          case 'pagas':
            return comissoes.filter(c => c.status === 'pago');
          case 'pendentes':
            return comissoes.filter(c => c.status === 'pendente');
          case 'processando':
            return comissoes.filter(c => c.status === 'processando');
          default:
            return comissoes;
        }
      },
  
      getTotalComissoes: function(comissoes) {
        return comissoes.reduce(function(total, comissao) {
          return total + comissao.valorComissao;
        }, 0);
      },
  
      getComissoesPagas: function(comissoes) {
        return comissoes
          .filter(c => c.status === 'pago')
          .reduce(function(total, comissao) {
            return total + comissao.valorComissao;
          }, 0);
      },
  
      getComissoesPendentes: function(comissoes) {
        return comissoes
          .filter(c => c.status === 'pendente')
          .reduce(function(total, comissao) {
            return total + comissao.valorComissao;
          }, 0);
      },
  
      getStatusInfo: function(status) {
        var statusMap = {
          'pago': { label: 'Pago', color: 'bg-green-100 text-green-800' },
          'pendente': { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
          'processando': { label: 'Processando', color: 'bg-blue-100 text-blue-800' },
          'cancelado': { label: 'Cancelado', color: 'bg-red-100 text-red-800' }
        };
  
        return statusMap[status] || { label: 'Desconhecido', color: 'bg-gray-100 text-gray-800' };
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
        var activeBtn = this.container.querySelector(`[onclick="window.comissoesModule.filterBy('${filter}')"]`);
        if (activeBtn) {
          activeBtn.classList.remove('bg-white', 'text-gray-700', 'border-gray-300');
          activeBtn.classList.add('bg-blue-600', 'text-white', 'border-blue-600');
        }
        
        // Atualiza a tabela
        var comissoes = this.getMockComissoes();
        var filteredComissoes = this.getFilteredComissoes(comissoes);
        var tbody = this.container.querySelector('#comissoes-tbody');
        
        if (tbody) {
          tbody.innerHTML = filteredComissoes.map(comissao => this.generateComissaoRow(comissao)).join('');
        }
      },
  
      formatCurrency: function(value) {
        if (!value) return 'R$ 0,00';
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(value);
      },
  
      formatDate: function(dateString) {
        if (!dateString) return '';
        try {
          return new Date(dateString).toLocaleDateString('pt-BR');
        } catch (e) {
          return dateString;
        }
      },
  
      getMockComissoes: function() {
        return [
          {
            id: '1',
            negocio: 'Casa na Rua das Flores, 123',
            cliente: 'João Silva',
            valorNegocio: 450000,
            valorComissao: 13500,
            percentual: 3.0,
            status: 'pago',
            dataPagamento: '2024-01-15'
          },
          {
            id: '2',
            negocio: 'Apartamento Centro - Edifício Sol',
            cliente: 'Maria Santos',
            valorNegocio: 320000,
            valorComissao: 9600,
            percentual: 3.0,
            status: 'pago',
            dataPagamento: '2024-01-20'
          },
          {
            id: '3',
            negocio: 'Sobrado Jardim América',
            cliente: 'Pedro Costa',
            valorNegocio: 680000,
            valorComissao: 20400,
            percentual: 3.0,
            status: 'processando',
            dataPagamento: '2024-03-10'
          },
          {
            id: '4',
            negocio: 'Cobertura Vista Mar',
            cliente: 'Ana Paula',
            valorNegocio: 1200000,
            valorComissao: 36000,
            percentual: 3.0,
            status: 'pendente',
            dataPagamento: '2024-04-05'
          },
          {
            id: '5',
            negocio: 'Casa Condomínio Fechado',
            cliente: 'Carlos Lima',
            valorNegocio: 550000,
            valorComissao: 16500,
            percentual: 3.0,
            status: 'pago',
            dataPagamento: '2024-01-30'
          },
          {
            id: '6',
            negocio: 'Loft no Centro Histórico',
            cliente: 'Roberto Alves',
            valorNegocio: 380000,
            valorComissao: 11400,
            percentual: 3.0,
            status: 'pendente',
            dataPagamento: '2024-02-25'
          }
        ];
      },
  
      addEventListeners: function() {
        // Listeners já são adicionados via onclick nos botões
      }
    };
  
    // Expor o módulo globalmente
    window.comissoesModule = module;
  
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        module.init();
      });
    } else {
      module.init();
    }
  
  })();