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
      
      // Configuração HubDB via N8N
      hubdbConfig: {
        baseUrl: 'https://n8n2.rooftop.com.br/webhook/portal/hubdb',
        tables: {
          categories: '128861234',
          materials: '128861235', 
          modules: '128888896',
          material_progress: '128861236',
          module_progress: '128861237'
        }
      },
  
      // Estado do módulo
      state: {
        contact_id: null,
        abaSelecionada: 'treinamentos',
        busca: '',
        conteudos: [],
        loading: false,
        error: false,
        modalSolicitacaoAberto: false,
        modalCongratulacoes: false,
        materialConcluido: null,
        stats: {
          treinamentos: 0,
          webinars: 0,
          documentos: 0,
          total: 0
        }
      },
  
      // Configuração das abas (baseado nas categorias do HubDB)
      abas: [
        { id: 'treinamentos', label: 'Treinamentos', categoria: 'Treinamentos', icon: 'BookOpen' },
        { id: 'webinars', label: 'Webinars', categoria: 'Webinars', icon: 'Video' },
        { id: 'documentos', label: 'Documentos', categoria: 'Documentos', icon: 'FileText' },
        { id: 'links', label: 'Links Úteis', categoria: 'Links Úteis', icon: 'ExternalLink' },
        { id: 'branding', label: 'Materiais de Marca', categoria: 'Materiais de Marca', icon: 'Image' }
      ],
  
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
        console.log('🚀 loadConteudos iniciado');
        console.log('Contact ID no state:', this.state.contact_id);
        console.log('window.portalConteudosData:', window.portalConteudosData);
        
        // REGRA: Só mostrar conteúdo se tiver contact_id E dados HubDB
        if (!this.state.contact_id) {
          console.warn('⚠️ Contact ID não encontrado - Login Necessário');
          this.showNoContactState();
          return;
        }
        
        // Se tem contact_id, verificar se tem dados HubDB
        if (window.portalConteudosData && window.portalConteudosData.materials && window.portalConteudosData.materials.length > 0) {
          console.log('🎯 Contact ID válido + Dados HubDB disponíveis');
          this.processarDadosHubDB();
        } else {
          console.warn('⚠️ Contact ID válido, mas dados HubDB não disponíveis - buscando via API');
          this.showLoadingState();
          this.fetchDadosHubDB();
        }
      },
  
      // ✅ NOVA FUNÇÃO: Processar dados HubDB já carregados
      processarDadosHubDB: function () {
        try {
          console.log('🔄 Processando dados HubDB:', window.portalConteudosData);
          
          // Usar materiais já processados do HubDB
          if (window.portalConteudosData && window.portalConteudosData.materials) {
            this.state.conteudos = window.portalConteudosData.materials.map(function(material) {
              return {
                id: material.id,
                titulo: material.titulo,
                title: material.title,
                descricao: material.descricao,
                description: material.description,
                tipo: material.tipo,
                type: material.type,
                categoria: material.categoria,
                category_id: material.category_id,
                thumbnail_url: material.thumbnail_url,
                duracao: material.duracao,
                duration: material.duration,
                difficulty_level: material.difficulty_level,
                tags: material.tags || [],
                is_required: material.is_required,
                display_order: material.display_order,
                status: material.status,
                progress: material.progress,
                progress_percentage: material.progress_percentage,
                total_modules: material.total_modules,
                completed_modules: material.completed_modules,
                modules: material.modules || [],
                // Campos para compatibilidade com o UI existente
                url_conteudo: material.file_url,
                data_criacao: new Date().toISOString().split('T')[0],
                data_atualizacao: null,
                autor: 'Academia Rooftop',
                tamanho_arquivo: null,
                franqueado_id: null,
                nome_da_campanha: null
              };
            });
            
            // Atualizar estatísticas
            if (window.portalConteudosData.stats) {
              this.state.stats = window.portalConteudosData.stats;
            }
            
            console.log('✅ Dados HubDB processados:', this.state.conteudos.length + ' materiais');
            this.showSuccessState();
          } else {
            console.warn('⚠️ Dados HubDB não encontrados no window.portalConteudosData');
            this.state.conteudos = [];
            this.showErrorState();
          }
        } catch (error) {
          console.error('❌ Erro ao processar dados HubDB do HTML:', error);
          this.showErrorState();
        }
      },

      // ✅ NOVA FUNÇÃO: Buscar dados via HubDB API
      fetchDadosHubDB: async function () {
        try {
          console.log('🔄 Iniciando busca de dados via HubDB API...');
          
          // Buscar dados de todas as tabelas em paralelo
          const [categories, materials, modules, materialProgress, moduleProgress] = await Promise.all([
            this.fetchHubDBTable('categories'),
            this.fetchHubDBTable('materials'),
            this.fetchHubDBTable('modules'),
            this.fetchHubDBTable('material_progress'),
            this.fetchHubDBTable('module_progress')
          ]);
          
          console.log('✅ Dados HubDB recebidos:', {
            categories: categories.length,
            materials: materials.length,
            modules: modules.length,
            materialProgress: materialProgress.length,
            moduleProgress: moduleProgress.length
          });
          
          // Processar e combinar dados
          this.processarDadosHubDBAPI({
            categories,
            materials,
            modules,
            materialProgress,
            moduleProgress
          });
          
        } catch (error) {
          console.error('❌ Erro ao buscar dados HubDB:', error);
          this.showErrorState();
        }
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
      
      // Buscar dados de uma tabela específica do HubDB via N8N
      fetchHubDBTable: async function(tableName) {
        const tableId = this.hubdbConfig.tables[tableName];
        if (!tableId) {
          throw new Error(`Tabela ${tableName} não encontrada na configuração`);
        }
        
        const url = `${this.hubdbConfig.baseUrl}?tableId=${tableId}`;
        
        try {
          console.log(`🔍 Buscando tabela ${tableName} (${tableId}) via N8N...`);
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            }
          });
          
          if (!response.ok) {
            console.warn(`⚠️ Erro ${response.status} ao buscar ${tableName} via N8N, usando dados mock`);
            return this.getMockDataForTable(tableName);
          }
          
          const data = await response.json();
          // console.log('data', data )
          // N8N retorna em formato: [{ total: X, results: [...], type: "STREAMING" }]
          const results = data.results;
          // const results = Array.isArray(data) && data.length > 0 && data[0].results ? data[0].results : [];
          
          console.log(`✅ Tabela ${tableName} carregada via N8N:`, results.length, 'registros');
          console.log(`🔍 Estrutura recebida para ${tableName}:`, data);
          
          return results;
        } catch (error) {
          console.warn(`⚠️ Erro ao buscar tabela ${tableName} via N8N, usando dados mock:`, error.message);
          return this.getMockDataForTable(tableName);
        }
      },
      
      // Dados mock para desenvolvimento e fallback
      getMockDataForTable: function(tableName) {
        const mockData = {
          categories: [
            {
              id: 1,
              values: {
                name: 'Treinamentos',
                description: 'Cursos e treinamentos',
                display_order: 1,
                color: '#3B82F6',
                icon: 'BookOpen'
              }
            },
            {
              id: 2,
              values: {
                name: 'Webinars',
                description: 'Webinars e apresentações',
                display_order: 2,
                color: '#EF4444',
                icon: 'Video'
              }
            },
            {
              id: 3,
              values: {
                name: 'Documentos',
                description: 'Documentos e materiais',
                display_order: 3,
                color: '#10B981',
                icon: 'FileText'
              }
            }
          ],
          materials: [
            {
              id: 1,
              values: {
                title: 'Introdução ao Portal Rooftop',
                description: 'Material introdutório sobre o uso do portal',
                type: 'training',
                category_id: 1,
                thumbnail_url: '',
                duration: '30 min',
                difficulty_level: 'beginner',
                tags: 'introdução,portal,básico',
                is_required: true,
                display_order: 1,
                status: 1,
                url_conteudo: '',
                created_at: new Date().toISOString()
              }
            },
            {
              id: 2,
              values: {
                title: 'Webinar - Melhores Práticas',
                description: 'Webinar sobre melhores práticas no setor',
                type: 'webinar',
                category_id: 2,
                thumbnail_url: '',
                duration: '45 min',
                difficulty_level: 'intermediate',
                tags: 'webinar,práticas,avançado',
                is_required: false,
                display_order: 2,
                status: 1,
                url_conteudo: '',
                created_at: new Date().toISOString()
              }
            }
          ],
          modules: [
            {
              id: 1,
              values: {
                material_id: 1,
                title: 'Módulo 1 - Conceitos Básicos',
                description: 'Aprenda os conceitos fundamentais',
                type: 'content',
                content: 'Conteúdo do módulo...',
                video_url: '',
                file: '',
                duration: '15 min',
                display_order: 1,
                is_required: true,
                prerequisites: '',
                status: 1
              }
            }
          ],
          material_progress: [],
          module_progress: []
        };
        
        console.log(`📋 Usando dados mock para ${tableName}:`, mockData[tableName]?.length || 0, 'registros');
        return mockData[tableName] || [];
      },
      
      // Processar dados recebidos da API HubDB
      processarDadosHubDBAPI: function(dados) {
        try {
          console.log('🔄 Processando dados da API HubDB...');
          
          // Filtrar progresso do usuário atual
          const userMaterialProgress = dados.materialProgress.filter(p => 
            p.values.contact_id === parseInt(this.state.contact_id)
          );
          const userModuleProgress = dados.moduleProgress.filter(p => 
            p.values.contact_id === parseInt(this.state.contact_id)
          );
          
          // Processar materiais com progresso
          this.state.conteudos = dados.materials
            .filter(material => material.values.status && material.values.status.name === 'active') // Apenas ativos
            .map(material => {
              const materialId = parseInt(material.id);
              
              // Buscar módulos deste material (considerando nova estrutura foreignid)
              const materialModules = dados.modules.filter(module => {
                const moduleMaterialId = this.getRelationshipId(module.values.material) || module.values.material_id;
                return parseInt(moduleMaterialId) === materialId && 
                       module.values.status && module.values.status.name === 'active';
              });
              
              // Calcular progresso (considerando nova estrutura foreignid)
              const completedModules = userModuleProgress.filter(p => {
                const progressMaterialId = this.getRelationshipId(p.values.material) || p.values.material_id;
                return parseInt(progressMaterialId) === materialId && p.values.completed === true;
              });
              
              const totalModules = materialModules.length;
              const completedCount = completedModules.length;
              const progressPercentage = totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;
              
              // Encontrar categoria (considerando nova estrutura foreignid)
              const materialCategoryId = this.getRelationshipId(material.values.category) || material.values.category_id;
              const category = dados.categories.find(cat => parseInt(cat.id) === parseInt(materialCategoryId));
              
              return {
                id: materialId,
                titulo: material.values.title || '',
                title: material.values.title || '',
                descricao: material.values.description || '',
                description: material.values.description || '',
                tipo: material.values.type && material.values.type.name ? material.values.type.name : (material.values.type || 'document'),
                type: material.values.type && material.values.type.name ? material.values.type.name : (material.values.type || 'document'),
                categoria: category ? category.values.name : 'Outros',
                category_id: this.getRelationshipId(material.values.category) || material.values.category_id,
                thumbnail_url: material.values.thumbnail_url || '',
                duracao: material.values.duration || '',
                duration: material.values.duration || '',
                difficulty_level: material.values.difficulty_level && material.values.difficulty_level.name ? material.values.difficulty_level.name : (material.values.difficulty_level || 'beginner'),
                tags: this.processTags(material.values.tags),
                is_required: material.values.is_required || false,
                display_order: material.values.display_order || 0,
                status: material.values.status,
                progress: progressPercentage,
                progress_percentage: progressPercentage,
                total_modules: totalModules,
                completed_modules: completedCount,
                modules: materialModules.map(module => ({
                  id: parseInt(module.id),
                  material_id: parseInt(this.getRelationshipId(module.values.material) || module.values.material_id),
                  title: module.values.title || '',
                  description: module.values.description || '',
                  type: module.values.type && module.values.type.name ? module.values.type.name : (module.values.type || 'content'),
                  content: module.values.content || '',
                  video_url: module.values.video_url || '',
                  file: module.values.file || '',
                  duration: module.values.duration || '',
                  display_order: module.values.display_order || 0,
                  is_required: module.values.is_required || false,
                  prerequisites: module.values.prerequisites || '',
                  status: module.values.status,
                  completed: userModuleProgress.some(p => {
                    const progressModuleId = this.getRelationshipId(p.values.module) || p.values.module_id;
                    return parseInt(progressModuleId) === parseInt(module.id) && p.values.completed === true;
                  })
                })),
                // Campos para compatibilidade
                url_conteudo: material.values.file_url || '',
                data_criacao: material.values.created_at || new Date().toISOString().split('T')[0]
              };
            })
            .sort((a, b) => a.display_order - b.display_order);
          
          // Calcular estatísticas
          this.calcularEstatisticas();
          
          console.log('✅ Dados processados:', this.state.conteudos.length, 'materiais');
          this.showSuccessState();
          
        } catch (error) {
          console.error('❌ Erro ao processar dados HubDB:', error);
          this.showErrorState();
        }
      },
      
      // Calcular estatísticas dos materiais
      calcularEstatisticas: function() {
        const stats = {
          treinamentos: 0,
          webinars: 0,
          documentos: 0,
          total: this.state.conteudos.length
        };
        
        this.state.conteudos.forEach(material => {
          switch(material.type) {
            case 'training':
              stats.treinamentos++;
              break;
            case 'webinar':
              stats.webinars++;
              break;
            case 'document':
            case 'link':
            case 'brand':
              stats.documentos++;
              break;
          }
        });
        
        this.state.stats = stats;
        console.log('📊 Estatísticas calculadas:', stats);
      },

      // 🔄 FUNÇÃO FALLBACK: buscar conteúdos da API (mantida para compatibilidade)
      fetchConteudos: async function () {
        try {
          var params = new URLSearchParams({
            contact_id: this.state.contact_id
          });
  
          var response = await fetch(this.apiConfig.baseUrl + this.apiConfig.endpoints.getContent + '?' + params);
          
          if (!response.ok) {
            throw new Error('Erro na API: ' + response.status + ' - ' + response.statusText);
          }
  
          var data = await response.json();
          
          if (!data.results || !Array.isArray(data.results)) {
            console.warn('Formato de resposta inesperado:', data);
            this.state.conteudos = [];
          } else {
            this.state.conteudos = await this.processarDadosAPI(data);
          }
  
          this.renderConteudos();
        } catch (error) {
          console.error('❌ Erro ao buscar conteúdos:', error);
          this.showErrorState();
        }
      },
  
      // Processar dados da API
      processarDadosAPI: async function (data) {
        var conteudosProcessados = [];
        
        for (var resultGroup of data.results) {
          for (var item of resultGroup) {
            // Só incluir itens ativos
            if (!item.values || !item.values.status || item.values.status.name !== 'ativo') {
              continue;
            }
  
            // Validações básicas
            if (!item.values.titulo || !item.values.descricao) {
              console.warn('Item com dados incompletos, ignorando:', item.id);
              continue;
            }
  
            // Buscar thumbnail se disponível
            var thumbnailUrl = null;
            if (item.values.thumbnail_id) {
              try {
                thumbnailUrl = await this.fetchThumbnailUrl(item.values.thumbnail_id);
              } catch (error) {
                console.warn('Erro ao buscar thumbnail para item ' + item.id + ':', error);
              }
            }
  
            var conteudoProcessado = {
              id: item.id,
              titulo: item.values.titulo,
              descricao: item.values.descricao,
              tipo: item.values.tipo.name,
              categoria: item.values.categoria.name,
              status: item.values.status.name,
              url_conteudo: item.values.url_externa || (item.values.arquivo ? item.values.arquivo.url : ''),
              data_criacao: this.formatDateFromTimestamp(item.values.data_criacao),
              data_atualizacao: item.values.data_atualizacao ? this.formatDateFromTimestamp(item.values.data_atualizacao) : null,
              tags: item.values.tags ? item.values.tags.split(',').map(function(tag) { return tag.trim(); }).filter(function(tag) { return tag.length > 0; }) : [],
              autor: item.values.autor,
              duracao: this.formatarDuracao(item.values.duracao),
              tamanho_arquivo: item.values.tamanho_arquivo ? Math.round(parseInt(item.values.tamanho_arquivo) / 1024) + ' KB' : null,
              franqueado_id: item.values.franqueado_id,
              nome_da_campanha: item.values.nome_da_campanha,
              thumbnail_url: thumbnailUrl
            };
  
            conteudosProcessados.push(conteudoProcessado);
          }
        }
  
        // Ordenar por data de criação (mais recente primeiro)
        return conteudosProcessados.sort(function(a, b) {
          return new Date(b.data_criacao) - new Date(a.data_criacao);
        });
      },
  
      // Buscar thumbnail via API
      fetchThumbnailUrl: async function (thumbnailId) {
        try {
          var arquivo = await this.fetchArquivo(thumbnailId);
          return arquivo ? arquivo.url : null;
        } catch (error) {
          console.error('Erro ao buscar thumbnail:', error);
          return null;
        }
      },
  
      // Buscar arquivo específico
      fetchArquivo: async function (id) {
        try {
          var params = new URLSearchParams({ id: id });
          var response = await fetch(this.apiConfig.baseUrl + this.apiConfig.endpoints.getFile + '?' + params);
          
          if (!response.ok) {
            throw new Error('Erro na API: ' + response.status);
          }
  
          return await response.json();
        } catch (error) {
          console.error('Erro ao buscar arquivo:', error);
          return null;
        }
      },
  
      // Formatar duração
      formatarDuracao: function (duracao) {
        if (!duracao) return null;
        
        // Se já está no formato "X min" ou "Xh Ymin", manter
        if (duracao.includes('min') || duracao.includes('h')) {
          return duracao;
        }
        
        // Se está no formato HH:MM:SS, converter
        var timeMatch = duracao.match(/(\d{2}):(\d{2}):(\d{2})/);
        if (timeMatch) {
          var hours = parseInt(timeMatch[1]);
          var minutes = parseInt(timeMatch[2]);
          
          if (hours > 0) {
            return minutes > 0 ? hours + 'h ' + minutes + 'min' : hours + 'h';
          }
          return minutes + 'min';
        }
        
        return duracao;
      },
  
      // Formatar data de timestamp
      formatDateFromTimestamp: function (timestamp) {
        if (!timestamp) return '';
        try {
          return new Date(parseInt(timestamp)).toISOString().split('T')[0];
        } catch (e) {
          return '';
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
        this.renderConteudos();
      },
  
      hideAllStates: function () {
        if (this.loadingEl) this.loadingEl.style.display = 'none';
        if (this.errorEl) this.errorEl.style.display = 'none';
        if (this.noContactEl) this.noContactEl.style.display = 'none';
        if (this.contentEl) this.contentEl.style.display = 'none';
      },
  
      // Renderizar conteúdos
      renderConteudos: function () {
        this.hideAllStates();
        
        if (this.state.conteudos.length === 0) {
          this.showEmptyState();
        } else {
          this.showContentState();
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
  
        // Mostrar hero section
        this.showHeroSection();
        
        var html = this.generateContentHTML();
        this.contentEl.innerHTML = html;
        this.contentEl.style.display = 'block';
  
        this.addEventListeners();
      },
      
      showHeroSection: function () {
        var heroEl = this.container.querySelector('.conteudos-hero');
        if (heroEl) {
          // Calcular estatísticas
          this.updateStats();
          heroEl.style.display = 'block';
        }
      },
      
      updateStats: function () {
        var stats = {
          treinamentos: 0,
          webinars: 0,
          documentos: 0,
          total: this.state.conteudos.length
        };
        
        this.state.conteudos.forEach(function(item) {
          switch(item.categoria) {
            case 'Treinamentos':
              stats.treinamentos++;
              break;
            case 'Webinars':
              stats.webinars++;
              break;
            case 'Documentos':
            case 'Links Úteis':
            case 'Materiais de Marca':
              stats.documentos++;
              break;
          }
        });
        
        this.state.stats = stats;
        
        // Atualizar elementos na UI
        var statsElements = {
          'stats-treinamentos': stats.treinamentos,
          'stats-webinars': stats.webinars,
          'stats-documentos': stats.documentos,
          'stats-total': stats.total
        };
        
        Object.keys(statsElements).forEach(function(id) {
          var el = document.getElementById(id);
          if (el) el.textContent = statsElements[id];
        });
      },
  
      // Gerar HTML do conteúdo principal
      generateContentHTML: function () {
        return `
          <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <!-- Mensagem de Sucesso -->
            <div id="mensagem-sucesso" class="hidden bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
              <svg class="h-5 w-5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
              </svg>
              <span id="mensagem-sucesso-texto"></span>
            </div>
    
            <!-- Materiais por Categoria -->
            ${this.generateMaterialsByCategory()}
          </div>
        `;
      },
      
      // Gerar materiais agrupados por categoria (estilo materials.tsx)
      generateMaterialsByCategory: function () {
        var self = this;
        var materialsByCategory = this.getMaterialsByCategory();
        
        return Object.keys(materialsByCategory).map(function(categoria) {
          var materials = materialsByCategory[categoria];
          if (materials.length === 0) return '';
          
          return `
            <div class="mb-12 pt-6">
              <h2 class="text-2xl font-bold text-gray-900 mb-6">${categoria}</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${materials.map(function(material) {
                  return self.generateMaterialCard(material);
                }).join('')}
              </div>
            </div>
          `;
        }).join('');
      },
      
      // Gerar card de material (baseado no materials.tsx)
      generateMaterialCard: function(material) {
        var typeIcon = this.getTypeIcon(material.tipo);
        var typeColor = this.getTypeColor(material.tipo);
        var hasProgress = material.progress !== undefined;
        
        return `
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-200 overflow-hidden group cursor-pointer"
               onclick="window.portalConteudosModule.handleMaterialClick('${material.id}')">
            
            <!-- Thumbnail ou Gradient Background -->
            ${material.thumbnail_url ? `
              <div class="relative">
                <img
                  src="${material.thumbnail_url}"
                  alt="${material.titulo}"
                  class="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                />
                <div class="hidden w-full h-48 ${typeColor} text-white flex items-center justify-center">
                  <div class="text-center">
                    <div class="mb-4 opacity-80">
                      ${typeIcon.replace('w-5 h-5', 'w-12 h-12 mx-auto')}
                    </div>
                    <h3 class="text-lg font-semibold px-4 leading-tight">${material.titulo}</h3>
                  </div>
                </div>
                
                <!-- Type Badge -->
                <div class="absolute top-3 left-3">
                  <div class="${typeColor} text-white p-2 rounded-lg shadow-md">
                    ${typeIcon}
                  </div>
                </div>
                
                <!-- Progress Badge -->
                ${hasProgress ? `
                  <div class="absolute bottom-3 right-3">
                    <div class="bg-black/70 text-white px-2 py-1 rounded text-xs">
                      ${material.progress}% concluído
                    </div>
                  </div>
                ` : ''}
              </div>
            ` : `
              <div class="relative h-48 ${typeColor} text-white flex items-center justify-center">
                <div class="text-center">
                  <div class="mb-4 opacity-80">
                    ${typeIcon.replace('w-5 h-5', 'w-12 h-12 mx-auto')}
                  </div>
                  <h3 class="text-lg font-semibold px-4 leading-tight">${material.titulo}</h3>
                </div>
                ${hasProgress ? `
                  <div class="absolute bottom-3 right-3">
                    <div class="bg-black/30 text-white px-2 py-1 rounded text-xs">
                      ${material.progress}% concluído
                    </div>
                  </div>
                ` : ''}
              </div>
            `}
            
            <!-- Card Content -->
            <div class="p-6">
              <h3 class="font-semibold text-lg text-gray-900 mb-2">${material.titulo}</h3>
              <p class="text-gray-600 text-sm mb-4 line-clamp-2">${material.descricao}</p>
              
              <div class="flex items-center justify-between">
                <div class="flex items-center text-sm text-gray-500">
                  ${material.duracao ? `
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    ${material.duracao}
                  ` : ''}
                </div>
                
                <button class="${typeColor} text-white px-4 py-2 text-sm font-medium rounded-lg transition-colors hover:opacity-90">
                  ${this.getMaterialButtonText(material.tipo)}
                </button>
              </div>
              
              ${hasProgress ? `
              <!--  <div class="mt-4">
                  <div class="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progresso</span>
                    <span>${material.progress}%</span>
                  </div>
                  <div class="bg-gray-200 rounded-full h-2">
                    <div
                      class="bg-blue-600 rounded-full h-2 transition-all duration-300"
                      style="width: ${material.progress}%"
                    ></div>
                  </div>
                </div> -->
              ` : ''}
            </div>
          </div>
        `;
      },
  
      // Agrupar materiais por categoria
      getMaterialsByCategory: function() {
        var result = {};
        var self = this;
        
        // Inicializar todas as categorias
        this.abas.forEach(function(aba) {
          result[aba.categoria] = [];
        });
        
        // Agrupar conteúdos por categoria
        this.state.conteudos.forEach(function(material) {
          var categoria = material.categoria || 'Outros';
          if (!result[categoria]) {
            result[categoria] = [];
          }
          result[categoria].push(material);
        });
        
        // Filtrar categorias vazias
        Object.keys(result).forEach(function(categoria) {
          if (result[categoria].length === 0) {
            delete result[categoria];
          }
        });
        
        return result;
      },
  
      // Gerar conteúdo da tab
      generateTabContent: function () {
        var conteudosFiltrados = this.getConteudosFiltrados();
        
        if (conteudosFiltrados.length === 0) {
          return this.generateEmptyTabContent();
        }
  
        return `
          <div class="space-y-3 sm:space-y-4">
            ${conteudosFiltrados.map(this.generateConteudoItem.bind(this)).join('')}
          </div>
        `;
      },
  
      // Gerar conteúdo vazio da tab
      generateEmptyTabContent: function () {
        var categoria = this.getCategoriaLabel(this.state.abaSelecionada);
        return `
          <div class="text-center py-8 sm:py-12">
            <div class="text-gray-400 mb-4">
              <svg class="h-10 w-10 sm:h-12 sm:w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 class="text-base sm:text-lg font-medium text-gray-900 mb-2">
              ${this.state.busca ? 'Nenhum conteúdo encontrado' : 'Nenhum conteúdo disponível'}
            </h3>
            <p class="text-sm sm:text-base text-gray-600 px-4">
              ${this.state.busca ? 'Tente ajustar os termos de busca' : 'Em breve novos materiais de ' + categoria + ' serão adicionados'}
            </p>
          </div>
        `;
      },
  
      // Gerar item de conteúdo
      generateConteudoItem: function (item) {
        var IconeComponente = this.getIconePorTipo(item.tipo);
        var corIcone = this.getCorIcone(item.tipo);
        var tipoLabel = this.getTipoLabel(item.tipo);
  
        return `
          <div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <!-- Ícone ou Thumbnail -->
            <div class="flex-shrink-0 self-start sm:self-center">
              ${this.generateIconeOuThumbnail(item, IconeComponente, corIcone)}
            </div>
  
            <!-- Conteúdo -->
            <div class="flex-1 min-w-0">
              <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                <div class="flex-1 min-w-0">
                  <!-- Título e badges -->
                  <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                    <h3 class="text-sm sm:text-base font-medium text-gray-900 truncate">${item.titulo}</h3>
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded whitespace-nowrap">${tipoLabel}</span>
                      ${item.nome_da_campanha ? `<span class="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded whitespace-nowrap">${item.nome_da_campanha}</span>` : ''}
                    </div>
                  </div>
                  
                  <!-- Descrição -->
                  <p class="text-xs sm:text-sm text-gray-600 mb-3 line-clamp-2">${item.descricao}</p>
  
                  <!-- Metadados -->
                  <div class="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-gray-500">
                    <span class="flex items-center gap-1">
                      <svg class="h-3 w-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span class="truncate max-w-24 sm:max-w-none">${item.autor}</span>
                    </span>
                    <span class="flex items-center gap-1 whitespace-nowrap">
                      <svg class="h-3 w-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4m-6 0h6a1 1 0 011 1v9a2 2 0 01-2 2H9a2 2 0 01-2-2V8a1 1 0 011-1z" />
                      </svg>
                      ${this.formatDisplayDate(item.data_criacao)}
                    </span>
                    ${item.duracao ? `<span class="flex items-center gap-1 whitespace-nowrap">
                      <svg class="h-3 w-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      ${item.duracao}
                    </span>` : ''}
                    ${item.tamanho_arquivo ? `<span class="text-gray-400 whitespace-nowrap hidden sm:inline">${item.tamanho_arquivo}</span>` : ''}
                  </div>
                </div>
  
                <!-- Botão -->
                <div class="flex-shrink-0 w-full sm:w-auto">
                  <button
                    onclick="window.portalConteudosModule.handleClickItem('${item.id}')"
                    class="w-full sm:w-auto inline-flex items-center justify-center gap-1 sm:gap-1.5 bg-blue-600 text-white px-3 py-2 sm:px-2.5 sm:py-1.5 rounded-lg text-xs sm:text-xs font-medium hover:bg-blue-700 transition-colors cursor-pointer sm:max-w-20"
                  >
                    ${this.generateBotaoIcone(item.tipo)}
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      },
  
      // Gerar ícone ou thumbnail
      generateIconeOuThumbnail: function (item, IconeComponente, corIcone) {
        if (item.thumbnail_url) {
          return `
            <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
              <img
                src="${item.thumbnail_url}"
                alt="${item.titulo}"
                class="w-full h-full object-cover"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
              />
              <div class="hidden w-full h-full flex items-center justify-center ${corIcone}">
                ${IconeComponente.replace('h-6 w-6', 'h-5 w-5 sm:h-6 sm:w-6')}
              </div>
            </div>
          `;
        } else {
          return `
            <div class="p-2 sm:p-3 rounded-lg ${corIcone}">
              ${IconeComponente.replace('h-6 w-6', 'h-5 w-5 sm:h-6 sm:w-6')}
            </div>
          `;
        }
      },
  
      // Gerar ícone do botão
      generateBotaoIcone: function (tipo) {
        if (tipo === 'webinar' || tipo === 'treinamento_video') {
          return `
            <svg class="h-3 w-3 sm:h-3 sm:w-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 2h.01M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" />
            </svg>
            <span class="text-xs">Assistir</span>
          `;
        } else {
          return `
            <svg class="h-3 w-3 sm:h-3 sm:w-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            <span class="text-xs">Baixar</span>
          `;
        }
      },
  
      // Função auxiliar para detectar URLs do Google Drive
      isGoogleDriveUrl: function (url) {
        if (!url) return false;
        
        // Padrões de URLs do Google Drive
        var googleDrivePatterns = [
          'drive.google.com',
          'docs.google.com',
          'sheets.google.com',
          'slides.google.com',
          'forms.google.com'
        ];
        
        return googleDrivePatterns.some(function(pattern) {
          return url.includes(pattern);
        });
      },
  
      // Função para lidar com clique no material (baseado no materials.tsx)
      handleMaterialClick: function (materialId) {
        var material = this.state.conteudos.find(function(c) { return c.id == materialId; });
        if (!material) return;
  
        // Verificar se tem URL do Google Drive para abrir diretamente
        var externalUrl = material.url_conteudo || material.url_externa || material.file_url;
        if (externalUrl && this.isGoogleDriveUrl(externalUrl)) {
          console.log('🔗 Abrindo link do Google Drive diretamente:', externalUrl);
          window.open(externalUrl, '_blank');
          return;
        }
  
        // Tipos de treinamento vão para visualização de módulos
        if (material.type === 'training' || material.tipo === 'treinamento_video' ||
            material.type === 'webinar' || material.tipo === 'webinar' || 
            (material.modules && material.modules.length > 0)) {
          
          // Ir para página de detalhe se houver módulos
          if (material.modules && material.modules.length > 0) {
            var firstModule = material.modules[0];
            var contactId = this.state.contact_id;
            var url = '/conteudos/d?contact_id=' + encodeURIComponent(contactId) + 
                     '&content_id=' + encodeURIComponent(material.id) + 
                     '&module_id=' + encodeURIComponent(firstModule.id);
            window.location.href = url;
          } else {
            // Para materiais sem módulos específicos, ir direto para visualização
            var contactId = this.state.contact_id;
            var url = '/conteudos/d?contact_id=' + encodeURIComponent(contactId) + 
                     '&content_id=' + encodeURIComponent(material.id);
            window.location.href = url;
          }
        } else {
          // Outros tipos fazem download/abertura direto
          this.handleDownloadMaterial(material);
        }
      },
      
      // Função para download de materiais
      handleDownloadMaterial: async function (material) {
        var downloadUrl = material.url_conteudo || material.url_externa || material.file_url;
        
        // Se for Google Drive, abrir diretamente
        if (downloadUrl && this.isGoogleDriveUrl(downloadUrl)) {
          console.log('🔗 Abrindo link do Google Drive:', downloadUrl);
          window.open(downloadUrl, '_blank');
          this.showMensagemSucesso('Abrindo ' + material.titulo + ' no Google Drive');
          return;
        }
        
        if (!downloadUrl) {
          try {
            var arquivo = await this.fetchArquivo(material.id);
            if (arquivo && arquivo.url) {
              downloadUrl = arquivo.url;
            }
          } catch (error) {
            console.error('Erro ao buscar arquivo:', error);
            this.showMensagemSucesso('Erro ao acessar arquivo. Tente novamente.', 'error');
            return;
          }
        }

        if (downloadUrl) {
          window.open(downloadUrl, '_blank');
          // Verificar se é outro link externo
          if (downloadUrl.startsWith('http://') || downloadUrl.startsWith('https://')) {
            this.showMensagemSucesso('Abrindo: ' + material.titulo);
          } else {
            this.showMensagemSucesso('Download iniciado: ' + material.titulo);
          }
        } else {
          this.showMensagemSucesso('Arquivo não encontrado.', 'error');
        }
      },
  
      // Funções auxiliares para ícones e cores (baseado no materials.tsx)
      getTypeIcon: function (tipo) {
        var icons = {
          'webinar': '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>',
          'training': '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>',
          'document': '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>',
          'link': '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>',
          'brand': '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>',
          // Fallback para tipos antigos
          'treinamento_video': '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>',
          'documento_word': '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>'
        };
        return icons[tipo] || icons.document;
      },
      
      getTypeColor: function (tipo) {
        var colors = {
          'webinar': 'bg-gradient-to-br from-red-400 to-red-600',
          'training': 'bg-gradient-to-br from-blue-400 to-blue-600',
          'document': 'bg-gradient-to-br from-green-400 to-green-600',
          'link': 'bg-gradient-to-br from-purple-400 to-purple-600',
          'brand': 'bg-gradient-to-br from-pink-400 to-pink-600',
          // Fallback para tipos antigos
          'treinamento_video': 'bg-gradient-to-br from-blue-400 to-blue-600',
          'documento_word': 'bg-gradient-to-br from-green-400 to-green-600',
          'documento_excel': 'bg-gradient-to-br from-green-400 to-green-600',
          'apresentacao': 'bg-gradient-to-br from-orange-400 to-orange-600',
          'imagem_brand': 'bg-gradient-to-br from-pink-400 to-pink-600',
          'arquivo_franqueado': 'bg-gradient-to-br from-purple-400 to-purple-600'
        };
        return colors[tipo] || colors.document;
      },
      
      getMaterialButtonText: function (tipo) {
        var buttonTexts = {
          'webinar': 'Assistir Webinar',
          'training': 'Iniciar Curso',
          'document': 'Acessar',
          'link': 'Acessar',
          'brand': 'Acessar',
          // Fallback para tipos antigos
          'treinamento_video': 'Iniciar Curso',
          'documento_word': 'Acessar',
          'documento_excel': 'Acessar',
          'apresentacao': 'Acessar',
          'imagem_brand': 'Acessar',
          'arquivo_franqueado': 'Acessar'
        };
        return buttonTexts[tipo] || 'Acessar';
      },
  
      getCorIcone: function (tipo) {
        var cores = {
          webinar: 'bg-red-50 text-red-600',
          treinamento_video: 'bg-purple-50 text-purple-600',
          documento_word: 'bg-blue-50 text-blue-600',
          documento_excel: 'bg-green-50 text-green-600',
          apresentacao: 'bg-orange-50 text-orange-600',
          imagem_brand: 'bg-pink-50 text-pink-600',
          arquivo_franqueado: 'bg-gray-50 text-gray-600'
        };
        return cores[tipo] || cores.documento_word;
      },
  
      getTipoLabel: function (tipo) {
        var labels = {
          webinar: 'Webinar',
          treinamento_video: 'Vídeo',
          documento_word: 'Word',
          documento_excel: 'Excel',
          apresentacao: 'PowerPoint',
          imagem_brand: 'Imagens',
          arquivo_franqueado: 'Arquivos'
        };
        return labels[tipo] || labels.documento_word;
      },
  
      getCategoriaLabel: function (categoria) {
        var labels = {
          treinamentos: 'Treinamentos',
          documentos: 'Documentos',
          marketing: 'Marketing',
          branding: 'Branding',
          campanhas: 'Campanhas'
        };
        return labels[categoria] || categoria;
      },
  
      // Filtros
      getConteudosPorCategoria: function (categoria) {
        return this.state.conteudos.filter(function(item) {
          return item.categoria === categoria;
        });
      },
  
      getConteudosFiltrados: function () {
        var self = this;
        return this.state.conteudos.filter(function(item) {
          var matchCategoria = item.categoria === self.state.abaSelecionada;
          var matchBusca = self.state.busca === '' || 
            item.titulo.toLowerCase().includes(self.state.busca.toLowerCase()) ||
            item.descricao.toLowerCase().includes(self.state.busca.toLowerCase()) ||
            item.tags.some(function(tag) { return tag.toLowerCase().includes(self.state.busca.toLowerCase()); }) ||
            (item.nome_da_campanha && item.nome_da_campanha.toLowerCase().includes(self.state.busca.toLowerCase()));
          
          return matchCategoria && matchBusca;
        });
      },
  
      // Formatação
      formatDisplayDate: function (dateString) {
        if (!dateString) return '';
        try {
          return new Date(dateString).toLocaleDateString('pt-BR');
        } catch (e) {
          return dateString;
        }
      },
  
      // Ações
      trocarAba: function (categoria) {
        this.state.abaSelecionada = categoria;
        this.renderConteudos();
      },
  
      atualizarBusca: function (termo) {
        this.state.busca = termo;
        this.renderConteudos();
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
  
      // Event listeners
      addEventListeners: function () {
        var self = this;
        
        // Busca
        var buscaInput = document.getElementById('busca-input');
        if (buscaInput) {
          buscaInput.addEventListener('input', function() {
            self.atualizarBusca(this.value);
          });
        }
      }
    };
  
    // Expor o módulo globalmente (sem auto-execução)
    window.portalConteudosModule = module;
    console.log('📦 [TIMING] Portal de Conteúdos Module carregado e disponível (sem auto-execução)');
  
  })();