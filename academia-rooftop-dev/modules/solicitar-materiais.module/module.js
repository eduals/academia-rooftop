// Módulo Solicitar Materiais - Rooftop Franquias
(function () {
  'use strict';

  var module = {
    // Configuração das APIs
    apiConfig: {
      baseUrl: 'https://n8n2.rooftop.com.br/webhook/portal',
      endpoints: {
        criarPedido: '/pedidos/criar',
        listarPedidos: '/pedidos/listar'
      }
    },

    // Estado do módulo (SIMPLIFICADO)
    state: {
      contact_id: null,
      solicitacoes: [],
      loading: false,
      error: false,
      modalSolicitacaoAberto: false
    },

    // Opções mapeadas
    materiaisOptions: {
      cartoes_de_visita: 'Cartões de Visita',
      flyers: 'Flyers',
      folders: 'Folders'
    },
    // Mapeamento de pipeline stages do HubSpot Orders
    pipelineStageMap: {
      '4b27b500-f031-4927-9811-68a0b525cbae': 'Aberto',
      '937ea84d-0a4f-4dcf-9028-3f9c2aafbf03': 'Processado',
      'aa99e8d0-c1d5-4071-b915-d240bbb1aed9': 'Enviado', 
      '3725360f-519b-4b18-a593-494d60a29c9f': 'Entregue',
      '3c85a297-e9ce-400b-b42e-9f16853d69d6': 'Cancelado'
    },

    init: function () {
      console.log('🚀 Inicializando Solicitar Materiais Module');
      
      this.container = document.querySelector('[data-module="solicitarMateriaisModule"]');
      if (!this.container) return;

      // Elementos DOM
      this.contentEl = this.container.querySelector('.conteudos-content');
      this.errorEl = this.container.querySelector('.conteudos-error');
      this.loadingEl = this.container.querySelector('.conteudos-loading');
      this.noContactEl = this.container.querySelector('.conteudos-no-contact');

      // Inicializar contact_id
      this.initContactId();
      
      // Carregar solicitações
      this.loadSolicitacoes();

      var btnAbrir = document.getElementById('btn-abrir-modal');
      if (btnAbrir) {
        var self = this;
        btnAbrir.addEventListener('click', function(){ self.abrirModalSolicitacao(); });
      }
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

    loadSolicitacoes: function () {
      console.log('🚀 loadSolicitacoes iniciado');
      console.log('Contact ID no state:', this.state.contact_id);
      
      // REGRA: Só mostrar conteúdo se tiver contact_id
      if (!this.state.contact_id) {
        console.warn('⚠️ Contact ID não encontrado - Login Necessário');
        this.showNoContactState();
        return;
      }
      
      console.log('🎯 Contact ID válido - carregando solicitações da tabela 133126224');
      this.showLoadingState();
      this.fetchSolicitacoes();
    },

    // ✅ FUNÇÃO PRINCIPAL: Buscar pedidos do HubSpot Orders
    fetchSolicitacoes: async function () {
      try {
        console.log('🔄 Buscando pedidos do contato:', this.state.contact_id);

        const url = `${this.apiConfig.baseUrl}${this.apiConfig.endpoints.listarPedidos}?contact_id=${this.state.contact_id}`;

        const response = await fetch(url, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
          console.warn(`⚠️ Erro ${response.status} ao buscar pedidos`);
          this.processarSolicitacoes([]);
          return;
        }

        const data = await response.json();
        console.log('- Data Pedidos:', data);
        const results = data?.results || [];

        console.log('✅ Pedidos carregados:', results.length);
        this.processarSolicitacoes(results);

      } catch (error) {
        console.error('❌ Erro ao buscar pedidos:', error);
        this.showErrorState();
      }
    },


    // Processar pedidos do HubSpot Orders
    processarSolicitacoes: function(orders) {
      try {
        console.log('🔄 Processando pedidos...');
        console.log('📊 Total recebidos:', orders.length);

        var self = this;
        this.state.solicitacoes = orders
          .map(function(order) {
            var p = order.properties || {};

            // Extrair quantidades do nome do pedido ou propriedades
            var qt_infocash = parseInt(p.qt_infocash || 0, 10);
            var qt_enquete = parseInt(p.qt_enquete || 0, 10);
            var qt_folder = parseInt(p.qt_folder || 0, 10);

            // Determinar status baseado no pipeline stage
            var status = self.pipelineStageMap[p.hs_pipeline_stage] || 'pendente';

            // Processar data do pedido
            var data = p.data_pedido ?
              new Date(p.data_pedido).getTime() :
              new Date(p.hs_createdate).getTime();

            return {
              id: order.id,
              nome_pedido: p.hs_order_name || 'Pedido sem nome',
              qt_infocash: qt_infocash,
              qt_enquete: qt_enquete,
              qt_folder: qt_folder,
              status: status,
              data: data,
              data_entrega: null,  // Adicionar quando disponível
              outros_materiais: p.hs_external_order_status || '',
              endereco_entrega: p.hs_billing_address_street || '',
              url_rastreamento: p.hs_shipping_status_url || '',
              createdAt: new Date(order.createdAt).getTime(),
              updatedAt: new Date(order.updatedAt).getTime()
            };
          })
          .sort(function(a, b) { return b.data - a.data; });

        console.log('✅ Pedidos processados:', this.state.solicitacoes.length);
        this.showSuccessState();

      } catch (error) {
        console.error('❌ Erro ao processar pedidos:', error);
        this.showErrorState();
      }
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
      this.renderListaSolicitacoes();
    },

    hideAllStates: function () {
      if (this.loadingEl) this.loadingEl.style.display = 'none';
      if (this.errorEl) this.errorEl.style.display = 'none';
      if (this.noContactEl) this.noContactEl.style.display = 'none';
      if (this.contentEl) this.contentEl.style.display = 'none';
    },

    // Renderizar lista de pedidos
    renderListaSolicitacoes: function () {
      this.hideAllStates();
      var tbody = document.getElementById('requests-tbody');
      var emptyState = document.getElementById('empty-state');
      var wrapper = document.getElementById('requests-table-wrapper');
      if (!tbody) return;

      // Sempre exibir o container principal para manter header e botão visíveis
      if (this.contentEl) this.contentEl.style.display = 'block';

      if (this.state.solicitacoes.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        if (wrapper) wrapper.classList.add('hidden');
        return;
      }
      if (emptyState) emptyState.classList.add('hidden');
      if (wrapper) wrapper.classList.remove('hidden');

      var self = this;
      tbody.innerHTML = this.state.solicitacoes.map(function(pedido) {
        var statusBadge = self.getStatusBadge(pedido.status);
        var dataStr = self.formatDate(pedido.data);

        // Montar string de quantidades
        var qts = [];
        if (pedido.qt_infocash > 0) qts.push('Cartões: ' + pedido.qt_infocash);
        if (pedido.qt_enquete > 0) qts.push('Flyers: ' + pedido.qt_enquete);
        if (pedido.qt_folder > 0) qts.push('Folders: ' + pedido.qt_folder);
        var qtsStr = qts.length ? qts.join(' • ') :
                     (pedido.outros_materiais ? pedido.outros_materiais : '-');

        // Nome do pedido com link se houver URL de rastreamento
        var nomePedidoHTML = pedido.url_rastreamento ?
          '<a href="' + pedido.url_rastreamento + '" target="_blank" class="text-blue-600 hover:text-blue-800 underline">' + pedido.nome_pedido + '</a>' :
          pedido.nome_pedido;

        // Endereço de entrega (limitado a 50 caracteres)
        var enderecoStr = pedido.endereco_entrega ?
          (pedido.endereco_entrega.length > 50 ?
            pedido.endereco_entrega.substring(0, 47) + '...' :
            pedido.endereco_entrega) :
          '-';

        return '<tr>' +
          '<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">' + nomePedidoHTML + '</td>' +
          '<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">' + dataStr + '</td>' +
          // '<td class="px-6 py-4 text-sm text-gray-900">' + qtsStr + '</td>' +
          // '<td class="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title="' + (pedido.endereco_entrega || '') + '">' + enderecoStr + '</td>' +
          '<td class="px-6 py-4 whitespace-nowrap">' + statusBadge + '</td>' +
        '</tr>';
      }).join('');

      // Adicionar quadro explicativo dos status após a tabela
      this.renderStatusLegend();
    },

    renderStatusLegend: function() {
      var legendContainer = document.getElementById('status-legend');
      if (!legendContainer) {
        // Criar container se não existir
        var wrapper = document.getElementById('requests-table-wrapper');
        if (wrapper && wrapper.parentNode) {
          legendContainer = document.createElement('div');
          legendContainer.id = 'status-legend';
          wrapper.parentNode.insertBefore(legendContainer, wrapper.nextSibling);
        }
      }

    },

    getStatusBadge: function(status){
      var map = {
        'Aberto': 'bg-yellow-100 text-yellow-800',
        'Processado': 'bg-blue-100 text-blue-800',
        'Enviado': 'bg-purple-100 text-purple-800',
        'Entregue': 'bg-green-100 text-green-800',
        'Cancelado': 'bg-red-100 text-red-800',
        // Manter compatibilidade com status antigos
        pendente: 'bg-yellow-100 text-yellow-800',
        em_processamento: 'bg-blue-100 text-blue-800',
        enviado: 'bg-yellow-100 text-yellow-800',
        entregue: 'bg-green-100 text-green-800',
        cancelado: 'bg-red-100 text-red-800'
      };

      var cls = map[status] || 'bg-gray-100 text-gray-800';

      // Simplificar nome do status para exibição
      var displayStatus = status.replace(' (Pipeline de pedidos)', '');

      return '<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full '+cls+'">'+displayStatus+'</span>';
    },

    formatDate: function(ts){
      try {
        var d = new Date(Number(ts));
        var dd = String(d.getDate()).padStart(2,'0');
        var mm = String(d.getMonth()+1).padStart(2,'0');
        var yyyy = d.getFullYear();
        return dd+'/'+mm+'/'+yyyy;
      } catch(e) { return '-'; }
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
      return `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50" id="modal-overlay">
          <div class="bg-white rounded-lg w-full max-w-lg max-h-screen overflow-y-auto">
            <div class="p-4 sm:p-6">
              <div class="flex items-center justify-between mb-4 sm:mb-6">
                <h3 class="text-base sm:text-lg font-semibold text-gray-900">Nova Solicitação de Materiais</h3>
                <button type="button" class="text-gray-400 hover:text-gray-600 cursor-pointer p-1" onclick="window.solicitarMateriaisModule.fecharModalSolicitacao()">
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-3">Materiais e Quantidades</label>
                  <div class="grid grid-cols-2 gap-4">
                    <div class="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <label class="text-sm font-medium text-gray-700">InfoCash</label>
                      <input type="number" min="0" id="qt_infocash" class="w-20 px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-center" placeholder="0" />
                    </div>
                    <div class="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <label class="text-sm font-medium text-gray-700">Formulário de enquete</label>
                      <input type="number" min="0" id="qt_enquete" class="w-20 px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-center" placeholder="0" />
                    </div>
                    <div class="flex items-center justify-between bg-gray-50 p-3 rounded-lg col-span-2 sm:col-span-1">
                      <label class="text-sm font-medium text-gray-700">Folders</label>
                      <input type="number" min="0" id="qt_folder" class="w-20 px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-center" placeholder="0" />
                    </div>
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Outros materiais (opcional)</label>
                  <textarea id="outros_materiais" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" rows="3" placeholder="Descreva outros itens necessários..."></textarea>
                </div>
              </div>

              <div class="flex flex-col sm:flex-row gap-3 mt-6">
                <button type="button" onclick="window.solicitarMateriaisModule.fecharModalSolicitacao()" class="w-full sm:flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer text-sm sm:text-base">Cancelar</button>
                <button type="button" onclick="window.solicitarMateriaisModule.enviarSolicitacao()" class="w-full sm:flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm sm:text-base" id="btn-enviar">
                  <svg class="h-4 w-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
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
      var outros = document.getElementById('outros_materiais');
      var qtInfoCash = document.getElementById('qt_infocash');
      var qtEnquete = document.getElementById('qt_enquete');
      var qtFolder = document.getElementById('qt_folder');
      var btnEnviar = document.getElementById('btn-enviar');

      function validarFormulario() {
        var temQuantidade = (qtInfoCash && Number(qtInfoCash.value) > 0) ||
                           (qtEnquete && Number(qtEnquete.value) > 0) ||
                           (qtFolder && Number(qtFolder.value) > 0) ||
                           (outros && outros.value.trim() !== '');
        if (btnEnviar) btnEnviar.disabled = !temQuantidade;
      }

      if (outros) outros.addEventListener('input', validarFormulario);
      if (qtInfoCash) qtInfoCash.addEventListener('input', validarFormulario);
      if (qtEnquete) qtEnquete.addEventListener('input', validarFormulario);
      if (qtFolder) qtFolder.addEventListener('input', validarFormulario);

      // Validação inicial
      validarFormulario();
    },

    enviarSolicitacao: function () {
      var outros = document.getElementById('outros_materiais');
      var qt_infocash = Number(document.getElementById('qt_infocash')?.value || 0) || 0;
      var qt_enquete = Number(document.getElementById('qt_enquete')?.value || 0) || 0;
      var qt_folder = Number(document.getElementById('qt_folder')?.value || 0) || 0;

      var solicitacao = {
        qt_infocash: qt_infocash,
        qt_enquete: qt_enquete,
        qt_folder: qt_folder,
        outros_materiais: outros ? outros.value : '',
        data: Date.now(),
        contact_id: String(this.state.contact_id)
      };

      // Validar se tem ao menos alguma quantidade ou outros materiais
      if ((qt_infocash + qt_enquete + qt_folder) === 0 && !solicitacao.outros_materiais.trim()) {
        alert('Por favor, informe a quantidade de ao menos um material.');
        return;
      }

      this.salvarSolicitacao(solicitacao);
    },

    fecharModalSolicitacao: function () {
      var modal = document.getElementById('modal-solicitacao');
      if (modal) {
        modal.remove();
      }
      this.state.modalSolicitacaoAberto = false;
    },

    salvarSolicitacao: async function(payloadValues) {
      try {
        var url = this.apiConfig.baseUrl + this.apiConfig.endpoints.criarPedido;

        // Estrutura simples para o novo endpoint
        var body = {
          qt_infocash: payloadValues.qt_infocash,
          qt_enquete: payloadValues.qt_enquete,
          qt_folder: payloadValues.qt_folder,
          data: payloadValues.data,
          outros_materiais: payloadValues.outros_materiais || '',
          contact_id: payloadValues.contact_id
        };

        console.log('📤 Enviando pedido:', body);

        var resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (!resp.ok) {
          var t = await resp.text();
          throw new Error('HTTP ' + resp.status + ': ' + t);
        }

        var result = await resp.json();
        console.log('✅ Pedido criado:', result);

        this.showMessage('Pedido enviado com sucesso!', 'success');
        this.fecharModalSolicitacao();
        this.loadSolicitacoes();

      } catch (err) {
        console.error('❌ Erro ao salvar pedido:', err);
        this.showMessage('Erro ao enviar pedido. Tente novamente.', 'error');
      }
    },

    // Renderização antiga removida neste módulo
    
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
  window.solicitarMateriaisModule = module;
  console.log('📦 [TIMING] Solicitar Materiais Module carregado e disponível (sem auto-execução)');

})();