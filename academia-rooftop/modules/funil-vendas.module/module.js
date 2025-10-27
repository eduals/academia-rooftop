// Relatórios Module - HomeCash Rooftop
(function() {
    'use strict';
  
    var module = {
      loadingMessages: [
        'Analisando indicadores de performance...',
        'Calculando métricas de vendas...',
        'Verificando imóveis enviados...',
        'Processando visitas realizadas...',
        'Contabilizando documentos recebidos...',
        'Analisando apresentações concluídas...',
        'Compilando resultados do período...',
        'Aguarde... finalizando processamento'
      ],
      loadingInterval: null,
      loadingTimerInterval: null,
      loadingStartTime: null,
      currentMessageIndex: 0,
      chartInstance: null,
      
      init: function() {
        this.container = document.querySelector('[data-module="relatoriosModule"]');
        if (!this.container) return;
        
        this.loadingEl = this.container.querySelector('.relatorios-loading');
        this.contentEl = this.container.querySelector('.relatorios-content');
        this.errorEl = this.container.querySelector('.relatorios-error');
        this.emptyEl = this.container.querySelector('.relatorios-empty');
        
        // Inicializar com filtros da URL se existirem
        this.initializeFromURL();
      },

      loadRelatorios: function(periodo, dataInicio, dataFim) {
        var self = this;
        
        this.hideAllSections();
        this.startDynamicLoading();

        // Usar período da URL ou padrão
        var filtroParams = this.getURLFilters();
        periodo = periodo || filtroParams.periodo || 'mes';
        dataInicio = dataInicio || filtroParams.dataInicio;
        dataFim = dataFim || filtroParams.dataFim;

        // Atualizar URL com filtros
        this.updateURL(periodo, dataInicio, dataFim);

        setTimeout(function() {
          console.log('📊 Carregando relatórios do franqueado...');
          self.loadDataFromAPI(periodo, dataInicio, dataFim);
        }, 800);
      },
      
      startDynamicLoading: function() {
        var self = this;
        
        if (this.loadingEl) {
          this.loadingEl.style.display = 'block';
          this.loadingStartTime = Date.now();
          this.currentMessageIndex = 0;
          
          // Atualizar mensagem inicial
          var messageEl = document.getElementById('loading-message');
          if (messageEl) {
            messageEl.textContent = this.loadingMessages[0];
          }
          
          // Atualizar mensagens a cada 2.5 segundos
          this.loadingInterval = setInterval(function() {
            self.currentMessageIndex++;
            
            // Reiniciar após 20 segundos (8 mensagens * 2.5s = 20s)
            if (self.currentMessageIndex >= self.loadingMessages.length) {
              self.currentMessageIndex = 0;
            }
            
            var messageEl = document.getElementById('loading-message');
            if (messageEl) {
              messageEl.textContent = self.loadingMessages[self.currentMessageIndex];
            }
          }, 2500);
          
          // Atualizar timer a cada segundo
          this.loadingTimerInterval = setInterval(function() {
            var elapsed = Math.floor((Date.now() - self.loadingStartTime) / 1000);
            var timerEl = document.getElementById('loading-timer');
            if (timerEl) {
              timerEl.textContent = elapsed + 's';
            }
          }, 1000);
        }
      },
      
      stopDynamicLoading: function() {
        if (this.loadingInterval) {
          clearInterval(this.loadingInterval);
          this.loadingInterval = null;
        }
        if (this.loadingTimerInterval) {
          clearInterval(this.loadingTimerInterval);
          this.loadingTimerInterval = null;
        }
      },

      hideAllSections: function() {
        this.stopDynamicLoading();
        
        // Destruir gráfico se existir
        if (this.chartInstance) {
          this.chartInstance.destroy();
          this.chartInstance = null;
        }
        
        if (this.loadingEl) this.loadingEl.style.display = 'none';
        if (this.contentEl) this.contentEl.style.display = 'none';
        if (this.errorEl) this.errorEl.style.display = 'none';
        if (this.emptyEl) this.emptyEl.style.display = 'none';
      },

      initializeFromURL: function() {
        var filtros = this.getURLFilters();
        this.loadRelatorios(filtros.periodo, filtros.dataInicio, filtros.dataFim);
      },
      
      getURLFilters: function() {
        var params = new URLSearchParams(window.location.search);
        return {
          periodo: params.get('periodo') || 'mes',
          dataInicio: params.get('data_inicio'),
          dataFim: params.get('data_fim')
        };
      },
      
      updateURL: function(periodo, dataInicio, dataFim) {
        var params = new URLSearchParams(window.location.search);
        
        // Atualizar parâmetros
        params.set('periodo', periodo);
        
        if (dataInicio && dataFim && periodo === 'personalizado') {
          params.set('data_inicio', dataInicio);
          params.set('data_fim', dataFim);
        } else {
          params.delete('data_inicio');
          params.delete('data_fim');
        }
        
        // Atualizar URL sem recarregar a página
        var newURL = window.location.pathname + '?' + params.toString();
        window.history.replaceState({}, '', newURL);
      },
      
      loadDataFromAPI: function(periodo, dataInicio, dataFim) {
        var self = this;
        
        // Preparar payload do filtro
        var filtroPayload = this.prepararFiltroPayload(periodo, dataInicio, dataFim);
        
        console.log('📡 Enviando request para API:', filtroPayload);
        
        fetch('https://n8n2.rooftop.com.br/webhook/portal/get-activities/dashboard', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(filtroPayload)
        })
        .then(function(response) {
          console.log('📡 Response status:', response.status);
          if (!response.ok) {
            throw new Error('Network response was not ok: ' + response.status);
          }
          return response.json();
        })
        .then(function(data) {
          console.log('📊 Dados recebidos da API:', data);
          
          // Verificar se há erro na resposta
          if (data.error === true) {
            console.error('❌ API retornou erro:', data);
            self.showRefreshError();
            return;
          }
          
          var processedData = self.processAPIResponse(data, periodo, dataInicio, dataFim);
          self.handleRelatoriosResponse(processedData, false);
        })
        .catch(function(error) {
          console.error('❌ Erro ao carregar dados da API:', error);
          self.showRefreshError();
        });
      },
      
      prepararFiltroPayload: function(periodo, dataInicio, dataFim) {
        var payload = {
          filtro: {
            periodo: periodo || 'mes'
          },
          contact_id: ''
        };
        
        var contact_id = window.hubspotContactId
        payload.contact_id = contact_id

        // Adicionar datas específicas se for período personalizado
        if (periodo === 'personalizado' && dataInicio && dataFim) {
          payload.filtro.data_inicio = dataInicio;
          payload.filtro.data_fim = dataFim;
        } else {
          // Calcular datas baseado no período
          payload.filtro.data_inicio = this.calcularDataInicio(periodo);
          payload.filtro.data_fim = this.calcularDataFim(periodo);
        }
        
        return payload;
      },
      
      processAPIResponse: function(apiResponse, periodo, dataInicio, dataFim) {
        console.log('🔄 Processando resposta da API...', apiResponse);
        
        // Verificar se há erro na resposta
        if (apiResponse && apiResponse.error === true) {
          throw new Error('API retornou erro');
        }
        
        // A resposta vem em formato de array com um objeto que contém resumo, grafico e metadata
        var responseData = null;
        
        if (Array.isArray(apiResponse) && apiResponse.length > 0) {
          responseData = apiResponse[0];
        } else if (apiResponse && !Array.isArray(apiResponse)) {
          responseData = apiResponse;
        } else {
          console.warn('⚠️ Formato de resposta inesperado:', apiResponse);
          // Se não houver dados, retornar valores zerados
          responseData = {
            resumo: {
              imoveis_enviados: 0,
              visitas_marcadas: 0,
              visitas_realizadas: 0,
              documentos_rececebidos: 0,
              apresentacoes_realiadas: 0,
              ganhos: 0,
              perdidos: 0
            },
            grafico: null,
            metadata: null
          };
        }
        
        // Extrair dados do resumo
        var resumo = responseData.resumo || {};
        
        console.log('📊 Dados do resumo processados:', {
          imoveis_enviados: resumo.imoveis_enviados,
          visitas_marcadas: resumo.visitas_marcadas,
          visitas_realizadas: resumo.visitas_realizadas,
          documentos_rececebidos: resumo.documentos_rececebidos,
          apresentacoes_realiadas: resumo.apresentacoes_realiadas,
          ganhos: resumo.ganhos,
          perdidos: resumo.perdidos
        });
        
        // Mapear os campos da API para o formato esperado pelo módulo
        return {
          indicadores: {
            imoveisEnviados: resumo.imoveis_enviados || 0,
            visitasMarcadas: resumo.visitas_marcadas || 0,
            visitasRealizadas: resumo.visitas_realizadas || 0,
            documentosRecebidos: resumo.documentos_rececebidos || 0, // Manter o typo da API
            apresentacoesRealizadas: resumo.apresentacoes_realiadas || 0, // Manter o typo da API
            resultadosPositivos: resumo.ganhos || 0,
            resultadosNegativos: resumo.perdidos || 0
          },
          grafico: responseData.grafico || null,
          metadata: responseData.metadata || null,
          periodo: {
            inicio: dataInicio || this.calcularDataInicio(periodo),
            fim: dataFim || this.calcularDataFim(periodo),
            tipo: periodo || 'mes'
          },
          fonte: 'api'
        };
      },

      handleRelatoriosResponse: function(data, isMocked) {
        console.log('📊 Processando dados de relatórios...:', data);
        
        this.hideAllSections();
        
        // Verificar se temos dados válidos
        if (!data || !data.indicadores) {
          console.error('❌ Dados inválidos recebidos:', data);
          this.showErrorState('Dados de relatórios inválidos');
          return;
        }

        // Verificar se todos os dados são zero (possível problema)
        var todosZero = Object.values(data.indicadores).every(function(val) {
          return val === 0 || val === null || val === undefined;
        });
        
        if (todosZero && !isMocked) {
          console.warn('⚠️ Todos os indicadores retornaram zero - possível problema na API');
        }
        
        this.renderRelatorios(data, isMocked);
      },
      
      showErrorState: function(message) {
        this.hideAllSections();
        if (this.errorEl) {
          this.errorEl.querySelector('p').textContent = message || 'Erro ao carregar os dados dos relatórios.';
          this.errorEl.style.display = 'block';
        }
      },
      
      showRefreshError: function() {
        this.hideAllSections();
        this.stopDynamicLoading();
        if (this.contentEl) {
          this.contentEl.innerHTML = `
            <div class="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
              <div class="flex justify-center mb-4">
                <svg class="h-16 w-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>
              <h3 class="text-xl font-semibold text-red-800 mb-2">Erro ao carregar dados</h3>
              <p class="text-red-600 mb-6">Não foi possível carregar os dados do dashboard. Por favor, tente novamente.</p>
              <button onclick="location.reload()" class="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-6 rounded-lg transition-colors">
                <svg class="inline h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                Recarregar Página
              </button>
            </div>
          `;
          this.contentEl.style.display = 'block';
        }
      },

      renderRelatorios: function(data, isMocked) {
        if (!this.contentEl) return;

        // Parar o loading dinâmico
        this.stopDynamicLoading();
        
        var html = this.generateRelatoriosHTML(data, isMocked);
        this.contentEl.innerHTML = html;
        this.contentEl.style.display = 'block';
        
        this.addEventListeners();
        
        // Renderizar gráfico se houver dados
        var self = this;
        setTimeout(function() {
          if (data.grafico) {
            self.renderApexChart(data.grafico);
          } else {
            console.warn('⚠️ Dados do gráfico não encontrados em:', data);
            self.renderApexChart(null);
          }
        }, 100);
      },

      generateRelatoriosHTML: function(data, isMocked) {
        var indicadores = data.indicadores;
        console.log('DADOS generate Relatorios HTML', data);
        var periodoFormatado = this.formatarPeriodoComDados(data.periodo);
        
        return `
          <div class="space-y-6">
            <!-- ${isMocked ? '' : this.generateAPIBanner()} -->
            
            <!-- Cabeçalho -->
            <div class="bg-white rounded-lg shadow border border-gray-200 p-6">
              <div class="flex items-center justify-between">
                <div>
                  <h1 class="text-3xl font-bold text-gray-900">Relatórios de Performance</h1>
                  <p class="text-gray-600 mt-2">Indicadores de desempenho - <span id="periodo-atual">${periodoFormatado}</span></p>
                </div>
                <div class="flex items-center gap-4">
                  <!-- Filtro de Data -->
                  <div class="flex items-center gap-2">
                    <label class="text-sm font-medium text-gray-700">Período:</label>
                    <select id="filtro-periodo" class="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="hoje" ${data.periodo && data.periodo.tipo === 'hoje' ? 'selected' : ''}>Hoje</option>
                      <option value="semana" ${data.periodo && data.periodo.tipo === 'semana' ? 'selected' : ''}>Esta Semana</option>
                      <option value="mes" ${!data.periodo || data.periodo.tipo === 'mes' ? 'selected' : ''}>Este Mês</option>
                      <option value="trimestre" ${data.periodo && data.periodo.tipo === 'trimestre' ? 'selected' : ''}>Este Trimestre</option>
                      <option value="ano" ${data.periodo && data.periodo.tipo === 'ano' ? 'selected' : ''}>Este Ano</option>
                      <option value="personalizado" ${data.periodo && data.periodo.tipo === 'personalizado' ? 'selected' : ''}>Período Personalizado</option>
                    </select>
                  </div>
                  
                  <!-- Campos de Data Personalizada (inicialmente ocultos) -->
                  <div id="datas-personalizadas" class="hidden flex items-center gap-2">
                    <input type="date" id="data-inicio" class="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <span class="text-gray-500">até</span>
                    <input type="date" id="data-fim" class="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  </div>
                  
                  <div class="bg-blue-100 p-3 rounded-lg">
                    <svg class="h-8 w-8 text-blue-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <!-- Grid de Todos os Indicadores em Uma Linha -->
            <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
              ${this.generateIndicadorCard('Imóveis Enviados', indicadores.imoveisEnviados, 'text-blue-800', 'bg-blue-100', this.getHomeIcon())}
              ${this.generateIndicadorCard('Visitas Marcadas', indicadores.visitasMarcadas, 'text-purple-800', 'bg-purple-100', this.getCalendarIcon())}
              ${this.generateIndicadorCard('Visitas Realizadas', indicadores.visitasRealizadas, 'text-indigo-800', 'bg-indigo-100', this.getCheckIcon())}
              ${this.generateIndicadorCard('Documentos Recebidos', indicadores.documentosRecebidos, 'text-orange-800', 'bg-orange-100', this.getDocumentIcon())}
              ${this.generateIndicadorCard('Apresentações Realizadas', indicadores.apresentacoesRealizadas, 'text-red-800', 'bg-red-100', this.getPresentationDoneIcon())}
            </div>

            <!-- Resultados Finais -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              ${this.generateResultadoCard('Resultados Positivos', indicadores.resultadosPositivos, 'green', 'Negócios finalizados com sucesso', true)}
              ${this.generateResultadoCard('Resultados Negativos', indicadores.resultadosNegativos, 'red', 'Negócios não concluídos', false)}
            </div>

            <!-- Gráfico de Evolução -->
            <div class="bg-white rounded-lg shadow border border-gray-200 p-6">
              <div class="mb-4">
                <h3 class="text-lg font-semibold text-gray-900">Evolução dos Indicadores</h3>
                <p class="text-gray-600 text-sm">Acompanhe o desempenho dos seus indicadores ao longo do tempo</p>
              </div>
              <div id="performance-chart" class="w-full"></div>
            </div>

            <!-- Rodapé Explicativo -->
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div class="flex items-start">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div class="ml-3">
                  <h3 class="text-sm font-medium text-blue-800">Como os dados são filtrados</h3>
                  <div class="mt-1 text-sm text-blue-700">
                    <p>Os indicadores são baseados na <strong>data de criação</strong> dos registros no período selecionado. Use os filtros acima para alterar o período de análise e visualizar dados históricos ou personalizados.</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tabela Detalhada 
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
                    ${this.generateIndicadorRow('Visitas Marcadas', indicadores.visitasMarcadas, 25)}
                    ${this.generateIndicadorRow('Visitas Realizadas', indicadores.visitasRealizadas, 20)}
                    ${this.generateIndicadorRow('Documentos Recebidos', indicadores.documentosRecebidos, 15)}
                    ${this.generateIndicadorRow('Apresentações Realizadas', indicadores.apresentacoesRealizadas, 10)}
                    ${this.generateIndicadorRow('Resultados Positivos', indicadores.resultadosPositivos, 8)}
                  </tbody>
                </table>
              </div>
            </div>
            -->
          </div>
        `;
      },

      generateDemoBanner: function() {
        return `
          <div class="bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 rounded-lg p-4">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-amber-800">Dados de Demonstração</h3>
                <div class="mt-1 text-sm text-amber-700">
                  <p>API indisponível - exibindo dados simulados. Verifique a conexão com o servidor.</p>
                </div>
              </div>
            </div>
          </div>
        `;
      },
      
      generateAPIBanner: function() {
        return `
          <div class="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-green-800">Dados Atualizados</h3>
                <div class="mt-1 text-sm text-green-700">
                  <p>Dados carregados em tempo real via API N8N. Última atualização: ${new Date().toLocaleTimeString('pt-BR')}</p>
                </div>
              </div>
            </div>
          </div>
        `;
      },

      generateIndicadorCard: function(titulo, valor, textColor, bgColor, icon) {
        // Se o valor for 0, mostrar empty state
        if (valor === 0 || valor === null || valor === undefined) {
          return this.generateEmptyStateCard(titulo, textColor, bgColor, icon);
        }
        
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
      
      generateEmptyStateCard: function(titulo, textColor, bgColor, icon) {
        var mensagens = {
          'Imóveis Enviados': 'Comece enviando imóveis',
          'Visitas Marcadas': 'Agende visitas',
          'Visitas Realizadas': 'Registre visitas',
          'Documentos Recebidos': 'Registre documentos',
          'Apresentações Realizadas': 'Registre apresentações'
        };
        
        var mensagem = mensagens[titulo] || 'Registre atividades';
        
        return `
          <div class="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div class="flex items-center">
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-500">${titulo}</p>
                <p class="text-3xl font-semibold text-gray-400">0</p>
                <p class="text-xs text-gray-400 mt-1">${mensagem}</p>
              </div>
              <div class="flex-shrink-0">
                <div class="w-12 h-12 ${bgColor} rounded-lg flex items-center justify-center opacity-50">
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

      getMockRelatoriosData: function(periodo, dataInicio, dataFim) {
        // Dados base que variam conforme o período
        var multiplicadores = {
          'hoje': 0.1,
          'semana': 0.3,
          'mes': 1.0,
          'trimestre': 2.5,
          'ano': 10.0,
          'personalizado': 1.5
        };
        
        var mult = multiplicadores[periodo] || 1.0;
        
        // Adicionar variação aleatória para simular dados reais
        var variacao = function(base, fator) {
          return Math.round(base * fator * (0.8 + Math.random() * 0.4));
        };
        
        return {
          indicadores: {
            imoveisEnviados: variacao(42, mult),
            visitasMarcadas: variacao(28, mult),
            visitasRealizadas: variacao(22, mult),
            documentosRecebidos: variacao(18, mult),
            apresentacoesRealizadas: variacao(12, mult),
            resultadosPositivos: variacao(8, mult),
            resultadosNegativos: variacao(4, mult)
          },
          periodo: {
            inicio: dataInicio || this.calcularDataInicio(periodo),
            fim: dataFim || this.calcularDataFim(periodo),
            tipo: periodo || 'mes'
          }
        };
      },
      
      calcularDataInicio: function(periodo) {
        var agora = new Date();
        switch(periodo) {
          case 'hoje':
            return agora.toISOString().split('T')[0];
          case 'semana':
            var inicioSemana = new Date(agora);
            inicioSemana.setDate(agora.getDate() - agora.getDay());
            return inicioSemana.toISOString().split('T')[0];
          case 'mes':
            return new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString().split('T')[0];
          case 'trimestre':
            var inicioTrimestre = new Date(agora.getFullYear(), Math.floor(agora.getMonth() / 3) * 3, 1);
            return inicioTrimestre.toISOString().split('T')[0];
          case 'ano':
            return new Date(agora.getFullYear(), 0, 1).toISOString().split('T')[0];
          default:
            return agora.toISOString().split('T')[0];
        }
      },
      
      calcularDataFim: function(periodo) {
        var agora = new Date();
        switch(periodo) {
          case 'hoje':
            return agora.toISOString().split('T')[0];
          case 'semana':
            var fimSemana = new Date(agora);
            fimSemana.setDate(agora.getDate() + (6 - agora.getDay()));
            return fimSemana.toISOString().split('T')[0];
          case 'mes':
            return new Date(agora.getFullYear(), agora.getMonth() + 1, 0).toISOString().split('T')[0];
          case 'trimestre':
            var fimTrimestre = new Date(agora.getFullYear(), Math.floor(agora.getMonth() / 3) * 3 + 3, 0);
            return fimTrimestre.toISOString().split('T')[0];
          case 'ano':
            return new Date(agora.getFullYear(), 11, 31).toISOString().split('T')[0];
          default:
            return agora.toISOString().split('T')[0];
        }
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
        var self = this;
        
        // Filtro de período
        var filtroPeriodo = document.getElementById('filtro-periodo');
        var datasPersonalizadas = document.getElementById('datas-personalizadas');
        var dataInicio = document.getElementById('data-inicio');
        var dataFim = document.getElementById('data-fim');
        
        if (filtroPeriodo) {
          // Definir valor inicial baseado na URL
          var filtrosURL = self.getURLFilters();
          filtroPeriodo.value = filtrosURL.periodo;
          
          // Mostrar campos personalizados se necessário
          if (filtrosURL.periodo === 'personalizado') {
            if (datasPersonalizadas) datasPersonalizadas.classList.remove('hidden');
            if (dataInicio && filtrosURL.dataInicio) dataInicio.value = filtrosURL.dataInicio;
            if (dataFim && filtrosURL.dataFim) dataFim.value = filtrosURL.dataFim;
          }
          
          filtroPeriodo.addEventListener('change', function() {
            console.log('📅 Período alterado:', this.value);
            
            // Mostrar/ocultar campos de data personalizada
            if (this.value === 'personalizado') {
              if (datasPersonalizadas) datasPersonalizadas.classList.remove('hidden');
            } else {
              if (datasPersonalizadas) datasPersonalizadas.classList.add('hidden');
              self.atualizarRelatorios(this.value);
            }
          });
        }
        
        // Campos de data personalizada
        if (dataInicio && dataFim) {
          dataInicio.addEventListener('change', function() {
            if (dataFim.value && this.value) {
              self.atualizarRelatorios('personalizado', this.value, dataFim.value);
            }
          });
          
          dataFim.addEventListener('change', function() {
            if (dataInicio.value && this.value) {
              self.atualizarRelatorios('personalizado', dataInicio.value, this.value);
            }
          });
        }
        
        console.log('📊 Event listeners adicionados para relatórios com filtros');
      },
      
      atualizarRelatorios: function(periodo, dataInicio, dataFim) {
        var self = this;
        
        console.log('🔄 Atualizando relatórios para período:', periodo);
        
        // Mostrar loading dinâmico
        this.hideAllSections();
        this.startDynamicLoading();
        
        // Carregar dados da API
        this.loadDataFromAPI(periodo, dataInicio, dataFim);
        
        // Atualizar URL com novos filtros
        this.updateURL(periodo, dataInicio, dataFim);
      },
      
      generateResultadoCard: function(titulo, valor, cor, descricao, isPositive) {
        var isEmpty = valor === 0 || valor === null || valor === undefined;
        var iconPath = isPositive ? 
          'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' : 
          'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z';
        
        if (isEmpty) {
          var mensagem = isPositive ? 
            'Continue trabalhando para fechar negócios' : 
            'Mantenha o foco e aprenda com os desafios';
          
          return `
            <div class="bg-white rounded-lg shadow border border-gray-200 p-6">
              <div class="flex items-center mb-4">
                <div class="bg-${cor}-100 p-2 rounded-lg mr-3 opacity-50">
                  <svg class="h-6 w-6 text-${cor}-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${iconPath}"/>
                  </svg>
                </div>
                <h3 class="text-lg font-semibold text-gray-900">${titulo}</h3>
              </div>
              <div class="text-3xl font-bold text-gray-400 mb-2">0</div>
              <p class="text-gray-400 text-sm">${mensagem}</p>
            </div>
          `;
        }
        
        return `
          <div class="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div class="flex items-center mb-4">
              <div class="bg-${cor}-100 p-2 rounded-lg mr-3">
                <svg class="h-6 w-6 text-${cor}-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${iconPath}"/>
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-gray-900">${titulo}</h3>
            </div>
            <div class="text-3xl font-bold text-${cor}-600 mb-2">${valor}</div>
            <p class="text-gray-600">${descricao}</p>
          </div>
        `;
      },
      
      renderApexChart: function(chartData) {
        var self = this;
        
        console.log('📈 Renderizando gráfico ApexChart:', chartData);
        
        // Verificar se ApexCharts está disponível
        if (typeof ApexCharts === 'undefined') {
          console.error('❌ ApexCharts não está disponível');
          return;
        }
        
        // Destruir gráfico anterior se existir
        if (this.chartInstance) {
          this.chartInstance.destroy();
          this.chartInstance = null;
        }
        
        // Verificar se há dados do gráfico
        if (!chartData || !chartData.series || !chartData.options) {
          console.warn('⚠️ Dados do gráfico não disponíveis');
          // Mostrar mensagem de empty state no gráfico
          var chartContainer = document.getElementById('performance-chart');
          if (chartContainer) {
            chartContainer.innerHTML = 
              '<div class="flex flex-col items-center justify-center py-16 text-gray-400">' +
                '<svg class="h-16 w-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                  '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/>' +
                '</svg>' +
                '<p class="text-lg font-medium">Nenhum dado para exibir</p>' +
                '<p class="text-sm">Registre atividades para visualizar o gráfico</p>' +
              '</div>';
          }
          return;
        }
        
        try {
          // Configurar opções do gráfico
          var options = Object.assign({}, chartData.options);
          options.series = chartData.series;
          options.chart = Object.assign({}, chartData.options.chart);
          options.chart.height = 400;
          options.chart.type = 'line';
          options.chart.animations = {
            enabled: true,
            easing: 'easeinout',
            speed: 800
          };
          
          console.log('📊 Opções do gráfico configuradas:', options);
          
          // Criar novo gráfico
          this.chartInstance = new ApexCharts(
            document.querySelector('#performance-chart'),
            options
          );
          
          // Renderizar o gráfico
          this.chartInstance.render();
          
          console.log('✅ Gráfico ApexChart renderizado com sucesso');
          
        } catch (error) {
          console.error('❌ Erro ao renderizar gráfico:', error);
          var chartContainer = document.getElementById('performance-chart');
          if (chartContainer) {
            chartContainer.innerHTML = 
              '<div class="flex flex-col items-center justify-center py-16 text-red-400">' +
                '<svg class="h-16 w-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                  '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>' +
                '</svg>' +
                '<p class="text-lg font-medium">Erro ao carregar gráfico</p>' +
                '<p class="text-sm">Tente recarregar a página</p>' +
              '</div>';
          }
        }
      },
      
      formatarPeriodo: function(periodo, dataInicio, dataFim) {
        var agora = new Date();
        var meses = [
          'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        
        switch(periodo) {
          case 'hoje':
            return agora.toLocaleDateString('pt-BR');
          case 'semana':
            var inicioSemana = new Date(agora);
            inicioSemana.setDate(agora.getDate() - agora.getDay());
            return 'Semana de ' + inicioSemana.toLocaleDateString('pt-BR');
          case 'mes':
            return meses[agora.getMonth()] + ' ' + agora.getFullYear();
          case 'trimestre':
            var trimestre = Math.floor(agora.getMonth() / 3) + 1;
            return trimestre + 'º Trimestre ' + agora.getFullYear();
          case 'ano':
            return 'Ano ' + agora.getFullYear();
          case 'personalizado':
            if (dataInicio && dataFim) {
              return new Date(dataInicio).toLocaleDateString('pt-BR') + ' até ' + new Date(dataFim).toLocaleDateString('pt-BR');
            }
            return 'Período Personalizado';
          default:
            return meses[agora.getMonth()] + ' ' + agora.getFullYear();
        }
      },
      
      formatarPeriodoComDados: function(periodoDados) {
        if (!periodoDados) {
          return this.getCurrentMonth();
        }
        
        var inicio = periodoDados.inicio;
        var fim = periodoDados.fim;
        var tipo = periodoDados.tipo;
        
        // Se temos dados reais de início e fim, usar eles
        if (inicio && fim) {
          var dataInicio = new Date(inicio);
          var dataFim = new Date(fim);
          
          // Para períodos personalizados, sempre mostrar as datas
          if (tipo === 'personalizado') {
            return dataInicio.toLocaleDateString('pt-BR') + ' até ' + dataFim.toLocaleDateString('pt-BR');
          }
          
          // Para outros períodos, usar formatação específica
          var meses = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
          ];
          
          switch(tipo) {
            case 'hoje':
              return dataInicio.toLocaleDateString('pt-BR');
            case 'semana':
              return 'Semana de ' + dataInicio.toLocaleDateString('pt-BR');
            case 'mes':
              return meses[dataInicio.getMonth()] + ' ' + dataInicio.getFullYear();
            case 'trimestre':
              var trimestre = Math.floor(dataInicio.getMonth() / 3) + 1;
              return trimestre + 'º Trimestre ' + dataInicio.getFullYear();
            case 'ano':
              return 'Ano ' + dataInicio.getFullYear();
            default:
              return dataInicio.toLocaleDateString('pt-BR') + ' até ' + dataFim.toLocaleDateString('pt-BR');
          }
        }
        
        // Fallback para o método antigo se não há dados
        return this.formatarPeriodo(tipo);
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