// Módulo de Negócios - HomeCash Rooftop
(function () {
  'use strict';

  var module = {
    n8nConfig: {
      baseUrl: 'https://n8n2.rooftop.com.br/webhook/portal',
      endpoints: {
        updateTicket: '/update-ticket',
        updateDeal: '/update-deal',
        getDeals: '/get-deals'
      }
    },
    // Mapeamento dos motivos de descarte (quando imóvel não está dentro dos parâmetros)
    motivosDescarte: {
      'politica_regiao': 'Política de região',
      'politica_cep': 'Política de CEP',
      'politica_valor': 'Política de valor',
      'politica_padrao_construtivo': 'Política de padrão construtivo',
      'politica_tipo_imovel': 'Política de tipo de imóvel',
      'documentacao_irregular': 'Imóvel com documentação irregular',
      'lead_duplicado': 'Lead Duplicado',
      'recusado_comite_interno': 'Recusado - Comitê interno',
      'recusado_comite_investidor': 'Recusado - Comitê investidor',
      'recusado_analise_renda': 'Recusado - Análise de renda',
      'recusado_juridico': 'Recusado - Jurídico',
      'recusado_analise_proprietario': 'Recusado - Análise do proprietário',
      'pediu_descartar': 'Pediu para descartar'
    },
    // Mapeamento dos motivos de perda (quando cliente não quer seguir)
    motivosPerda: {
      'valor_avaliacao': 'Valor de avaliação',
      'valor_aluguel': 'Valor do aluguel',
      'valor_liquidez': 'Valor de liquidez',
      'prazo_recompra': 'Prazo de recompra',
      'sem_necessidade_imediata': 'Sem necessidade imediata - Interessado',
      'produtos_mercado_venda': 'Produtos de mercado - Venda do imóvel',
      'produtos_mercado_emprestimo': 'Produtos de mercado - Empréstimo',
      'produtos_mercado_outros': 'Produtos de mercado - Outros',
      'influencias_familiares': 'Influências familiares',
      'contato_sem_sucesso': 'Contato sem sucesso',
      'contato_parou_responder': 'Contato parou de responder',
      'nao_informou': 'Não informou o motivo',
      'negativo_sem_interesse': 'Negativo - Sem interesse',
      'pediu_descartar': 'Pediu para descartar'
    },
    // Estado do modal de finalização
    modalState: {
      isOpen: false,
      currentTicketId: null,
      currentDealId: null,
      currentNegocioNome: null,
      loading: false,
      tipoFinalizacao: null, // 'descartar' ou 'perder'
      etapa: 1 // 1: escolha tipo, 2: motivo e descrição
    },
    init: function () {
      this.container = document.querySelector('[data-module="negociosModule"]');
      if (!this.container) return;

      this.contentEl = this.container.querySelector('.negocios-content');
      this.errorEl = this.container.querySelector('.negocios-error');

      this.currentFilter = 'todos';
      this.currentDateFilter = 'todas';
      this.currentPriorityFilter = 'todas';

      // ✅ GARANTIR QUE O BOTÃO COMECE ESCONDIDO
      this.hideHeaderButton();

      this.loadNegocios();
    },

    // Função para buscar deals via API
    fetchDealsFromAPI: async function(contactId) {
      var url = this.n8nConfig.baseUrl + this.n8nConfig.endpoints.getDeals + '?contact_id=' + contactId;
      
      try {
        // console.log('🔄 Buscando deals via API:', url);
        
        var response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error('HTTP error! status: ' + response.status);
        }
        
        var data = await response.json();
        // console.log('resultados da api', data)
        // console.log('✅ Deals recebidos:', data.data.length);
        
        return this.transformAPIDataToFormat(data.data);
        
      } catch (error) {
        console.error('❌ Erro ao buscar deals:', error);
        return null;
      }
    },

    // Transformar dados da API para o formato esperado pelo módulo
    transformAPIDataToFormat: function(apiData) {
      if (!Array.isArray(apiData)) {
        console.error('❌ Dados da API não são um array');
        return null;
      }
      
      var transformedItems = apiData.map(function(item) {
        return {
          // IDs principais
          hs_object_id: item.deal_id,
          deal_original_id: item.deal_id,
          
          // Dados do deal
          dealname: item.deal_name,
          dealstage: item.deal_stage,
          pipeline: item.deal_pipeline,
          createdate: new Date(item.deal_createdate).getTime(),
          lastmodifieddate: new Date(item.deal_lastmodifieddate).getTime(),
          
          // Campo história do cliente
          homecash_content: item.deal_historia_do_cliente || '',

          // Lead recuperado
          deal_lead_recuperado: item.deal_lead_recuperado,
          deal_entered_mql: item?.deal_entered_mql,

          // Dados do ticket franquia
          ticket_franquia_id: item.ticket_id,
          ticket_franquia_subject: item.ticket_subject,
          ticket_franquia_stage: item.ticket_pipeline_stage,
          ticket_franquia_pipeline: item.ticket_pipeline,
          ticket_franquia_createdate: new Date(item.ticket_createdate).getTime(),
          ticket_franquia_priority: item.ticket_priority,
          
          // Para compatibilidade - usar prioridade do ticket
          homecash_priority: item.ticket_priority || 'MEDIUM',
          
          // Datas para cálculo de dias na esteira
          original_createdate: new Date(item.deal_createdate).getTime(),
          homecash_createdate: new Date(item.deal_createdate).getTime(),
          
          // Flags de pipeline
          isHomeCash: item.ticket_pipeline === '0',
          isFranquia: item.ticket_pipeline === '714520128',
          
          // Motivos de descarte e perda
          ticket_motivo_do_descarte: item.ticket_motivo_do_descarte,
          ticket_detalhe_o_motivo_do_descarte: item.ticket_detalhe_o_motivo_do_descarte,
          ticket_detalhe_o_motivo_da_perda: item.ticket_detalhe_o_motivo_da_perda,
          ticket_motivo_da_perda: item.ticket_motivo_da_perda
        };
      });
      
      // Filtrar apenas tickets da franquia (714520128)
      var franquiaItems = transformedItems.filter(function(item) {
        return item.isFranquia;
      });
      
      // console.log('📊 Transformados: ' + transformedItems.length + ' total, ' + franquiaItems.length + ' franquia');
      
      return {
        data: {
          CRM: {
            deal_collection: {
              items: franquiaItems
            }
          }
        }
      };
    },

    loadNegocios: function () {
      var self = this;
      
      this.hideAllSections();
      this.showSkeleton();
      
      // Obter contact_id
      var contactId = window.hubspotContactId;
      
      if (!contactId) {
        // console.log('⚠️ Contact ID não encontrado, mostrando estado vazio');
        setTimeout(function() {
          self.showNoData();
        }, 500);
        return;
      }
      
      // Buscar dados via API
      this.fetchDealsFromAPI(contactId)
        .then(function(data) {
          if (data && data.data.CRM.deal_collection.items.length > 0) {
            // console.log('✅ Dados da API recebidos com sucesso');
            self.handleNegociosResponse(data);
          } else {
            // console.log('📭 Nenhum dado retornado da API');
            self.showNoData();
          }
        })
        .catch(function(error) {
          console.error('❌ Erro ao carregar deals:', error);
          self.showError();
        });
    },

    showSkeleton: function () {
      if (!this.contentEl) return;

      var skeletonHTML = this.generateSkeletonHTML();
      this.contentEl.innerHTML = skeletonHTML;
      this.contentEl.style.display = 'block';

      // ✅ ESCONDER BOTÃO DURANTE CARREGAMENTO
      this.hideHeaderButton();
    },

    hideAllSections: function () {
      if (this.errorEl) this.errorEl.style.display = 'none';
    },

    showError: function () {
      this.hideAllSections();

      // ✅ ESCONDER BOTÃO DURANTE ERRO
      this.hideHeaderButton();

      if (this.errorEl) {
        this.errorEl.style.display = 'block';
      }
    },

    loadMockData: function () {
      var self = this;
      var mockResponse = {
        data: {
          CRM: {
            deal_collection: {
              items: this.getMockNegocios()
            }
          }
        }
      };

      setTimeout(function () {
        self.handleNegociosResponse(mockResponse);
      }, 800);
    },

    handleNegociosResponse: function (response) {
      var negocios = response.data?.CRM?.deal_collection?.items || [];
      // console.log('response.data handleNegociosResponse',  response.data);
      // console.log('negocios handleNegociosResponse', negocios);
      this.hideAllSections();

      // ✅ VERIFICAR SE HÁ DADOS REAIS ANTES DE MOSTRAR EMPTY STATE
      // console.log('🔍 Verificando dados recebidos:', {
      //   negocios: negocios,
      //   length: negocios.length,
      //   hubspotData: window.hubspotNegociosData
      // });

      if (negocios.length === 0) {
        this.showNoData();
      } else {
        this.renderNegocios(negocios);
      }
    },

    renderNegocios: function (negocios) {
      if (!this.contentEl) return;

      var html = this.generateNegociosHTML(negocios);
      this.contentEl.innerHTML = html;
      this.contentEl.style.display = 'block';

      // ✅ MOSTRAR BOTÃO CADASTRAR IMÓVEL NO HEADER QUANDO HÁ DADOS
      this.showHeaderButton();

      this.addEventListeners();
    },

    generateNegociosHTML: function (negocios) {
      return `
         <div class="space-y-6">
                                               <!-- Filtros -->
             <div class="bg-white rounded-lg shadow border border-gray-200 p-4">
               <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                 
                 <!-- Filtro de Status -->
                 <div>
                   <label for="status-filter" class="block text-sm font-medium text-gray-700 mb-2">Status</label>
                   <select id="status-filter" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 cursor-pointer">
                     <option value="todos" ${this.currentFilter === 'todos' ? 'selected' : ''}>Todos</option>
                     <option value="abertos" ${this.currentFilter === 'abertos' ? 'selected' : ''}>Abertos</option>
                     <option value="ganhos" ${this.currentFilter === 'ganhos' ? 'selected' : ''}>Ganhos</option>
                     <option value="perdidos" ${this.currentFilter === 'perdidos' ? 'selected' : ''}>Perdidos</option>
                   </select>
                 </div>

                 <!-- Filtro de Data -->
                 <div>
                   <label for="date-filter" class="block text-sm font-medium text-gray-700 mb-2">Data de Criação</label>
                   <select id="date-filter" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 cursor-pointer">
                     <option value="todas" ${this.currentDateFilter === 'todas' ? 'selected' : ''}>Todas</option>
                     <option value="hoje" ${this.currentDateFilter === 'hoje' ? 'selected' : ''}>Hoje</option>
                     <option value="semana" ${this.currentDateFilter === 'semana' ? 'selected' : ''}>Última semana</option>
                     <option value="mes" ${this.currentDateFilter === 'mes' ? 'selected' : ''}>Este mês</option>
                     <option value="trimestre" ${this.currentDateFilter === 'trimestre' ? 'selected' : ''}>Este trimestre</option>
                   </select>
                 </div>

                 <!-- Filtro de Prioridade -->
                 <div>
                   <label for="priority-filter" class="block text-sm font-medium text-gray-700 mb-2">Prioridade</label>
                   <select id="priority-filter" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block w-full p-2.5 cursor-pointer">
                     <option value="todas" ${this.currentPriorityFilter === 'todas' ? 'selected' : ''}>Todas</option>
                     <option value="LOW" ${this.currentPriorityFilter === 'LOW' ? 'selected' : ''}>Baixa</option>
                     <option value="MEDIUM" ${this.currentPriorityFilter === 'MEDIUM' ? 'selected' : ''}>Média</option>
                     <option value="HIGH" ${this.currentPriorityFilter === 'HIGH' ? 'selected' : ''}>Alta</option>
                     <option value="URGENT" ${this.currentPriorityFilter === 'URGENT' ? 'selected' : ''}>Urgente</option>
                   </select>
                 </div>
               </div>
             </div>

           <!-- Tabela de Negócios -->
           <div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
             <div class="overflow-x-auto">
               <table class="min-w-full divide-y divide-gray-200">
                 <thead class="bg-gray-50">
                   <tr>
                     <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       Negócio
                     </th>
                     <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       Status
                     </th>
                     <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       Data de criação
                     </th>
                     <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       Prioridade
                     </th>
                     <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       Dias na esteira
                     </th>
                     <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       Ações
                     </th>
                   </tr>
                 </thead>
                 <tbody class="bg-white divide-y divide-gray-200" id="negocios-tbody">
                   ${this.getFilteredNegocios(negocios).map(negocio => this.generateNegocioRow(negocio)).join('')}
                 </tbody>
               </table>
             </div>
           </div>
         </div>
       `;
    },

    generateSkeletonHTML: function () {
      return `
          <div class="space-y-6">
            <!-- Skeleton Filtros -->
            <div class="bg-white rounded-lg shadow border border-gray-200 p-4">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                ${Array(3).fill(0).map(() => `
                  <div>
                    <div class="h-4 bg-gray-200 rounded animate-pulse mb-2 w-20"></div>
                    <div class="h-10 bg-gray-200 rounded-lg animate-pulse w-full"></div>
                  </div>
                `).join('')}
              </div>
            </div>

           <!-- Skeleton Tabela -->
           <div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
             <div class="overflow-x-auto">
               <table class="min-w-full divide-y divide-gray-200">
                 <thead class="bg-gray-50">
                   <tr>
                     <th class="px-6 py-3"><div class="h-4 bg-gray-200 rounded animate-pulse"></div></th>
                     <th class="px-6 py-3"><div class="h-4 bg-gray-200 rounded animate-pulse"></div></th>
                     <th class="px-6 py-3"><div class="h-4 bg-gray-200 rounded animate-pulse"></div></th>
                     <th class="px-6 py-3"><div class="h-4 bg-gray-200 rounded animate-pulse"></div></th>
                     <th class="px-6 py-3"><div class="h-4 bg-gray-200 rounded animate-pulse"></div></th>
                     <th class="px-6 py-3"><div class="h-4 bg-gray-200 rounded animate-pulse"></div></th>
                   </tr>
                 </thead>
                 <tbody class="bg-white divide-y divide-gray-200">
                   ${Array(5).fill(0).map(() => `
                     <tr>
                       <td class="px-6 py-4"><div class="h-4 bg-gray-200 rounded animate-pulse w-48"></div></td>
                       <td class="px-6 py-4"><div class="h-6 bg-gray-200 rounded-full animate-pulse w-24"></div></td>
                       <td class="px-6 py-4"><div class="h-4 bg-gray-200 rounded animate-pulse w-20"></div></td>
                       <td class="px-6 py-4"><div class="h-6 bg-gray-200 rounded-full animate-pulse w-16"></div></td>
                       <td class="px-6 py-4"><div class="h-6 bg-gray-200 rounded-full animate-pulse w-14"></div></td>
                       <td class="px-6 py-4"><div class="h-4 bg-gray-200 rounded animate-pulse w-20"></div></td>
                     </tr>
                   `).join('')}
                 </tbody>
               </table>
             </div>
           </div>
         </div>
       `;
    },

    generateNegocioRow: function (negocio) {
      // console.log('negocio do generateNegocioRow', negocio)
      var nome = negocio.dealname || negocio.name || 'Sem nome';
      var status = this.getFranquiaStatusInfo(negocio.ticket_franquia_stage);
      var data = negocio.ticket_franquia_createdate ? this.formatDate(negocio.ticket_franquia_createdate) : '';
      var prioridade = this.getPrioridadeInfo(negocio.homecash_priority || 'MEDIUM');
      var diasEsteira = this.getDiasNaEsteira(negocio.original_createdate || negocio.homecash_createdate);

      // Verificar se é lead recuperado (compatível com ES5)
      var leadRecuperado = negocio.deal_lead_recuperado === true;
      var enteredMql = negocio.deal_entered_mql === true;
      
      // Capturar campos de motivo da API
      var motivoDescarte = negocio.ticket_motivo_do_descarte;
      var motivoPerda = negocio.ticket_motivo_da_perda;
      var detalheMotivoDescarte = negocio.ticket_detalhe_o_motivo_do_descarte;
      var detalheMotivoPerda = negocio.ticket_detalhe_o_motivo_da_perda;

      // Determinar qual ícone mostrar
      var leadIcon = '';
      if (leadRecuperado && enteredMql) {
        // Fire icon - Lead recuperado que passou por MQL
        leadIcon = `
          <span title="Lead recuperado - MQL" class="inline-flex">
            <svg class="w-4 h-4 text-orange-500 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clip-rule="evenodd"></path>
            </svg>
          </span>
        `;
      } else if (leadRecuperado) {
        // Gift icon - Lead recuperado que não passou por MQL
        leadIcon = `
          <span title="Lead recuperado - Nova oportunidade" class="inline-flex">
            <svg class="w-4 h-4 text-green-500 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
  <path fill-rule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clip-rule="evenodd"></path>
  <path d="M9 11H3v5a2 2 0 002 2h4v-7zM11 18h4a2 2 0 002-2v-5h-6v7z"></path>
</svg>
          </span>
        `;
      }

      // Nome como link para detalhes
      var nomeComLink = `
      <a href="/negocios/detalhe?negocio_id=${negocio.deal_original_id}&ticket_id_franquia=${negocio.ticket_franquia_id}" 
        class="text-blue-600 hover:text-blue-900 hover:underline font-medium" target="_blank">
        ${nome} 
        ${leadIcon}
      </a>
      `;

      // Botão Finalizar (sempre visível, mas você pode adicionar condições)
      var botaoFinalizar = `
        <button 
          onclick="window.negociosModule.abrirModalFinalizarNegocio('${negocio.ticket_franquia_id}', '${negocio.deal_original_id}', '${nome.replace(/'/g, "\\'")}')" 
          class="cursor-pointer inline-flex items-center px-3 py-1 text-sm font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 hover:text-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
          title="Finalizar este negócio"
        >
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          Finalizar
        </button>
      `;

      // Renderizar status badge (clicável se for Descartado/Perdido com motivo)
      var statusBadge;
      var isDescartado = negocio.ticket_franquia_stage === '1095528872';
      var isPerdido = negocio.ticket_franquia_stage === '1095528873';
      var motivoBase = isDescartado ? motivoDescarte : motivoPerda;
      var detalheMotivo = isDescartado ? detalheMotivoDescarte : detalheMotivoPerda;

      if ((isDescartado || isPerdido) && (motivoBase || detalheMotivo)) {
        var tipoMotivo = isDescartado ? 'descartado' : 'perdido';
        statusBadge = `
          <button
            onclick="window.negociosModule.showMotivoModal('${(motivoBase || '').replace(/'/g, "\\'")}', '${(detalheMotivo || '').replace(/'/g, "\\'")}', '${tipoMotivo}', '${nome.replace(/'/g, "\\'")}')"
            class="px-2 py-1 text-xs rounded-full ${status.color} cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            title="Clique para ver o motivo"
          >
            ${status.label}
          </button>
        `;
      } else {
        statusBadge = `<span class="px-2 py-1 text-xs rounded-full ${status.color}">${status.label}</span>`;
      }

      return `
        <tr class="hover:bg-gray-50">
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm">${nomeComLink}</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            ${statusBadge}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            ${data}
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="px-2 py-1 text-xs rounded-full ${prioridade.color}">${prioridade.label}</span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="px-2 py-1 text-xs rounded-full ${diasEsteira.color}">${diasEsteira.dias} dias</span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
            ${botaoFinalizar}
          </td>
        </tr>
      `;
    },


    getFilteredNegocios: function (negocios) {
      var filtered = negocios;

      // ✅ FILTRO POR STATUS (usando códigos da franquia)
      switch (this.currentFilter) {
        case 'abertos':
          filtered = filtered.filter(n => {
            var stage = n.ticket_franquia_stage;
            // Todos exceto ganhos e perdidos
            return stage && !['1095528870', '1095528871', '1095528872', '1095528873'].includes(stage);
          });
          break;
        case 'ganhos':
          filtered = filtered.filter(n => {
            var stage = n.ticket_franquia_stage;
            // Finalização do pagamento, Em locação
            return stage && ['1095528870', '1095528871'].includes(stage);
          });
          break;
        case 'perdidos':
          filtered = filtered.filter(n => {
            var stage = n.ticket_franquia_stage;
            // Descartado, Perdido
            return stage && ['1095528872', '1095528873'].includes(stage);
          });
          break;
        // 'todos' e 'fechados' removidos conforme mapeamento
        default:
          // Todos os registros
          break;
      }

      // ✅ FILTRO POR DATA
      if (this.currentDateFilter && this.currentDateFilter !== 'todas') {
        filtered = this.filterNegociosByDate(filtered, this.currentDateFilter);
      }

      // ✅ FILTRO POR PRIORIDADE  
      if (this.currentPriorityFilter && this.currentPriorityFilter !== 'todas') {
        filtered = filtered.filter(n => n.homecash_priority === this.currentPriorityFilter);
      }

      // ✅ ORDENAÇÃO PADRÃO: DIAS NA ESTEIRA (MAIOR → MENOR)
      filtered.sort((a, b) => {
        var diasA = this.getDiasNaEsteira(a.homecash_createdate).dias;
        var diasB = this.getDiasNaEsteira(b.homecash_createdate).dias;
        return diasB - diasA; // Maior para menor
      });

      return filtered;
    },

    // ✅ FUNÇÃO AUXILIAR PARA FILTRAR NEGÓCIOS POR DATA
    filterNegociosByDate: function (negocios, dateFilter) {
      var hoje = new Date();
      var inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

      // console.log('🔍 Filtrando por data:', dateFilter, 'Data de hoje:', inicioHoje);

      return negocios.filter(function (negocio) {
        if (!negocio.ticket_franquia_createdate) {
          // console.log('⚠️ Negócio sem data de criação:', negocio.dealname);
          return false;
        }

        var timestamp = parseInt(negocio.ticket_franquia_createdate);
        var dataItem = new Date(timestamp);

        // console.log('📅 Comparando data:', negocio.dealname, 'Data item:', dataItem, 'Filtro:', dateFilter);

        switch (dateFilter) {
          case 'hoje':
            return dataItem >= inicioHoje;
          case 'semana':
            var inicioSemana = new Date(inicioHoje);
            inicioSemana.setDate(inicioSemana.getDate() - 7);
            return dataItem >= inicioSemana;
          case 'mes':
            var inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
            return dataItem >= inicioMes;
          case 'trimestre':
            var inicioTrimestre = new Date(hoje.getFullYear(), Math.floor(hoje.getMonth() / 3) * 3, 1);
            return dataItem >= inicioTrimestre;
          default:
            return true;
        }
      });
    },

    getStatusInfo: function (stage) {
      var statusMap = {
        'appointmentscheduled': { label: 'Agendado', color: 'bg-blue-100 text-blue-800' },
        'qualifiedtobuy': { label: 'Qualificado', color: 'bg-yellow-100 text-yellow-800' },
        'presentationscheduled': { label: 'Apresentação', color: 'bg-purple-100 text-purple-800' },
        'decisionmakerboughtin': { label: 'Decisão', color: 'bg-indigo-100 text-indigo-800' },
        'contractsent': { label: 'Contrato', color: 'bg-orange-100 text-orange-800' },
        'closedwon': { label: 'Ganho', color: 'bg-green-100 text-green-800' },
        'closedlost': { label: 'Perdido', color: 'bg-red-100 text-red-800' }
      };

      return statusMap[stage] || { label: 'Desconhecido', color: 'bg-gray-100 text-gray-800' };
    },

    getFranquiaStatusInfo: function (stage) {
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

    getPrioridadeInfo: function (priority) {
      var prioridadeMap = {
        'LOW': { label: 'Baixa', color: 'bg-green-100 text-green-800' },
        'MEDIUM': { label: 'Média', color: 'bg-yellow-100 text-yellow-800' },
        'HIGH': { label: 'Alta', color: 'bg-orange-100 text-orange-800' },
        'URGENT': { label: 'Urgente', color: 'bg-red-100 text-red-800' }
      };

      return prioridadeMap[priority] || { label: 'Não definida', color: 'bg-gray-100 text-gray-800' };
    },

    getDiasNaEsteira: function (createDate) {
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

    filterBy: function (filter) {
      this.currentFilter = filter;
      // console.log('🔍 Filtro Status alterado para:', filter);
      this.reloadTable();
    },

    // ✅ FILTRO POR DATA (nova função para selects)
    filterByDateSelect: function (dateFilter) {
      this.currentDateFilter = dateFilter;
      // console.log('🔍 Filtro Data alterado para:', dateFilter);
      this.reloadTable();
    },

    // ✅ FILTRO POR PRIORIDADE (nova função para selects)
    filterByPrioritySelect: function (priorityFilter) {
      this.currentPriorityFilter = priorityFilter;
      // console.log('🔍 Filtro Prioridade alterado para:', priorityFilter);
      this.reloadTable();
    },

    // ✅ RECARREGAR TABELA (sem skeleton, apenas atualizar conteúdo)
    reloadTable: function () {
      // Recarregar dados via API
      this.loadNegocios();
    },

    viewNegocio: function (negocioId, ticketHomecashId) {
      var url = '/negocios/detalhes?negocio_id=' + negocioId + '&ticket_id_homecash=' + ticketHomecashId;
      window.location.href = url;
    },

    formatCurrency: function (value) {
      if (!value) return 'R$ 0,00';
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value);
    },

    formatDate: function (dateString) {
      if (!dateString) return '';
      try {
        // Converter timestamp Unix (milissegundos) para Date
        var timestamp = parseInt(dateString);
        if (!isNaN(timestamp)) {
          return new Date(timestamp).toLocaleDateString('pt-BR');
        }
        // Fallback para string de data normal
        return new Date(dateString).toLocaleDateString('pt-BR');
      } catch (e) {
        return dateString;
      }
    },

    getMockNegocios: function () {
      // Retorna array vazio - dados agora vêm da API
      // console.log('⚠️ Mock data solicitado, retornando array vazio');
      return [];
    },

    addEventListeners: function () {
      var self = this;

      // ✅ EVENT LISTENERS PARA OS SELECTS DE FILTRO
      var statusSelect = document.getElementById('status-filter');
      if (statusSelect) {
        statusSelect.addEventListener('change', function () {
          self.filterBy(this.value);
        });
      }

      var dateSelect = document.getElementById('date-filter');
      if (dateSelect) {
        dateSelect.addEventListener('change', function () {
          self.filterByDateSelect(this.value);
        });
      }

      var prioritySelect = document.getElementById('priority-filter');
      if (prioritySelect) {
        prioritySelect.addEventListener('change', function () {
          self.filterByPrioritySelect(this.value);
        });
      }
    },

    // ✅ FUNÇÕES PARA CONTROLAR VISIBILIDADE DO BOTÃO NO HEADER
    showHeaderButton: function () {
      var headerBtn = document.getElementById('btn-cadastrar-imovel-header');
      if (headerBtn) {
        headerBtn.classList.remove('hidden');
        // console.log('✅ Botão "Cadastrar Imóvel" exibido no header');
      }
    },

    hideHeaderButton: function () {
      var headerBtn = document.getElementById('btn-cadastrar-imovel-header');
      if (headerBtn) {
        headerBtn.classList.add('hidden');
        // console.log('🔒 Botão "Cadastrar Imóvel" ocultado do header');
      }
    },

    showNoData: function () {
      this.hideAllSections();
      if (!this.contentEl) return;

      // ✅ ESCONDER BOTÃO NO HEADER DURANTE EMPTY STATE
      this.hideHeaderButton();

      var emptyStateHTML = `
          <div class="text-center py-16">
            <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-6">
              <svg class="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            
            <h3 class="text-lg font-medium text-gray-900 mb-2">Nenhum negócio encontrado</h3>
            <p class="text-gray-500 mb-8 max-w-sm mx-auto">
              Comece criando seu primeiro imóvel para começar a gerenciar seus negócios.
            </p>
            
                         <button onclick="window.location.href='/cadastrar-imovel'" class="cursor-pointer inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
              <svg class="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Cadastrar Imóvel
            </button>
          </div>
        `;

      this.contentEl.innerHTML = emptyStateHTML;
      this.contentEl.style.display = 'block';
    },

    /**
     * Exibir modal com motivo do descarte/perda
     * @param {string} motivoBase - Motivo base do descarte/perda
     * @param {string} detalheMotivo - Detalhes do motivo
     * @param {string} tipo - Tipo: 'descartado' ou 'perdido'
     * @param {string} negocioNome - Nome do negócio
     */
    showMotivoModal: function (motivoBase, detalheMotivo, tipo, negocioNome) {
      // Remover modal existente se houver
      var existingModal = document.getElementById('modal-motivo');
      if (existingModal) {
        existingModal.remove();
      }

      const tipoLabel = tipo === 'descartado' ? 'Descarte' : 'Perda';
      const tipoColor = tipo === 'descartado' ? 'gray' : 'red';
      const iconPath = tipo === 'descartado'
        ? 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
        : 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z';

      const modalHTML = `
        <!-- Modal Overlay -->
        <div class="fixed inset-0 bg-gray-800 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center" id="modal-overlay-motivo">
          <div class="relative mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 xl:w-2/5 shadow-lg rounded-md bg-white">

            <!-- Header -->
            <div class="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 class="text-lg font-semibold text-gray-900">
                <svg class="w-5 h-5 text-${tipoColor}-500 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${iconPath}"></path>
                </svg>
                Motivo ${tipoLabel}
              </h3>
              <button type="button" class="text-gray-400 hover:text-gray-600 transition-colors" onclick="window.negociosModule.fecharMotivoModal()">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <!-- Body -->
            <div class="p-6">
              <!-- Motivo base -->
              <div class="mb-4 p-3 bg-${tipoColor}-50 rounded-lg border border-${tipoColor}-200">
                <p class="text-sm text-${tipoColor}-800">
                  <span class="font-medium">Motivo do ${tipoLabel}:</span><br>
                  ${motivoBase || 'Não há motivos informados, por favor entre em contato com o suporte.'}
                </p>
              </div>

              <!-- Detalhes do motivo -->
              <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Detalhes do motivo:
                </label>
                <div class="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div class="text-sm text-gray-800 leading-relaxed">
                    ${detalheMotivo ? this.sanitizeText(detalheMotivo) : 'Nenhum detalhe adicional informado.'}
                  </div>
                </div>
              </div>

              <!-- Footer -->
              <div class="flex justify-end">
                <button
                  type="button"
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onclick="window.negociosModule.fecharMotivoModal()"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      // Adicionar modal ao body
      const modalContainer = document.createElement('div');
      modalContainer.id = 'modal-motivo';
      modalContainer.innerHTML = modalHTML;
      document.body.appendChild(modalContainer);

      // Adicionar event listener para fechar clicando fora
      document.getElementById('modal-overlay-motivo').addEventListener('click', function(e) {
        if (e.target.id === 'modal-overlay-motivo') {
          window.negociosModule.fecharMotivoModal();
        }
      });
    },

    /**
     * Fechar modal de motivo
     */
    fecharMotivoModal: function () {
      const modal = document.getElementById('modal-motivo');
      if (modal) {
        modal.remove();
      }
    },

    /**
     * Sanitizar texto para evitar quebras na aplicação
     * @param {string} text - Texto a ser sanitizado
     */
    sanitizeText: function(text) {
      if (!text) return '';
      return text.toString()
        .replace(/\n/g, '<br>')           // Quebras de linha → <br>
        .replace(/\r/g, '')               // Remove \r
        .replace(/'/g, '&#39;')           // Aspas simples → HTML entity
        .replace(/"/g, '&quot;')          // Aspas duplas → HTML entity
        .replace(/</g, '&lt;')            // < → HTML entity (exceto <br>)
        .replace(/>/g, '&gt;')            // > → HTML entity (exceto <br>)
        .replace(/&lt;br&gt;/g, '<br>');  // Restaurar <br> tags
    },

   /**
     * Abrir modal para finalizar negócio (acionado pelo botão Finalizar)
     * @param {string} ticketId - ID do ticket
     * @param {string} dealId - ID do deal
     * @param {string} negocioNome - Nome do negócio para exibição
   */
    abrirModalFinalizarNegocio: function (ticketId, dealId, negocioNome) {
      var self = this;

      this.modalState.currentTicketId = ticketId;
      this.modalState.currentDealId = dealId;
      this.modalState.currentNegocioNome = negocioNome;
      this.modalState.isOpen = true;
      this.modalState.tipoFinalizacao = null;
      this.modalState.etapa = 1;

      // Criar HTML do modal - Etapa 1: Escolha do tipo
      var modalHTML = this.generateModalEscolhaTipo(negocioNome);

      // Adicionar modal ao body
      var modalContainer = document.createElement('div');
      modalContainer.id = 'modal-finalizar-negocio';
      modalContainer.innerHTML = modalHTML;
      document.body.appendChild(modalContainer);

      // Adicionar event listeners
      this.addModalEventListeners();
    },

    /**
     * Gerar HTML do modal - Etapa 1: Escolha do tipo
     */
    generateModalEscolhaTipo: function (negocioNome) {
      return `
    <!-- Modal Overlay -->
    <div class="fixed inset-0 bg-gray-800 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center" id="modal-overlay">
      <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 xl:w-2/5 shadow-lg rounded-md bg-white">
        
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">
            <svg class="w-5 h-5 text-orange-500 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            Finalizar Negócio
          </h3>
          <button type="button" class="text-gray-400 hover:text-gray-600 transition-colors" onclick="window.negociosModule.fecharModal()">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <!-- Body -->
        <div class="p-6">
          <!-- Nome do negócio -->
          <div class="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
            <p class="text-sm text-orange-800">
              <strong>Negócio:</strong> ${negocioNome || 'Não informado'}
            </p>
          </div>
          
          <!-- Pergunta -->
          <div class="mb-6">
            <h4 class="text-lg font-medium text-gray-900 mb-4">Como você deseja finalizar este negócio?</h4>
            
            <!-- Opção Descartar -->
            <div class="mb-4 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors" onclick="window.negociosModule.selecionarTipo('descartar')">
              <label class="cursor-pointer flex items-start">
                <input type="radio" name="tipo_finalizacao" value="descartar" class="mt-1 mr-3">
                <div>
                  <div class="font-medium text-gray-900">Descartar</div>
                  <div class="text-sm text-gray-600 mt-1">
                    É feito quando o imóvel não está dentro de algum dos parâmetros de política da empresa.
                  </div>
                </div>
              </label>
            </div>
            
            <!-- Opção Perder -->
            <div class="mb-4 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors" onclick="window.negociosModule.selecionarTipo('perder')">
              <label class="cursor-pointer flex items-start">
                <input type="radio" name="tipo_finalizacao" value="perder" class="mt-1 mr-3">
                <div>
                  <div class="font-medium text-gray-900">Perder</div>
                  <div class="text-sm text-gray-600 mt-1">
                    É quando o cliente não quer seguir por algum dos motivos relacionados à sua decisão.
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="flex items-center justify-end px-6 py-3 bg-gray-50 rounded-b-lg gap-4">
          <button 
            type="button"
            class="cursor-pointer px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
            onclick="window.negociosModule.fecharModal()"
          >
            Cancelar
          </button>
          
          <button 
            type="button"
            id="btn-continuar"
            class="cursor-pointer px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onclick="window.negociosModule.continuarParaMotivo()"
            disabled
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  `;
    },

    /**
     * Gerar HTML do modal - Etapa 2: Motivo e descrição
     */
    generateModalMotivoDescricao: function (negocioNome, tipo) {
      var motivos = tipo === 'descartar' ? this.motivosDescarte : this.motivosPerda;
      var motivosOptions = Object.entries(motivos)
        .map(([key, value]) => `<option value="${key}">${value}</option>`)
        .join('');
      
      var tipoLabel = tipo === 'descartar' ? 'Descarte' : 'Perda';
      var tipoColor = tipo === 'descartar' ? 'gray' : 'red';
      var statusFinal = tipo === 'descartar' ? 'descartado' : 'perdido';

      return `
    <!-- Modal Overlay -->
    <div class="fixed inset-0 bg-gray-800 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center" id="modal-overlay">
      <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 xl:w-2/5 shadow-lg rounded-md bg-white">
        
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">
            <svg class="w-5 h-5 text-${tipoColor}-500 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            ${tipoLabel} do Negócio
          </h3>
          <button type="button" class="text-gray-400 hover:text-gray-600 transition-colors" onclick="window.negociosModule.fecharModal()">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <!-- Body -->
        <div class="p-6">
          <!-- Botão Voltar -->
          <div class="mb-4">
            <button type="button" onclick="window.negociosModule.voltarParaEscolha()" class="text-sm text-gray-600 hover:text-gray-800 flex items-center">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
              </svg>
              Voltar
            </button>
          </div>
          
          <!-- Nome do negócio -->
          <div class="mb-4 p-3 bg-${tipoColor}-50 rounded-lg border border-${tipoColor}-200">
            <p class="text-sm text-${tipoColor}-800">
              <strong>Negócio a ser ${statusFinal}:</strong> ${negocioNome || 'Não informado'}
            </p>
          </div>
          
          <!-- Formulário -->
          <form id="form-motivo-descricao" onsubmit="return false;">
            
            <!-- Campo Motivo -->
            <div class="mb-4">
              <label for="motivo-select" class="block text-sm font-medium text-gray-700 mb-2">
                Motivo do ${tipoLabel} <span class="text-red-500">*</span>
              </label>
              <select 
                id="motivo-select" 
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-${tipoColor}-500 focus:border-${tipoColor}-500 text-sm"
                required
              >
                <option value="">Selecione o motivo...</option>
                ${motivosOptions}
              </select>
            </div>
            
            <!-- Campo Descrição -->
            <div class="mb-6">
              <label for="descricao-textarea" class="block text-sm font-medium text-gray-700 mb-2">
                Descrição do motivo <span class="text-red-500">*</span>
              </label>
              <textarea
                id="descricao-textarea"
                rows="4"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-${tipoColor}-500 focus:border-${tipoColor}-500 text-sm resize-y"
                placeholder="Descreva mais detalhes sobre o motivo (mínimo 50 caracteres)..."
                minlength="50"
                maxlength="500"
                required
              ></textarea>
              <p class="mt-1 text-xs text-gray-500" id="char-counter">0/50 caracteres (mínimo) | 500 restantes</p>
            </div>
            
            <!-- Mensagens de Erro/Sucesso -->
            <div id="modal-message" class="mb-4 hidden">
              <div id="modal-error" class="hidden p-3 bg-red-50 border border-red-200 rounded-lg">
                <div class="flex items-center">
                  <svg class="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                  </svg>
                  <span class="text-sm text-red-800" id="modal-error-text"></span>
                </div>
              </div>
              
              <div id="modal-success" class="hidden p-3 bg-green-50 border border-green-200 rounded-lg">
                <div class="flex items-center">
                  <svg class="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                  </svg>
                  <span class="text-sm text-green-800" id="modal-success-text"></span>
                </div>
              </div>
            </div>
            
          </form>
        </div>
        
        <!-- Footer -->
        <div class="flex items-center justify-end px-6 py-3 bg-gray-50 rounded-b-lg gap-4">
          <button 
            type="button"
            class="cursor-pointer px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${tipoColor}-500 transition-colors"
            onclick="window.negociosModule.fecharModal()"
          >
            Cancelar
          </button>
          
          <button 
            type="button"
            id="btn-finalizar-negocio"
            class="cursor-pointer px-4 py-2 text-sm font-medium text-white bg-${tipoColor}-600 border border-transparent rounded-lg hover:bg-${tipoColor}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${tipoColor}-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onclick="window.negociosModule.finalizarNegocio()"
          >
            <span id="btn-text">
              ${tipoLabel} Negócio
            </span>
            <span id="btn-loading" class="hidden">
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processando...
            </span>
          </button>
        </div>
      </div>
    </div>
  `;
    },

    /**
     * Selecionar tipo de finalização (descartar/perder)
     */
    selecionarTipo: function (tipo) {
      this.modalState.tipoFinalizacao = tipo;
      
      // Marcar radio button
      var radioButtons = document.querySelectorAll('input[name="tipo_finalizacao"]');
      radioButtons.forEach(function (radio) {
        radio.checked = radio.value === tipo;
      });
      
      // Habilitar botão Continuar
      var btnContinuar = document.getElementById('btn-continuar');
      if (btnContinuar) {
        btnContinuar.disabled = false;
      }
    },

    /**
     * Continuar para a etapa de motivo e descrição
     */
    continuarParaMotivo: function () {
      if (!this.modalState.tipoFinalizacao) {
        return;
      }

      this.modalState.etapa = 2;

      // Atualizar HTML do modal
      var modalContainer = document.getElementById('modal-finalizar-negocio');
      if (modalContainer) {
        var novoHTML = this.generateModalMotivoDescricao(
          this.modalState.currentNegocioNome, 
          this.modalState.tipoFinalizacao
        );
        modalContainer.innerHTML = novoHTML;
        
        // Adicionar event listeners novamente
        this.addModalEventListeners();
        
        // Focar no select
        setTimeout(function () {
          var selectElement = document.getElementById('motivo-select');
          if (selectElement) selectElement.focus();
        }, 100);
      }
    },

    /**
     * Voltar para a etapa de escolha
     */
    voltarParaEscolha: function () {
      this.modalState.etapa = 1;
      this.modalState.tipoFinalizacao = null;

      // Atualizar HTML do modal
      var modalContainer = document.getElementById('modal-finalizar-negocio');
      if (modalContainer) {
        var novoHTML = this.generateModalEscolhaTipo(this.modalState.currentNegocioNome);
        modalContainer.innerHTML = novoHTML;
        
        // Adicionar event listeners novamente
        this.addModalEventListeners();
      }
    },

    /**
     * Fechar modal (genérico para ambas as etapas)
     */
    fecharModal: function () {
      var modal = document.getElementById('modal-finalizar-negocio');
      if (modal) {
        modal.remove();
      }

      this.modalState.isOpen = false;
      this.modalState.currentTicketId = null;
      this.modalState.currentDealId = null;
      this.modalState.currentNegocioNome = null;
      this.modalState.loading = false;
      this.modalState.tipoFinalizacao = null;
      this.modalState.etapa = 1;
    },

    /**
     * Finalizar negócio (descartar ou perder)
     */
    finalizarNegocio: function () {
      var self = this;

      if (this.modalState.loading) return;

      // Obter valores do formulário
      var motivoSelect = document.getElementById('motivo-select');
      var descricaoTextarea = document.getElementById('descricao-textarea');

      var motivo = motivoSelect ? motivoSelect.value : '';
      var descricao = descricaoTextarea ? descricaoTextarea.value.trim() : '';

      // Validações
      if (!motivo) {
        this.showModalError('Por favor, selecione o motivo.');
        return;
      }

      if (!descricao || descricao.length < 50) {
        var caracteres = descricao ? descricao.length : 0;
        this.showModalError('A descrição deve ter no mínimo 50 caracteres. Atual: ' + caracteres + '/50');
        return;
      }

      if (!this.modalState.currentTicketId) {
        this.showModalError('ID do ticket não encontrado.');
        return;
      }

      if (!this.modalState.tipoFinalizacao) {
        this.showModalError('Tipo de finalização não definido.');
        return;
      }

      // Mostrar loading
      this.setModalLoading(true);
      this.hideModalMessages();

      // Determinar o status baseado no tipo
      var novoStatus = this.modalState.tipoFinalizacao === 'descartar' ? '1095528872' : '1095528873';
      var motivos = this.modalState.tipoFinalizacao === 'descartar' ? this.motivosDescarte : this.motivosPerda;

      // Preparar dados para N8N
      var updateData = {
        // Dados do ticket
        ticketId: this.modalState.currentTicketId,
        dealId: this.modalState.currentDealId,

        // Dados do motivo
        tipoFinalizacao: this.modalState.tipoFinalizacao,
        motivo: motivo,
        motivoLabel: motivos[motivo],
        descricao: descricao,

        // Dados adicionais para contexto
        negocioNome: this.modalState.currentNegocioNome,
        dataFinalizacao: new Date().toISOString(),
        usuarioFinalizacao: 'Portal HomeCash',

        // Status para atualizar
        novoStatus: novoStatus,

        // Dados para auditoria
        origem: 'portal_homecash',
        acao: this.modalState.tipoFinalizacao === 'descartar' ? 'descartar_negocio' : 'perder_negocio',
        timestamp: Date.now()
      };

      // console.log('📤 Enviando dados para N8N:', updateData);

      // Enviar para endpoints N8N
      Promise.all([
        this.enviarParaN8N('updateTicket', updateData),
        this.enviarParaN8N('updateDeal', updateData)
      ])
        .then(function (responses) {
          // console.log('✅ Respostas N8N:', responses);

          var ticketResponse = responses[0];
          var dealResponse = responses[1];

          if (ticketResponse.success && dealResponse.success) {
            var mensagem = self.modalState.tipoFinalizacao === 'descartar' ? 
              'Negócio descartado com sucesso!' : 
              'Negócio marcado como perdido com sucesso!';
            
            self.showModalSuccess(mensagem);

            // Fechar modal após 2 segundos
            setTimeout(function () {
              self.fecharModal();
              self.reloadTable();
            }, 2000);

          } else {
            var errorMsg = 'Erro ao processar finalização: ';
            if (!ticketResponse.success) errorMsg += 'Ticket - ' + ticketResponse.message + '. ';
            if (!dealResponse.success) errorMsg += 'Deal - ' + dealResponse.message + '.';

            self.showModalError(errorMsg);
          }
        })
        .catch(function (error) {
          console.error('❌ Erro ao finalizar negócio:', error);
          self.showModalError('Erro na comunicação com o servidor. Tente novamente.');
        })
        .finally(function () {
          self.setModalLoading(false);
        });
    },

    /**
     * Adicionar event listeners do modal
     */
    addModalEventListeners: function () {
      var self = this;

      // Fechar modal com ESC
      document.addEventListener('keydown', function modalKeyHandler(e) {
        if (e.key === 'Escape' && self.modalState.isOpen) {
          self.fecharModal();
          document.removeEventListener('keydown', modalKeyHandler);
        }
      });

      // Contador de caracteres no textarea (para etapa 2)
      var textarea = document.getElementById('descricao-textarea');
      var counter = document.getElementById('char-counter');
      if (textarea && counter) {
        textarea.addEventListener('input', function () {
          var currentLength = this.value.length;
          var remaining = 500 - currentLength;
          var minimo = 50;

          // Atualizar texto do contador
          if (currentLength < minimo) {
            counter.textContent = currentLength + '/' + minimo + ' caracteres (mínimo) | ' + remaining + ' restantes';
            counter.className = 'mt-1 text-xs font-medium text-red-500';
            // Adicionar borda vermelha ao textarea
            this.classList.remove('border-gray-300', 'border-green-500');
            this.classList.add('border-red-500');
          } else {
            counter.textContent = currentLength + '/' + minimo + ' caracteres ✓ | ' + remaining + ' restantes';
            counter.className = 'mt-1 text-xs font-medium text-green-600';
            // Adicionar borda verde ao textarea
            this.classList.remove('border-gray-300', 'border-red-500');
            this.classList.add('border-green-500');
          }

          // Alerta se estiver perto do limite máximo
          if (remaining < 50) {
            counter.className = 'mt-1 text-xs font-medium text-orange-500';
          }
        });
      }
    },


    /**
     * Enviar dados para endpoints N8N
     * @param {string} endpoint - Nome do endpoint (updateTicket, updateDeal)
     * @param {object} data - Dados para enviar
     */
    enviarParaN8N: function (endpoint, data) {
      var self = this;
      var endpointUrl = this.n8nConfig.baseUrl + this.n8nConfig.endpoints[endpoint];

      return new Promise(function (resolve, reject) {

        // console.log('🚀 Enviando para:', endpointUrl);

        fetch(endpointUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data)
        })
          .then(function (response) {
            // console.log('📡 Status da resposta:', response.status);

            if (!response.ok) {
              throw new Error('Erro HTTP: ' + response.status);
            }

            // Tentar fazer parse JSON, mas aceitar resposta vazia
            return response.text().then(function (text) {
              try {
                return text ? JSON.parse(text) : { success: true };
              } catch (e) {
                return { success: true, data: text };
              }
            });
          })
          .then(function (responseData) {
            // console.log('✅ Resposta do N8N (' + endpoint + '):', responseData);

            resolve({
              success: true,
              endpoint: endpoint,
              data: responseData
            });
          })
          .catch(function (error) {
            console.error('❌ Erro no endpoint ' + endpoint + ':', error);

            resolve({
              success: false,
              endpoint: endpoint,
              message: error.message
            });
          });
      });
    },

    /**
     * Mostrar mensagem de erro no modal
     */
    showModalError: function (message) {
      this.hideModalMessages();
      var errorDiv = document.getElementById('modal-error');
      var errorText = document.getElementById('modal-error-text');
      var messageDiv = document.getElementById('modal-message');

      if (errorDiv && errorText && messageDiv) {
        errorText.textContent = message;
        messageDiv.classList.remove('hidden');
        errorDiv.classList.remove('hidden');
      }
    },

    /**
     * Mostrar mensagem de sucesso no modal
     */
    showModalSuccess: function (message) {
      this.hideModalMessages();
      var successDiv = document.getElementById('modal-success');
      var successText = document.getElementById('modal-success-text');
      var messageDiv = document.getElementById('modal-message');

      if (successDiv && successText && messageDiv) {
        successText.textContent = message;
        messageDiv.classList.remove('hidden');
        successDiv.classList.remove('hidden');
      }
    },

    /**
     * Esconder mensagens do modal
     */
    hideModalMessages: function () {
      var messageDiv = document.getElementById('modal-message');
      var errorDiv = document.getElementById('modal-error');
      var successDiv = document.getElementById('modal-success');

      if (messageDiv) messageDiv.classList.add('hidden');
      if (errorDiv) errorDiv.classList.add('hidden');
      if (successDiv) successDiv.classList.add('hidden');
    },

    /**
     * Controlar estado de loading do modal
     */
    setModalLoading: function (loading) {
      this.modalState.loading = loading;

      var btnFinalizar = document.getElementById('btn-finalizar-negocio');
      var btnText = document.getElementById('btn-text');
      var btnLoading = document.getElementById('btn-loading');

      if (btnFinalizar && btnText && btnLoading) {
        if (loading) {
          btnFinalizar.disabled = true;
          btnText.classList.add('hidden');
          btnLoading.classList.remove('hidden');
        } else {
          btnFinalizar.disabled = false;
          btnText.classList.remove('hidden');
          btnLoading.classList.add('hidden');
        }
      }
    },


  };

  // Expor o módulo globalmente
  window.negociosModule = module;

  // ✅ EXPOR TAMBÉM NO window.negocios PARA COMPATIBILIDADE COM HTML
  window.negocios = module;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      module.init();
    });
  } else {
    module.init();
  }

})();