// Módulo Portal de Conteúdos - Rooftop Franquias
(function () {
    'use strict';
  
    var module = {
      // Configuração das APIs
      apiConfig: {
        baseUrl: 'https://n8n2.rooftop.com.br/webhook/portal',
        endpoints: {
          getContent: '/get-content',
          getFile: '/get-file'
        }
      },
      
      // Configuração HubDB via N8N (SISTEMA UNIFICADO)
      hubdbConfig: {
        baseUrl: 'https://n8n2.rooftop.com.br/webhook/portal/hubdb',
        tables: {
          content: '132105533'    // Nova tabela unificada
        }
      },
  
      // Estado do módulo (SIMPLIFICADO)
      state: {
        contact_id: null,
        searchTerm: '',
        selectedCategory: '',
        selectedType: '',
        viewMode: 'list',
        conteudos: [],
        filteredConteudos: [],
        loading: false,
        error: false,
        modalAberto: false,
        conteudoAtual: null,
        stats: {
          treinamentos: 0,
          webinars: 0,
          documentos: 0,
          total: 0
        }
      },
  
      // Comportamentos por tipo de conteúdo (SISTEMA SIMPLIFICADO)
      contentBehaviors: {
        1: { // video_youtube
          action: 'redirect',
          buttonText: 'Assistir Vídeo',
          icon: 'play'
        },
        2: { // file_attachment  
          action: 'redirect',
          buttonText: 'Abrir Arquivo',
          icon: 'external-link'
        },
        3: { // link_google_docs
          action: 'redirect',
          buttonText: 'Abrir Documento',
          icon: 'external-link'
        },
        4: { // link_google_slides
          action: 'redirect', 
          buttonText: 'Abrir Apresentação',
          icon: 'external-link'
        },
        5: { // link_gamma_app
          action: 'redirect',
          buttonText: 'Abrir no Gamma',
          icon: 'external-link'
        }
      },
  
      // Tipos de solicitação de materiais
      tiposSolicitacao: {
        'logo': 'Logo Personalizado',
        'banner': 'Banner/Cartaz',
        'flyer': 'Flyer',
        'social_media': 'Post Redes Sociais',
        'video': 'Vídeo Promocional',
        'outros': 'Outros'
      },
  
      init: function () {
        console.log('🚀 Inicializando Portal de Conteúdos Module');
        
        this.container = document.querySelector('[data-module="portalConteudosModule"]');
        if (!this.container) return;
  
        // Elementos DOM
        this.contentEl = this.container.querySelector('.conteudos-content');
        this.errorEl = this.container.querySelector('.conteudos-error');
        this.loadingEl = this.container.querySelector('.conteudos-loading');
        this.noContactEl = this.container.querySelector('.conteudos-no-contact');
  
        // Inicializar contact_id
        this.initContactId();
        
        // Carregar conteúdos
        this.loadConteudos();
      },
  
      initContactId: function () {
        console.log('🔍 Inicializando Contact ID...');
        console.log('window.portalConteudosData disponível:', !!window.portalConteudosData);
        
        // Obter contact_id do processamento HubL
        if (window.portalConteudosData && window.portalConteudosData.contact_id) {
          this.state.contact_id = window.portalConteudosData.contact_id;
          console.log('✅ Contact ID obtido do HubDB:', this.state.contact_id);
        } else {
          // Fallback: tentar obter de outras fontes
          var urlParams = new URLSearchParams(window.location.search);
          var paramContactId = urlParams.get('contact_id');
          var storedContactId = localStorage.getItem('contact_id');
          
          this.state.contact_id = paramContactId || storedContactId || null;
          console.warn('⚠️ Contact ID obtido de fallback:', this.state.contact_id);
        }
        
        console.log('🏁 Contact ID final:', this.state.contact_id);
      },
  
      loadConteudos: function () {
        console.log('🚀 loadConteudos iniciado (SISTEMA UNIFICADO)');
        console.log('Contact ID no state:', this.state.contact_id);
        
        // REGRA: Só mostrar conteúdo se tiver contact_id
        if (!this.state.contact_id) {
          console.warn('⚠️ Contact ID não encontrado - Login Necessário');
          this.showNoContactState();
          return;
        }
        
        console.log('🎯 Contact ID válido - carregando conteúdos da nova tabela');
        this.showLoadingState();
        this.fetchConteudosUnificados();
      },
  
      // ✅ FUNÇÃO PRINCIPAL: Buscar conteúdos da tabela unificada
      fetchConteudosUnificados: async function () {
        try {
          console.log('🔄 Buscando conteúdos da tabela unificada...');
          
          // Buscar apenas da tabela content (sem relacionamentos)
          const conteudos = await this.fetchTableData('content');
          
          console.log('✅ Conteúdos carregados:', conteudos.length);
          
          // Processar dados simples
          this.processarConteudosUnificados(conteudos);
          
        } catch (error) {
          console.error('❌ Erro ao buscar conteúdos unificados:', error);
          this.showErrorState();
        }
      },

      // Buscar dados de uma tabela específica 
      fetchTableData: async function(tableName) {
        const tableId = this.hubdbConfig.tables[tableName];
        if (!tableId) {
          throw new Error(`Tabela ${tableName} não encontrada na configuração`);
        }
        
        const url = `${this.hubdbConfig.baseUrl}?tableId=${tableId}`;
        
        try {
          console.log(`🔍 Buscando tabela ${tableName} (${tableId})...`);
          
          const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          });
          
          if (!response.ok) {
            console.warn(`⚠️ Erro ${response.status} ao buscar ${tableName}, usando dados mock`);
            return this.getMockContentData();
          }
          
          const data = await response.json();
          const results = data.results || [];
          
          console.log(`✅ Tabela ${tableName} carregada:`, results.length, 'registros');
          return results;
          
        } catch (error) {
          console.warn(`⚠️ Erro ao buscar tabela ${tableName}, usando dados mock:`, error.message);
          return this.getMockContentData();
        }
      },

      // Processar conteúdos unificados (MUITO MAIS SIMPLES)
      processarConteudosUnificados: function(conteudos) {
        try {
          console.log('🔄 Processando conteúdos unificados...');
          console.log('📊 Total de conteúdos recebidos:', conteudos.length);
          console.log('🔍 Exemplo de conteúdo:', conteudos[0]);
          
          // Filtrar apenas conteúdos ativos
          this.state.conteudos = conteudos
            .filter(content => content.values.status && content.values.status.name === 'active')
            .map(content => ({
              id: content.id,
              title: content.values.title || '',
              description: content.values.description || '',
              category: content.values.category ? (content.values.category.label || content.values.category.name) : 'Outros',
              content_type: content.values.content_type ? {
                id: parseInt(content.values.content_type.id),
                name: content.values.content_type.name || content.values.content_type.label
              } : { id: 2, name: 'File Attachment' },
              content_url: content.values.content_url || '',
              attachment_url: content.values.attachment_url ? 
                (typeof content.values.attachment_url === 'object' ? content.values.attachment_url.url : content.values.attachment_url) : '',
              thumbnail_url: content.values.thumbnail_url || '',
              duration: content.values.duration || '',
              tags: this.processTags(content.values.tags),
              display_order: content.values.display_order || 0,
              created_at: content.values.created_at
            }))
            .sort((a, b) => a.display_order - b.display_order);
          
          // Calcular estatísticas simples
          this.calcularEstatisticasSimples();
          
          // Inicializar filtros
          this.state.filteredConteudos = this.state.conteudos;
          
          console.log('✅ Conteúdos processados:', this.state.conteudos.length);
          console.log('📋 Conteúdos finais:', this.state.conteudos);
          this.showSuccessState();
          
        } catch (error) {
          console.error('❌ Erro ao processar conteúdos:', error);
          this.showErrorState();
        }
      },

      // Calcular estatísticas simples
      calcularEstatisticasSimples: function() {
        const stats = {
          treinamentos: 0,
          webinars: 0, 
          documentos: 0,
          total: this.state.conteudos.length
        };
        
        this.state.conteudos.forEach(content => {
          switch(content.category) {
            case 'Treinamentos':
              stats.treinamentos++;
              break;
            case 'Webinars':
              stats.webinars++;
              break;
            default:
              stats.documentos++;
              break;
          }
        });
        
        this.state.stats = stats;
        console.log('📊 Estatísticas:', stats);
      },

      // Dados mock para desenvolvimento
      getMockContentData: function() {
        return [
          {
            id: 1,
            values: {
              title: 'Processo de Due Diligence',
              description: 'Como fazer uma avaliação segura e completa do negócio antes da compra.',
              category: { id: 1, name: 'Treinamentos' },
              content_type: { id: 1, name: 'Video YouTube' },
              content_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              thumbnail_url: '',
              duration: '45min',
              tags: 'due diligence,avaliação,negócio',
              display_order: 1,
              status: { id: 1, name: 'active' },
              created_at: Date.now()
            }
          },
          {
            id: 2,
            values: {
              title: 'Treinamento Inteligência Imobiliária',
              description: 'Estratégias avançadas para análise de mercado e precificação inteligente.',
              category: { id: 1, name: 'Treinamentos' },
              content_type: { id: 1, name: 'Video YouTube' },
              content_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              thumbnail_url: '',
              duration: '1h 20min',
              tags: 'inteligência,imobiliária,análise',
              display_order: 2,
              status: { id: 1, name: 'active' },
              created_at: Date.now()
            }
          },
          {
            id: 3,
            values: {
              title: 'Apresentação: Economia e Mercado Imobiliário',
              description: 'Análise completa do cenário econômico e sua influência no setor imobiliário.',
              category: { id: 2, name: 'Webinars' },
              content_type: { id: 4, name: 'Google Slides' },
              content_url: 'https://docs.google.com/presentation/d/example',
              thumbnail_url: '',
              duration: '',
              tags: 'economia,mercado,imobiliário',
              display_order: 3,
              status: { id: 1, name: 'active' },
              created_at: Date.now()
            }
          },
          {
            id: 4,
            values: {
              title: 'Metodologia RoadMap',
              description: 'Estratégias de crescimento e expansão para franqueados.',
              category: { id: 3, name: 'Documentos' },
              content_type: { id: 2, name: 'File Attachment' },
              content_url: 'https://example.com/roadmap.pdf',
              thumbnail_url: '',
              duration: '',
              tags: 'roadmap,crescimento,franquia',
              display_order: 4,
              status: { id: 1, name: 'active' },
              created_at: Date.now()
            }
          },
          {
            id: 5,
            values: {
              title: 'Introdução ao conceito do HomeCash',
              description: 'Entenda como funciona o sistema HomeCash e suas vantagens.',
              category: { id: 1, name: 'Treinamentos' },
              content_type: { id: 1, name: 'Video YouTube' },
              content_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              thumbnail_url: '',
              duration: '30min',
              tags: 'homecash,sistema,vantagens',
              display_order: 5,
              status: { id: 1, name: 'active' },
              created_at: Date.now()
            }
          },
          {
            id: 6,
            values: {
              title: 'Treinamento fluxo operacional do HomeCash',
              description: 'Passo a passo do processo operacional completo.',
              category: { id: 1, name: 'Treinamentos' },
              content_type: { id: 1, name: 'Video YouTube' },
              content_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              thumbnail_url: '',
              duration: '1h 15min',
              tags: 'homecash,fluxo,operacional',
              display_order: 6,
              status: { id: 1, name: 'active' },
              created_at: Date.now()
            }
          },
          {
            id: 7,
            values: {
              title: 'Manual de verificação comportamental',
              description: 'Guia completo para análise comportamental de clientes.',
              category: { id: 3, name: 'Documentos' },
              content_type: { id: 3, name: 'Google Docs' },
              content_url: 'https://docs.google.com/document/d/example',
              thumbnail_url: '',
              duration: '',
              tags: 'comportamental,análise,clientes',
              display_order: 7,
              status: { id: 1, name: 'active' },
              created_at: Date.now()
            }
          },
          {
            id: 8,
            values: {
              title: 'Fluxo Operacional portão de franquias',
              description: 'Documentação técnica do processo operacional.',
              category: { id: 3, name: 'Documentos' },
              content_type: { id: 2, name: 'File Attachment' },
              content_url: 'https://example.com/fluxo.pdf',
              thumbnail_url: '',
              duration: '',
              tags: 'fluxo,operacional,franquias',
              display_order: 8,
              status: { id: 1, name: 'active' },
              created_at: Date.now()
            }
          }
        ];
      },


      
      // Função helper para extrair ID de relacionamentos foreignid
      getRelationshipId: function(relationshipField) {
        if (!relationshipField) return null;
        
        // Se for array com objetos foreignid
        if (Array.isArray(relationshipField) && relationshipField.length > 0) {
          return relationshipField[0].id;
        }
        
        // Se for valor direto (backward compatibility)
        if (typeof relationshipField === 'string' || typeof relationshipField === 'number') {
          return relationshipField;
        }
        
        return null;
      },
      
      // Função helper para processar tags (podem ser array de options ou string)
      processTags: function(tagsField) {
        if (!tagsField) return [];
        
        // Se for array de objetos (nova estrutura)
        if (Array.isArray(tagsField)) {
          return tagsField.map(tag => tag.name || tag.label || tag.id).filter(Boolean);
        }
        
        // Se for string (estrutura antiga)
        if (typeof tagsField === 'string') {
          return tagsField.split(',').map(t => t.trim()).filter(Boolean);
        }
        
        return [];
      },
      
      
      
      

  
  
  
  
      // Estados visuais
      showLoadingState: function () {
        this.hideAllStates();
        if (this.loadingEl) this.loadingEl.style.display = 'block';
      },
  
      showErrorState: function () {
        this.hideAllStates();
        if (this.errorEl) this.errorEl.style.display = 'block';
      },
  
      showNoContactState: function () {
        this.hideAllStates();
        if (this.noContactEl) this.noContactEl.style.display = 'block';
      },
      
      showSuccessState: function () {
        this.hideAllStates();
        this.renderModernLayout();
      },
  
      hideAllStates: function () {
        if (this.loadingEl) this.loadingEl.style.display = 'none';
        if (this.errorEl) this.errorEl.style.display = 'none';
        if (this.noContactEl) this.noContactEl.style.display = 'none';
        if (this.contentEl) this.contentEl.style.display = 'none';
      },
  
      // Renderizar layout moderno
      renderModernLayout: function () {
        this.hideAllStates();
        
        if (this.state.conteudos.length === 0) {
          this.showEmptyState();
        } else {
          this.showContentState();
          this.setupEventListeners();
          this.applyFilters();
        }
      },
  
      showEmptyState: function () {
        if (!this.contentEl) return;
  
        var emptyStateHTML = `
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-12 text-center">
            <div class="text-gray-400 mb-4">
              <svg class="h-10 w-10 sm:h-12 sm:w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 class="text-base sm:text-lg font-medium text-gray-900 mb-2">Nenhum conteúdo disponível</h3>
            <p class="text-sm sm:text-base text-gray-600 px-4">Em breve novos materiais serão adicionados à sua biblioteca.</p>
          </div>
        `;
  
        this.contentEl.innerHTML = emptyStateHTML;
        this.contentEl.style.display = 'block';
      },
  
      showContentState: function () {
        if (!this.contentEl) return;
        
        this.contentEl.style.display = 'block';
        this.renderContentGrid();
        this.updateContentCount();
      },
      
      showHeroSection: function () {
        var heroEl = this.container.querySelector('.conteudos-hero');
        if (heroEl) {
          // Calcular estatísticas
          this.updateStats();
          heroEl.style.display = 'block';
        }
      },
      
  
      
      
  
      // Agrupar conteúdos por categoria (SISTEMA UNIFICADO)
      getContentsByCategory: function() {
        var result = {};
        
        // Agrupar conteúdos por categoria
        this.state.conteudos.forEach(function(content) {
          var categoria = content.category || 'Outros';
          if (!result[categoria]) {
            result[categoria] = [];
          }
          result[categoria].push(content);
        });
        
        console.log('🗂️ Conteúdos por categoria:', result);
        return result;
      },
  
  
  
  
  
  
      // ✅ HANDLER UNIFICADO: Clique em conteúdo (SISTEMA SIMPLIFICADO)
      handleContentClick: function (contentId) {
        const content = this.state.filteredConteudos.find(c => c.id == contentId);
        if (!content) {
          console.error('❌ Conteúdo não encontrado:', contentId);
          return;
        }

        console.log('🎯 Clique em conteúdo:', content.title, content.content_type);
        
        // Todos os tipos redirecionam
        this.redirectToContent(content);
      },


      // Redirecionar para conteúdo externo
      redirectToContent: function(content) {
        // Determinar URL correta (content_url ou attachment_url)
        let targetUrl = content.content_url;
        
        // Se não tem content_url, verificar attachment_url
        if (!targetUrl && content.attachment_url) {
          targetUrl = content.attachment_url;
        }
        
        if (!targetUrl) {
          console.error('❌ URL não encontrada para redirecionamento:', content.title);
          this.showMessage('URL não disponível para este conteúdo', 'error');
          return;
        }

        console.log('🔗 Redirecionando para:', targetUrl);
        window.open(targetUrl, '_blank');
        this.showMessage(`Abrindo: ${content.title}`, 'success');
      },


      // ✅ FUNÇÃO REMOVIDA: Modal de arquivo não é mais necessário (apenas redirecionamento)



      // ✅ FUNÇÃO REMOVIDA: HTML do modal de arquivo não é mais necessário





      // Mostrar mensagem de feedback
      showMessage: function(message, type = 'success') {
        // Criar notificação temporária
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
          type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 
          'bg-red-100 text-red-800 border border-red-200'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Remover após 3 segundos
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 3000);
      },
      
  
      // Ícones e cores por ID de tipo (SISTEMA UNIFICADO)
      getTypeIcon: function (typeId) {
        const icons = {
          1: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 2h.01M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" /></svg>', // video_youtube  
          2: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>', // file_attachment
          3: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>', // link_google_docs
          4: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>', // link_google_slides
          5: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>'  // link_gamma_app
        };
        return icons[typeId] || icons[2]; // default file_attachment
      },
      
      getTypeColorClass: function (typeId) {
        const colors = {
          1: 'text-red-600',    // video_youtube
          2: 'text-green-600',  // file_attachment
          3: 'text-blue-600',   // link_google_docs
          4: 'text-orange-600', // link_google_slides
          5: 'text-purple-600'  // link_gamma_app
        };
        return colors[typeId] || colors[2]; // default green
      },
      
      getTypeColor: function (typeId) {
        const colors = {
          1: 'bg-gradient-to-br from-red-400 to-red-600',    // video_youtube
          2: 'bg-gradient-to-br from-green-400 to-green-600', // file_attachment
          3: 'bg-gradient-to-br from-blue-400 to-blue-600',   // link_google_docs
          4: 'bg-gradient-to-br from-orange-400 to-orange-600', // link_google_slides
          5: 'bg-gradient-to-br from-purple-400 to-purple-600'  // link_gamma_app
        };
        return colors[typeId] || colors[2]; // default green
      },
      
  
  
  
      showMensagemSucesso: function (mensagem, tipo) {
        var mensagemEl = document.getElementById('mensagem-sucesso');
        var textoEl = document.getElementById('mensagem-sucesso-texto');
        
        if (mensagemEl && textoEl) {
          textoEl.textContent = mensagem;
          
          // Remover classes antigas e adicionar novas baseadas no tipo
          mensagemEl.className = 'flex items-center gap-2 px-4 py-3 rounded-lg mb-6';
          if (tipo === 'error') {
            mensagemEl.className += ' bg-red-50 border border-red-200 text-red-800';
          } else {
            mensagemEl.className += ' bg-green-50 border border-green-200 text-green-800';
          }
          
          mensagemEl.style.display = 'flex';
          
          // Esconder após 3 segundos
          setTimeout(function() {
            mensagemEl.style.display = 'none';
          }, 3000);
        }
      },
  
      // Modal de congratulações (baseado no materials.tsx)
      mostrarCongratulacoes: function (material) {
        if (this.state.modalCongratulacoes) return;
        
        this.state.modalCongratulacoes = true;
        this.state.materialConcluido = material;
        
        var modal = document.getElementById('modal-congratulacoes');
        var tituloEl = document.getElementById('material-concluido-titulo');
        
        if (modal && tituloEl) {
          tituloEl.textContent = '"' + material.titulo + '"';
          modal.classList.remove('hidden');
        }
      },
      
      fecharModalCongratulacoes: function () {
        var modal = document.getElementById('modal-congratulacoes');
        if (modal) {
          modal.classList.add('hidden');
        }
        this.state.modalCongratulacoes = false;
        this.state.materialConcluido = null;
      },
      
      verCertificado: function () {
        if (this.state.materialConcluido) {
          // Em produção, integrar com sistema de certificados
          alert('Funcionalidade de certificados será implementada em breve.');
          console.log('Ver certificado para:', this.state.materialConcluido.titulo);
        }
        this.fecharModalCongratulacoes();
      },
      
      // Modal de solicitação
      abrirModalSolicitacao: function () {
        if (this.state.modalSolicitacaoAberto) return;
        
        this.state.modalSolicitacaoAberto = true;
        this.createModalSolicitacao();
      },
  
      createModalSolicitacao: function () {
        var modalHTML = this.generateModalSolicitacaoHTML();
        var modalContainer = document.createElement('div');
        modalContainer.id = 'modal-solicitacao';
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);
        
        this.addModalSolicitacaoEventListeners();
      },
  
      generateModalSolicitacaoHTML: function () {
        var opcoesHTML = Object.entries(this.tiposSolicitacao)
          .map(function(entry) { return '<option value="' + entry[0] + '">' + entry[1] + '</option>'; })
          .join('');
  
        return `
          <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50" id="modal-overlay">
            <div class="bg-white rounded-lg w-full max-w-md max-h-screen overflow-y-auto">
              <div class="p-4 sm:p-6">
                <div class="flex items-center justify-between mb-4 sm:mb-6">
                  <h3 class="text-base sm:text-lg font-semibold text-gray-900">Solicitar Material Personalizado</h3>
                  <button type="button" class="text-gray-400 hover:text-gray-600 cursor-pointer p-1" onclick="window.portalConteudosModule.fecharModalSolicitacao()">
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
  
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Tipo de Material</label>
                    <select id="tipo-material-select" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                      <option value="">Selecione o tipo</option>
                      ${opcoesHTML}
                    </select>
                  </div>
  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Descrição Detalhada</label>
                    <textarea id="descricao-textarea" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" rows="4" placeholder="Descreva detalhadamente o que precisa..."></textarea>
                  </div>
  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Prazo Necessário</label>
                    <select id="prazo-select" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                      <option value="">Selecione o prazo</option>
                      <option value="urgente">Urgente (até 2 dias)</option>
                      <option value="rapido">Rápido (até 1 semana)</option>
                      <option value="normal">Normal (até 2 semanas)</option>
                      <option value="flexivel">Flexível (mais de 2 semanas)</option>
                    </select>
                  </div>
  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Observações Adicionais</label>
                    <textarea id="observacoes-textarea" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" rows="3" placeholder="Informações extras, referências, etc..."></textarea>
                  </div>
                </div>
  
                <div class="flex flex-col sm:flex-row gap-3 mt-6">
                  <button type="button" onclick="window.portalConteudosModule.fecharModalSolicitacao()" class="w-full sm:flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer text-sm sm:text-base">Cancelar</button>
                  <button type="button" onclick="window.portalConteudosModule.enviarSolicitacao()" class="w-full sm:flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm sm:text-base" id="btn-enviar">
                    <svg class="h-4 w-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.013 8.013 0 01-7-4c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
                    </svg>
                    Enviar Solicitação
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      },
  
      addModalSolicitacaoEventListeners: function () {
        var self = this;
        
        // Fechar com ESC
        document.addEventListener('keydown', function modalKeyHandler(e) {
          if (e.key === 'Escape' && self.state.modalSolicitacaoAberto) {
            self.fecharModalSolicitacao();
            document.removeEventListener('keydown', modalKeyHandler);
          }
        });
  
        // Validação em tempo real
        var tipoSelect = document.getElementById('tipo-material-select');
        var descricaoTextarea = document.getElementById('descricao-textarea');
        var btnEnviar = document.getElementById('btn-enviar');
  
        function validarFormulario() {
          var tipoValido = tipoSelect && tipoSelect.value.trim() !== '';
          var descricaoValida = descricaoTextarea && descricaoTextarea.value.trim() !== '';
          
          if (btnEnviar) {
            btnEnviar.disabled = !(tipoValido && descricaoValida);
          }
        }
  
        if (tipoSelect) tipoSelect.addEventListener('change', validarFormulario);
        if (descricaoTextarea) descricaoTextarea.addEventListener('input', validarFormulario);
        
        // Validação inicial
        validarFormulario();
      },
  
      enviarSolicitacao: function () {
        var tipoSelect = document.getElementById('tipo-material-select');
        var descricaoTextarea = document.getElementById('descricao-textarea');
        var prazoSelect = document.getElementById('prazo-select');
        var observacoesTextarea = document.getElementById('observacoes-textarea');
  
        var solicitacao = {
          tipo_material: tipoSelect ? tipoSelect.value : '',
          descricao: descricaoTextarea ? descricaoTextarea.value : '',
          prazo_necessario: prazoSelect ? prazoSelect.value : '',
          observacoes: observacoesTextarea ? observacoesTextarea.value : ''
        };
  
        if (!solicitacao.tipo_material || !solicitacao.descricao) {
          alert('Por favor, preencha os campos obrigatórios.');
          return;
        }
  
        // Em produção, integrar com sua API
        console.log('Solicitação enviada:', solicitacao);
        alert('Solicitação enviada com sucesso! Nossa equipe entrará em contato em breve.');
        
        this.fecharModalSolicitacao();
      },
  
      fecharModalSolicitacao: function () {
        var modal = document.getElementById('modal-solicitacao');
        if (modal) {
          modal.remove();
        }
        this.state.modalSolicitacaoAberto = false;
      },
  
      // Renderizar grid de conteúdos
      renderContentGrid: function() {
        const grid = document.getElementById('content-grid');
        const emptyState = document.getElementById('empty-state');
        
        if (!grid) return;
        
        if (this.state.filteredConteudos.length === 0) {
          grid.classList.add('hidden');
          emptyState.classList.remove('hidden');
          return;
        }
        
        grid.classList.remove('hidden');
        emptyState.classList.add('hidden');
        
        // Aplicar modo de visualização
        if (this.state.viewMode === 'list') {
          grid.className = 'flex flex-col gap-3 sm:gap-4';
        } else {
          grid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3 sm:gap-6';
        }
        
        // Gerar cards
        grid.innerHTML = this.state.filteredConteudos.map((content, index) => 
          this.generateModernContentCard(content, index)
        ).join('');
      },
      
      // Gerar card moderno
      generateModernContentCard: function(content, index) {
        const behavior = this.contentBehaviors[content.content_type.id] || this.contentBehaviors[2];
        const typeIcon = this.getTypeIcon(content.content_type.id);
        
        // Layout para modo lista
        if (this.state.viewMode === 'list') {
          return `
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer animate-fade-in"
                 onclick="window.portalConteudosModule.handleContentClick('${content.id}')"
                 style="animation-delay: ${index * 50}ms">
              <div class="p-4 flex items-center gap-4">
                <div class="w-10 h-10 rounded-lg flex items-center justify-center ${this.getTypeColorClass(content.content_type.id)} bg-gray-100">
                  ${typeIcon}
                </div>
                
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <h3 class="font-medium text-gray-900 truncate">${content.title}</h3>
                    ${content.duration ? `
                      <div class="bg-gray-100 border border-gray-200 text-gray-600 px-2 py-1 rounded text-xs shrink-0">
                        ${content.duration}
                      </div>
                    ` : ''}
                  </div>
                  <p class="text-sm text-gray-600 line-clamp-1">${content.description}</p>
                </div>
                
                <button class="bg-gray-100 border border-gray-200 hover:bg-blue-600 hover:text-white text-gray-700 px-3 py-2 text-sm rounded-lg transition-all duration-300 flex items-center gap-2 shrink-0">
                  ${typeIcon}
                  ${behavior.buttonText}
                </button>
              </div>
            </div>
          `;
        }
        
        // Layout para modo grid (original)
        return `
          <div class="content-card bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden cursor-pointer animate-fade-in"
               onclick="window.portalConteudosModule.handleContentClick('${content.id}')"
               style="animation-delay: ${index * 100}ms">
            
            <!-- Image/Gradient Header -->
            <div class="content-card-image h-32 sm:h-48 relative type-${content.content_type.id}">
              ${content.thumbnail_url ? `
                <img
                  src="${content.thumbnail_url}"
                  alt="${content.title}"
                  class="w-full h-full object-cover"
                  onerror="this.style.display='none';"
                />
              ` : ''}
              
              <!-- Type Icon -->
              <div class="absolute top-2 sm:top-4 left-2 sm:left-4">
                <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white bg-opacity-90 flex items-center justify-center text-gray-700">
                  ${typeIcon}
                </div>
              </div>
              
              <!-- Duration Badge -->
              ${content.duration ? `
                <div class="absolute top-2 sm:top-4 right-2 sm:right-4">
                  <div class="bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    ${content.duration}
                  </div>
                </div>
              ` : ''}
              
              <!-- Play Button for Videos -->
              ${content.content_type.id === 1 ? `
                <div class="absolute inset-0 flex items-center justify-center">
                  <div class="w-12 h-12 sm:w-16 sm:h-16 bg-white bg-opacity-90 rounded-full flex items-center justify-center shadow-lg">
                    <svg class="w-6 h-6 sm:w-8 sm:h-8 text-red-600 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              ` : ''}
            </div>
            
            <!-- Card Content -->
            <div class="p-3 sm:p-6">
              <div class="flex items-start justify-between mb-2 sm:mb-3">
                <div class="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs flex items-center gap-1">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  ${content.category}
                </div>
              </div>
              
              <h3 class="font-semibold text-sm sm:text-lg text-gray-900 mb-1 sm:mb-2 line-clamp-2 leading-tight">
                ${content.title}
              </h3>
              
              <p class="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2 sm:line-clamp-3 leading-relaxed">
                ${content.description}
              </p>
              
              <button class="w-full bg-gray-100 hover:bg-blue-600 hover:text-white text-gray-700 px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-300 flex items-center justify-center gap-1 sm:gap-2">
                ${typeIcon}
                ${behavior.buttonText}
              </button>
            </div>
          </div>
        `;
      },
      
      // Setup event listeners
      setupEventListeners: function() {
        const searchInput = document.getElementById('search-input');
        const clearSearch = document.getElementById('clear-search');
        const categoryBtn = document.getElementById('category-filter-btn');
        const categoryDropdown = document.getElementById('category-dropdown');
        const typeBtn = document.getElementById('type-filter-btn');
        const typeDropdown = document.getElementById('type-dropdown');
        const clearFilters = document.getElementById('clear-filters');
        const gridView = document.getElementById('grid-view');
        const listView = document.getElementById('list-view');
        
        // Busca
        if (searchInput) {
          searchInput.addEventListener('input', (e) => {
            this.state.searchTerm = e.target.value;
            this.updateClearSearchButton();
            this.applyFilters();
          });
        }
        
        // Limpar busca
        if (clearSearch) {
          clearSearch.addEventListener('click', () => {
            this.state.searchTerm = '';
            searchInput.value = '';
            this.updateClearSearchButton();
            this.applyFilters();
          });
        }
        
        // Filtro de categoria
        if (categoryBtn && categoryDropdown) {
          categoryBtn.addEventListener('click', () => {
            categoryDropdown.classList.toggle('hidden');
            typeDropdown.classList.add('hidden');
          });
          
          categoryDropdown.addEventListener('click', (e) => {
            if (e.target.classList.contains('category-option')) {
              this.state.selectedCategory = e.target.dataset.value;
              categoryDropdown.classList.add('hidden');
              this.applyFilters();
              this.updateActiveFilters();
            }
          });
        }
        
        // Filtro de tipo
        if (typeBtn && typeDropdown) {
          typeBtn.addEventListener('click', () => {
            typeDropdown.classList.toggle('hidden');
            categoryDropdown.classList.add('hidden');
          });
          
          typeDropdown.addEventListener('click', (e) => {
            if (e.target.classList.contains('type-option')) {
              this.state.selectedType = e.target.dataset.value;
              typeDropdown.classList.add('hidden');
              this.applyFilters();
              this.updateActiveFilters();
            }
          });
        }
        
        // Limpar filtros
        if (clearFilters) {
          clearFilters.addEventListener('click', () => {
            this.state.selectedCategory = '';
            this.state.selectedType = '';
            this.applyFilters();
            this.updateActiveFilters();
          });
        }
        
        // Modo de visualização
        if (gridView) {
          gridView.addEventListener('click', () => {
            this.state.viewMode = 'grid';
            this.updateViewModeButtons();
            this.renderContentGrid();
          });
        }
        
        if (listView) {
          listView.addEventListener('click', () => {
            this.state.viewMode = 'list';
            this.updateViewModeButtons();
            this.renderContentGrid();
          });
        }
        
        // Fechar dropdowns ao clicar fora
        document.addEventListener('click', (e) => {
          if (!categoryBtn.contains(e.target) && !categoryDropdown.contains(e.target)) {
            categoryDropdown.classList.add('hidden');
          }
          if (!typeBtn.contains(e.target) && !typeDropdown.contains(e.target)) {
            typeDropdown.classList.add('hidden');
          }
        });
      },
      
      // Aplicar filtros
      applyFilters: function() {
        this.state.filteredConteudos = this.state.conteudos.filter(content => {
          const matchesSearch = !this.state.searchTerm || 
            content.title.toLowerCase().includes(this.state.searchTerm.toLowerCase()) ||
            content.description.toLowerCase().includes(this.state.searchTerm.toLowerCase()) ||
            content.category.toLowerCase().includes(this.state.searchTerm.toLowerCase());
            
          const matchesCategory = !this.state.selectedCategory || 
            content.category === this.state.selectedCategory;
            
          const matchesType = !this.state.selectedType || 
            content.content_type.id.toString() === this.state.selectedType;
            
          return matchesSearch && matchesCategory && matchesType;
        });
        
        this.renderContentGrid();
        this.updateContentCount();
      },
      
      // Atualizar botão de limpar busca
      updateClearSearchButton: function() {
        const clearSearch = document.getElementById('clear-search');
        if (clearSearch) {
          if (this.state.searchTerm) {
            clearSearch.classList.remove('hidden');
            clearSearch.classList.add('flex');
          } else {
            clearSearch.classList.add('hidden');
            clearSearch.classList.remove('flex');
          }
        }
      },
      
      // Atualizar filtros ativos
      updateActiveFilters: function() {
        const activeFilters = document.getElementById('active-filters');
        const filterBadges = document.getElementById('filter-badges');
        
        if (!activeFilters || !filterBadges) return;
        
        const filters = [];
        if (this.state.selectedCategory) filters.push(this.state.selectedCategory);
        if (this.state.selectedType) {
          const typeNames = {
            '1': 'Vídeos',
            '2': 'Arquivos', 
            '3': 'Google Docs',
            '4': 'Apresentações',
            '5': 'Gamma App'
          };
          filters.push(typeNames[this.state.selectedType]);
        }
        
        if (filters.length > 0) {
          activeFilters.classList.remove('hidden');
          activeFilters.classList.add('flex');
          filterBadges.innerHTML = filters.map(filter => 
            `<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">${filter}</span>`
          ).join('');
        } else {
          activeFilters.classList.add('hidden');
          activeFilters.classList.remove('flex');
        }
      },
      
      // Atualizar contador
      updateContentCount: function() {
        const countEl = document.getElementById('content-count');
        if (countEl) {
          const count = this.state.filteredConteudos.length;
          countEl.textContent = `${count} ${count === 1 ? 'item' : 'itens'}`;
        }
      },
      
      // Atualizar botões de modo de visualização
      updateViewModeButtons: function() {
        const gridView = document.getElementById('grid-view');
        const listView = document.getElementById('list-view');
        
        if (gridView && listView) {
          gridView.classList.toggle('active', this.state.viewMode === 'grid');
          listView.classList.toggle('active', this.state.viewMode === 'list');
        }
      }
    };
  
    // Expor o módulo globalmente (sem auto-execução)
    window.portalConteudosModule = module;
    console.log('📦 [TIMING] Portal de Conteúdos Module carregado e disponível (sem auto-execução)');
  
  })();