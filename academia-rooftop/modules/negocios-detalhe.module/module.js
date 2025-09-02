// Módulo de Detalhes do Negócio - HomeCash Rooftop
(function() {
  'use strict';
  
  var module = {
    selectedPhotoFiles: null,
    modalPhotos: [],
    currentModalPhotoIndex: 0,
    
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
      var html = this.generateNegocioHTML(data);
      this.contentEl.innerHTML = html;
      this.hideAllSections();
      this.contentEl.style.display = 'block';

      // Inicializa a galeria de fotos após a renderização
      this.getFotosInfo(data.ticket);
    },
    
    // =================================================================================
    // NOVA FUNÇÃO DE RENDERIZAÇÃO PRINCIPAL
    // =================================================================================
    generateNegocioHTML: function(data) {
        const { negocio, ticket, ticketPortal } = data;
        const ticketStatus = this.getTicketStatusInfo(ticketPortal ? ticketPortal.hs_pipeline_stage : null);
        const proponentes = this.getProponentesInfo(ticket);

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
                        <span class="badge ${ticketStatus.colorClass} mt-2">${ticketStatus.label}</span>
                    </div>
                   <!-- <div class="flex items-center gap-3">
                        <button onclick="window.negocioDetalheModule.openRegistrarAtividade()" class="btn btn-primary">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" /></svg>
                            Registrar Atividade
                        </button>
                    </div>  -->
                </div>
            </header>

            <!-- Layout Principal -->
            <main class="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                
                <!-- Coluna Principal (Esquerda) -->
                <div class="lg:col-span-2 space-y-6">
                    ${this.generateProgressStepper(ticketPortal)}
                    ${this.generateDetailsCard(negocio, ticket)}
                    ${this.generateDocumentsCard(ticket)}
                    ${this.generateApprovalCard(ticket)}
                </div>

                <!-- Coluna Lateral (Direita) -->
                <div class="space-y-6">
                    ${this.generateContactCard(negocio)}
                    ${this.generatePropertyCard(negocio)}
                    ${this.generateProponentsCard(proponentes)}
                    ${this.generateValuationCard(ticket)}
                    ${this.generatePhotoCard(ticket)}
                </div>
            </main>

            <!-- Modals (gerados dinamicamente ou estáticos) -->
            ${this.generateActivityModalHTML()}
            ${this.generatePhotoModalHTML()}
            ${this.generateSolicitarReajusteModalHTML()}
            ${this.generateUploadPhotoModalHTML()}
        `;
    },

    // =================================================================================
    // FUNÇÕES GERADORAS DE COMPONENTES PARA O NOVO LAYOUT
    // =================================================================================
    
      generateProgressStepper: function(ticketPortal) {
        if (!ticketPortal || !ticketPortal.hs_pipeline_stage) return '';
        const progress = this.getFunnelProgress(ticketPortal.hs_pipeline_stage);
        const steps = progress.steps;
        const currentIndex = progress.currentIndex;
        if (currentIndex < 0) return '';

        const stepsHTML = steps.map((step, index) => {
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
                const completionDate = this.getStepCompletionDate(step.id, ticketPortal);
                const hasCompletionDate = !!completionDate;
                
                if (hasCompletionDate) {
                    // Etapa com data - cor verde
                    statusClass = 'text-green-700';
                    ringClass = 'bg-green-100';
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
                const completionDate = this.getStepCompletionDate(step.id, ticketPortal);
                const hasCompletionDate = !!completionDate;
                const titleColor = hasCompletionDate ? 'text-green-600' : 'text-gray-600';
                const dateText = completionDate ? `Concluído em ${completionDate}` : 'Data de conclusão não disponível';
                content = `
                    <div class="pt-1 ml-4">
                        <p class="font-semibold ${titleColor}">${step.label}</p>
                        <p class="text-sm text-slate-500">${dateText}</p>
                    </div>
                `;
            } else if (isCurrent) {
                // Etapa atual - mostrar com animação e próximo passo
                const nextStepInfo = this.getNextStepInfo(step.label);
                content = `
                    <div>
                        <p class="font-semibold text-blue-600">${step.label}</p>
                        <p class="text-sm text-slate-500">Você está nesta etapa.</p>
                        ${nextStepInfo ? `
                            <div class="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                <p class="text-sm font-medium text-slate-700">Próximo passo:</p>
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
                        <p class="font-semibold text-slate-800">${step.label}</p>
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
    
    getNextStepInfo: function(currentStepLabel) {
        const stepActions = {
            'Lead inicial': {
                description: 'Agendar reunião com o cliente para apresentar o produto.',
                actionButton: `
                    <button onclick="window.negocioDetalheModule.openMarcarReuniaoModal()" class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM4 7h12v9a1 1 0 01-1 1H5a1 1 0 01-1-1V7z" clip-rule="evenodd" />
                        </svg>
                        Marcar Reunião
                    </button>
                `
            },
            'Reunião marcada': {
                description: 'Confirmar que a reunião foi realizada e seu resultado.',
                actionButton: `
                    <button onclick="window.negocioDetalheModule.openReuniaoRealizadaModal()" class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                        Reunião Realizada
                    </button>
                `
            },
            'Reunião realizada - Aguardando documentação': {
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
                description: 'Enviar os documentos complementares solicitados pelo backoffice.',
                actionButton: `
                    <div class="flex flex-col sm:flex-row gap-2">
                        <button onclick="window.negocioDetalheModule.openUploadDocumentModal()" class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-yellow-600 border border-transparent rounded-lg shadow-sm hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-2-2zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                            </svg>
                            Enviar Documentos Complementares
                        </button>
                        <button onclick="window.negocioDetalheModule.confirmarDocumentosComplementares()" class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-yellow-700 bg-white border border-yellow-300 rounded-lg shadow-sm hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                            </svg>
                            Confirmar Envio
                        </button>
                    </div>
                `
            },
            'Apresentação da proposta': {
                description: 'Realizar apresentação da proposta ao cliente.',
                actionButton: `
                    <button onclick="window.negocioDetalheModule.openApresentacaoRealizadaModal()" class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clip-rule="evenodd" />
                        </svg>
                        Apresentação Realizada
                    </button>
                `
            },
            'Negociação da proposta': {
                description: 'Solicitar reajuste da proposta se necessário.',
                actionButton: `
                    <button onclick="window.negocioDetalheModule.openSolicitarReajusteModal()" class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-lg shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
                        </svg>
                        Solicitar Reajuste da Proposta
                    </button>
                `
            },
            'Reajuste da proposta': {
                description: 'Aguarde o suporte da Rooftop entrar em contato. Caso tenha dúvidas, clique no botão abaixo.',
                actionButton: `
                    <button onclick="window.open('https://wa.me/551148587935?text=Olá! Preciso de suporte sobre o reajuste da minha proposta', '_blank')" class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd" />
                        </svg>
                        Entrar em Contato com Suporte
                    </button>
                `
            },
            'Descartado': {
                description: 'Reabrir negociação da proposta.',
                actionButton: `
                    <button onclick="window.open('https://wa.me/551148587935?text=Olá! Preciso de suporte para reabrir uma negociação descartada', '_blank')" class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd" />
                        </svg>
                        Entrar em Contato com Suporte
                    </button>
                `
            },
            'Perdido': {
                description: 'Reabrir negociação da proposta.',
                actionButton: `
                    <button onclick="window.open('https://wa.me/551148587935?text=Olá! Preciso de suporte para reabrir uma negociação perdida', '_blank')" class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd" />
                        </svg>
                        Entrar em Contato com Suporte
                    </button>
                `
            },
            'Documentação para formalização': {
                description: function(ticketData) {
                    // Verificar se documentos foram enviados usando getDocumentosInfo
                    const docs = window.negocioDetalheModule.getDocumentosInfo(ticketData);
                    const hasDocuments = docs.some(doc => doc.fileIds && doc.fileIds.length > 0);
                    
                    if (hasDocuments) {
                        return 'Documentos recebidos. Estamos analisando a documentação para dar continuidade ao processo.';
                    } else {
                        return 'Envie os documentos complementares e dados do proponente para formalização.';
                    }
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

        const ticketData = window.hubspotTicketPortalData ? window.hubspotTicketPortalData.data : null;

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
        console.log('negocio.qual_o_seu_principal_objetivo_', negocio.qual_o_seu_principal_objetivo_)
        const objetivoLabel = this.getObjetivoLabel(negocio ? negocio.qual_o_seu_principal_objetivo_ : null);
        
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
                    <div><label class="block text-sm font-medium text-slate-600 mb-1">Prioridade</label><select class="form-select" data-field="hs_ticket_priority">${this.getEnumerationOptions().hs_ticket_priority.map(opt => `<option value="${opt.value}" ${ticket && ticket.hs_ticket_priority === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('')}</select></div>
                    <div><label class="block text-sm font-medium text-slate-600 mb-1">História do cliente</label><textarea class="form-input" rows="4" data-field="historia_do_cliente">${negocio.historia_do_cliente || ''}</textarea></div>
                    <div><label class="block text-sm font-medium text-slate-600 mb-1">Principal objetivo</label><select class="form-select" data-field="qual_o_seu_principal_objetivo_">${this.getPrincipaisObjetivos().map(opt => `<option value="${opt.value}" ${negocio && negocio.qual_o_seu_principal_objetivo_ === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('')}</select></div>
                    <div class="flex justify-end gap-3 pt-2"><button onclick="window.negocioDetalheModule.cancelEdit('detalhes')" class="btn btn-secondary">Cancelar</button><button onclick="window.negocioDetalheModule.saveEdit('detalhes')" class="btn btn-primary">Salvar</button></div>
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

    generateApprovalCard: function(ticket) {
        const resumo = this.getResumoAprovacao(ticket);
        
        return `
        <div class="card p-6">
            <h2 class="text-lg font-semibold text-slate-900 mb-4">Resumo da Aprovação</h2>
            
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

    generateContactCard: function(negocio) {
        const contato = this.getContatoInfo(negocio);
        return `<div class="card p-6" id="bloco-contato"><div class="flex justify-between items-center mb-4"><h2 class="text-lg font-semibold text-slate-900">Contato</h2><button onclick="window.negocioDetalheModule.toggleEdit('contato')" class="btn btn-ghost btn-icon"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg></button></div><div class="view-mode space-y-4"><div><p class="text-sm font-medium text-slate-500">Telefone</p><p class="text-base text-slate-800 font-medium" data-field="telefone_do_contato">${contato.telefone}</p></div><div><p class="text-sm font-medium text-slate-500">E-mail</p><p class="text-base text-slate-800 font-medium" data-field="e_mail_do_contato">${contato.email}</p></div></div><div class="edit-mode hidden space-y-4"><div><label class="block text-sm font-medium text-slate-600 mb-1">Telefone</label><input type="tel" class="form-input" value="${contato.telefone}" data-field="telefone_do_contato"></div><div><label class="block text-sm font-medium text-slate-600 mb-1">E-mail</label><input type="email" class="form-input bg-slate-100 cursor-not-allowed" value="${contato.email}" disabled><p class="text-xs text-amber-600 mt-1">A alteração de e-mail deve ser solicitada ao backoffice.</p></div><div class="flex justify-end gap-3 pt-2"><button onclick="window.negocioDetalheModule.cancelEdit('contato')" class="btn btn-secondary">Cancelar</button><button onclick="window.negocioDetalheModule.saveEdit('contato')" class="btn btn-primary">Salvar</button></div></div></div>`;
    },

    generatePropertyCard: function(negocio) {
        const imovel = this.getImovelInfo(negocio);
        return `<div class="card p-6" id="bloco-imovel"><div class="flex justify-between items-center mb-4"><h2 class="text-lg font-semibold text-slate-900">Informações do Imóvel</h2><button onclick="window.negocioDetalheModule.toggleEdit('imovel')" class="btn btn-ghost btn-icon"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg></button></div><div class="view-mode space-y-4"><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"><div><p class="text-sm font-medium text-slate-500">Tipo</p><p class="text-base text-slate-800 font-medium" data-field="tipo_de_imovel">${imovel.tipo}</p></div><div><p class="text-sm font-medium text-slate-500">Endereço</p><p class="text-base text-slate-800 font-medium" data-field="qual_o_endereco_completo_do_imovel_">${imovel.logradouro}</p></div><div><p class="text-sm font-medium text-slate-500">Número</p><p class="text-base text-slate-800 font-medium" data-field="numero">${imovel.numero}</p></div><div><p class="text-sm font-medium text-slate-500">Complemento</p><p class="text-base text-slate-800 font-medium" data-field="complemento_do_endereco">${imovel.complemento}</p></div><div><p class="text-sm font-medium text-slate-500">Cidade</p><p class="text-base text-slate-800 font-medium" data-field="em_qual_cidade_fica_localizado_o_imovel_">${imovel.cidade}</p></div><div><p class="text-sm font-medium text-slate-500">Estado</p><p class="text-base text-slate-800 font-medium" data-field="estado">${imovel.estado}</p></div><div><p class="text-sm font-medium text-slate-500">CEP</p><p class="text-base text-slate-800 font-medium" data-field="cep">${imovel.cep}</p></div></div><div class="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200"><p class="text-sm font-medium text-blue-800">Faixa de Valor do Imóvel</p><p class="text-lg font-bold text-blue-900 mt-1" data-field="qual_a_faixa_de_valor_do_seu_imovel_">${imovel.valorFaixa}</p></div></div><div class="edit-mode hidden space-y-4"><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"><div><label class="block text-sm font-medium text-slate-600 mb-1">Tipo</label><select class="form-select" data-field="tipo_de_imovel"><option value="Apartamento" ${imovel.tipo === 'Apartamento' ? 'selected' : ''}>Apartamento</option><option value="Apartamento Duplex" ${imovel.tipo === 'Apartamento Duplex' ? 'selected' : ''}>Apartamento Duplex</option><option value="Apartamento Cobertura" ${imovel.tipo === 'Apartamento Cobertura' ? 'selected' : ''}>Apartamento Cobertura</option><option value="Casa" ${imovel.tipo === 'Casa' ? 'selected' : ''}>Casa de Rua</option><option value="Casa em Condomínio" ${imovel.tipo === 'Casa em Condomínio' ? 'selected' : ''}>Casa em Condomínio</option><option value="Terreno" ${imovel.tipo === 'Terreno' ? 'selected' : ''}>Terreno</option><option value="Sala Comercial" ${imovel.tipo === 'Sala Comercial' ? 'selected' : ''}>Sala Comercial</option></select></div><div><label class="block text-sm font-medium text-slate-600 mb-1">Endereço</label><input type="text" class="form-input" value="${imovel.logradouro}" data-field="qual_o_endereco_completo_do_imovel_"></div><div><label class="block text-sm font-medium text-slate-600 mb-1">Número</label><input type="text" class="form-input" value="${imovel.numero}" data-field="numero"></div><div><label class="block text-sm font-medium text-slate-600 mb-1">Complemento</label><input type="text" class="form-input" value="${imovel.complemento}" data-field="complemento_do_endereco"></div><div><label class="block text-sm font-medium text-slate-600 mb-1">Cidade</label><input type="text" class="form-input" value="${imovel.cidade}" data-field="em_qual_cidade_fica_localizado_o_imovel_"></div><div><label class="block text-sm font-medium text-slate-600 mb-1">Estado</label><input type="text" class="form-input" value="${imovel.estado}" data-field="estado"></div><div><label class="block text-sm font-medium text-slate-600 mb-1">CEP</label><input type="text" class="form-input" value="${imovel.cep}" data-field="cep" placeholder="00000-000"></div></div><div class="mt-4"><label class="block text-sm font-medium text-slate-600 mb-1">Faixa de Valor</label><select class="form-select" data-field="qual_a_faixa_de_valor_do_seu_imovel_"><option value="">Selecione</option><option value="Abaixo de R$ 500 mil" ${imovel.valorFaixa === 'Abaixo de R$ 500 mil' ? 'selected' : ''}>Abaixo de R$ 500 mil</option><option value="De R$ 501 mil a R$ 800 mil" ${imovel.valorFaixa === 'De R$ 501 mil a R$ 800 mil' ? 'selected' : ''}>De R$ 501 mil a R$ 800 mil</option><option value="De R$ 801 mil a R$ 1 milhão" ${imovel.valorFaixa === 'De R$ 801 mil a R$ 1 milhão' ? 'selected' : ''}>De R$ 801 mil a R$ 1 milhão</option><option value="De R$ 1 milhão a R$ 3 milhões" ${imovel.valorFaixa === 'De R$ 1 milhão a R$ 3 milhões' ? 'selected' : ''}>De R$ 1 milhão a R$ 3 milhões</option><option value="De R$ 3 milhões a R$ 6 milhões" ${imovel.valorFaixa === 'De R$ 3 milhões a R$ 6 milhões' ? 'selected' : ''}>De R$ 3 milhões a R$ 6 milhões</option></select></div><div class="flex justify-end gap-3 pt-4"><button onclick="window.negocioDetalheModule.cancelEdit('imovel')" class="btn btn-secondary">Cancelar</button><button onclick="window.negocioDetalheModule.saveEdit('imovel')" class="btn btn-primary">Salvar</button></div></div></div>`;
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
        return `<div class="card p-6"><h2 class="text-lg font-semibold text-slate-900 mb-4">Valores de Avaliação</h2><div class="space-y-4"><div class="flex justify-between"><p class="text-sm text-slate-500">Valor Avaliado</p><p class="text-sm font-semibold text-slate-800">${valores.valorAvaliado}</p></div><div class="flex justify-between"><p class="text-sm text-slate-500">Valor de Locação</p><p class="text-sm font-semibold text-slate-800">${valores.valorLocacao}</p></div><div class="flex justify-between"><p class="text-sm text-slate-500">Valor de Liquidez (Bruto)</p><p class="text-sm font-semibold text-slate-800">${valores.valorLiquidez}</p></div></div></div>`;
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
                    <div id="photo-carousel" class="flex gap-4 transition-transform duration-300"></div>
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
            </div>
        `;
    },

    generateActivityModalHTML: function() {
        return `<div id="modal-registrar-atividade" class="fixed inset-0 bg-black/60 z-50 hidden flex items-center justify-center p-4"><div class="relative bg-white rounded-xl shadow-2xl w-full max-w-lg"><div class="flex justify-between items-center p-5 border-b border-slate-200"><h3 class="text-lg font-semibold text-slate-900">Registrar Atividade</h3><button onclick="window.negocioDetalheModule.closeRegistrarAtividade()" class="btn btn-ghost btn-icon"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button></div><form id="form-registrar-atividade" class="p-5 space-y-4"><div><label class="block text-sm font-medium text-slate-600 mb-1">Tipo</label><select id="tipo-atividade" class="form-select"><option>Ligação</option><option>E-mail</option><option>Reunião</option></select></div><div><label class="block text-sm font-medium text-slate-600 mb-1">Descrição</label><textarea id="descricao-atividade" class="form-input" rows="4"></textarea></div><div class="flex justify-end gap-3 pt-4"><button type="button" onclick="window.negocioDetalheModule.closeRegistrarAtividade()" class="btn btn-secondary">Cancelar</button><button type="submit" class="btn btn-primary">Registrar</button></div></form></div></div>`;
    },

    generatePhotoModalHTML: function() {
        return `<div id="photo-modal" class="fixed inset-0 bg-black/80 z-50 hidden items-center justify-center p-4"><div class="relative max-w-5xl max-h-full"><button onclick="window.negocioDetalheModule.closePhotoModal()" class="absolute -top-10 right-0 text-white hover:text-gray-300"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button><img id="modal-photo" src="" alt="" class="max-w-full max-h-full object-contain rounded-lg"><div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 rounded-b-lg"><span id="modal-photo-type" class="badge badge-info mb-2"></span><p id="modal-photo-desc" class="text-white text-base"></p></div><button onclick="window.negocioDetalheModule.previousModalPhoto()" class="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full">&lt;</button><button onclick="window.negocioDetalheModule.nextModalPhoto()" class="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full">&gt;</button></div></div>`;
    },

    generateSolicitarReajusteModalHTML: function() {
        return `
            <div id="modal-solicitar-reajuste" class="fixed inset-0 bg-black/60 z-50 hidden flex items-center justify-center p-4">
                <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-lg">
                    <div class="flex justify-between items-center p-5 border-b border-slate-200">
                        <h3 class="text-lg font-semibold text-slate-900">Solicitar Reajuste da Proposta</h3>
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
                            <textarea id="justificativa-reajuste" class="form-input" rows="4" placeholder="Descreva a justificativa para o reajuste da proposta..." required></textarea>
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
                        <h3 class="text-lg font-semibold text-slate-900">Adicionar Fotos do Imóvel</h3>
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
                                <option value="fachada">Foto da Fachada</option>
                                <option value="interna">Fotos do Imóvel (Internas)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-600 mb-1">Selecionar Arquivos</label>
                            <div id="drop-zone-photo" class="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center bg-slate-50 hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer">
                                <input type="file" id="file-input-photo" multiple accept="image/*" class="hidden">
                                <div id="drop-content-photo">
                                    <svg class="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                                    </svg>
                                    <div class="mt-4">
                                        <p class="text-sm text-slate-600">
                                            <span class="font-medium text-blue-600 hover:text-blue-500 cursor-pointer">Clique para selecionar</span> ou arraste as imagens aqui
                                        </p>
                                        <p class="text-xs text-slate-500 mt-1">PNG, JPG, JPEG até 10MB cada</p>
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
    getStepCompletionDate: function(stepId, ticketData) {
      // console.log('getStepCompletionDate', stepId, ticketData);
      if (!ticketData || !stepId) return null;
      const fieldName = this.getDateEnteredFieldName(stepId);
      const timestamp = ticketData[fieldName];
      // return this.formatHubSpotDate(timestamp);
      return timestamp;
    },

    getTicketStatusInfo: function(hs_pipeline_stage) {
      var statusMap  = {
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
      return statusMap[hs_pipeline_stage] || { label: 'Status não identificado', colorClass: 'badge-gray' };
    },

    getFunnelSteps: function() {
      return [
        { id: '1095534672', label: 'Lead inicial' },
        { id: '1095534673', label: 'Reunião marcada' },
        { id: '1095534674', label: 'Reunião realizada - Aguardando documentação', combinedIds: ['1095534674', '1095534675'] },
        { id: '1043275525', label: 'Documentação enviada' },
        { id: '1043275526', label: 'Aguardando documentos complementares' },
        { id: '1043275527', label: 'Em análise do backoffice' },
        { id: '1095528865', label: 'Avaliação do imóvel' },
        { id: '1062003577', label: 'Apresentação da proposta' },
        { id: '1062003578', label: 'Negociação da proposta' },
        { id: '1095528866', label: 'Reajuste da proposta' },
        { id: '1095528867', label: 'Documentação para formalização' },
        { id: '1095528868', label: 'Formalização Jurídica' },
        { id: '1095528869', label: 'Condicionais e Registro do imóvel' },
        { id: '1095528870', label: 'Finalização do pagamento' },
        { id: '1095528871', label: 'Em locação' },
        { id: '1095528872', label: 'Descartado' },
        { id: '1095528873', label: 'Perdido' }
      ];
    },

    getFunnelProgress: function(currentStageId) {
      var allSteps = this.getFunnelSteps();
      
      // Verificar se a etapa atual é "Descartado" ou "Perdido"
      var isDescartadoOrPerdido = currentStageId === '1095528872' || currentStageId === '1095528871';
      
      if (isDescartadoOrPerdido) {
        // Se for Descartado ou Perdido, mostrar apenas essas duas etapas
        var steps = [
          { id: '1095528872', label: 'Descartado' },
          { id: '1095528871', label: 'Perdido' }
        ];
        var currentIndex = steps.findIndex(step => step.id === currentStageId);
        return { steps, currentIndex };
      } else {
        // Caso contrário, mostrar o funil normal (excluindo Descartado e Perdido)
        var steps = allSteps.filter(step => step.id !== '1095528872' && step.id !== '1095528871');
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

    getObjetivoLabel: function(value) {
      var formatedValue = Array.isArray(value) ? value[0] : value;
      var objetivo = this.getPrincipaisObjetivos().find(obj => obj.label === formatedValue);
      console.log('objetivo', objetivo)
      console.log('formatedValue', formatedValue)
      return objetivo ? objetivo.label : 'Não informado';
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
    
    getEnumerationLabel: function(fieldName, value) {
      if (!value) return '';
      
      var options = this.getEnumerationOptions()[fieldName];
      if (!options) return value;
      
      var option = options.find(function(opt) {
        return opt.value === value;
      });
      
      return option ? option.label : value;
    },
    
    getImovelInfo: function(negocio) {
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
          valorFaixa: 'Não informado'
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
        valorFaixa: this.safeGetArrayValue(negocio.qual_a_faixa_de_valor_do_seu_imovel_) || 'Não informado'
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

    getValoresAvaliacao: function(ticket) {
        if (!ticket) return { valorAvaliado: 'N/A', valorLocacao: 'N/A', valorLiquidez: 'N/A' };
        return {
            valorAvaliado: this.formatCurrency(ticket.valor_avaliado),
            valorLocacao: this.formatCurrency(ticket.valor_da_locacao),
            valorLiquidez: this.formatCurrency(ticket.valor_de_liquidez__bruto_),
        };
    },

    getResumoAprovacao: function(ticket) {
        if (!ticket) return { 
            valorCompra12: 'N/A', 
            valorLocacao12: 'N/A', 
            comentarios: 'N/A',
            linkApresentacao: null
        };
        return {
            valorCompra12: this.formatCurrency(ticket.valor_aprovado_para_compra___12_meses),
            valorLocacao12: this.formatCurrency(ticket.valor_aprovado_para_locacao___12_meses),
            comentarios: ticket.comentarios_comite__pendencias_e_ressalvas_ || 'N/A',
            linkApresentacao: ticket.link_da_proposta || null
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
          }
        }
      }
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
        alert('Nenhuma alteração detectada.');
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
          alert('Todos os campos foram atualizados com sucesso!');
        })
        .catch(function(error) {
          console.error('Erro ao salvar campos:', error);
          alert('Erro ao salvar alguns campos. Verifique o console para detalhes.');
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
      var isTicketField = fieldName === 'hs_ticket_priority';
      
      console.log('📋 Obtendo valor original para campo:', fieldName, '| É ticket?', isTicketField);
      
      var originalValue = null;
      
      if (isTicketField && window.hubspotTicketData) {
        originalValue = this.safeGetArrayValue(window.hubspotTicketData.data[fieldName]);
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
      var isTicketField = fieldName === 'hs_ticket_priority';
      var objectType = isTicketField ? 'ticket' : 'deal';
      var objectId = isTicketField ? 
        (window.hubspotTicketData ? window.hubspotTicketData.data.hs_object_id : null) :
        (window.hubspotNegocioData ? window.hubspotNegocioData.data.hs_object_id : null);
      
      console.log('💾 Preparando salvamento:', {
        fieldName: fieldName,
        newValue: newValue,
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
      payload[fieldName] = newValue;
      
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
        viewElement.innerHTML = '<span>' + priorityInfo.icon + '</span>' + priorityInfo.label;
        viewElement.className = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ' + priorityInfo.color;
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
        alert('Máximo de 3 proponentes permitido.');
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
        alert('Por favor, preencha todos os campos.');
        return;
      }
      
      if (cpf.length !== 11) {
        alert('CPF deve ter 11 dígitos.');
        return;
      }
      
      var ticketId = window.hubspotTicketPortalData ? window.hubspotTicketPortalData.data.hs_object_id : null;
      if (!ticketId) {
        alert('ID do ticket do portal não encontrado.');
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
        alert('Proponente adicionado com sucesso!');
        setTimeout(function() { window.location.reload(); }, 500);
      })
      .catch(function(error) {
        console.error('Erro ao cadastrar proponente:', error);
        alert('Erro ao cadastrar proponente. Tente novamente.');
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
        alert('Tipo de documento não reconhecido.');
        return;
      }
      
      var docs = this.getDocumentosInfo(window.hubspotTicketData ? window.hubspotTicketData.data : null);
      var doc = docs.find(function(d) { return d.id === docId; });
      if (!doc) {
        alert('Documento não encontrado.');
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
            alert('Arquivo "' + file.name + '" é muito grande. Máximo 10MB.');
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
            alert('Arquivo "' + file.name + '" é muito grande. Máximo 10MB.');
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
        alert('Nenhum arquivo selecionado.');
        return;
      }
      
      var uploadButton = document.getElementById('upload-button');
      var originalText = uploadButton.textContent;
      
      uploadButton.disabled = true;
      uploadButton.textContent = 'Enviando...';
      uploadButton.style.backgroundColor = '#9CA3AF';
      
      var ticketId = window.hubspotTicketData ? window.hubspotTicketData.data.hs_object_id : null;
      
      if (!ticketId) {
        alert('ID do ticket do portal não encontrado.');
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
          alert('Upload realizado com sucesso!');
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
          alert('Erro ao enviar arquivo "' + file.name + '". Tente novamente.');
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
        alert('Nenhum arquivo encontrado para este documento.');
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
          alert('Erro ao carregar o arquivo. Tente novamente.');
        }
      }).catch(function(error) {
        console.error('Erro ao baixar arquivo:', error);
        alert('Erro ao baixar arquivo. Tente novamente.');
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
    
    renderPhotoItem: function(foto, index) {
      var isPdf = this.isPdfFile(foto);
      
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
    openPhotoModal: function(index) { this.currentModalPhotoIndex = index; const modal = document.getElementById('photo-modal'); if (modal && this.modalPhotos[index]) { const foto = this.modalPhotos[index]; document.getElementById('modal-photo').src = foto.url; document.getElementById('modal-photo-type').textContent = foto.tipo; document.getElementById('modal-photo-desc').textContent = foto.desc; modal.classList.remove('hidden'); modal.classList.add('flex'); } },
    closePhotoModal: function() { const modal = document.getElementById('photo-modal'); if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); } },
    nextModalPhoto: function() { this.currentModalPhotoIndex = (this.currentModalPhotoIndex + 1) % this.modalPhotos.length; this.updateModalPhoto(); },
    previousModalPhoto: function() { this.currentModalPhotoIndex = (this.currentModalPhotoIndex - 1 + this.modalPhotos.length) % this.modalPhotos.length; this.updateModalPhoto(); },
    updateModalPhoto: function() { if (this.modalPhotos[this.currentModalPhotoIndex]) { const foto = this.modalPhotos[this.currentModalPhotoIndex]; document.getElementById('modal-photo').src = foto.url; document.getElementById('modal-photo-type').textContent = foto.tipo; document.getElementById('modal-photo-desc').textContent = foto.desc; } },
    
    downloadPhoto: function(photoId) {
      var self = this;
      
      // Encontrar a foto pelo ID
      var foto = this.modalPhotos.find(function(f) { return f.id === photoId; });
      if (!foto || !foto.fileData) {
        alert('Foto não encontrada');
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
            alert('Erro ao carregar foto. Tente novamente.');
          }
        }).catch(function(error) {
          console.error('Erro ao baixar foto:', error);
          alert('Erro ao baixar foto. Tente novamente.');
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
    nextPhoto: function() { const carousel = document.getElementById('photo-carousel'); if (carousel) carousel.scrollBy({ left: 300, behavior: 'smooth' }); },
    previousPhoto: function() { const carousel = document.getElementById('photo-carousel'); if (carousel) carousel.scrollBy({ left: -300, behavior: 'smooth' }); },
    parseFileIds: function(fieldValue) { if (!fieldValue) return []; return fieldValue.split(';').map(id => id.trim()).filter(Boolean); },
    loadFileFromEndpoint: function(fileId) { if (this.fileCache[fileId]) return Promise.resolve(this.fileCache[fileId]); return fetch(`https://n8n2.rooftop.com.br/webhook/portal/get-file?id=${fileId}`).then(res => res.json()).then(data => { this.fileCache[fileId] = data; return data; }); },
    
    // =====================================================
    // FUNÇÕES PARA AÇÕES DO PROGRESS STEPPER
    // =====================================================
    
    openReuniaoRealizadaModal: function() {
      var self = this;
      
      var modalHTML = `
        <div id="reuniao-realizada-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.5); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 1rem;">
          <div style="position: relative; background: white; border-radius: 0.5rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); max-width: 28rem; width: 100%; overflow-y: auto;">
            <div style="padding: 1.5rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3 style="font-size: 1.125rem; font-weight: 500; color: #111827;">Marcar Reunião como Realizada</h3>
                <button onclick="window.negocioDetalheModule.closeReuniaoRealizadaModal()" style="color: #9CA3AF; cursor: pointer; border: none; background: none; padding: 0.25rem;">
                  <svg style="width: 1.5rem; height: 1.5rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              
              <form id="reuniao-realizada-form" style="display: flex; flex-direction: column; gap: 1rem;">
                <div>
                  <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Data da Reunião</label>
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
      var data = document.getElementById('reuniao-data').value;
      var observacoes = document.getElementById('reuniao-observacoes').value;
      
      if (!data) {
        alert('Por favor, informe a data da reunião.');
        return;
      }
      
      this.updateStep('1095534674', 'Reunião realizada', {
        data: data,
        observacoes: observacoes,
        tipo: 'reuniao_realizada'
      });
      
      this.closeReuniaoRealizadaModal();
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
        alert('Acesse a seção de documentos para fazer o upload dos arquivos necessários.');
      }
    },
    
    marcarDocumentacaoEnviada: function() {
      if (confirm('Confirma que o cliente já enviou toda a documentação necessária?')) {
        console.log('Marcando documentação como enviada pelo cliente');
        alert('Documentação marcada como enviada. O status será atualizado.');
        
        // Simular atualização de status
        setTimeout(function() {
          window.location.reload();
        }, 500);
      }
    },
    
    marcarDocumentacaoRecebida: function() {
      if (confirm('Confirma que toda a documentação foi recebida e está completa?')) {
        console.log('Marcando documentação como recebida');
        alert('Documentação marcada como recebida. O negócio avançará para a próxima etapa.');
        
        // Simular atualização de status
        setTimeout(function() {
          window.location.reload();
        }, 500);
      }
    },
    
    updateStep: function(stepId, stepLabel, data) {
      var self = this;
      var ticketId = window.hubspotTicketPortalData ? window.hubspotTicketPortalData.data.hs_object_id : null;
      
      if (!ticketId) {
        alert('ID do ticket do portal não encontrado.');
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
        alert('Etapa atualizada com sucesso!');
        
        setTimeout(function() {
          window.location.reload();
        }, 500);
      })
      .catch(function(error) {
        console.error('Erro ao atualizar step:', error);
        alert('Erro ao atualizar etapa. Tente novamente.');
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
                  <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Título da Reunião</label>
                  <input type="text" id="reuniao-titulo" style="width: 100%; padding: 0.75rem; border: 1px solid #D1D5DB; border-radius: 0.5rem; font-size: 0.875rem;" placeholder="Ex: Reunião inicial com cliente..." required>
                </div>
                
                <div>
                  <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Data e Hora</label>
                  <input type="datetime-local" id="reuniao-start-time" style="width: 100%; padding: 0.75rem; border: 1px solid #D1D5DB; border-radius: 0.5rem; font-size: 0.875rem;" required>
                </div>
                
                <div>
                  <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Descrição</label>
                  <textarea id="reuniao-body" rows="3" style="width: 100%; padding: 0.75rem; border: 1px solid #D1D5DB; border-radius: 0.5rem; font-size: 0.875rem; resize: vertical;" placeholder="Descreva o objetivo da reunião..." required></textarea>
                </div>
                
                <div>
                  <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Notas Internas</label>
                  <textarea id="reuniao-internal-notes" rows="2" style="width: 100%; padding: 0.75rem; border: 1px solid #D1D5DB; border-radius: 0.5rem; font-size: 0.875rem; resize: vertical;" placeholder="Notas internas sobre a reunião..."></textarea>
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
      var titulo = document.getElementById('reuniao-titulo').value.trim();
      var startTime = document.getElementById('reuniao-start-time').value;
      var body = document.getElementById('reuniao-body').value.trim();
      var internalNotes = document.getElementById('reuniao-internal-notes').value.trim();
      
      if (!titulo || !startTime || !body) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
      }
      
      var ticketId = window.hubspotTicketPortalData ? window.hubspotTicketPortalData.data.hs_object_id : null;
      
      if (!ticketId) {
        alert('ID do ticket do portal não encontrado.');
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
      
      console.log('Agendando reunião:', payload);
      
      fetch('https://n8n2.rooftop.com.br/webhook/portal/register-activities/meeting', {
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
        console.log('Reunião agendada com sucesso:', result);
        alert('Reunião agendada com sucesso!');
        
        // Após agendar, atualizar o step para "Reunião marcada"
        return window.negocioDetalheModule.updateStep('1095534673', 'Reunião marcada', {
          tipo: 'agendamento_reuniao',
          titulo: titulo,
          dataHora: isoStartTime
        });
      })
      .then(function() {
        window.negocioDetalheModule.closeMarcarReuniaoInicialModal();
      })
      .catch(function(error) {
        console.error('Erro ao agendar reunião:', error);
        alert('Erro ao agendar reunião. Tente novamente.');
      });
    },
    
    confirmarEnvioDocumentacao: function() {
      if (confirm('Confirma que toda a documentação foi enviada pelo cliente?')) {
        this.updateStep('1043275525', 'Documentação enviada', {
          tipo: 'confirmacao_documentacao'
        });
      }
    },
    
    confirmarDocumentosComplementares: function() {
      if (confirm('Confirma que todos os documentos complementares foram enviados pelo cliente?')) {
        this.updateStep('1043275527', 'Em análise do backoffice', {
          tipo: 'confirmacao_documentos_complementares'
        });
      }
    },
    
    openApresentacaoRealizadaModal: function() {
      var self = this;
      
      var modalHTML = `
        <div id="apresentacao-realizada-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.5); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 1rem;">
          <div style="position: relative; background: white; border-radius: 0.5rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); max-width: 32rem; width: 100%; overflow-y: auto;">
            <div style="padding: 1.5rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3 style="font-size: 1.125rem; font-weight: 500; color: #111827;">Apresentação da Proposta Realizada</h3>
                <button onclick="window.negocioDetalheModule.closeApresentacaoRealizadaModal()" style="color: #9CA3AF; cursor: pointer; border: none; background: none; padding: 0.25rem;">
                  <svg style="width: 1.5rem; height: 1.5rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              
              <form id="apresentacao-realizada-form" style="display: flex; flex-direction: column; gap: 1rem;">
                <div>
                  <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Data da Apresentação</label>
                  <input type="date" id="apresentacao-data" style="width: 100%; padding: 0.75rem; border: 1px solid #D1D5DB; border-radius: 0.5rem; font-size: 0.875rem;" required>
                </div>
                
                <div>
                  <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Resultado da Apresentação</label>
                  <textarea id="apresentacao-resultado" rows="4" style="width: 100%; padding: 0.75rem; border: 1px solid #D1D5DB; border-radius: 0.5rem; font-size: 0.875rem; resize: vertical;" placeholder="Descreva o resultado da apresentação, reações do cliente, próximos passos..." required></textarea>
                </div>
                
                <div>
                  <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Próximo Passo</label>
                  <select id="apresentacao-proximo-passo" style="width: 100%; padding: 0.75rem; border: 1px solid #D1D5DB; border-radius: 0.5rem; font-size: 0.875rem; background-color: white;" required>
                    <option value="">Selecione o próximo passo</option>
                    <option value="renegociar">Cliente quer renegociar a proposta</option>
                    <option value="formalizar">Pode seguir para formalização</option>
                  </select>
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
    
    confirmarApresentacaoRealizada: function() {
      var data = document.getElementById('apresentacao-data').value.trim();
      var resultado = document.getElementById('apresentacao-resultado').value.trim();
      var proximoPasso = document.getElementById('apresentacao-proximo-passo').value.trim();
      
      if (!data || !resultado || !proximoPasso) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
      }
      
      // Formatar data para DD/MM/AAAA
      var dateObj = new Date(data + 'T12:00:00'); // Adicionar horário para evitar problemas de timezone
      var formattedDate = dateObj.toLocaleDateString('pt-BR');
      
      // Determinar próxima etapa baseado na seleção
      var proximaEtapa, proximoLabel;
      
      if (proximoPasso === 'renegociar') {
        proximaEtapa = '1062003578';
        proximoLabel = 'Negociação da proposta';
      } else if (proximoPasso === 'formalizar') {
        proximaEtapa = '1095528867';
        proximoLabel = 'Documentação para formalização';
      }
      
      this.updateStep(proximaEtapa, proximoLabel, {
        data: formattedDate,
        resultado: resultado,
        proximo_passo: proximoPasso,
        tipo: 'apresentacao_realizada'
      });
      
      this.closeApresentacaoRealizadaModal();
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
        alert('Por favor, informe a justificativa para o reajuste.');
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
        alert('ID do ticket do portal não encontrado.');
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
        alert('Solicitação de reajuste criada com sucesso!');
        
        // Atualizar o step do funil
        self.updateStep('1095528866', 'Reajuste da proposta', {
          justificativa: justificativa,
          tipo: 'solicitacao_reajuste',
          taskId: result.taskId || null
        });
      })
      .catch(function(error) {
        console.error('Erro ao criar task de reajuste:', error);
        alert('Erro ao criar solicitação de reajuste. Tente novamente.');
        
        // Esconder loading se houver
        if (typeof self.hideLoading === 'function') {
          self.hideLoading();
        }
      });
    },
    
    openDocumentosComplementaresModal: function() {
      alert('Funcionalidade será implementada em breve.');
    },
    
    reabrirNegociacao: function() {
      if (confirm('Deseja reabrir a negociação da proposta?')) {
        this.updateStep('1062003577', 'Negociação da proposta', {
          tipo: 'reabertura_negociacao'
        });
      }
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
      
      // Filtrar apenas imagens
      var imageFiles = files.filter(file => file.type.startsWith('image/'));
      
      if (imageFiles.length === 0) {
        this.showAlert('Arquivo Inválido', 'Por favor, selecione apenas arquivos de imagem (PNG, JPG, JPEG).', 'warning');
        return;
      }
      
      // Verificar tamanho dos arquivos
      var oversizedFiles = imageFiles.filter(file => file.size > 10 * 1024 * 1024);
      if (oversizedFiles.length > 0) {
        this.showAlert('Arquivo Muito Grande', 'Alguns arquivos são maiores que 10MB. Por favor, selecione arquivos menores.', 'warning');
        return;
      }
      
      this.selectedPhotoFiles = imageFiles;
      console.log('selectedPhotoFiles set to:', this.selectedPhotoFiles);
      
      // Exibir lista de arquivos
      fileList.innerHTML = imageFiles.map(file => `
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
        this.showAlert('Campo Obrigatório', 'Por favor, selecione o tipo de foto.', 'warning');
        return;
      }
      
      if (!this.selectedPhotoFiles || this.selectedPhotoFiles.length === 0) {
        console.log('No files selected or selectedPhotoFiles is null');
        this.showAlert('Nenhum Arquivo', 'Por favor, selecione pelo menos um arquivo de imagem.', 'warning');
        return;
      }
      
      // Verificar novamente se os arquivos ainda existem
      if (!this.selectedPhotoFiles || this.selectedPhotoFiles.length === 0) {
        this.showAlert('Erro', 'Os arquivos selecionados foram perdidos. Tente novamente.', 'error');
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
        this.showAlert('Erro', 'ID do ticket não encontrado.', 'error');
        return;
      }
      
      // Determinar o campo correto baseado no tipo
      var fieldName = tipoFoto === 'fachada' ? 'fotos_da_fachada' : 'fotos_internas';
      
      // Verificar se files existe e é um array
      if (!files || !Array.isArray(files) || files.length === 0) {
        this.setUploadButtonLoading(false);
        this.showAlert('Erro', 'Nenhum arquivo foi selecionado para upload.', 'error');
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
          self.showAlert('Sucesso', 'Fotos enviadas com sucesso!', 'success');
          
          // Recarregar a página para atualizar as fotos
          setTimeout(function() {
            window.location.reload();
          }, 1500);
        } else {
          self.selectedPhotoFiles = null; // Limpar arquivos após erro
          self.showAlert('Erro no Upload', 'Erro ao enviar uma ou mais fotos. Tente novamente.', 'error');
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
          self.showAlert('Erro', 'Erro ao enviar foto "' + file.name + '". Processo interrompido.', 'error');
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
      
      if (!confirm('Deseja realmente remover esta foto?')) {
        return;
      }
      
      var ticketId = window.hubspotTicketPortalData ? window.hubspotTicketPortalData.data.hs_object_id : null;
      
      if (!ticketId) {
        this.showAlert('Erro', 'ID do ticket não encontrado.', 'error');
        return;
      }
      
      var payload = {
        ticketId: parseInt(ticketId),
        imageId: imageId
      };
      
      console.log('Removendo foto:', payload);
      
      fetch('https://n8n2.rooftop.com.br/webhook/portal/remove-image', {
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
        console.log('Foto removida com sucesso:', result);
        self.showAlert('Sucesso', 'Foto removida com sucesso!', 'success');
        
        // Atualizar a galeria removendo a foto
        self.modalPhotos = self.modalPhotos.filter(function(foto) {
          return foto.originalFileId !== imageId;
        });
        
        self.updatePhotoGallery(self.modalPhotos);
      })
      .catch(function(error) {
        console.error('Erro ao remover foto:', error);
        self.showAlert('Erro na Remoção', 'Erro ao remover foto. Tente novamente.', 'error');
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
    }
  };

  window.negocioDetalheModule = module;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => module.init());
  } else {
    module.init();
  }
})();
