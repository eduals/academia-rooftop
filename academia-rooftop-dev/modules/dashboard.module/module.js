// Dashboard Module - HomeCash Rooftop
(function() {
    'use strict';
  
    var module = {
      init: function() {
        this.container = document.querySelector('[data-module="dashboardModule"]');
        if (!this.container) return;
        
        this.loadingEl = this.container.querySelector('.dashboard-loading');
        this.contentEl = this.container.querySelector('.dashboard-content');
        this.errorEl = this.container.querySelector('.dashboard-error');
        this.emptyEl = this.container.querySelector('.dashboard-empty');
        this.debugEl = this.container.querySelector('.dashboard-debug');
        this.debugStatusEl = this.container.querySelector('#debug-status');
        
        this.showDebugControls();
        this.addDebugEventListeners();
        this.loadDashboard();
      },

      // ✅ NOVA FUNÇÃO PARA PROCESSAR DADOS QUANDO PRONTOS
      processarDados: function () {
        console.log('🎯 processarDados() dashboard chamado - recarregando com novos dados');

        // Verificar se há dados processados
        if (window.hubspotNegociosData) {
          console.log('📊 Dados encontrados no dashboard:', {
            success: window.hubspotNegociosData.success,
            total: window.hubspotNegociosData.total,
            items: window.hubspotNegociosData.data?.data?.CRM?.deal_collection?.items?.length || 0
          });

          if (window.hubspotNegociosData.debug) {
            console.log('🔍 Debug logs dashboard recebidos:', window.hubspotNegociosData.debug.logs);
            console.log('🔍 Processamento dashboard completo:', window.hubspotNegociosData.debug.processamento_completo);
          }
        }

        // Recarregar o dashboard com os novos dados
        this.loadDashboard();
      },
  
      showDebugControls: function() {
        if (window.location.hostname === 'localhost' || 
            window.location.hostname.includes('dev') || 
            window.location.search.includes('debug=true')) {
          if (this.debugEl) {
            this.debugEl.style.display = 'block';
          }
        }
      },
  
      addDebugEventListeners: function() {
        var self = this;
        var forceMockBtn = this.container.querySelector('#force-mock-data');
        
        if (forceMockBtn) {
          forceMockBtn.addEventListener('click', function() {
            self.updateDebugStatus('Carregando dados mock...');
            self.loadMockData();
          });
        }
      },
  
      updateDebugStatus: function(message) {
        if (this.debugStatusEl) {
          this.debugStatusEl.textContent = message;
          console.log('Dashboard Debug:', message);
        }
      },
  
      loadDashboard: function() {
        var self = this;
        
        this.hideAllSections();
        if (this.loadingEl) this.loadingEl.style.display = 'block';

        // ✅ AGUARDAR PROCESSAMENTO HUBL ANTES DE VERIFICAR DADOS
        setTimeout(function () {
          console.log('🔍 Verificando window.hubspotNegociosData no dashboard:', window.hubspotNegociosData);

          if (window.hubspotNegociosData && window.hubspotNegociosData.success) {
            console.log('✅ Dados HubSpot encontrados para dashboard, processando...');
            self.handleDashboardResponse(window.hubspotNegociosData.data, false);
          } else if (window.hubspotNegociosData && !window.hubspotNegociosData.success) {
            console.log('⚠️ HubSpot processado mas sem dados no dashboard, usando mock...');
            self.loadMockData();
          } else {
            console.log('⏳ Aguardando processamento HubL no dashboard...');
            // Aguardar mais um pouco para o processamento HubL terminar
            setTimeout(function () {
              if (window.hubspotNegociosData && window.hubspotNegociosData.success) {
                self.handleDashboardResponse(window.hubspotNegociosData.data, false);
              } else {
                self.loadMockData();
              }
            }, 1000);
          }
        }, 500);
      },
  
      hideAllSections: function() {
        if (this.loadingEl) this.loadingEl.style.display = 'none';
        if (this.contentEl) this.contentEl.style.display = 'none';
        if (this.errorEl) this.errorEl.style.display = 'none';
        if (this.emptyEl) this.emptyEl.style.display = 'none';
      },
  
      loadMockData: function() {
        var mockResponse = {
          data: {
            CRM: {
              deal_collection: {
                items: this.getMockNegocios()
              }
            }
          }
        };
        
        console.log('🎭 Dados mockados gerados para dashboard:', mockResponse);
        this.handleDashboardResponse(mockResponse, true);
      },
  
      handleDashboardResponse: function(response, isMocked) {
        var negocios = response.data?.CRM?.deal_collection?.items || [];
        
        console.log('🎯 Processando resposta dashboard:', negocios.length, 'negócios');
        console.log('🎯 Usando dados mockados:', !!isMocked);
        
        this.hideAllSections();
        
        if (negocios.length === 0) {
          this.showNoData();
        } else {
          this.renderDashboard(negocios, isMocked);
        }
      },
  
      renderDashboard: function(negocios, isMocked) {
        if (!this.contentEl) return;
        
        var html = this.generateDashboardHTML(negocios, isMocked);
        this.contentEl.innerHTML = html;
        this.contentEl.style.display = 'block';
        
        this.addEventListeners();
        console.log('✅ Dashboard renderizado com', negocios.length, 'registros');
        if (isMocked) {
          console.log('🎭 Usando dados de demonstração');
        }
      },

      generateDashboardHTML: function(negocios, isMocked) {
        var totalNegocios = negocios.length;
        var negociosAbertos = this.getNegociosAbertos(negocios);
        var negociosGanhos = this.getNegociosGanhos(negocios);
        
        var demoBanner = isMocked ? `
          <div class="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                </svg>
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-amber-800">Dashboard de Demonstração</h3>
                <p class="text-sm text-amber-600">Dados fictícios para demonstração. Em produção, serão exibidos os dados reais do HubSpot.</p>
              </div>
            </div>
          </div>
        ` : '';
        
        return `
          <div class="space-y-6">

            
            <!-- Cards de Resumo -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div class="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div class="flex items-center">
                  <div class="flex-1">
                    <p class="text-sm font-medium text-gray-500">Total de Negócios</p>
                    <p class="text-2xl font-semibold text-gray-900">${totalNegocios}</p>
                  </div>
                  <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                      <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
  
              <div class="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div class="flex items-center">
                  <div class="flex-1">
                    <p class="text-sm font-medium text-gray-500">Negócios Abertos</p>
                    <p class="text-2xl font-semibold text-yellow-600">${negociosAbertos}</p>
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
  
              <div class="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div class="flex items-center">
                  <div class="flex-1">
                    <p class="text-sm font-medium text-gray-500">Negócios Ganhos</p>
                    <p class="text-2xl font-semibold text-green-600">${negociosGanhos}</p>
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
  
            <!-- Tabela de Negócios e Documentos -->
            <div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              <div class="px-6 py-4 border-b border-gray-200">
                <h3 class="text-lg font-medium text-gray-900">Negócios e Status dos Documentos</h3>
                <p class="text-sm text-gray-500 mt-1">
                  <span class="inline-flex items-center text-green-600">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                    Aprovado
                  </span>
                  <span class="inline-flex items-center text-yellow-600 ml-4">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                    Pendente
                  </span>
                  <span class="inline-flex items-center text-red-600 ml-4">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                    Faltando
                  </span>
                </p>
              </div>
              
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-blue-800">
                    <tr>
                      <th class="sticky left-0 bg-blue-800 px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider z-10">
                        Negócio
                      </th>
                      <th class="px-4 py-3 bg-blue-800 text-center text-xs font-medium text-white uppercase tracking-wider">
                        IPTU
                      </th>
                      <th class="px-4 py-3 bg-blue-800 text-center text-xs font-medium text-white uppercase tracking-wider">
                        Matrícula
                      </th>
                      <th class="px-4 py-3 bg-blue-800 text-center text-xs font-medium text-white uppercase tracking-wider">
                        Fotos Imóvel
                      </th>
                      <th class="px-4 py-3 bg-blue-800 text-center text-xs font-medium text-white uppercase tracking-wider">
                        Foto Fachada
                      </th>
                      <th class="px-4 py-3 bg-blue-800 text-center text-xs font-medium text-white uppercase tracking-wider">
                        CPF/RG
                      </th>
                      <th class="px-4 py-3 bg-blue-800 text-center text-xs font-medium text-white uppercase tracking-wider">
                        Certidões
                      </th>
                      <th class="px-4 py-3 bg-blue-800 text-center text-xs font-medium text-white uppercase tracking-wider">
                        Condomínio
                      </th>
                      <th class="px-4 py-3 bg-blue-800 text-center text-xs font-medium text-white uppercase tracking-wider">
                        Escritura
                      </th>
                      <th class="px-4 py-3 bg-blue-800 text-center text-xs font-medium text-white uppercase tracking-wider">
                        Dias na Esteira
                      </th>
                      <th class="px-6 py-3 bg-blue-800 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    ${negocios.map(negocio => this.generateNegocioTableRow(negocio)).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        `;
      },

      generateNegocioTableRow: function(negocio) {
        var documentos = this.getDocumentosStatus(negocio);
        
        // ✅ REPLICAR MESMA LÓGICA DO NEGOCIOS.MODULE PARA NOMES E IDENTIFICADORES
        var nome = negocio.dealname || negocio.homecash_subject || negocio.name || 'Sem nome';
        var valor = negocio.original_amount ? this.formatCurrency(negocio.original_amount) : 'R$ 0,00';
        var negocioId = negocio.deal_original_id || negocio.hs_object_id || Math.random().toString(36).substr(2, 9);
        var ticketId = negocio.ticket_homecash_id || negocioId;
        
        // ✅ USAR MESMO STATUS MAPPING DO NEGOCIOS.MODULE
        var statusInfo = this.getFranquiaStatusInfo(negocio.ticket_franquia_stage);
        
        // ✅ CALCULAR DIAS NA ESTEIRA USANDO A MESMA LÓGICA DO NEGOCIOS.MODULE
        var diasEsteira = this.getDiasNaEsteira(negocio.homecash_createdate);
        
        return `
          <tr class="hover:bg-gray-50">
            <td class="sticky left-0 bg-white hover:bg-gray-50 px-6 py-4 whitespace-nowrap z-10">
              <div class="text-sm">
                <a href="/negocios/detalhe?negocio_id=${negocioId}&ticket_id_homecash=${ticketId}" 
                   class="text-blue-600 hover:text-blue-900 hover:underline font-medium">
                  ${nome}
                </a>
              </div>
              <div class="text-sm text-green-600 font-semibold">
                ${valor}
              </div>
              <div class="text-xs mt-1">
                <span class="px-2 py-1 rounded-full text-xs ${statusInfo.color}">${statusInfo.label}</span>
              </div>
            </td>
            
            ${this.generateDocumentColumns(documentos)}
            
            <td class="px-4 py-4 text-center whitespace-nowrap">
              <span class="px-2 py-1 text-xs rounded-full ${diasEsteira.color}">${diasEsteira.dias} dias</span>
            </td>
            
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <a href="/negocios/detalhe?negocio_id=${negocioId}&ticket_id_homecash=${ticketId}"
                 class="text-blue-600 hover:text-blue-900 hover:underline text-xs">
                Ver detalhes
              </a>
            </td>
          </tr>
        `;
      },

      generateDocumentColumns: function(documentos) {
        var documentOrder = ['iptu', 'matricula', 'fotos_imovel', 'foto_fachada', 'cpf_rg', 'certidoes', 'condominio', 'escritura'];
        
        return documentOrder.map(docKey => {
          var doc = documentos[docKey];
          if (!doc) {
            return `<td class="px-4 py-4 text-center">
              <span class="text-gray-300">—</span>
            </td>`;
          }
          
          return `
            <td class="px-4 py-4 text-center">
              <div class="flex items-center justify-center">
                ${this.getDocumentStatusIcon(doc)}
              </div>
            </td>
          `;
        }).join('');
      },

      getDocumentStatusIcon: function(doc) {
        var tooltipText = doc.observacao || doc.nome || 'Sem informação';
        
        // ✅ REPLICAR EXATOS ÍCONES DO NEGOCIOS.MODULE COM CORES E FORMAS CORRETAS
        switch(doc.status) {
          case 'approved':
            return `
              <div class="relative group">
                <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
                <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                  ${tooltipText}
                </div>
              </div>
            `;
          case 'pending':
            return `
              <div class="relative group">
                <svg class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                </svg>
                <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                  ${tooltipText}
                </div>
              </div>
            `;
          case 'missing':
          default:
            return `
              <div class="relative group">
                <svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                </svg>
                <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                  ${tooltipText}
                </div>
              </div>
            `;
        }
      },

      getDocumentosStatus: function(negocio) {
        var documentos = {};
        
        // ✅ REPLICAR EXATA LÓGICA DO NEGOCIOS.MODULE - Mapear status reais para formato do dashboard
        var statusMap = {
          'Aprovado': 'approved',
          'Pendente': 'pending', 
          'Faltando': 'missing',
          'Em análise': 'pending',
          'Rejeitado': 'missing',
          'Não enviado': 'missing',
          'Aguardando': 'pending',
          '': 'missing',
          null: 'missing',
          undefined: 'missing'
        };

        // ✅ REPLICAR HELPER FUNCTION DO NEGOCIOS.MODULE
        function extrairStatus(valor) {
          if (!valor) return null;
          
          if (Array.isArray(valor)) {
            return valor.length > 0 ? valor[0] : null;
          }
          
          if (typeof valor === 'string' && valor.startsWith('[') && valor.endsWith(']')) {
            var limpo = valor.slice(1, -1).trim();
            return limpo;
          }
          
          return valor;
        }

        // ✅ REPLICAR FUNÇÃO DE VALIDAÇÃO DE FOTOS DO NEGOCIOS.MODULE
        function temFotosValidas(campo) {
          return campo && 
                 campo !== '' && 
                 campo !== 'null' && 
                 campo !== '[]' &&
                 campo !== 'undefined' &&
                 !campo.includes('sem foto') &&
                 !campo.includes('não enviado');
        }
    
        // ✅ IPTU - usando mesma lógica do negocios.module
        var statusIptu = extrairStatus(negocio.status_iptu_do_imovel);
        documentos.iptu = {
          nome: 'IPTU',
          status: statusMap[statusIptu] || 'missing',
          observacao: negocio.notas_iptu_do_imovel || 'Sem observação'
        };
        
        // ✅ Matrícula - usando mesma lógica do negocios.module  
        var statusMatricula = extrairStatus(negocio.status_matricula);
        documentos.matricula = {
          nome: 'Matrícula',
          status: statusMap[statusMatricula] || 'missing',
          observacao: negocio.notas_matricula || 'Sem observação'
        };
        
        // ✅ Fotos Imóvel - usando validação aprimorada igual ao negocios.module
        documentos.fotos_imovel = {
          nome: 'Fotos Imóvel',
          status: temFotosValidas(negocio.fotos_internas) ? 'approved' : 'missing',
          observacao: temFotosValidas(negocio.fotos_internas) ? 'Fotos internas enviadas' : 'Fotos internas não enviadas'
        };
        
        // ✅ Foto Fachada - usando validação aprimorada igual ao negocios.module
        documentos.foto_fachada = {
          nome: 'Foto Fachada',
          status: temFotosValidas(negocio.fotos_da_fachada) ? 'approved' : 'missing',
          observacao: temFotosValidas(negocio.fotos_da_fachada) ? 'Foto da fachada enviada' : 'Foto da fachada não enviada'
        };
        
        // ✅ CPF/RG - usando mesma lógica do negocios.module
        var statusCpfRg = extrairStatus(negocio.status_cpf_e_rg_do_s__proprietario_s_);
        documentos.cpf_rg = {
          nome: 'CPF/RG',
          status: statusMap[statusCpfRg] || 'missing',
          observacao: negocio.notas_cpf_e_rg_do_s__proprietario_s_ || 'Sem observação'
        };
        
        // ✅ Certidões - usando mesma lógica do negocios.module
        var statusCertidoes = extrairStatus(negocio.status_certidao_de_estado_civil);
        documentos.certidoes = {
          nome: 'Certidões',
          status: statusMap[statusCertidoes] || 'missing',
          observacao: negocio.notas_certidao_de_estado_civil || 'Sem observação'
        };
        
        // ✅ Condomínio - usando mesma lógica do negocios.module
        var statusCondominio = extrairStatus(negocio.status_boleto_de_condominio);
        documentos.condominio = {
          nome: 'Condomínio',
          status: statusMap[statusCondominio] || 'missing',
          observacao: negocio.notas_boleto_de_condominio || 'Sem observação'
        };
        
        // ✅ Escritura - usando mesma lógica do negocios.module
        var statusEscritura = extrairStatus(negocio.status_certidao_negativa_de_debitos_de_iptu);
        documentos.escritura = {
          nome: 'Escritura',
          status: statusMap[statusEscritura] || 'missing',
          observacao: negocio.notas_certidao_negativa_de_debitos_de_iptu || 'Sem observação'
        };
        
        console.log('📋 Status dos documentos processados para', negocio.dealname || negocio.homecash_subject, ':', documentos);
        return documentos;
      },

      seededRandom: function(seed) {
        var hash = 0;
        for (var i = 0; i < seed.length; i++) {
          var char = seed.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        
        return function() {
          hash = (hash * 9301 + 49297) % 233280;
          return hash / 233280;
        };
      },

      getNegociosAbertos: function(negocios) {
        // ✅ USAR DADOS REAIS DO STATUS DOS TICKETS DE FRANQUIA
        return negocios.filter(function(negocio) {
          var stage = negocio.ticket_franquia_stage;
          // Abertos: todos exceto finalizados (Finalização do pagamento, Em locação, Descartado, Perdido)
          return stage && !['1095528870', '1095528871', '1095528872', '1095528873'].includes(stage);
        }).length;
      },
  
      getNegociosGanhos: function(negocios) {
        // ✅ USAR DADOS REAIS DO STATUS DOS TICKETS DE FRANQUIA
        return negocios.filter(function(negocio) {
          var stage = negocio.ticket_franquia_stage;
          // Ganhos: Finalização do pagamento, Em locação
          return stage && ['1095528870', '1095528871'].includes(stage);
        }).length;
      },
  
      // ✅ REPLICAR FUNÇÃO DE STATUS DA FRANQUIA DO NEGOCIOS.MODULE
      getFranquiaStatusInfo: function(stage) {
        var franquiaStatusMap = {
          '1095534672': { label: 'Lead inicial', color: 'bg-gray-100 text-gray-800' },
          '1095534673': { label: 'Reunião marcada', color: 'bg-blue-100 text-blue-800' },
          '1095534674': { label: 'Reunião realizada', color: 'bg-blue-100 text-blue-800' },
          '1095534675': { label: 'Aguardando documentação', color: 'bg-yellow-100 text-yellow-800' },
          '1043275525': { label: 'Documentação enviada', color: 'bg-blue-100 text-blue-800' },
          '1043275526': { label: 'Aguardando documentos complementares', color: 'bg-yellow-100 text-yellow-800' },
          '1043275527': { label: 'Em análise do backoffice', color: 'bg-purple-100 text-purple-800' },
          '1062003577': { label: 'Apresentação da proposta', color: 'bg-indigo-100 text-indigo-800' },
          '1062003578': { label: 'Negociação da proposta', color: 'bg-orange-100 text-orange-800' },
          '1095528865': { label: 'Avaliação do imóvel', color: 'bg-purple-100 text-purple-800' },
          '1095528866': { label: 'Reajuste da proposta', color: 'bg-orange-100 text-orange-800' },
          '1095528867': { label: 'Documentação para formalização', color: 'bg-yellow-100 text-yellow-800' },
          '1095528868': { label: 'Formalização Jurídica', color: 'bg-indigo-100 text-indigo-800' },
          '1095528869': { label: 'Condicionais e Registro do imóveis', color: 'bg-purple-100 text-purple-800' },
          '1095528870': { label: 'Finalização do pagamento', color: 'bg-green-100 text-green-800' },
          '1095528871': { label: 'Em locação', color: 'bg-green-100 text-green-800' },
          '1095528872': { label: 'Descartado', color: 'bg-gray-100 text-gray-800' },
          '1095528873': { label: 'Perdido', color: 'bg-red-100 text-red-800' }
        };

        return franquiaStatusMap[stage] || { label: 'Status não identificado', color: 'bg-gray-100 text-gray-800' };
      },

      // ✅ REPLICAR FUNÇÃO DE CÁLCULO DOS DIAS NA ESTEIRA DO NEGOCIOS.MODULE
      getDiasNaEsteira: function(createDate) {
        if (!createDate) {
          return { dias: 0, color: 'bg-gray-100 text-gray-800' };
        }

        try {
          // Converter timestamp Unix (milissegundos) para Date
          var timestamp = parseInt(createDate);
          var dataInicio;

          if (!isNaN(timestamp)) {
            dataInicio = new Date(timestamp);
          } else {
            dataInicio = new Date(createDate);
          }

          var dataAtual = new Date();
          var diffTime = Math.abs(dataAtual - dataInicio);
          var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          var color;
          if (diffDays <= 10) {
            color = 'bg-green-100 text-green-800';
          } else if (diffDays <= 20) {
            color = 'bg-yellow-100 text-yellow-800';
          } else {
            color = 'bg-red-100 text-red-800';
          }

          return { dias: diffDays, color: color };
        } catch (e) {
          return { dias: 0, color: 'bg-gray-100 text-gray-800' };
        }
      },

      formatCurrency: function(value) {
        if (!value) return 'R$ 0,00';
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(value);
      },

      getMockNegocios: function() {
        // ✅ VERIFICAR SE HÁ DADOS REAIS PRIMEIRO
        if (window.hubspotDashboardProcessamento && window.hubspotDashboardProcessamento.negocios_processados && window.hubspotDashboardProcessamento.negocios_processados.length > 0) {
          console.log('🎯 Usando dados reais do processamento HubL para dashboard');
          return window.hubspotDashboardProcessamento.negocios_processados;
        }

        // Se não há dados reais, retorna array vazio para mostrar empty state
        console.log('⚠️ Nenhum dado real encontrado no dashboard, retornando array vazio');
        return [];

        /*
        // Dados mock para desenvolvimento - comentados para priorizar empty state
        return [
          {
            hs_object_id: 'mock_001',
            dealname: 'Casa Vila Madalena - 3 quartos, 2 banheiros',
            original_amount: 850000,
            ticket_franquia_stage: '1095534673',
            status_iptu_do_imovel: 'Aprovado',
            notas_iptu_do_imovel: 'IPTU quitado 2024'
          }
        ];
        */
      },

  
      addEventListeners: function() {
        // Adicionar listeners se necessário
      },
  
      showNoData: function() {
        this.hideAllSections();
        if (this.emptyEl) {
          this.emptyEl.style.display = 'block';
        }
      }
    };

    window.dashboardModule = module;
  
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        module.init();
      });
    } else {
      module.init();
    }
  
  })(); 