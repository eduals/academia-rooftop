// Módulo Detalhe do Conteúdo - Rooftop Franquias - VERSÃO ATUALIZADA PARA HUBDB
(function () {
    'use strict';
  
    var module = {
      // Configuração das APIs
      apiConfig: {
        baseUrl: 'https://n8n2.rooftop.com.br/webhook/portal',
        endpoints: {
          getContent: '/get-content',
          getFile: '/get-file',
          getContentDetail: '/get-content-detail',
          updateContent: '/update-content'
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

      // Função para chamadas à API de progresso
      callProgressAPI: async function(payload) {
        const url = `${this.apiConfig.baseUrl}${this.apiConfig.endpoints.updateContent}`;
        
        try {
          console.log('🔄 Atualizando progresso via API:', payload);
          
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
          });
          
          if (!response.ok) {
            throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
          }
          
          const data = await response.json();
          
          console.log('✅ Progresso atualizado com sucesso:', data);
          
          this.addDebugLog(9, 'Progresso atualizado via API', {
            action: payload.action,
            status: payload.status || payload.completed,
            response: data
          });
          
          return data;
          
        } catch (error) {
          console.error('❌ Erro ao atualizar progresso:', error);
          
          this.addDebugLog(9, 'Erro ao atualizar progresso', {
            action: payload.action,
            error: error.message
          });
          
          throw error;
        }
      },

      concluirConteudo: function () {
        var conteudo = this.state.conteudo;
        
        if (confirm('Marcar este conteúdo como concluído?')) {
          // Em produção, integrar com API para marcar como concluído
          console.log('Marcando conteúdo como concluído:', conteudo.id);
          
          this.addDebugLog(9, 'Conteúdo marcado como concluído', {
            titulo: conteudo.titulo,
            id: conteudo.id
          });
          
          // Mostrar feedback visual
          alert('Conteúdo marcado como concluído!');
          
          // Opcional: redirecionar de volta ao portal
          // window.location.href = '/portal';
        }
      },

      // Função para atualizar progresso de módulos
      updateModuleProgress: async function(moduleId, status, timeSpentMinutes = 0) {
        if (!this.state.contact_id || !moduleId) {
          console.warn('⚠️ Dados insuficientes para atualizar progresso do módulo');
          return null;
        }

        const payload = {
          action: "update_module_progress",
          table_id: this.hubdbConfig.tables.module_progress,
          contact_id: parseInt(this.state.contact_id),
          module_id: moduleId.toString(),
          material_id: this.state.content_id.toString(),
          status: status, // 'not_started', 'in_progress', 'completed'
          completed: status === 'completed',
          time_spent_minutes: timeSpentMinutes
        };

        // Adicionar completed_at apenas se for completed
        if (status === 'completed') {
          payload.completed_at = new Date().toISOString();
        }

        try {
          const result = await this.callProgressAPI(payload);
          
          console.log(`✅ Progresso do módulo ${moduleId} atualizado para ${status}`);
          
          return result;
          
        } catch (error) {
          console.error(`❌ Erro ao atualizar progresso do módulo ${moduleId}:`, error);
          throw error;
        }
      },

      // Função para atualizar progresso do material
      updateMaterialProgress: async function() {
        if (!this.state.contact_id || !this.state.content_id) {
          console.warn('⚠️ Dados insuficientes para atualizar progresso do material');
          return null;
        }

        const completedModules = this.state.modules.filter(m => m.completed).length;
        const totalModules = this.state.modules.length;
        const progressPercentage = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;
        const isCompleted = completedModules === totalModules && totalModules > 0;
        
        // Calcular tempo total estimado baseado nos módulos
        const estimatedTimeMinutes = this.calculateTotalTimeSpent();
        
        const payload = {
          action: "update_material_progress", 
          table_id: this.hubdbConfig.tables.material_progress,
          contact_id: parseInt(this.state.contact_id),
          material_id: this.state.content_id.toString(),
          completed: isCompleted,
          status: isCompleted ? 'completed' : (completedModules > 0 ? 'in_progress' : 'not_started'),
          progress_percentage: Math.round(progressPercentage),
          time_spent_minutes: estimatedTimeMinutes
        };

        // Adicionar completed_at apenas se for completed
        if (isCompleted) {
          payload.completed_at = new Date().toISOString();
        }

        try {
          const result = await this.callProgressAPI(payload);
          
          console.log(`✅ Progresso do material ${this.state.content_id} atualizado:`, {
            status: payload.status,
            progress: payload.progress_percentage,
            completed: `${completedModules}/${totalModules}`
          });
          
          return result;
          
        } catch (error) {
          console.error(`❌ Erro ao atualizar progresso do material:`, error);
          throw error;
        }
      },

      // Helper para calcular tempo total gasto
      calculateTotalTimeSpent: function() {
        return this.state.modules.reduce(function(total, module) {
          if (module.completed) {
            // Estimar tempo baseado no tipo de módulo
            switch(module.type) {
              case 'video': return total + 10; // 10 minutos para vídeos
              case 'text': return total + 5;   // 5 minutos para texto
              case 'quiz': return total + 3;   // 3 minutos para quiz
              case 'interactive': return total + 8; // 8 minutos para interativo
              case 'file': return total + 2;   // 2 minutos para arquivos
              default: return total + 3;       // 3 minutos padrão
            }
          }
          return total;
        }, 0);
      },

      // Verificar se material foi completamente concluído
      checkMaterialCompletion: function() {
        const completedCount = this.state.modules.filter(m => m.completed).length;
        const totalCount = this.state.modules.length;
        
        console.log(`📊 Progresso: ${completedCount}/${totalCount} módulos concluídos`);
        
        if (completedCount === totalCount && totalCount > 0) {
          console.log('🎉 Material completamente concluído!');
          
          // Atualizar progresso do material
          this.updateMaterialProgress().catch(error => {
            console.error('Erro ao atualizar progresso do material:', error);
          });
          
          // Mostrar celebração (implementar depois)
          this.showCompletionCelebration();
        } else if (completedCount > 0) {
          // Material em progresso - atualizar também
          this.updateMaterialProgress().catch(error => {
            console.error('Erro ao atualizar progresso do material:', error);
          });
        }
      },

      // Placeholder para celebração de conclusão
      showCompletionCelebration: function() {
        // TODO: Implementar animação ou modal de parabenização
        console.log('🎉 Parabéns! Você concluiu todo o material!');
        
        // Por enquanto, apenas um alert
        setTimeout(function() {
          alert('🎉 Parabéns! Você concluiu todo o treinamento!');
        }, 500);
      },

      // Funções auxiliares para URLs
      isYouTubeUrl: function (url) {
        return url && (
          url.includes('youtube.com') || 
          url.includes('youtu.be') || 
          url.includes('youtube-nocookie.com')
        );
      },

      getYouTubeEmbedUrl: function (url) {
        var videoId = null;
        
        // Extrair ID do vídeo de diferentes formatos de URL do YouTube
        if (url.includes('youtube.com/watch?v=')) {
          videoId = url.split('watch?v=')[1].split('&')[0];
        } else if (url.includes('youtu.be/')) {
          videoId = url.split('youtu.be/')[1].split('?')[0];
        } else if (url.includes('youtube.com/embed/')) {
          videoId = url.split('embed/')[1].split('?')[0];
        }
        
        if (videoId) {
          return 'https://www.youtube.com/embed/' + videoId;
        }
        
        return url; // Fallback
      },

      isGoogleDocsUrl: function (url) {
        return url && (
          url.includes('docs.google.com') || 
          url.includes('drive.google.com')
        );
      },

      getGoogleDocsEmbedUrl: function (url) {
        // Para Google Docs/Slides, adicionar /preview ou /embed no final
        if (url.includes('/edit')) {
          return url.replace('/edit', '/preview');
        } else if (url.includes('/view')) {
          return url.replace('/view', '/preview');
        } else if (!url.includes('/preview') && !url.includes('/embed')) {
          return url + '/preview';
        }
        
        return url;
      },

      isPdfUrl: function (url) {
        return url && (
          url.toLowerCase().endsWith('.pdf') ||
          url.includes('.pdf?') ||
          url.includes('pdf') ||
          url.includes('application/pdf')
        );
      },

      addDebugToggle: function () {
        // Adicionar botão para mostrar/ocultar debug em desenvolvimento
        if (this.debugEl && window.location.search.includes('debug=1')) {
          this.debugEl.classList.remove('hidden');
          
          // Adicionar botão para toggle
          var toggleButton = document.createElement('button');
          toggleButton.innerHTML = '🔍 Toggle Debug';
          toggleButton.className = 'bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600';
          toggleButton.onclick = function() {
            var container = document.getElementById('debug-logs-container');
            if (container) {
              container.style.display = container.style.display === 'none' ? 'block' : 'none';
            }
          };
          
          this.debugEl.appendChild(toggleButton);
        }
      },

      // Estado do módulo
      state: {
        contact_id: null,
        content_id: null,
        module_id: null,
        conteudo: null,
        currentModule: null,
        modules: [],
        currentView: 'content', // 'content' | 'detail' | 'webinar'
        sidebarOpen: false, // Sidebar fechado por padrão em mobile, mas sempre visível em desktop
        loading: false,
        error: false,
        initialized: false,
        showCongratulations: false,
        selectedMaterial: null,
        selectedModule: null,
        // Registros de progresso para usar IDs corretos na API
        moduleProgressRecords: [], // Array com registros de module_progress do usuário
        materialProgressRecord: null // Registro de material_progress do usuário
      },

      init: function () {
        console.log('🚀 Inicializando Detalhe do Conteúdo Module');
        
        this.container = document.querySelector('[data-module="detalheConteudoModule"]');
        if (!this.container) {
          console.warn('Container do módulo não encontrado');
          return;
        }

        // Elementos DOM
        this.contentEl = this.container.querySelector('.conteudo-detail');
        this.errorEl = this.container.querySelector('.conteudo-error');
        this.loadingEl = this.container.querySelector('.conteudo-loading');
        this.noIdEl = this.container.querySelector('.conteudo-no-id');
        this.debugEl = this.container.querySelector('.debug-section');

        // Inicializar dados
        this.initData();
        
        // Adicionar botão de debug em desenvolvimento
        this.addDebugToggle();
        
        // Carregar conteúdo
        this.loadConteudo();
      },

      initData: function () {
        // Obter dados do processamento HubL
        if (window.detalheConteudoData && window.detalheConteudoData.initialized) {
          this.state.contact_id = window.detalheConteudoData.contact_id;
          this.state.content_id = window.detalheConteudoData.content_id;
          this.state.module_id = window.detalheConteudoData.module_id;
          
          this.addDebugLog(2, 'Dados obtidos do HubL', {
            contact_id: this.state.contact_id,
            content_id: this.state.content_id,
            module_id: this.state.module_id
          });
        } else {
          // Fallback: tentar obter de outras fontes
          var urlParams = new URLSearchParams(window.location.search);
          this.state.contact_id = urlParams.get('contact_id') || localStorage.getItem('contact_id') || null;
          this.state.content_id = urlParams.get('id') || urlParams.get('content_id') || null;
          this.state.module_id = urlParams.get('module_id') || null;
          
          this.addDebugLog(2, 'Dados obtidos de fallback', {
            contact_id: this.state.contact_id,
            content_id: this.state.content_id,
            module_id: this.state.module_id
          });
        }

        this.state.initialized = true;
      },

      loadConteudo: function () {
        if (!this.state.content_id) {
          this.addDebugLog(3, 'Content ID não fornecido', null);
          this.showNoIdState();
          return;
        }

        if (!this.state.contact_id) {
          this.addDebugLog(3, 'Contact ID não fornecido', null);
          this.showErrorState('Usuário não identificado');
          return;
        }

        this.addDebugLog(3, 'Iniciando carregamento do conteúdo', {
          contact_id: this.state.contact_id,
          content_id: this.state.content_id
        });

        this.showLoadingState();
        this.fetchConteudo();
      },

      // Função para buscar detalhes do conteúdo via get-content-detail
      fetchConteudo: async function () {
        try {
          this.state.loading = true;
          this.state.error = false;

          // Buscar dados via endpoint get-content-detail
          await this.fetchConteudoViaGetContentDetail();

        } catch (error) {
          console.error('❌ Erro ao buscar conteúdo:', error);
          this.addDebugLog(6, 'Erro ao buscar conteúdo', {
            error: error.message
          });
          this.showErrorState(error.message);
        } finally {
          this.state.loading = false;
        }
      },
      
      // Buscar conteúdo via busca sequencial e relacional
      fetchConteudoViaGetContentDetail: async function() {
        try {
          console.log('🔄 Iniciando busca sequencial de dados relacionados...');
          
          // Buscar dados completos usando busca sequencial
          const completeData = await this.fetchCompleteContentData();
          
          // Processar dados completos
          await this.processarDadosCompletos(completeData);
          
          
        } catch (error) {
          console.error('❌ Erro ao buscar conteúdo via busca sequencial:', error);
          throw error;
        }
      },
      
      // Orquestrador principal - busca todos os dados relacionados sequencialmente
      fetchCompleteContentData: async function() {
        console.log('🔍 Etapa 1: Buscando material principal...');
        
        // 1. Buscar material principal
        const material = await this.fetchSingleRecord(this.state.content_id, this.hubdbConfig.tables.materials);
        if (!material) {
          throw new Error('Material não encontrado');
        }

        console.log('✅ Material encontrado:', material.values.title, material.values.type.name);
        
        // 2. Extrair IDs relacionados
        const categoryId = this.getRelationshipId(material.values.category);
        const materialId = material.id;
        console.log('categoryId', categoryId)
        console.log('materialId', materialId)
        
        console.log('🔍 Etapa 2: Buscando dados relacionados...');
        
        // 3. Buscar dados relacionados em paralelo
        const [category, modules, materialProgress, moduleProgress] = await Promise.all([
          // Buscar categoria se existir
          categoryId ? this.fetchSingleRecord(categoryId, this.hubdbConfig.tables.categories) : null,
          // Buscar módulos do material
          this.fetchRelatedRecords(this.hubdbConfig.tables.modules, {
            materialId: materialId,
            filterField: 'material'
          }),
          // Buscar progresso do material para o usuário
          this.fetchRelatedRecords(this.hubdbConfig.tables.material_progress, {
            contactId: this.state.contact_id,
            materialId: materialId,
            filterField: 'material'
          }),
          // Buscar progresso dos módulos para o usuário
          this.fetchRelatedRecords(this.hubdbConfig.tables.module_progress, {
            contactId: this.state.contact_id
          })
        ]);
        
        console.log('✅ Dados relacionados carregados:', {
          category: !!category,
          modules: modules.length,
          materialProgress: materialProgress.length,
          moduleProgress: moduleProgress.length
        });
        
        return {
          material,
          category,
          modules,
          materialProgress,
          moduleProgress
        };
      },
      
      // Buscar um registro específico por ID
      fetchSingleRecord: async function(contentId, tableId) {
        const url = `${this.apiConfig.baseUrl}${this.apiConfig.endpoints.getContentDetail}`;
        const params = new URLSearchParams({
          content_id: contentId,
          table_id: tableId
        });
        
        try {
          console.log(`🔍 Buscando registro ${contentId} na tabela ${tableId}...`);
          
          const response = await fetch(`${url}?${params}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            }
          });
          
          if (!response.ok) {
            console.warn(`⚠️ Erro ${response.status} ao buscar registro ${contentId}`);
            return null;
          }
          
          const data = await response.json();
          
          // O endpoint pode retornar o resultado diretamente ou em um array
          if (data.results && Array.isArray(data.results) && data.results.length > 0) {
            return data.results[0];
          } else if (data.id) {
            return data;
          }
          
          return null;
        } catch (error) {
          console.warn(`⚠️ Erro ao buscar registro ${contentId}:`, error.message);
          return null;
        }
      },
      
      // Buscar registros relacionados com filtros
      fetchRelatedRecords: async function(tableId, filters = {}) {
        const url = `${this.apiConfig.baseUrl}${this.apiConfig.endpoints.getContentDetail}`;
        const params = new URLSearchParams({
          table_id: tableId,
          fetch_all: 'true' // Indica que queremos buscar todos os registros da tabela
        });
        
        // Adicionar filtros se fornecidos
        if (filters.contactId) {
          params.append('contact_id', filters.contactId);
        }
        
        try {
          console.log(`🔍 Buscando registros relacionados da tabela ${tableId}...`);
          
          const response = await fetch(`${url}?${params}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            }
          });
          
          if (!response.ok) {
            console.warn(`⚠️ Erro ${response.status} ao buscar registros da tabela ${tableId}`);
            return [];
          }
          
          const data = await response.json();
          let results = [];
          
          if (data.results && Array.isArray(data.results)) {
            results = data.results;
          } else if (Array.isArray(data)) {
            results = data;
          }
          
          // Aplicar filtros client-side se necessário
          if (filters.materialId && filters.filterField) {
            results = results.filter(record => {
              const relatedId = this.getRelationshipId(record.values[filters.filterField]);
              return parseInt(relatedId) === parseInt(filters.materialId);
            });
          }
          
          console.log(`✅ Encontrados ${results.length} registros na tabela ${tableId}`);
          return results;
          
        } catch (error) {
          console.warn(`⚠️ Erro ao buscar registros da tabela ${tableId}:`, error.message);
          return [];
        }
      },
      
      // Processar dados completos após busca sequencial
      processarDadosCompletos: async function(data) {
        try {
          const { material, category, modules, materialProgress, moduleProgress } = data;
          // console.log('x modules', modules);
          // console.log('x materialProgress', materialProgress);
          // console.log('x moduleProgress', moduleProgress);
          // console.log('x material', material);
          // console.log('x category', category);

          // Filtrar módulos ativos
          const activeModules = modules.filter(module => 
            module.values.status && module.values.status.name === 'active'
          );
          console.log('activeModules', activeModules);
          // Processar material com seus dados relacionados
          this.state.conteudo = await this.processarMaterialCompleto({
            material,
            category,
            modules: activeModules,
            userMaterialProgress: materialProgress,
            userModuleProgress: moduleProgress
          });
          
          this.addDebugLog(6, 'Conteúdo processado com sucesso via busca sequencial', {
            titulo: this.state.conteudo.titulo,
            tipo: this.state.conteudo.tipo,
            modulesCount: activeModules.length,
            category: category?.values?.name
          });

          this.renderConteudo();
          
        } catch (error) {
          console.error('❌ Erro ao processar dados completos:', error);
          throw error;
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
      
      
      // Processar material completo com módulos e progresso
      processarMaterialCompleto: async function(data) {
        const { material, category, modules, userMaterialProgress, userModuleProgress } = data;
        const values = material.values || material;
        console.log('processarMaterialCompleto', modules)
        // Processar módulos com progresso
        const processedModules = modules.map(module => {
          const moduleProgress = userModuleProgress.find(p => {
            const progressModuleId = this.getRelationshipId(p.values.module) || p.values.module_id;
            return parseInt(progressModuleId) === parseInt(module.id);
          });
          console.log('data de processarMaterialCompleto', data)
          console.log({
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
            completed: moduleProgress ? moduleProgress.values.completed === true : false,
            started: moduleProgress ? ['in_progress', 'completed'].includes(moduleProgress.values.status?.name || moduleProgress.values.status) : false
          })
          return {
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
            completed: moduleProgress ? moduleProgress.values.completed === true : false,
            started: moduleProgress ? ['in_progress', 'completed'].includes(moduleProgress.values.status?.name || moduleProgress.values.status) : false
          };
        }).sort((a, b) => a.display_order - b.display_order);
        
        // Armazenar módulos no estado
        this.state.modules = processedModules;
        
        // Armazenar registros de progresso no estado para uso posterior nas APIs
        this.state.moduleProgressRecords = userModuleProgress || [];
        this.state.materialProgressRecord = (userMaterialProgress && userMaterialProgress.length > 0) ? userMaterialProgress[0] : null;
        
        console.log('📊 Registros de progresso armazenados:', {
          moduleProgressCount: this.state.moduleProgressRecords.length,
          hasMaterialProgress: !!this.state.materialProgressRecord
        });
        
        // Se há um module_id especificado, definir como módulo atual
        if (this.state.module_id && processedModules.length > 0) {
          var selectedModule = processedModules.find(function(m) { return m.id == this.state.module_id; }.bind(this));
          if (selectedModule) {
            this.state.selectedModule = selectedModule;
            this.state.currentView = 'content';
          } else {
            // Se module_id não foi encontrado, selecionar o primeiro
            this.state.selectedModule = processedModules[0];
          }
        } else if (processedModules.length > 0) {
          // Se não há module_id mas há módulos, selecionar o primeiro
          this.state.selectedModule = processedModules[0];
          this.state.currentView = 'content';
        } else {
          // Sem módulos, exibir conteúdo simples
          const tipo = values.type && values.type.name ? values.type.name : (values.type || 'document');
          this.state.currentView = (tipo === 'webinar') ? 'webinar' : 'detail';
        }
        
        return {
          id: parseInt(material.id),
          titulo: values.title || 'Título não disponível',
          descricao: values.description || '',
          descricao_completa: values.description || '',
          tipo: values.type && values.type.name ? values.type.name : (values.type || 'document'),
          categoria: 'Geral', // TODO: buscar categoria se necessário
          status: values.status ? values.status.name : 'active',
          url_conteudo: values.url_conteudo || '',
          url_externa: values.url_externa || '',
          data_criacao: values.created_at || new Date().toISOString().split('T')[0],
          data_atualizacao: values.updated_at || null,
          tags: this.processTags(values.tags),
          autor: values.autor || 'Academia Rooftop',
          duracao: values.duration || '',
          difficulty_level: values.difficulty_level && values.difficulty_level.name ? values.difficulty_level.name : 'beginner',
          tamanho_arquivo: null,
          franqueado_id: null,
          nome_da_campanha: null,
          thumbnail_url: values.thumbnail_url || '',
          file_url: values.file_url || '', // Nova coluna adicionada
          // Campos específicos para vídeos
          video_embed_code: values.video_embed_code || '',
          video_url: values.video_url || '',
          transcricao: values.transcricao || '',
          materiais_complementares: [],
          // Módulos do material
          modules: processedModules
        };
      },

      // Estados visuais
      showLoadingState: function () {
        this.hideAllStates();
        if (this.loadingEl) this.loadingEl.style.display = 'block';
      },

      showErrorState: function (message) {
        this.hideAllStates();
        if (this.errorEl) {
          // Personalizar mensagem de erro se fornecida
          if (message) {
            var errorText = this.errorEl.querySelector('p');
            if (errorText) {
              errorText.textContent = message;
            }
          }
          this.errorEl.style.display = 'block';
        }
      },

      showNoIdState: function () {
        this.hideAllStates();
        if (this.noIdEl) this.noIdEl.style.display = 'block';
      },

      hideAllStates: function () {
        if (this.loadingEl) this.loadingEl.style.display = 'none';
        if (this.errorEl) this.errorEl.style.display = 'none';
        if (this.noIdEl) this.noIdEl.style.display = 'none';
        if (this.contentEl) this.contentEl.style.display = 'none';
      },

      // Renderizar conteúdo
      renderConteudo: function () {
        this.hideAllStates();
        
        if (!this.state.conteudo) {
          this.showErrorState('Conteúdo não disponível');
          return;
        }

        var html = this.generateConteudoHTML();
        this.contentEl.innerHTML = html;
        this.contentEl.style.display = 'block';

        this.addEventListeners();
        this.addDebugLog(7, 'Conteúdo renderizado com sucesso', null);
      },

      // Gerar HTML do conteúdo baseado na view atual (materials.tsx style)
      generateConteudoHTML: function () {
        var conteudo = this.state.conteudo;
        
        // Se tem módulos (independente do tipo), sempre mostrar interface de módulos com sidebar
        if (this.state.modules.length > 0) {
          // Se não há módulo selecionado, selecionar o primeiro automaticamente
          if (!this.state.selectedModule) {
            this.state.selectedModule = this.state.modules[0];
            console.log('🔄 Auto-selecionando primeiro módulo:', this.state.selectedModule.title);
          }
          return this.generateModuleContentView();
        }
        
        // Se é webinar sem módulos
        if (conteudo.tipo === 'webinar') {
          return this.generateWebinarView();
        }
        
        // Para outros casos sem módulos, mostrar conteúdo simples
        return this.generateSimpleContentView();
      },

      // Funções adicionais... (mantenho o resto do código original por brevidade)
      // Todas as outras funções permanecem iguais
      
      addDebugLog: function (etapa, mensagem, dados) {
        if (window.addDetalheDebugLog) {
          window.addDetalheDebugLog(etapa, mensagem, dados);
        }
        
        // Atualizar interface de debug se visível
        this.updateDebugInterface();
      },

      updateDebugInterface: function () {
        var debugContainer = document.getElementById('debug-logs-container');
        if (debugContainer && window.detalheConteudoData && window.detalheConteudoData.debug_logs) {
          var logs = window.detalheConteudoData.debug_logs;
          var logsHTML = logs.map(function(log) {
            return `
              <div class="mb-2 p-2 bg-gray-100 rounded text-xs">
                <strong>Etapa ${log.etapa}:</strong> ${log.mensagem}
                ${log.dados ? '<br><code>' + JSON.stringify(log.dados, null, 2) + '</code>' : ''}
                <br><span class="text-gray-500">${log.timestamp}</span>
              </div>
            `;
          }).join('');
          
          debugContainer.innerHTML = logsHTML;
        }
      },

      // Event listeners
      addEventListeners: function () {
        // Event listeners são adicionados via onclick nos templates HTML
        // Isso garante melhor compatibilidade com HubSpot
      },

      // Gerar view de módulos de conteúdo (baseado no modelo TSX)
      generateModuleContentView: function() {
        var conteudo = this.state.conteudo;
        var selectedModule = this.state.selectedModule;
        var currentModuleIndex = this.state.modules.findIndex(m => m.id === selectedModule.id);
        var totalModules = this.state.modules.length;
        var nextModule = this.state.modules[currentModuleIndex + 1];
        var prevModule = this.state.modules[currentModuleIndex - 1];
        
        if (!selectedModule) {
          return '<div class="p-8 text-center text-gray-500">Nenhum módulo disponível</div>';
        }

        console.log('🎯 Gerando Module Content View - Total módulos:', this.state.modules.length);
        console.log('🎯 Módulo selecionado:', selectedModule.title);

        // Lista de módulos para sidebar
        var modulesList = this.state.modules.map(function(module, index) {
          var isActive = module.id === selectedModule.id;
          return `
            <div class="${isActive ? 'p-3 rounded-lg cursor-pointer transition-colors bg-blue-100 border-blue-300 border-2' : 'p-3 rounded-lg cursor-pointer transition-colors border border-gray-200 hover:bg-gray-50'}"
                 onclick="window.detalheConteudoModule.selectModule(${module.id})">
              <div class="flex items-center space-x-3">
                <div class="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${module.completed ? 'bg-green-500 text-white' : 'border-2 border-gray-300'}">
                  ${module.completed ? '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>' : `<span class="text-xs">${index + 1}</span>`}
                </div>
                <div class="flex-1">
                  <div class="flex items-center space-x-2">
                    <div class="text-gray-500">
                      ${this.getModuleIcon(module.type)}
                    </div>
                    <span class="text-sm font-medium text-gray-900">${module.title}</span>
                  </div>
                  <div class="text-xs text-gray-500 mt-1">${module.duration}</div>
                </div>
              </div>
            </div>
          `;
        }.bind(this)).join('');

        var moduleContent = this.renderModuleContent(selectedModule);

        return `
          <div class="min-h-screen bg-gray-50">
            <div class="flex min-h-screen">
              <!-- Sidebar -->
              <div class="w-80 bg-white flex flex-col border-r border-gray-200">
                <div class="p-6 border-b">
                  <div class="flex items-center justify-between mb-4">
                    <button onclick="window.detalheConteudoModule.backToList()"
                            class="flex items-center text-gray-600 hover:text-gray-900 transition-colors cursor-pointer">
                      <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                      </svg>
                      Voltar aos Materiais
                    </button>
                  </div>
                  <h2 class="text-lg font-semibold text-gray-900">${conteudo.titulo}</h2>
                  <div class="mt-2 text-sm text-gray-500">
                    Módulo ${currentModuleIndex + 1} de ${totalModules}
                  </div>
                </div>
                
                <div class="p-4 flex-1 overflow-y-auto">
                  <div class="space-y-2">
                    ${modulesList}
                  </div>
                </div>
              </div>

              <!-- Main Content -->
              <div class="flex-1 flex flex-col">
                <!-- Header -->
                <div class="bg-white border-b p-6">
                  <div class="flex items-center justify-between">
                    <div>
                      <h1 class="text-2xl font-bold text-gray-900">${selectedModule.title}</h1>
                      <p class="text-gray-600 mt-1">${selectedModule.duration}</p>
                    </div>
                   <!-- <div class="flex items-center space-x-4">
                      <button onclick="window.detalheConteudoModule.toggleModuleCompletion(${selectedModule.id})"
                              class="flex items-center px-4 py-2 rounded-lg transition-colors cursor-pointer ${selectedModule.completed ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-blue-600 hover:bg-blue-700 text-white'}">
                        ${selectedModule.completed ? 
                          '<svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>Concluído' : 
                          '<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>Marcar como Concluído'
                        }
                      </button>
                    </div> -->
                  </div>
                </div>

                <!-- Content Area -->
                <div class="flex-1 p-6 overflow-y-auto">
                  ${moduleContent}
                </div>

                <!-- Navigation Footer -->
                <div class="bg-white border-t p-6">
                  <div class="flex justify-between items-center">
                    <button onclick="${prevModule ? `window.detalheConteudoModule.selectModule(${prevModule.id})` : 'void(0)'}"
                            ${!prevModule ? 'disabled' : ''}
                            class="flex items-center px-6 py-3 rounded-lg transition-colors ${prevModule ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer' : 'bg-gray-50 text-gray-400 cursor-not-allowed'}">
                      <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                      </svg>
                      Módulo Anterior
                    </button>

                    <div class="text-center">
                      <div class="text-sm text-gray-500">
                        Módulo ${currentModuleIndex + 1} de ${totalModules}
                      </div>
                      <div class="w-48 bg-gray-200 rounded-full h-2 mt-2">
                        <div class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                             style="width: ${((currentModuleIndex + 1) / totalModules) * 100}%">
                        </div>
                      </div>
                    </div>

                    <button onclick="${nextModule ? `window.detalheConteudoModule.selectModule(${nextModule.id})` : 'void(0)'}"
                            ${!nextModule ? 'disabled' : ''}
                            class="flex items-center px-6 py-3 rounded-lg transition-colors ${nextModule ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer' : 'bg-gray-50 text-gray-400 cursor-not-allowed'}">
                      Próximo Módulo
                      <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      },

      // Gerar view de webinar baseada no modelo TSX
      generateWebinarView: function() {
        var conteudo = this.state.conteudo;
        
        return `
          <div class="min-h-screen bg-gray-50">
            <!-- Header -->
            <div class="bg-white shadow-sm border-b">
              <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex items-center justify-between h-16">
                  <button onclick="window.detalheConteudoModule.backToList()"
                          class="flex items-center text-gray-600 hover:text-gray-900 transition-colors cursor-pointer">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                    </svg>
                    Voltar aos Materiais
                  </button>
                  <div class="flex items-center space-x-2">
                    <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                    </svg>
                    <span class="text-sm font-medium text-gray-900">Webinar</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Main Content -->
            <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                <!-- Video Player Section -->
                <div class="lg:col-span-2">
                  <div class="bg-black rounded-xl overflow-hidden shadow-2xl">
                    <div class="aspect-video flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                      <div class="text-center text-white">
                        <div class="mb-6">
                          <svg class="w-20 h-20 mx-auto text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10"/>
                            <polygon points="10,8 16,12 10,16"/>
                          </svg>
                          <div class="animate-pulse">
                            <div class="w-3 h-3 bg-red-500 rounded-full mx-auto mb-2"></div>
                            <span class="text-red-400 text-sm font-medium">AO VIVO</span>
                          </div>
                        </div>
                        <h3 class="text-2xl font-bold mb-3">${conteudo.titulo}</h3>
                        <p class="text-gray-300 mb-6 px-8">${conteudo.descricao}</p>
                        <div class="space-y-3">
                          <button class="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors flex items-center mx-auto cursor-pointer">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="10"/>
                              <polygon points="10,8 16,12 10,16"/>
                            </svg>
                            Assistir Webinar
                          </button>
                          <p class="text-sm text-gray-400">
                            Duração: ${conteudo.duracao}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Title and Description -->
                  <div class="mt-6">
                    <h1 class="text-3xl font-bold text-gray-900 mb-4">${conteudo.titulo}</h1>
                    <p class="text-lg text-gray-700 leading-relaxed mb-6">${conteudo.descricao}</p>
                    
                    <!-- Tags -->
                    ${conteudo.tags && conteudo.tags.length > 0 ? `
                      <div class="flex flex-wrap gap-2 mb-6">
                        ${conteudo.tags.map(tag => `
                          <span class="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full font-medium">
                            #${tag}
                          </span>
                        `).join('')}
                      </div>
                    ` : ''}

                    <!-- Webinar Content -->
                    <div class="bg-white rounded-lg border p-6">
                      <h3 class="text-xl font-semibold text-gray-900 mb-4">Sobre este Webinar</h3>
                      <div class="space-y-4 text-gray-700">
                        <p>
                          Este webinar aborda as principais tendências e estratégias para o mercado de coworkings em 2025. 
                          Você aprenderá sobre as mudanças no comportamento do consumidor, novas tecnologias emergentes 
                          e como posicionar sua franquia para o crescimento sustentável.
                        </p>
                        <p>
                          Durante a apresentação, especialistas da Rooftop compartilharão insights baseados em dados reais 
                          do mercado e cases de sucesso de franquias que já implementaram essas estratégias.
                        </p>
                        
                        <div class="border-l-4 border-blue-500 pl-4 bg-blue-50 p-4 rounded-r-lg">
                          <h4 class="font-semibold text-blue-900 mb-2">O que você vai aprender:</h4>
                          <ul class="list-disc list-inside text-blue-800 space-y-1">
                            <li>Tendências de mercado para 2025</li>
                            <li>Novas tecnologias em espaços de trabalho</li>
                            <li>Estratégias de marketing digital</li>
                            <li>Cases de sucesso comprovados</li>
                            <li>Análise de ROI e métricas importantes</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Sidebar com informações -->
                <div class="lg:col-span-1">
                  <div class="sticky top-8 space-y-6">
                    
                    <!-- Informações do Webinar -->
                    <div class="bg-white rounded-lg border p-6">
                      <h3 class="text-lg font-semibold text-gray-900 mb-4">Informações</h3>
                      <div class="space-y-4">
                        <div class="flex items-center">
                          <svg class="w-5 h-5 text-gray-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.414L11 9.586V6z" clip-rule="evenodd"/>
                          </svg>
                          <div>
                            <p class="font-medium text-gray-900">Duração</p>
                            <p class="text-sm text-gray-600">${conteudo.duracao}</p>
                          </div>
                        </div>
                        
                        <div class="flex items-center">
                          <svg class="w-5 h-5 text-gray-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
                          </svg>
                          <div>
                            <p class="font-medium text-gray-900">Nível</p>
                            <p class="text-sm text-gray-600 capitalize">Iniciante</p>
                          </div>
                        </div>
                        
                        <div class="flex items-center">
                          <svg class="w-5 h-5 text-gray-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                          </svg>
                          <div>
                            <p class="font-medium text-gray-900">Formato</p>
                            <p class="text-sm text-gray-600">Webinar ao vivo</p>
                          </div>
                        </div>

                        <div class="flex items-center">
                          <svg class="w-5 h-5 text-gray-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                          </svg>
                          <div>
                            <p class="font-medium text-gray-900">Participantes</p>
                            <p class="text-sm text-gray-600">240 franqueados</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Certificado -->
                    <div class="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200 p-6">
                      <div class="flex items-center mb-3">
                        <svg class="w-6 h-6 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 2L3 7v11a2 2 0 002 2h10a2 2 0 002-2V7l-7-5zM10 9a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/>
                        </svg>
                        <h3 class="text-lg font-semibold text-gray-900">Certificado</h3>
                      </div>
                      <p class="text-sm text-gray-700 mb-4">
                        Receba um certificado de participação após assistir ao webinar completo.
                      </p>
                      <button class="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded-lg font-medium transition-colors cursor-pointer">
                        Baixar Certificado
                      </button>
                    </div>

                    <!-- Recursos Adicionais -->
                    <div class="bg-white rounded-lg border p-6">
                      <h3 class="text-lg font-semibold text-gray-900 mb-4">Recursos</h3>
                      <div class="space-y-3">
                        <button class="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                          <div class="flex items-center">
                            <svg class="w-5 h-5 text-blue-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 2v2h8V6H6zm0 4v2h8v-2H6zm0 4v2h5v-2H6z" clip-rule="evenodd"/>
                            </svg>
                            <div class="text-left">
                              <p class="font-medium text-gray-900">Apresentação</p>
                              <p class="text-sm text-gray-500">Slides do webinar</p>
                            </div>
                          </div>
                          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                          </svg>
                        </button>
                        
                        <button class="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                          <div class="flex items-center">
                            <svg class="w-5 h-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                            </svg>
                            <div class="text-left">
                              <p class="font-medium text-gray-900">Planilhas</p>
                              <p class="text-sm text-gray-500">Ferramentas práticas</p>
                            </div>
                          </div>
                          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      },

      // Gerar view de detalhes - lista de módulos baseada no modelo TSX
      generateDetailView: function() {
        var conteudo = this.state.conteudo;
        var completedModules = this.state.modules.filter(m => m.completed).length;
        var totalModules = this.state.modules.length;
        var progressPercentage = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;
        
        console.log('🎯 Renderizando Detail View - Total de módulos:', totalModules);

        return `
          <div class="min-h-screen bg-gray-50">
            <!-- Header -->
            <div class="bg-white shadow-sm border-b">
              <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex items-center justify-between h-16">
                  <button onclick="window.detalheConteudoModule.backToList()"
                          class="flex items-center text-gray-600 hover:text-gray-900 transition-colors cursor-pointer">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                    </svg>
                    Voltar aos Materiais
                  </button>
                  <div class="text-sm text-gray-500">
                    Progresso: ${Math.round(progressPercentage)}%
                  </div>
                </div>
              </div>
            </div>

            <!-- Course Header -->
            <div class="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
              <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <h1 class="text-3xl font-bold mb-2">${conteudo.titulo}</h1>
                    <p class="text-blue-100 mb-4">${conteudo.descricao}</p>
                    <div class="flex items-center space-x-6 text-sm">
                      <div class="flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.414L11 9.586V6z" clip-rule="evenodd"/>
                        </svg>
                        ${conteudo.duracao}
                      </div>
                      <div class="flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
                        </svg>
                        ${completedModules}/${totalModules} módulos
                      </div>
                      <div class="flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 2L3 7v11a2 2 0 002 2h10a2 2 0 002-2V7l-7-5zM10 9a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/>
                        </svg>
                        ${Math.round(progressPercentage)}% concluído
                      </div>
                    </div>
                  </div>
                  <div class="ml-8">
                    <img src="${conteudo.thumbnail_url || '/placeholder-course.jpg'}"
                         alt="${conteudo.titulo}"
                         class="w-32 h-24 object-cover rounded-lg shadow-lg" />
                  </div>
                </div>
                
                <!-- Progress Bar -->
                <div class="mt-6">
                  <div class="bg-blue-700 rounded-full h-2">
                    <div class="bg-white rounded-full h-2 transition-all duration-300"
                         style="width: ${progressPercentage}%">
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Modules -->
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <h2 class="text-2xl font-bold text-gray-900 mb-6">Módulos do Curso</h2>
              <div class="space-y-4">
                ${this.state.modules.map(function(module) {
                  return `
                    <div class="bg-white rounded-lg border p-6 transition-all duration-200 hover:shadow-md ${module.completed ? 'border-green-200 bg-green-50' : 'border-gray-200'}">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-4">
                          <button onclick="window.detalheConteudoModule.toggleModuleCompletion(${module.id})"
                                  class="flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer ${module.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-blue-500'}">
                            ${module.completed ? 
                              '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>' : 
                              '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>'
                            }
                          </button>
                          
                          <div class="flex items-center space-x-3">
                            <div class="p-2 rounded-lg ${this.getModuleTypeColor(module.type)}">
                              ${this.getModuleIcon(module.type)}
                            </div>
                            <div>
                              <h3 class="font-semibold ${module.completed ? 'text-green-800' : 'text-gray-900'}">
                                ${module.title}
                              </h3>
                              <p class="text-sm text-gray-500">
                                ${this.getModuleTypeLabel(module.type)} • ${module.duration}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div class="flex items-center space-x-2">
                          ${module.completed ? '<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Concluído</span>' : ''}
                          <button onclick="window.detalheConteudoModule.selectModuleAndStartContent(${module.id})"
                                  class="text-blue-600 hover:text-blue-800 text-sm font-medium cursor-pointer">
                            Acessar
                          </button>
                        </div>
                      </div>
                    </div>
                  `;
                }.bind(this)).join('')}
              </div>
            </div>
          </div>
        `;
      },

      // Renderizar conteúdo do módulo baseado no tipo
      renderModuleContent: function(module) {
        console.log('module', module);
        if (!module) return null;
        console.log('module.type', module.type);
        switch (module.type) {
          case 'video':
            // Gerar iframe do YouTube se tiver video_url
            var videoEmbed = '';
            if (module.video_url) {
              if (this.isYouTubeUrl(module.video_url)) {
                var videoId = this.getYouTubeVideoId(module.video_url);
                videoEmbed = `
                  <div class="bg-black rounded-lg overflow-hidden mb-6">
                    <div class="relative" style="padding-bottom: 56.25%; height: 0; min-height: 400px;">
                      <iframe class="absolute top-0 left-0 w-full h-full"
                              src="https://www.youtube.com/embed/${videoId}" 
                              frameborder="0" 
                              allowfullscreen>
                      </iframe>
                    </div>
                  </div>
                `;
              } else {
                videoEmbed = `
                  <div class="bg-black rounded-lg overflow-hidden mb-6">
                    <div class="relative" style="padding-bottom: 56.25%; height: 0; min-height: 400px;">
                      <iframe class="absolute top-0 left-0 w-full h-full"
                              src="${module.video_url}" 
                              frameborder="0" 
                              allowfullscreen>
                      </iframe>
                    </div>
                  </div>
                `;
              }
            } else {
              videoEmbed = `
                <div class="bg-black rounded-lg overflow-hidden mb-6">
                  <div class="relative flex items-center justify-center bg-gray-900" style="min-height: 400px;">
                    <div class="text-center text-white">
                      <svg class="w-24 h-24 mx-auto mb-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10"/>
                        <polygon points="10,8 16,12 10,16"/>
                      </svg>
                      <h3 class="text-xl font-semibold mb-2">${module.title}</h3>
                      <p class="text-gray-300 mb-4">Vídeo não disponível</p>
                    </div>
                  </div>
                </div>
              `;
            }

            return `
              <div class="space-y-6">
                ${videoEmbed}
                <div class="bg-white rounded-lg p-6">
                  <h4 class="font-semibold text-lg mb-3">Sobre este módulo</h4>
                  <p class="text-gray-600">${module.content || module.description}</p>
                </div>
              </div>
            `;
            
          case 'text':
            return `
              <div class="bg-white rounded-lg p-8">
                <div class="prose prose-lg max-w-none">
                  ${this.formatTextContent(module.content)}
                </div>
              </div>
            `;
            
          case 'file':
            // Usar file_url do material relacionado
            var fileUrl = this.getFileUrlForModule(module);
            console.log('=== DEBUG CASE FILE ===');
            console.log('module:', module);
            console.log('module.file:', module.file);
            console.log('fileUrl obtido:', fileUrl);
            
            // Verificar se é uma apresentação Gamma
            if (fileUrl && this.isGammaUrl(fileUrl)) {
              console.log('Detectada apresentação Gamma:', fileUrl);
              
              // Extrair ID da apresentação
              var presentationId = this.getGammaPresentationId(fileUrl);
              
              if (presentationId) {
                // Renderizar embed do Gamma
                return `
                  <div class="bg-white rounded-lg overflow-hidden">
                    <div class="relative">
                      <iframe 
                        src="https://gamma.app/embed/${presentationId}"
                        style="width: 100%; max-width: 100%; height: 450px;"
                        frameborder="0"
                        allow="fullscreen"
                        title="${module.title || 'Apresentação Gamma'}">
                      </iframe>
                    </div>
                    <div class="p-4 bg-gray-50 border-t">
                      <div class="flex items-center justify-between">
                        <div>
                          <h4 class="font-semibold text-gray-900">${module.title || 'Apresentação'}</h4>
                          <p class="text-sm text-gray-600 mt-1">Apresentação interativa do Gamma</p>
                        </div>
                        <a href="${fileUrl}" target="_blank" 
                           class="inline-flex items-center text-blue-600 hover:text-blue-700 transition-colors">
                          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                          </svg>
                          Abrir no Gamma
                        </a>
                      </div>
                    </div>
                  </div>
                `;
              } else {
                // Fallback caso não consiga extrair o ID
                return `
                  <div class="bg-white rounded-lg p-8 text-center">
                    <svg class="w-16 h-16 mx-auto mb-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/>
                    </svg>
                    <h3 class="text-lg font-semibold mb-2">${module.title || 'Apresentação Gamma'}</h3>
                    <p class="text-gray-600 mb-4">Clique no link abaixo para visualizar a apresentação</p>
                    <a href="${fileUrl}" target="_blank" 
                       class="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                      </svg>
                      Abrir Apresentação
                    </a>
                  </div>
                `;
              }
            }
            
            // Se fileUrl contém um ID de documento, buscar URL real e fazer embed (código original para PDFs)
            if (fileUrl) {
              // Criar container com ID único para este módulo
              var containerId = 'pdf-container-' + module.id;
              
              // Verificar se já é uma URL completa ou se precisa buscar via API
              var isCompleteUrl = fileUrl.startsWith('http');
              console.log('É URL completa?', isCompleteUrl);
              
              // Buscar URL do PDF e renderizar embed
              setTimeout(() => {
                // Se já tem URL completa, usar diretamente
                if (isCompleteUrl) {
                  var pdfUrl = fileUrl;
                  console.log('Usando URL direta:', pdfUrl);
                  // Renderizar PDF embed diretamente
                  var container = document.getElementById(containerId);
                  if (container) {
                    container.innerHTML = `
                      <div class="bg-white rounded-lg overflow-hidden">
                        <div class="relative" style="height: 600px;">
                          <iframe 
                            src="${pdfUrl}" 
                            class="absolute top-0 left-0 w-full h-full border-0"
                            frameborder="0"
                            allowfullscreen>
                          </iframe>
                        </div>
                        <div class="p-4 bg-gray-50 border-t">
                          <a href="${pdfUrl}" target="_blank" download 
                             class="inline-flex items-center text-blue-600 hover:text-blue-700 transition-colors">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2z"/>
                            </svg>
                            Baixar PDF
                          </a>
                        </div>
                      </div>
                    `;
                  }
                } else {
                  // Buscar URL via API
                  console.log('Buscando URL via API para ID:', fileUrl);
                  this.fetchFileUrl(fileUrl).then(pdfUrl => {
                    if (pdfUrl) {
                      // Renderizar PDF embed
                      var container = document.getElementById(containerId);
                      if (container) {
                        container.innerHTML = `
                          <div class="bg-white rounded-lg overflow-hidden">
                            <div class="relative" style="height: 600px;">
                              <iframe 
                                src="${pdfUrl}" 
                                class="absolute top-0 left-0 w-full h-full border-0"
                                frameborder="0"
                                allowfullscreen>
                              </iframe>
                            </div>
                            <div class="p-4 bg-gray-50 border-t">
                              <a href="${pdfUrl}" target="_blank" download 
                                 class="inline-flex items-center text-blue-600 hover:text-blue-700 transition-colors">
                                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2z"/>
                                </svg>
                                Baixar PDF
                              </a>
                            </div>
                          </div>
                        `;
                      }
                    } else {
                      // Fallback para download se não conseguir buscar URL
                      var container = document.getElementById(containerId);
                      if (container) {
                        container.innerHTML = `
                          <div class="bg-white rounded-lg p-8 text-center">
                            <svg class="w-24 h-24 mx-auto mb-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                            </svg>
                            <h3 class="text-2xl font-semibold mb-4">${module.title}</h3>
                            <p class="text-gray-600 mb-6">${module.content}</p>
                            <button disabled class="bg-gray-400 text-white px-8 py-3 rounded-lg cursor-not-allowed">
                              Arquivo não disponível
                            </button>
                            <p class="text-sm text-gray-500 mt-4">Arquivo • Duração estimada: ${module.duration}</p>
                          </div>
                        `;
                      }
                    }
                }).catch(error => {
                  console.error('Erro ao carregar PDF:', error);
                  var container = document.getElementById(containerId);
                  if (container) {
                    container.innerHTML = `
                      <div class="bg-white rounded-lg p-8 text-center">
                        <svg class="w-24 h-24 mx-auto mb-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <h3 class="text-2xl font-semibold mb-4">${module.title}</h3>
                        <p class="text-gray-600 mb-6">Erro ao carregar o arquivo PDF</p>
                        <p class="text-sm text-gray-500">Arquivo • Duração estimada: ${module.duration}</p>
                      </div>
                    `;
                  }
                });
                }
              }, 100);
              
              // Retornar container inicial com loading
              return `
                <div id="${containerId}">
                  <div class="bg-white rounded-lg p-8 text-center">
                    <div class="animate-pulse">
                      <div class="w-24 h-24 mx-auto mb-6 bg-gray-200 rounded"></div>
                      <div class="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
                      <div class="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-6"></div>
                      <div class="h-12 bg-gray-200 rounded w-48 mx-auto"></div>
                    </div>
                    <p class="text-sm text-gray-500 mt-4">Carregando arquivo...</p>
                  </div>
                </div>
              `;
            } else {
              // Se não tem fileUrl, mostrar mensagem de indisponível
              return `
                <div class="bg-white rounded-lg p-8 text-center">
                  <svg class="w-24 h-24 mx-auto mb-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                  </svg>
                  <h3 class="text-2xl font-semibold mb-4">${module.title}</h3>
                  <p class="text-gray-600 mb-6">${module.content}</p>
                  <button disabled class="bg-gray-400 text-white px-8 py-3 rounded-lg cursor-not-allowed">
                    Arquivo não disponível
                  </button>
                  <p class="text-sm text-gray-500 mt-4">Arquivo • Duração estimada: ${module.duration}</p>
                </div>
              `;
            }

          case 'quiz':
            return `
              <div class="bg-white rounded-lg p-8 text-center">
                <svg class="w-24 h-24 mx-auto mb-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <h3 class="text-2xl font-semibold mb-4">${module.title}</h3>
                <p class="text-gray-600 mb-6">${module.content}</p>
                <div class="space-y-4">
                  <button class="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg transition-colors cursor-pointer">
                    Iniciar Quiz
                  </button>
                  <p class="text-sm text-gray-500">Quiz • Duração estimada: ${module.duration}</p>
                </div>
              </div>
            `;

          case 'interactive':
            return `
              <div class="bg-white rounded-lg p-8 text-center">
                <svg class="w-24 h-24 mx-auto mb-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
                <h3 class="text-2xl font-semibold mb-4">${module.title}</h3>
                <p class="text-gray-600 mb-6">${module.content}</p>
                <div class="space-y-4">
                  <button class="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg transition-colors cursor-pointer">
                    Iniciar Atividade
                  </button>
                  <p class="text-sm text-gray-500">Conteúdo Interativo • Duração estimada: ${module.duration}</p>
                </div>
              </div>
            `;
            
          default:
            return `
              <div class="bg-white rounded-lg p-6 text-center text-gray-500">
                <svg class="w-12 h-12 mx-auto mb-4 opacity-50" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/>
                </svg>
                <p>Conteúdo em preparação</p>
              </div>
            `;
        }
      },

      // Função auxiliar para formatar conteúdo de texto (como no modelo TSX)
      formatTextContent: function(content) {
        if (!content) return '';
        
        return content.split('\n').map(function(line, index) {
          if (line.startsWith('# ')) {
            return '<h1 class="text-3xl font-bold text-gray-900 mt-8 mb-4">' + line.substring(2) + '</h1>';
          } else if (line.startsWith('## ')) {
            return '<h2 class="text-2xl font-semibold text-gray-800 mt-6 mb-3">' + line.substring(3) + '</h2>';
          } else if (line.startsWith('### ')) {
            return '<h3 class="text-xl font-semibold text-gray-800 mt-4 mb-2">' + line.substring(4) + '</h3>';
          } else if (line.startsWith('- ')) {
            return '<li class="text-gray-700 ml-4">' + line.substring(2) + '</li>';
          } else if (line.startsWith('**') && line.endsWith('**')) {
            return '<p class="text-gray-700 font-semibold mt-3">' + line.slice(2, -2) + '</p>';
          } else if (line.trim() === '') {
            return '<br />';
          } else {
            return '<p class="text-gray-700 mt-2 leading-relaxed">' + line + '</p>';
          }
        }).join('');
      },

      // Função auxiliar para obter ícones de módulos
      getModuleIcon: function(type) {
        switch (type) {
          case 'video':
            return '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polygon points="10,8 16,12 10,16"/></svg>';
          case 'text':
            return '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 2v2h8V6H6zm0 4v2h8v-2H6zm0 4v2h5v-2H6z" clip-rule="evenodd"/></svg>';
          case 'file':
            return '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>';
          case 'quiz':
            return '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
          case 'interactive':
            return '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>';
          default:
            return '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/></svg>';
        }
      },

      // Função auxiliar para extrair ID do vídeo do YouTube
      getYouTubeVideoId: function(url) {
        var videoId = null;
        
        // Extrair ID do vídeo de diferentes formatos de URL do YouTube
        if (url.includes('youtube.com/watch?v=')) {
          videoId = url.split('watch?v=')[1].split('&')[0];
        } else if (url.includes('youtu.be/')) {
          videoId = url.split('youtu.be/')[1].split('?')[0];
        } else if (url.includes('youtube.com/embed/')) {
          videoId = url.split('embed/')[1].split('?')[0];
        }
        
        return videoId;
      },

      // Função auxiliar para obter URL do arquivo do material
      getFileUrlForModule: function(module) {
        // Primeiro verificar se o módulo tem arquivo com URL
        if (module.file) {
          // Se file é um objeto com URL
          if (module.file.url) {
            return module.file.url;
          }
          // Se file tem ID para buscar via API
          if (module.file.id) {
            return module.file.id;
          }
        }
        
        // Fallback para file_url do material
        if (this.state.conteudo && this.state.conteudo.file_url) {
          return this.state.conteudo.file_url;
        }
        
        return null;
      },

      // Verificar se a URL é de uma apresentação Gamma
      isGammaUrl: function(url) {
        return url && url.includes('gamma.app');
      },

      // Extrair ID da apresentação Gamma da URL
      getGammaPresentationId: function(url) {
        if (!url) return null;
        
        // Suporta formatos:
        // https://gamma.app/docs/ID
        // https://gamma.app/embed/ID
        // https://gamma.app/public/ID
        const match = url.match(/gamma\.app\/(?:docs|embed|public)\/([a-zA-Z0-9\-_]+)/);
        return match ? match[1] : null;
      },

      // Função para buscar URL real do arquivo PDF no endpoint N8N
      fetchFileUrl: async function(fileId) {
        try {
          const response = await fetch(`https://n8n2.rooftop.com.br/webhook/portal/get-file?id=${fileId}`);
          if (!response.ok) {
            throw new Error('Erro ao buscar URL do arquivo');
          }
          const data = await response.json();
          return data.url || null;
        } catch (error) {
          console.error('Erro ao buscar URL do arquivo:', error);
          return null;
        }
      },

      // Função auxiliar para obter cores por tipo de módulo
      getModuleTypeColor: function(type) {
        switch (type) {
          case 'video':
            return 'bg-red-100 text-red-600';
          case 'text':
            return 'bg-blue-100 text-blue-600';
          case 'file':
            return 'bg-gray-100 text-gray-600';
          case 'quiz':
            return 'bg-green-100 text-green-600';
          case 'interactive':
            return 'bg-purple-100 text-purple-600';
          default:
            return 'bg-gray-100 text-gray-600';
        }
      },

      // Função auxiliar para obter labels por tipo de módulo
      getModuleTypeLabel: function(type) {
        switch (type) {
          case 'video':
            return 'Vídeo';
          case 'text':
            return 'Leitura';
          case 'file':
            return 'Arquivo';
          case 'quiz':
            return 'Quiz';
          case 'interactive':
            return 'Interativo';
          default:
            return 'Conteúdo';
        }
      },

      // Gerar embed de vídeo
      generateVideoEmbed: function(videoUrl) {
        if (this.isYouTubeUrl(videoUrl)) {
          var embedUrl = this.getYouTubeEmbedUrl(videoUrl);
          return `
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div class="relative bg-black aspect-video">
                <iframe 
                  src="${embedUrl}" 
                  class="absolute inset-0 w-full h-full"
                  frameborder="0" 
                  allowfullscreen>
                </iframe>
              </div>
            </div>
          `;
        } else if (this.isGoogleDocsUrl(videoUrl)) {
          var embedUrl = this.getGoogleDocsEmbedUrl(videoUrl);
          return `
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div class="relative aspect-video">
                <iframe 
                  src="${embedUrl}" 
                  class="absolute inset-0 w-full h-full"
                  frameborder="0">
                </iframe>
              </div>
            </div>
          `;
        } else {
          return `
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
              <div class="text-center">
                <svg class="w-12 h-12 mx-auto mb-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
                </svg>
                <p class="text-gray-600 mb-4">Vídeo disponível</p>
                <a href="${videoUrl}" target="_blank" class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/>
                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/>
                  </svg>
                  Assistir Vídeo
                </a>
              </div>
            </div>
          `;
        }
      },

      // Selecionar um módulo (com auto-completar vídeos)
      selectModule: function(moduleId) {
        // Salvar módulo anterior se existir
        const previousModule = this.state.selectedModule;
        
        // Se módulo anterior era vídeo e não estava concluído, marcar como concluído automaticamente
        if (previousModule && previousModule.type === 'video' && !previousModule.completed) {
          console.log('📹 Auto-completando vídeo anterior:', previousModule.title);
          this.autoCompleteVideoModule(previousModule.id);
        }
        
        // Selecionar novo módulo
        var module = this.state.modules.find(function(m) { return m.id == moduleId; });
        if (module) {
          this.state.selectedModule = module;
          
          // Marcar como iniciado se ainda não foi iniciado
          if (!module.started && !module.completed) {
            console.log('🚀 Iniciando módulo:', module.title);
            module.started = true;
            
            // Atualizar progresso para 'in_progress' via API
            this.updateModuleProgress(module.id, 'in_progress').catch(error => {
              console.error('Erro ao marcar módulo como iniciado:', error);
            });
          }
          
          this.renderConteudo();
          
          this.addDebugLog(8, 'Módulo selecionado', {
            moduleId: module.id,
            title: module.title,
            previousModule: previousModule ? previousModule.title : null
          });
        }
      },

      // Auto-completar módulos de vídeo ao navegar
      autoCompleteVideoModule: async function(moduleId) {
        try {
          const estimatedTimeMinutes = 10; // Tempo estimado para vídeos
          
          await this.updateModuleProgress(moduleId, 'completed', estimatedTimeMinutes);
          
          // Atualizar estado local
          const module = this.state.modules.find(m => m.id == moduleId);
          if (module) {
            module.completed = true;
            console.log('✅ Vídeo auto-completado:', module.title);
          }
          
          // Verificar se material completo foi concluído
          this.checkMaterialCompletion();
          
        } catch (error) {
          console.error('❌ Erro ao auto-completar módulo de vídeo:', error);
          // Não bloquear a navegação se houver erro
        }
      },

      // Alternar conclusão de módulo (com API)
      toggleModuleCompletion: async function(moduleId) {
        const module = this.state.modules.find(m => m.id == moduleId);
        if (!module) {
          console.warn('⚠️ Módulo não encontrado:', moduleId);
          return;
        }
        
        const newStatus = module.completed ? 'in_progress' : 'completed';
        const estimatedTime = this.getEstimatedTimeForModule(module);
        
        try {
          // Mostrar loading state
          this.showModuleLoadingState(moduleId, true);
          
          // Chamada para API
          await this.updateModuleProgress(moduleId, newStatus, estimatedTime);
          
          // Atualizar estado local apenas após sucesso da API
          module.completed = !module.completed;
          
          // Verificar conclusão do material
          this.checkMaterialCompletion();
          
          // Re-renderizar interface
          this.renderConteudo();
          
          this.addDebugLog(9, module.completed ? 'Módulo marcado como concluído' : 'Módulo desmarcado', {
            moduleId: module.id,
            title: module.title,
            completed: module.completed,
            status: newStatus
          });
          
          // Feedback visual de sucesso
          this.showModuleSuccessState(moduleId);
          
        } catch (error) {
          console.error('❌ Erro ao atualizar progresso:', error);
          
          // Remover loading state
          this.showModuleLoadingState(moduleId, false);
          
          // Mostrar mensagem de erro para o usuário
          this.showErrorMessage('Erro ao salvar progresso. Tente novamente.');
          
          this.addDebugLog(9, 'Erro ao alternar conclusão do módulo', {
            moduleId: module.id,
            error: error.message
          });
        }
      },

      // Helper para obter tempo estimado por tipo de módulo
      getEstimatedTimeForModule: function(module) {
        switch(module.type) {
          case 'video': return 10;        // 10 minutos para vídeos
          case 'text': return 5;          // 5 minutos para leitura
          case 'quiz': return 3;          // 3 minutos para quiz
          case 'interactive': return 8;   // 8 minutos para interativo
          case 'file': return 2;          // 2 minutos para downloads
          default: return 3;              // 3 minutos padrão
        }
      },

      // Estados visuais para feedback do usuário
      showModuleLoadingState: function(moduleId, isLoading) {
        // Encontrar o botão do módulo e mostrar/esconder loading
        const moduleButtons = document.querySelectorAll(`[onclick*="toggleModuleCompletion(${moduleId})"]`);
        moduleButtons.forEach(button => {
          if (isLoading) {
            button.style.opacity = '0.7';
            button.style.pointerEvents = 'none';
            // TODO: Adicionar spinner se necessário
          } else {
            button.style.opacity = '1';
            button.style.pointerEvents = 'auto';
          }
        });
      },

      showModuleSuccessState: function(moduleId) {
        // Feedback visual temporário de sucesso
        const moduleButtons = document.querySelectorAll(`[onclick*="toggleModuleCompletion(${moduleId})"]`);
        moduleButtons.forEach(button => {
          const originalBackground = button.style.backgroundColor;
          button.style.backgroundColor = '#10b981'; // Verde de sucesso
          
          setTimeout(() => {
            button.style.backgroundColor = originalBackground;
          }, 1000);
        });
      },

      showErrorMessage: function(message) {
        // TODO: Implementar toast/modal mais elegante
        alert(message);
        
        // Versão console para debug
        console.error('⚠️ Erro apresentado ao usuário:', message);
      },

      // Selecionar módulo e iniciar visualização de conteúdo
      selectModuleAndStartContent: function(moduleId) {
        var module = this.state.modules.find(function(m) { return m.id == moduleId; });
        if (module) {
          this.state.selectedModule = module;
          this.state.currentView = 'content';
          this.renderConteudo();
        }
      },

      // Toggle sidebar mobile (não mais necessário na versão desktop)
      toggleSidebar: function() {
        // Função mantida para compatibilidade, mas não mais usada
        console.log('Toggle sidebar chamado - não mais necessário na versão desktop');
      },

      // Voltar para lista de materiais
      backToList: function() {
        // Resetar estado
        this.state.currentView = 'list';
        this.state.selectedModule = null;
        this.state.sidebarOpen = false;
        
        // Redirecionar para página de listagem ou recarregar
        window.location.href = '/conteudos'; // ou qualquer URL da listagem
      },

      generateSimpleContentView: function() {
        var conteudo = this.state.conteudo;
        return `
          <div class="min-h-screen bg-gray-50 py-4 sm:py-8">
            <div class="max-w-4xl mx-auto px-3 sm:px-6">
              <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div class="p-4 sm:p-6 border-b border-gray-200">
                  <h1 class="text-xl sm:text-2xl font-bold text-gray-900 mb-3">${conteudo.titulo}</h1>
                  <p class="text-gray-600">${conteudo.descricao}</p>
                </div>
                <div class="p-4 sm:p-6">
                  <p>Conteúdo: ${conteudo.tipo}</p>
                  <p>ID: ${conteudo.id}</p>
                  <p>Módulos: ${this.state.modules.length}</p>
                </div>
              </div>
            </div>
          </div>
        `;
      }
    };

    // Expor o módulo globalmente
    window.detalheConteudoModule = module;

    // Inicializar quando o DOM estiver pronto
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        module.init();
      });
    } else {
      module.init();
    }

  })();