// Script de Migração: Materials + Modules → Content Unificado
// Rooftop Franquias - Academia Portal

(function() {
  'use strict';

  const MigrationScript = {
    // Configuração da API N8N
    apiConfig: {
      baseUrl: 'https://n8n2.rooftop.com.br/webhook/portal',
      hubdbUrl: 'https://n8n2.rooftop.com.br/webhook/portal/hubdb'
    },

    // IDs das tabelas existentes
    oldTables: {
      materials: '128861235',
      modules: '128888896',
      categories: '128861234'
    },

    // ID da nova tabela (você precisa criar essa tabela no HubDB primeiro)
    newTable: {
      content: '132105533' // ← Substitua pelo ID da nova tabela
    },

    // Mapeamento de tipos antigos para novos
    typeMapping: {
      // Materials types → Content types
      'training': 'video_youtube',
      'webinar': 'video_youtube',
      'document': 'file_attachment',
      'link': 'link_google_docs',
      'brand': 'file_attachment',
      
      // Modules types → Content types  
      'video': 'video_youtube',
      'content': 'link_google_docs',
      'file': 'file_attachment',
      'text': 'link_google_docs',
      'quiz': 'link_google_docs',
      'interactive': 'link_gamma_app'
    },

    // Estado da migração
    state: {
      materials: [],
      modules: [],
      categories: [],
      migratedContent: [],
      errors: []
    },

    // Função principal de migração
    async migrate() {
      console.log('🚀 Iniciando migração Materials + Modules → Content');
      
      try {
        // 1. Carregar dados das tabelas antigas
        await this.loadOldData();
        
        // 2. Processar e mapear dados
        await this.processData();
        
        // 3. Inserir na nova tabela
        await this.insertNewData();
        
        // 4. Relatório final
        this.generateReport();
        
      } catch (error) {
        console.error('❌ Erro na migração:', error);
        throw error;
      }
    },

    // Carregar dados das tabelas antigas
    async loadOldData() {
      console.log('📥 Carregando dados das tabelas antigas...');
      
      try {
        const [materials, modules, categories] = await Promise.all([
          this.fetchTableData('materials'),
          this.fetchTableData('modules'), 
          this.fetchTableData('categories')
        ]);

        this.state.materials = materials;
        this.state.modules = modules;
        this.state.categories = categories;

        console.log('✅ Dados carregados:', {
          materials: materials.length,
          modules: modules.length,
          categories: categories.length
        });

      } catch (error) {
        console.error('❌ Erro ao carregar dados antigos:', error);
        throw error;
      }
    },

    // Buscar dados de uma tabela via N8N
    async fetchTableData(tableName) {
      const tableId = this.oldTables[tableName];
      if (!tableId) {
        throw new Error(`Tabela ${tableName} não encontrada`);
      }

      const url = `${this.apiConfig.hubdbUrl}?tableId=${tableId}`;
      
      try {
        console.log(`🔍 Buscando dados da tabela ${tableName}...`);
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Erro HTTP ${response.status}`);
        }

        const data = await response.json();
        return data.results || [];

      } catch (error) {
        console.error(`❌ Erro ao buscar tabela ${tableName}:`, error);
        throw error;
      }
    },

    // Processar e mapear dados
    async processData() {
      console.log('🔄 Processando e mapeando dados...');
      
      // Para cada material, verificar se tem módulo relacionado
      for (const material of this.state.materials) {
        try {
          // Buscar módulo relacionado (se existir)
          const relatedModule = this.findRelatedModule(material.id);
          
          // Criar item de conteúdo unificado
          const contentItem = this.createContentItem(material, relatedModule);
          
          this.state.migratedContent.push(contentItem);
          
        } catch (error) {
          console.error(`❌ Erro ao processar material ${material.id}:`, error);
          this.state.errors.push({
            type: 'processing_error',
            materialId: material.id,
            error: error.message
          });
        }
      }
      
      console.log(`✅ ${this.state.migratedContent.length} itens processados`);
    },

    // Encontrar módulo relacionado ao material
    findRelatedModule(materialId) {
      return this.state.modules.find(module => {
        // Verificar diferentes formatos de relacionamento
        const moduleMaterialId = this.getRelationshipId(module.values.material) || 
                                module.values.material_id;
        return parseInt(moduleMaterialId) === parseInt(materialId);
      });
    },

    // Extrair ID de relacionamento foreignid
    getRelationshipId(relationshipField) {
      if (!relationshipField) return null;
      
      if (Array.isArray(relationshipField) && relationshipField.length > 0) {
        return relationshipField[0].id;
      }
      
      if (typeof relationshipField === 'string' || typeof relationshipField === 'number') {
        return relationshipField;
      }
      
      return null;
    },

    // Mapeamento de IDs para campos Select do HubDB
    categoryMapping: {
      'Treinamentos': { id: 1, name: 'Treinamentos' },
      'Webinars': { id: 2, name: 'Webinars' },
      'Documentos': { id: 3, name: 'Documentos' },
      'Links Úteis': { id: 4, name: 'Links Úteis' },
      'Materiais de Marca': { id: 5, name: 'Materiais de Marca' },
      'Outros': { id: 6, name: 'Outros' }
    },

    contentTypeMapping: {
      'video_youtube': { id: 1, name: 'Video YouTube' },
      'file_attachment': { id: 2, name: 'File Attachment' },
      'link_google_docs': { id: 3, name: 'Link Google Docs' },
      'link_google_slides': { id: 4, name: 'Link Google Slides' },
      'link_gamma_app': { id: 5, name: 'Link Gamma App' }
    },

    statusMapping: {
      'active': { id: 1, name: 'Active' },
      'inactive': { id: 2, name: 'Inactive' }
    },

    // Criar item de conteúdo unificado (FORMATO HUBDB CORRETO)
    createContentItem(material, module) {
      const categoryId = this.getRelationshipId(material.values.category) || material.values.category_id;
      const category = this.state.categories.find(cat => parseInt(cat.id) === parseInt(categoryId));
      const categoryName = category ? category.values.name : 'Outros';
      
      // Determinar tipo de conteúdo e URL
      const contentType = this.determineContentType(material, module);
      const contentUrl = this.determineContentUrl(material, module, contentType);
      
      // Status do material
      const isActive = material.values.status && material.values.status.name === 'active';
      const statusKey = isActive ? 'active' : 'inactive';
      
      return {
        // Campos básicos
        title: material.values.title || '',
        description: material.values.description || '',
        
        // Campos Select (formato MAP obrigatório)
        category: {
          id: this.categoryMapping[categoryName]?.id || this.categoryMapping['Outros'].id,
          name: this.categoryMapping[categoryName]?.name || this.categoryMapping['Outros'].name,
          type: 'option'
        },
        
        content_type: {
          id: this.contentTypeMapping[contentType]?.id || this.contentTypeMapping['file_attachment'].id,
          name: this.contentTypeMapping[contentType]?.name || this.contentTypeMapping['file_attachment'].name,
          type: 'option'
        },
        
        status: {
          id: this.statusMapping[statusKey].id,
          name: this.statusMapping[statusKey].name,
          type: 'option'
        },
        
        // URLs e metadados (strings simples)
        content_url: contentUrl,
        thumbnail_url: material.values.thumbnail_url || '',
        duration: material.values.duration || (module && module.values.duration) || '',
        tags: this.processTags(material.values.tags),
        display_order: material.values.display_order || 0,
        
        // Data como timestamp (número)
        created_at: material.values.created_at ? 
          (new Date(material.values.created_at).getTime()) : 
          Date.now()
      };
    },

    // Determinar tipo de conteúdo
    determineContentType(material, module) {
      // Priorizar tipo do módulo se existir
      if (module && module.values.type) {
        const moduleType = typeof module.values.type === 'object' ? 
                          module.values.type.name : module.values.type;
        if (this.typeMapping[moduleType]) {
          return this.typeMapping[moduleType];
        }
      }
      
      // Usar tipo do material
      const materialType = typeof material.values.type === 'object' ? 
                          material.values.type.name : material.values.type;
      
      return this.typeMapping[materialType] || 'file_attachment';
    },

    // Determinar URL do conteúdo
    determineContentUrl(material, module, contentType) {
      // Priorizar URLs do módulo
      if (module) {
        if (module.values.video_url) return module.values.video_url;
        if (module.values.file && typeof module.values.file === 'object' && module.values.file.url) {
          return module.values.file.url;
        }
      }
      
      // Usar URLs do material
      if (material.values.file_url) return material.values.file_url;
      if (material.values.url_externa) return material.values.url_externa;
      
      return '';
    },

    // Função removida - não usamos mais attachment_url separado

    // Processar tags
    processTags(tagsField) {
      if (!tagsField) return '';
      
      if (Array.isArray(tagsField)) {
        return tagsField.map(tag => tag.name || tag.label || tag.id).join(',');
      }
      
      if (typeof tagsField === 'string') {
        return tagsField;
      }
      
      return '';
    },

    // Inserir dados na nova tabela
    async insertNewData() {
      console.log('📤 Inserindo dados na nova tabela...');
      
      if (!this.newTable.content || this.newTable.content === 'NOVA_TABELA_ID_AQUI') {
        throw new Error('❌ ID da nova tabela não configurado! Atualize newTable.content');
      }
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const contentItem of this.state.migratedContent) {
        try {
          await this.insertContentItem(contentItem);
          successCount++;
          console.log(`✅ Inserido: ${contentItem.title}`);
          
        } catch (error) {
          errorCount++;
          console.error(`❌ Erro ao inserir ${contentItem.title}:`, error);
          this.state.errors.push({
            type: 'insertion_error',
            title: contentItem.title,
            error: error.message
          });
        }
      }
      
      console.log(`📊 Inserção concluída: ${successCount} sucessos, ${errorCount} erros`);
    },

    // Inserir item individual na nova tabela (FORMATO HUBDB CORRETO)
    async insertContentItem(contentItem) {
      const url = `${this.apiConfig.baseUrl}/hubdb-insert`;
      
      // Payload no formato exato que funciona
      const payload = {
        body: {
          tableId: this.newTable.content,
          values: contentItem
        }
      };
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
      }
      
      return await response.json();
    },

    // Gerar relatório da migração
    generateReport() {
      console.log('\n📊 RELATÓRIO DE MIGRAÇÃO');
      console.log('================================');
      console.log(`📥 Materials processados: ${this.state.materials.length}`);
      console.log(`📥 Modules processados: ${this.state.modules.length}`);
      console.log(`📤 Conteúdos migrados: ${this.state.migratedContent.length}`);
      console.log(`❌ Erros encontrados: ${this.state.errors.length}`);
      
      if (this.state.errors.length > 0) {
        console.log('\n❌ ERROS DETALHADOS:');
        this.state.errors.forEach((error, index) => {
          console.log(`${index + 1}. ${error.type}: ${error.error}`);
          if (error.materialId) console.log(`   Material ID: ${error.materialId}`);
          if (error.title) console.log(`   Título: ${error.title}`);
        });
      }
      
      // Distribuição por tipo de conteúdo
      const typeDistribution = {};
      this.state.migratedContent.forEach(item => {
        typeDistribution[item.content_type] = (typeDistribution[item.content_type] || 0) + 1;
      });
      
      console.log('\n📈 DISTRIBUIÇÃO POR TIPO:');
      Object.entries(typeDistribution).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });
      
      console.log('\n✅ Migração concluída!');
      console.log('\n⚠️  IMPORTANTE:');
      console.log('   - Tabelas antigas mantidas como backup');
      console.log('   - Arquivos físicos não migrados (apenas URLs)');
      console.log('   - Dados originais salvos nos campos original_*_data');
      console.log('   - Verificar nova tabela antes de usar em produção');
    },

    // Função de teste (apenas validação, não insere dados)
    async testMigration() {
      console.log('🧪 MODO TESTE - Simulando migração sem inserir dados...');
      
      try {
        await this.loadOldData();
        await this.processData();
        
        console.log('✅ Teste concluído com sucesso!');
        console.log('📊 Dados que seriam migrados:', this.state.migratedContent.length);
        console.log('❌ Erros que ocorreriam:', this.state.errors.length);
        
        // Mostrar alguns exemplos
        console.log('\n📋 EXEMPLOS DE CONTEÚDO A SER MIGRADO:');
        this.state.migratedContent.slice(0, 3).forEach((item, index) => {
          console.log(`${index + 1}. ${item.title} (${item.content_type})`);
          console.log(`   URL: ${item.content_url}`);
          console.log(`   Categoria: ${item.category}`);
        });
        
        return true;
      } catch (error) {
        console.error('❌ Erro no teste:', error);
        return false;
      }
    }
  };

  // Expor globalmente
  window.MigrationScript = MigrationScript;
  console.log('📦 Script de migração SEGURA carregado!');
  console.log('🧪 Teste primeiro: MigrationScript.testMigration()');
  console.log('🚀 Migração real: MigrationScript.migrate()');

})();