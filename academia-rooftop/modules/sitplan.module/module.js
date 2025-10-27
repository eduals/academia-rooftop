// Módulo de Indicadores de Performance - Academia Rooftop
(function () {
  'use strict';

  var module = {
    n8nConfig: {
      baseUrl: 'https://n8n2.rooftop.com.br/webhook/portal/sitplan',
      endpoints: {
        get: '/get',
        save: '/save'
      }
    },

    init: function () {
      this.container = document.querySelector('[data-module="sitplanModule"]');
      if (!this.container) return;

      this.contentEl = this.container.querySelector('.sitplan-content');
      this.errorEl = this.container.querySelector('.sitplan-error');

      // Verificar se há contact_id
      var contactId = window.hubspotContactId;

      if (!contactId) {
        this.showError('ID do franqueado não encontrado');
        return;
      }

      this.loadIndicadores();
    },

    // Função para buscar indicadores via API
    fetchIndicadoresFromAPI: async function(contactId) {
      var url = this.n8nConfig.baseUrl + this.n8nConfig.endpoints.get + '?contact_id=' + contactId;

      try {
        var response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('HTTP error! status: ' + response.status);
        }

        // Verificar se há conteúdo na resposta
        var text = await response.text();

        // Se a resposta estiver vazia, retornar objeto vazio
        if (!text || text.trim() === '') {
          console.log('📭 Nenhum indicador encontrado (resposta vazia)');
          return { data: [] };
        }

        // Tentar fazer parse do JSON
        try {
          var data = JSON.parse(text);
          return data;
        } catch (parseError) {
          console.error('⚠️ Erro ao fazer parse do JSON:', parseError);
          console.log('📄 Resposta recebida:', text);
          return { data: [] };
        }

      } catch (error) {
        console.error('❌ Erro ao buscar indicadores:', error);
        return null;
      }
    },

    loadIndicadores: function () {
      var self = this;

      this.hideAllSections();
      this.showSkeleton();

      var contactId = window.hubspotContactId;

      if (!contactId) {
        setTimeout(function() {
          self.showError('ID do franqueado não encontrado');
        }, 500);
        return;
      }

      // Buscar dados via API
      this.fetchIndicadoresFromAPI(contactId)
        .then(function(response) {
          console.log('✅ Response da API:', response);

          // Novo formato: response.data contém array misto com tipos diferentes
          if (response && response.data && Array.isArray(response.data)) {
            console.log('📦 Novo formato detectado (array com tipos)');

            // Separar por tipo
            var resumoGeral = response.data.find(function(item) { return item.tipo === 'RESUMO_GERAL'; });
            var evolucaoSemanal = response.data.filter(function(item) { return item.tipo === 'EVOLUCAO_SEMANAL'; });
            var dadosSemanais = response.data.filter(function(item) { return item.tipo === 'DADOS_SEMANAIS'; });

            console.log('📊 Resumo Geral:', resumoGeral);
            console.log('📈 Evolução Semanal:', evolucaoSemanal.length, 'itens');
            console.log('📋 Dados Semanais:', dadosSemanais.length, 'itens');

            if (dadosSemanais.length > 0) {
              self.handleIndicadoresResponse({
                RESUMO_GERAL: resumoGeral,
                EVOLUCAO_SEMANAL: evolucaoSemanal,
                DADOS_SEMANAIS: dadosSemanais
              });
            } else {
              console.log('📊 Nenhum indicador cadastrado ainda');
              self.showNoData();
            }
            return;
          }

          // Formato antigo com objetos separados (fallback)
          if (response && response.DADOS_SEMANAIS) {
            console.log('📦 Formato antigo com RESUMO_GERAL, EVOLUCAO_SEMANAL, DADOS_SEMANAIS');

            if (response.DADOS_SEMANAIS.length > 0) {
              self.handleIndicadoresResponse(response);
            } else {
              console.log('📊 Nenhum indicador cadastrado ainda');
              self.showNoData();
            }
            return;
          }

          // Formato muito antigo (array direto)
          var dataArray = null;

          // Se a resposta é um array direto
          if (Array.isArray(response)) {
            console.log('📦 Resposta é array direto');
            dataArray = response;
          }
          // Se for um objeto único com franqueado_id, transformar em array
          else if (response && typeof response === 'object' && response.franqueado_id) {
            console.log('📦 Resposta é objeto único, convertendo para array');
            dataArray = [response];
          }

          // Processar os dados (formato muito antigo)
          if (dataArray && dataArray.length > 0) {
            self.handleIndicadoresResponse({ DADOS_SEMANAIS: dataArray });
          } else if (dataArray && dataArray.length === 0) {
            console.log('📊 Nenhum indicador cadastrado ainda');
            self.showNoData();
          } else {
            console.warn('⚠️ Formato de resposta inesperado:', response);
            self.showNoData();
          }
        })
        .catch(function(error) {
          console.error('❌ Erro ao carregar indicadores:', error);
          self.showError('Erro ao carregar indicadores. Tente novamente.');
        });
    },

    showSkeleton: function () {
      if (!this.contentEl) return;

      var skeletonHTML = this.generateSkeletonHTML();
      this.contentEl.innerHTML = skeletonHTML;
      this.contentEl.style.display = 'block';
    },

    hideAllSections: function () {
      if (this.errorEl) this.errorEl.style.display = 'none';
    },

    showError: function (message) {
      this.hideAllSections();

      if (this.errorEl) {
        var errorMessage = this.errorEl.querySelector('.error-message');
        if (errorMessage) {
          errorMessage.textContent = message || 'Erro ao carregar os dados';
        }
        this.errorEl.style.display = 'block';
      }
    },

    handleIndicadoresResponse: function (data) {
      this.hideAllSections();

      // Extrair dados
      var dadosSemanais = data.DADOS_SEMANAIS || [];

      if (dadosSemanais.length === 0) {
        this.showNoData();
      } else {
        this.renderIndicadores(dadosSemanais);
      }
    },

    renderIndicadores: function (indicadores) {
      if (!this.contentEl) return;

      // Ordenar por semana descendente (mais recente primeiro)
      indicadores.sort(function(a, b) {
        // Primeiro por ano, depois por semana
        if (a.num_ano !== b.num_ano) {
          return b.num_ano - a.num_ano; // Ano mais recente primeiro
        }
        return b.num_semana - a.num_semana; // Semana mais recente primeiro
      });

      var html = '<div class="space-y-6">';

      // Botões de ação (Legenda, Registrar, Salvar Alterações)
      html += `
        <div class="flex justify-between items-center mb-4">
          <button
            onclick="window.sitplanModule.abrirModalLegenda()"
            class="cursor-pointer inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            title="Como ler os indicadores"
          >
            <svg class="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
            </svg>
            Como Ler os Indicadores
          </button>
          <div class="flex gap-2">

          <!-- <button
              id="btn-salvar-alteracoes"
              onclick="window.sitplanModule.salvarTodasAlteracoes()"
              class="hidden inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span id="btn-salvar-alteracoes-text">Salvar Alterações</span>
            </button>

            <button
              id="btn-cancelar-alteracoes"
              onclick="window.sitplanModule.cancelarAlteracoes()"
              class="hidden inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Cancelar
            </button>
            -->

            <button
              onclick="window.sitplanModule.adicionarLinhaNovaTabela()"
              class="cursor-pointer inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
              Registrar Indicadores
            </button>
          </div>
        </div>
      `;

      // Tabela de indicadores
      html += this.generateTableHTML(indicadores);

      html += '</div>';

      this.contentEl.innerHTML = html;
      this.contentEl.style.display = 'block';

      // Inicializar sistema de edição inline
      this.initInlineEditing();
    },

    // Sistema de rastreamento de mudanças inline
    editedRows: {},

    initInlineEditing: function() {
      // Event listeners agora são adicionados dinamicamente quando
      // o modo de edição é ativado via ativarModoEdicaoLinha()
      // Esta função é mantida para compatibilidade
    },

    checkCellChange: function(cell) {
      var originalValue = cell.getAttribute('data-original-value');
      var currentValue = cell.textContent.trim();
      var field = cell.getAttribute('data-field');
      var dataRegistro = cell.getAttribute('data-data-registro');

      // Se mudou, adicionar ao tracker
      if (currentValue !== originalValue) {
        if (!this.editedRows[dataRegistro]) {
          this.editedRows[dataRegistro] = {};
        }
        this.editedRows[dataRegistro][field] = currentValue === '-' ? null : parseInt(currentValue);

        // Adicionar classe visual à linha alterada
        var row = cell.closest('tr');
        if (row && !row.classList.contains('row-edited')) {
          row.classList.add('row-edited', 'bg-yellow-50');
        }
      } else {
        // Se voltou ao valor original, remover do tracker
        if (this.editedRows[dataRegistro] && this.editedRows[dataRegistro][field]) {
          delete this.editedRows[dataRegistro][field];

          // Se não há mais campos editados nessa linha, remover a linha do tracker
          if (Object.keys(this.editedRows[dataRegistro]).length === 0) {
            delete this.editedRows[dataRegistro];

            // Remover classe visual
            var row = cell.closest('tr');
            if (row) {
              row.classList.remove('row-edited', 'bg-yellow-50');
            }
          }
        }
      }

      // Atualizar visibilidade dos botões
      this.updateSaveButtonVisibility();
    },

    updateSaveButtonVisibility: function() {
      var btnSalvar = document.getElementById('btn-salvar-alteracoes');
      var btnCancelar = document.getElementById('btn-cancelar-alteracoes');
      var btnSalvarText = document.getElementById('btn-salvar-alteracoes-text');

      var numLinhasAlteradas = Object.keys(this.editedRows).length;

      if (numLinhasAlteradas > 0) {
        if (btnSalvar) {
          btnSalvar.classList.remove('hidden');
          btnSalvar.classList.add('inline-flex');
        }
        if (btnCancelar) {
          btnCancelar.classList.remove('hidden');
          btnCancelar.classList.add('inline-flex');
        }
        if (btnSalvarText) {
          btnSalvarText.textContent = 'Salvar Alterações (' + numLinhasAlteradas + ')';
        }
      } else {
        if (btnSalvar) {
          btnSalvar.classList.add('hidden');
          btnSalvar.classList.remove('inline-flex');
        }
        if (btnCancelar) {
          btnCancelar.classList.add('hidden');
          btnCancelar.classList.remove('inline-flex');
        }
      }
    },

    cancelarAlteracoes: function() {
      // Reverter todas as células aos valores originais
      var editableCells = document.querySelectorAll('.editable-cell');
      editableCells.forEach(function(cell) {
        cell.textContent = cell.getAttribute('data-original-value');
      });

      // Remover classes visuais das linhas
      var editedRowElements = document.querySelectorAll('.row-edited');
      editedRowElements.forEach(function(row) {
        row.classList.remove('row-edited', 'bg-yellow-50');
      });

      // Limpar tracker
      this.editedRows = {};

      // Atualizar botões
      this.updateSaveButtonVisibility();
    },

    salvarTodasAlteracoes: async function() {
      var self = this;
      var dataRegistros = Object.keys(this.editedRows);

      if (dataRegistros.length === 0) {
        return;
      }

      // Desabilitar botão e mostrar loading
      var btnSalvar = document.getElementById('btn-salvar-alteracoes');
      var btnSalvarText = document.getElementById('btn-salvar-alteracoes-text');
      var originalText = btnSalvarText.textContent;

      if (btnSalvar) {
        btnSalvar.disabled = true;
        btnSalvarText.innerHTML = `
          <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Salvando...
        `;
      }

      // Processar cada linha alterada sequencialmente
      var sucessos = 0;
      var erros = 0;

      for (var i = 0; i < dataRegistros.length; i++) {
        var dataRegistro = dataRegistros[i];
        var camposAlterados = this.editedRows[dataRegistro];

        try {
          // Buscar dados completos da linha
          var row = document.querySelector('tr[data-data-registro="' + dataRegistro + '"]');
          if (!row) continue;

          var itemDataStr = row.getAttribute('data-item');
          var item = JSON.parse(itemDataStr.replace(/&quot;/g, '"'));

          // Montar payload completo com dados originais + alterações
          var payload = this.montarPayloadCompleto(item, camposAlterados);

          // Enviar para API
          await this.salvarIndicadorIndividual(payload);
          sucessos++;

        } catch (error) {
          console.error('❌ Erro ao salvar linha ' + dataRegistro + ':', error);
          erros++;
        }
      }

      // Mostrar resultado
      if (erros === 0) {
        alert('✅ Todas as ' + sucessos + ' alterações foram salvas com sucesso!');
        window.location.reload(); // Recarregar para mostrar dados atualizados
      } else {
        alert('⚠️ ' + sucessos + ' alterações salvas com sucesso, ' + erros + ' com erro.');
        if (btnSalvar) {
          btnSalvar.disabled = false;
          btnSalvarText.textContent = originalText;
        }
      }
    },

    montarPayloadCompleto: function(item, camposAlterados) {
      // Calcular informações de data
      var data = new Date(item.data_registro + 'T00:00:00');
      var numSemana = this.getWeekNumber(data);
      var numDay = data.getDate();
      var numMes = data.getMonth() + 1;
      var numAno = data.getFullYear();
      var numWeekDay = data.getDay();

      // Payload base
      var payload = {
        franqueado_id: parseInt(window.hubspotContactId),
        data_registro: item.data_registro,
        num_semana: numSemana,
        num_day: numDay,
        num_mes: numMes,
        num_ano: numAno,
        num_week_day: numWeekDay
      };

      // Lista de todos os campos
      var fields = [
        'recomendacoes', 'sitplan', 'ligacoes_realizadas', 'ligacoes_atendidas',
        '1visita_marcada', '1visita_realizada', 'dentro_do_perfil', 'docs_recebidos',
        'imoveis_aprovados', '2visita_marcada', '2visita_realizada', 'ok_cliente',
        'doc_enviado', 'contrato_assinados'
      ];

      // Adicionar todos os campos (originais ou alterados)
      fields.forEach(function(field) {
        // Se foi alterado, usar o novo valor, senão usar o original
        if (camposAlterados[field] !== undefined) {
          payload[field] = camposAlterados[field];
        } else {
          var value = item[field];
          payload[field] = value !== null && value !== undefined && value !== '' ? value : null;
        }

        // Adicionar notas (sempre do original, pois não editamos notas inline)
        var notes = item[field + '_notes'] || '';
        payload[field + '_notes'] = notes;
      });

      return payload;
    },

    salvarIndicadorIndividual: function(payload) {
      var url = this.n8nConfig.baseUrl + this.n8nConfig.endpoints.save;

      return fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error('Erro HTTP: ' + response.status);
          }
          return response.text().then(function (text) {
            try {
              return text ? JSON.parse(text) : { success: true };
            } catch (e) {
              return { success: true, data: text };
            }
          });
        });
    },

    abrirModalLegenda: function() {
      var legendaHTML = this.generateLegendaHTML();

      var modalHTML = `
        <div id="modal-legenda-indicadores" class="fixed inset-0 z-50 overflow-y-auto" style="background-color: rgba(0, 0, 0, 0.5);">
          <div class="flex items-center justify-center min-h-screen px-4 py-8">
            <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6">
              <!-- Header -->
              <div class="flex justify-between items-start mb-6">
                <h3 class="text-xl font-bold text-gray-900">Como Ler os Indicadores</h3>
                <button onclick="window.sitplanModule.fecharModalLegenda()" class="cursor-pointer text-gray-400 hover:text-gray-600">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              <!-- Conteúdo da Legenda -->
              ${legendaHTML}

              <!-- Footer -->
              <div class="flex justify-end mt-6 pt-4 border-t">
                <button
                  onclick="window.sitplanModule.fecharModalLegenda()"
                  class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Entendi
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    fecharModalLegenda: function() {
      var modal = document.getElementById('modal-legenda-indicadores');
      if (modal) {
        modal.remove();
      }
    },

    generateResumoGeralHTML: function (resumo) {
      if (!resumo) return '';

      // Função helper para formatar número
      var formatarNumero = function(num) {
        if (num === null || num === undefined) return '0';
        return num.toString();
      };

      return `
        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6 mb-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg class="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"></path>
            </svg>
            Resumo Geral
          </h3>
          <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            ${this.generateKPICard('Recomendações', formatarNumero(resumo.total_recomendacoes), 'bg-blue-100', 'text-blue-700')}
            ${this.generateKPICard('Sitplan', formatarNumero(resumo.total_sitplan), 'bg-purple-100', 'text-purple-700')}
            ${this.generateKPICard('Ligações', formatarNumero(resumo.total_ligacoes_realizadas), 'bg-green-100', 'text-green-700')}
            ${this.generateKPICard('1ª Visita', formatarNumero(resumo.total_1visita_realizada), 'bg-yellow-100', 'text-yellow-700')}
            ${this.generateKPICard('Perfil OK', formatarNumero(resumo.total_dentro_do_perfil), 'bg-indigo-100', 'text-indigo-700')}
            ${this.generateKPICard('2ª Visita', formatarNumero(resumo.total_2visita_realizada), 'bg-pink-100', 'text-pink-700')}
            ${this.generateKPICard('Contratos', formatarNumero(resumo.total_contrato_assinados), 'bg-red-100', 'text-red-700')}
          </div>
        </div>
      `;
    },

    generateKPICard: function (label, value, bgClass, textClass) {
      return `
        <div class="${bgClass} rounded-lg p-4">
          <div class="text-xs font-medium ${textClass} opacity-75 mb-1">${label}</div>
          <div class="text-2xl font-bold ${textClass}">${value}</div>
        </div>
      `;
    },

    generateEvolucaoSemanalHTML: function (evolucao) {
      if (!evolucao || evolucao.length === 0) return '';

      return `
        <div class="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clip-rule="evenodd"></path>
            </svg>
            Evolução Semanal
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${evolucao.map(function(item) {
              // Extrair variação de recomendações (principal métrica)
              var variacaoPct = item.var_recomendacoes_pct || '';
              var isNumerico = !isNaN(parseFloat(variacaoPct));
              var variacao = isNumerico ? parseFloat(variacaoPct) : 0;
              var isPositivo = variacao >= 0;

              var arrowIcon = isPositivo
                ? '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path></svg>'
                : '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>';
              var colorClass = isPositivo ? 'text-green-600' : 'text-red-600';
              var bgClass = isPositivo ? 'bg-green-50' : 'bg-red-50';

              // Se não for numérico, usar fundo neutro
              if (!isNumerico) {
                bgClass = 'bg-gray-50';
                colorClass = 'text-gray-600';
              }

              return `
                <div class="border border-gray-200 rounded-lg p-4 ${bgClass}">
                  <div class="text-sm font-medium text-gray-600 mb-2">Semana ${item.semana}</div>
                  <div class="flex items-center justify-between">
                    <span class="text-xl font-bold text-gray-900">${item.recomendacoes || 0}</span>
                    <div class="flex items-center gap-1 ${colorClass}">
                      ${isNumerico ? arrowIcon : ''}
                      <span class="text-sm font-semibold">${isNumerico ? Math.abs(variacao).toFixed(1) + '%' : variacaoPct}</span>
                    </div>
                  </div>
                  <div class="text-xs text-gray-500 mt-2">${item.tendencia || ''}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    },

    generateLegendaHTML: function () {
      return `
          <div class="space-y-6">
            <!-- Seção 1: Indicadores Especiais -->
            <div>
              <h4 class="text-sm font-semibold text-gray-700 mb-3">Indicadores Especiais (Não são taxas de conversão)</h4>
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <!-- Diferença Sitplan vs Recomendações -->
                <div class="flex items-start gap-3">
                  <span class="text-xs text-blue-600 font-medium flex-shrink-0 pt-0.5">+25.0% vs Rec.</span>
                  <div>
                    <p class="text-sm text-gray-900 font-medium">Diferença Sitplan vs Recomendações</p>
                    <p class="text-xs text-gray-500 mt-0.5">
                      <strong>Recomendações:</strong> Total de leads separados para trabalhar (o "aquário" de oportunidades).<br>
                      <strong>Sitplan:</strong> Oportunidades puxadas na semana. Pode ser maior que recomendações.<br>
                      <strong>Indicador:</strong> Diferença percentual (pode ser negativa). Ex: +25% = puxou 25% mais que o aquário.
                    </p>
                  </div>
                </div>

                <!-- Média de Ligações -->
                <div class="flex items-start gap-3">
                  <span class="text-xs text-blue-600 font-medium flex-shrink-0 pt-0.5">3.3x por oport.</span>
                  <div>
                    <p class="text-sm text-gray-900 font-medium">Média de Ligações por Oportunidade</p>
                    <p class="text-xs text-gray-500 mt-0.5">
                      <strong>Ligações Realizadas:</strong> São atividades, não etapa de funil.<br>
                      <strong>Indicador:</strong> Média de quantas ligações foram feitas por oportunidade (Ligações ÷ Sitplan). Ex: 3.3x = média de 3.3 ligações por oportunidade.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Coluna 1: Indicadores de Linha -->
              <div>
                <h4 class="text-sm font-semibold text-gray-700 mb-3">Indicadores de Semana</h4>
                <div class="space-y-3">
                  <!-- Melhor Semana -->
                  <div class="flex items-start gap-3">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 flex-shrink-0">
                      <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clip-rule="evenodd"></path>
                      </svg>
                      Melhor
                    </span>
                    <div>
                      <p class="text-sm text-gray-900 font-medium">Melhor Semana</p>
                      <p class="text-xs text-gray-500 mt-0.5">Semana com maior número de contratos assinados. Linha destacada em verde claro.</p>
                    </div>
                  </div>

                  <!-- Atenção -->
                  <div class="flex items-start gap-3">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 flex-shrink-0">
                      <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clip-rule="evenodd"></path>
                      </svg>
                      Atenção
                    </span>
                    <div>
                      <p class="text-sm text-gray-900 font-medium">Semana que Precisa de Atenção</p>
                      <p class="text-xs text-gray-500 mt-0.5">Semana com menor performance. Linha destacada em vermelho claro. Requer análise e ajustes.</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Coluna 2: Indicadores de Taxa -->
              <div>
                <h4 class="text-sm font-semibold text-gray-700 mb-3">Indicadores de Taxa de Conversão</h4>
                <div class="space-y-3">
                  <!-- Alta -->
                  <div class="flex items-start gap-3">
                    <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 flex-shrink-0">Alta</span>
                    <div>
                      <p class="text-sm text-gray-900 font-medium">Taxa Alta</p>
                      <p class="text-xs text-gray-500 mt-0.5">Taxa de conversão 10% ou mais acima da média geral. Excelente performance nesta etapa do funil.</p>
                    </div>
                  </div>

                  <!-- Baixa -->
                  <div class="flex items-start gap-3">
                    <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 flex-shrink-0">Baixa</span>
                    <div>
                      <p class="text-sm text-gray-900 font-medium">Taxa Baixa</p>
                      <p class="text-xs text-gray-500 mt-0.5">Taxa de conversão 10% ou mais abaixo da média geral. Ponto de atenção que pode requerer otimização.</p>
                    </div>
                  </div>

                  <!-- Percentual -->
                  <div class="flex items-start gap-3">
                    <span class="text-xs text-gray-400 italic flex-shrink-0 pt-0.5">45.5%</span>
                    <div>
                      <p class="text-sm text-gray-900 font-medium">Percentual de Conversão</p>
                      <p class="text-xs text-gray-500 mt-0.5">Indica a taxa de conversão entre uma etapa e a anterior. Começa a partir de "Ligações Atendidas" (primeira etapa real do funil).</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
      `;
    },

    generateTableHTML: function (indicadores) {
      var self = this;

      // Calcular melhor e pior dia baseado em contratos assinados
      var melhorDia = null;
      var piorDia = null;
      var maxContratos = -1;
      var minContratos = 999999;

      indicadores.forEach(function(item) {
        var contratos = item.contrato_assinados || 0;
        if (contratos > maxContratos) {
          maxContratos = contratos;
          melhorDia = item;
        }
        if (contratos < minContratos && contratos >= 0) {
          minContratos = contratos;
          piorDia = item;
        }
      });

      // Calcular taxas médias para comparação
      var taxasMedias = this.calcularTaxasMedias(indicadores);

      return `
        <div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10" style="min-width: 120px;">
                    <div class="flex items-center gap-1">
                      Semana
                      <span title="Número da semana do ano" class="cursor-help">
                        <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                        </svg>
                      </span>
                    </div>
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style="min-width: 80px;">Recomendações</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style="min-width: 100px;">Sitplan</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style="min-width: 80px;">Ligações Realizadas</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style="min-width: 80px;">Ligações Atendidas</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style="min-width: 80px;">1ª Visita Marcada</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style="min-width: 80px;">1ª Visita Realizada</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style="min-width: 80px;">Dentro do Perfil</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style="min-width: 80px;">Docs Recebidos</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style="min-width: 80px;">Imóveis Aprovados</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style="min-width: 80px;">2ª Visita Marcada</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style="min-width: 80px;">2ª Visita Realizada</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style="min-width: 80px;">OK Cliente</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style="min-width: 80px;">Doc Enviado</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style="min-width: 80px;">Contratos Assinados</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                ${indicadores.map(function(item) {
                  var isMelhor = melhorDia && item.num_semana === melhorDia.num_semana && maxContratos > 0;
                  var isPior = piorDia && item.num_semana === piorDia.num_semana && indicadores.length > 1;
                  return self.generateIndicadorRow(item, isMelhor, isPior, taxasMedias);
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    },

    calcularTaxasMedias: function(indicadores) {
      var totais = {
        sitplan: 0, ligRealizadas: 0, ligAtendidas: 0, vis1Marcada: 0,
        vis1Realizada: 0, dentroPerfil: 0, docsRecebidos: 0, imoveisAprovados: 0,
        vis2Marcada: 0, vis2Realizada: 0, okCliente: 0, docEnviado: 0, contratoAssinado: 0,
        count: indicadores.length
      };

      indicadores.forEach(function(item) {
        var calcularTaxa = function(atual, anterior) {
          if (!anterior || anterior === 0) return 0;
          if (!atual || atual === 0) return 0;
          return (atual / anterior) * 100;
        };

        totais.sitplan += calcularTaxa(item.sitplan, item.recomendacoes);
        totais.ligRealizadas += calcularTaxa(item.ligacoes_realizadas, item.sitplan);
        totais.ligAtendidas += calcularTaxa(item.ligacoes_atendidas, item.ligacoes_realizadas);
        totais.vis1Marcada += calcularTaxa(item['1visita_marcada'], item.ligacoes_atendidas);
        totais.vis1Realizada += calcularTaxa(item['1visita_realizada'], item['1visita_marcada']);
        totais.dentroPerfil += calcularTaxa(item.dentro_do_perfil, item['1visita_realizada']);
        totais.docsRecebidos += calcularTaxa(item.docs_recebidos, item.dentro_do_perfil);
        totais.imoveisAprovados += calcularTaxa(item.imoveis_aprovados, item.docs_recebidos);
        totais.vis2Marcada += calcularTaxa(item['2visita_marcada'], item.imoveis_aprovados);
        totais.vis2Realizada += calcularTaxa(item['2visita_realizada'], item['2visita_marcada']);
        totais.okCliente += calcularTaxa(item.ok_cliente, item['2visita_realizada']);
        totais.docEnviado += calcularTaxa(item.doc_enviado, item.ok_cliente);
        totais.contratoAssinado += calcularTaxa(item.contrato_assinados, item.doc_enviado);
      });

      return {
        sitplan: totais.sitplan / totais.count,
        ligRealizadas: totais.ligRealizadas / totais.count,
        ligAtendidas: totais.ligAtendidas / totais.count,
        vis1Marcada: totais.vis1Marcada / totais.count,
        vis1Realizada: totais.vis1Realizada / totais.count,
        dentroPerfil: totais.dentroPerfil / totais.count,
        docsRecebidos: totais.docsRecebidos / totais.count,
        imoveisAprovados: totais.imoveisAprovados / totais.count,
        vis2Marcada: totais.vis2Marcada / totais.count,
        vis2Realizada: totais.vis2Realizada / totais.count,
        okCliente: totais.okCliente / totais.count,
        docEnviado: totais.docEnviado / totais.count,
        contratoAssinado: totais.contratoAssinado / totais.count
      };
    },

    generateSkeletonHTML: function () {
      return `
        <div class="space-y-6">
          <!-- Skeleton Botão -->
          <div class="flex justify-end mb-4">
            <div class="h-10 w-48 bg-gray-200 rounded animate-pulse"></div>
          </div>

          <!-- Skeleton Tabela -->
          <div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    ${Array(15).fill(0).map(function() { return '<th class="px-4 py-3"><div class="h-4 bg-gray-200 rounded animate-pulse"></div></th>'; }).join('')}
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  ${Array(3).fill(0).map(function() { return `
                    <tr>
                      ${Array(15).fill(0).map(function() { return '<td class="px-4 py-4"><div class="h-4 bg-gray-200 rounded animate-pulse"></div></td>'; }).join('')}
                    </tr>
                  `; }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    },

    generateIndicadorRow: function (item, isMelhor, isPior, taxasMedias) {
      var self = this;
      var semana = 'Semana ' + item.num_semana;

      // Calcular período da semana
      var periodo = this.getWeekPeriod(item.data_registro);
      var periodoTexto = periodo.inicio && periodo.fim ? periodo.inicio + ' a ' + periodo.fim : '';

      // Definir classe de background para melhor/pior dia
      var rowClass = 'hover:bg-gray-50 sitplan-row';
      var rowBgClass = 'bg-white';
      var indicador = '';

      if (isMelhor) {
        rowBgClass = 'bg-green-50';
        rowClass = 'hover:bg-green-100 sitplan-row';
        indicador = `
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 ml-2" title="Melhor semana">
            <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clip-rule="evenodd"></path>
            </svg>
            Melhor
          </span>
        `;
      } else if (isPior) {
        rowBgClass = 'bg-red-50';
        rowClass = 'hover:bg-red-100 sitplan-row';
        indicador = `
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 ml-2" title="Semana com menor performance">
            <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clip-rule="evenodd"></path>
            </svg>
            Atenção
          </span>
        `;
      }

      // Função para calcular taxa de conversão
      var calcularTaxa = function(atual, anterior) {
        if (!anterior || anterior === 0) return null;
        if (!atual || atual === 0) return '0%';
        var taxa = (atual / anterior) * 100;
        return taxa.toFixed(1) + '%';
      };

      // Função para obter valor numérico da taxa
      var obterTaxaNum = function(atual, anterior) {
        if (!anterior || anterior === 0) return 0;
        if (!atual || atual === 0) return 0;
        return (atual / anterior) * 100;
      };

      // NOVOS INDICADORES
      // Diferença percentual entre Sitplan e Recomendações (pode ser negativo)
      var diferencaSitplanRecomendacoes = item.diferenca_sitplan_recomendacoes || null;
      var diferencaSitplanRecomendacoesNum = diferencaSitplanRecomendacoes ? parseFloat(diferencaSitplanRecomendacoes) : 0;

      // Média de ligações por oportunidade
      var mediaLigacoesPorOportunidade = item.media_ligacoes_por_oportunidade || null;

      // Função auxiliar para renderizar célula com hint, taxa e badge de performance (INLINE com seta)
      var renderCell = function(fieldName, value, notes, taxa, taxaNum, taxaMedia, isSpecialIndicator, specialLabel, dataRegistro) {
        var displayValue = value !== null && value !== undefined && value !== '' ? value : '-';
        var hasNotes = notes && notes.trim() !== '';

        // Determinar se a taxa é boa ou ruim (apenas para taxas de conversão tradicionais)
        var badgeHTML = '';
        if (!isSpecialIndicator && taxaNum && taxaMedia) {
          if (taxaNum >= taxaMedia * 1.1) { // 10% acima da média
            badgeHTML = `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 ml-1">Alta</span>`;
          } else if (taxaNum <= taxaMedia * 0.9) { // 10% abaixo da média
            badgeHTML = `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 ml-1">Baixa</span>`;
          }
        }

        // Layout INLINE: número + seta + taxa + badge
        return `
          <div class="flex items-center gap-2 flex-wrap">
            <span
              class="font-medium editable-cell cursor-pointer hover:bg-gray-100 px-1 rounded"
              contenteditable="false"
              data-field="${fieldName}"
              data-original-value="${displayValue}"
              data-data-registro="${dataRegistro}"
              spellcheck="false"
            >${displayValue}</span>
            ${hasNotes ? `
              <span title="${notes.replace(/"/g, '&quot;')}" class="cursor-help">
                <svg class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                </svg>
              </span>
            ` : ''}
            ${taxa || specialLabel ? `
              <span class="text-gray-400">→</span>
              <span class="text-xs ${isSpecialIndicator ? 'text-blue-600 font-medium' : 'text-gray-500'}">${specialLabel || taxa}</span>
              ${badgeHTML}
            ` : ''}
          </div>
        `;
      };

      // Calcular todas as taxas de conversão (string)
      var taxaSitplan = calcularTaxa(item.sitplan, item.recomendacoes);
      var taxaLigRealizadas = calcularTaxa(item.ligacoes_realizadas, item.sitplan);
      var taxaLigAtendidas = calcularTaxa(item.ligacoes_atendidas, item.ligacoes_realizadas);
      var taxa1VisitaMarcada = calcularTaxa(item['1visita_marcada'], item.ligacoes_atendidas);
      var taxa1VisitaRealizada = calcularTaxa(item['1visita_realizada'], item['1visita_marcada']);
      var taxaDentroPerfil = calcularTaxa(item.dentro_do_perfil, item['1visita_realizada']);
      var taxaDocsRecebidos = calcularTaxa(item.docs_recebidos, item.dentro_do_perfil);
      var taxaImoveisAprovados = calcularTaxa(item.imoveis_aprovados, item.docs_recebidos);
      var taxa2VisitaMarcada = calcularTaxa(item['2visita_marcada'], item.imoveis_aprovados);
      var taxa2VisitaRealizada = calcularTaxa(item['2visita_realizada'], item['2visita_marcada']);
      var taxaOkCliente = calcularTaxa(item.ok_cliente, item['2visita_realizada']);
      var taxaDocEnviado = calcularTaxa(item.doc_enviado, item.ok_cliente);
      var taxaContratoAssinado = calcularTaxa(item.contrato_assinados, item.doc_enviado);

      // Calcular taxas numéricas para comparação
      var taxaSitplanNum = obterTaxaNum(item.sitplan, item.recomendacoes);
      var taxaLigRealizadasNum = obterTaxaNum(item.ligacoes_realizadas, item.sitplan);
      var taxaLigAtendidasNum = obterTaxaNum(item.ligacoes_atendidas, item.ligacoes_realizadas);
      var taxa1VisitaMarcadaNum = obterTaxaNum(item['1visita_marcada'], item.ligacoes_atendidas);
      var taxa1VisitaRealizadaNum = obterTaxaNum(item['1visita_realizada'], item['1visita_marcada']);
      var taxaDentroPerfilNum = obterTaxaNum(item.dentro_do_perfil, item['1visita_realizada']);
      var taxaDocsRecebidosNum = obterTaxaNum(item.docs_recebidos, item.dentro_do_perfil);
      var taxaImoveisAprovadosNum = obterTaxaNum(item.imoveis_aprovados, item.docs_recebidos);
      var taxa2VisitaMarcadaNum = obterTaxaNum(item['2visita_marcada'], item.imoveis_aprovados);
      var taxa2VisitaRealizadaNum = obterTaxaNum(item['2visita_realizada'], item['2visita_marcada']);
      var taxaOkClienteNum = obterTaxaNum(item.ok_cliente, item['2visita_realizada']);
      var taxaDocEnviadoNum = obterTaxaNum(item.doc_enviado, item.ok_cliente);
      var taxaContratoAssinadoNum = obterTaxaNum(item.contrato_assinados, item.doc_enviado);

      // Serializar dados do item para passar ao modal de edição
      var itemDataJson = JSON.stringify(item).replace(/"/g, '&quot;');

      return `
        <tr class="${rowClass} ${rowBgClass} sitplan-data-row" data-item='${itemDataJson}' data-data-registro="${item.data_registro}">
          <td class="px-4 py-4 text-sm font-medium text-gray-900 sticky left-0 ${rowBgClass} z-10 group relative">
            <div class="flex items-center gap-2">
              <div class="flex flex-col flex-1">
                <div class="flex items-center gap-2">
                  ${semana}${indicador}
                </div>
                ${periodoTexto ? `<span class="text-xs text-gray-500 italic">${periodoTexto}</span>` : ''}
              </div>
              <!-- Ícone de editar (visível ao hover) -->
              <button
                onclick="window.sitplanModule.ativarModoEdicaoLinha('${item.data_registro}')"
                class="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Editar esta linha"
              >
                <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>
            </div>
          </td>
          <td class="px-4 py-4 text-sm text-gray-500">
            ${renderCell('recomendacoes', item.recomendacoes, item.recomendacoes_notes, null, null, null, false, null, item.data_registro)}
          </td>
          <td class="px-4 py-4 text-sm text-gray-500">
            ${renderCell('sitplan', item.sitplan, item.sitplan_notes, null, null, null, true, diferencaSitplanRecomendacoes ? (diferencaSitplanRecomendacoesNum >= 0 ? '+' : '') + diferencaSitplanRecomendacoes + '% vs Rec.' : null, item.data_registro)}
          </td>
          <td class="px-4 py-4 text-sm text-gray-500">
            ${renderCell('ligacoes_realizadas', item.ligacoes_realizadas, item.ligacoes_realizadas_notes, null, null, null, true, mediaLigacoesPorOportunidade ? mediaLigacoesPorOportunidade + 'x' : null, item.data_registro)}
          </td>
          <td class="px-4 py-4 text-sm text-gray-500">
            ${renderCell('ligacoes_atendidas', item.ligacoes_atendidas, item.ligacoes_atendidas_notes, taxaLigAtendidas, taxaLigAtendidasNum, taxasMedias.ligAtendidas, false, null, item.data_registro)}
          </td>
          <td class="px-4 py-4 text-sm text-gray-500">
            ${renderCell('1visita_marcada', item['1visita_marcada'], item['1visita_marcada_notes'], taxa1VisitaMarcada, taxa1VisitaMarcadaNum, taxasMedias.vis1Marcada, false, null, item.data_registro)}
          </td>
          <td class="px-4 py-4 text-sm text-gray-500">
            ${renderCell('1visita_realizada', item['1visita_realizada'], item['1visita_realizada_notes'], taxa1VisitaRealizada, taxa1VisitaRealizadaNum, taxasMedias.vis1Realizada, false, null, item.data_registro)}
          </td>
          <td class="px-4 py-4 text-sm text-gray-500">
            ${renderCell('dentro_do_perfil', item.dentro_do_perfil, item.dentro_do_perfil_notes, taxaDentroPerfil, taxaDentroPerfilNum, taxasMedias.dentroPerfil, false, null, item.data_registro)}
          </td>
          <td class="px-4 py-4 text-sm text-gray-500">
            ${renderCell('docs_recebidos', item.docs_recebidos, item.docs_recebidos_notes, taxaDocsRecebidos, taxaDocsRecebidosNum, taxasMedias.docsRecebidos, false, null, item.data_registro)}
          </td>
          <td class="px-4 py-4 text-sm text-gray-500">
            ${renderCell('imoveis_aprovados', item.imoveis_aprovados, item.imoveis_aprovados_notes, taxaImoveisAprovados, taxaImoveisAprovadosNum, taxasMedias.imoveisAprovados, false, null, item.data_registro)}
          </td>
          <td class="px-4 py-4 text-sm text-gray-500">
            ${renderCell('2visita_marcada', item['2visita_marcada'], item['2visita_marcada_notes'], taxa2VisitaMarcada, taxa2VisitaMarcadaNum, taxasMedias.vis2Marcada, false, null, item.data_registro)}
          </td>
          <td class="px-4 py-4 text-sm text-gray-500">
            ${renderCell('2visita_realizada', item['2visita_realizada'], item['2visita_realizada_notes'], taxa2VisitaRealizada, taxa2VisitaRealizadaNum, taxasMedias.vis2Realizada, false, null, item.data_registro)}
          </td>
          <td class="px-4 py-4 text-sm text-gray-500">
            ${renderCell('ok_cliente', item.ok_cliente, item.ok_cliente_notes, taxaOkCliente, taxaOkClienteNum, taxasMedias.okCliente, false, null, item.data_registro)}
          </td>
          <td class="px-4 py-4 text-sm text-gray-500">
            ${renderCell('doc_enviado', item.doc_enviado, item.doc_enviado_notes, taxaDocEnviado, taxaDocEnviadoNum, taxasMedias.docEnviado, false, null, item.data_registro)}
          </td>
          <td class="px-4 py-4 text-sm text-gray-500">
            ${renderCell('contrato_assinados', item.contrato_assinados, item.contrato_assinados_notes, taxaContratoAssinado, taxaContratoAssinadoNum, taxasMedias.contratoAssinado, false, null, item.data_registro)}
          </td>
        </tr>
      `;
    },

    showNoData: function () {
      this.hideAllSections();
      if (!this.contentEl) return;

      // Quando não há dados, mostrar tabela vazia com botão para adicionar
      var html = '<div class="space-y-6">';

      // Botão de ação
      html += `
        <div class="flex justify-end mb-4">
          <button
            onclick="window.sitplanModule.adicionarLinhaNovaTabela()"
            class="cursor-pointer inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Registrar Indicadores
          </button>
        </div>
      `;

      // Tabela vazia
      html += this.generateTableHTML([]);

      // Mensagem informativa
      html += `
        <div class="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4">
            <svg class="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 class="text-sm font-medium text-gray-900 mb-1">Nenhum indicador cadastrado</h3>
          <p class="text-xs text-gray-500">
            Clique em "Registrar Indicadores" para adicionar sua primeira entrada
          </p>
        </div>
      `;

      html += '</div>';

      this.contentEl.innerHTML = html;
      this.contentEl.style.display = 'block';
    },


    /**
     * Adicionar linha nova editável diretamente na tabela
     */
    adicionarLinhaNovaTabela: function() {
      // Verificar se já existe uma linha nova
      if (document.getElementById('nova-linha-indicador')) {
        alert('Já existe uma linha de indicador em edição. Complete ou cancele antes de adicionar outra.');
        return;
      }

      // Desabilitar botão "Registrar Indicadores"
      var btnRegistrar = document.querySelector('[onclick*="adicionarLinhaNovaTabela"]');
      if (btnRegistrar) {
        btnRegistrar.disabled = true;
        btnRegistrar.classList.add('opacity-50', 'cursor-not-allowed');
      }

      // Esconder botões de "Salvar Alterações" e "Cancelar" (se existirem)
      var btnSalvarAlteracoes = document.getElementById('btn-salvar-alteracoes');
      var btnCancelarAlteracoes = document.getElementById('btn-cancelar-alteracoes');
      if (btnSalvarAlteracoes) btnSalvarAlteracoes.style.display = 'none';
      if (btnCancelarAlteracoes) btnCancelarAlteracoes.style.display = 'none';

      // Obter tbody da tabela
      var tbody = document.querySelector('.sitplan-module tbody');
      if (!tbody) return;

      // Obter data de hoje
      var hoje = new Date();
      var dataHoje = hoje.toISOString().split('T')[0];

      // Calcular informações da semana
      var numSemana = this.getWeekNumber(hoje);
      var periodo = this.getWeekPeriod(dataHoje);
      var periodoTexto = periodo.inicio && periodo.fim ? periodo.inicio + ' a ' + periodo.fim : '';

      // Criar linha nova com campos editáveis
      var novaLinhaHTML = `
        <tr id="nova-linha-indicador" class="bg-blue-50 border-2 border-blue-300">
          <td class="px-4 py-4 text-sm font-medium text-gray-900 sticky left-0 bg-blue-50 z-10">
            <div class="flex flex-col">
              <div class="flex items-center gap-2">
                <span class="text-blue-600 font-semibold">Nova Entrada</span>
                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  Semana ${numSemana}
                </span>
              </div>
              <input
                type="date"
                id="nova-linha-data"
                value="${dataHoje}"
                required
                class="mt-2 px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              ${periodoTexto ? `<span class="text-xs text-gray-500 italic mt-1">${periodoTexto}</span>` : ''}
            </div>
          </td>
          ${this.generateEditableCells()}
          <td class="px-4 py-4 text-sm">
            <div class="flex gap-2">
              <button
                onclick="window.sitplanModule.salvarLinhaNova()"
                class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 border border-transparent rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                title="Salvar indicadores"
              >
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Salvar
              </button>
              <button
                onclick="window.sitplanModule.cancelarLinhaNova()"
                class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                title="Cancelar"
              >
                Cancelar
              </button>
            </div>
          </td>
        </tr>
      `;

      // Inserir no início do tbody
      tbody.insertAdjacentHTML('afterbegin', novaLinhaHTML);

      // Adicionar event listeners para validação nas células novas
      var celulasNovas = document.querySelectorAll('#nova-linha-indicador .nova-celula-editavel');
      celulasNovas.forEach(function(celula) {
        // Prevenir quebra de linha
        celula.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.blur();
          }
        });

        // Aceitar apenas números
        celula.addEventListener('input', function() {
          var value = this.textContent.trim();
          if (value !== '' && value !== '-' && isNaN(value)) {
            // Reverter para vazio se não for número
            this.textContent = '';
          }
        });
      });

      // Focar no primeiro campo editável
      var primeiroInput = document.querySelector('#nova-linha-indicador .nova-celula-editavel');
      if (primeiroInput) {
        primeiroInput.focus();
      }
    },

    /**
     * Gerar células editáveis para a nova linha
     */
    generateEditableCells: function() {
      var fields = [
        'recomendacoes', 'sitplan', 'ligacoes_realizadas', 'ligacoes_atendidas',
        '1visita_marcada', '1visita_realizada', 'dentro_do_perfil', 'docs_recebidos',
        'imoveis_aprovados', '2visita_marcada', '2visita_realizada', 'ok_cliente',
        'doc_enviado', 'contrato_assinados'
      ];

      return fields.map(function(field) {
        return `
          <td class="px-4 py-4 text-sm text-gray-500">
            <div
              class="nova-celula-editavel font-medium text-gray-900 px-3 py-2 border-2 border-blue-300 rounded min-w-[80px] inline-block focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              contenteditable="true"
              data-field="${field}"
              spellcheck="false"
              placeholder="0"
              style="min-height: 36px; display: inline-flex; align-items: center;"
            ></div>
          </td>
        `;
      }).join('');
    },

    /**
     * Salvar linha nova
     */
    salvarLinhaNova: async function() {
      // Obter data
      var dataInput = document.getElementById('nova-linha-data');
      if (!dataInput || !dataInput.value) {
        alert('Por favor, informe a data do registro.');
        return;
      }

      var dataRegistro = dataInput.value;

      // Calcular informações de data
      var data = new Date(dataRegistro + 'T00:00:00');
      var numSemana = this.getWeekNumber(data);
      var numDay = data.getDate();
      var numMes = data.getMonth() + 1;
      var numAno = data.getFullYear();
      var numWeekDay = data.getDay();

      // Construir payload
      var payload = {
        franqueado_id: parseInt(window.hubspotContactId),
        data_registro: dataRegistro,
        num_semana: numSemana,
        num_day: numDay,
        num_mes: numMes,
        num_ano: numAno,
        num_week_day: numWeekDay
      };

      // Coletar valores das células editáveis
      var celulas = document.querySelectorAll('#nova-linha-indicador .nova-celula-editavel');
      var algumValorPreenchido = false;

      celulas.forEach(function(celula) {
        var field = celula.getAttribute('data-field');
        var value = celula.textContent.trim();

        // Se vazio ou "-", enviar null
        if (value === '' || value === '-') {
          payload[field] = null;
          payload[field + '_notes'] = '';
        } else if (!isNaN(value)) {
          payload[field] = parseInt(value);
          payload[field + '_notes'] = '';
          algumValorPreenchido = true;
        } else {
          // Valor inválido
          payload[field] = null;
          payload[field + '_notes'] = '';
        }
      });

      if (!algumValorPreenchido) {
        if (!confirm('Nenhum valor foi preenchido. Deseja salvar mesmo assim?')) {
          return;
        }
      }

      console.log('📤 Payload a ser enviado:', payload);

      // Mostrar loading nos botões
      var btnSalvar = document.querySelector('#nova-linha-indicador button[onclick*="salvarLinhaNova"]');
      if (btnSalvar) {
        btnSalvar.disabled = true;
        btnSalvar.innerHTML = `
          <svg class="animate-spin -ml-1 mr-1 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Salvando...
        `;
      }

      try {
        // Enviar para API
        await this.salvarIndicadorIndividual(payload);

        console.log('✅ Indicadores salvos com sucesso');

        // Recarregar página após sucesso
        window.location.reload();

      } catch (error) {
        console.error('❌ Erro ao salvar indicadores:', error);
        alert('Erro ao salvar indicadores. Tente novamente.');

        // Restaurar botão
        if (btnSalvar) {
          btnSalvar.disabled = false;
          btnSalvar.innerHTML = `
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            Salvar
          `;
        }
      }
    },

    /**
     * Cancelar linha nova
     */
    cancelarLinhaNova: function() {
      // Remover linha
      var novaLinha = document.getElementById('nova-linha-indicador');
      if (novaLinha) {
        novaLinha.remove();
      }

      // Reabilitar botão "Registrar Indicadores"
      var btnRegistrar = document.querySelector('[onclick*="adicionarLinhaNovaTabela"]');
      if (btnRegistrar) {
        btnRegistrar.disabled = false;
        btnRegistrar.classList.remove('opacity-50', 'cursor-not-allowed');
      }

      // Mostrar novamente botões de "Salvar Alterações" e "Cancelar" (se existirem)
      var btnSalvarAlteracoes = document.getElementById('btn-salvar-alteracoes');
      var btnCancelarAlteracoes = document.getElementById('btn-cancelar-alteracoes');
      if (btnSalvarAlteracoes) btnSalvarAlteracoes.style.display = '';
      if (btnCancelarAlteracoes) btnCancelarAlteracoes.style.display = '';
    },

    /**
     * Ativar modo de edição para uma linha específica
     */
    ativarModoEdicaoLinha: function(dataRegistro) {
      var row = document.querySelector('tr[data-data-registro="' + dataRegistro + '"]');
      if (!row) return;

      // Verificar se já está em modo de edição
      if (row.classList.contains('linha-em-edicao')) {
        return;
      }

      // Adicionar classe de edição
      row.classList.add('linha-em-edicao', 'bg-yellow-50', 'border-2', 'border-yellow-400');

      // Esconder botões de "Salvar Alterações" e "Cancelar" do topo
      var btnSalvarAlteracoes = document.getElementById('btn-salvar-alteracoes');
      var btnCancelarAlteracoes = document.getElementById('btn-cancelar-alteracoes');
      if (btnSalvarAlteracoes) btnSalvarAlteracoes.style.display = 'none';
      if (btnCancelarAlteracoes) btnCancelarAlteracoes.style.display = 'none';

      // Desabilitar botão "Registrar Indicadores"
      var btnRegistrar = document.querySelector('[onclick*="adicionarLinhaNovaTabela"]');
      if (btnRegistrar) {
        btnRegistrar.disabled = true;
        btnRegistrar.classList.add('opacity-50', 'cursor-not-allowed');
      }

      // Pegar todas as células editáveis da linha
      var celulasEditaveis = row.querySelectorAll('.editable-cell');

      celulasEditaveis.forEach(function(celula) {
        // Pegar o container da célula (div pai)
        var celulaContainer = celula.parentElement;

        // Esconder setas, percentuais e badges (todos os elementos seguintes)
        var elementosIndicadores = celulaContainer.querySelectorAll('span:not(.editable-cell)');
        elementosIndicadores.forEach(function(elem) {
          elem.style.display = 'none';
          elem.classList.add('hidden-in-edit');
        });

        // Destacar visualmente que está editável e aumentar tamanho
        celula.classList.remove('cursor-pointer', 'hover:bg-gray-100', 'px-1');
        celula.classList.add('ring-2', 'ring-yellow-400', 'bg-white', 'px-3', 'py-2', 'border-2', 'border-yellow-300', 'min-w-[80px]', 'inline-block');
        celula.setAttribute('contenteditable', 'true');
        celula.style.minHeight = '36px';
        celula.style.display = 'inline-flex';
        celula.style.alignItems = 'center';

        // Adicionar event listeners para edição
        // Prevenir quebra de linha
        var preventEnter = function(e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.blur();
          }
        };

        // Aceitar apenas números
        var validateNumber = function() {
          var value = this.textContent.trim();
          if (value !== '-' && value !== '' && isNaN(value)) {
            this.textContent = this.getAttribute('data-original-value');
          }
        };

        celula.addEventListener('keydown', preventEnter);
        celula.addEventListener('input', validateNumber);

        // Armazenar referências para remover depois
        celula._preventEnter = preventEnter;
        celula._validateNumber = validateNumber;
      });

      // Adicionar botões de ação na primeira célula
      var primeiraCelula = row.querySelector('td:first-child > div');
      if (primeiraCelula) {
        var botoesHTML = `
          <div class="flex gap-1 mt-2 botoes-edicao-linha">
            <button
              onclick="window.sitplanModule.salvarEdicaoLinha('${dataRegistro}')"
              class="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-green-600 border border-transparent rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              title="Salvar alterações"
            >
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              Salvar
            </button>
            <button
              onclick="window.sitplanModule.cancelarEdicaoLinha('${dataRegistro}')"
              class="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
              title="Cancelar edição"
            >
              Cancelar
            </button>
          </div>
        `;
        primeiraCelula.insertAdjacentHTML('beforeend', botoesHTML);
      }

      // Focar na primeira célula editável
      if (celulasEditaveis.length > 0) {
        celulasEditaveis[0].focus();
      }
    },

    /**
     * Salvar edição de linha
     */
    salvarEdicaoLinha: async function(dataRegistro) {
      var row = document.querySelector('tr[data-data-registro="' + dataRegistro + '"]');
      if (!row) return;

      // Coletar mudanças
      var camposAlterados = {};
      var celulasEditaveis = row.querySelectorAll('.editable-cell');
      var houveAlteracao = false;

      celulasEditaveis.forEach(function(celula) {
        var originalValue = celula.getAttribute('data-original-value');
        var currentValue = celula.textContent.trim();
        var field = celula.getAttribute('data-field');

        if (currentValue !== originalValue) {
          camposAlterados[field] = currentValue === '-' ? null : parseInt(currentValue);
          houveAlteracao = true;
        }
      });

      if (!houveAlteracao) {
        alert('Nenhuma alteração foi feita.');
        this.cancelarEdicaoLinha(dataRegistro);
        return;
      }

      // Buscar dados completos da linha
      var itemDataStr = row.getAttribute('data-item');
      var item = JSON.parse(itemDataStr.replace(/&quot;/g, '"'));

      // Montar payload completo
      var payload = this.montarPayloadCompleto(item, camposAlterados);

      // Mostrar loading
      var btnSalvar = row.querySelector('.botoes-edicao-linha button[onclick*="salvarEdicaoLinha"]');
      if (btnSalvar) {
        btnSalvar.disabled = true;
        btnSalvar.innerHTML = `
          <svg class="animate-spin -ml-1 mr-1 h-3 w-3 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Salvando...
        `;
      }

      try {
        // Enviar para API
        await this.salvarIndicadorIndividual(payload);

        console.log('✅ Linha salva com sucesso');

        // Recarregar página
        window.location.reload();

      } catch (error) {
        console.error('❌ Erro ao salvar linha:', error);
        alert('Erro ao salvar alterações. Tente novamente.');

        // Restaurar botão
        if (btnSalvar) {
          btnSalvar.disabled = false;
          btnSalvar.innerHTML = `
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            Salvar
          `;
        }
      }
    },

    /**
     * Cancelar edição de linha
     */
    cancelarEdicaoLinha: function(dataRegistro) {
      var row = document.querySelector('tr[data-data-registro="' + dataRegistro + '"]');
      if (!row) return;

      // Remover classe de edição
      row.classList.remove('linha-em-edicao', 'bg-yellow-50', 'border-2', 'border-yellow-400');

      // Reverter células aos valores originais
      var celulasEditaveis = row.querySelectorAll('.editable-cell');
      celulasEditaveis.forEach(function(celula) {
        celula.textContent = celula.getAttribute('data-original-value');

        // Remover classes de edição
        celula.classList.remove('ring-2', 'ring-yellow-400', 'bg-white', 'px-3', 'py-2', 'border-2', 'border-yellow-300', 'min-w-[80px]', 'inline-block');

        // Restaurar classes originais
        celula.classList.add('cursor-pointer', 'hover:bg-gray-100', 'px-1');
        celula.setAttribute('contenteditable', 'false');

        // Remover estilos inline
        celula.style.minHeight = '';
        celula.style.display = '';
        celula.style.alignItems = '';

        // Mostrar novamente os indicadores escondidos (setas, %, badges)
        var celulaContainer = celula.parentElement;
        var elementosEscondidos = celulaContainer.querySelectorAll('.hidden-in-edit');
        elementosEscondidos.forEach(function(elem) {
          elem.style.display = '';
          elem.classList.remove('hidden-in-edit');
        });

        // Remover event listeners
        if (celula._preventEnter) {
          celula.removeEventListener('keydown', celula._preventEnter);
          delete celula._preventEnter;
        }
        if (celula._validateNumber) {
          celula.removeEventListener('input', celula._validateNumber);
          delete celula._validateNumber;
        }
      });

      // Remover botões de ação
      var botoes = row.querySelector('.botoes-edicao-linha');
      if (botoes) {
        botoes.remove();
      }

      // Mostrar novamente botões de "Salvar Alterações" e "Cancelar" do topo
      var btnSalvarAlteracoes = document.getElementById('btn-salvar-alteracoes');
      var btnCancelarAlteracoes = document.getElementById('btn-cancelar-alteracoes');
      if (btnSalvarAlteracoes) btnSalvarAlteracoes.style.display = '';
      if (btnCancelarAlteracoes) btnCancelarAlteracoes.style.display = '';

      // Reabilitar botão "Registrar Indicadores"
      var btnRegistrar = document.querySelector('[onclick*="adicionarLinhaNovaTabela"]');
      if (btnRegistrar) {
        btnRegistrar.disabled = false;
        btnRegistrar.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    },

    // Função auxiliar para calcular número da semana
    getWeekNumber: function(date) {
      var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      var dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    },

    // Função para obter início e fim da semana baseado em data_registro
    getWeekPeriod: function(dataRegistro) {
      if (!dataRegistro) return { inicio: '', fim: '' };

      var data = new Date(dataRegistro + 'T00:00:00');
      var dayOfWeek = data.getDay(); // 0 = Domingo, 1 = Segunda, etc.

      // Calcular início da semana (Domingo)
      var inicioSemana = new Date(data);
      inicioSemana.setDate(data.getDate() - dayOfWeek);

      // Calcular fim da semana (Sábado)
      var fimSemana = new Date(inicioSemana);
      fimSemana.setDate(inicioSemana.getDate() + 6);

      // Formatar datas
      var formatarData = function(d) {
        var dia = String(d.getDate()).padStart(2, '0');
        var mes = String(d.getMonth() + 1).padStart(2, '0');
        return dia + '/' + mes;
      };

      return {
        inicio: formatarData(inicioSemana),
        fim: formatarData(fimSemana)
      };
    }

  };

  // Expor o módulo globalmente
  window.sitplanModule = module;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      module.init();
    });
  } else {
    module.init();
  }

})();
