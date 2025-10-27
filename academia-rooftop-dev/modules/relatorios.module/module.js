// Relatórios Module - HomeCash Rooftop
(function() {
    'use strict';
  
    var module = {
      init: function() {
        this.container = document.querySelector('[data-module="relatoriosModule"]');
        if (!this.container) return;
        
        this.loadingEl = this.container.querySelector('.relatorios-loading');
        this.contentEl = this.container.querySelector('.relatorios-content');
        this.errorEl = this.container.querySelector('.relatorios-error');
        this.emptyEl = this.container.querySelector('.relatorios-empty');
        
        this.loadRelatorios();
      },

      loadRelatorios: function() {
        var self = this;
        
        this.hideAllSections();
        if (this.loadingEl) this.loadingEl.style.display = 'block';

        // Simula carregamento e sempre usa dados mockados
        setTimeout(function() {
          console.log('📊 Carregando relatórios do franqueado...');
          self.loadMockData();
        }, 800);
      },

      hideAllSections: function() {
        if (this.loadingEl) this.loadingEl.style.display = 'none';
        if (this.contentEl) this.contentEl.style.display = 'none';
        if (this.errorEl) this.errorEl.style.display = 'none';
        if (this.emptyEl) this.emptyEl.style.display = 'none';
      },

      loadMockData: function() {
        var relatoriosData = this.getMockRelatoriosData();
        console.log('📈 Dados mockados de relatórios gerados:', relatoriosData);
        this.handleRelatoriosResponse(relatoriosData, true);
      },

      handleRelatoriosResponse: function(data, isMocked) {
        console.log('📊 Processando dados de relatórios...');
        
        this.hideAllSections();
        this.renderRelatorios(data, isMocked);
      },

      renderRelatorios: function(data, isMocked) {
        if (!this.contentEl) return;

        var html = this.generateRelatoriosHTML(data, isMocked);
        this.contentEl.innerHTML = html;
        this.contentEl.style.display = 'block';
        
        this.addEventListeners();
      },

      generateRelatoriosHTML: function(data, isMocked) {
        var indicadores = data.indicadores;
        var mesAtual = this.getCurrentMonth();
        
        return `
          <div class="space-y-6">
            
            <!-- Cabeçalho -->
            <div class="bg-white rounded-lg shadow border border-gray-200 p-6">
              <div class="flex items-center justify-between">
                <div>
                  <h1 class="text-3xl font-bold text-gray-900">Relatórios de Performance</h1>
                  <p class="text-gray-600 mt-2">Indicadores de desempenho - ${mesAtual}</p>
                </div>
                <div class="flex items-center gap-3">
                  <div class="bg-blue-100 p-3 rounded-lg">
                    <svg class="h-8 w-8 text-blue-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <!-- Grid de Indicadores Principais -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              ${this.generateIndicadorCard('Imóveis Enviados', indicadores.imoveisEnviados, 'text-blue-800', 'bg-blue-100', this.getHomeIcon())}
              ${this.generateIndicadorCard('Search Plans', indicadores.searchPlans, 'text-green-800', 'bg-green-100', this.getSearchIcon())}
              ${this.generateIndicadorCard('Interviews Marcadas', indicadores.interviewsMarcadas, 'text-purple-800', 'bg-purple-100', this.getCalendarIcon())}
              ${this.generateIndicadorCard('Interviews Realizadas', indicadores.interviewsRealizadas, 'text-indigo-800', 'bg-indigo-100', this.getCheckIcon())}
            </div>

            <!-- Grid de Indicadores Secundários -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              ${this.generateIndicadorCard('Documentos Recebidos', indicadores.documentosRecebidos, 'text-orange-800', 'bg-orange-100', this.getDocumentIcon())}
              ${this.generateIndicadorCard('Presentations Marcadas', indicadores.presentationsMarcadas, 'text-yellow-800', 'bg-yellow-100', this.getPresentationIcon())}
              ${this.generateIndicadorCard('Presentations Realizadas', indicadores.presentationsRealizadas, 'text-red-800', 'bg-red-100', this.getPresentationDoneIcon())}
            </div>

            <!-- Resultados Finais -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="bg-white rounded-lg shadow border border-gray-200 p-6">
                <div class="flex items-center mb-4">
                  <div class="bg-green-100 p-2 rounded-lg mr-3">
                    <svg class="h-6 w-6 text-green-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <h3 class="text-lg font-semibold text-gray-900">Resultados Positivos</h3>
                </div>
                <div class="text-3xl font-bold text-green-600 mb-2">${indicadores.resultadosPositivos}</div>
                <p class="text-gray-600">Negócios finalizados com sucesso</p>
              </div>

              <div class="bg-white rounded-lg shadow border border-gray-200 p-6">
                <div class="flex items-center mb-4">
                  <div class="bg-red-100 p-2 rounded-lg mr-3">
                    <svg class="h-6 w-6 text-red-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <h3 class="text-lg font-semibold text-gray-900">Resultados Negativos</h3>
                </div>
                <div class="text-3xl font-bold text-red-600 mb-2">${indicadores.resultadosNegativos}</div>
                <p class="text-gray-600">Negócios não concluídos</p>
              </div>
            </div>

            <!-- Comissões -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="bg-white rounded-lg shadow border border-gray-200 p-6">
                <div class="flex items-center mb-4">
                  <div class="bg-yellow-100 p-2 rounded-lg mr-3">
                    <svg class="h-6 w-6 text-yellow-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <h3 class="text-lg font-semibold text-gray-900">Projeção Comissões Pendentes</h3>
                </div>
                <div class="text-3xl font-bold text-yellow-600 mb-2">${this.formatCurrency(indicadores.projecaoComissoesPendentes)}</div>
                <p class="text-gray-600">Valor estimado para recebimento</p>
              </div>

              <div class="bg-white rounded-lg shadow border border-gray-200 p-6">
                <div class="flex items-center mb-4">
                  <div class="bg-blue-100 p-2 rounded-lg mr-3">
                    <svg class="h-6 w-6 text-blue-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                    </svg>
                  </div>
                  <h3 class="text-lg font-semibold text-gray-900">Comissões Realizadas no Mês</h3>
                </div>
                <div class="text-3xl font-bold text-blue-800 mb-2">${this.formatCurrency(indicadores.comissoesRealizadasMes)}</div>
                <p class="text-gray-600">Total recebido em ${mesAtual}</p>
              </div>
            </div>

            <!-- Tabela Detalhada -->
            <div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              <div class="bg-blue-800 px-6 py-4">
                <h3 class="text-lg font-semibold text-white">Resumo Detalhado dos Indicadores</h3>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full min-w-full divide-y divide-gray-200">
                  <thead class="bg-blue-800">
                    <tr>
                      <th class="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Indicador</th>
                      <th class="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Quantidade</th>
                      <th class="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Meta</th>
                      <th class="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Performance</th>
                      <th class="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    ${this.generateIndicadorRow('Imóveis Enviados', indicadores.imoveisEnviados, 50)}
                    ${this.generateIndicadorRow('Search Plans Realizados', indicadores.searchPlans, 40)}
                    ${this.generateIndicadorRow('Open Interviews Marcadas', indicadores.interviewsMarcadas, 25)}
                    ${this.generateIndicadorRow('Open Interviews Realizadas', indicadores.interviewsRealizadas, 20)}
                    ${this.generateIndicadorRow('Documentos Recebidos', indicadores.documentosRecebidos, 15)}
                    ${this.generateIndicadorRow('Presentations Marcadas', indicadores.presentationsMarcadas, 12)}
                    ${this.generateIndicadorRow('Presentations Realizadas', indicadores.presentationsRealizadas, 10)}
                    ${this.generateIndicadorRow('Resultados Positivos', indicadores.resultadosPositivos, 8)}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        `;
      },

      generateDemoBanner: function() {
        return `
          <div class="bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 rounded-lg p-4 mb-6">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-amber-800">Dados de Demonstração</h3>
                <div class="mt-1 text-sm text-amber-700">
                  <p>Estes são dados mockados para demonstração. Em produção, serão exibidos os dados reais do HubSpot.</p>
                </div>
              </div>
            </div>
          </div>
        `;
      },

      generateIndicadorCard: function(titulo, valor, textColor, bgColor, icon) {
        return `
          <div class="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div class="flex items-center">
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-500">${titulo}</p>
                <p class="text-3xl font-semibold ${textColor}">${valor}</p>
              </div>
              <div class="flex-shrink-0">
                <div class="w-12 h-12 ${bgColor} rounded-lg flex items-center justify-center">
                  ${icon}
                </div>
              </div>
            </div>
          </div>
        `;
      },

      generateIndicadorRow: function(nome, valor, meta) {
        var performance = Math.round((valor / meta) * 100);
        var statusClass = performance >= 100 ? 'bg-green-100 text-green-800' : 
                         performance >= 80 ? 'bg-yellow-100 text-yellow-800' : 
                         'bg-red-100 text-red-800';
        var statusText = performance >= 100 ? 'Excelente' : 
                        performance >= 80 ? 'Bom' : 'Precisa melhorar';

        return `
          <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-gray-900">${nome}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-center">
              <div class="text-sm font-bold text-gray-900">${valor}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-center">
              <div class="text-sm text-gray-500">${meta}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-center">
              <div class="text-sm font-medium text-gray-900">${performance}%</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-center">
              <span class="px-2 py-1 text-xs font-medium rounded-full ${statusClass}">${statusText}</span>
            </td>
          </tr>
        `;
      },

      getMockRelatoriosData: function() {
        return {
          indicadores: {
            imoveisEnviados: 42,
            searchPlans: 35,
            interviewsMarcadas: 28,
            interviewsRealizadas: 22,
            documentosRecebidos: 18,
            presentationsMarcadas: 15,
            presentationsRealizadas: 12,
            resultadosPositivos: 8,
            resultadosNegativos: 4,
            projecaoComissoesPendentes: 145000,
            comissoesRealizadasMes: 67500
          },
          periodo: {
            inicio: '2024-01-01',
            fim: '2024-01-31',
            mes: 'Janeiro 2024'
          }
        };
      },

      formatCurrency: function(value) {
        if (!value) return 'R$ 0,00';
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(value);
      },

      getCurrentMonth: function() {
        var meses = [
          'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        var agora = new Date();
        return meses[agora.getMonth()] + ' ' + agora.getFullYear();
      },

      // Ícones SVG
      getHomeIcon: function() {
        return `<svg class="h-6 w-6 text-blue-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
        </svg>`;
      },

      getSearchIcon: function() {
        return `<svg class="h-6 w-6 text-green-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>`;
      },

      getCalendarIcon: function() {
        return `<svg class="h-6 w-6 text-purple-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>`;
      },

      getCheckIcon: function() {
        return `<svg class="h-6 w-6 text-indigo-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>`;
      },

      getDocumentIcon: function() {
        return `<svg class="h-6 w-6 text-orange-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
        </svg>`;
      },

      getPresentationIcon: function() {
        return `<svg class="h-6 w-6 text-yellow-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z"/>
        </svg>`;
      },

      getPresentationDoneIcon: function() {
        return `<svg class="h-6 w-6 text-red-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
        </svg>`;
      },

      addEventListeners: function() {
        // Eventos específicos podem ser adicionados aqui se necessário
        console.log('📊 Event listeners adicionados para relatórios');
      }
    };
  
    // Expor o módulo globalmente
    window.relatoriosModule = module;
  
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        module.init();
      });
    } else {
      module.init();
    }
  
  })(); 