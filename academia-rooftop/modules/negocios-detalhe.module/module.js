// Módulo de Detalhes do Negócio - HomeCash Rooftop
(function() {
  'use strict';
  
  console.log('v2.0.0')

  var module = {
    selectedPhotoFiles: null,
    modalPhotos: [],
    currentModalPhotoIndex: 0,
    isDocumentosComplementaresCreated: false,

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

    // Helper function para mostrar toasts
    showToast: function(message, type) {
      var backgroundColor = '#10b981'; // success (green)
      var className = 'toastify-success';
      
      if (type === 'error') {
        backgroundColor = '#ef4444'; // error (red)
        className = 'toastify-error';
      } else if (type === 'warning') {
        backgroundColor = '#f59e0b'; // warning (amber)
        className = 'toastify-warning';
      } else if (type === 'info') {
        backgroundColor = '#3b82f6'; // info (blue)
        className = 'toastify-info';
      }
      
      Toastify({
        text: message,
        duration: 3000,
        gravity: "top", // top or bottom
        position: "right", // left, center or right
        stopOnFocus: true,
        className: className,
        style: {
          background: backgroundColor,
          borderRadius: "0.5rem",
          fontSize: "0.875rem",
          padding: "0.75rem 1rem"
        }
      }).showToast();
    },
    
    // Helper function para substituir confirm
    showConfirm: function(message, onConfirm, onCancel) {
      var self = this;
      var confirmModalHTML = '<div id="toast-confirm-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.5); z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 1rem;">' +
        '<div style="position: relative; background: white; border-radius: 0.5rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); max-width: 28rem; width: 100%;">' +
          '<div style="padding: 1.5rem;">' +
            '<div style="margin-bottom: 1rem;">' +
              '<h3 style="font-size: 1.125rem; font-weight: 600; color: #111827;">Confirmação</h3>' +
            '</div>' +
            '<p style="color: #4B5563; margin-bottom: 1.5rem;">' + message + '</p>' +
            '<div style="display: flex; justify-content: flex-end; gap: 0.5rem;">' +
              '<button id="toast-confirm-cancel" style="padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; color: #374151; background: white; border: 1px solid #D1D5DB; border-radius: 0.5rem; cursor: pointer;">Cancelar</button>' +
              '<button id="toast-confirm-ok" style="padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; color: white; background: #2563EB; border: none; border-radius: 0.5rem; cursor: pointer;">Confirmar</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
      
      document.body.insertAdjacentHTML('beforeend', confirmModalHTML);
      
      document.getElementById('toast-confirm-ok').addEventListener('click', function() {
        document.getElementById('toast-confirm-modal').remove();
        if (onConfirm) onConfirm();
      });
      
      document.getElementById('toast-confirm-cancel').addEventListener('click', function() {
        document.getElementById('toast-confirm-modal').remove();
        if (onCancel) onCancel();
      });
    },
    
    init: function() {
      this.container = document.querySelector('[data-module="negocioDetalheModule"]');
      if (!this.container) return;
      
      this.loadingEl = this.container.querySelector('.negocio-loading');
      this.contentEl = this.container.querySelector('.negocio-content');
      this.errorEl = this.container.querySelector('.negocio-error');
      this.notFoundEl = this.container.querySelector('.negocio-not-found');
      
      // Inicializa os caches e estados
      this.fileCache = {};
      this.documentsLoadingState = {};
      this.documentsErrorState = {};
      this.modalPhotos = [];
      this.currentPhotoIndex = 0;
      
      this.loadNegocioDetails();
    },

    loadNegocioDetails: function() {
      var self = this;
      
      this.hideAllSections();
      if (this.loadingEl) this.loadingEl.style.display = 'block';

      setTimeout(function() {
        if (window.hubspotNegocioData && window.hubspotTicketData) {
          if (!window.hubspotNegocioData.negocioId) {
            self.showNotFound();
          } else if (window.hubspotNegocioData.success && window.hubspotNegocioData.data) {
            var combinedData = {
              negocio: window.hubspotNegocioData.data,
              ticket: window.hubspotTicketData.data,
              ticketPortal: window.hubspotTicketPortalData ? window.hubspotTicketPortalData.data : null,
            };
            self.handleNegocioResponse(combinedData);
          } else {
            // Se os dados do HubSpot falharem, pode-se carregar mocks ou mostrar erro.
            // Mantendo o comportamento original de não carregar mock em produção.
            self.showError();
          }
        } else {
          self.showError();
        }
      }, 500);
    },

    handleNegocioResponse: function(data) {
      if (!data || !data.negocio) {
        this.showNotFound();
        return;
      }
      this.renderNegocioDetails(data);
    },

    renderNegocioDetails: function(data) {
      if (!this.contentEl) return;

      var self = this;
      var ticketId = data.ticket ? data.ticket.hs_object_id : null;

      // Buscar histórico de propostas se houver ticketId
      if (ticketId) {
        this.fetchPropostaHistory(ticketId)
          .then(function(historicoPropostas) {
            // Armazenar histórico no objeto data
            data.historicoPropostas = historicoPropostas;

            // Renderizar HTML com histórico
            var html = self.generateNegocioHTML(data);
            self.contentEl.innerHTML = html;
            self.hideAllSections();
            self.contentEl.style.display = 'block';

            // Inicializa a galeria de fotos após a renderização
            self.getFotosInfo(data.ticket);

            // Inicializa a lista de documentos complementares
            function waitForDocuments() {
              
              if (self.isDocumentosComplementaresCreated && document.getElementById('documents-list')) {
                console.log('entrou no render')
                self.renderDocumentsList();
              } else {
                setTimeout(waitForDocuments, 300);
              }
            }
            waitForDocuments();
          });
      } else {
        // Renderizar sem histórico se não houver ticketId
        var html = this.generateNegocioHTML(data);
        this.contentEl.innerHTML = html;
        this.hideAllSections();
        this.contentEl.style.display = 'block';

        this.getFotosInfo(data.ticket);

        function waitForDocuments() {
          console.log('waiting')
          if (self.isDocumentosComplementaresCreated && document.getElementById('documents-list')) {
            self.renderDocumentsList();
          } else {
            setTimeout(waitForDocuments, 200);
          }
        }
        waitForDocuments();
      }
    },
    
    // =================================================================================
    // NOVA FUNÇÃO DE RENDERIZAÇÃO PRINCIPAL
    // =================================================================================
    generateNegocioHTML: function(data) {
        const { negocio, ticket, ticketPortal, historicoPropostas } = data;
        const ticketStatus = this.getTicketStatusInfo(ticketPortal ? ticketPortal.hs_pipeline_stage : null);
        const proponentes = this.getProponentesInfo(ticket);
        this.isDocumentosComplementaresCreated = true;
        return `
            <!-- Cabeçalho da Página -->
            <header class="mb-6">
                <div class="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <button onclick="window.history.back()" class="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors font-semibold">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
                            Voltar
                        </button>
                        <h1 class="text-3xl font-bold text-slate-900 mt-2">${negocio.dealname || 'Detalhes do Negócio'}</h1>
                        <div class="flex items-center gap-2 mt-2">
                            <div
                              class="inline-block cursor-pointer hover:opacity-80 transition-opacity"
                              data-priority-cell-header
                              data-ticket-id="${ticket ? ticket.hs_object_id : ''}"
                              data-priority="${ticket ? ticket.hs_ticket_priority : 'MEDIUM'}"
                              onclick="event.stopPropagation(); window.negocioDetalheModule.abrirEdicaoPrioridadeHeader(this, event)"
                              title="Clique para editar a prioridade"
                            >
                                ${this.getPriorityBadgeHTML(ticket ? ticket.hs_ticket_priority : null)}
                            </div>
                            <span class="badge ${ticketStatus.colorClass} text-sm">${ticketStatus.label}</span>
                        </div>
                    </div>
                    
                    <!-- <div class="flex items-center gap-3">
                        <button onclick="window.negocioDetalheModule.openRegistrarAtividade()" class="btn btn-primary">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" /></svg>
                            Registrar Atividade
                        </button>
                    </div>
                    -->  
                </div>
            </header>

            <!-- Layout Principal -->
            <main class="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 pb-10">
                
                <!-- Coluna Principal (Esquerda) -->
                <div class="lg:col-span-2 space-y-6">
                    ${this.generateProgressStepper(ticketPortal, negocio, ticket)}
                    ${this.generatePropertyCard(negocio, ticket)}
                    ${this.generateDetailsCard(negocio, ticket)}
                    ${this.generateDocumentsCard(ticket)}
                    ${this.generateOwnerAnalysisCard(ticket)}
                </div>

                <!-- Coluna Lateral (Direita) -->
                <div class="space-y-6">
                    ${this.generateContactCard(negocio)}
                    ${this.generateProponentsCard(proponentes)}
                    ${this.generateValuesApprovalCard(ticket, historicoPropostas)}
                    
                    ${this.generatePhotoCard(ticket)}
                    ${this.generateDocumentsCardFiles(ticket)}
                </div>
            </main>

            <!-- Modals (gerados dinamicamente ou estáticos) -->
            ${this.generateActivityModalHTML()}
            ${this.generatePhotoModalHTML()}
            ${this.generateSolicitarReajusteModalHTML()}
            ${this.generateUploadPhotoModalHTML()}
            ${this.generateUploadDocumentsModalHTML()}
        `;
    },

    // =================================================================================
    // FUNÇÕES GERADORAS DE COMPONENTES PARA O NOVO LAYOUT
    // =================================================================================
    
      generateProgressStepper: function(ticketPortal, negocio, ticket) {
        if (!ticketPortal || !ticketPortal.hs_pipeline_stage) return '';
        const progress = this.getFunnelProgress(ticketPortal.hs_pipeline_stage, ticketPortal);
        const steps = progress.steps;
        const currentIndex = progress.currentIndex;

        // 🔴 LOG DE DEBUG: Identificar quando currentIndex não é encontrado
        if (currentIndex < 0) {
          console.error('❌ [ERRO CRÍTICO] currentIndex não encontrado!', {
            currentStageId: ticketPortal.hs_pipeline_stage,
            steps: steps.map(s => ({ id: s.id, label: s.label, combinedIds: s.combinedIds })),
            ticketData: ticketPortal
          });

          // Fallback: Exibir mensagem de erro amigável ao usuário
          const statusInfo = this.getTicketStatusInfo(ticketPortal.hs_pipeline_stage);
          return `
            <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <div class="flex items-start">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="ml-3">
                  <h3 class="text-sm font-medium text-yellow-800">Etapa não mapeada no funil</h3>
                  <p class="mt-2 text-sm text-yellow-700">
                    A etapa atual "<strong>${statusInfo.label}</strong>" (ID: ${ticketPortal.hs_pipeline_stage}) não está mapeada corretamente no funil de progresso.
                    Entre em contato com o suporte técnico.
                  </p>
                </div>
              </div>
            </div>
          `;
        }

        // Verificar faixa de valor do imóvel para avaliação externa
        // const faixaValorRaw = negocio?.qual_a_faixa_de_valor_do_seu_imovel_;
        // const faixaValor = this.safeGetArrayValue(faixaValorRaw) || '';

        console.log('🏠 [AVALIAÇÃO EXTERNA - Progress] Campo média das amostras Q14 (raw):', ticket.valor_medio_amostras);

        // Converter valor formatado (R$ 2.000.000,01) para número
        // Primeiro remover R$ e espaços, depois converter
        const valorLimpo = ticket.valor_medio_amostras ? String(ticket.valor_medio_amostras).replace(/R\$\s*/g, '').trim() : '0';
        const valorMedioAmostrasNumero = this.parseCurrencyValue(valorLimpo);
        console.log('🏠 [AVALIAÇÃO EXTERNA - Progress] Valor médio convertido:', valorMedioAmostrasNumero);

        // Faixas que podem incluir valores acima de R$ 2.000.000
        const precisaAvaliacaoExterna = valorMedioAmostrasNumero > 2000000;
        // const precisaAvaliacaoExterna =
        //     faixaValor.includes('1 milhão a R$ 3 milhões') ||
        //     faixaValor.includes('3 milhões a R$ 6 milhões') ||
        //     faixaValor.includes('De R$ 1 milhão a R$ 3 milhões') ||
        //     faixaValor.includes('De R$ 3 milhões a R$ 6 milhões');

        console.log('🏠 [AVALIAÇÃO EXTERNA - Progress] Precisa avaliação?', precisaAvaliacaoExterna);

        // Verificar se já existe upload_do_laudo (avaliação já realizada)
        const avaliacaoJaRealizada = ticket?.upload_do_laudo && ticket.upload_do_laudo.trim() !== '';

        console.log('🏠 [AVALIAÇÃO EXTERNA - Progress] Avaliação já realizada?', avaliacaoJaRealizada);
        console.log('🏠 [AVALIAÇÃO EXTERNA - Progress] Link:', ticket?.upload_do_laudo);

        // Verificar se segunda proposta foi liberada
        const segundaPropostaLiberada = ticket?.segunda_proposta_liberada === 'Sim' || ticket?.segunda_proposta_liberada === true;

        console.log('🏠 [AVALIAÇÃO EXTERNA - Progress] Segunda proposta liberada?', segundaPropostaLiberada);
        // TODO: remover console.log do ticket
        console.log('ticketticketticket', ticketPortal)
        // ⚠️ WARN DE AVALIAÇÃO EXTERNA MOVIDO PARA O NEXTSTEPINFO
        // A lógica de exibição do warn agora está dentro da função getNextStepInfo()
        // na etapa "Avaliação externa" ao invés de no topo do progress stepper

        // Determinar se é Fluxo 2 (acima de R$2M) para renomear "Segunda proposta cliente"
        const isFluxo2 = valorMedioAmostrasNumero >= 2000000;

        const stepsHTML = steps.map((step, index) => {
            // Renomear "Segunda proposta cliente" para "Proposta Comitê Investidor" quando isFluxo2 === true
            let stepLabel = step.label;
            if (isFluxo2 && step.id === '1208820114' && step.label === 'Segunda proposta cliente') {
                stepLabel = 'Proposta Comitê Investidor';
            }
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isFuture = index > currentIndex;
            let statusClass = 'text-slate-500';
            let ringClass = 'bg-slate-100';
            let icon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1zm1 4a1 1 0 100 2h2a1 1 0 100-2H9z" clip-rule="evenodd" /></svg>`;
            let containerClass = 'opacity-60';

            // ✅ ADICIONAR CLASSES PARA CONTROLE DE VISIBILIDADE
            let visibilityClass = '';
            if (isFuture && index > currentIndex + 1) {
                // Etapas futuras além da próxima ficam ocultas inicialmente
                visibilityClass = 'future-step hidden transition-all duration-300 ease-in-out';
            }

            if (isCompleted) {
                // Verificar se há data de conclusão para determinar a cor
                const completionDate = this.getStepCompletionDate(step.id, ticketPortal, ticketPortal.hs_pipeline_stage);
                const hasCompletionDate = !!completionDate;
                console.log('hasCompletionDate', hasCompletionDate, completionDate)
                statusClass = 'text-green-700';
                ringClass = 'bg-green-100';
                if (hasCompletionDate) {
                    // Etapa com data - cor verde
                } else {
                    // Etapa sem data - cor cinza
                    statusClass = 'text-gray-600';
                    ringClass = 'bg-gray-100';
                }
                
                icon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>`;
                containerClass = '';
            } else if (isCurrent) {
                statusClass = 'text-blue-700';
                ringClass = 'bg-blue-100';
                containerClass = '';
            }

            // Gerar conteúdo baseado no status
            let content = '';
            
            if (isCompleted) {
                // Etapa concluída - mostrar data de conclusão dinâmica
                const completionDate = this.getStepCompletionDate(step.id, ticketPortal, ticketPortal.hs_pipeline_stage);
                console.log('completionDate: ', step.id , ' > ',  step.label, ' >>> VALOR:', completionDate, 'TIPO:', typeof completionDate);
                const hasCompletionDate = !!completionDate;
                const titleColor = hasCompletionDate ? 'text-green-600' : 'text-gray-600';
                // const titleColor = true ? 'text-green-600' : 'text-gray-600';
                const dateText = completionDate ? `Concluído em ${completionDate}` : 'Data de conclusão não disponível';
                content = `
                    <div class="pt-1 ml-4">
                        <p class="font-semibold ${titleColor}">${stepLabel}</p>
                        <p class="text-sm text-slate-500">${dateText}</p>
                    </div>
                `;
            } else if (isCurrent) {
                // Etapa atual - mostrar com animação e próximo passo
                const nextStepInfo = this.getNextStepInfo(stepLabel, ticketPortal);
                content = `
                    <div>
                        <p class="font-semibold text-blue-600">${stepLabel}</p>
                        <p class="text-sm text-slate-500">Você está nesta etapa.</p>
                        ${nextStepInfo ? `
                            <div class="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                <p class="text-sm font-medium text-slate-700">${stepLabel === 'Descartado' || stepLabel === 'Perdido' ? 'Motivo do descarte:' : 'Próximo passo:'}</p>
                                <p class="text-sm text-slate-500 mb-3">${nextStepInfo.description}</p>
                                ${nextStepInfo.actionButton || ''}
                            </div>
                        ` : ''}
                    </div>
                `;
            } else {
                // Etapa futura
                content = `
                    <div class="pt-1 ml-4">
                        <p class="font-semibold text-slate-800">${stepLabel}</p>
                    </div>
                `;
            }

            // Ícone com animação para etapa atual
            if (isCurrent) {
                icon = `
                    <span class="relative flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 ring-4 ring-white">
                        <span class="absolute h-3 w-3 rounded-full bg-blue-400 animate-ping"></span>
                        <span class="relative h-2 w-2 rounded-full bg-blue-600"></span>
                    </span>
                `;
            } else {
                icon = `${icon}`;
            }

            return `
                <li class="ml-6 flex items-start ${containerClass} ${visibilityClass}" data-step-index="${index}">
                    <span class="absolute -left-4 flex h-8 w-8 items-center justify-center rounded-full ${ringClass} ${statusClass} ring-4 ring-white">${icon}</span>
                    ${content}
                </li>
            `;
        }).join('');

        // ✅ VERIFICAR SE PRECISA DO BOTÃO "MOSTRAR MAIS"
        const hasFutureSteps = currentIndex < steps.length - 2; // Se há mais de 1 etapa futura
        const expandButton = hasFutureSteps ? `
            <div class="border-t border-slate-200 pt-4 text-center">
                <button id="toggle-progress-button" onclick="window.negocioDetalheModule.toggleProgressSteps()" 
                        class="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
                    <span id="progress-button-text">Mostrar próximas etapas</span>
                    <svg id="progress-button-icon" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 transition-transform duration-300" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>
        ` : '';

        return `
            <div class="card overflow-hidden">
                <div class="p-6">
                    <h2 class="text-lg font-semibold text-slate-900 mb-6">Progresso do Negócio</h2>
                    <ol class="relative border-l border-slate-200 space-y-6 ml-3" id="progress-steps-list">
                        ${stepsHTML}
                    </ol>
                </div>

                ${expandButton}
            </div>
        `;
    },

    //<!-- Overlay para o efeito de fade 
    // <div id="fade-overlay" class="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-white to-transparent pointer-events-none transition-opacity duration-300"></div>
    // -->
    
    getNextStepInfo: function(currentStepLabel, ticketPortal) {
        const stepActions = {
            'Lead inicial': {
                description: 'Agendar visita com o cliente para apresentar o produto.',
                actionButton: `
                    <button onclick="window.negocioDetalheModule.openMarcarReuniaoModal()" class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM4 7h12v9a1 1 0 01-1 1H5a1 1 0 01-1-1V7z" clip-rule="evenodd" />
                        </svg>
                        Marcar Visita (T.A)
                    </button>
                `
            },
            '1ª Visita marcada': {
                description: function(ticketData) {
                    // Buscar informações da visita se disponível
                    var ticketId = ticketData ? ticketData.hs_object_id : null;
                    var contactId = window.hubspotUserData ? window.hubspotUserData.contactId : null;

                    if (ticketId && contactId && !window.visitActivitiesData) {
                        // Buscar atividades de visita de forma assíncrona
                        window.negocioDetalheModule.fetchVisitActivities(ticketId, contactId)
                            .then(function(data) {
                                if (data) {
                                    window.visitActivitiesData = data;
                                    // Atualizar a UI com os dados da visita
                                    window.negocioDetalheModule.updateVisitInfo(data);
                                }
                            });
                    }
                    
                    return 'Confirmar que a visita foi realizada e seu resultado.';
                },
                actionButton: function(ticketData) {
                    var baseButton = `
                        <button onclick="window.negocioDetalheModule.openReuniaoRealizadaModal()" class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                            </svg>
                            Visita Realizada
                        </button>
                    `;
                    
                    // Container para informações da visita que será preenchido dinamicamente
                    return `
                        <div id="visit-activities-container" class="space-y-3">
                            <div id="visit-info-display" class="hidden">
                                <!-- Será preenchido dinamicamente -->
                            </div>
                            ${baseButton}
                        </div>
                    `;
                }
            },
            '1ª Visita realizada - Aguardando documentação': {
                description: 'Enviar documentação necessária (mínimo de 3 documentos).',
                actionButton: `
                    <div class="flex flex-col sm:flex-row gap-2">
                        <button onclick="window.negocioDetalheModule.openUploadDocumentModal()" class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-2-2zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                            </svg>
                            Enviar Documentação
                        </button>
                        <button onclick="window.negocioDetalheModule.confirmarEnvioDocumentacao()" class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-lg shadow-sm hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                            </svg>
                            Confirmar Envio
                        </button>
                    </div>
                `
            },
            'Aguardando documentos complementares': {
                description: function(ticketData) {
                    // Buscar documentos pendentes ou rejeitados
                    if (!window.negocioDetalheModule) return 'Enviar os documentos complementares solicitados pelo backoffice.';

                    const documentos = window.negocioDetalheModule.getDocumentosInfo(ticketData);
                    const pendentes = documentos.filter(doc =>
                        doc.status === 'warning' || doc.status === 'missing' || doc.status === 'under_review'
                    );

                    if (pendentes.length > 0) {
                        const listaHTML = pendentes.map(doc => {
                            const statusText = doc.status === 'warning' ? 'Rejeitado' :
                                             doc.status === 'missing' ? 'Faltando' : 'Em Análise';
                            const statusColor = doc.status === 'warning' ? 'text-red-700' :
                                              doc.status === 'missing' ? 'text-slate-600' : 'text-blue-700';

                            return `<li class="flex items-start py-1">
                                <svg class="h-4 w-4 mt-0.5 mr-2 flex-shrink-0 ${statusColor}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                                </svg>
                                <div class="flex-1">
                                    <span class="text-sm font-medium text-slate-800">${doc.nome}</span>
                                    ${doc.notes ? `<p class="text-xs ${statusColor} mt-0.5">${doc.notes}</p>` : `<span class="text-xs ${statusColor}"> - ${statusText}</span>`}
                                </div>
                            </li>`;
                        }).join('');

                        return `
                            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                                <div class="flex items-start mb-2">
                                    <svg class="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                                    </svg>
                                    <p class="text-sm font-semibold text-yellow-800">
                                        Documentos Pendentes (${pendentes.length})
                                    </p>
                                </div>
                                <ul class="space-y-1 ml-7">
                                    ${listaHTML}
                                </ul>
                            </div>
                            <p class="text-sm text-slate-600">
                                Envie ou corrija os documentos listados acima conforme solicitado pelo backoffice.
                            </p>
                        `;
                    }

                    return 'Enviar os documentos complementares solicitados pelo backoffice.';
                },
                actionButton: function(ticketData) {
                    if (!window.negocioDetalheModule) {
                        return `
                            <div class="flex flex-col sm:flex-row gap-2">
                                <button onclick="window.negocioDetalheModule.openUploadDocumentModal()" class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-yellow-600 border border-transparent rounded-lg shadow-sm hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-2-2zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                                    </svg>
                                    Enviar Documentos Complementares
                                </button>
                            </div>
                        `;
                    }

                    const documentos = window.negocioDetalheModule.getDocumentosInfo(ticketData);
                    const pendentes = documentos.filter(doc =>
                        doc.status === 'warning' || doc.status === 'missing'
                    );

                    if (pendentes.length > 0) {
                        const documentosHTML = pendentes.map(doc => {
                            const statusBadge = doc.status === 'warning' ?
                                '<span class="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">Rejeitado</span>' :
                                '<span class="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">Faltando</span>';

                            return `
                                <div class="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 hover:border-yellow-400 transition-colors">
                                    <div class="flex-1 min-w-0 mr-3">
                                        <div class="flex items-center gap-2">
                                            <p class="text-xs font-medium text-slate-700 truncate">${doc.nome}</p>
                                            ${statusBadge}
                                        </div>
                                        ${doc.notes ? `<p class="text-xs text-amber-600 mt-0.5 line-clamp-2">${doc.notes}</p>` : ''}
                                    </div>
                                    <button onclick="window.negocioDetalheModule.uploadDocument('${doc.id}')"
                                            class="flex-shrink-0 inline-flex items-center px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-300 rounded hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-500">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                            <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-2-2zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                                        </svg>
                                        Upload
                                    </button>
                                </div>
                            `;
                        }).join('');

                        return `
                            <div class="space-y-2">
                                <p class="text-xs font-medium text-slate-600 mb-2">Documentos que precisam de atenção:</p>
                                ${documentosHTML}
                                <button onclick="window.negocioDetalheModule.confirmarDocumentosComplementares()"
                                        class="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-yellow-600 border border-transparent rounded-lg shadow-sm hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 mt-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                    </svg>
                                    Confirmar Envio de Todos os Documentos
                                </button>
                            </div>
                        `;
                    }

                    return `
                        <div class="flex flex-col gap-2">
                            <button onclick="window.negocioDetalheModule.openUploadDocumentModal()" class="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-yellow-600 border border-transparent rounded-lg shadow-sm hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-2-2zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                                </svg>
                                Enviar Documentos Complementares
                            </button>
                            <button onclick="window.negocioDetalheModule.confirmarDocumentosComplementares()" class="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-yellow-700 bg-white border border-yellow-300 rounded-lg shadow-sm hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                </svg>
                                Confirmar Envio
                            </button>
                        </div>
                    `;
                }
            },
            'Avaliação externa': {
                description: function(ticketData) {
                    try {
                        console.log('TicketData >> ', ticketData);

                        // 🛡️ VALIDAÇÃO SEGURA: Verificar se a avaliação já foi realizada (tem link do laudo)
                        const avaliacaoJaRealizada = ticketData?.upload_do_laudo &&
                                                     typeof ticketData.upload_do_laudo === 'string' &&
                                                     ticketData.upload_do_laudo.trim() !== '';

                        // 🛡️ VALIDAÇÃO SEGURA: Verificar se a avaliação foi solicitada
                        let avaliacaoSolicitada = false;

                        if (ticketData?.solicitar_avaliacao_externa) {
                            // Verificar se é array e tem elementos
                            if (Array.isArray(ticketData.solicitar_avaliacao_externa) && ticketData.solicitar_avaliacao_externa.length > 0) {
                                avaliacaoSolicitada = ticketData.solicitar_avaliacao_externa[0] === 'Sim' ||
                                                     ticketData.solicitar_avaliacao_externa[0] === true;
                            }
                            // Se não for array, verificar diretamente o valor
                            else if (typeof ticketData.solicitar_avaliacao_externa === 'string' ||
                                     typeof ticketData.solicitar_avaliacao_externa === 'boolean') {
                                avaliacaoSolicitada = ticketData.solicitar_avaliacao_externa === 'Sim' ||
                                                     ticketData.solicitar_avaliacao_externa === true;
                            }
                        }

                        // Converter e verificar se precisa de avaliação externa
                        const valorLimpo = ticketData?.valor_medio_amostras ? String(ticketData.valor_medio_amostras).replace(/R\$\s*/g, '').trim() : '0';
                        const valorMedioAmostrasNumero = window.negocioDetalheModule?.parseCurrencyValue(valorLimpo) || 0;
                        const precisaAvaliacaoExterna = valorMedioAmostrasNumero >= 2000000;

                        // Caso 1: Avaliação já realizada (tem laudo)
                        if (avaliacaoJaRealizada) {
                            return `
                                <div class="bg-green-50 border border-green-200 rounded-lg p-3">
                                    <div class="flex items-start">
                                        <svg class="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                                        </svg>
                                        <div class="flex-1">
                                            <p class="text-sm font-semibold text-green-800">Avaliação Externa Concluída</p>
                                            <p class="text-sm text-green-700 mt-1">
                                                A avaliação externa do imóvel foi realizada. O laudo está disponível para consulta.
                                            </p>
                                            <p class="text-sm text-green-700 mt-1">
                                                Nosso time está trabalhando para liberar a proposta para consulta.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }

                        // Caso 2: Avaliação solicitada mas ainda sem laudo (em progresso)
                        if (avaliacaoSolicitada && !avaliacaoJaRealizada) {
                            return `
                                <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <div class="flex items-start">
                                        <svg class="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5 animate-spin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
                                        </svg>
                                        <div class="flex-1">
                                            <p class="text-sm font-semibold text-blue-800">Avaliação Externa em Progresso</p>
                                            <p class="text-sm text-blue-700 mt-1">
                                                A solicitação de avaliação externa foi realizada. Em breve você será notificado quando ela for concluída.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }

                        // Caso 3: Precisa de avaliação mas ainda não foi solicitada
                        if (precisaAvaliacaoExterna) {
                            let mensagemFaixa = '';
                            if (valorMedioAmostrasNumero > 3000000) {
                                mensagemFaixa = 'Este imóvel está na faixa de <strong>R$ 3 milhões a R$ 6 milhões</strong> e requer avaliação externa obrigatória.';
                            } else if (valorMedioAmostrasNumero > 2000000) {
                                mensagemFaixa = 'Imóveis com valor superior a <strong>R$ 2.000.000,00</strong> nesta faixa requerem avaliação externa obrigatória.';
                            } else {
                                mensagemFaixa = 'Este imóvel pode requerer avaliação externa obrigatória por causa do valor médio das amostras.';
                            }

                            return `
                                <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                    <div class="flex items-start">
                                        <svg class="h-5 w-5 text-amber-600 mr-2 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                                        </svg>
                                        <div class="flex-1">
                                            <p class="text-sm font-semibold text-amber-800">Avaliação Externa Necessária</p>
                                            <p class="text-sm text-amber-700 mt-1">
                                                ${mensagemFaixa}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }

                        // Caso padrão: não precisa de avaliação externa
                        return 'Solicitar avaliação externa do imóvel, se necessário.';

                    } catch (error) {
                        console.error('❌ [ERRO] Erro ao processar descrição da Avaliação Externa:', error);
                        return 'Erro ao carregar informações da avaliação externa. Entre em contato com o suporte.';
                    }
                },
                actionButton: function(ticketData) {
                    try {
                        console.log('ticketData', ticketData);

                        // 🛡️ VALIDAÇÃO SEGURA: Verificar se a avaliação já foi realizada (tem link do laudo)
                        const avaliacaoJaRealizada = ticketData?.upload_do_laudo &&
                                                     typeof ticketData.upload_do_laudo === 'string' &&
                                                     ticketData.upload_do_laudo.trim() !== '';

                        // 🛡️ VALIDAÇÃO SEGURA: Verificar se a avaliação foi solicitada
                        let avaliacaoSolicitada = false;

                        if (ticketData?.solicitar_avaliacao_externa) {
                            // Verificar se é array e tem elementos
                            if (Array.isArray(ticketData.solicitar_avaliacao_externa) && ticketData.solicitar_avaliacao_externa.length > 0) {
                                avaliacaoSolicitada = ticketData.solicitar_avaliacao_externa[0] === 'Sim' ||
                                                     ticketData.solicitar_avaliacao_externa[0] === true;
                            }
                            // Se não for array, verificar diretamente o valor
                            else if (typeof ticketData.solicitar_avaliacao_externa === 'string' ||
                                     typeof ticketData.solicitar_avaliacao_externa === 'boolean') {
                                avaliacaoSolicitada = ticketData.solicitar_avaliacao_externa === 'Sim' ||
                                                     ticketData.solicitar_avaliacao_externa === true;
                            }
                        }
                        // console.log('avaliacaoSolicitada', avaliacaoSolicitada)
                        // Caso 1: Avaliação já realizada - mostrar botão para baixar laudo
                        // if (avaliacaoJaRealizada) {
                        //     return `
                        //         <button onclick="window.negocioDetalheModule.downloadAvaliacaoExterna()" class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                        //             <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        //                 <path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clip-rule="evenodd" />
                        //             </svg>
                        //             Baixar Laudo de Avaliação
                        //         </button>
                        //     `;
                        // }

                        if (!avaliacaoSolicitada && !avaliacaoJaRealizada) {
                            return `
                                <button onclick="window.negocioDetalheModule.openSolicitarAvaliacao()" class="mt-2 inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-lg shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                                    </svg>
                                    Solicitar Avaliação Externa
                                </button>
                            `;
                        }

                        // Caso 2: Avaliação solicitada mas pendente - não mostrar botão
                        // if (avaliacaoSolicitada && !avaliacaoJaRealizada) {
                        return ''; // Sem botão - só a mensagem de progresso
                        // }

                        // Caso 3: Avaliação não solicitada - mostrar botão de solicitar

                    } catch (error) {
                        console.error('❌ [ERRO] Erro ao processar actionButton da Avaliação Externa:', error);
                        return '';
                    }
                }
            },
            'Proposta disponivel para apresentação': {
                description: function(ticketData) {
                    // Verificar valor médio das amostras
                    const valorLimpo = ticketData?.valor_medio_amostras ? String(ticketData.valor_medio_amostras).replace(/R\$\s*/g, '').trim() : '0';
                    const valorMedioAmostrasNumero = window.negocioDetalheModule?.parseCurrencyValue(valorLimpo) || 0;

                    if (valorMedioAmostrasNumero >= 2000000) {
                        // Verificar se já tem laudo presente (avaliação realizada)
                        const avaliacaoJaRealizada = ticketData?.upload_do_laudo && typeof ticketData.upload_do_laudo === 'string' && ticketData.upload_do_laudo.trim() !== '';

                        if (avaliacaoJaRealizada) {
                            return 'Laudo de avaliação externa recebido. Agendar 2ª reunião para apresentação da proposta ao cliente.';
                        }

                        return 'Imóveis acima de R$ 2.000.000 requerem avaliação externa antes da apresentação da proposta.';
                    }

                    return 'Agendar 2ª reunião para apresentação da proposta ao cliente.';
                },
                actionButton: function(ticketData) {
                    // Verificar valor médio das amostras
                    const valorLimpo = ticketData?.valor_medio_amostras ? String(ticketData.valor_medio_amostras).replace(/R\$\s*/g, '').trim() : '0';
                    const valorMedioAmostrasNumero = window.negocioDetalheModule?.parseCurrencyValue(valorLimpo) || 0;

                    console.log('🔍 [Proposta Disponível] Valor médio:', valorMedioAmostrasNumero);

                    // CENÁRIO A: valor >= R$ 2.000.000
                    if (valorMedioAmostrasNumero >= 2000000) {
                        // Verificar se avaliação já foi realizada (laudo presente)
                        const avaliacaoJaRealizada = ticketData?.upload_do_laudo && typeof ticketData.upload_do_laudo === 'string' && ticketData.upload_do_laudo.trim() !== '';

                        // Se laudo já está presente, mostrar botão de Agendar 2ª Visita
                        if (avaliacaoJaRealizada) {
                            return `
                                <button onclick="window.negocioDetalheModule.openMarcar2aReuniaoModal()" class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM4 7h12v9a1 1 0 01-1 1H5a1 1 0 01-1-1V7z" clip-rule="evenodd" />
                                    </svg>
                                    Agendar 2ª Visita
                                </button>
                            `;
                        }

                        // Verificar se avaliação já foi solicitada
                        let avaliacaoSolicitada = false;
                        if (ticketData?.solicitar_avaliacao_externa) {
                            if (Array.isArray(ticketData.solicitar_avaliacao_externa) && ticketData.solicitar_avaliacao_externa.length > 0) {
                                avaliacaoSolicitada = ticketData.solicitar_avaliacao_externa[0] === 'Sim' || ticketData.solicitar_avaliacao_externa[0] === true;
                            } else if (typeof ticketData.solicitar_avaliacao_externa === 'string' || typeof ticketData.solicitar_avaliacao_externa === 'boolean') {
                                avaliacaoSolicitada = ticketData.solicitar_avaliacao_externa === 'Sim' || ticketData.solicitar_avaliacao_externa === true;
                            }
                        }

                        // Se não foi solicitada e não tem laudo, mostrar botão de Solicitar Avaliação Externa
                        if (!avaliacaoSolicitada) {
                            return `
                                <button onclick="window.negocioDetalheModule.openSolicitarAvaliacao()" class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-lg shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                                    </svg>
                                    Solicitar Avaliação Externa
                                </button>
                            `;
                        }

                        // Se já foi solicitada mas ainda não tem laudo, não mostrar botão
                        return '';
                    }

                    // CENÁRIO B: valor < R$ 2.000.000 - Mostrar botão de Agendar 2ª Visita
                    return `
                        <button onclick="window.negocioDetalheModule.openMarcar2aReuniaoModal()" class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM4 7h12v9a1 1 0 01-1 1H5a1 1 0 01-1-1V7z" clip-rule="evenodd" />
                            </svg>
                            Agendar 2ª Visita
                        </button>
                    `;
                }
            },
            '2ª Reunião marcada': {
                description: function(ticketData) {
                    // Buscar informações da 2ª visita se disponível
                    var ticketId = ticketData ? ticketData.hs_object_id : null;
                    var contactId = window.hubspotUserData ? window.hubspotUserData.contactId : null;

                    if (ticketId && contactId && !window.visit2ActivitiesData) {
                        // Buscar atividades de 2ª visita de forma assíncrona
                        window.negocioDetalheModule.fetch2VisitMeetings(ticketId, contactId)
                            .then(function(data) {
                                if (data) {
                                    window.visit2ActivitiesData = data;
                                    // Atualizar a UI com os dados da 2ª visita
                                    window.negocioDetalheModule.update2VisitInfo(data);
                                }
                            });
                    }

                    return 'Realizar apresentação da proposta ao cliente na 2ª reunião.';
                },
                actionButton: function(ticketData) {
                    var baseButton = `
                        <button onclick="window.negocioDetalheModule.openApresentacaoRealizadaModal()" class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clip-rule="evenodd" />
                            </svg>
                            Apresentação Realizada
                        </button>
                    `;

                    // Container para informações da 2ª visita que será preenchido dinamicamente
                    return `
                        <div id="visit2-activities-container" class="space-y-3">
                            <div id="visit2-info-display" class="hidden">
                                <!-- Será preenchido dinamicamente -->
                            </div>
                            ${baseButton}
                        </div>
                    `;
                }
            },
            'Pedido de Contraproposta do cliente': {
                description: 'Solicitar Reajuste da proposta do (comitê investidor) se necessário.',
                actionButton: `
                    <button onclick="window.negocioDetalheModule.openSolicitarReajusteModal()" class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-lg shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
                        </svg>
                        Solicitar Reajuste da proposta do (comitê investidor)
                    </button>
                `
            },
            'Comitê investidor': {
                description: 'Nosso time interno está avaliando o imóvel e logo você receberá uma notificação da liebração da proposta.',
                // actionButton: `
                //     <button onclick="window.negocioDetalheModule.openSolicitarReajusteModal()" class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-lg shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
                //         <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                //             <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
                //         </svg>
                //         Solicitar Reajuste da proposta do (comitê investidor)
                //     </button>
                // `
            },
            'Segunda proposta cliente': {
                description: function(ticketData) {
                    // Verificar se é Fluxo 2 (acima de R$2M) para alterar descrição
                    if (!ticketData) return 'Segunda proposta disponível para apresentação ao cliente.';
                    const valorLimpo = ticketData?.valor_medio_amostras ? String(ticketData.valor_medio_amostras).replace(/R\$\s*/g, '').trim() : '0';
                    const valorMedioAmostrasNumero = window.negocioDetalheModule?.parseCurrencyValue(valorLimpo) || 0;
                    const isFluxo2 = valorMedioAmostrasNumero >= 2000000;
                    
                    if (isFluxo2) {
                        return 'Proposta Comitê Investidor disponível para apresentação ao cliente.';
                    }
                    return 'Segunda proposta disponível para apresentação ao cliente.';
                },
                actionButton: `
                    <button onclick="window.negocioDetalheModule.openResultadoSegundaPropostaModal()" class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clip-rule="evenodd" />
                        </svg>
                        Informar Resultado da Segunda Proposta
                    </button>
                `
            },
            'Proposta Comitê Investidor': {
                description: 'Proposta Comitê Investidor disponível para apresentação ao cliente.',
                actionButton: `
                    <button onclick="window.negocioDetalheModule.openResultadoSegundaPropostaModal()" class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clip-rule="evenodd" />
                        </svg>
                        Informar Resultado da Proposta
                    </button>
                `
            },
            'Reajuste da proposta': {
                description: function(ticketData) {
                    const segundaPropostaLiberada = ticketData?.segunda_proposta_liberada === 'Sim' || ticketData?.segunda_proposta_liberada === true;

                    if (segundaPropostaLiberada) {
                        return 'Segunda proposta disponível para apresentação ao cliente.';
                    }
                    return 'Aguarde o suporte da Rooftop entrar em contato. Caso tenha dúvidas, clique no botão abaixo.';
                },
                actionButton: function(ticketData) {
                    const segundaPropostaLiberada = ticketData?.segunda_proposta_liberada === 'Sim' || ticketData?.segunda_proposta_liberada === true;

                    if (segundaPropostaLiberada) {
                        // Comportamento similar à "Proposta disponível para apresentação"
                        return `
                            <div class="flex flex-col gap-2">
                                <button onclick="window.negocioDetalheModule.downloadProposta()" class="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
                                    </svg>
                                    Download da Segunda Proposta
                                </button>
                                <button onclick="window.negocioDetalheModule.openApresentacaoSegundaPropostaModal()" class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clip-rule="evenodd" />
                                    </svg>
                                    Informar Resultado da Apresentação
                                </button>
                            </div>
                        `;
                    }

                    // Comportamento padrão
                    return `
                        <button onclick="window.open('https://wa.me/551148587935?text=Olá! Preciso de suporte sobre o reajuste da minha proposta', '_blank')" class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd" />
                            </svg>
                            Entrar em Contato com Suporte
                        </button>
                    `;
                }
            },
            'Standby': {
                description: function(ticketData) {
                    // Buscar informações do meeting de Standby se disponível
                    var ticketId = ticketData ? ticketData.hs_object_id : null;
                    var contactId = window.hubspotUserData ? window.hubspotUserData.contactId : null;

                    if (ticketId && contactId && !window.standbyMeetingData) {
                        // Buscar meeting de standby de forma assíncrona
                        window.negocioDetalheModule.fetchStandbyMeetings(ticketId, contactId)
                            .then(function(data) {
                                if (data) {
                                    window.standbyMeetingData = data;
                                    // Atualizar a UI com os dados do meeting
                                    window.negocioDetalheModule.updateStandbyInfo(data);
                                }
                            });
                    }

                    return 'Negociação pausada aguardando novo contato do cliente.';
                },
                actionButton: function(ticketData) {
                    var baseButton = `
                        <button onclick="window.negocioDetalheModule.retomarNegociacao()" class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
                            </svg>
                            Retomar Negociação
                        </button>
                    `;

                    // Container para informações do standby que será preenchido dinamicamente
                    return `
                        <div id="standby-info-container" class="space-y-3">
                            <div id="standby-info-display" class="hidden">
                                <!-- Será preenchido dinamicamente -->
                            </div>
                            ${baseButton}
                        </div>
                    `;
                }
            },
            'Descartado': {
                description: function(ticketData) {
                    var self = window.negocioDetalheModule;
                    const motivoCodigo = ticketData?.motivo_do_descarte;
                    const motivoDetalhado = ticketData?.detalhe_o_motivo_do_descarte;

                    // Obter label do motivo selecionado
                    const motivoLabel = self.getMotivoDescarteLabel(motivoCodigo);

                    // Formatar: Motivo + Descrição
                    var descricao = '';
                    if (motivoLabel) {
                        descricao = '<strong>Motivo:</strong> ' + motivoLabel;
                    }
                    if (motivoDetalhado) {
                        descricao += motivoLabel ? '<br><br><strong>Detalhes:</strong> ' + motivoDetalhado : motivoDetalhado;
                    }

                    return descricao || 'Motivo não informado.';
                },
                actionButton: `
                    <button onclick="window.open('https://wa.me/551148587935?text=Olá! Preciso de suporte para reabrir uma negociação descartada', '_blank')" class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd" />
                        </svg>
                        Reabrir Negociação
                    </button>
                `
            },
            'Perdido': {
                description: function(ticketData) {
                    var self = window.negocioDetalheModule;
                    const motivoCodigo = ticketData?.motivo_da_perda;
                    const motivoDetalhado = ticketData?.detalhe_o_motivo_da_perda;

                    // Obter label do motivo selecionado
                    const motivoLabel = self.getMotivoPercaLabel(motivoCodigo);

                    // Formatar: Motivo + Descrição
                    var descricao = '';
                    if (motivoLabel) {
                        descricao = '<strong>Motivo:</strong> ' + motivoLabel;
                    }
                    if (motivoDetalhado) {
                        descricao += motivoLabel ? '<br><br><strong>Detalhes:</strong> ' + motivoDetalhado : motivoDetalhado;
                    }

                    return descricao || 'Motivo não informado.';
                },
                actionButton: `
                    <button onclick="window.open('https://wa.me/551148587935?text=Olá! Preciso de suporte para reabrir uma negociação perdida', '_blank')" class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd" />
                        </svg>
                        Reabrir Negociação
                    </button>
                `
            },
            'Documentação para formalização': {
                description: function(ticketData) {
                    // Verificar se documentos foram enviados usando getDocumentosInfo
                    const docs = window.negocioDetalheModule.getDocumentosInfo(ticketData);
                    const hasDocuments = docs.some(doc => doc.fileIds && doc.fileIds.length > 0);
                    
                    return 'Envie os documentos complementares e dados do proponente para formalização.';
                    // if (hasDocuments) {
                    //     return 'Documentos recebidos. Estamos analisando a documentação para dar continuidade ao processo.';
                    // } else {
                    // }
                },
                actionButton: function(ticketData) {
                    const docs = window.negocioDetalheModule.getDocumentosInfo(ticketData);
                    const hasDocuments = docs.some(doc => doc.fileIds && doc.fileIds.length > 0);
                    
                    if (hasDocuments) {
                        // Sem botão - apenas status informativo
                        return '';
                    } else {
                        // Botão para enviar documentos
                        return `
                            <button onclick="window.negocioDetalheModule.openUploadDocumentModal()" class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-2-2zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                                </svg>
                                Enviar Documentos para Formalização
                            </button>
                        `;
                    }
                }
            }
        };
        
        const stepInfo = stepActions[currentStepLabel];
        if (!stepInfo) return null;

        // Use ticketPortal if provided, otherwise fall back to window data
        const ticketData = ticketPortal || (window.hubspotTicketPortalData ? window.hubspotTicketPortalData.data : null);

        return {
            description: typeof stepInfo.description === 'function' 
                ? stepInfo.description(ticketData) 
                : stepInfo.description,
            actionButton: typeof stepInfo.actionButton === 'function' 
                ? stepInfo.actionButton(ticketData) 
                : stepInfo.actionButton
        };
    },

    // ✅ FUNÇÃO PARA EXPANDIR/RECOLHER AS ETAPAS DO PROGRESSO
    toggleProgressSteps: function() {
        const futureSteps = document.querySelectorAll('.future-step');
        const buttonText = document.getElementById('progress-button-text');
        const buttonIcon = document.getElementById('progress-button-icon');
        // const fadeOverlay = document.getElementById('fade-overlay'); // Seleciona o overlay
        if (!futureSteps.length || !buttonText || !buttonIcon) return;
        
        // Verificar se está expandido verificando se alguma etapa futura está visível
        const isExpanded = !futureSteps[0].classList.contains('hidden');
        
        futureSteps.forEach(step => {
            if (isExpanded) {
                // Recolher - ocultar etapas futuras
                step.classList.add('hidden');
                step.classList.remove('block');
                
            } else {
                // Expandir - mostrar etapas futuras
                step.classList.remove('hidden');
                step.classList.add('block');
            }
        });
        
        // Atualizar texto e ícone do botão
        if (isExpanded) {
            buttonText.textContent = 'Mostrar próximas etapas';
            buttonIcon.classList.remove('rotate-180');
            // fadeOverlay.classList.remove('opacity-0');
        } else {
            buttonText.textContent = 'Ocultar próximas etapas';
            buttonIcon.classList.add('rotate-180');
            // fadeOverlay.classList.add('opacity-0');
        }
        
        console.log('🔄 Progress steps toggled:', isExpanded ? 'collapsed' : 'expanded');
    },

    generateDetailsCard: function(negocio, ticket) {
        const priorityInfo = this.getTicketPriorityInfo(ticket ? ticket.hs_ticket_priority : null);
        const currentPriority = ticket ? ticket.hs_ticket_priority : null;
        const objetivoLabel = this.getObjetivoLabel(negocio ? negocio.qual_o_seu_principal_objetivo_ : null);
        const currentObjetivo = negocio ? negocio.qual_o_seu_principal_objetivo_ : null;

        console.log('📝 [generateDetailsCard] Prioridade atual:', currentPriority);
        console.log('📝 [generateDetailsCard] Objetivo atual:', currentObjetivo);

        // Gerar options para prioridade
        const priorityOptions = this.getEnumerationOptions().hs_ticket_priority.map(function(opt) {
            const isSelected = currentPriority === opt.value;
            return '<option value="' + opt.value + '"' + (isSelected ? ' selected' : '') + '>' + opt.label + '</option>';
        }).join('');

        // Gerar options para objetivo
        const objetivoOptions = this.getPrincipaisObjetivos().map(function(opt) {
            const isSelected = currentObjetivo === opt.value;
            return '<option value="' + opt.value + '"' + (isSelected ? ' selected' : '') + '>' + opt.label + '</option>';
        }).join('');

        return `
            <div class="card p-6" id="bloco-detalhes">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-lg font-semibold text-slate-900">Detalhes e Histórico</h2>
                    <button onclick="window.negocioDetalheModule.toggleEdit('detalhes')" class="btn btn-ghost btn-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg>
                    </button>
                </div>
                <div class="view-mode space-y-6">
                    <div><p class="text-sm font-medium text-slate-500">Prioridade</p><span class="badge ${priorityInfo.colorClass} mt-1" data-field="hs_ticket_priority">${priorityInfo.icon} ${priorityInfo.label}</span></div>
                    <div><p class="text-sm font-medium text-slate-500">História do cliente</p><p class="text-base text-slate-700 mt-1 bg-slate-50 p-3 rounded-lg border border-slate-200" data-field="historia_do_cliente">${negocio.historia_do_cliente || 'Sem histórico'}</p></div>
                    <div><p class="text-sm font-medium text-slate-500">Principal objetivo</p><p class="text-base text-slate-700 mt-1" data-field="qual_o_seu_principal_objetivo_">${objetivoLabel}</p></div>
                </div>
                <div class="edit-mode hidden space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-600 mb-1">Prioridade</label>
                        <select class="form-select" data-field="hs_ticket_priority">${priorityOptions}</select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-600 mb-1">História do cliente</label>
                        <textarea class="form-input" rows="4" data-field="historia_do_cliente">${negocio.historia_do_cliente || ''}</textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-600 mb-1">Principal objetivo</label>
                        <select class="form-select" data-field="qual_o_seu_principal_objetivo_">${objetivoOptions}</select>
                    </div>
                    <div class="flex justify-end gap-3 pt-2">
                        <button onclick="window.negocioDetalheModule.cancelEdit('detalhes')" class="btn btn-secondary">Cancelar</button>
                        <button onclick="window.negocioDetalheModule.saveEdit('detalhes')" class="btn btn-primary">Salvar</button>
                    </div>
                </div>
            </div>`;
    },
    
    generateDocumentsCard: function(ticket) {
        const documentos = this.getDocumentosInfo(ticket);
        const rowsHTML = documentos.map(doc => `
            <tr class="hover:bg-slate-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">${doc.nome}</td>
                <td class="px-6 py-4 whitespace-nowrap">${this.getDocumentStatusIcon(doc)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-center">
                    <div class="flex items-center justify-center gap-2">
                        ${doc.status === 'missing' ? 
                            `<button onclick="window.negocioDetalheModule.uploadDocument('${doc.id}')" class="btn btn-secondary btn-sm">Fazer Upload</button>` :
                            `<button class="btn btn-ghost btn-icon" title="Baixar Documento" onclick="window.negocioDetalheModule.viewDocument('${doc.id}')"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" /></svg></button>
                             <button class="btn btn-ghost btn-icon" title="Substituir Documento" onclick="window.negocioDetalheModule.uploadDocument('${doc.id}')"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd" /></svg></button>`
                        }
                    </div>
                </td>
            </tr>
        `).join('');

        return `<div class="card"><div class="p-6"><h2 class="text-lg font-semibold text-slate-900">Status dos Documentos</h2></div><div class="overflow-x-auto"><table class="min-w-full divide-y divide-slate-200"><thead class="bg-slate-50"><tr><th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Documento</th><th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th><th class="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th></tr></thead><tbody class="bg-white divide-y divide-slate-200">${rowsHTML}</tbody></table></div></div>`;
    },

    generateApprovalCard: function(ticket, historicoPropostas) {
        const resumo = this.getResumoAprovacao(ticket, historicoPropostas);

        return `
        <div class="card p-6">
            <h2 class="text-lg font-semibold text-slate-900 mb-4">Resumo da Aprovação pós comitê investidor</h2>
            
            <!-- Valores Aprovados -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div class="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p class="text-sm font-medium text-green-800">Valor Aprovado (Compra 12m)</p>
                    <p class="text-2xl font-bold text-green-700 mt-1">${resumo.valorCompra12}</p>
                </div>
                <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p class="text-sm font-medium text-blue-800">Valor Aprovado (Locação 12m)</p>
                    <p class="text-2xl font-bold text-blue-700 mt-1">${resumo.valorLocacao12}</p>
                </div>
            </div>
            
            <!-- Apresentação da Proposta -->
            <div class="mt-6">
                <div class="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-orange-800">Apresentação da Proposta</p>
                            <p class="text-xs text-orange-600 mt-1">Google Slides para apresentar ao cliente</p>
                        </div>
                        <button
                           ${resumo.linkApresentacao ? `onclick="window.open('${resumo.linkApresentacao}', '_blank')"` : 'disabled'}
                           class="inline-flex items-center px-3 py-2 text-sm font-medium ${resumo.linkApresentacao ? 'text-white bg-orange-600 hover:bg-orange-700 focus:ring-orange-500' : 'text-gray-400 bg-gray-100 cursor-not-allowed'} border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors">
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                            </svg>
                            ${resumo.linkApresentacao ? 'Abrir Apresentação' : 'Ainda não disponível'}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Histórico de Versões da Proposta -->
            ${resumo.historicoPropostas && resumo.historicoPropostas.historico && resumo.historicoPropostas.historico.length > 0 ? `
            <div class="mt-4">
                <div class="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <p class="text-xs font-medium text-slate-600 mb-2">Versões Anteriores</p>
                    <div class="flex flex-wrap gap-2">
                        ${resumo.historicoPropostas.historico.map(function(versao, index) {
                            var dataFormatada = new Date(versao.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                            return `
                            <a href="${versao.link}" target="_blank"
                               class="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-100 hover:text-slate-800 transition-colors"
                               title="Criada em ${dataFormatada}">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                                </svg>
                                Versão ${index + 1}
                            </a>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
            ` : ''}

            <!-- Comentários do Comitê -->
            <div class="mt-6 space-y-4">
                <div>
                    <p class="text-sm font-medium text-slate-500">Comentários do Comitê</p>
                    <p class="text-base text-slate-700 mt-1">${resumo.comentarios}</p>
                </div>
            </div>
            
            <!-- Espaçamento para o footer -->
            <div class="mt-6"></div>
        </div>`;
    },
    
    // generateOwnerAnalysisCard: function(ticket) {
    //     const revolutiInfo = this.getRevolutiInfo(ticket);
    //     const rowHTML = `
    //         <tr class="hover:bg-slate-50">
    //             <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">Relatório Revoluti</td>
    //             <td class="px-6 py-4 whitespace-nowrap">${this.getRevolutiStatusIcon(revolutiInfo)}</td>
    //             <td class="px-6 py-4 whitespace-nowrap text-center">
    //                 <div class="flex items-center justify-center gap-2">
    //                     ${revolutiInfo.status === 'available' ? 
    //                         `<button class="btn btn-ghost btn-icon" title="Baixar Relatório" onclick="window.negocioDetalheModule.downloadRevolutiReport()">
    //                             <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    //                                 <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
    //                             </svg>
    //                         </button>` :
    //                         `<span class="text-sm text-slate-500">Não disponível</span>`
    //                     }
    //                 </div>
    //             </td>
    //         </tr>
    //     `;
    //     return `
    //         <div class="card">
    //             <div class="p-6">
    //                 <h2 class="text-lg font-semibold text-slate-900">Análise do proprietário</h2>
    //             </div>
    //             <div class="overflow-x-auto">
    //                 <table class="min-w-full divide-y divide-slate-200">
    //                     <thead class="bg-slate-50">
    //                         <tr>
    //                             <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Documento</th>
    //                             <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
    //                             <th class="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
    //                         </tr>
    //                     </thead>
    //                     <tbody class="bg-white divide-y divide-slate-200">
    //                         ${rowHTML}
    //                     </tbody>
    //                 </table>
    //             </div>
    //         </div>`;
    // },

    generateValuesApprovalCard: function(ticket, historicoPropostas) {
      const valoresAvaliacao = this.getValoresAvaliacao(ticket);
      const resumoAprovacao = this.getResumoAprovacao(ticket, historicoPropostas);

      // Check if approved values are zero or N/A
      const valorCompra12Raw = ticket?.valor_aprovado_para_compra___12_meses || 0;
      const valorLocacao12Raw = ticket?.valor_aprovado_para_locacao___12_meses || 0;
      const isCompraZero = !valorCompra12Raw || valorCompra12Raw === 0 || resumoAprovacao.valorCompra12 === 'N/A';
      const isLocacaoZero = !valorLocacao12Raw || valorLocacao12Raw === 0 || resumoAprovacao.valorLocacao12 === 'N/A';

      // Verificar se o ticket está na etapa "Proposta disponivel para apresentação" ou posterior
      const currentStageId = ticket?.hs_pipeline_stage;
      const propostaDisponivelId = '1062003577';
      const avaliacaoExternaStageId = '1186972699';

      // Determinar se é Fluxo 2 (acima de R$2M)
      const valorLimpo = ticket?.valor_medio_amostras ? String(ticket.valor_medio_amostras).replace(/R\$\s*/g, '').trim() : '0';
      // Converter valor removendo pontos, vírgulas e espaços, mantendo apenas números
      const valorMedioAmostrasNumero = valorLimpo ? parseFloat(valorLimpo.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0 : 0;
      const isFluxo2 = valorMedioAmostrasNumero >= 2000000;

      // Verificar se valores do comitê investidor estão preenchidos
      const valoresComiteInvestidorPreenchidos = !isCompraZero && !isLocacaoZero;

      // Lógica de exibição para Fluxo 2:
      // - Se fluxo 2 E está na etapa de avaliação externa: ocultar valores do comitê interno e primeira proposta
      // - Se fluxo 2 E valores do comitê investidor preenchidos: mostrar tudo
      // - Se fluxo 2 E valores do comitê investidor NÃO preenchidos: ocultar valores e propostas
      const shouldHideComiteInternoValues = isFluxo2 && currentStageId === avaliacaoExternaStageId && !valoresComiteInvestidorPreenchidos;
      const shouldShowFluxo2Content = isFluxo2 && valoresComiteInvestidorPreenchidos;

      // Lista ordenada das etapas do funil
      const stageOrder = [
        '1095534672',
        '1095534673',
        '1095534674',
        '1043275525',
        '1043275526',
        '1095528865',
        '1204075783',
        '1043275527',
        '1062003577',
        '1186972699',
        '1062003578',
        '1208748705',
        '1208820114', // Proposta Comitê Investidor / Segunda proposta cliente
        '1095528866',
        '1095528867',
        '1095528868',
        '1095528869',
        '1095528870',
        '1095528871',
        '1206453052',
        '1095528872',
        '1095528873',
      ];

      // Encontrar índice da etapa atual e da etapa de proposta disponível
      const currentIndex = stageOrder.indexOf(currentStageId);
      const propostaIndex = stageOrder.indexOf(propostaDisponivelId);
      
      // ID da etapa "Proposta Comitê Investidor" / "Segunda proposta cliente"
      const propostaComiteInvestidorId = '1208820114';
      const propostaComiteInvestidorIndex = stageOrder.indexOf(propostaComiteInvestidorId);
      
      // Verificar se já chegou ou passou pela etapa "Proposta Comitê Investidor"
      const hasReachedPropostaComiteInvestidor = currentIndex !== -1 && propostaComiteInvestidorIndex !== -1 && currentIndex >= propostaComiteInvestidorIndex;

      // console.log('currentStageId', currentStageId)
      // console.log('currentIndex', currentIndex)
      // console.log('propostaIndex', propostaIndex)
      // Se a etapa atual está antes da "Proposta disponivel para apresentação", bloquear visualização
      const shouldBlurValues = currentIndex !== -1 && currentIndex < propostaIndex;

      // Classes CSS condicionais
      const blurClass = shouldBlurValues ? 'style="filter: blur(4px); pointer-events: none; user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none;"' : '';
      const buttonDisabledClass = shouldBlurValues ? 'disabled' : '';
      const buttonStyleClass = shouldBlurValues
        ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
        : (resumoAprovacao.linkApresentacao ? 'text-white bg-orange-600 hover:bg-orange-700 focus:ring-orange-500' : 'text-gray-400 bg-gray-100 cursor-not-allowed');

      return `
          <div class="card p-6">
              ${shouldHideComiteInternoValues ? '' : `
              <h2 class="text-lg font-semibold text-slate-900 mb-4">Valores de Avaliação pós comitê interno</h2>
              <div class="space-y-3 mb-6" ${blurClass}>
                  <div class="flex justify-between items-center py-2 border-b border-slate-100">
                      <p class="text-sm font-medium text-slate-600">Valor Avaliado</p>
                      <p class="text-base font-semibold text-slate-900">${valoresAvaliacao.valorAvaliado}</p>
                  </div>
                  <div class="flex justify-between items-center py-2 border-b border-slate-100">
                      <p class="text-sm font-medium text-slate-600">Valor de Locação</p>
                      <p class="text-base font-semibold text-slate-900">${valoresAvaliacao.valorLocacao}</p>
                  </div>
                  <div class="flex justify-between items-center py-2 border-b border-slate-100">
                      <p class="text-sm font-medium text-slate-600">Valor de Liquidez (Líquido)</p>
                      <p class="text-base font-semibold text-slate-900">${valoresAvaliacao.valorLiquidez}</p>
                  </div>
                  <div class="flex justify-between items-center py-2 border-b border-slate-100">
                      <p class="text-sm font-medium text-slate-600">Valor de Liquidez (Bruto)</p>
                      <p class="text-base font-semibold text-slate-900">${valoresAvaliacao.valorLiquidezBruto}</p>
                  </div>
              </div>

              <!-- Apresentação da Proposta -->
              ${isFluxo2 ? '' : `
              <div class="mb-6">
                  <div class="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <div class="flex flex-col gap-3">
                          <div>
                              <p class="text-sm font-medium text-orange-800">Apresentação da Proposta</p>
                              <p class="text-xs text-orange-600 mt-1">Google Slides para apresentar ao cliente</p>
                          </div>
                          <button
                             ${shouldBlurValues || !resumoAprovacao.linkApresentacao ? 'disabled' : 'onclick="window.open(\'' + (resumoAprovacao.linkApresentacao || '').replace(/'/g, "\\'") + '\', \'_blank\')"'}
                             class="inline-flex items-center justify-center px-3 py-2 text-sm font-medium ${buttonStyleClass} border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors">
                              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                              </svg>
                              ${shouldBlurValues ? 'Ainda não disponível' : (resumoAprovacao.linkApresentacao ? 'Abrir Apresentação' : 'Ainda não disponível')}
                          </button>
                      </div>
                  </div>
              </div>
              `}
              `}

              <!-- Histórico de Versões da Proposta -->
              ${!shouldHideComiteInternoValues && resumoAprovacao.historicoPropostas && resumoAprovacao.historicoPropostas.historico && resumoAprovacao.historicoPropostas.historico.length > 0 ? `
              <div class="mb-6">
                  <div class="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <p class="text-xs font-medium text-slate-600 mb-2">Versões Anteriores</p>
                      <div class="flex flex-wrap gap-2">
                          ${resumoAprovacao.historicoPropostas.historico.map(function(versao, index) {
                              var dataFormatada = new Date(versao.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                              return `
                              <a href="${versao.link}" target="_blank"
                                 class="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-100 hover:text-slate-800 transition-colors"
                                 title="Criada em ${dataFormatada}">
                                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                                  </svg>
                                  Versão ${index + 1}
                              </a>
                              `;
                          }).join('')}
                      </div>
                  </div>
              </div>
              ` : ''}

              ${(shouldHideComiteInternoValues && !shouldShowFluxo2Content) || !hasReachedPropostaComiteInvestidor ? '' : `
              <h2 class="text-lg font-semibold text-slate-900 mb-4 mt-8">Resumo da Aprovação pós comitê investidor</h2>

              <!-- Valores Aprovados -->
              <div class="grid grid-cols-1 gap-4 mb-6">
                  <div class="bg-green-50 p-4 rounded-lg border border-green-200 ${isCompraZero ? 'relative' : ''}" ${isCompraZero ? 'style="user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none;"' : ''}>
                      ${isCompraZero ? '<div class="absolute inset-0 backdrop-blur-sm bg-white/30 rounded-lg flex items-center justify-center"><p class="text-sm font-medium text-slate-600">Aguardando atualização</p></div>' : ''}
                      <p class="text-sm font-medium text-green-800">Valor Aprovado (Compra 12m)</p>
                      <p class="text-2xl font-bold text-green-700 mt-1">${resumoAprovacao.valorCompra12}</p>
                  </div>
                  <div class="bg-blue-50 p-4 rounded-lg border border-blue-200 ${isLocacaoZero ? 'relative' : ''}" ${isLocacaoZero ? 'style="user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none;"' : ''}>
                      ${isLocacaoZero ? '<div class="absolute inset-0 backdrop-blur-sm bg-white/30 rounded-lg flex items-center justify-center"><p class="text-sm font-medium text-slate-600">Aguardando atualização</p></div>' : ''}
                      <p class="text-sm font-medium text-blue-800">Valor Aprovado (Locação 12m)</p>
                      <p class="text-2xl font-bold text-blue-700 mt-1">${resumoAprovacao.valorLocacao12}</p>
                  </div>
                  <div class="bg-purple-50 p-4 rounded-lg border border-purple-200 ${isCompraZero || isLocacaoZero ? 'relative' : ''}" ${isCompraZero || isLocacaoZero ? 'style="user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none;"' : ''}>
                      ${isCompraZero || isLocacaoZero ? '<div class="absolute inset-0 backdrop-blur-sm bg-white/30 rounded-lg flex items-center justify-center"><p class="text-sm font-medium text-slate-600">Aguardando atualização</p></div>' : ''}
                      <p class="text-sm font-medium text-purple-800">Valor de Liquidez (Bruto)</p>
                      <p class="text-2xl font-bold text-purple-700 mt-1">${valoresAvaliacao.valorLiquidezBruto}</p>
                  </div>
              </div>             

              <!-- Comentários do Comitê -->
              <div class="mb-2">
                  <p class="text-sm font-medium text-slate-500 mb-2">Comentários do Comitê</p>
                  <p class="text-base text-slate-700">${resumoAprovacao.comentarios}</p>
              </div>
              `}

              <!-- Propostas para Fluxo 2 (após comitê investidor) ou Fluxo 1 normal -->
              ${shouldShowFluxo2Content && resumoAprovacao.linkPropostaFinalComite ? `
              <!-- 1ª Proposta (Fluxo 2 - mesma da 2ª) -->
              <div class="mb-6 mt-6">
                  <div class="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <div class="flex flex-col gap-3">
                          <div>
                              <p class="text-sm font-medium text-orange-800">Apresentação da Proposta</p>
                              <p class="text-xs text-orange-600 mt-1">Google Slides para apresentar ao cliente</p>
                          </div>
                          <button
                             onclick="window.open('${(resumoAprovacao.linkPropostaFinalComite || '').replace(/'/g, "\\'")}', '_blank')"
                             class="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:ring-orange-500 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors">
                              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                              </svg>
                              Abrir Apresentação
                          </button>
                      </div>
                  </div>
              </div>
              <!-- 2ª Proposta (Fluxo 2) -->
              <div class="mb-6">
                  <div class="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <div class="flex flex-col gap-3">
                          <div>
                              <p class="text-sm font-medium text-orange-800">${isFluxo2 ? 'Proposta Comitê Investidor' : 'Proposta validada pelo comite investidor'}</p>
                              <p class="text-xs text-orange-600 mt-1">Google Slides para apresentar ao cliente</p>
                          </div>
                          <button
                             onclick="window.open('${(resumoAprovacao.linkPropostaFinalComite || '').replace(/'/g, "\\'")}', '_blank')"
                             class="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-orange-700 bg-white hover:bg-orange-100 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors">
                              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                              </svg>
                              Abrir Apresentação
                          </button>
                      </div>
                  </div>
              </div>
              ` : (!isFluxo2 && resumoAprovacao.linkPropostaFinalComite ? `
              <!-- Proposta validada pelo comite investidor (Fluxo 1) -->
              <div class="mb-6 mt-6">
                  <div class="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <div class="flex flex-col gap-3">
                          <div>
                              <p class="text-sm font-medium text-orange-800">Proposta validada pelo comite investidor</p>
                              <p class="text-xs text-orange-600 mt-1">Google Slides para apresentar ao cliente</p>
                          </div>
                          <button
                             ${isCompraZero || isLocacaoZero || !resumoAprovacao.linkPropostaFinalComite ? 'disabled' : 'onclick="window.open(\'' + (resumoAprovacao.linkPropostaFinalComite || '').replace(/'/g, "\\'") + '\', \'_blank\')"'}
                             class="inline-flex items-center justify-center px-3 py-2 text-sm font-medium ${isCompraZero || isLocacaoZero || !resumoAprovacao.linkPropostaFinalComite ? 'text-slate-400 bg-slate-100 cursor-not-allowed' : 'text-orange-700 bg-white hover:bg-orange-100'} border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors">
                              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                              </svg>
                              ${isCompraZero || isLocacaoZero ? 'Aguardando atualização' : (resumoAprovacao.linkPropostaFinalComite ? 'Abrir Apresentação' : 'Ainda não disponível')}
                          </button>
                      </div>
                  </div>
              </div>
              ` : '')}
          </div>`;
    },

    generateOwnerAnalysisCard: function(ticket) {
      const revolutiInfo = this.getRevolutiInfo(ticket);
      const avaliacaoExternaInfo = this.getAvaliacaoExternaInfo(ticket);

      const rowRevolutiHTML = `
          <tr class="hover:bg-slate-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">Relatório Revoluti</td>
              <td class="px-6 py-4 whitespace-nowrap">${this.getRevolutiStatusIcon(revolutiInfo)}</td>
              <td class="px-6 py-4 whitespace-nowrap text-center">
                  <div class="flex items-center justify-center gap-2">
                      ${revolutiInfo.status === 'available' ?
                          `<button class="btn btn-ghost btn-icon" title="Baixar Relatório" onclick="window.negocioDetalheModule.downloadRevolutiReport()">
                              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-2-2zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                              </svg>
                          </button>` :
                          `<span class="text-sm text-slate-500">Não disponível</span>`
                      }
                  </div>
              </td>
          </tr>
      `;

      const rowAvaliacaoExtHTML = `
          <tr class="hover:bg-slate-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">Avaliação Externa</td>
              <td class="px-6 py-4 whitespace-nowrap">${this.getAvaliacaoExternaStatusIcon(avaliacaoExternaInfo)}</td>
              <td class="px-6 py-4 whitespace-nowrap text-center">
                  <div class="flex items-center justify-center gap-2">
                      ${
                        avaliacaoExternaInfo.status === 'available'
                          ? `<button class="btn btn-ghost btn-icon" title="Baixar Relatório" onclick="window.negocioDetalheModule.downloadAvaliacaoExterna()">
                              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-2-2zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                              </svg>
                            </button>`
                          : avaliacaoExternaInfo.status === 'link'
                            ? `<button class="btn btn-ghost btn-icon" title="Abrir Relatório" onclick="window.open('${avaliacaoExternaInfo.url}', '_blank')">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fill-rule="evenodd" d="M10 6h4a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2v-4m8-6H6a2 2 0 00-2 2v8" clip-rule="evenodd" />
                                </svg>
                              </button>`
                            : `<span class="text-sm text-slate-500">Não disponível</span>`
                      }
                  </div>
              </td>
          </tr>
      `;

      return `
          <div class="card">
              <div class="p-6">
                  <h2 class="text-lg font-semibold text-slate-900">Análises do Backoffice</h2>
              </div>
              <div class="overflow-x-auto">
                  <table class="min-w-full divide-y divide-slate-200">
                      <thead class="bg-slate-50">
                          <tr>
                              <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Documento</th>
                              <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                              <th class="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
                          </tr>
                      </thead>
                      <tbody class="bg-white divide-y divide-slate-200">
                          ${rowRevolutiHTML}
                          ${rowAvaliacaoExtHTML}
                      </tbody>
                  </table>
              </div>
          </div>`;
    },
    
    generateContactCard: function(negocio) {
        const contato = this.getContatoInfo(negocio);
        return `<div class="card p-6" id="bloco-contato"><div class="flex justify-between items-center mb-4"><h2 class="text-lg font-semibold text-slate-900">Contato</h2><button onclick="window.negocioDetalheModule.toggleEdit('contato')" class="btn btn-ghost btn-icon"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg></button></div><div class="view-mode space-y-4"><div><p class="text-sm font-medium text-slate-500">Telefone</p><p class="text-base text-slate-800 font-medium" data-field="telefone_do_contato">${contato.telefone}</p></div><div><p class="text-sm font-medium text-slate-500">E-mail</p><p class="text-base text-slate-800 font-medium" data-field="e_mail_do_contato">${contato.email}</p></div></div><div class="edit-mode hidden space-y-4"><div><label class="block text-sm font-medium text-slate-600 mb-1">Telefone</label><input type="tel" class="form-input" value="${contato.telefone}" data-field="telefone_do_contato"></div><div><label class="block text-sm font-medium text-slate-600 mb-1">E-mail</label><input type="email" class="form-input bg-slate-100 cursor-not-allowed" value="${contato.email}" disabled><p class="text-xs text-amber-600 mt-1">A alteração de e-mail deve ser solicitada ao backoffice.</p></div><div class="flex justify-end gap-3 pt-2"><button onclick="window.negocioDetalheModule.cancelEdit('contato')" class="btn btn-secondary">Cancelar</button><button onclick="window.negocioDetalheModule.saveEdit('contato')" class="btn btn-primary">Salvar</button></div></div></div>`;
    },

    generatePropertyCard: function(negocio, ticket) {
        const imovel = this.getImovelInfo(negocio, ticket);

        return `<div class="card p-6" id="bloco-imovel">
                      <div class="flex justify-between items-center mb-4">
                        <h2 class="text-lg font-semibold text-slate-900">Informações do Imóvel</h2>
                        <button onclick="window.negocioDetalheModule.toggleEdit('imovel')" class="btn btn-ghost btn-icon">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                            <path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    
                      <div class="view-mode space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <p class="text-sm font-medium text-slate-500">Tipo</p>
                            <p class="text-base text-slate-800 font-medium" data-field="tipo_de_imovel">${imovel.tipo}</p>
                          </div>
                          <div>
                            <p class="text-sm font-medium text-slate-500">Endereço</p>
                            <p class="text-base text-slate-800 font-medium" data-field="qual_o_endereco_completo_do_imovel_">${imovel.logradouro}</p>
                          </div>
                          <div>
                            <p class="text-sm font-medium text-slate-500">Número</p>
                            <p class="text-base text-slate-800 font-medium" data-field="numero">${imovel.numero}</p>
                          </div>
                          <div>
                            <p class="text-sm font-medium text-slate-500">Complemento</p>
                            <p class="text-base text-slate-800 font-medium" data-field="complemento_do_endereco">${imovel.complemento}</p>
                          </div>
                          <div>
                            <p class="text-sm font-medium text-slate-500">Cidade</p>
                            <p class="text-base text-slate-800 font-medium" data-field="em_qual_cidade_fica_localizado_o_imovel_">${imovel.cidade}</p>
                          </div>
                          <div>
                            <p class="text-sm font-medium text-slate-500">Estado</p>
                            <p class="text-base text-slate-800 font-medium" data-field="estado">${imovel.estado}</p>
                          </div>
                          <div>
                            <p class="text-sm font-medium text-slate-500">CEP</p>
                            <p class="text-base text-slate-800 font-medium" data-field="cep">${imovel.cep}</p>
                          </div>
                        </div>
                    
                        <div class="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <p class="text-sm font-medium text-blue-800">Faixa de Valor do Imóvel</p>
                          <p class="text-lg font-bold text-blue-900 mt-1" data-field="qual_a_faixa_de_valor_do_seu_imovel_">${imovel.valorFaixa}</p>
                        </div>
                    
                        <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div class="p-3 bg-green-50 rounded-lg border border-green-200">
                            <p class="text-sm font-medium text-green-800">Valor da Dívida</p>
                            <p class="text-base font-semibold text-green-900 mt-1" data-field="qual_o_valor_total_das_suas_dividas_">${imovel.valorDivida}</p>
                          </div>
                          <div class="p-3 bg-purple-50 rounded-lg border border-purple-200">
                            <p class="text-sm font-medium text-purple-800">Valor Esperado pelo Cliente</p>
                            <p class="text-base font-semibold text-purple-900 mt-1" data-field="valor_esperado_pelo_cliente">${imovel.valorEsperadoCliente}</p>
                          </div>
                          <div class="p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <p class="text-sm font-medium text-amber-800">Avaliação do Cliente</p>
                            <p class="text-base font-semibold text-amber-900 mt-1" data-field="valor_avaliacao_do_imovel_pelo_cliente">${imovel.valorAvaliacaoCliente}</p>
                          </div>
                        </div>
                      </div>
                    
                      <div class="edit-mode hidden space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <label class="block text-sm font-medium text-slate-600 mb-1">Tipo</label>
                            <select class="form-select" data-field="tipo_de_imovel">
                              <option value="Apartamento" ${imovel.tipo === 'Apartamento' ? 'selected' : ''}>Apartamento</option>
                              <option value="Apartamento Duplex" ${imovel.tipo === 'Apartamento Duplex' ? 'selected' : ''}>Apartamento Duplex</option>
                              <option value="Apartamento Cobertura" ${imovel.tipo === 'Apartamento Cobertura' ? 'selected' : ''}>Apartamento Cobertura</option>
                              <option value="Casa" ${imovel.tipo === 'Casa' ? 'selected' : ''}>Casa de Rua</option>
                              <option value="Casa em Condomínio" ${imovel.tipo === 'Casa em Condomínio' ? 'selected' : ''}>Casa em Condomínio</option>
                              <option value="Terreno" ${imovel.tipo === 'Terreno' ? 'selected' : ''}>Terreno</option>
                              <option value="Sala Comercial" ${imovel.tipo === 'Sala Comercial' ? 'selected' : ''}>Sala Comercial</option>
                            </select>
                          </div>
                          <div>
                            <label class="block text-sm font-medium text-slate-600 mb-1">Endereço</label>
                            <input type="text" class="form-input" value="${imovel.logradouro}" data-field="qual_o_endereco_completo_do_imovel_">
                          </div>
                          <div>
                            <label class="block text-sm font-medium text-slate-600 mb-1">Número</label>
                            <input type="text" class="form-input" value="${imovel.numero}" data-field="numero">
                          </div>
                          <div>
                            <label class="block text-sm font-medium text-slate-600 mb-1">Complemento</label>
                            <input type="text" class="form-input" value="${imovel.complemento}" data-field="complemento_do_endereco">
                          </div>
                          <div>
                            <label class="block text-sm font-medium text-slate-600 mb-1">Cidade</label>
                            <input type="text" class="form-input" value="${imovel.cidade}" data-field="em_qual_cidade_fica_localizado_o_imovel_">
                          </div>
                          <div>
                            <label class="block text-sm font-medium text-slate-600 mb-1">Estado</label>
                            <input type="text" class="form-input" value="${imovel.estado}" data-field="estado">
                          </div>
                          <div>
                            <label class="block text-sm font-medium text-slate-600 mb-1">CEP</label>
                            <input type="text" class="form-input" value="${imovel.cep}" data-field="cep" placeholder="00000-000">
                          </div>
                        </div>
                    
                        <div class="mt-4">
                          <label class="block text-sm font-medium text-slate-600 mb-1">Faixa de Valor</label>
                          <select class="form-select" data-field="qual_a_faixa_de_valor_do_seu_imovel_">
                            <option value="">Selecione</option>
                            <option value="Abaixo de R$ 500 mil" ${imovel.valorFaixa === 'Abaixo de R$ 500 mil' ? 'selected' : ''}>Abaixo de R$ 500 mil</option>
                            <option value="De R$ 501 mil a R$ 800 mil" ${imovel.valorFaixa === 'De R$ 501 mil a R$ 800 mil' ? 'selected' : ''}>De R$ 501 mil a R$ 800 mil</option>
                            <option value="De R$ 801 mil a R$ 1 milhão" ${imovel.valorFaixa === 'De R$ 801 mil a R$ 1 milhão' ? 'selected' : ''}>De R$ 801 mil a R$ 1 milhão</option>
                            <option value="De R$ 1 milhão a R$ 3 milhões" ${imovel.valorFaixa === 'De R$ 1 milhão a R$ 3 milhões' ? 'selected' : ''}>De R$ 1 milhão a R$ 3 milhões</option>
                            <option value="De R$ 3 milhões a R$ 6 milhões" ${imovel.valorFaixa === 'De R$ 3 milhões a R$ 6 milhões' ? 'selected' : ''}>De R$ 3 milhões a R$ 6 milhões</option>
                          </select>
                        </div>
                    
                        <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label class="block text-sm font-medium text-slate-600 mb-1">Valor da Dívida</label>
                            <input type="text" class="form-input currency-input" value="${this.parseCurrencyForEdit(ticket?.qual_o_valor_total_das_suas_dividas_)}" data-field="qual_o_valor_total_das_suas_dividas_" placeholder="R$ 0,00">
                          </div>
                          <div>
                            <label class="block text-sm font-medium text-slate-600 mb-1">Valor Esperado pelo Cliente</label>
                            <input type="text" class="form-input currency-input" value="${this.parseCurrencyForEdit(ticket?.valor_esperado_pelo_cliente)}" data-field="valor_esperado_pelo_cliente" placeholder="R$ 0,00">
                          </div>
                          <div>
                            <label class="block text-sm font-medium text-slate-600 mb-1">Avaliação do Cliente</label>
                            <input type="text" class="form-input currency-input" value="${this.parseCurrencyForEdit(ticket?.valor_avaliacao_do_imovel_pelo_cliente)}" data-field="valor_avaliacao_do_imovel_pelo_cliente" placeholder="R$ 0,00">
                          </div>
                        </div>

                        <div class="flex justify-end gap-3 pt-4">
                          <button onclick="window.negocioDetalheModule.cancelEdit('imovel')" class="btn btn-secondary">Cancelar</button>
                          <button onclick="window.negocioDetalheModule.saveEdit('imovel')" class="btn btn-primary">Salvar</button>
                        </div>
                      </div>
                    </div>`;
    },

    generateProponentsCard: function(proponentes) {
        const listItems = proponentes.map((p, index) => {
            const badgeText = p.numero === 1 ? 'Principal' : `${p.numero}º Proponente`;
            const badgeClass = p.numero === 1 ? 'badge badge-primary' : 'badge badge-gray';
            
            return `<li class="px-6 py-4 flex items-center justify-between hover:bg-slate-50">
                <div>
                    <p class="font-semibold text-slate-800">${p.nome}</p>
                    <p class="text-sm text-slate-500">CPF: ${this.formatCPF(p.cpf)}</p>
                    ${p.dataNascimento ? `<p class="text-sm text-slate-400">Nascimento: ${this.formatDate(p.dataNascimento)}</p>` : ''}
                </div>
                <span class="${badgeClass}">${badgeText}</span>
            </li>`;
        }).join('');
        
        return `<div class="card">
            <div class="p-6 flex justify-between items-center">
                <h2 class="text-lg font-semibold text-slate-900">Proponentes (${proponentes.length}/3)</h2>
                <button onclick="window.negocioDetalheModule.openAdicionarProponente()" class="btn btn-ghost btn-icon" title="Adicionar Proponente">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>
            ${proponentes.length > 0 ? `<ul class="divide-y divide-slate-200">${listItems}</ul>` : `<div class="px-6 pb-6 text-center text-slate-500">Nenhum proponente cadastrado.</div>`}
        </div>`;
    },

    generateValuationCard: function(ticket) {
        const valores = this.getValoresAvaliacao(ticket);
        return `<div class="card p-6"><h2 class="text-lg font-semibold text-slate-900 mb-4">Valores de Avaliação pós comite interno</h2><div class="space-y-4"><div class="flex justify-between"><p class="text-sm text-slate-500">Valor Avaliado</p><p class="text-sm font-semibold text-slate-800">${valores.valorAvaliado}</p></div><div class="flex justify-between"><p class="text-sm text-slate-500">Valor de Locação</p><p class="text-sm font-semibold text-slate-800">${valores.valorLocacao}</p></div><div class="flex justify-between"><p class="text-sm text-slate-500">Valor de Liquidez (Líquido)</p><p class="text-sm font-semibold text-slate-800">${valores.valorLiquidez}</p></div></div></div>`;
    },

    generatePhotoCard: function(ticket) {
        return `
            <div class="card p-6">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-lg font-semibold text-slate-900">Fotos do Imóvel</h2>
                     <div class="flex gap-2">
                      <button onclick="window.negocioDetalheModule.previousPhoto()" class="btn btn-ghost btn-icon">&lt;</button>
                      <button onclick="window.negocioDetalheModule.nextPhoto()" class="btn btn-ghost btn-icon">&gt;</button>
                     </div>
                </div>
                <div class="relative overflow-hidden">
                    <div id="photo-carousel" class="flex gap-4 transition-transform duration-300 overflow-x-auto"></div>
                </div>
                <div class="flex justify-between items-center mb-4 pt-4">
                  <div class="flex gap-2">
                        <button onclick="window.negocioDetalheModule.openUploadPhotoModal()" class="btn btn-primary btn-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
                            </svg>
                            Adicionar Fotos
                        </button>

                    </div>
                </div>
                <div class="mt-3 text-center">
                    <p class="text-sm text-slate-600 mb-2">Converta suas imagens de uma única vez para PDF</p>
                      <a href="https://imagem2pdf.rooftopfranquias.com.br" target="_blank" class="text-blue-600 hover:text-blue-800 underline text-sm font-medium">
                        Clique aqui
                      </a>
                  </div>
            </div>
        `;
    },

    generateDocumentsCardFiles: function(ticket) {
        return `
            <div class="card p-6">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-lg font-semibold text-slate-900">Documentos Complementares</h2>
                </div>
                <div id="documents-list" class="space-y-2 mb-4">
                    <!-- Lista de documentos será inserida aqui -->
                </div>
                <div class="pt-4 border-t border-slate-200">
                    <button onclick="window.negocioDetalheModule.openUploadDocumentsModal()" class="btn btn-primary btn-sm w-full">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                        </svg>
                        Adicionar Documentos
                    </button>
                </div>
            </div>
        `;
    },

    generateActivityModalHTML: function() {
        return `<div id="modal-registrar-atividade" class="fixed inset-0 bg-black/60 z-50 hidden flex items-center justify-center p-4"><div class="relative bg-white rounded-xl shadow-2xl w-full max-w-lg"><div class="flex justify-between items-center p-5 border-b border-slate-200"><h3 class="text-lg font-semibold text-slate-900">Registrar Atividade</h3><button onclick="window.negocioDetalheModule.closeRegistrarAtividade()" class="btn btn-ghost btn-icon"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button></div><form id="form-registrar-atividade" class="p-5 space-y-4"><div><label class="block text-sm font-medium text-slate-600 mb-1">Tipo</label><select id="tipo-atividade" class="form-select"><option>Ligação</option><option>E-mail</option><option>Reunião</option></select></div><div><label class="block text-sm font-medium text-slate-600 mb-1">Descrição</label><textarea id="descricao-atividade" class="form-input" rows="4"></textarea></div><div class="flex justify-end gap-3 pt-4"><button type="button" onclick="window.negocioDetalheModule.closeRegistrarAtividade()" class="btn btn-secondary">Cancelar</button><button type="submit" class="btn btn-primary">Registrar</button></div></form></div></div>`;
    },

    generatePhotoModalHTML: function() {
        return `<div id="photo-modal" class="fixed inset-0 bg-black/80 z-50 hidden items-center justify-center p-4"><div class="relative max-w-5xl max-h-full"><button onclick="window.negocioDetalheModule.closePhotoModal()" class="absolute -top-10 right-0 text-white hover:text-gray-300"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button><div id="modal-media-container" class="max-w-full max-h-full"><img id="modal-photo" src="" alt="" class="max-w-full max-h-full object-contain rounded-lg hidden"><video id="modal-video" class="max-w-full max-h-full rounded-lg hidden" controls preload="metadata"></video></div><div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 rounded-b-lg"><span id="modal-photo-type" class="badge badge-info mb-2"></span><p id="modal-photo-desc" class="text-white text-base"></p></div><button onclick="window.negocioDetalheModule.previousModalPhoto()" class="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full">&lt;</button><button onclick="window.negocioDetalheModule.nextModalPhoto()" class="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full">&gt;</button></div></div>`;
    },

    generateSolicitarReajusteModalHTML: function() {
        return `
            <div id="modal-solicitar-reajuste" class="fixed inset-0 bg-black/60 z-50 hidden flex items-center justify-center p-4">
                <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-lg">
                    <div class="flex justify-between items-center p-5 border-b border-slate-200">
                        <h3 class="text-lg font-semibold text-slate-900">Solicitar Reajuste da proposta do (comitê investidor)</h3>
                        <button onclick="window.negocioDetalheModule.closeSolicitarReajusteModal()" class="btn btn-ghost btn-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <form id="form-solicitar-reajuste" class="p-5 space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-600 mb-1">Título da Solicitação</label>
                            <input type="text" id="titulo-reajuste" class="form-input" value="Solicitação de revisão da proposta" readonly>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-600 mb-1">Justificativa <span class="text-red-500">*</span></label>
                            <textarea id="justificativa-reajuste" class="form-input" rows="4" placeholder="Descreva a justificativa para o Reajuste da proposta do (comitê investidor)..." required></textarea>
                            <p class="text-xs text-slate-500 mt-1">Explique detalhadamente os motivos que justificam a necessidade de reajuste.</p>
                        </div>
                        <div class="flex justify-end gap-3 pt-4">
                            <button type="button" onclick="window.negocioDetalheModule.closeSolicitarReajusteModal()" class="btn btn-secondary">
                                Cancelar
                            </button>
                            <button type="submit" class="btn btn-primary">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
                                </svg>
                                Solicitar Reajuste
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    },

    generateUploadPhotoModalHTML: function() {
        return `
            <div id="modal-upload-photo" class="fixed inset-0 bg-black/60 z-50 hidden flex items-center justify-center p-4">
                <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-lg">
                    <div class="flex justify-between items-center p-5 border-b border-slate-200">
                        <h3 class="text-lg font-semibold text-slate-900">Adicionar Fotos, Vídeos ou Documentos do Imóvel</h3>
                        <button onclick="window.negocioDetalheModule.closeUploadPhotoModal()" class="btn btn-ghost btn-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <form id="form-upload-photo" class="p-5 space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-600 mb-1">Tipo de Foto <span class="text-red-500">*</span></label>
                            <select id="tipo-foto" class="form-select" required>
                                <option value="">Selecione o tipo</option>
                                <option value="fachada">Foto/Video da Fachada</option>
                                <option value="interna">Fotos/Video do Imóvel (Internas)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-600 mb-1">Selecionar Arquivos</label>
                            <div id="drop-zone-photo" class="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center bg-slate-50 hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer">
                                <input type="file" id="file-input-photo" multiple accept="image/*,video/mp4,.mp4,.pdf,.doc,.docx" class="hidden">
                                <div id="drop-content-photo">
                                    <svg class="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                                    </svg>
                                    <div class="mt-4">
                                        <p class="text-sm text-slate-600">
                                            <span class="font-medium text-blue-600 hover:text-blue-500 cursor-pointer">Clique para selecionar</span> ou arraste as imagens, vídeos ou documentos aqui
                                        </p>
                                        <p class="text-xs text-slate-500 mt-1">Imagens: PNG, JPG, JPEG até 10MB cada</p>
                                        <p class="text-xs text-slate-500 mt-1">Vídeos: MP4 até 50MB</p>
                                        <p class="text-xs text-slate-500 mt-1">Documentos: PDF, DOC, DOCX até 10MB cada</p>
                                    </div>
                                </div>
                                <div id="file-list-photo" class="mt-4 text-left hidden"></div>
                            </div>
                        </div>
                        <div class="flex justify-end gap-3 pt-4">
                            <button type="button" onclick="window.negocioDetalheModule.closeUploadPhotoModal()" class="btn btn-secondary">
                                Cancelar
                            </button>
                            <button type="submit" class="btn btn-primary" disabled id="upload-btn-photo">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                                </svg>
                                Fazer Upload
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    },

    generateUploadDocumentsModalHTML: function() {
        return `
            <div id="modal-upload-documents" class="fixed inset-0 bg-black/60 z-50 hidden flex items-center justify-center p-4">
                <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-lg">
                    <div class="flex justify-between items-center p-5 border-b border-slate-200">
                        <h3 class="text-lg font-semibold text-slate-900">Adicionar Documentos Complementares</h3>
                        <button onclick="window.negocioDetalheModule.closeUploadDocumentsModal()" class="btn btn-ghost btn-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <form id="form-upload-documents" class="p-5 space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-600 mb-1">Selecionar Documentos</label>
                            <div id="drop-zone-documents" class="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center bg-slate-50 hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer">
                                <input type="file" id="file-input-documents" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.rtf,.zip,.rar" class="hidden">
                                <div id="drop-content-documents">
                                    <svg class="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                                    </svg>
                                    <div class="mt-4">
                                        <p class="text-sm text-slate-600">
                                            <span class="font-medium text-blue-600 hover:text-blue-500 cursor-pointer">Clique para selecionar</span> ou arraste os documentos aqui
                                        </p>
                                        <p class="text-xs text-slate-500 mt-1">Aceita: PDF, DOC, DOCX, XLS, XLSX, TXT, ZIP, RAR</p>
                                        <p class="text-xs text-slate-500 mt-1">Tamanho máximo: 10MB por arquivo</p>
                                    </div>
                                </div>
                                <div id="file-list-documents" class="mt-4 text-left hidden"></div>
                            </div>
                        </div>
                        <div class="flex justify-end gap-3 pt-4">
                            <button type="button" onclick="window.negocioDetalheModule.closeUploadDocumentsModal()" class="btn btn-secondary">
                                Cancelar
                            </button>
                            <button type="submit" class="btn btn-primary" disabled id="upload-btn-documents">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                                </svg>
                                Fazer Upload
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    },

    // =================================================================================
    // FUNÇÕES AUXILIARES E DE LÓGICA (MAIORIA MANTIDA DO SEU CÓDIGO ORIGINAL)
    // =================================================================================
    
    hideAllSections: function() {
      if (this.loadingEl) this.loadingEl.style.display = 'none';
      if (this.contentEl) this.contentEl.style.display = 'none';
      if (this.errorEl) this.errorEl.style.display = 'none';
      if (this.notFoundEl) this.notFoundEl.style.display = 'none';
    },
    showError: function() { this.hideAllSections(); if(this.errorEl) this.errorEl.style.display = 'block'; },
    showNotFound: function() { this.hideAllSections(); if(this.notFoundEl) this.notFoundEl.style.display = 'block'; },

    // ... (O restante das suas funções originais, como getTicketStatusInfo, getFunnelSteps, getDocumentosInfo, etc., são coladas aqui)
    // ... A seguir, a inclusão completa do restante do seu código original para garantir que nada seja perdido.

    safeGetArrayValue: function(field) {
      if (!field) return '';
      if (Array.isArray(field)) return field[0] || '';
      return field;
    },

    // Função para formatar timestamp do HubSpot para data brasileira
    formatHubSpotDate: function(hubspotTimestamp) {
      if (!hubspotTimestamp || hubspotTimestamp === '0') return null;
      try {
        const date = new Date(parseInt(hubspotTimestamp));
        if (isNaN(date.getTime())) return null;
        return date.toLocaleDateString('pt-BR', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric' 
        });
      } catch (error) {
        console.log('Erro ao formatar data:', error);
        return null;
      }
    },

    // Função para obter o nome do campo date_entered baseado no step ID
    getDateEnteredFieldName: function(stepId) {
      return 'hs_v2_date_entered_' + stepId;
    },

    // Função para obter a data de conclusão de uma etapa específica
    getStepCompletionDate: function(stepId, ticketData, currentStageId) {
      // console.log('getStepCompletionDate', stepId, ticketData);
      if (!ticketData || !stepId) return null;

      // Se currentStageId for fornecido e for diferente do stepId,
      // significa que estamos em um combinedId e devemos buscar a data dele
      const dateFieldId = currentStageId && currentStageId !== stepId ? currentStageId : stepId;

      const fieldName = this.getDateEnteredFieldName(dateFieldId);
      const timestamp = ticketData[fieldName];

      // 🔍 DEBUG: Ver o que está retornando
      console.log(`[getStepCompletionDate] stepId=${stepId}, fieldName=${fieldName}, timestamp=${timestamp}, tipo=${typeof timestamp}`);

      // return this.formatHubSpotDate(timestamp);
      return timestamp;
    },

    getTicketStatusInfo: function(hs_pipeline_stage) {
      var statusMap  = {
        '1095534672': { label: 'Lead inicial', color: 'bg-gray-100 text-gray-800' },
        '1095534673': { label: 'Visita marcada', color: 'bg-blue-100 text-blue-800' },
        '1095534674': { label: 'Visita realizada', color: 'bg-blue-100 text-blue-800' },
        '1095534675': { label: 'Aguardando documentação', color: 'bg-yellow-100 text-yellow-800' },
        '1043275525': { label: 'Documentação enviada', color: 'bg-blue-100 text-blue-800' },
        '1043275526': { label: 'Aguardando documentos complementares', color: 'bg-yellow-100 text-yellow-800' },
        '1043275527': { label: 'Pré Análise e Due Diligence', color: 'bg-purple-100 text-purple-800' },
        '1062003577': { label: 'Proposta disponivel para apresentação', color: 'bg-indigo-100 text-indigo-800' },
        '1207696559': { label: 'Proposta disponivel para apresentação - Agendar 2ª visita', color: 'bg-indigo-100 text-indigo-800' },
        '1207696560': { label: 'Proposta disponivel para apresentação - 2ª visita realizada', color: 'bg-indigo-100 text-indigo-800' },
        '1062003578': { label: 'Pedido de Contraproposta do cliente', color: 'bg-orange-100 text-orange-800' },
        '1095528865': { label: 'Avaliação do imóvel (comitê interno)', color: 'bg-purple-100 text-purple-800' },
        '1204075783': { label: 'Comitê interno', color: 'bg-teal-100 text-teal-800' }, 
        '1186972699': { label: 'Avaliação externa', color: 'bg-teal-100 text-teal-800' },
        '1208748705': { label: 'Comitê investidor', color: 'bg-orange-100 text-orange-800' },
        '1208820114': { label: 'Segunda proposta cliente', color: 'bg-orange-100 text-orange-800' },
        '1095528866': { label: 'Reajuste da proposta', color: 'bg-orange-100 text-orange-800' },
        '1095528867': { label: 'Documentação para formalização', color: 'bg-yellow-100 text-yellow-800' },
        '1095528868': { label: 'Formalização Jurídica', color: 'bg-indigo-100 text-indigo-800' },
        '1095528869': { label: 'Condicionais e Registro do imóveis', color: 'bg-purple-100 text-purple-800' },
        '1095528870': { label: 'Finalização do pagamento', color: 'bg-green-100 text-green-800' },
        '1095528871': { label: 'Em locação', color: 'bg-green-100 text-green-800' },
        '1095528872': { label: 'Descartado', color: 'bg-gray-100 text-gray-800' },
        '1095528873': { label: 'Perdido', color: 'bg-red-100 text-red-800' },
        '1206453052': { label: 'Standby', color: 'bg-amber-100 text-amber-800' },
      };
      return statusMap[hs_pipeline_stage] || { label: 'Status não identificado', colorClass: 'badge-gray' };
    },

    // TODO: Função para obter os passos do funil de negócios (pipeline de Franquias)
    getFunnelSteps: function() {
      return [
        { id: '1095534672', label: 'Lead inicial' },
        { id: '1095534673', label: '1ª Visita marcada' },
        { id: '1095534674', label: '1ª Visita realizada - Aguardando documentação', combinedIds: ['1095534674', '1095534675'] },
        { id: '1043275525', label: 'Documentação enviada' },
        { id: '1043275526', label: 'Aguardando documentos complementares' },
        { id: '1043275527', label: 'Pré Análise e Due Diligence' },
        { id: '1186972699', label: 'Avaliação externa', combinedIds: ['1186972699', '979376900'] },
        { id: '1095528865', label: 'Avaliação do imóvel (comitê interno)', combinedIds: ['1095528865', '1204075783'] },
        { id: '1062003577', label: 'Proposta disponivel para apresentação' },
        { id: '1207696559', label: '2ª Reunião marcada', combinedIds: ['1207696559' , '1207696560'] },
        { id: '1062003578', label: 'Pedido de Contraproposta do cliente' },
        { id: '1208748705', label: 'Comitê investidor' },
        { id: '1208820114', label: 'Segunda proposta cliente' },
        { id: '1095528866', label: 'Reajuste da proposta' },
        { id: '1095528867', label: 'Documentação para formalização' },
        { id: '1095528868', label: 'Formalização Jurídica' },
        { id: '1095528869', label: 'Condicionais e Registro do imóvel' },
        { id: '1095528870', label: 'Finalização do pagamento' },
        { id: '1095528871', label: 'Em locação' },
        { id: '1206453052', label: 'Standby' }, // Etapa condicional - só aparece se já passou por ela
        { id: '1095528872', label: 'Descartado' },
        { id: '1095528873', label: 'Perdido' }
      ];
    },

    getFunnelProgress: function(currentStageId, ticketPortal) {
      var allSteps = this.getFunnelSteps();

      // Verificar se a etapa atual é "Descartado" ou "Perdido"
      var isDescartadoOrPerdido = currentStageId === '1095528872' || currentStageId === '1095528873';

      if (isDescartadoOrPerdido) {
        // Se for Descartado ou Perdido, mostrar apenas essas duas etapas
        var steps = [
          { id: '1095528872', label: 'Descartado' },
          { id: '1095528873', label: 'Perdido' }
        ];
        var currentIndex = steps.findIndex(step => step.id === currentStageId);
        return { steps, currentIndex };
      } else {
        // Verificar se deve mostrar etapa Standby
        var isStandby = currentStageId === '1206453052';
        var hasPassedStandby = ticketPortal && ticketPortal.hs_v2_date_entered_1206453052;

        // Caso contrário, mostrar o funil normal (excluindo Descartado, Perdido e condicionalmente Standby)
        var steps = allSteps.filter(function(step) {
          // Sempre excluir Descartado e Perdido
          if (step.id === '1095528872' || step.id === '1095528873') return false;

          // Incluir Standby apenas se estiver nessa etapa OU já tiver passado por ela
          if (step.id === '1206453052') {
            return isStandby || hasPassedStandby;
          }

          return true;
        });
        // TODO: Corrigir logica
        // 🔄 NOVA LÓGICA DE REORDENAÇÃO DINÂMICA - Baseada em valor_medio_amostras
        if (ticketPortal) {
          // Obter valor médio das amostras do ticket associado
          const ticket = window.hubspotTicketData ? window.hubspotTicketData.data : null;

          if (ticket && ticket.valor_medio_amostras) {
            const valorLimpo = String(ticket.valor_medio_amostras).replace(/R\$\s*/g, '').trim();
            const valorMedioAmostrasNumero = this.parseCurrencyValue(valorLimpo);

            console.log('🔄 [REORDENAÇÃO] Valor médio das amostras:', valorMedioAmostrasNumero);

            // Se valor < R$ 2.000.000, mover Avaliação Externa para DEPOIS da 2ª Reunião Marcada
            if (valorMedioAmostrasNumero < 2000000) {
              console.log('🔄 [CENÁRIO < 2M] Movendo Avaliação Externa para DEPOIS da 2ª Reunião Marcada');

              // Encontrar índices
              const indexAvaliacaoExterna = steps.findIndex(step =>
                step.id === '1186972699' || step.id === '979376900' ||
                (step.combinedIds && (step.combinedIds.includes('1186972699') || step.combinedIds.includes('979376900')))
              );
              const index2aReuniaoMarcada = steps.findIndex(step =>
                step.id === '1207696559'
              );

              console.log('🔄 [REORDENAÇÃO] Índices:', {
                avaliacaoExterna: indexAvaliacaoExterna,
                reuniao2Marcada: index2aReuniaoMarcada
              });

              // Mover apenas se Avaliação Externa estiver ANTES da 2ª Reunião Marcada
              if (indexAvaliacaoExterna !== -1 && index2aReuniaoMarcada !== -1 && indexAvaliacaoExterna < index2aReuniaoMarcada) {
                const avaliacaoExternaStep = steps.splice(indexAvaliacaoExterna, 1)[0];
                steps.splice(index2aReuniaoMarcada, 0, avaliacaoExternaStep); // Inserir logo após 2ª Reunião Marcada

                console.log('✅ [CENÁRIO < 2M] Avaliação Externa movida para DEPOIS da 2ª Reunião Marcada');
                console.log('   Ordem: Pré-análise → Comitê Interno → Proposta Disponível → 2ª Reunião Marcada → Avaliação Externa');
              }
            } else {
              // Se valor >= R$ 2.000.000, manter ordem DEFAULT (já definida em getFunnelSteps)
              console.log('🔄 [CENÁRIO >= 2M] Mantendo ordem DEFAULT do funil');
              console.log('   Ordem: Pré-análise → Avaliação Externa → Comitê Interno → Proposta Disponível');
            }
          }
        }

        var currentIndex = steps.findIndex(step => {
          // Verificar se é um step com IDs combinados
          if (step.combinedIds) {
            return step.combinedIds.includes(currentStageId);
          }
          return step.id === currentStageId;
        });
        return { steps, currentIndex };
      }
    },

    getTicketPriorityInfo: function(priority) {
      var priorityMap = {
        'Baixa': { label: 'Baixa', colorClass: 'badge-gray', icon: '⬇️' },
        'Média': { label: 'Média', colorClass: 'badge-warning', icon: '➡️' },
        'Alta': { label: 'Alta', colorClass: 'badge-danger', icon: '⬆️' },
        'Urgente': { label: 'Urgente', colorClass: 'badge-danger', icon: '🚨' }
      };
      return priorityMap[priority] || { label: 'Não definida', colorClass: 'badge-gray', icon: '❓' };
    },

    getPrincipaisObjetivos: function() {
      return [
          { value: 'quero_investir_em_minha_empresa_usando_meu_imovel', label: 'Quero investir em minha empresa' },
          { value: 'quero_quitar_as_dividas_usando_meu_imovel', label: 'Quero quitar as dívidas usando meu imóvel' },
          { value: 'quero_somente_vender_meu_imovel', label: 'Quero somente vender meu imóvel' },
          { value: 'tenho_outros_objetivos_financeiros', label: 'Tenho outros objetivos financeiros' },
          { value: 'quero_comprar_imoveis_rooftop', label: 'Quero comprar imóveis Rooftop' },
          { value: 'Quero reduzir o valor da minha dívida', label: 'Quero reduzir o valor da minha dívida' },
          { value: 'Quero regularizar pendências jurídicas', label: 'Quero regularizar pendências jurídicas' }
      ];
    },
    downloadAvaliacaoExterna: function() {
      const ticket = window.hubspotTicketData ? window.hubspotTicketData.data : null;
      if (!ticket) {
          this.showToast('Dados do ticket não encontrados.', 'error');
          return;
      }

      const info = this.getAvaliacaoExternaInfo(ticket);

      if (info.status === 'available' && info.fileId) {
          this.downloadFile(info.fileId);
      } else if (info.status === 'link' && info.url) {
          window.open(info.url, '_blank');
      } else {
          this.showToast('Avaliação externa não disponível.', 'error');
      }
  },

    getObjetivoLabel: function(value) {
      var formatedValue = Array.isArray(value) ? value[0] : value;
      // Buscar por value (ex: "tenho_outros_objetivos_financeiros"), não por label
      console.log('getObjetivoLabel: ', formatedValue)
      var objetivo = this.getPrincipaisObjetivos().find(obj => obj.value === formatedValue);
      
      return objetivo ? objetivo.label : 'Não informado';
    },

    getMotivoDescarteLabel: function(value) {
      if (!value) return null;
      var formatedValue = Array.isArray(value) ? value[0] : value;
      return this.motivosDescarte[formatedValue] || formatedValue;
    },

    getMotivoPercaLabel: function(value) {
      if (!value) return null;
      var formatedValue = Array.isArray(value) ? value[0] : value;
      return this.motivosPerda[formatedValue] || formatedValue;
    },

    getEnumerationOptions: function() {
        return { 
            'hs_ticket_priority': [
                {"label":"Baixa","value":"LOW","displayOrder":0},
                {"label":"Média","value":"MEDIUM","displayOrder":1},
                {"label":"Alta","value":"HIGH","displayOrder":2},
                {"label":"Urgente","value":"URGENT","displayOrder":3}
            ],
            'qual_o_seu_principal_objetivo_': this.getPrincipaisObjetivos(),
            'tipo_de_imovel': [
                {"label":"Apartamento","value":"Apartamento","displayOrder":0},
                {"label":"Apartamento Duplex","value":"Apartamento Duplex","displayOrder":1},
                {"label":"Apartamento Cobertura","value":"Apartamento Cobertura","displayOrder":2},
                {"label":"Casa de Rua","value":"Casa","displayOrder":3},
                {"label":"Casa em Condomínio","value":"Casa em Condomínio","displayOrder":4},
                {"label":"Terreno","value":"Terreno","displayOrder":5},
                {"label":"Sala Comercial","value":"Sala Comercial","displayOrder":6}
            ]
        };
    },
    getAvaliacaoExternaInfo: function(ticket) {
      if (!ticket) return { status: 'missing', fileId: null, url: null };

      // Tente por arquivo (IDs) — ajuste o nome do campo se necessário
      const fileField = ticket.upload_do_laudo || ticket.video_da_vistoria;
      const fileIds = this.parseFileIds(fileField);

      if (fileIds && fileIds.length > 0) {
          return { status: 'available', fileId: fileIds[0], url: null };
      }

      // Tente por URL — ajuste o nome do campo se necessário
      // const url = ticket.link_avaliacao_externa || ticket.url_avaliacao_externa || null;
      // if (url) {
      //     return { status: 'link', fileId: null, url: url };
      // }

      return { status: 'missing', fileId: null, url: null };
    },

    getAvaliacaoExternaStatusIcon: function(info) {
      if (info.status === 'available' || info.status === 'link') {
          return `<span class="badge badge-success">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 inline" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              Disponível
          </span>`;
      }
      return `<span class="badge badge-gray">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 inline" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
          Não disponível
      </span>`;
    },
    
    getEnumerationLabel: function(fieldName, value) {
      if (!value) return '';
      
      var options = this.getEnumerationOptions()[fieldName];
      if (!options) return value;
      
      var option = options.find(function(opt) {
        return opt.value === value;
      });
      
      return option ? option.label : value;
    },
    
    getImovelInfo: function(negocio, ticket) {
      if (!negocio) {
        return {
          tipo: 'Não informado',
          logradouro: 'Não informado',
          complemento: 'Não informado',
          cidade: 'Não informado',
          cep: 'Não informado',
          codigoPortal: 'Não informado',
          numero: 'Não informado',
          bairro: 'Não informado',
          estado: 'Não informado',
          valorFaixa: 'Não informado',
          valorDivida: 'Não informado',
          valorEsperadoCliente: 'Não informado',
          valorAvaliacaoCliente: 'Não informado'
        };
      }
      
      return {
        tipo: this.getEnumerationLabel('tipo_de_imovel', negocio.tipo_de_imovel) || 'Não informado',
        logradouro: negocio.qual_o_endereco_completo_do_imovel_ || 'Não informado',
        complemento: negocio.complemento_do_endereco || 'Não informado',
        cidade: negocio.em_qual_cidade_fica_localizado_o_imovel_ || 'Não informado',
        cep: negocio.cep || 'Não informado',
        codigoPortal: negocio.hs_object_id || 'Não informado',
        numero: negocio.numero || 'Não informado',
        bairro: 'Não informado',
        estado: negocio.estado || 'Não informado',
        valorFaixa: this.safeGetArrayValue(negocio.qual_a_faixa_de_valor_do_seu_imovel_) || 'Não informado',
        valorDivida: this.formatCurrency(ticket?.qual_o_valor_total_das_suas_dividas_) || 'Não informado',
        valorEsperadoCliente: this.formatCurrency(ticket?.valor_esperado_pelo_cliente) || 'Não informado',
        valorAvaliacaoCliente: this.formatCurrency(ticket?.valor_avaliacao_do_imovel_pelo_cliente) || 'Não informado'
      };
    },

    getContatoInfo: function(negocio) {
      if (!negocio) return { telefone: 'N/A', email: 'N/A' };
      return {
        telefone: negocio.telefone_do_contato || 'N/A',
        email: negocio.e_mail_do_contato || 'N/A'
      };
    },

    getProponentesInfo: function(ticket) {
      if (!ticket) return [];
      const proponentes = [];
      
      // Primeiro proponente (principal)
      if (ticket.nome_do_proponente_principal) {
        proponentes.push({ 
          nome: ticket.nome_do_proponente_principal, 
          cpf: ticket.cpf_do_proponente_principal,
          dataNascimento: ticket.data_de_nascimento_do_proponente_principal,
          numero: 1
        });
      }
      
      // Segundo proponente
      if (ticket.nome_do_segundo_proponente) {
        proponentes.push({ 
          nome: ticket.nome_do_segundo_proponente, 
          cpf: ticket.cpf_do_segundo_proponente,
          dataNascimento: ticket.data_de_nascimento_do_segundo_proponente,
          numero: 2
        });
      }
      
      // Terceiro proponente
      if (ticket.nome_do_terceiro_proponente) {
        proponentes.push({ 
          nome: ticket.nome_do_terceiro_proponente, 
          cpf: ticket.cpf_do_terceiro_proponente,
          dataNascimento: ticket.data_de_nascimento_do_terceiro_proponente,
          numero: 3
        });
      }
      
      return proponentes;
    },

    getDocumentosInfo: function(ticket) {
        if (!ticket) return [];
        const docMap = [
            { id: 'iptu', nameKey: 'IPTU do Imóvel', fileKey: 'iptu_do_imovel', statusKey: 'status_iptu_do_imovel', notesKey: 'notas_iptu_do_imovel' },
            { id: 'cnd_iptu', nameKey: 'CND de IPTU', fileKey: 'cnd_iptu', statusKey: 'status_certidao_negativa_de_debitos_de_iptu', notesKey: 'notas_certidao_negativa_de_debitos_de_iptu' },
            { id: 'cpf_rg', nameKey: 'CPF/RG', fileKey: 'cpf_e_rg_do_s__proprietario_s_', statusKey: 'status_cpf_e_rg_do_s__proprietario_s_', notesKey: 'notas_cpf_e_rg_do_s__proprietario_s_' },
            { id: 'certidoes', nameKey: 'Certidão Civil', fileKey: 'certidao_de_estado_civil', statusKey: 'status_certidao_de_estado_civil', notesKey: 'notas_certidao_de_estado_civil' },
            { id: 'condominio', nameKey: 'Boleto Condomínio', fileKey: 'boleto_de_condominio', statusKey: 'status_boleto_de_condominio', notesKey: 'notas_boleto_de_condominio' },
            { id: 'matricula', nameKey: 'Matrícula', fileKey: 'matricula', statusKey: 'status_matricula', notesKey: 'notas_matricula' },
            { id: 'documentos_complementares', nameKey: 'Documentos complementares', fileKey: 'documentos_complementares', statusKey: 'documentos_complementares', notesKey: 'documentos_complementares' },
        ];
        return docMap.map(d => {
            const fileIds = this.parseFileIds(ticket[d.fileKey]);
            const statusValue = this.safeGetArrayValue(ticket[d.statusKey]);
            return {
                id: d.id,
                nome: `${d.nameKey} (${fileIds.length})`,
                status: this.getDocumentStatusFromField(statusValue, ticket[d.fileKey]),
                notes: this.safeGetArrayValue(ticket[d.notesKey]),
                fileIds: fileIds,
            };
        });
    },

    // CORREÇÃO APLICADA AQUI: Esta função agora lida com valores não-string de forma segura.
    getDocumentStatusFromField: function(statusField, fileField) {
        const hasFile = fileField && String(fileField).trim() !== '';
        if (!hasFile) {
            return 'missing';
        }
        console.log('statusField', statusField);
        // Converte o status para string para evitar o erro .trim()
        const statusString = String(statusField || '').trim();

        if (statusString === 'Aprovado') return 'approved';
        if (statusString === 'Rejeitado') return 'warning';
        
        return 'under_review';
    },

    getDocumentStatusIcon: function(doc) {
        const iconMap = {
            approved: `<span class="badge badge-success" title="${doc.notes || 'Aprovado'}">Aprovado</span>`,
            warning: `<span class="badge badge-warning" title="${doc.notes || 'Rejeitado'}">Rejeitados</span>`,
            under_review: `<span class="badge badge-info" title="${doc.notes || 'Em análise'}">Em Análise</span>`,
            missing: `<span class="badge badge-danger" title="Faltando">Faltando</span>`,
            pending: `<span class="badge badge-info" title="Pendente">Pendente</span>`,
        };
        return iconMap[doc.status] || iconMap.missing;
    },
    
    getRevolutiInfo: function(ticket) {
        if (!ticket) return { status: 'missing', fileId: null };
        
        const fileId = this.parseFileIds(ticket.anexo_relatorio_revoluti_);
        
        if (fileId && fileId.length > 0) {
            return {
                status: 'available',
                fileId: fileId[0] // Pega o primeiro arquivo se houver múltiplos
            };
        }
        
        return { status: 'missing', fileId: null };
    },
    
    getRevolutiStatusIcon: function(revolutiInfo) {
        if (revolutiInfo.status === 'available') {
            return `<span class="badge badge-success">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 inline" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                Disponível
            </span>`;
        } else {
            return `<span class="badge badge-gray">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 inline" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
                Não disponível
            </span>`;
        }
    },
    
    downloadRevolutiReport: function() {
        const ticket = window.hubspotTicketData ? window.hubspotTicketData.data : null;
        if (!ticket) {
            this.showToast('Dados do ticket não encontrados.', 'error');
            return;
        }
        
        const revolutiInfo = this.getRevolutiInfo(ticket);
        
        if (revolutiInfo.status !== 'available' || !revolutiInfo.fileId) {
            this.showToast('Relatório Revoluti não disponível.', 'error');
            return;
        }
        
        // Reutiliza a função existente de download
        this.downloadFile(revolutiInfo.fileId);
    },

    getValoresAvaliacao: function(ticket) {
        if (!ticket) return { valorAvaliado: 'N/A', valorLocacao: 'N/A', valorLiquidez: 'N/A', valorLiquidezBruto: 'N/A' };
        return {
            valorAvaliado: this.formatCurrency(ticket.valor_avaliado),
            valorLocacao: this.formatCurrency(ticket.valor_da_locacao),
            valorLiquidez: this.formatCurrency(ticket.valor_de_liquidez__para_cliente_),
            valorLiquidezBruto: this.formatCurrency(ticket.valor_de_liquidez__bruto_),
        };
    },

    getResumoAprovacao: function(ticket, historicoPropostas) {
        if (!ticket) return {
            valorCompra12: 'N/A',
            valorLocacao12: 'N/A',
            comentarios: 'N/A',
            linkApresentacao: null,
            linkPropostaFinalComite: null,
            historicoPropostas: null
        };
        return {
            valorCompra12: this.formatCurrency(ticket.valor_aprovado_para_compra___12_meses),
            valorLocacao12: this.formatCurrency(ticket.valor_aprovado_para_locacao___12_meses),
            comentarios: ticket.comentarios_comite__pendencias_e_ressalvas_ || 'N/A',
            linkApresentacao: ticket.link_da_proposta || null,
            linkPropostaFinalComite: ticket.link_da_proposta_final___comite_investidor || null,
            historicoPropostas: historicoPropostas || null
        };
    },

    getFotosInfo: function(ticket) {
      var self = this;
      if (!ticket) {
        this.updatePhotoGallery([]);
        return;
      }
      
      var loadPromises = [];
              var fachadaIds = this.parseFileIds(ticket.fotos_da_fachada);
      fachadaIds.forEach((id, i) => {
          loadPromises.push(this.loadFileFromEndpoint(id).then(file => file ? ({id: `fachada_${i}`, originalFileId: id, tipo: 'Fachada', url: file.url, desc: file.name, fileData: file}) : null));
      });

      var internasIds = this.parseFileIds(ticket.fotos_internas);
      internasIds.forEach((id, i) => {
          loadPromises.push(this.loadFileFromEndpoint(id).then(file => file ? ({id: `interna_${i}`, originalFileId: id, tipo: 'Interna', url: file.url, desc: file.name, fileData: file}) : null));
      });

      if (loadPromises.length === 0) {
          this.updatePhotoGallery([]);
          return;
      }

      this.updatePhotoGallery(Array(loadPromises.length).fill({isLoading: true}));
      
      Promise.all(loadPromises).then(results => {
          const loadedFotos = results.filter(f => f !== null);
          this.modalPhotos = loadedFotos;
          this.updatePhotoGallery(loadedFotos);
      });
    },

          updatePhotoGallery: function(fotos) {
        var self = this;
        const galleryContainer = document.getElementById('photo-carousel');
        if (!galleryContainer) return;

        if (fotos.length === 0) {
            galleryContainer.innerHTML = `<div class="text-center py-8 text-slate-500 w-full">Nenhuma foto disponível.</div>`;
            return;
        }

        galleryContainer.innerHTML = fotos.map(function(foto, index) {
            if (foto.isLoading) {
                return `<div class="flex-shrink-0 w-32 h-32 bg-slate-200 rounded-lg animate-pulse"></div>`;
            }
            return self.renderPhotoItem(foto, index);
        }).join('');
    },
    
    // ... TODAS AS OUTRAS FUNÇÕES DO SEU ARQUIVO ORIGINAL ESTÃO AQUI ...
    // Funções de formatação, modais, upload, download, edição, etc.
    // Nenhuma lógica de comportamento foi removida.
    formatCurrency: function(value) {
      // Se valor é null, undefined ou vazio, retorna valor padrão
      if (value === null || value === undefined || value === '' || value === 'null' || value === 'undefined') {
        return 'R$ 0,00';
      }
      
      // Se já é uma string formatada com R$, retorna como está
      if (typeof value === 'string' && value.includes('R$')) {
        return value;
      }
      
      // Se é string, tenta converter para número
      if (typeof value === 'string') {
        // Remove caracteres não numéricos exceto vírgula e ponto
        var cleanValue = value.replace(/[^\d.,-]/g, '');
        
        // Se não sobrou nada válido, retorna 0
        if (!cleanValue || cleanValue === '') {
          return 'R$ 0,00';
        }
        
        // Converte vírgula para ponto (formato brasileiro)
        cleanValue = cleanValue.replace(',', '.');
        
        // Tenta converter para float
        var numValue = parseFloat(cleanValue);
        
        // Se não conseguiu converter, retorna 0
        if (isNaN(numValue)) {
          return 'R$ 0,00';
        }
        
        value = numValue;
      }
      
      // Se chegou até aqui mas não é número, retorna 0
      if (typeof value !== 'number' || isNaN(value)) {
        return 'R$ 0,00';
      }
      
      // Formata o valor numérico
      try {
        return new Intl.NumberFormat('pt-BR', { 
          style: 'currency', 
          currency: 'BRL' 
        }).format(value);
      } catch (error) {
        console.warn('Erro ao formatar valor monetário:', value, error);
        return 'R$ 0,00';
      }
    },

    parseCurrencyForEdit: function(value) {
      // Se valor é null, undefined ou vazio, retorna vazio
      if (value === null || value === undefined || value === '' || value === 'null' || value === 'undefined') {
        return '';
      }
      
      // Se já é uma string formatada com R$, extrai apenas o número
      if (typeof value === 'string' && value.includes('R$')) {
        var cleanValue = value.replace(/[R$\s\.]/g, '').replace(',', '.');
        var numValue = parseFloat(cleanValue);
        if (!isNaN(numValue) && numValue > 0) {
          return numValue.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });
        }
        return '';
      }
      
      // Se é string, tenta converter para número
      if (typeof value === 'string') {
        var cleanValue = value.replace(/[^\d.,-]/g, '').replace(',', '.');
        var numValue = parseFloat(cleanValue);
        if (!isNaN(numValue) && numValue > 0) {
          return numValue.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });
        }
        return '';
      }
      
      // Se é número
      if (typeof value === 'number' && !isNaN(value) && value > 0) {
        return value.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
      }
      
      return '';
    },

    formatDate: function(dateValue) { if (!dateValue) return ''; try { const date = new Date(dateValue); return isNaN(date.getTime()) ? dateValue : date.toLocaleDateString('pt-BR'); } catch (e) { return dateValue; } },
    formatCPF: function(cpf) { if (!cpf) return 'N/A'; const cleaned = ('' + cpf).replace(/\D/g, ''); if (cleaned.length !== 11) return cpf; return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'); },
    toggleEdit: function(blockId) {
      const block = document.getElementById(`bloco-${blockId}`);
      if (block) {
        const viewMode = block.querySelector('.view-mode');
        const editMode = block.querySelector('.edit-mode');
        if (viewMode && editMode) {
          if (viewMode.style.display === 'none') {
            viewMode.style.display = 'block';
            editMode.style.display = 'none';
          } else {
            viewMode.style.display = 'none';
            editMode.style.display = 'block';
            
            // Adicionar máscara de moeda aos campos currency-input quando entrar em modo de edição
            if (blockId === 'imovel') {
              this.setupCurrencyMasks(editMode);
            }
          }
        }
      }
    },

    setupCurrencyMasks: function(container) {
      var self = this;
      const currencyInputs = container.querySelectorAll('.currency-input');
      
      currencyInputs.forEach(function(input) {
        input.addEventListener('input', function(e) {
          self.maskCurrency(e.target);
        });
      });
    },

    maskCurrency: function(input) {
      var value = input.value.replace(/\D/g, '');
      value = (value / 100).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      input.value = value;
    },

    parseCurrencyValue: function(value) {
      if (!value) return 0;
      return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
    },

    cancelEdit: function(blockId) { 
      const block = document.getElementById(`bloco-${blockId}`);
      if (block) {
        const viewMode = block.querySelector('.view-mode');
        const editMode = block.querySelector('.edit-mode');
        if (viewMode && editMode) {
          viewMode.style.display = 'block';
          editMode.style.display = 'none';
        }
      }
    },
    saveEdit: function(blockId) {
      var self = this;
      var block = document.getElementById('bloco-' + blockId);
      if (!block) return;
      
      var viewMode = block.querySelector('.view-mode');
      var editMode = block.querySelector('.edit-mode');
      var inputs = editMode.querySelectorAll('input, textarea, select');
      
      if (!inputs.length) return;
      
      var saveButton = editMode.querySelector('button[onclick*="saveEdit"]');
      if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = 'Salvando...';
      }
      
      console.log('🔄 Analisando campos do bloco:', blockId);
      
      // Detectar campos alterados
      var changedFields = [];
      
      inputs.forEach(function(input) {
        if (input.disabled) {
          console.log('⏭️ Pulando campo desabilitado:', input.getAttribute('data-field'));
          return;
        }
        
        var fieldName = input.getAttribute('data-field');
        var newValue = input.value;
        var originalValue = self.getOriginalFieldValue(fieldName);
        
        console.log('🔍 Campo:', fieldName, '| Original:', originalValue, '| Novo:', newValue);
        
        // Comparar valores (tratando null/undefined como string vazia)
        var normalizedOriginal = (originalValue || '').toString();
        var normalizedNew = (newValue || '').toString();
        
        if (normalizedOriginal !== normalizedNew) {
          console.log('✅ Campo alterado detectado:', fieldName);
          changedFields.push({
            fieldName: fieldName,
            newValue: newValue,
            originalValue: originalValue
          });
        } else {
          console.log('➡️ Campo sem alteração:', fieldName);
        }
      });
      
      console.log('📊 Total de campos alterados:', changedFields.length);
      
      if (changedFields.length === 0) {
        this.showToast('Nenhuma alteração detectada.', 'info');
        if (saveButton) {
          saveButton.disabled = false;
          saveButton.textContent = 'Salvar';
        }
        return;
      }
      
      console.log('🚀 Iniciando salvamento sequencial de', changedFields.length, 'campos...');
      
      // Salvar cada campo alterado separadamente
      this.saveChangedFieldsSequentially(changedFields, blockId, 0)
        .then(function() {
          viewMode.style.display = 'block';
          editMode.style.display = 'none';
          // this.showToast('Todos os campos foram atualizados com sucesso!', 'success');
        })
        .catch(function(error) {
          console.error('Erro ao salvar campos:', error);
          // this.showToast('Erro ao salvar alguns campos. Verifique o console para detalhes.', 'error');
        })
        .finally(function() {
          if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = 'Salvar';
          }
        });
    },
    
    getOriginalFieldValue: function(fieldName) {
      // Determinar se é campo de ticket ou deal
      var isTicketField = fieldName === 'hs_ticket_priority' || 
                          fieldName === 'qual_o_valor_total_das_suas_dividas_' ||
                          fieldName === 'valor_esperado_pelo_cliente' ||
                          fieldName === 'valor_avaliacao_do_imovel_pelo_cliente';
      
      console.log('📋 Obtendo valor original para campo:', fieldName, '| É ticket?', isTicketField);
      
      var originalValue = null;
      
      if (isTicketField && window.hubspotTicketData) {
        originalValue = this.safeGetArrayValue(window.hubspotTicketData.data[fieldName]);
        
        // Para campos monetários, converter para formato editável se necessário
        if (fieldName === 'qual_o_valor_total_das_suas_dividas_' || 
            fieldName === 'valor_esperado_pelo_cliente' || 
            fieldName === 'valor_avaliacao_do_imovel_pelo_cliente') {
          originalValue = this.parseCurrencyForEdit(originalValue);
        }
        
        console.log('🎫 Valor do ticket:', originalValue);
      } else if (!isTicketField && window.hubspotNegocioData) {
        originalValue = this.safeGetArrayValue(window.hubspotNegocioData.data[fieldName]);
        console.log('💼 Valor do deal:', originalValue);
      } else {
        console.warn('⚠️ Dados não encontrados para campo:', fieldName);
        console.log('🎫 hubspotTicketData disponível?', !!window.hubspotTicketData);
        console.log('💼 hubspotNegocioData disponível?', !!window.hubspotNegocioData);
      }
      
      return originalValue;
    },
    
    saveChangedFieldsSequentially: function(changedFields, blockId, index) {
      var self = this;
      
      if (index >= changedFields.length) {
        return Promise.resolve();
      }
      
      var field = changedFields[index];
      var fieldName = field.fieldName;
      var newValue = field.newValue;
      
      return this.saveSingleField(fieldName, newValue, blockId)
        .then(function() {
          console.log('Campo salvo com sucesso:', fieldName, '=', newValue);
          // Recursivamente salvar o próximo campo
          return self.saveChangedFieldsSequentially(changedFields, blockId, index + 1);
        })
        .catch(function(error) {
          console.error('Erro ao salvar campo:', fieldName, error);
          // Continuar com o próximo campo mesmo se um falhar
          return self.saveChangedFieldsSequentially(changedFields, blockId, index + 1);
        });
    },
    
    saveSingleField: function(fieldName, newValue, blockId) {
      var self = this;
      var isTicketField = fieldName === 'hs_ticket_priority' || 
                          fieldName === 'qual_o_valor_total_das_suas_dividas_' ||
                          fieldName === 'valor_esperado_pelo_cliente' ||
                          fieldName === 'valor_avaliacao_do_imovel_pelo_cliente';
                          fieldName === 'solicitar_avaliacao_externa'; // Adicionar esta linha
      var objectType = isTicketField ? 'ticket' : 'deal';
      var objectId = isTicketField ? 
        (window.hubspotTicketData ? window.hubspotTicketData.data.hs_object_id : null) :
        (window.hubspotNegocioData ? window.hubspotNegocioData.data.hs_object_id : null);
      
      // Processar valores monetários
      var processedValue = newValue;
      if (fieldName === 'qual_o_valor_total_das_suas_dividas_' || 
          fieldName === 'valor_esperado_pelo_cliente' || 
          fieldName === 'valor_avaliacao_do_imovel_pelo_cliente') {
        processedValue = this.parseCurrencyValue(newValue);
      }
      
      console.log('💾 Preparando salvamento:', {
        fieldName: fieldName,
        newValue: newValue,
        processedValue: processedValue,
        objectType: objectType,
        objectId: objectId,
        blockId: blockId
      });
      
      if (!objectId) {
        var error = new Error('ID do ' + objectType + ' não encontrado para campo: ' + fieldName);
        console.error('❌', error.message);
        return Promise.reject(error);
      }
      
      var endpoint = 'https://n8n2.rooftop.com.br/webhook/portal/update-' + objectType;
      var payload = { objectId: objectId };
      payload[fieldName] = processedValue;
      
      console.log('📡 Enviando para:', endpoint);
      console.log('📦 Payload:', JSON.stringify(payload, null, 2));
      
      return fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(function(response) {
        console.log('📥 Resposta recebida:', response.status, response.statusText);
        
        if (!response.ok) {
          throw new Error('Erro na resposta do servidor: ' + response.status + ' para campo: ' + fieldName);
        }
        return response.json();
      })
      .then(function(data) {
        console.log('✅ Campo salvo com sucesso:', fieldName, '=', newValue);
        console.log('📄 Resposta da API:', data);
        
        // Atualizar dados globais
        if (isTicketField && window.hubspotTicketData) {
          window.hubspotTicketData.data[fieldName] = newValue;
          console.log('🔄 Dados do ticket atualizados');
        } else if (!isTicketField && window.hubspotNegocioData) {
          window.hubspotNegocioData.data[fieldName] = newValue;
          console.log('🔄 Dados do deal atualizados');
        }
        
        // Atualizar view mode
        self.updateViewMode(blockId, fieldName, newValue);
        console.log('🎨 Interface atualizada');
        
        return data;
      })
      .catch(function(error) {
        console.error('❌ Erro ao salvar campo:', fieldName, error);
        throw error;
      });
    },
    
    updateViewMode: function(blockId, fieldName, newValue) {
      var block = document.getElementById('bloco-' + blockId);
      if (!block) return;

      var viewElement = block.querySelector('.view-mode [data-field="' + fieldName + '"]');
      if (!viewElement) return;

      if (fieldName === 'hs_ticket_priority') {
        var priorityInfo = this.getTicketPriorityInfo(newValue);
        // Usar classes badge corretas ao invés de inline-flex
        viewElement.innerHTML = priorityInfo.icon + ' ' + priorityInfo.label;
        viewElement.className = 'badge ' + priorityInfo.colorClass + ' mt-1';
      } else if (fieldName === 'qual_o_seu_principal_objetivo_') {
        viewElement.textContent = this.getObjetivoLabel(newValue);
      } else {
        viewElement.textContent = newValue || 'Não informado';
      }
    },
    
    openRegistrarAtividade: function() { 
      const modal = document.getElementById('modal-registrar-atividade');
      if (modal) {
        modal.style.display = 'block';
        const now = new Date();
        const dataInput = document.getElementById('data-atividade');
        const horarioInput = document.getElementById('horario-atividade');
        if (dataInput) dataInput.value = now.toISOString().split('T')[0];
        if (horarioInput) horarioInput.value = now.toTimeString().slice(0, 5);
      }
    },
    closeRegistrarAtividade: function() { 
      const modal = document.getElementById('modal-registrar-atividade');
      if (modal) {
        modal.style.display = 'none';
        const form = document.getElementById('form-registrar-atividade');
        if (form) form.reset();
      }
    },
    openAdicionarProponente: function() {
      var self = this;
      var proponentes = this.getProponentesInfo(window.hubspotTicketData ? window.hubspotTicketData.data : null);
      var proximoNumero = proponentes.length + 1;
      
      if (proximoNumero > 3) {
        this.showToast('Máximo de 3 proponentes permitido.', 'warning');
        return;
      }
      
      var modalHTML = `
        <div id="proponente-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.5); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 1rem;">
          <div style="position: relative; background: white; border-radius: 0.5rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); max-width: 28rem; width: 100%; overflow-y: auto;">
            <div style="padding: 1.5rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3 style="font-size: 1.125rem; font-weight: 500; color: #111827;">Adicionar Proponente ${proximoNumero}</h3>
                <button onclick="window.negocioDetalheModule.closeProponenteModal()" style="color: #9CA3AF; cursor: pointer; border: none; background: none; padding: 0.25rem;">
                  <svg style="width: 1.5rem; height: 1.5rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <form id="proponente-form" style="display: flex; flex-direction: column; gap: 1rem;">
                <div>
                  <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem;">Nome Completo</label>
                  <input type="text" id="proponente-nome" style="width: 100%; padding: 0.75rem; border: 1px solid #D1D5DB; border-radius: 0.5rem; font-size: 0.875rem;" placeholder="Digite o nome completo" required>
                </div>
                <div>
                  <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem;">CPF</label>
                  <input type="text" id="proponente-cpf" style="width: 100%; padding: 0.75rem; border: 1px solid #D1D5DB; border-radius: 0.5rem; font-size: 0.875rem;" placeholder="000.000.000-00" maxlength="14" required>
                </div>
                <div>
                  <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem;">Data de Nascimento</label>
                  <input type="date" id="proponente-data" style="width: 100%; padding: 0.75rem; border: 1px solid #D1D5DB; border-radius: 0.5rem; font-size: 0.875rem;" required>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
                  <button type="button" onclick="window.negocioDetalheModule.closeProponenteModal()" style="padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; color: #374151; background: white; border: 1px solid #D1D5DB; border-radius: 0.5rem; cursor: pointer;">
                    Cancelar
                  </button>
                  <button type="submit" style="padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; color: white; background: #2563EB; border: none; border-radius: 0.5rem; cursor: pointer;">
                    Adicionar Proponente
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', modalHTML);
      
      var cpfInput = document.getElementById('proponente-cpf');
      cpfInput.addEventListener('input', function(e) {
        e.target.value = self.applyCPFMask(e.target.value);
      });
      
      document.getElementById('proponente-form').addEventListener('submit', function(e) {
        e.preventDefault();
        self.cadastrarProponente(proximoNumero);
      });
      
      this.escProponenteHandler = function(e) {
        if (e.key === 'Escape') self.closeProponenteModal();
      };
      document.addEventListener('keydown', this.escProponenteHandler);
    },
    
    closeProponenteModal: function() {
      var modal = document.getElementById('proponente-modal');
      if (modal) {
        document.removeEventListener('keydown', this.escProponenteHandler);
        modal.remove();
      }
    },
    
    cadastrarProponente: function(numeroProponente) {
      var self = this;
      var nome = document.getElementById('proponente-nome').value.trim();
      var cpf = document.getElementById('proponente-cpf').value.replace(/\D/g, '');
      var dataNascimento = document.getElementById('proponente-data').value;
      
      if (!nome || !cpf || !dataNascimento) {
        this.showToast('Por favor, preencha todos os campos.', 'warning');
        return;
      }
      
      if (cpf.length !== 11) {
        this.showToast('CPF deve ter 11 dígitos.', 'warning');
        return;
      }
      
      var ticketId = window.hubspotTicketPortalData ? window.hubspotTicketPortalData.data.hs_object_id : null;
      if (!ticketId) {
        this.showToast('ID do ticket do portal não encontrado.', 'error');
        return;
      }
      
      var payload = {
        ticketId: ticketId,
        numeroProponente: numeroProponente,
        nome: nome,
        cpf: cpf,
        dataNascimento: dataNascimento
      };
      
      fetch('https://n8n2.rooftop.com.br/webhook/portal/cadastrar-proponente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(function(response) {
        if (!response.ok) throw new Error('Erro na resposta do servidor: ' + response.status);
        return response.json();
      })
      .then(function(data) {
        self.closeProponenteModal();
        this.showToast('Proponente adicionado com sucesso!', 'success');
        setTimeout(function() { window.location.reload(); }, 500);
      })
      .catch(function(error) {
        console.error('Erro ao cadastrar proponente:', error);
        this.showToast('Erro ao cadastrar proponente. Tente novamente.', 'error');
      });
    },
    
    applyCPFMask: function(value) {
      var numbers = value.replace(/\D/g, '').substring(0, 11);
      if (numbers.length <= 3) return numbers;
      else if (numbers.length <= 6) return numbers.replace(/(\d{3})(\d+)/, '$1.$2');
      else if (numbers.length <= 9) return numbers.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
      else return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d+)/, '$1.$2.$3-$4');
    },
    
    uploadDocument: function(docId) {
      var fieldName = this.getDocumentFieldName(docId);
      if (!fieldName) {
        this.showToast('Tipo de documento não reconhecido.', 'error');
        return;
      }
      
      var docs = this.getDocumentosInfo(window.hubspotTicketData ? window.hubspotTicketData.data : null);
      var doc = docs.find(function(d) { return d.id === docId; });
      if (!doc) {
        this.showToast('Documento não encontrado.', 'error');
        return;
      }
      
      this.openUploadModal(docId, doc.nome, fieldName);
    },
    
    getDocumentFieldName: function(docId) {
      var fieldMap = {
        'iptu': 'iptu_do_imovel',
        'cnd_iptu': 'cnd_iptu',
        'cpf_rg': 'cpf_e_rg_do_s__proprietario_s_',
        'certidoes': 'certidao_de_estado_civil',
        'condominio': 'boleto_de_condominio',
        'matricula': 'matricula'
      };
      return fieldMap[docId] || null;
    },
    
    openUploadModal: function(docId, docNome, fieldName) {
      var self = this;
      
      var modalHTML = `
        <div id="upload-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.5); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 1rem;">
          <div style="position: relative; background: white; border-radius: 0.5rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); max-width: 28rem; width: 100%; overflow-y: auto;">
            <div style="padding: 1.5rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3 style="font-size: 1.125rem; font-weight: 500; color: #111827;">Upload de Documento</h3>
                <button onclick="window.negocioDetalheModule.closeUploadModal()" style="color: #9CA3AF; cursor: pointer; border: none; background: none; padding: 0.25rem;">
                  <svg style="width: 1.5rem; height: 1.5rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              
              <div style="margin-bottom: 1rem;">
                <p style="font-size: 0.875rem; color: #374151; margin-bottom: 0.5rem;"><strong>Documento:</strong> ${docNome}</p>
              </div>
              
              <form id="upload-form" style="display: flex; flex-direction: column; gap: 1rem;">
                <div>
                  <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Selecionar Arquivo</label>
                  <div style="border: 2px dashed #D1D5DB; border-radius: 0.5rem; padding: 2rem; text-align: center; background: #F9FAFB;" id="drop-zone">
                    <input type="file" id="file-input" style="display: none;" accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx" multiple>
                    <div id="drop-content">
                      <svg style="width: 3rem; height: 3rem; margin: 0 auto 0.5rem; color: #9CA3AF;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                      </svg>
                      <p style="font-size: 0.875rem; color: #6B7280; margin-bottom: 0.25rem;">Clique para selecionar ou arraste arquivos aqui</p>
                      <p style="font-size: 0.75rem; color: #9CA3AF;">PDF, JPG, PNG, DOC (máx. 10MB cada)</p>
                    </div>
                    <div id="file-list" style="margin-top: 1rem; text-align: left; display: none;"></div>
                    <button type="button" onclick="document.getElementById('file-input').click()" style="margin-top: 1rem; padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; color: #2563EB; background: white; border: 1px solid #2563EB; border-radius: 0.5rem; cursor: pointer;">
                      Selecionar Arquivos
                    </button>
                  </div>
                </div>
                
                <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
                  <button type="button" onclick="window.negocioDetalheModule.closeUploadModal()" style="padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; color: #374151; background: white; border: 1px solid #D1D5DB; border-radius: 0.5rem; cursor: pointer;">
                    Cancelar
                  </button>
                  <button type="submit" id="upload-button" style="padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; color: white; background: #2563EB; border: none; border-radius: 0.5rem; cursor: pointer;" disabled>
                    Fazer Upload
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', modalHTML);
      this.setupUploadModal(docId, fieldName);
    },
    
    setupUploadModal: function(docId, fieldName) {
      var self = this;
      var fileInput = document.getElementById('file-input');
      var dropZone = document.getElementById('drop-zone');
      var fileList = document.getElementById('file-list');
      var uploadButton = document.getElementById('upload-button');
      var selectedFiles = [];
      
      // Função para atualizar a lista de arquivos
      function updateFileList() {
        if (selectedFiles.length === 0) {
          fileList.style.display = 'none';
          uploadButton.disabled = true;
          uploadButton.style.backgroundColor = '#9CA3AF';
          return;
        }
        
        fileList.style.display = 'block';
        uploadButton.disabled = false;
        uploadButton.style.backgroundColor = '#2563EB';
        
        var html = '<div style="font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Arquivos selecionados:</div>';
        selectedFiles.forEach(function(file, index) {
          var fileSize = self.formatFileSize(file.size);
          html += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; border: 1px solid #E5E7EB; border-radius: 0.25rem; margin-bottom: 0.25rem; background: white;">
              <div>
                <div style="font-size: 0.875rem; font-weight: 500; color: #111827;">${file.name}</div>
                <div style="font-size: 0.75rem; color: #6B7280;">${fileSize}</div>
              </div>
              <button type="button" onclick="window.negocioDetalheModule.removeUploadFile(${index})" style="color: #EF4444; cursor: pointer; border: none; background: none; padding: 0.25rem;">
                <svg style="width: 1rem; height: 1rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          `;
        });
        fileList.innerHTML = html;
      }
      
      // Armazenar referências para uso em outras funções
      this.uploadModalState = {
        selectedFiles: selectedFiles,
        updateFileList: updateFileList,
        docId: docId,
        fieldName: fieldName
      };
      
      // Event listener para seleção de arquivos
      fileInput.addEventListener('change', function(e) {
        var files = Array.from(e.target.files);
        files.forEach(function(file) {
          if (file.size > 10 * 1024 * 1024) {
            self.showToast('Arquivo "' + file.name + '" é muito grande. Máximo 10MB.', 'error');
            return;
          }
          selectedFiles.push(file);
        });
        updateFileList();
      });
      
      // Drag and drop
      dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        dropZone.style.borderColor = '#2563EB';
        dropZone.style.backgroundColor = '#EFF6FF';
      });
      
      dropZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        dropZone.style.borderColor = '#D1D5DB';
        dropZone.style.backgroundColor = '#F9FAFB';
      });
      
      dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        dropZone.style.borderColor = '#D1D5DB';
        dropZone.style.backgroundColor = '#F9FAFB';
        
        var files = Array.from(e.dataTransfer.files);
        files.forEach(function(file) {
          if (file.size > 10 * 1024 * 1024) {
            self.showToast('Arquivo "' + file.name + '" é muito grande. Máximo 10MB.', 'error');
            return;
          }
          selectedFiles.push(file);
        });
        updateFileList();
      });
      
      // Event listener para submit do formulário
      document.getElementById('upload-form').addEventListener('submit', function(e) {
        e.preventDefault();
        self.processUpload();
      });
      
      // Event listener para fechar com ESC
      this.escUploadHandler = function(e) {
        if (e.key === 'Escape') {
          self.closeUploadModal();
        }
      };
      document.addEventListener('keydown', this.escUploadHandler);
    },
    
    removeUploadFile: function(index) {
      if (this.uploadModalState) {
        this.uploadModalState.selectedFiles.splice(index, 1);
        this.uploadModalState.updateFileList();
      }
    },
    
    processUpload: function() {
      var self = this;
      var state = this.uploadModalState;
      
      if (!state || state.selectedFiles.length === 0) {
        this.showToast('Nenhum arquivo selecionado.', 'warning');
        return;
      }
      
      var uploadButton = document.getElementById('upload-button');
      var originalText = uploadButton.textContent;
      
      uploadButton.disabled = true;
      uploadButton.textContent = 'Enviando...';
      uploadButton.style.backgroundColor = '#9CA3AF';
      
      var ticketId = window.hubspotTicketData ? window.hubspotTicketData.data.hs_object_id : null;
      
      if (!ticketId) {
        this.showToast('ID do ticket do portal não encontrado.', 'error');
        uploadButton.disabled = false;
        uploadButton.textContent = originalText;
        uploadButton.style.backgroundColor = '#2563EB';
        return;
      }
      
      // Obter IDs existentes do campo antes de fazer upload
      var existingIds = this.getExistingFileIds(state.fieldName);
      console.log('IDs existentes no campo ' + state.fieldName + ':', existingIds);
      
      this.uploadFilesSequential(state.selectedFiles, ticketId, state.fieldName, existingIds, function(success) {
        if (success) {
          self.showToast('Upload realizado com sucesso!', 'success');
          self.closeUploadModal();
          setTimeout(function() {
            window.location.reload();
          }, 500);
        } else {
          uploadButton.disabled = false;
          uploadButton.textContent = originalText;
          uploadButton.style.backgroundColor = '#2563EB';
        }
      });
    },
    
    getExistingFileIds: function(fieldName) {
      var ticketData = window.hubspotTicketData ? window.hubspotTicketData.data : null;
      if (!ticketData || !ticketData[fieldName]) {
        return [];
      }
      
      var fieldValue = ticketData[fieldName];
      if (!fieldValue || fieldValue.trim() === '') {
        return [];
      }
      
      // Os IDs são separados por vírgula ou ponto e vírgula
      return fieldValue.split(/[;,]/).map(function(id) { return id.trim(); }).filter(function(id) { return id !== ''; });
    },
    
    uploadFilesSequential: function(files, ticketId, fieldName, currentIds, callback) {
      var self = this;
      
      if (files.length === 0) {
        callback(true);
        return;
      }
      
      // Começar com os IDs já existentes
      var accumulatedIds = currentIds.slice(); // cópia do array
      var uploadIndex = 0;
      
      function uploadNextFile() {
        if (uploadIndex >= files.length) {
          callback(true);
          return;
        }
        
        var file = files[uploadIndex];
        var formData = new FormData();
        formData.append('file', file);
        formData.append('fileName', file.name);
        formData.append('ticket_id', ticketId);
        formData.append('field_name', fieldName);
        
        // Enviar todos os IDs acumulados (existentes + já enviados)
        if (accumulatedIds.length > 0) {
          formData.append('existing_file_ids', accumulatedIds.join(';'));
        }
        
        // Atualizar progresso
        var uploadButton = document.getElementById('upload-button');
        if (uploadButton) {
          uploadButton.textContent = `Enviando ${uploadIndex + 1}/${files.length}...`;
        }
        
        console.log('Enviando arquivo ' + (uploadIndex + 1) + '/' + files.length + ':', file.name);
        console.log('IDs existentes sendo enviados:', accumulatedIds.join(';'));
        
        fetch('https://n8n2.rooftop.com.br/webhook/portal/upload-documento', {
          method: 'POST',
          body: formData
        })
        .then(function(response) {
          if (!response.ok) {
            throw new Error('Erro na resposta do servidor: ' + response.status);
          }
          return response.json();
        })
        .then(function(data) {
          console.log('Arquivo enviado com sucesso:', file.name, data);
          
          // Extrair o novo ID da resposta da API
          var newFileId = null;
          if (data && data.properties && data.properties[fieldName]) {
            // Pegar o último ID da lista (o que acabou de ser adicionado)
            var allIds = data.properties[fieldName].split(/[;,]/).map(function(id) { return id.trim(); }).filter(function(id) { return id !== ''; });
            
            // Encontrar o ID que não estava na lista anterior
            var newIds = allIds.filter(function(id) { return accumulatedIds.indexOf(id) === -1; });
            if (newIds.length > 0) {
              newFileId = newIds[0]; // Pegar o primeiro novo ID
            }
          }
          
          if (newFileId) {
            accumulatedIds.push(newFileId);
            console.log('Novo ID adicionado:', newFileId);
            console.log('IDs acumulados:', accumulatedIds);
          } else {
            console.warn('Não foi possível extrair o novo ID da resposta');
          }
          
          uploadIndex++;
          // Continuar com o próximo arquivo
          setTimeout(uploadNextFile, 500); // Pequeno delay entre uploads
        })
        .catch(function(error) {
          console.error('Erro ao enviar arquivo:', file.name, error);
          self.showToast('Erro ao enviar arquivo "' + file.name + '". Tente novamente.', 'error');
          callback(false);
        });
      }
      
      // Iniciar o upload do primeiro arquivo
      uploadNextFile();
    },
    
    closeUploadModal: function() {
      var modal = document.getElementById('upload-modal');
      if (modal) {
        document.removeEventListener('keydown', this.escUploadHandler);
        modal.remove();
        this.uploadModalState = null;
      }
    },
    
    viewDocument: function(docId) {
      var self = this;
      
      // Encontrar o documento
      var docs = this.getDocumentosInfo(window.hubspotTicketData ? window.hubspotTicketData.data : null);
      var doc = docs.find(function(d) { return d.id === docId; });
      
      if (!doc || !doc.fileIds || doc.fileIds.length === 0) {
        this.showToast('Nenhum arquivo encontrado para este documento.', 'info');
        return;
      }
      
      // Se há apenas um arquivo, baixar diretamente
      if (doc.fileIds.length === 1) {
        this.downloadFile(doc.fileIds[0]);
      } else {
        // Se há múltiplos arquivos, mostrar lista para escolha
        this.showFileSelectionModal(doc);
      }
    },

    showFileSelectionModal: function(doc) {
      var self = this;
      
      // Criar modal para seleção de arquivo
      var modalHTML = `
        <div id="file-selection-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.5); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 1rem;">
          <div style="position: relative; background: white; border-radius: 0.5rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); max-width: 28rem; width: 100%; max-height: 24rem; overflow-y: auto;">
            <div style="padding: 1.5rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3 style="font-size: 1.125rem; font-weight: 500; color: #111827;">Selecionar Arquivo - ${doc.nome}</h3>
                <button onclick="window.negocioDetalheModule.closeFileSelectionModal()" style="color: #9CA3AF; cursor: pointer; border: none; background: none; padding: 0.25rem;" onmouseover="this.style.color='#6B7280'" onmouseout="this.style.color='#9CA3AF'">
                  <svg style="width: 1.5rem; height: 1.5rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              
              <div id="file-list" style="display: flex; flex-direction: column; gap: 0.5rem;">
                <div style="display: flex; align-items: center; justify-content: center; padding: 1rem 0;">
                  <div style="width: 2rem; height: 2rem; border: 2px solid #2563EB; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                  <span style="margin-left: 0.5rem; color: #6B7280;">Carregando arquivos...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <style>
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        </style>
      `;
      
      // Adicionar modal ao DOM
      document.body.insertAdjacentHTML('beforeend', modalHTML);
      
      // Adicionar evento para fechar com tecla ESC apenas
      this.escHandler = function(e) {
        if (e.key === 'Escape') {
          self.closeFileSelectionModal();
        }
      };
      document.addEventListener('keydown', this.escHandler);
      
      // Carregar arquivos e popular lista
      this.loadMultipleFiles(doc.fileIds).then(function(files) {
        var fileListHTML = files.map(function(file, index) {
          if (!file) return '';
          
          var fileIcon = self.getFileIcon(file.type, file.extension);
          var fileSize = self.formatFileSize(file.size);
          
          return `
            <div onclick="window.negocioDetalheModule.downloadFile('${doc.fileIds[index]}')" style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; border: 1px solid #E5E7EB; border-radius: 0.5rem; cursor: pointer; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#F9FAFB'" onmouseout="this.style.backgroundColor='transparent'">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                ${fileIcon}
                <div>
                  <p style="font-size: 0.875rem; font-weight: 500; color: #111827; margin: 0;">${file.name}.${file.extension}</p>
                  <p style="font-size: 0.75rem; color: #6B7280; margin: 0;">${fileSize}</p>
                </div>
              </div>
              <svg style="width: 1.25rem; height: 1.25rem; color: #2563EB;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
          `;
        }).join('');
        
        document.getElementById('file-list').innerHTML = fileListHTML;
      }).catch(function(error) {
        console.error('Erro ao carregar lista de arquivos:', error);
        document.getElementById('file-list').innerHTML = `
          <div style="text-align: center; padding: 1rem 0; color: #DC2626;">
            <p style="margin: 0;">Erro ao carregar arquivos. Tente novamente.</p>
          </div>
        `;
      });
    },

    loadMultipleFiles: function(fileIds) {
      var self = this;
      
      // Usar Promise.allSettled em vez de Promise.all para não falhar se um arquivo der erro
      var promises = fileIds.map(function(id) {
        return self.loadFileFromEndpoint(id).catch(function(error) {
          console.warn('Falha ao carregar arquivo ' + id + ':', error.message);
          return null; // Retornar null em caso de erro para não quebrar o carregamento dos outros
        });
      });
      
      return Promise.all(promises).then(function(results) {
        var successCount = results.filter(function(r) { return r !== null; }).length;
        var totalCount = fileIds.length;
        
        if (successCount === 0) {
          throw new Error('Nenhum arquivo pôde ser carregado');
        }
        
        if (successCount < totalCount) {
          console.warn('Carregados ' + successCount + ' de ' + totalCount + ' arquivos');
        }
        
        return results; // Retorna array com nulls para arquivos que falharam
      });
    },
    
    getFileIcon: function(type, extension) {
      if (type === 'IMG' || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension.toLowerCase())) {
        return `
          <svg style="width: 2rem; height: 2rem; color: #2563EB;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
        `;
      } else if (['mp4'].includes(extension.toLowerCase())) {
        return `
          <svg style="width: 2rem; height: 2rem; color: #7C3AED;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9l5 3-5 3V9z"/>
          </svg>
        `;
      } else if (['pdf'].includes(extension.toLowerCase())) {
        return `
          <svg style="width: 2rem; height: 2rem; color: #DC2626;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
          </svg>
        `;
      } else {
        return `
          <svg style="width: 2rem; height: 2rem; color: #6B7280;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        `;
      }
    },

    formatFileSize: function(bytes) {
      if (!bytes) return '0 B';
      
      var k = 1024;
      var sizes = ['B', 'KB', 'MB', 'GB'];
      var i = Math.floor(Math.log(bytes) / Math.log(k));
      
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    },

    closeFileSelectionModal: function() {
      var modal = document.getElementById('file-selection-modal');
      if (modal) {
        // Remover todos os event listeners relacionados ao modal
        document.removeEventListener('keydown', this.escHandler);
        modal.remove();
      }
    },
    
    
    downloadFile: function(fileId) {
      var self = this;
      this.getFileWithExpirationCheck(fileId).then(function(fileData) {
        if (fileData && fileData.url) {
          var link = document.createElement('a');
          link.href = fileData.url;
          link.download = fileData.name + '.' + fileData.extension;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          self.showToast('Erro ao carregar o arquivo. Tente novamente.', 'error');
        }
      }).catch(function(error) {
        console.error('Erro ao baixar arquivo:', error);
        this.showToast('Erro ao baixar arquivo. Tente novamente.', 'error');
      });
    },
    
    getFileWithExpirationCheck: function(fileId) {
      var cachedFile = this.fileCache[fileId];
      if (cachedFile && !this.isFileExpired(cachedFile)) {
        return Promise.resolve(cachedFile);
      } else {
        delete this.fileCache[fileId];
        return this.loadFileFromEndpoint(fileId);
      }
    },
    
    isFileExpired: function(fileData) {
      if (!fileData || !fileData.expiresAt) return true;
      var expirationDate = new Date(fileData.expiresAt);
      var currentDate = new Date();
      var bufferTime = 5 * 60 * 1000;
      var expirationWithBuffer = new Date(expirationDate.getTime() - bufferTime);
      return currentDate >= expirationWithBuffer;
    },
    
    isPdfFile: function(foto) {
      if (foto.fileData && foto.fileData.extension) {
        return foto.fileData.extension.toLowerCase() === 'pdf';
      }
      if (foto.fileData && foto.fileData.type) {
        return foto.fileData.type === 'PDF' || foto.fileData.type.toLowerCase().includes('pdf');
      }
      return false;
    },

    isVideoFile: function(foto) {
      if (foto.fileData && foto.fileData.extension) {
        return foto.fileData.extension.toLowerCase() === 'mp4';
      }
      if (foto.fileData && foto.fileData.type) {
        return foto.fileData.type === 'video/mp4' || foto.fileData.type.toLowerCase().includes('video');
      }
      return false;
    },
    
    renderPhotoItem: function(foto, index) {
      var isPdf = this.isPdfFile(foto);
      var isVideo = this.isVideoFile(foto);
      
      if (isPdf) {
        return `
          <div class="flex-shrink-0 flex flex-col items-center cursor-pointer" onclick="window.negocioDetalheModule.downloadPhoto('${foto.id}')">
            <div class="relative group w-32 h-32 bg-red-50 border-2 border-red-200 rounded-lg flex items-center justify-center hover:border-red-400 transition-colors">
              <svg class="w-16 h-16 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
              </svg>
              
              <!-- Ícone de download no hover -->
              <div class="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
            </div>
            <p class="text-xs text-slate-600 mt-2 text-center">${foto.tipo === 'Fachada' ? 'Foto da Fachada' : 'Fotos do Imóvel'}</p>
          </div>
        `;
      } else if (isVideo) {
        return `
          <div class="flex-shrink-0 flex flex-col items-center">
            <div class="relative group">
              <div class="w-32 h-32 bg-slate-200 rounded-lg border-2 border-slate-200 group-hover:border-blue-500 transition-colors cursor-pointer flex items-center justify-center" onclick="window.negocioDetalheModule.openPhotoModal(${index})">
                <div class="text-center">
                  <svg class="w-12 h-12 text-slate-500 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  <p class="text-xs text-slate-500">Vídeo MP4</p>
                </div>
              </div>
              
              <!-- Ícone de remoção -->
              <button onclick="event.stopPropagation(); window.negocioDetalheModule.removePhoto('${foto.originalFileId}', '${foto.tipo}')" 
                      class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
              
              <!-- Ícone de play no hover -->
              <div class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
            </div>
            <p class="text-xs text-slate-600 mt-2 text-center">Vídeo MP4</p>
          </div>
        `;
      } else {
        return `
          <div class="flex-shrink-0 flex flex-col items-center">
            <div class="relative group">
              <img src="${foto.url}" alt="${foto.desc}" class="w-32 h-32 object-cover rounded-lg border-2 border-slate-200 group-hover:border-blue-500 transition-colors cursor-pointer" onclick="window.negocioDetalheModule.openPhotoModal(${index})">
              
              <!-- Ícone de remoção -->
              <button onclick="event.stopPropagation(); window.negocioDetalheModule.removePhoto('${foto.originalFileId}', '${foto.tipo}')" 
                      class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
              
              <!-- Ícone de zoom no hover -->
              <div class="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <svg class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
            </div>
            <p class="text-xs text-slate-600 mt-2 text-center">${foto.tipo === 'Fachada' ? 'Foto da Fachada' : 'Fotos do Imóvel'}</p>
          </div>
        `;
      }
    },
    openPhotoModal: function(index) { 
      this.currentModalPhotoIndex = index; 
      const modal = document.getElementById('photo-modal'); 
      if (modal && this.modalPhotos[index]) { 
        const foto = this.modalPhotos[index]; 
        this.displayModalMedia(foto);
        document.getElementById('modal-photo-type').textContent = foto.tipo; 
        document.getElementById('modal-photo-desc').textContent = foto.desc; 
        modal.classList.remove('hidden'); 
        modal.classList.add('flex'); 
      } 
    },
    closePhotoModal: function() { 
      const modal = document.getElementById('photo-modal'); 
      const modalVideo = document.getElementById('modal-video');
      
      // Pause video if it's playing
      if (modalVideo && !modalVideo.classList.contains('hidden')) {
        modalVideo.pause();
        modalVideo.currentTime = 0;
      }
      
      if (modal) { 
        modal.classList.add('hidden'); 
        modal.classList.remove('flex'); 
      } 
    },
    nextModalPhoto: function() { this.currentModalPhotoIndex = (this.currentModalPhotoIndex + 1) % this.modalPhotos.length; this.updateModalPhoto(); },
    previousModalPhoto: function() { this.currentModalPhotoIndex = (this.currentModalPhotoIndex - 1 + this.modalPhotos.length) % this.modalPhotos.length; this.updateModalPhoto(); },
    updateModalPhoto: function() { 
      if (this.modalPhotos[this.currentModalPhotoIndex]) { 
        const foto = this.modalPhotos[this.currentModalPhotoIndex]; 
        this.displayModalMedia(foto);
        document.getElementById('modal-photo-type').textContent = foto.tipo; 
        document.getElementById('modal-photo-desc').textContent = foto.desc; 
      } 
    },

    displayModalMedia: function(foto) {
      const modalPhoto = document.getElementById('modal-photo');
      const modalVideo = document.getElementById('modal-video');
      const isVideo = this.isVideoFile(foto);
      
      if (isVideo) {
        // Hide image, show video
        modalPhoto.classList.add('hidden');
        modalVideo.classList.remove('hidden');
        modalVideo.src = foto.url;
        modalVideo.load(); // Reload video element
      } else {
        // Hide video, show image
        modalVideo.classList.add('hidden');
        modalPhoto.classList.remove('hidden');
        modalPhoto.src = foto.url;
      }
    },
    
    downloadPhoto: function(photoId) {
      var self = this;
      
      // Encontrar a foto pelo ID
      var foto = this.modalPhotos.find(function(f) { return f.id === photoId; });
      if (!foto || !foto.fileData) {
        this.showToast('Foto não encontrada', 'error');
        return;
      }
      
      // Se tem ID original, verificar expiração
      if (foto.originalFileId) {
        this.getFileWithExpirationCheck(foto.originalFileId).then(function(fileData) {
          if (fileData && fileData.url) {
            console.log('Fazendo download da foto:', fileData.name + '.' + fileData.extension);
            console.log('Link expira em:', fileData.expiresAt);
            
            // Criar link temporário para download
            var link = document.createElement('a');
            link.href = fileData.url;
            link.download = fileData.name + '.' + fileData.extension;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          } else {
            self.showToast('Erro ao carregar foto. Tente novamente.', 'error');
          }
        }).catch(function(error) {
          console.error('Erro ao baixar foto:', error);
          self.showToast('Erro ao baixar foto. Tente novamente.', 'error');
        });
      } else {
        // Fallback para método antigo se não tem ID original
        var link = document.createElement('a');
        link.href = foto.url;
        link.download = foto.fileData.name + '.' + foto.fileData.extension;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    },
    nextPhoto: function() { const carousel = document.getElementById('photo-carousel'); if (carousel) carousel.scrollBy({ left: 144, behavior: 'smooth' }); },
    previousPhoto: function() { const carousel = document.getElementById('photo-carousel'); if (carousel) carousel.scrollBy({ left: -144, behavior: 'smooth' }); },
    parseFileIds: function(fieldValue) { if (!fieldValue) return []; return fieldValue.split(';').map(id => id.trim()).filter(Boolean); },
    loadFileFromEndpoint: function(fileId) { if (this.fileCache[fileId]) return Promise.resolve(this.fileCache[fileId]); return fetch(`https://n8n2.rooftop.com.br/webhook/portal/get-file?id=${fileId}`).then(res => res.json()).then(data => { this.fileCache[fileId] = data; return data; }); },
    
    // Função para buscar atividades de visita
    fetchVisitActivities: function(ticketId, contactId) {
      var url = `https://n8n2.rooftop.com.br/webhook/portal/meetings/visita?ticket_id=${ticketId}&contact_id=${contactId}`;


      return fetch(url)
        .then(function(response) {
          if (!response.ok) {
            throw new Error('Erro ao buscar atividades de visita');
          }
          return response.json();
        })
        .then(function(data) {
          console.log('✅ Atividades de visita carregadas:', data);
          return data;
        })
        .catch(function(error) {
          console.error('❌ Erro ao buscar atividades de visita:', error);
          return null;
        });
    },

    // Função para buscar meeting de Standby
    fetchStandbyMeetings: function(ticketId, contactId) {
      var url = `https://n8n2.rooftop.com.br/webhook/portal/meetings/standby?ticket_id=${ticketId}&contact_id=${contactId}`;

      console.log('🔍 Buscando meeting de Standby para ticket:', ticketId, 'e contato:', contactId);

      return fetch(url)
        .then(function(response) {
          if (!response.ok) {
            throw new Error('Erro ao buscar meeting de Standby');
          }
          return response.json();
        })
        .then(function(data) {
          console.log('✅ Meeting de Standby carregado:', data);
          return data;
        })
        .catch(function(error) {
          console.error('❌ Erro ao buscar meeting de Standby:', error);
          return null;
        });
    },

    // Função para buscar atividades de 2ª visita
    fetch2VisitMeetings: function(ticketId, contactId) {
      var url = `https://n8n2.rooftop.com.br/webhook/portal/meetings/2visita?ticket_id=${ticketId}&contact_id=${contactId}`;

      console.log('🔍 Buscando meeting de 2ª visita para ticket:', ticketId, 'e contato:', contactId);

      return fetch(url)
        .then(function(response) {
          if (!response.ok) {
            throw new Error('Erro ao buscar meeting de 2ª visita');
          }
          return response.json();
        })
        .then(function(data) {
          console.log('✅ Meeting de 2ª visita carregado:', data);
          return data;
        })
        .catch(function(error) {
          console.error('❌ Erro ao buscar meeting de 2ª visita:', error);
          return null;
        });
    },

    // Função para buscar histórico de propostas
    fetchPropostaHistory: function(ticketId) {
      if (!ticketId) {
        console.warn('⚠️ ticketId não fornecido para fetchPropostaHistory');
        return Promise.resolve(null);
      }

      var url = 'https://n8n2.rooftop.com.br/webhook/portal/propostas/history';
      var payload = { ticket_id: ticketId };

      console.log('🔍 Buscando histórico de propostas para ticket:', ticketId);

      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function(response) {
          if (!response.ok) {
            throw new Error('Erro ao buscar histórico de propostas: ' + response.status);
          }
          return response.json();
        })
        .then(function(data) {
          console.log('✅ Histórico de propostas carregado:', data);
          return data;
        })
        .catch(function(error) {
          console.error('❌ Erro ao buscar histórico de propostas:', error);
          return null;
        });
    },
    
    // Função para atualizar a UI com informações da visita
    updateVisitInfo: function(data) {
      var container = document.getElementById('visit-info-display');
      if (!container || !data) return;

      // Armazenar o meeting_id globalmente para uso posterior
      if (data.id) {
        window.currentMeetingId = data.id;
      }

      // Formatar data e hora da reunião
      var meetingTime = data.properties.hs_meeting_start_time ? new Date(data.properties.hs_meeting_start_time).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : 'Não definido';

      // Formatar data de criação
      var createDate = data.properties.hs_createdate ? new Date(data.properties.hs_createdate).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '';

      var html = `
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
          <p class="font-semibold text-blue-900 mb-2">Informações da Visita Agendada:</p>
          <div class="space-y-1 text-blue-800">
            <p><span class="font-medium">Data/Hora:</span> ${meetingTime}</p>
            ${data.properties.hs_meeting_body ? `<p><span class="font-medium">Detalhes:</span> ${data.properties.hs_meeting_body}</p>` : ''}
            ${createDate ? `<p class="text-sm text-slate-500"><span class="">Agendado em:</span> ${createDate}</p>` : ''}
          </div>
        </div>
      `;

      container.innerHTML = html;
      container.classList.remove('hidden');

      // Atualizar o botão para incluir o meeting_id
      var button = document.querySelector('[onclick="window.negocioDetalheModule.openReuniaoRealizadaModal()"]');
      if (button && data.id) {
        button.setAttribute('onclick', `window.negocioDetalheModule.openReuniaoRealizadaModal('${data.id}')`);
      }
    },

    // Função para atualizar a UI com informações da 2ª visita
    update2VisitInfo: function(data) {
      var container = document.getElementById('visit2-info-display');
      if (!container || !data) return;

      // Armazenar o meeting_id globalmente para uso posterior
      if (data.id) {
        window.current2MeetingId = data.id;
      }

      // Formatar data e hora da reunião
      var meetingTime = data.properties.hs_meeting_start_time ? new Date(data.properties.hs_meeting_start_time).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : 'Não definido';

      // Formatar data de criação
      var createDate = data.properties.hs_createdate ? new Date(data.properties.hs_createdate).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '';

      var html = `
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
          <p class="font-semibold text-blue-900 mb-2">Informações da 2ª Reunião Agendada:</p>
          <div class="space-y-1 text-blue-800">
            <p><span class="font-medium">Data/Hora:</span> ${meetingTime}</p>
            ${data.properties.hs_meeting_body ? `<p><span class="font-medium">Detalhes:</span> ${data.properties.hs_meeting_body}</p>` : ''}
            ${createDate ? `<p class="text-sm text-slate-500"><span class="">Agendado em:</span> ${createDate}</p>` : ''}
          </div>
        </div>
      `;

      container.innerHTML = html;
      container.classList.remove('hidden');

      // Atualizar o botão para incluir o meeting_id
      var button = document.querySelector('[onclick="window.negocioDetalheModule.openApresentacaoRealizadaModal()"]');
      if (button && data.id) {
        button.setAttribute('onclick', `window.negocioDetalheModule.openApresentacaoRealizadaModal('${data.id}')`);
      }
    },

    // Função para atualizar a UI com informações do meeting de Standby
    updateStandbyInfo: function(data) {
      var container = document.getElementById('standby-info-display');
      if (!container || !data) return;

      // Formatar data e hora do meeting
      var meetingTime = data.properties.hs_meeting_start_time ? new Date(data.properties.hs_meeting_start_time).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : 'Não definido';

      // Formatar data de criação
      var createDate = data.properties.hs_createdate ? new Date(data.properties.hs_createdate).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '';

      var html = `
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm mb-3">
          <p class="font-semibold text-amber-900 mb-2">Informações do Standby:</p>
          <div class="space-y-1 text-amber-800">
            <p><span class="font-medium">Data da Pausa:</span> ${meetingTime}</p>
            ${data.properties.hs_meeting_body ? `<p><span class="font-medium">Motivo/Descrição:</span> ${data.properties.hs_meeting_body}</p>` : ''}
            ${createDate ? `<p class="text-sm text-slate-500"><span class="">Registrado em:</span> ${createDate}</p>` : ''}
          </div>
        </div>
      `;

      container.innerHTML = html;
      container.classList.remove('hidden');
    },
    
    // =====================================================
    // FUNÇÕES PARA AÇÕES DO PROGRESS STEPPER
    // =====================================================
    
    openReuniaoRealizadaModal: function(meetingId) {
      var self = this;
      
      // Use o meetingId passado como parâmetro ou tente pegar do window
      var actualMeetingId = meetingId || window.currentMeetingId || '';
      
      var modalHTML = `
        <div id="reuniao-realizada-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.5); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 1rem;">
          <div style="position: relative; background: white; border-radius: 0.5rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); max-width: 28rem; width: 100%; overflow-y: auto;">
            <div style="padding: 1.5rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3 style="font-size: 1.125rem; font-weight: 500; color: #111827;">Marcar Visita como Realizada</h3>
                <button onclick="window.negocioDetalheModule.closeReuniaoRealizadaModal()" style="color: #9CA3AF; cursor: pointer; border: none; background: none; padding: 0.25rem;">
                  <svg style="width: 1.5rem; height: 1.5rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              
              <form id="reuniao-realizada-form" style="display: flex; flex-direction: column; gap: 1rem;">
                <input type="hidden" id="reuniao-meeting-id" value="${actualMeetingId}">
                
                <div>
                  <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Data da Visita</label>
                  <input type="date" id="reuniao-data" style="width: 100%; padding: 0.75rem; border: 1px solid #D1D5DB; border-radius: 0.5rem; font-size: 0.875rem;" required>
                </div>
                
                <div>
                  <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Observações</label>
                  <textarea id="reuniao-observacoes" rows="3" style="width: 100%; padding: 0.75rem; border: 1px solid #D1D5DB; border-radius: 0.5rem; font-size: 0.875rem; resize: vertical;" placeholder="Descreva como foi a reunião..."></textarea>
                </div>
                
                <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
                  <button type="button" onclick="window.negocioDetalheModule.closeReuniaoRealizadaModal()" style="padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; color: #374151; background: white; border: 1px solid #D1D5DB; border-radius: 0.5rem; cursor: pointer;">
                    Cancelar
                  </button>
                  <button type="submit" style="padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; color: white; background: #2563EB; border: none; border-radius: 0.5rem; cursor: pointer;">
                    Confirmar Reunião
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', modalHTML);
      
      // Configurar formulário
      document.getElementById('reuniao-realizada-form').addEventListener('submit', function(e) {
        e.preventDefault();
        self.confirmarReuniaoRealizada();
      });
      
      // ESC para fechar
      this.escReuniaoHandler = function(e) {
        if (e.key === 'Escape') self.closeReuniaoRealizadaModal();
      };
      document.addEventListener('keydown', this.escReuniaoHandler);
    },
    
    closeReuniaoRealizadaModal: function() {
      var modal = document.getElementById('reuniao-realizada-modal');
      if (modal) {
        document.removeEventListener('keydown', this.escReuniaoHandler);
        modal.remove();
      }
    },
    
    confirmarReuniaoRealizada: function() {
      var self = this;
      var data = document.getElementById('reuniao-data').value;
      var observacoes = document.getElementById('reuniao-observacoes').value;
      var meetingId = document.getElementById('reuniao-meeting-id').value;
      
      if (!data) {
        this.showToast('Por favor, informe a data da reunião.', 'warning');
        return;
      }
      
      // Obter IDs necessários
      var ticketId = window.hubspotTicketPortalData ? window.hubspotTicketPortalData.data.hs_object_id : null;
      var contactId = window.hubspotUserData ? window.hubspotUserData.contactId : null;
      
      // Primeiro, atualizar o status do negócio
      this.updateStep('1095534674', 'Reunião realizada', {
        data: data,
        observacoes: observacoes,
        tipo: 'reuniao_realizada'
      });
      
      // Usar nova API para completar meeting se meetingId estiver disponível
      if (meetingId && ticketId && contactId) {
        var completeMeetingPayload = {
          contact_id: contactId,
          ticket_id: ticketId,
          meeting_id: meetingId,
          notes: observacoes || 'Visita realizada com sucesso',
          outcome: 'COMPLETED'
        };
        
        console.log('📋 Completando meeting via nova API:', completeMeetingPayload);
        
        fetch('https://n8n2.rooftop.com.br/webhook/portal/meetings/completed', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(completeMeetingPayload)
        })
        .then(function(response) {
          if (response.ok) {
            console.log('✅ Meeting marcado como COMPLETED via nova API');
            return response.json();
          } else {
            console.error('❌ Erro ao completar meeting via nova API');
            throw new Error('Erro ao completar meeting: ' + response.status);
          }
        })
        .then(function(result) {
          console.log('✅ Resultado da completion:', result);
        })
        .catch(function(error) {
          console.error('❌ Erro ao completar meeting:', error);
          // Fallback para API antiga se nova API falhar
          console.log('🔄 Tentando API antiga como fallback...');
          self.completarVisitaFallback(ticketId, contactId, meetingId, observacoes, data);
        });
      } else {
        console.warn('⚠️ Meeting ID não disponível, usando método tradicional');
        this.completarVisitaFallback(ticketId, contactId, meetingId, observacoes, data);
      }
      
      this.closeReuniaoRealizadaModal();
    },
    
    // Função fallback para completar visita usando API antiga
    completarVisitaFallback: function(ticketId, contactId, meetingId, observacoes, data) {
      var requestBody = {
        ticket_id: ticketId,
        contact_id: contactId,
        observacoes: observacoes,
        data: data
      };
      
      if (meetingId) {
        requestBody.meeting_id = meetingId;
      }
      
      fetch('https://n8n2.rooftop.com.br/webhook/portal/get-activities/m1/done', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })
      .then(function(response) {
        if (response.ok) {
          console.log('✅ Visita completada via API antiga (fallback)', requestBody);
        } else {
          console.error('❌ Erro ao marcar atividade como concluída via API antiga');
        }
      })
      .catch(function(error) {
        console.error('❌ Erro na requisição de fallback:', error);
      });
    },
    
    // Função para criar atividade "OI - Entregou documentos"
    createDocumentDeliveryActivity: function(ticketId, visitDate) {
      if (!ticketId) {
        console.error('❌ Ticket ID não disponível para criar atividade');
        return;
      }
      
      // Criar data para a atividade (usar a data da visita realizada)
      var startTime = new Date();
      if (visitDate) {
        // Se foi informada uma data da visita, usar essa data
        startTime = new Date(visitDate + 'T09:00:00.000Z');
      }
      
      var payload = {
        ticketId: parseInt(ticketId),
        title: "OI - Entregou documentos",
        // startTime: startTime,
        body: "Finalizar quando receber documentos",
        type: "OI - Entregou documentos"
      };
      
      fetch('https://n8n2.rooftop.com.br/webhook/1483d0ac-e49e-42d0-9583-6d969d80ba7b/portal/register-activities/meeting/OI - Entregou documentos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })
      .then(function(response) {
        if (response.ok) {
          console.log('✅ Atividade "OI - Entregou documentos" criada com sucesso', payload);
        } else {
          console.error('❌ Erro ao criar atividade "OI - Entregou documentos"');
        }
        return response.json();
      })
      .then(function(data) {
        console.log('📋 Resposta da criação da atividade:', data);
      })
      .catch(function(error) {
        console.error('❌ Erro na requisição de criação da atividade:', error);
      });
    },
    
    openUploadDocumentModal: function() {
      // Redirecionar para seção de documentos ou abrir modal de upload geral
      var documentosSection = document.querySelector('[data-section="documentos"]');
      if (documentosSection) {
        documentosSection.scrollIntoView({ behavior: 'smooth' });
        // Destacar seção por 2 segundos
        documentosSection.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.3)';
        setTimeout(function() {
          documentosSection.style.boxShadow = '';
        }, 2000);
      } else {
        this.showToast('Acesse a seção de documentos para fazer o upload dos arquivos necessários.', 'info');
      }
    },
    
    marcarDocumentacaoEnviada: function() {
      // Obter IDs necessários
      var ticketId = window.hubspotTicketPortalData ? window.hubspotTicketPortalData.data.hs_object_id : null;
      // Criar data com validação
      var dateTime = new Date();
      var isoStartTime;

      // Verificar se a data é válida
      if (isNaN(dateTime.getTime())) {
        // Se data inválida, usar timestamp atual
        dateTime = new Date(Date.now());
      }

      try {
        isoStartTime = dateTime.toISOString();
      } catch (error) {
        // Fallback: criar data manualmente
        console.error('Erro ao gerar ISO string:', error);
        isoStartTime = new Date(Date.now()).toISOString();
      }

      // if (confirm('Confirma que o cliente já enviou toda a documentação necessária?')) {
        console.log('📄 Marcando documentação como recebida via nova API de meetings');
        
        // Usar nova API de meetings para registrar documentos recebidos
        this.createDocumentReceivedMeeting(ticketId, isoStartTime);
        
        self.showToast('Documentação marcada como recebida. O status será atualizado.', 'success');
        // Simular atualização de status
        setTimeout(function() {
          window.location.reload();
        }, 500);
      // }
    },
    
    marcarDocumentacaoRecebida: function() {
      var self = this;
      this.showConfirm('Confirma que toda a documentação foi recebida e está completa?', function() {
        console.log('Marcando documentação como recebida');
        self.showToast('Documentação marcada como recebida. O negócio avançará para a próxima etapa.', 'success');
        
        // Simular atualização de status
        setTimeout(function() {
          window.location.reload();
        }, 500);
      });
    },
    
    // Nova função para criar meeting de documentos recebidos via nova API
    createDocumentReceivedMeeting: function(ticketId, startTime) {
      if (!ticketId) {
        console.error('❌ Ticket ID não disponível para criar meeting de documentos');
        return;
      }
      
      var dateTime = new Date(startTime);
      var meetingPayload = {
        type: 'documentos_recebidos',
        title: 'Documentos Recebidos - ' + (window.hubspotTicketPortalData?.data?.subject || 'Cliente'),
        start_time: dateTime.toISOString().replace('Z', '-03:00'), // Timezone Brasil
        end_time: dateTime.toISOString().replace('Z', '-03:00'), // Mesma hora (instantâneo)
        status: 'COMPLETED', // Já fechado
        contact_id: window.hubspotUserData?.contactId || null,
        ticket_id: ticketId.toString(),
        description: 'Documentos enviados pelo cliente e recebidos pela equipe'
      };
      
      console.log('📋 Criando meeting de documentos recebidos via nova API:', meetingPayload);
      
      fetch('https://n8n2.rooftop.com.br/webhook/portal/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(meetingPayload)
      })
      .then(function(response) {
        if (!response.ok) {
          throw new Error('Erro na resposta do servidor: ' + response.status);
        }
        return response.json();
      })
      .then(function(result) {
        console.log('✅ Meeting de documentos recebidos criado com sucesso:', result);
      })
      .catch(function(error) {
        console.error('❌ Erro ao criar meeting de documentos. Usando API antiga como fallback:', error);
        // Fallback para API antiga
        window.negocioDetalheModule.createDocumentDeliveryActivity(ticketId, startTime);
      });
    },
    
    updateStep: function(stepId, stepLabel, data) {
      var self = this;
      var ticketId = window.hubspotTicketPortalData ? window.hubspotTicketPortalData.data.hs_object_id : null;
      
      if (!ticketId) {
        this.showToast('ID do ticket do portal não encontrado.', 'error');
        return;
      }
      
      var payload = {
        ticketId: parseInt(ticketId),
        properties: {
          hs_pipeline_stage: stepId
        },
        updateSource: "portal_franqueado",
        stepLabel: stepLabel
      };
      
      // Adicionar dados extras se fornecidos
      if (data) {
        payload.additionalData = data;
      }
      
      // Adicionar contact_id do usuário logado
      if (window.hubspotUserData && window.hubspotUserData.contactId) {
        payload.contact_id = window.hubspotUserData.contactId;
      }
      
      console.log('Atualizando step:', payload);
      
      fetch('https://n8n2.rooftop.com.br/webhook/portal/update-step', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      .then(function(response) {
        if (!response.ok) {
          throw new Error('Erro na resposta do servidor: ' + response.status);
        }
        return response.json();
      })
      .then(function(result) {
        console.log('Step atualizado com sucesso:', result);
        self.showToast('Etapa atualizada com sucesso!', 'success');
        
        setTimeout(function() {
          window.location.reload();
        }, 500);
      })
      .catch(function(error) {
        console.error('Erro ao atualizar step:', error);
        self.showToast('Erro ao atualizar etapa. Tente novamente.', 'error');
      });
    },
    
    // Funções para as novas ações
    
    openMarcarReuniaoModal: function() {
      var self = this;
      
      var modalHTML = `
        <div id="marcar-reuniao-inicial-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.5); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 1rem;">
          <div style="position: relative; background: white; border-radius: 0.5rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); max-width: 32rem; width: 100%; overflow-y: auto;">
            <div style="padding: 1.5rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3 style="font-size: 1.125rem; font-weight: 500; color: #111827;">Agendar Reunião</h3>
                <button onclick="window.negocioDetalheModule.closeMarcarReuniaoInicialModal()" style="color: #9CA3AF; cursor: pointer; border: none; background: none; padding: 0.25rem;">
                  <svg style="width: 1.5rem; height: 1.5rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              
              <form id="marcar-reuniao-inicial-form" style="display: flex; flex-direction: column; gap: 1rem;">
               
                
                <div>
                  <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Data e Hora</label>
                  <input type="datetime-local" id="reuniao-start-time" style="width: 100%; padding: 0.75rem; border: 1px solid #D1D5DB; border-radius: 0.5rem; font-size: 0.875rem;" required>
                </div>
                
                <div>
                  <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Descrição</label>
                  <textarea id="reuniao-body" rows="3" style="width: 100%; padding: 0.75rem; border: 1px solid #D1D5DB; border-radius: 0.5rem; font-size: 0.875rem; resize: vertical;" placeholder="Descreva o objetivo da reunião..." required></textarea>
                </div>
                
               
                
                <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
                  <button type="button" onclick="window.negocioDetalheModule.closeMarcarReuniaoInicialModal()" style="padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; color: #374151; background: white; border: 1px solid #D1D5DB; border-radius: 0.5rem; cursor: pointer;">
                    Cancelar
                  </button>
                  <button type="submit" style="padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; color: white; background: #2563EB; border: none; border-radius: 0.5rem; cursor: pointer;">
                    Agendar Reunião
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', modalHTML);
      
      // Preencher data atual + 1 dia como padrão
      var tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(14, 0, 0, 0); // 14:00 como horário padrão
      var isoString = tomorrow.toISOString().slice(0, 16);
      document.getElementById('reuniao-start-time').value = isoString;
      
      document.getElementById('marcar-reuniao-inicial-form').addEventListener('submit', function(e) {
        e.preventDefault();
        self.confirmarAgendamentoReuniaoInicial();
      });
      
      this.escMarcarReuniaoInicialHandler = function(e) {
        if (e.key === 'Escape') self.closeMarcarReuniaoInicialModal();
      };
      document.addEventListener('keydown', this.escMarcarReuniaoInicialHandler);
    },
    
    closeMarcarReuniaoInicialModal: function() {
      var modal = document.getElementById('marcar-reuniao-inicial-modal');
      if (modal) {
        document.removeEventListener('keydown', this.escMarcarReuniaoInicialHandler);
        modal.remove();
      }
    },
    
    confirmarAgendamentoReuniaoInicial: function() {
      var self = this;
      var titulo = 'Visita marcada (T.A)';
      var startTime = document.getElementById('reuniao-start-time').value;
      var body = document.getElementById('reuniao-body').value.trim();
      var internalNotes = document.getElementById('reuniao-body').value.trim();
      
      if (!titulo || !startTime || !body) {
        self.showToast('Por favor, preencha todos os campos obrigatórios.', 'warning');
        return;
      }
      
      var ticketId = window.hubspotTicketPortalData ? window.hubspotTicketPortalData.data.hs_object_id : null;
      
      if (!ticketId) {
        this.showToast('ID do ticket do portal não encontrado.', 'error');
        return;
      }
      
      // Converter datetime-local para formato ISO com timezone
      var dateTime = new Date(startTime);
      var isoStartTime = dateTime.toISOString();
      
      var payload = {
        ticketId: parseInt(ticketId),
        title: titulo,
        startTime: isoStartTime,
        body: body,
        internalMeetingNotes: internalNotes || ''
      };
      
      // Adicionar contact_id do usuário logado
      if (window.hubspotUserData && window.hubspotUserData.contactId) {
        payload.contact_id = window.hubspotUserData.contactId;
      }
      
      // Preparar payload para nova API de meetings
      var meetingPayload = {
        type: 'marcar_visita',
        title: 'Visita - ' + (window.hubspotTicketPortalData?.data?.subject || 'Cliente'),
        start_time: dateTime.toISOString().replace('Z', '-03:00'), // Timezone Brasil
        end_time: new Date(dateTime.getTime() + 60 * 60 * 1000).toISOString().replace('Z', '-03:00'), // +1 hora
        contact_id: window.hubspotUserData?.contactId || null,
        ticket_id: ticketId.toString(),
        description: body
      };
      
      console.log('📅 Agendando meeting via nova API (type: marcar_visita):', meetingPayload);
      
      fetch('https://n8n2.rooftop.com.br/webhook/portal/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(meetingPayload)
      })
      .then(function(response) {
        if (!response.ok) {
          throw new Error('Erro na resposta do servidor: ' + response.status);
        }
        return response.json();
      })
      .then(function(result) {
        console.log('✅ Meeting agendado com sucesso via nova API:', result);
        
        // Salvar meeting_id para usar quando confirmar visita realizada
        if (result && result.meeting_id) {
          window.currentMeetingId = result.meeting_id;
          console.log('📝 Meeting ID salvo:', result.meeting_id);
        }
        
        self.showToast('Reunião agendada com sucesso!', 'success');
        
        // Após agendar, atualizar o step para "Reunião marcada"
        return window.negocioDetalheModule.updateStep('1095534673', 'Reunião marcada', {
          tipo: 'agendamento_reuniao',
          titulo: 'Visita - ' + (window.hubspotTicketPortalData?.data?.subject || 'Cliente'),
          dataHora: meetingPayload.start_time,
          meeting_id: result.meeting_id
        });
      })
      .then(function() {
        window.negocioDetalheModule.closeMarcarReuniaoInicialModal();
      })
      .catch(function(error) {
        console.error('Erro ao agendar reunião:', error);
        self.showToast('Erro ao agendar reunião. Tente novamente.', 'error');
      });
    },

    // =========================================================================
    // FUNÇÕES PARA 2ª REUNIÃO (AGENDAR 2ª VISITA)
    // =========================================================================

    openMarcar2aReuniaoModal: function() {
      var self = this;

      var modalHTML = `
        <div id="marcar-2a-reuniao-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.5); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 1rem;">
          <div style="position: relative; background: white; border-radius: 0.5rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); max-width: 32rem; width: 100%; overflow-y: auto;">
            <div style="padding: 1.5rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3 style="font-size: 1.125rem; font-weight: 500; color: #111827;">Agendar 2ª Reunião</h3>
                <button onclick="window.negocioDetalheModule.closeMarcar2aReuniaoModal()" style="color: #9CA3AF; cursor: pointer; border: none; background: none; padding: 0.25rem;">
                  <svg style="width: 1.5rem; height: 1.5rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <form id="marcar-2a-reuniao-form" style="display: flex; flex-direction: column; gap: 1rem;">
                <div>
                  <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Data e Hora</label>
                  <input type="datetime-local" id="reuniao2-start-time" style="width: 100%; padding: 0.75rem; border: 1px solid #D1D5DB; border-radius: 0.5rem; font-size: 0.875rem;" required>
                </div>

                <div>
                  <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Observações</label>
                  <textarea id="reuniao2-body" rows="3" style="width: 100%; padding: 0.75rem; border: 1px solid #D1D5DB; border-radius: 0.5rem; font-size: 0.875rem; resize: vertical;" placeholder="Descreva o objetivo da 2ª reunião..." required></textarea>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
                  <button type="button" onclick="window.negocioDetalheModule.closeMarcar2aReuniaoModal()" style="padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; color: #374151; background: white; border: 1px solid #D1D5DB; border-radius: 0.5rem; cursor: pointer;">
                    Cancelar
                  </button>
                  <button type="submit" style="padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; color: white; background: #2563EB; border: none; border-radius: 0.5rem; cursor: pointer;">
                    Agendar 2ª Reunião
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', modalHTML);

      // Preencher data atual + 1 dia como padrão
      var tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(14, 0, 0, 0); // 14:00 como horário padrão
      var isoString = tomorrow.toISOString().slice(0, 16);
      document.getElementById('reuniao2-start-time').value = isoString;

      document.getElementById('marcar-2a-reuniao-form').addEventListener('submit', function(e) {
        e.preventDefault();
        self.confirmarAgendamento2aReuniaoInicial();
      });

      this.escMarcar2aReuniaoHandler = function(e) {
        if (e.key === 'Escape') self.closeMarcar2aReuniaoModal();
      };
      document.addEventListener('keydown', this.escMarcar2aReuniaoHandler);
    },

    closeMarcar2aReuniaoModal: function() {
      var modal = document.getElementById('marcar-2a-reuniao-modal');
      if (modal) {
        document.removeEventListener('keydown', this.escMarcar2aReuniaoHandler);
        modal.remove();
      }
    },

    confirmarAgendamento2aReuniaoInicial: function() {
      var self = this;
      var titulo = '2ª Visita marcada';
      var startTimeElement = document.getElementById('reuniao2-start-time');
      var startTime = startTimeElement ? startTimeElement.value.trim() : '';
      var body = document.getElementById('reuniao2-body').value.trim();
      var internalNotes = document.getElementById('reuniao2-body').value.trim();

      // Validação explícita e obrigatória de data/hora
      if (!startTime) {
        self.showToast('Por favor, preencha a data e hora da reunião. Este campo é obrigatório.', 'warning');
        if (startTimeElement) {
          startTimeElement.focus();
          startTimeElement.style.borderColor = '#EF4444';
          setTimeout(function() {
            startTimeElement.style.borderColor = '#D1D5DB';
          }, 3000);
        }
        return;
      }

      // Validar se a data/hora não está vazia após trim
      if (startTime === '') {
        self.showToast('Por favor, preencha a data e hora da reunião. Este campo é obrigatório.', 'warning');
        return;
      }

      // Validar formato de data/hora
      var dateTime = new Date(startTime);
      if (isNaN(dateTime.getTime())) {
        self.showToast('Por favor, insira uma data e hora válidas.', 'warning');
        return;
      }

      if (!titulo || !body) {
        self.showToast('Por favor, preencha todos os campos obrigatórios.', 'warning');
        return;
      }

      var ticketId = window.hubspotTicketPortalData ? window.hubspotTicketPortalData.data.hs_object_id : null;

      if (!ticketId) {
        this.showToast('ID do ticket do portal não encontrado.', 'error');
        return;
      }

      // Converter datetime-local para formato ISO com timezone (dateTime já foi validado acima)
      var isoStartTime = dateTime.toISOString();

      // Preparar payload para API de meetings
      var meetingPayload = {
        type: 'marcar_2a_visita',
        title: '2ª Visita - ' + (window.hubspotTicketPortalData?.data?.subject || 'Cliente'),
        start_time: dateTime.toISOString().replace('Z', '-03:00'), // Timezone Brasil
        end_time: new Date(dateTime.getTime() + 60 * 60 * 1000).toISOString().replace('Z', '-03:00'), // +1 hora
        contact_id: window.hubspotUserData?.contactId || null,
        ticket_id: ticketId.toString(),
        description: body
      };

      console.log('📅 Agendando 2ª meeting via API (type: marcar_2a_visita):', meetingPayload);

      fetch('https://n8n2.rooftop.com.br/webhook/portal/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(meetingPayload)
      })
      .then(function(response) {
        if (!response.ok) {
          throw new Error('Erro na resposta do servidor: ' + response.status);
        }
        return response.json();
      })
      .then(function(result) {
        console.log('✅ 2ª Meeting agendada com sucesso via API:', result);

        // Salvar meeting_id para usar quando confirmar 2ª visita realizada
        if (result && result.meeting_id) {
          window.current2MeetingId = result.meeting_id;
          console.log('📝 2ª Meeting ID salvo:', result.meeting_id);
        }

        self.showToast('2ª Reunião agendada com sucesso!', 'success');

        // Após agendar, atualizar o step para "2ª Reunião marcada" (etapa 1207696559)
        return window.negocioDetalheModule.updateStep('1207696559', '2ª Reunião marcada', {
          tipo: 'agendamento_2a_reuniao',
          titulo: '2ª Visita - ' + (window.hubspotTicketPortalData?.data?.subject || 'Cliente'),
          dataHora: meetingPayload.start_time,
          meeting_id: result.meeting_id
        });
      })
      .then(function() {
        window.negocioDetalheModule.closeMarcar2aReuniaoModal();
      })
      .catch(function(error) {
        console.error('Erro ao agendar 2ª reunião:', error);
        self.showToast('Erro ao agendar 2ª reunião. Tente novamente.', 'error');
      });
    },

    confirmarEnvioDocumentacao: function() {
      console.log('Dc envada') 
      this.updateStep('1043275525', 'Documentação enviada', {
        tipo: 'confirmacao_documentacao'
      });
      this.marcarDocumentacaoEnviada()
    },
    
    confirmarDocumentosComplementares: function() {
      var self = this;
      this.showConfirm('Confirma que todos os documentos complementares foram enviados pelo cliente?', function() {
        // Criar meeting de documentos complementares via nova API
        self.createComplementaryDocumentsMeeting();
        
        self.updateStep('1043275527', 'Pré Análise e Due Diligence', {
          tipo: 'confirmacao_documentos_complementares'
        });
      });
    },
    
    // Nova função para criar meeting de documentos complementares via nova API
    createComplementaryDocumentsMeeting: function() {
      var ticketId = window.hubspotTicketPortalData ? window.hubspotTicketPortalData.data.hs_object_id : null;
      
      if (!ticketId) {
        console.error('❌ Ticket ID não disponível para criar meeting de documentos complementares');
        return;
      }
      
      // Criar data atual
      var dateTime = new Date();
      var meetingPayload = {
        type: 'documentos_complementares',
        title: 'Documentos Complementares Enviados - ' + (window.hubspotTicketPortalData?.data?.subject || 'Cliente'),
        start_time: dateTime.toISOString().replace('Z', '-03:00'), // Timezone Brasil
        end_time: dateTime.toISOString().replace('Z', '-03:00'), // Mesma hora (instantâneo)
        status: 'COMPLETED', // Já fechado
        contact_id: window.hubspotUserData?.contactId || null,
        ticket_id: ticketId.toString(),
        description: 'Documentos complementares enviados pelo cliente e confirmados pela equipe'
      };
      
      console.log('📋 Criando meeting de documentos complementares via nova API:', meetingPayload);
      
      fetch('https://n8n2.rooftop.com.br/webhook/portal/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(meetingPayload)
      })
      .then(function(response) {
        if (!response.ok) {
          throw new Error('Erro na resposta do servidor: ' + response.status);
        }
        return response.json();
      })
      .then(function(result) {
        console.log('✅ Meeting de documentos complementares criado com sucesso:', result);
      })
      .catch(function(error) {
        console.error('❌ Erro ao criar meeting de documentos complementares:', error);
        // Não há API antiga para documentos complementares, apenas log do erro
      });
    },
    
    openApresentacaoRealizadaModal: function() {
      var self = this;

      // Obter dados do ticket e etapa atual
      var ticketData = window.hubspotTicketPortalData ? window.hubspotTicketPortalData.data : null;
      var currentStep = ticketData ? ticketData.hs_pipeline_stage : null;

      // Calcular valor médio das amostras
      var valorLimpo = ticketData?.valor_medio_amostras ? String(ticketData.valor_medio_amostras).replace(/R\$\s*/g, '').trim() : '0';
      var valorMedioAmostrasNumero = this.parseCurrencyValue(valorLimpo);
      console.log('currentStep', currentStep)
      // Verificar condições para mostrar opção de avaliação externa
      var mostrarAvaliacaoExterna = valorMedioAmostrasNumero < 2000000 && currentStep === '1207696559';

      console.log('🔍 [Modal Apresentação] Valor imóvel:', valorMedioAmostrasNumero, '| Etapa atual:', currentStep, '| Mostrar avaliação externa:', mostrarAvaliacaoExterna);

      // Gerar opções do select de motivos de perda
      var motivosOptions = Object.entries(this.motivosPerda)
        .map(function(item) {
          return '<option value="' + item[0] + '">' + item[1] + '</option>';
        })
        .join('');

      var modalHTML = `
        <div id="apresentacao-realizada-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.5); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 1rem;">
          <div style="position: relative; background: white; border-radius: 0.5rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); max-width: 32rem; width: 100%; overflow-y: auto; max-height: 90vh;">
            <div style="padding: 1.5rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3 style="font-size: 1.125rem; font-weight: 500; color: #111827;">Resultado da apresentação</h3>
                <button onclick="window.negocioDetalheModule.closeApresentacaoRealizadaModal()" style="color: #9CA3AF; cursor: pointer; border: none; background: none; padding: 0.25rem;">
                  <svg style="width: 1.5rem; height: 1.5rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <form id="apresentacao-realizada-form" style="display: flex; flex-direction: column; gap: 1rem;">
                <div>
                  <label id="apresentacao-data-label" style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Data da Apresentação</label>
                  <input type="date" id="apresentacao-data" style="width: 100%; padding: 0.75rem; border: 1px solid #D1D5DB; border-radius: 0.5rem; font-size: 0.875rem;" required>
                </div>
≈
                <div>
                  <label id="apresentacao-resultado-label" style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">
                    Resultado da Apresentação <span style="color: #EF4444;">*</span>
                  </label>
                  <textarea id="apresentacao-resultado" rows="4" style="width: 100%; padding: 0.75rem; border: 1px solid #D1D5DB; border-radius: 0.5rem; font-size: 0.875rem; resize: vertical;" placeholder="Faltou algum valor para o aceite do cliente? Quais dividas ele precisa quitar e por isso precisa de mais capital?" required></textarea>
                  <p style="font-size: 0.75rem; color: #6B7280; margin-top: 0.25rem;">Mínimo 10 caracteres - Descreva o resultado da apresentação</p>
                </div>

                <div>
                  <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Próximo Passo</label>
                  <select id="apresentacao-proximo-passo" style="width: 100%; padding: 0.75rem; border: 1px solid #D1D5DB; border-radius: 0.5rem; font-size: 0.875rem; background-color: white;" required>
                    <option value="">Selecione o próximo passo</option>
                    ${mostrarAvaliacaoExterna ? '<option value="avaliacao_externa">Solicitar avaliação externa</option>' : '<option value="formalizar">Solicitar formalização de contrato</option>'}
                    <!-- <option value="renegociar">Solicitar reajuste da proposta</option> -->
                    <option value="standby">Pausar negociação (Stand by)</option>
                    <option value="perdido">Cliente NÃO quer seguir (Perder o lead)</option>
                  </select>
                </div>

                <!-- Campo de Motivo da Perda (inicialmente oculto) -->
                <div id="motivo-perda-container" style="display: none;">
                  <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">
                    Motivo da Perda <span style="color: #EF4444;">*</span>
                  </label>
                  <select id="apresentacao-motivo-perda" style="width: 100%; padding: 0.75rem; border: 1px solid #D1D5DB; border-radius: 0.5rem; font-size: 0.875rem; background-color: white;">
                    <option value="">Selecione o motivo...</option>
                    ${motivosOptions}
                  </select>
                  <p style="font-size: 0.75rem; color: #6B7280; margin-top: 0.25rem;">É obrigatório informar o motivo quando o cliente não quer seguir</p>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
                  <button type="button" onclick="window.negocioDetalheModule.closeApresentacaoRealizadaModal()" style="padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; color: #374151; background: white; border: 1px solid #D1D5DB; border-radius: 0.5rem; cursor: pointer;">
                    Cancelar
                  </button>
                  <button type="submit" style="padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; color: white; background: #2563EB; border: none; border-radius: 0.5rem; cursor: pointer;">
                    Confirmar Apresentação
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', modalHTML);

      // Preencher data atual como padrão
      var today = new Date();
      var todayString = today.toISOString().slice(0, 10);
      document.getElementById('apresentacao-data').value = todayString;

      // Event listener para mostrar/ocultar campo de motivo da perda e alterar labels
      document.getElementById('apresentacao-proximo-passo').addEventListener('change', function() {
        var motivoPerdaContainer = document.getElementById('motivo-perda-container');
        var motivoPerdaSelect = document.getElementById('apresentacao-motivo-perda');
        var dataLabel = document.getElementById('apresentacao-data-label');
        var resultadoLabel = document.getElementById('apresentacao-resultado-label');

        if (this.value === 'perdido') {
          motivoPerdaContainer.style.display = 'block';
          motivoPerdaSelect.setAttribute('required', 'required');
        } else {
          motivoPerdaContainer.style.display = 'none';
          motivoPerdaSelect.removeAttribute('required');
          motivoPerdaSelect.value = ''; // Limpar seleção
        }

        // Alterar labels quando avaliação externa for selecionada
        if (this.value === 'avaliacao_externa') {
          dataLabel.textContent = 'Data combinada com o cliente';
          resultadoLabel.innerHTML = 'Comentários para o avaliador externo <span style="color: #EF4444;">*</span>';
        } else {
          dataLabel.textContent = 'Data da Apresentação';
          resultadoLabel.innerHTML = 'Resultado da Apresentação <span style="color: #EF4444;">*</span>';
        }
      });

      document.getElementById('apresentacao-realizada-form').addEventListener('submit', function(e) {
        e.preventDefault();
        self.confirmarApresentacaoRealizada();
      });

      this.escApresentacaoRealizadaHandler = function(e) {
        if (e.key === 'Escape') self.closeApresentacaoRealizadaModal();
      };
      document.addEventListener('keydown', this.escApresentacaoRealizadaHandler);
    },
    
    closeApresentacaoRealizadaModal: function() {
      var modal = document.getElementById('apresentacao-realizada-modal');
      if (modal) {
        document.removeEventListener('keydown', this.escApresentacaoRealizadaHandler);
        modal.remove();
      }
    },

    // =====================================================
    // MODAL RESULTADO SEGUNDA PROPOSTA
    // =====================================================

    openResultadoSegundaPropostaModal: function() {
      var self = this;

      // Gerar opções do select de motivos de perda
      var motivosOptions = Object.entries(this.motivosPerda)
        .map(function(item) {
          return '<option value="' + item[0] + '">' + item[1] + '</option>';
        })
        .join('');

      var modalHTML = `
        <div id="segunda-proposta-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.5); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 1rem;">
          <div style="position: relative; background: white; border-radius: 0.5rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); max-width: 32rem; width: 100%; overflow-y: auto; max-height: 90vh;">
            <div style="padding: 1.5rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3 style="font-size: 1.125rem; font-weight: 500; color: #111827;">Resultado da Segunda Proposta</h3>
                <button onclick="window.negocioDetalheModule.closeResultadoSegundaPropostaModal()" style="color: #9CA3AF; cursor: pointer; border: none; background: none; padding: 0.25rem;">
                  <svg style="width: 1.5rem; height: 1.5rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <form id="segunda-proposta-form" style="display: flex; flex-direction: column; gap: 1rem;">
                <div>
                  <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Data da Apresentação</label>
                  <input type="date" id="segunda-proposta-data" style="width: 100%; padding: 0.75rem; border: 1px solid #D1D5DB; border-radius: 0.5rem; font-size: 0.875rem;" required>
                </div>

                <div>
                  <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">
                    Resultado/Comentários <span style="color: #EF4444;">*</span>
                  </label>
                  <textarea id="segunda-proposta-resultado" rows="4" style="width: 100%; padding: 0.75rem; border: 1px solid #D1D5DB; border-radius: 0.5rem; font-size: 0.875rem; resize: vertical;" placeholder="Descreva o resultado da apresentação da segunda proposta..." required></textarea>
                  <p style="font-size: 0.75rem; color: #6B7280; margin-top: 0.25rem;">Mínimo 10 caracteres - Descreva o resultado da apresentação</p>
                </div>

                <div>
                  <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Próximo Passo</label>
                  <select id="segunda-proposta-proximo-passo" style="width: 100%; padding: 0.75rem; border: 1px solid #D1D5DB; border-radius: 0.5rem; font-size: 0.875rem; background-color: white;" required>
                    <option value="">Selecione o próximo passo</option>
                    <option value="formalizar">Seguir para formalização</option>
                    <option value="renegociar">Solicitar reajuste da proposta</option>
                    <option value="standby">Pausar negociação (Stand by)</option>
                    <option value="perdido">Cliente NÃO quer seguir (Perder o lead)</option>
                  </select>
                </div>

                <!-- Campo de Motivo da Perda (inicialmente oculto) -->
                <div id="segunda-proposta-motivo-perda-container" style="display: none;">
                  <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">
                    Motivo da Perda <span style="color: #EF4444;">*</span>
                  </label>
                  <select id="segunda-proposta-motivo-perda" style="width: 100%; padding: 0.75rem; border: 1px solid #D1D5DB; border-radius: 0.5rem; font-size: 0.875rem; background-color: white;">
                    <option value="">Selecione o motivo...</option>
                    ${motivosOptions}
                  </select>
                  <p style="font-size: 0.75rem; color: #6B7280; margin-top: 0.25rem;">É obrigatório informar o motivo quando o cliente não quer seguir</p>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
                  <button type="button" onclick="window.negocioDetalheModule.closeResultadoSegundaPropostaModal()" style="padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; color: #374151; background: white; border: 1px solid #D1D5DB; border-radius: 0.5rem; cursor: pointer;">
                    Cancelar
                  </button>
                  <button type="submit" style="padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; color: white; background: #2563EB; border: none; border-radius: 0.5rem; cursor: pointer;">
                    Confirmar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', modalHTML);

      // Preencher data atual como padrão
      var today = new Date();
      var todayString = today.toISOString().slice(0, 10);
      document.getElementById('segunda-proposta-data').value = todayString;

      // Event listener para mostrar/ocultar campo de motivo da perda
      document.getElementById('segunda-proposta-proximo-passo').addEventListener('change', function() {
        var motivoPerdaContainer = document.getElementById('segunda-proposta-motivo-perda-container');
        var motivoPerdaSelect = document.getElementById('segunda-proposta-motivo-perda');

        if (this.value === 'perdido') {
          motivoPerdaContainer.style.display = 'block';
          motivoPerdaSelect.setAttribute('required', 'required');
        } else {
          motivoPerdaContainer.style.display = 'none';
          motivoPerdaSelect.removeAttribute('required');
          motivoPerdaSelect.value = ''; // Limpar seleção
        }
      });

      document.getElementById('segunda-proposta-form').addEventListener('submit', function(e) {
        e.preventDefault();
        self.confirmarResultadoSegundaProposta();
      });

      this.escSegundaPropostaHandler = function(e) {
        if (e.key === 'Escape') self.closeResultadoSegundaPropostaModal();
      };
      document.addEventListener('keydown', this.escSegundaPropostaHandler);
    },

    closeResultadoSegundaPropostaModal: function() {
      var modal = document.getElementById('segunda-proposta-modal');
      if (modal) {
        document.removeEventListener('keydown', this.escSegundaPropostaHandler);
        modal.remove();
      }
    },

    confirmarResultadoSegundaProposta: function() {
      var self = this;
      var data = document.getElementById('segunda-proposta-data').value.trim();
      var resultado = document.getElementById('segunda-proposta-resultado').value.trim();
      var proximoPasso = document.getElementById('segunda-proposta-proximo-passo').value.trim();
      var motivoPerda = document.getElementById('segunda-proposta-motivo-perda').value.trim();

      // Validar data
      if (!data) {
        self.showToast('Por favor, selecione a data da apresentação.', 'warning');
        return;
      }

      // Validar próximo passo
      if (!proximoPasso) {
        self.showToast('Por favor, selecione o próximo passo.', 'warning');
        return;
      }

      // Validar resultado (obrigatório para todas as opções)
      if (!resultado) {
        self.showToast('Por favor, preencha o campo "Resultado/Comentários".', 'warning');
        return;
      }

      // Validar tamanho mínimo do resultado (mínimo 10 caracteres)
      if (resultado.length < 10) {
        self.showToast('O campo "Resultado/Comentários" deve ter no mínimo 10 caracteres. Atual: ' + resultado.length + '/10', 'warning');
        return;
      }

      // Validar motivo da perda quando opção "perdido" é selecionada
      if (proximoPasso === 'perdido' && !motivoPerda) {
        self.showToast('Por favor, selecione o motivo da perda.', 'warning');
        return;
      }

      // Formatar data para DD/MM/AAAA
      var dateObj = new Date(data + 'T12:00:00'); // Adicionar horário para evitar problemas de timezone
      var formattedDate = dateObj.toLocaleDateString('pt-BR');

      // Determinar próxima etapa baseado na seleção
      var proximaEtapa, proximoLabel;

      if (proximoPasso === 'formalizar') {
        proximaEtapa = '1095528867';
        proximoLabel = 'Documentação para formalização';
      } else if (proximoPasso === 'renegociar') {
        // proximaEtapa = '1062003578';
        proximaEtapa = '1095528866';
        proximoLabel = 'Pedido de Reajuste da proposta';
      } else if (proximoPasso === 'standby') {
        proximaEtapa = '1206453052';
        proximoLabel = 'Pausar negociação e esperar novo contato';
      } else if (proximoPasso === 'perdido') {
        proximaEtapa = '1095528873';
        proximoLabel = 'Perdido';
      }

      // Criar meeting similar a createPresentationMeeting
      if (proximoPasso === 'standby' || proximoPasso === 'perdido') {
        this.createPresentationMeetingStandy(data, resultado, proximoPasso, motivoPerda);
      } else {
        // Criar meeting de segunda proposta
        this.createSegundaPropostaMeeting(data, resultado, proximoPasso);
      }

      // Preparar dados para enviar ao updateStep
      var updateData = {
        data: formattedDate,
        resultado: resultado,
        proximo_passo: proximoPasso,
        tipo: 'segunda_proposta_realizada'
      };

      // Se for standby, salvar a etapa anterior (Segunda proposta cliente)
      if (proximoPasso === 'standby') {
        updateData.etapa_anterior_standby = '1208820114'; // Segunda proposta cliente
      }

      // Se for perdido, adicionar motivo da perda e seu label
      if (proximoPasso === 'perdido' && motivoPerda) {
        updateData.motivo_perda = motivoPerda;
        updateData.motivo_perda_label = self.motivosPerda[motivoPerda] || motivoPerda;
        updateData.ticket_motivo_da_perda = motivoPerda;
        updateData.ticket_detalhe_o_motivo_da_perda = resultado;
      }

      this.updateStep(proximaEtapa, proximoLabel, updateData);

      this.closeResultadoSegundaPropostaModal();
    },

    // Função para criar meeting de segunda proposta
    createSegundaPropostaMeeting: function(data, resultado, proximoPasso) {
      var ticketId = window.hubspotTicketPortalData ? window.hubspotTicketPortalData.data.hs_object_id : null;

      if (!ticketId) {
        console.error('❌ Ticket ID não disponível para criar meeting de segunda proposta');
        return;
      }

      // Converter data para datetime no meio do dia (15:00 como padrão)
      var dateTime = new Date(data + 'T15:00:00');

      var description = 'Segunda proposta apresentada ao cliente. ';
      description += 'Resultado: ' + resultado + '. ';
      description += 'Próximo passo: ' + (proximoPasso === 'renegociar' ? 'Solicitar reajuste da proposta' : 'Seguir para formalização');

      var meetingPayload = {
        type: 'segunda_proposta_apresentada',
        title: 'Segunda Proposta Apresentada - ' + (window.hubspotTicketPortalData?.data?.subject || 'Cliente'),
        start_time: dateTime.toISOString().replace('Z', '-03:00'), // Timezone Brasil
        end_time: new Date(dateTime.getTime() + 60 * 60 * 1000).toISOString().replace('Z', '-03:00'), // +1 hora
        status: 'COMPLETED', // Já fechado
        contact_id: window.hubspotUserData?.contactId || null,
        ticket_id: ticketId.toString(),
        description: description
      };

      console.log('🎯 Criando meeting de segunda proposta via nova API:', meetingPayload);

      fetch('https://n8n2.rooftop.com.br/webhook/portal/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(meetingPayload)
      })
      .then(function(response) {
        if (!response.ok) {
          throw new Error('Erro na resposta do servidor: ' + response.status);
        }
        return response.json();
      })
      .then(function(result) {
        console.log('✅ Meeting de segunda proposta criado com sucesso:', result);
      })
      .catch(function(error) {
        console.error('❌ Erro ao criar meeting de segunda proposta:', error);
      });
    },

    confirmarApresentacaoRealizada: function() {
      var self = this;
      var data = document.getElementById('apresentacao-data').value.trim();
      var resultado = document.getElementById('apresentacao-resultado').value.trim();
      var proximoPasso = document.getElementById('apresentacao-proximo-passo').value.trim();
      var motivoPerda = document.getElementById('apresentacao-motivo-perda').value.trim();

      // Validar data
      if (!data) {
        self.showToast('Por favor, selecione a data da apresentação.', 'warning');
        return;
      }

      // Validar próximo passo
      if (!proximoPasso) {
        self.showToast('Por favor, selecione o próximo passo.', 'warning');
        return;
      }

      // Validar resultado da apresentação (obrigatório para todas as opções)
      if (!resultado) {
        self.showToast('Por favor, preencha o campo "Resultado da Apresentação".', 'warning');
        return;
      }

      // Validar tamanho mínimo do resultado (mínimo 10 caracteres)
      if (resultado.length < 10) {
        self.showToast('O campo "Resultado da Apresentação" deve ter no mínimo 10 caracteres. Atual: ' + resultado.length + '/10', 'warning');
        return;
      }

      // Validar motivo da perda quando opção "perdido" é selecionada
      if (proximoPasso === 'perdido' && !motivoPerda) {
        self.showToast('Por favor, selecione o motivo da perda.', 'warning');
        return;
      }

      // Formatar data para DD/MM/AAAA
      var dateObj = new Date(data + 'T12:00:00'); // Adicionar horário para evitar problemas de timezone
      var formattedDate = dateObj.toLocaleDateString('pt-BR');

      // Determinar próxima etapa baseado na seleção
      var proximaEtapa, proximoLabel;

      if (proximoPasso === 'renegociar') {
        proximaEtapa = '1062003578';
        proximoLabel = 'Pedido de Contraproposta do cliente';
      } else if (proximoPasso === 'formalizar') {
        proximaEtapa = '1095528867';
        proximoLabel = 'Documentação para formalização';
      } else if (proximoPasso === 'avaliacao_externa') {
        proximaEtapa = '1186972699';
        proximoLabel = 'Avaliação externa';
      } else if (proximoPasso === 'standby') {
        proximaEtapa = '1206453052';
        proximoLabel = 'Pausar negociação e esperar novo contato';
      } else if (proximoPasso === 'perdido') {
        proximaEtapa = '1095528873';
        proximoLabel = 'Perdido';
      }

      if(proximoPasso === 'standby' || proximoPasso === 'perdido') {
        this.createPresentationMeetingStandy(data, resultado, proximoPasso, motivoPerda);
      } else {
        this.createPresentationMeeting(data, resultado, proximoPasso);
      }

      // Preparar dados para enviar ao updateStep
      var updateData = {
        data: formattedDate,
        resultado: resultado,
        proximo_passo: proximoPasso,
        tipo: 'apresentacao_realizada'
      };

      // Se for standby, salvar a etapa anterior (2ª Reunião marcada)
      if (proximoPasso === 'standby') {
        updateData.etapa_anterior_standby = '1207696559'; // 2ª Reunião marcada
      }

      // Se for perdido, adicionar motivo da perda e seu label
      if (proximoPasso === 'perdido' && motivoPerda) {
        updateData.motivo_perda = motivoPerda;
        updateData.motivo_perda_label = self.motivosPerda[motivoPerda] || motivoPerda;
        updateData.ticket_motivo_da_perda = motivoPerda;
        updateData.ticket_detalhe_o_motivo_da_perda = resultado;
      }

      this.updateStep(proximaEtapa, proximoLabel, updateData);

      this.closeApresentacaoRealizadaModal();
    },
    
    // Nova função para criar meeting de apresentação realizada com resultado Standy e Perdido
    createPresentationMeetingStandy: function(data, resultado, proximoPasso, motivoPerda) {
      var self = this;
      var ticketId = window.hubspotTicketPortalData ? window.hubspotTicketPortalData.data.hs_object_id : null;

      if (!ticketId) {
        console.error('❌ Ticket ID não disponível para criar meeting de apresentação');
        return;
      }

      // Converter data para datetime no meio do dia (15:00 como padrão)
      var dateTime = new Date(data + 'T15:00:00');

      var description = '';
      var meetingType = '';
      var meetingTitle = '';

      // Determinar tipo de meeting e descrição baseado no próximo passo
      if (proximoPasso === 'perdido') {
        meetingType = 'perdido_franquias';
        meetingTitle = 'Lead Perdido - ' + (window.hubspotTicketPortalData?.data?.subject || 'Cliente');
        description = 'Lead perdido após apresentação da proposta. ';

        // Adicionar motivo da perda
        if (motivoPerda) {
          var motivoLabel = self.motivosPerda[motivoPerda] || motivoPerda;
          description += 'Motivo da perda: ' + motivoLabel + '. ';
        }

        description += 'Comentários: ' + resultado;
      } else if (proximoPasso === 'Standby') {
        meetingType = 'standby_franquias';
        meetingTitle = 'Em Standby - ' + (window.hubspotTicketPortalData?.data?.subject || 'Cliente');
        description = 'Negócio em Standby - pausado para aguardar novo contato. ';
        description += 'Comentários: ' + resultado;
      }

      var meetingPayload = {
        type: meetingType,
        title: meetingTitle,
        start_time: dateTime.toISOString().replace('Z', '-03:00'), // Timezone Brasil
        end_time: new Date(dateTime.getTime() + 60 * 60 * 1000).toISOString().replace('Z', '-03:00'), // +1 hora
        status: 'COMPLETED', // Já fechado
        contact_id: window.hubspotUserData?.contactId || null,
        ticket_id: ticketId.toString(),
        description: description
      };

      console.log('📋 Criando meeting via nova API:', meetingPayload);

      fetch('https://n8n2.rooftop.com.br/webhook/portal/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(meetingPayload)
      })
      .then(function(response) {
        if (!response.ok) {
          throw new Error('Erro na resposta do servidor: ' + response.status);
        }
        return response.json();
      })
      .then(function(result) {
        console.log('✅ Meeting criado com sucesso:', result);
      })
      .catch(function(error) {
        console.error('❌ Erro ao criar meeting:', error);
      });
    },

    // Nova função para criar meeting de apresentação realizada via nova API
    createPresentationMeeting: function(data, resultado, proximoPasso) {
      var ticketId = window.hubspotTicketPortalData ? window.hubspotTicketPortalData.data.hs_object_id : null;
      
      if (!ticketId) {
        console.error('❌ Ticket ID não disponível para criar meeting de apresentação');
        return;
      }
      
      // Converter data para datetime no meio do dia (15:00 como padrão)
      var dateTime = new Date(data + 'T15:00:00');
      
      var description = 'Apresentação da proposta realizada. ';
      description += 'Resultado: ' + resultado + '. ';
      description += 'Próximo passo: ' + (proximoPasso === 'renegociar' ? 'Renegociar proposta' : 'Formalização');
      
      var meetingPayload = {
        type: 'apresentacao_realizada',
        title: 'Apresentação Realizada - ' + (window.hubspotTicketPortalData?.data?.subject || 'Cliente'),
        start_time: dateTime.toISOString().replace('Z', '-03:00'), // Timezone Brasil
        end_time: new Date(dateTime.getTime() + 60 * 60 * 1000).toISOString().replace('Z', '-03:00'), // +1 hora
        status: 'COMPLETED', // Já fechado
        contact_id: window.hubspotUserData?.contactId || null,
        ticket_id: ticketId.toString(),
        description: description
      };
      
      console.log('🎯 Criando meeting de apresentação realizada via nova API:', meetingPayload);
      
      fetch('https://n8n2.rooftop.com.br/webhook/portal/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(meetingPayload)
      })
      .then(function(response) {
        if (!response.ok) {
          throw new Error('Erro na resposta do servidor: ' + response.status);
        }
        return response.json();
      })
      .then(function(result) {
        console.log('✅ Meeting de apresentação realizada criado com sucesso:', result);
      })
      .catch(function(error) {
        console.error('❌ Erro ao criar meeting de apresentação:', error);
        // Não há API antiga para apresentações, apenas log do erro
      });
    },

    // ============================================================
    // FUNÇÕES PARA SEGUNDA PROPOSTA
    // ============================================================

    downloadProposta: function() {
      var ticket = window.hubspotTicketData?.data;

      if (!ticket || !ticket.link_da_proposta) {
        this.showToast('Link da proposta não disponível no momento.', 'warning');
        return;
      }

      // Abrir link da proposta em nova aba
      window.open(ticket.link_da_proposta, '_blank');

      console.log('📥 Download da proposta iniciado:', ticket.link_da_proposta);
    },

    openApresentacaoSegundaPropostaModal: function() {
      var self = this;

      var modalHTML = `
        <div id="apresentacao-segunda-proposta-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.5); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 1rem;">
          <div style="position: relative; background: white; border-radius: 0.5rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); max-width: 32rem; width: 100%; overflow-y: auto;">
            <div style="padding: 1.5rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3 style="font-size: 1.125rem; font-weight: 500; color: #111827;">Apresentação da Segunda Proposta</h3>
                <button onclick="window.negocioDetalheModule.closeApresentacaoSegundaPropostaModal()" style="color: #9CA3AF; cursor: pointer; border: none; background: none; padding: 0.25rem;">
                  <svg style="width: 1.5rem; height: 1.5rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <form id="apresentacao-segunda-proposta-form" style="display: flex; flex-direction: column; gap: 1rem;">
                <div>
                  <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Data da Apresentação</label>
                  <input type="date" id="segunda-proposta-data" style="width: 100%; padding: 0.75rem; border: 1px solid #D1D5DB; border-radius: 0.5rem; font-size: 0.875rem;" required>
                </div>

                <div>
                  <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Resultado da Apresentação</label>
                  <textarea id="segunda-proposta-resultado" rows="4" style="width: 100%; padding: 0.75rem; border: 1px solid #D1D5DB; border-radius: 0.5rem; font-size: 0.875rem; resize: vertical;" placeholder="Descreva o resultado da apresentação da segunda proposta, reações do cliente..." required></textarea>
                </div>

                <div>
                  <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Próximo Passo</label>
                  <select id="segunda-proposta-proximo-passo" style="width: 100%; padding: 0.75rem; border: 1px solid #D1D5DB; border-radius: 0.5rem; font-size: 0.875rem; background-color: white;" required>
                    <option value="">Selecione o próximo passo</option>
                    <option value="formalizar">Cliente aceitou - Seguir para formalização</option>
                    <option value="perdido">Cliente recusou - Marcar como perdido</option>
                  </select>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
                  <button type="button" onclick="window.negocioDetalheModule.closeApresentacaoSegundaPropostaModal()" style="padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; color: #374151; background: white; border: 1px solid #D1D5DB; border-radius: 0.5rem; cursor: pointer;">
                    Cancelar
                  </button>
                  <button type="submit" style="padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; color: white; background: #4F46E5; border: none; border-radius: 0.5rem; cursor: pointer;">
                    Confirmar Apresentação
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', modalHTML);

      // Preencher data atual como padrão
      var today = new Date();
      var todayString = today.toISOString().slice(0, 10);
      document.getElementById('segunda-proposta-data').value = todayString;

      document.getElementById('apresentacao-segunda-proposta-form').addEventListener('submit', function(e) {
        e.preventDefault();
        self.confirmarApresentacaoSegundaProposta();
      });

      this.escSegundaPropostaHandler = function(e) {
        if (e.key === 'Escape') self.closeApresentacaoSegundaPropostaModal();
      };
      document.addEventListener('keydown', this.escSegundaPropostaHandler);
    },

    closeApresentacaoSegundaPropostaModal: function() {
      var modal = document.getElementById('apresentacao-segunda-proposta-modal');
      if (modal) {
        document.removeEventListener('keydown', this.escSegundaPropostaHandler);
        modal.remove();
      }
    },

    confirmarApresentacaoSegundaProposta: function() {
      var self = this;
      var data = document.getElementById('segunda-proposta-data').value.trim();
      var resultado = document.getElementById('segunda-proposta-resultado').value.trim();
      var proximoPasso = document.getElementById('segunda-proposta-proximo-passo').value.trim();

      if (!data || !resultado || !proximoPasso) {
        this.showToast('Por favor, preencha todos os campos obrigatórios.', 'warning');
        return;
      }

      // Formatar data para DD/MM/AAAA
      var dateObj = new Date(data + 'T12:00:00');
      var formattedDate = dateObj.toLocaleDateString('pt-BR');

      // Determinar próxima etapa baseado na seleção
      var proximaEtapa, proximoLabel;

      if (proximoPasso === 'formalizar') {
        proximaEtapa = '1095528867';
        proximoLabel = 'Documentação para formalização';
      } else if (proximoPasso === 'perdido') {
        proximaEtapa = '1095528873';
        proximoLabel = 'Perdido';
      }

      var ticket = window.hubspotTicketData?.data;
      if (!ticket) {
        this.showToast('Dados do ticket não disponíveis.', 'error');
        return;
      }

      var ticketId = ticket.hs_object_id;

      console.log('📊 [Segunda Proposta] Dados coletados:', {
        data: formattedDate,
        resultado: resultado,
        proximoPasso: proximoPasso,
        proximaEtapa: proximaEtapa,
        ticketId: ticketId
      });

      // Payload para atualizar o ticket
      var payload = {
        ticketId: ticketId,
        properties: {
          hs_pipeline_stage: proximaEtapa
        }
      };

      // Atualizar ticket via N8N
      fetch('https://n8n2.rooftop.com.br/webhook/portal/update-ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      .then(function(response) {
        if (!response.ok) {
          throw new Error('Erro na resposta do servidor: ' + response.status);
        }
        return response.json();
      })
      .then(function(result) {
        console.log('✅ Ticket atualizado com sucesso:', result);
        self.showToast('Apresentação da segunda proposta registrada com sucesso! Atualizando etapa para: ' + proximoLabel, 'success');
        self.closeApresentacaoSegundaPropostaModal();

        // Recarregar página após 2 segundos
        setTimeout(function() {
          window.location.reload();
        }, 2000);
      })
      .catch(function(error) {
        console.error('❌ Erro ao atualizar ticket:', error);
        self.showToast('Erro ao registrar apresentação. Tente novamente.', 'error');
      });

      // Criar meeting para registrar a apresentação da segunda proposta
      var meetingPayload = {
        ticketId: ticketId,
        meetingType: 'apresentacao_segunda_proposta',
        title: 'Apresentação da Segunda Proposta - ' + formattedDate,
        body: 'Resultado: ' + resultado + '\n\nPróximo passo: ' + proximoLabel,
        startTime: dateObj.getTime(),
        endTime: dateObj.getTime() + (60 * 60 * 1000), // 1 hora depois
        internalNotes: 'Meeting criado automaticamente pelo portal do franqueado - Segunda Proposta'
      };

      console.log('🎯 Criando meeting de apresentação da segunda proposta:', meetingPayload);

      fetch('https://n8n2.rooftop.com.br/webhook/portal/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(meetingPayload)
      })
      .then(function(response) {
        if (!response.ok) {
          throw new Error('Erro na resposta do servidor: ' + response.status);
        }
        return response.json();
      })
      .then(function(result) {
        console.log('✅ Meeting de segunda proposta criado com sucesso:', result);
      })
      .catch(function(error) {
        console.error('❌ Erro ao criar meeting:', error);
      });
    },

    openSolicitarReajusteModal: function() {
      var modal = document.getElementById('modal-solicitar-reajuste');
      var form = document.getElementById('form-solicitar-reajuste');
      
      if (modal && form) {
        // Limpar o formulário
        document.getElementById('justificativa-reajuste').value = '';
        
        // Mostrar o modal
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        // Focar no campo de justificativa
        setTimeout(function() {
          document.getElementById('justificativa-reajuste').focus();
        }, 100);
        
        // Configurar evento de submit do formulário
        form.onsubmit = function(e) {
          e.preventDefault();
          window.negocioDetalheModule.submitSolicitarReajuste();
        };
        
        // Fechar modal com ESC
        this.handleEscapeSolicitarReajuste = function(e) {
          if (e.key === 'Escape') {
            window.negocioDetalheModule.closeSolicitarReajusteModal();
          }
        };
        document.addEventListener('keydown', this.handleEscapeSolicitarReajuste);
      }
    },
    
    closeSolicitarReajusteModal: function() {
      var modal = document.getElementById('modal-solicitar-reajuste');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        
        // Remover event listener
        if (this.handleEscapeSolicitarReajuste) {
          document.removeEventListener('keydown', this.handleEscapeSolicitarReajuste);
          this.handleEscapeSolicitarReajuste = null;
        }
      }
    },
    
    submitSolicitarReajuste: function() {
      var justificativa = document.getElementById('justificativa-reajuste').value.trim();
      var titulo = document.getElementById('titulo-reajuste').value.trim();
      
      if (!justificativa) {
        this.showToast('Por favor, informe a justificativa para o reajuste.', 'warning');
        return;
      }
      
      // Fechar o modal
      this.closeSolicitarReajusteModal();
      
      // Criar a task
      this.criarTaskReajuste(titulo, justificativa);
    },
    
    criarTaskReajuste: function(titulo, justificativa) {
      var self = this;
      var ticketId = window.hubspotTicketPortalData ? window.hubspotTicketPortalData.data.hs_object_id : null;
      
      if (!ticketId) {
        this.showToast('ID do ticket do portal não encontrado.', 'error');
        return;
      }
      
      var payload = {
        ticketId: parseInt(ticketId),
        body: justificativa,
        status: "NOT_STARTED",
        subject: titulo
      };
      
      console.log('Criando task de reajuste:', payload);
      
      // Mostrar loading
      var loadingMsg = 'Criando solicitação de reajuste...';
      if (typeof this.showLoading === 'function') {
        this.showLoading(loadingMsg);
      }
       // Adicionar contact_id do usuário logado
       if (window.hubspotUserData && window.hubspotUserData.contactId) {
        payload.contact_id = window.hubspotUserData.contactId;
      }
      
      fetch('https://n8n2.rooftop.com.br/webhook/portal/register-activities/task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      .then(function(response) {
        if (!response.ok) {
          throw new Error('Erro na resposta do servidor: ' + response.status);
        }
        return response.json();
      })
      .then(function(result) {
        console.log('Task de reajuste criada com sucesso:', result);
        self.showToast('Solicitação de reajuste criada com sucesso!', 'success');
        
        // Atualizar o step do funil
        self.updateStep('1095528866', 'Reajuste da proposta do (comitê investidor)', {
          justificativa: justificativa,
          tipo: 'solicitacao_reajuste',
          taskId: result.taskId || null
        });
      })
      .catch(function(error) {
        console.error('Erro ao criar task de reajuste:', error);
        self.showToast('Erro ao criar solicitação de reajuste. Tente novamente.', 'error');
        
        // Esconder loading se houver
        if (typeof self.hideLoading === 'function') {
          self.hideLoading();
        }
      });
    },
    
    openDocumentosComplementaresModal: function() {
      this.showToast('Funcionalidade será implementada em breve.', 'info');
    },
    
    reabrirNegociacao: function() {
      var self = this;
      this.showConfirm('Deseja reabrir a Pedido de Contraproposta do cliente?', function() {
        self.updateStep('1062003577', 'Pedido de Contraproposta do cliente', {
          tipo: 'reabertura_negociacao'
        });
      });
    },

    retomarNegociacao: function() {
      var self = this;

      // Obter dados do ticket para verificar de qual etapa veio
      var ticketData = window.hubspotTicketPortalData ? window.hubspotTicketPortalData.data : null;
      var etapaAnterior = ticketData ? ticketData.etapa_anterior_standby : null;

      // Determinar etapa de retorno baseado na etapa anterior
      var etapaRetorno, labelRetorno, mensagem;

      if (etapaAnterior === '1208820114') {
        // Veio da Segunda proposta cliente
        etapaRetorno = '1208820114';
        labelRetorno = 'Segunda proposta cliente';
        mensagem = 'Deseja retomar a negociação e voltar para a etapa "Segunda proposta cliente"?';
      } else {
        // Padrão: veio da 2ª Reunião marcada ou não tem etapa anterior definida
        etapaRetorno = '1207696559';
        labelRetorno = '2ª Reunião marcada';
        mensagem = 'Deseja retomar a negociação e voltar para a etapa "2ª Reunião marcada"?';
      }

      this.showConfirm(mensagem, function() {
        self.updateStep(etapaRetorno, labelRetorno, {
          tipo: 'retomada_negociacao_standby',
          etapa_anterior_standby: null // Limpar o campo ao retomar
        });
      });
    },
    
    // =================================================================================
    // FUNÇÕES DE GERENCIAMENTO DE FOTOS
    // =================================================================================
    
    openUploadPhotoModal: function() {
      var modal = document.getElementById('modal-upload-photo');
      var form = document.getElementById('form-upload-photo');
      var fileInput = document.getElementById('file-input-photo');
      var dropZone = document.getElementById('drop-zone-photo');
      var fileList = document.getElementById('file-list-photo');
      var uploadBtn = document.getElementById('upload-btn-photo');
      
      if (modal && form) {
        // Limpar o formulário
        form.reset();
        fileList.innerHTML = '';
        fileList.classList.add('hidden');
        uploadBtn.disabled = true;
        this.selectedPhotoFiles = null; // Limpar arquivos ao abrir modal
        
        // Mostrar o modal
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        // Configurar eventos de drag & drop
        dropZone.addEventListener('click', function() {
          fileInput.click();
        });
        
        dropZone.addEventListener('dragover', function(e) {
          e.preventDefault();
          dropZone.classList.add('border-blue-500', 'bg-blue-50');
        });
        
        dropZone.addEventListener('dragleave', function(e) {
          e.preventDefault();
          dropZone.classList.remove('border-blue-500', 'bg-blue-50');
        });
        
        dropZone.addEventListener('drop', function(e) {
          e.preventDefault();
          dropZone.classList.remove('border-blue-500', 'bg-blue-50');
          console.log('Files dropped:', e.dataTransfer.files);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            var files = Array.from(e.dataTransfer.files);
            console.log('Dropped files converted to array:', files);
            window.negocioDetalheModule.handlePhotoFiles(files);
          } else {
            console.log('No files dropped');
          }
        });
        
        fileInput.addEventListener('change', function(e) {
          console.log('File input changed, files:', e.target.files);
          if (e.target.files && e.target.files.length > 0) {
            var files = Array.from(e.target.files);
            console.log('Files converted to array:', files);
            window.negocioDetalheModule.handlePhotoFiles(files);
          } else {
            console.log('No files selected');
          }
        });
        
        // Configurar evento de submit do formulário
        form.onsubmit = function(e) {
          e.preventDefault();
          window.negocioDetalheModule.submitUploadPhoto();
        };
        
        // Fechar modal com ESC
        this.handleEscapeUploadPhoto = function(e) {
          if (e.key === 'Escape') {
            window.negocioDetalheModule.closeUploadPhotoModal();
          }
        };
        document.addEventListener('keydown', this.handleEscapeUploadPhoto);
      }
    },
    
    closeUploadPhotoModal: function() {
      var modal = document.getElementById('modal-upload-photo');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        
        // Remover event listener
        if (this.handleEscapeUploadPhoto) {
          document.removeEventListener('keydown', this.handleEscapeUploadPhoto);
          this.handleEscapeUploadPhoto = null;
        }
        
        // Não limpar arquivos selecionados aqui, pois pode estar sendo usado no upload
        // this.selectedPhotoFiles = null;
      }
    },
    
    handlePhotoFiles: function(files) {
      var fileList = document.getElementById('file-list-photo');
      var uploadBtn = document.getElementById('upload-btn-photo');
      
      // Verificar se files existe
      if (!files || files.length === 0) {
        console.log('Nenhum arquivo foi fornecido para handlePhotoFiles');
        return;
      }
      
      // Filtrar imagens, vídeos MP4, PDFs e documentos Word
      var mediaFiles = files.filter(file =>
        file.type.startsWith('image/') ||
        file.type === 'video/mp4' ||
        file.type === 'application/pdf' ||
        file.type === 'application/msword' ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.name.toLowerCase().endsWith('.pdf') ||
        file.name.toLowerCase().endsWith('.doc') ||
        file.name.toLowerCase().endsWith('.docx')
      );
      
      if (mediaFiles.length === 0) {
        this.showToast('Por favor, selecione apenas imagens (PNG, JPG, JPEG), vídeos MP4, ou documentos (PDF, DOC, DOCX).', 'warning');
        return;
      }
      
      // Verificar tamanho dos arquivos (10MB para imagens e documentos, 50MB para vídeos)
      var oversizedFiles = mediaFiles.filter(file => {
        var maxSize = file.type === 'video/mp4' ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
        return file.size > maxSize;
      });
      if (oversizedFiles.length > 0) {
        this.showToast('Alguns arquivos excedem o limite de tamanho (10MB para imagens e documentos, 50MB para vídeos).', 'warning');
        return;
      }
      
      this.selectedPhotoFiles = mediaFiles;
      console.log('selectedPhotoFiles set to:', this.selectedPhotoFiles);
      
      // Exibir lista de arquivos
      fileList.innerHTML = mediaFiles.map(file => `
        <div class="flex items-center justify-between p-2 bg-slate-100 rounded mb-2">
          <span class="text-sm text-slate-700">${file.name}</span>
          <span class="text-xs text-slate-500">${(file.size / 1024 / 1024).toFixed(2)} MB</span>
        </div>
      `).join('');
      
      fileList.classList.remove('hidden');
      uploadBtn.disabled = false;
    },
    
    submitUploadPhoto: function() {
      console.log('submitUploadPhoto called');
      console.log('this.selectedPhotoFiles:', this.selectedPhotoFiles);
      
      var tipoFoto = document.getElementById('tipo-foto').value;
      console.log('tipoFoto:', tipoFoto);
      
      if (!tipoFoto) {
        this.showToast('Por favor, selecione o tipo de foto.', 'warning');
        return;
      }
      
      if (!this.selectedPhotoFiles || this.selectedPhotoFiles.length === 0) {
        console.log('No files selected or selectedPhotoFiles is null');
        this.showToast('Por favor, selecione pelo menos um arquivo de imagem ou vídeo.', 'warning');
        return;
      }
      
      // Verificar novamente se os arquivos ainda existem
      if (!this.selectedPhotoFiles || this.selectedPhotoFiles.length === 0) {
        this.showToast('Os arquivos selecionados foram perdidos. Tente novamente.', 'error');
        return;
      }
      
      // Criar uma cópia dos arquivos antes de fechar o modal
      var filesToUpload = Array.from(this.selectedPhotoFiles);
      
      // Fechar o modal
      this.closeUploadPhotoModal();
      
      // Fazer upload das fotos
      this.uploadPhotos(tipoFoto, filesToUpload);
    },
    
    uploadPhotos: function(tipoFoto, files) {
      var self = this;
      var ticketId = window.hubspotTicketData ? window.hubspotTicketData.data.hs_object_id : null;
      
      if (!ticketId) {
        this.showToast('ID do ticket não encontrado.', 'error');
        return;
      }
      
      // Determinar o campo correto baseado no tipo
      var fieldName = tipoFoto === 'fachada' ? 'fotos_da_fachada' : 'fotos_internas';
      
      // Verificar se files existe e é um array
      if (!files || !Array.isArray(files) || files.length === 0) {
        this.setUploadButtonLoading(false);
        this.showToast('Nenhum arquivo foi selecionado para upload.', 'error');
        return;
      }
      
      // Mostrar loading no botão e status inicial
      this.setUploadButtonLoading(true);
      this.updateUploadButtonProgress(0, files.length, 'Iniciando...');
      
      // Obter IDs existentes do campo antes de fazer upload
      var existingIds = this.getExistingFileIds(fieldName);
      console.log('IDs existentes no campo ' + fieldName + ':', existingIds);
      
      console.log('Iniciando upload sequencial de fotos:', {
        ticketId: ticketId,
        fieldName: fieldName,
        fileCount: files.length,
        existingIds: existingIds
      });
      
      // Usar upload sequencial como nos documentos
      this.uploadPhotosSequential(files, ticketId, fieldName, existingIds, function(success) {
        self.setUploadButtonLoading(false);
        
        if (success) {
          self.selectedPhotoFiles = null; // Limpar arquivos após sucesso
          self.showToast('Arquivos enviados com sucesso!', 'success');
          
          // Recarregar a página para atualizar as fotos
          setTimeout(function() {
            window.location.reload();
          }, 1500);
        } else {
          self.selectedPhotoFiles = null; // Limpar arquivos após erro
          self.showToast('Erro ao enviar um ou mais arquivos. Tente novamente.', 'error');
        }
      });
    },
    
    uploadPhotosSequential: function(files, ticketId, fieldName, currentIds, callback) {
      var uploadIndex = 0;
      var accumulatedIds = currentIds.slice(); // cópia do array
      var self = this;
      
      function uploadNextFile() {
        if (uploadIndex >= files.length) {
          // Todos os arquivos foram enviados
          callback(true);
          return;
        }
        
        var file = files[uploadIndex];
        var formData = new FormData();
        formData.append('file', file);
        formData.append('fileName', file.name);
        formData.append('ticket_id', ticketId);
        formData.append('field_name', fieldName);
        
        // Enviar todos os IDs acumulados (existentes + já enviados)
        if (accumulatedIds.length > 0) {
          formData.append('existing_file_ids', accumulatedIds.join(';'));
        }
        
        // Atualizar texto do botão com progresso
        self.updateUploadButtonProgress(uploadIndex + 1, files.length);
        
        console.log('Enviando foto ' + (uploadIndex + 1) + '/' + files.length + ':', file.name);
        console.log('IDs existentes sendo enviados:', accumulatedIds.join(';'));
        
        fetch('https://n8n2.rooftop.com.br/webhook/portal/upload-documento', {
          method: 'POST',
          body: formData
        })
        .then(function(response) {
          if (!response.ok) {
            throw new Error('Erro na resposta do servidor: ' + response.status);
          }
          return response.json();
        })
        .then(function(data) {
          console.log('Foto enviada com sucesso:', file.name, data);
          
          // Extrair o novo ID da resposta da API
          var newFileId = null;
          if (data && data.properties && data.properties[fieldName]) {
            // Pegar todos os IDs da resposta
            var allIds = data.properties[fieldName].split(/[;,]/).map(function(id) { 
              return id.trim(); 
            }).filter(function(id) { 
              return id !== ''; 
            });
            
            // Encontrar o ID que não estava na lista anterior
            var newIds = allIds.filter(function(id) { 
              return accumulatedIds.indexOf(id) === -1; 
            });
            
            if (newIds.length > 0) {
              newFileId = newIds[0]; // Pegar o primeiro novo ID
            }
          }
          
          if (newFileId) {
            accumulatedIds.push(newFileId);
            console.log('Novo ID da foto adicionado:', newFileId);
            console.log('IDs de fotos acumulados:', accumulatedIds);
          } else {
            console.warn('Não foi possível extrair o novo ID da foto da resposta');
          }
          
          uploadIndex++;
          // Continuar com o próximo arquivo
          setTimeout(uploadNextFile, 500); // Pequeno delay entre uploads
        })
        .catch(function(error) {
          console.error('Erro ao enviar foto:', file.name, error);
          self.showToast('Erro ao enviar arquivo "' + file.name + '". Processo interrompido.', 'error');
          callback(false);
        });
      }
      
      // Iniciar o upload da primeira foto
      uploadNextFile();
    },
    
    updateUploadButtonProgress: function(current, total, customText) {
      var addButton = document.querySelector('button[onclick*="openUploadPhotoModal"]');
      if (addButton) {
        var text = customText || `Enviando ${current}/${total}...`;
        addButton.innerHTML = `
          <svg class="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          ${text}
        `;
      }
    },
    
    removePhoto: function(imageId, tipoFoto) {
      var self = this;
      
      this.showConfirm('Deseja realmente remover esta foto?', function() {
        self.executePhotoRemoval(imageId, tipoFoto);
      });
    },
    
    executePhotoRemoval: function(imageId, tipoFoto) {
      var self = this;
      var ticketId = window.hubspotTicketData ? window.hubspotTicketData.data.hs_object_id : null;
      
      if (!ticketId) {
        this.showToast('ID do ticket não encontrado.', 'error');
        return;
      }
      
      // Determinar o campo correto baseado no tipo da foto
      var fieldName = tipoFoto === 'Fachada' ? 'fotos_da_fachada' : 'fotos_internas';
      
      // Obter IDs existentes do campo
      var existingIds = this.getExistingFileIds(fieldName);
      
      // Criar FormData com os campos necessários
      var formData = new FormData();
      formData.append('file_id', imageId);
      formData.append('ticket_id', ticketId);
      formData.append('field_name', fieldName);
      formData.append('existing_file_ids', existingIds.join(';'));
      
      console.log('Removendo foto:', {
        file_id: imageId,
        ticket_id: ticketId,
        field_name: fieldName,
        existing_file_ids: existingIds.join(';')
      });
      
      fetch('https://n8n2.rooftop.com.br/webhook/portal/remove-imagem', {
        method: 'POST',
        body: formData
      })
      .then(function(response) {
        if (!response.ok) {
          throw new Error('Erro na resposta do servidor: ' + response.status);
        }
        return response.json();
      })
      .then(function(result) {
        console.log('Foto removida com sucesso:', result);
        self.showToast('Foto removida com sucesso!', 'success');
        
        // Atualizar a galeria removendo a foto
        self.modalPhotos = self.modalPhotos.filter(function(foto) {
          return foto.originalFileId !== imageId;
        });
        
        self.updatePhotoGallery(self.modalPhotos);
      })
      .catch(function(error) {
        console.error('Erro ao remover foto:', error);
        self.showToast('Erro ao remover foto. Tente novamente.', 'error');
      });
    },
    
    // =================================================================================
    // FUNÇÕES AUXILIARES PARA UPLOAD
    // =================================================================================
    
    setUploadButtonLoading: function(isLoading) {
      var addButton = document.querySelector('button[onclick*="openUploadPhotoModal"]');
      if (!addButton) return;
      
      if (isLoading) {
        addButton.disabled = true;
        addButton.classList.add('opacity-50', 'cursor-not-allowed');
        // O texto será atualizado pela função updateUploadButtonProgress
      } else {
        addButton.disabled = false;
        addButton.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
          </svg>
          Adicionar Fotos
        `;
        addButton.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    },
    
    showAlert: function(title, message, type) {
      var icon = '';
      var titleColor = '';
      var bgColor = '';
      
      switch(type) {
        case 'success':
          icon = '✅';
          titleColor = 'text-green-600';
          bgColor = 'bg-green-50 border-green-200';
          break;
        case 'error':
          icon = '❌';
          titleColor = 'text-red-600';
          bgColor = 'bg-red-50 border-red-200';
          break;
        case 'warning':
          icon = '⚠️';
          titleColor = 'text-yellow-600';
          bgColor = 'bg-yellow-50 border-yellow-200';
          break;
        default:
          icon = 'ℹ️';
          titleColor = 'text-blue-600';
          bgColor = 'bg-blue-50 border-blue-200';
      }
      
      // Criar modal de alerta customizado
      var alertModal = document.createElement('div');
      alertModal.className = 'fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4';
      alertModal.innerHTML = `
        <div class="relative bg-white rounded-xl shadow-2xl max-w-md w-full ${bgColor} border">
          <div class="p-6">
            <div class="flex items-center mb-4">
              <span class="text-2xl mr-3">${icon}</span>
              <h3 class="text-lg font-semibold ${titleColor}">${title}</h3>
            </div>
            <p class="text-slate-700 mb-6">${message}</p>
            <div class="flex justify-end">
              <button onclick="this.closest('.fixed').remove()" class="btn btn-primary">
                OK
              </button>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(alertModal);
      
      // Auto-remover após 5 segundos para alertas de sucesso
      if (type === 'success') {
        setTimeout(function() {
          if (alertModal.parentNode) {
            alertModal.remove();
          }
        }, 5000);
      }
      
      // Fechar com ESC
      var handleEscape = function(e) {
        if (e.key === 'Escape') {
          alertModal.remove();
          document.removeEventListener('keydown', handleEscape);
        }
      };
      document.addEventListener('keydown', handleEscape);
    },

    openSolicitarAvaliacao: function() {
        var self = this;
        
        var modalHTML = `
            <div id="avaliacao-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.5); z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 1rem;">
                <div style="position: relative; background: white; border-radius: 0.5rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); max-width: 32rem; width: 100%;">
                    <div style="padding: 1.5rem;">
                        <div style="margin-bottom: 1rem;">
                            <h3 style="font-size: 1.125rem; font-weight: 600; color: #111827;">Solicitar Avaliação Externa</h3>
                        </div>
                        <div style="margin-bottom: 1rem;">
                            <label style="required display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Descrição (obrigatório)</label>
                            <textarea required id="avaliacao-descricao" style="width: 100%; border: 1px solid #D1D5DB; border-radius: 0.5rem; padding: 0.625rem 0.75rem; font-size: 0.875rem; resize: vertical; min-height: 80px;" placeholder="Descreva detalhes sobre a avaliação externa..."></textarea>
                        </div>
                        <div style="margin-bottom: 1rem;">
                            <label style="required display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Data e horário combinado (obrigatório)</label>
                            <input required type="datetime-local" id="avaliacao-data-hora" style="width: 100%; border: 1px solid #D1D5DB; border-radius: 0.5rem; padding: 0.625rem 0.75rem; font-size: 0.875rem;">
                        </div>
                        <div style="display: flex; justify-content: flex-end; gap: 0.5rem;">
                            <button id="avaliacao-cancel" style="padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; color: #374151; background: white; border: 1px solid #D1D5DB; border-radius: 0.5rem; cursor: pointer;">Cancelar</button>
                            <button id="avaliacao-confirm" style="padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; color: white; background: #2563EB; border: none; border-radius: 0.5rem; cursor: pointer;">Solicitar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Event listeners
        document.getElementById('avaliacao-cancel').addEventListener('click', function() {
            document.getElementById('avaliacao-modal').remove();
        });
        
        document.getElementById('avaliacao-confirm').addEventListener('click', function() {
            var descricao = document.getElementById('avaliacao-descricao').value.trim();
            var dataHora = document.getElementById('avaliacao-data-hora').value;

            // Validação dos campos obrigatórios
            if (!descricao) {
                alert('Por favor, preencha a descrição da avaliação.');
                document.getElementById('avaliacao-descricao').focus();
                return;
            }

            if (!dataHora) {
                alert('Por favor, selecione a data e horário combinado.');
                document.getElementById('avaliacao-data-hora').focus();
                return;
            }

            self.solicitarAvaliacaoExterna(descricao, dataHora);
        });
    },
    
    solicitarAvaliacaoExterna: function(descricao, dataHora) {
      var self = this;
      
      // Fechar o modal
      document.getElementById('avaliacao-modal').remove();
      
      // Mostrar loading
      this.showToast('Solicitando avaliação externa...', 'info');
      
      // Atualizar o ticket
      var ticketId = window.hubspotTicketData ? window.hubspotTicketData.data.hs_object_id : null;
      
      if (!ticketId) {
          this.showToast('Erro: ID do ticket não encontrado', 'error');
          return;
      }
      
      var ticketPayload = {
          objectId: ticketId,
          solicitar_avaliacao_externa: 'Sim'
      };

      // Criar payloads específicos para cada campo
        var ticketPayloadSugestao = {
          objectId: ticketId,
          sugestao_dia_horario_avaliacao_externa: dataHora || ''
      };

      var ticketPayloadComentario = {
          objectId: ticketId,
          comentario_do_franqueado_para_avaliacao_externa: descricao || ''
      };
      
      
      var ticketEndpoint = 'https://n8n2.rooftop.com.br/webhook/portal/update-ticket';
      
      // Primeiro update de sugestao_dia_horario_avaliacao_externa
      fetch(ticketEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketPayloadSugestao)
      })
      
      // Segundo update de comentario_do_franqueado_para_avaliacao_externa
      fetch(ticketEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketPayloadComentario)
      })
      
      // Primeiro, atualizar o ticket
      fetch(ticketEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ticketPayload)
      })
      .then(function(response) {
          if (!response.ok) {
              throw new Error('Erro ao atualizar ticket: ' + response.status);
          }
          return response.json();
      })
      .then(function(data) {
          console.log('✅ Ticket atualizado com sucesso:', data);
          
          // Agora criar o meeting
          return self.criarMeetingAvaliacao(descricao, dataHora);
      })
      .then(function(meetingData) {
          console.log('✅ Meeting criado com sucesso:', meetingData);
          self.showToast('Avaliação externa solicitada e meeting criado com sucesso!', 'success');
          
          // Atualizar os dados locais
          if (window.hubspotTicketData && window.hubspotTicketData.data) {
              window.hubspotTicketData.data.solicitar_avaliacao_externa = 'Sim';
          }
          
          // Recarregar a página para atualizar a interface
          setTimeout(function() {
              window.location.reload();
          }, 1500);
      })
      .catch(function(error) {
          console.error('❌ Erro ao processar solicitação:', error);
          self.showToast('Erro ao processar solicitação. Tente novamente.', 'error');
      });
  },
  criarMeetingAvaliacao: function(descricao, dataHora) {
      var self = this;
      
      // Preparar dados do meeting
      var hoje = new Date();
      var dataMeeting = dataHora ? new Date(dataHora) : hoje;
      
      // Se não foi fornecida data/hora, usar data de hoje às 14:00
      if (!dataHora) {
          dataMeeting.setHours(14, 0, 0, 0);
      }
      
      // Formatar data para o formato ISO
      var startTime = dataMeeting.toISOString();
      var endTime = new Date(dataMeeting.getTime() + (60 * 60 * 1000)).toISOString(); // +1 hora
      
      var meetingPayload = {
          title: 'Solicitar avaliação externa',
          status: 'COMPLETED',
          type: 'avaliacao_externa',
          description: descricao && descricao.trim() ? descricao.trim() : 'Solicitação de avaliação externa do imóvel',
          start_time: startTime,
          end_time: endTime,
          ticket_id: window.hubspotTicketData ? window.hubspotTicketData.data.hs_object_id : null
      };
      
      console.log('�� Criando meeting com payload:', meetingPayload);
      
      var meetingEndpoint = 'https://n8n2.rooftop.com.br/webhook/portal/meetings';
      
      return fetch(meetingEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(meetingPayload)
      })
      .then(function(response) {
          if (!response.ok) {
              throw new Error('Erro ao criar meeting: ' + response.status);
          }
          return response.json();
      });
  },

  // =================================================================================
  // FUNÇÕES DE CONTROLE DOS DOCUMENTOS COMPLEMENTARES
  // =================================================================================

  openUploadDocumentsModal: function() {
    var modal = document.getElementById('modal-upload-documents');
    var form = document.getElementById('form-upload-documents');

    if (modal && form) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');

      var uploadBtn = document.getElementById('upload-btn-documents');
      if (uploadBtn) uploadBtn.disabled = true;

      this.selectedDocumentFiles = null;

      // Configurar drag and drop
      var dropZone = document.getElementById('drop-zone-documents');
      var fileInput = document.getElementById('file-input-documents');

      if (dropZone && fileInput) {
        // Click no drop zone abre seletor de arquivos
        dropZone.addEventListener('click', function() {
          fileInput.click();
        });

        // Mudança no input de arquivo
        fileInput.addEventListener('change', function(e) {
          window.negocioDetalheModule.handleDocumentFiles(e.target.files);
        });

        // Drag and drop events
        dropZone.addEventListener('dragover', function(e) {
          e.preventDefault();
          dropZone.classList.add('border-blue-500', 'bg-blue-50');
        });

        dropZone.addEventListener('dragleave', function(e) {
          e.preventDefault();
          dropZone.classList.remove('border-blue-500', 'bg-blue-50');
        });

        dropZone.addEventListener('drop', function(e) {
          e.preventDefault();
          dropZone.classList.remove('border-blue-500', 'bg-blue-50');
          window.negocioDetalheModule.handleDocumentFiles(e.dataTransfer.files);
        });
      }

      // Submit do formulário
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        window.negocioDetalheModule.submitUploadDocuments();
      });

      // Fechar modal com ESC
      this.handleEscapeUploadDocuments = function(e) {
        if (e.key === 'Escape') {
          window.negocioDetalheModule.closeUploadDocumentsModal();
        }
      };
      document.addEventListener('keydown', this.handleEscapeUploadDocuments);
    }
  },

  closeUploadDocumentsModal: function() {
    var modal = document.getElementById('modal-upload-documents');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');

      // Remover event listener
      if (this.handleEscapeUploadDocuments) {
        document.removeEventListener('keydown', this.handleEscapeUploadDocuments);
        this.handleEscapeUploadDocuments = null;
      }

      // Limpar arquivos selecionados
      this.selectedDocumentFiles = null;
    }
  },

  handleDocumentFiles: function(files) {
    var fileList = document.getElementById('file-list-documents');
    var uploadBtn = document.getElementById('upload-btn-documents');

    if (!files || files.length === 0) {
      console.log('Nenhum arquivo foi fornecido para handleDocumentFiles');
      return;
    }

    // Filtrar apenas tipos de documento permitidos
    var allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'application/rtf',
      'application/zip',
      'application/x-rar-compressed'
    ];

    var documentFiles = Array.from(files).filter(file => {
      return allowedTypes.includes(file.type) ||
             file.name.toLowerCase().endsWith('.pdf') ||
             file.name.toLowerCase().endsWith('.doc') ||
             file.name.toLowerCase().endsWith('.docx') ||
             file.name.toLowerCase().endsWith('.xls') ||
             file.name.toLowerCase().endsWith('.xlsx') ||
             file.name.toLowerCase().endsWith('.txt') ||
             file.name.toLowerCase().endsWith('.rtf') ||
             file.name.toLowerCase().endsWith('.zip') ||
             file.name.toLowerCase().endsWith('.rar');
    });

    if (documentFiles.length === 0) {
      this.showToast('Por favor, selecione apenas documentos válidos (PDF, DOC, DOCX, XLS, XLSX, TXT, RTF, ZIP, RAR).', 'warning');
      return;
    }

    // Verificar tamanho dos arquivos (10MB máximo)
    var oversizedFiles = documentFiles.filter(file => file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      this.showToast('Alguns arquivos excedem o limite de 10MB.', 'warning');
      return;
    }

    this.selectedDocumentFiles = documentFiles;

    // Exibir lista de arquivos
    fileList.innerHTML = documentFiles.map(file => `
      <div class="flex items-center justify-between p-2 bg-slate-100 rounded mb-2">
        <span class="text-sm text-slate-700">${file.name}</span>
        <span class="text-xs text-slate-500">${(file.size / 1024 / 1024).toFixed(2)} MB</span>
      </div>
    `).join('');

    fileList.classList.remove('hidden');
    uploadBtn.disabled = false;
  },

  submitUploadDocuments: function() {
    if (!this.selectedDocumentFiles || this.selectedDocumentFiles.length === 0) {
      this.showToast('Por favor, selecione pelo menos um documento.', 'warning');
      return;
    }

    // Criar uma cópia dos arquivos antes de fechar o modal
    var filesToUpload = Array.from(this.selectedDocumentFiles);

    // Fechar o modal
    this.closeUploadDocumentsModal();

    // Fazer upload dos documentos
    this.uploadDocuments(filesToUpload);
  },

  uploadDocuments: function(files) {
    var self = this;
    var ticketId = window.hubspotTicketData ? window.hubspotTicketData.data.hs_object_id : null;

    if (!ticketId) {
      this.showToast('ID do ticket não encontrado.', 'error');
      return;
    }

    if (!files || !Array.isArray(files) || files.length === 0) {
      this.showToast('Nenhum arquivo foi selecionado para upload.', 'error');
      return;
    }

    // Obter IDs existentes do campo documentos_complementares
    var currentDocuments = window.hubspotTicketData && window.hubspotTicketData.data ?
                          (window.hubspotTicketData.data.documentos_complementares || '') : '';
    var existingIds = currentDocuments ? currentDocuments.split(';').filter(id => id.trim()) : [];

    // Fazer upload sequencial
    this.uploadDocumentsSequential(files, ticketId, 'documentos_complementares', existingIds, function(success) {
      if (success) {
        self.showToast('Documentos enviados com sucesso!', 'success');
        setTimeout(function() {
          location.reload();
        }, 1500);
      }
    });
  },

  uploadDocumentsSequential: function(files, ticketId, fieldName, currentIds, callback) {
    var self = this;
    var uploadIndex = 0;
    var allUploadedIds = currentIds.slice();

    function uploadNextFile() {
      if (uploadIndex >= files.length) {
        // Todos os uploads concluídos
        callback(true);
        return;
      }

      var file = files[uploadIndex];
      var uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('ticket_id', ticketId);
      uploadData.append('field_name', fieldName);
      uploadData.append('fileName', file.name);
      uploadData.append('current_ids', allUploadedIds.join(';'));

      // Mostrar progresso
      self.showToast(`Enviando documento ${uploadIndex + 1}/${files.length}: ${file.name}`, 'info');

      fetch('https://n8n2.rooftop.com.br/webhook/portal/upload-documento', {
        method: 'POST',
        body: uploadData
      })
      .then(function(response) {
        return response.json();
      })
      .then(function(data) {
        console.log('data', data)
        if (data.id) {
          allUploadedIds.push(data.id);
          console.log('✅ Documento enviado:', file.name, 'ID:', data.id);
        } else {
          throw new Error(data.error || 'Erro desconhecido no upload');
        }

        uploadIndex++;
        // Continuar com o próximo arquivo
        setTimeout(uploadNextFile, 500);
      })
      .catch(function(error) {
        console.error('Erro ao enviar documento:', file.name, error);
        self.showToast('Erro ao enviar documento "' + file.name + '". Processo interrompido.', 'error');
        callback(false);
      });
    }

    // Iniciar o upload do primeiro documento
    uploadNextFile();
  },

  renderDocumentsList: function() {
    var documentsContainer = document.getElementById('documents-list');
    if (!documentsContainer) return;

    var ticketData = window.hubspotTicketData?.data;
    if (!ticketData || !ticketData.documentos_complementares) {
      documentsContainer.innerHTML = '<p class="text-sm text-slate-500 text-center py-4">Nenhum documento enviado ainda.</p>';
      return;
    }
    
    const documentos = this.getDocumentosInfo(ticketData);

    var documentIds = ticketData.documentos_complementares.split(';').filter(id => id.trim());
    console.log('documentIds', documentIds)
    if (documentIds.length === 0) {
      documentsContainer.innerHTML = '<p class="text-sm text-slate-500 text-center py-4">Nenhum documento enviado ainda.</p>';
      return;
    }

    // Gerar lista de documentos
    // this.loadFileFromEndpoint()
    // Carregar arquivos e popular lista
    this.loadMultipleFiles(documentIds).then(function(files) {
      console.log('etapa 1')
      var fileListHTML = files.map(function(file, index) {
        console.log('etapa 2')
        if (!file) return '';
        console.log('etapa 3')
        
        // var fileIcon = self.getFileIcon(file.type, file.extension);
        // var fileSize = self.formatFileSize(file.size);
        
        return `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background-color: #f8fafc; border-radius: 8px; margin-bottom: 8px; border: 1px solid #e2e8f0;">
          <div onclick="window.negocioDetalheModule.downloadFile('${documentIds[index]}')" style="display: flex; align-items: center; gap: 12px;cursor:pointer;">
            <div style="width: 32px; height: 32px; background-color: #dbeafe; border-radius: 8px; display: flex; align-items: center;  justify-content: center;">
              📄
            </div>
            <div>
              <p style="font-size: 14px; font-weight: 500; color: #0f172a; margin: 0;">${file.name}</p>
            </div>
          </div>
          <p onclick="window.negocioDetalheModule.downloadFile('${documentIds[index]}')"  style="color: #2563eb; text-decoration: none; padding: 8px;cursor:pointer;">
            ⬇️ Download
          </p> 
        </div>
        `;
      }).join('');
      
      documentsContainer.innerHTML = fileListHTML;
    }).catch(function(error) {
      console.error('Erro ao carregar lista de arquivos:', error);
      document.getElementById('file-list').innerHTML = `
        <div style="text-align: center; padding: 1rem 0; color: #DC2626;">
          <p style="margin: 0;">Erro ao carregar arquivos. Tente novamente.</p>
        </div>
      `;
    });

    // var documentsHTML = documentos.map(function(doc) {
    //   var fileName = doc.nome;
    //   var downloadUrl = 'https://#' + doc.id;
  
    //   return `
    //     <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background-color: #f8fafc; 
    // border-radius: 8px; margin-bottom: 8px; border: 1px solid #e2e8f0;">
    //       <div style="display: flex; align-items: center; gap: 12px;">
    //         <div style="width: 32px; height: 32px; background-color: #dbeafe; border-radius: 8px; display: flex; align-items: center; 
    // justify-content: center;">
    //           📄
    //         </div>
    //         <div>
    //           <p style="font-size: 14px; font-weight: 500; color: #0f172a; margin: 0;">${fileName}</p>
    //         </div>
    //       </div>
    //       <!-- <a href="${downloadUrl}" target="_blank" style="color: #2563eb; text-decoration: none; padding: 8px;">
    //         ⬇️ Download
    //       </a> -->
    //     </div>
    //   `;
    // }).join('');

    // documentsContainer.innerHTML = documentsHTML;
  },

  /**
   * Gerar HTML do badge de prioridade
   * @param {string} priority - Prioridade do ticket (LOW, MEDIUM, HIGH, URGENT)
   */
  getPriorityBadgeHTML: function(priority) {
    var priorityMap = {
      'LOW': { label: 'Baixa', color: 'bg-green-100 text-green-800', value: 'LOW' },
      'MEDIUM': { label: 'Média', color: 'bg-yellow-100 text-yellow-800', value: 'MEDIUM' },
      'HIGH': { label: 'Alta', color: 'bg-orange-100 text-orange-800', value: 'HIGH' },
      'URGENT': { label: 'Urgente', color: 'bg-red-100 text-red-800', value: 'URGENT' },
      'BAIXA': { label: 'Baixa', color: 'bg-green-100 text-green-800', value: 'LOW' },
      'MÉDIA': { label: 'Média', color: 'bg-yellow-100 text-yellow-800', value: 'MEDIUM' },
      'ALTA': { label: 'Alta', color: 'bg-orange-100 text-orange-800', value: 'HIGH' },
      'URGENTE': { label: 'Urgente', color: 'bg-red-100 text-red-800', value: 'URGENT' }
    };

    var priorityInfo = priorityMap[priority?.toUpperCase()] || { label: 'Não definida', color: 'bg-gray-100 text-gray-800', value: 'MEDIUM' };
    return '<span class="px-2 py-1 text-sm rounded-full ' + priorityInfo.color + '">' + priorityInfo.label + '</span>';
  },

  /**
   * Abrir edição inline de prioridade no header
   * @param {HTMLElement} cell - Elemento clicado
   * @param {Event} event - Evento de click
   */
  abrirEdicaoPrioridadeHeader: function(cell, event) {
    var self = this;

    // Prevenir propagação do evento
    if (event) {
      event.stopPropagation();
    }

    // Fechar qualquer editor aberto
    this.fecharEdicaoPrioridadeHeader();

    var ticketId = cell.getAttribute('data-ticket-id');
    var currentPriority = cell.getAttribute('data-priority');

    // Criar select inline
    var selectHTML = '\n' +
      '      <select\n' +
      '        id="priority-editor-header-' + ticketId + '"\n' +
      '        class="px-2 py-1 text-sm rounded-lg border border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white cursor-pointer"\n' +
      '        data-ticket-id="' + ticketId + '"\n' +
      '        data-original-priority="' + currentPriority + '"\n' +
      '      >\n' +
      '        <option value="LOW" ' + (currentPriority === 'LOW' ? 'selected' : '') + '>Baixa</option>\n' +
      '        <option value="MEDIUM" ' + (currentPriority === 'MEDIUM' ? 'selected' : '') + '>Média</option>\n' +
      '        <option value="HIGH" ' + (currentPriority === 'HIGH' ? 'selected' : '') + '>Alta</option>\n' +
      '        <option value="URGENT" ' + (currentPriority === 'URGENT' ? 'selected' : '') + '>Urgente</option>\n' +
      '      </select>\n' +
      '    ';

    // Substituir conteúdo da célula pelo select
    cell.innerHTML = selectHTML;

    var selectElement = document.getElementById('priority-editor-header-' + ticketId);

    if (selectElement) {
      // Prevenir propagação de eventos do select
      selectElement.addEventListener('click', function(e) {
        e.stopPropagation();
      });

      selectElement.addEventListener('mousedown', function(e) {
        e.stopPropagation();
      });

      // Focar no select imediatamente
      selectElement.focus();

      // Event listener para mudança de valor (salvar)
      selectElement.addEventListener('change', function() {
        var newPriority = this.value;
        var originalPriority = this.getAttribute('data-original-priority');

        // Só atualizar se realmente mudou
        if (newPriority !== originalPriority) {
          self.atualizarPrioridadeHeader(ticketId, newPriority, cell);
        }
      });

      // Event listener para ESC (cancelar)
      selectElement.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          self.fecharEdicaoPrioridadeHeader(cell, currentPriority);
        }
      });

      // Event listener para click fora do select (fechar sem salvar)
      setTimeout(function() {
        document.addEventListener('click', function clickOutsideHandler(e) {
          if (selectElement && !selectElement.contains(e.target)) {
            self.fecharEdicaoPrioridadeHeader(cell, currentPriority);
            document.removeEventListener('click', clickOutsideHandler);
          }
        });
      }, 300);
    }
  },

  /**
   * Atualizar prioridade via N8N (header)
   * @param {string} ticketId - ID do ticket
   * @param {string} newPriority - Nova prioridade
   * @param {HTMLElement} cell - Elemento para atualizar
   */
  atualizarPrioridadeHeader: function(ticketId, newPriority, cell) {
    var self = this;

    // Mostrar loading
    cell.innerHTML = '\n' +
      '      <div class="inline-flex items-center px-2 py-1">\n' +
      '        <svg class="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">\n' +
      '          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>\n' +
      '          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>\n' +
      '        </svg>\n' +
      '      </div>\n' +
      '    ';

    // Preparar dados para N8N
    var updateData = {
      objectId: ticketId,
      hs_ticket_priority: newPriority
    };

    console.log('📤 Atualizando prioridade (header):', updateData);

    // Enviar para N8N
    var endpointUrl = 'https://n8n2.rooftop.com.br/webhook/portal/update-ticket';

    fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData)
    })
      .then(function(response) {
        if (!response.ok) {
          throw new Error('Erro HTTP: ' + response.status);
        }
        return response.text().then(function(text) {
          try {
            return text ? JSON.parse(text) : { success: true };
          } catch (e) {
            return { success: true, data: text };
          }
        });
      })
      .then(function(responseData) {
        console.log('✅ Prioridade atualizada (header):', responseData);

        // Atualizar célula com novo valor
        cell.setAttribute('data-priority', newPriority);
        cell.innerHTML = self.getPriorityBadgeHTML(newPriority);

        // Mostrar feedback de sucesso
        cell.classList.add('bg-green-50');
        setTimeout(function() {
          cell.classList.remove('bg-green-50');
        }, 1000);
      })
      .catch(function(error) {
        console.error('❌ Erro ao atualizar prioridade (header):', error);

        // Mostrar erro e restaurar valor original
        cell.innerHTML = '\n' +
          '        <span class="px-2 py-1 text-sm rounded-full bg-red-100 text-red-800">Erro ao salvar</span>\n' +
          '      ';

        // Recarregar página após 2 segundos
        setTimeout(function() {
          window.location.reload();
        }, 2000);
      });
  },

  /**
   * Fechar editor de prioridade (header)
   * @param {HTMLElement} cell - Célula para restaurar (opcional)
   * @param {string} priority - Prioridade a restaurar (opcional)
   */
  fecharEdicaoPrioridadeHeader: function(cell, priority) {
    var self = this;

    // Se cell e priority forem fornecidos, restaurar valor
    if (cell && priority) {
      cell.innerHTML = this.getPriorityBadgeHTML(priority);
    }

    // Remover todos os editores abertos
    var editors = document.querySelectorAll('[id^="priority-editor-header-"]');
    editors.forEach(function(editor) {
      var ticketId = editor.getAttribute('data-ticket-id');
      var originalPriority = editor.getAttribute('data-original-priority');

      if (ticketId && originalPriority) {
        var parentCell = editor.closest('[data-priority-cell-header]');
        if (parentCell) {
          parentCell.innerHTML = self.getPriorityBadgeHTML(originalPriority);
        }
      }
    });
  }

  };

  window.negocioDetalheModule = module;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => module.init());
  } else {
    module.init();
  }
})();
