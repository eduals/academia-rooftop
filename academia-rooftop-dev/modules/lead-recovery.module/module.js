// Módulo de Campanha Acelera Master - HomeCash Rooftop
(function () {
  'use strict';

  var module = {
    n8nConfig: {
      baseUrl: 'https://n8n2.rooftop.com.br/webhook/portal',
      endpoints: {
        getLeads: '/lead/generator',
        recoverLead: '/lead/recovery',
        discardLead: '/lead/discard'
      }
    },

    init: function () {
      this.container = document.querySelector('[data-module="leadRecoveryModule"]');
      if (!this.container) return;

      this.contentEl = this.container.querySelector('.lead-recovery-content');
      this.errorEl = this.container.querySelector('.lead-recovery-error');

      // Verificar se o módulo está liberado
      var config = window.leadRecoveryConfig || {};

      if (!config.moduloLiberado) {
        this.showAccessDenied();
        return;
      }

      if (!config.listId) {
        this.showNoListConfigured();
        return;
      }

      this.loadLeads();
    },

    // Função para buscar leads via API
    fetchLeadsFromAPI: async function(listId) {
      var url = this.n8nConfig.baseUrl + this.n8nConfig.endpoints.getLeads;

      try {
        var response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ listId: listId })
        });

        if (!response.ok) {
          throw new Error('HTTP error! status: ' + response.status);
        }

        var data = await response.json();
        return data.data;

      } catch (error) {
        console.error('❌ Erro ao buscar leads:', error);
        return null;
      }
    },

    loadLeads: function () {
      var self = this;

      this.hideAllSections();
      this.showSkeleton();

      var config = window.leadRecoveryConfig || {};
      var listId = config.listId;

      if (!listId) {
        setTimeout(function() {
          self.showNoListConfigured();
        }, 500);
        return;
      }

      // Buscar dados via API
      this.fetchLeadsFromAPI(listId)
        .then(function(response) {
          console.log('✅ Response da API:', response);

          // Verificar se é array direto ou objeto com data
          var dataArray = null;

          if (Array.isArray(response)) {
            // Array direto: [{...}, {...}]
            console.log('📦 Response é array direto');
            dataArray = response;
          } else if (response && response.data && Array.isArray(response.data)) {
            // Objeto com data: { data: [...] }
            console.log('📦 Response tem propriedade data');
            dataArray = response.data;
          }

          console.log('📦 dataArray:', dataArray);

          if (dataArray && dataArray.length > 0) {
            var contacts = self.extractContacts(dataArray);
            console.log('📋 Contatos extraídos:', contacts);

            if (contacts.length > 0) {
              self.handleLeadsResponse(contacts);
            } else {
              self.showNoData();
            }
          } else {
            console.warn('⚠️ Nenhum dado encontrado');
            self.showNoData();
          }
        })
        .catch(function(error) {
          console.error('❌ Erro ao carregar leads:', error);
          self.showError();
        });
    },

    // Extrair contatos do payload retornado
    extractContacts: function(contactsArray) {
      var contacts = [];

      console.log('🔍 extractContacts - Total de items:', contactsArray.length);

      // O payload vem como array de objetos: [{dealId, contactVid, contactInfo, dealInfo, isMQL, ...}, ...]
      contactsArray.forEach(function(item, index) {
        console.log('🔍 Item ' + index + ':', item);
        console.log('🔍 dealId:', item.dealId);
        console.log('🔍 contactVid:', item.contactVid);
        console.log('🔍 contactInfo:', item.contactInfo);
        console.log('🔍 dealInfo:', item.dealInfo);
        console.log('🔍 isMQL:', item.isMQL || item.ismql);

        if (item.contactInfo && item.dealInfo) {
          var extractedContact = {
            // IDs
            dealId: item.dealId,
            vid: item.contactVid,
            // MQL
            isMQL: item.isMQL || item.ismql || false,
            // Dados do contato
            email: item.contactInfo.email || '',
            phone: item.contactInfo.phone || '',
            firstname: item.contactInfo.firstname || '',
            lastname: item.contactInfo.lastname || '',
            nomeCompleto: item.contactInfo.nomeCompleto || '',
            // Datas do DEAL (não do contato)
            createdate: item.dealInfo.dataCriacao || '',
            lastmodifieddate: item.dealInfo.lastmodifieddate || '',
            // Endereço
            address: item.contactInfo.address || '',
            city: item.contactInfo.city || '',
            state: item.contactInfo.state || '',
            zip: item.contactInfo.zip || '',
            complemento: item.contactInfo.complemento || '',
            // Imóvel
            tipo_de_imovel: item.contactInfo.tipo_de_imovel || '',
            valor_do_imovel: item.contactInfo.valor_do_imovel || '',
            // Objetivos
            objetivo_principal: item.contactInfo.objetivo_principal || '',
            objetivo_secundario: item.contactInfo.objetivo_secundario || '',
            solucao_procurada: item.contactInfo.solucao_procurada || ''
          };

          console.log('✅ Contato extraído:', extractedContact);
          contacts.push(extractedContact);
        } else {
          console.warn('⚠️ Item ' + index + ' não possui contactInfo ou dealInfo');
        }
      });

      console.log('📊 Total de contatos extraídos:', contacts.length);
      return contacts;
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

    showError: function () {
      this.hideAllSections();

      if (this.errorEl) {
        this.errorEl.style.display = 'block';
      }
    },

    handleLeadsResponse: function (contacts) {
      this.hideAllSections();

      if (contacts.length === 0) {
        this.showNoData();
      } else {
        this.renderLeads(contacts);
      }
    },

    renderLeads: function (contacts) {
      if (!this.contentEl) return;

      // Separar leads MQL e leads normais
      var leadsMQL = contacts.filter(function(contact) {
        return contact.isMQL === true;
      });

      var leadsNormais = contacts.filter(function(contact) {
        return contact.isMQL !== true;
      });

      console.log('📊 Leads MQL:', leadsMQL.length);
      console.log('📊 Leads Normais:', leadsNormais.length);

      var html = '<div class="space-y-6">';

      // Tabela 1: Leads MQL (Mais Quentes)
      if (leadsMQL.length > 0) {
        html += `
          <div>
            <h3 class="text-lg font-semibold text-orange-600 mb-3 flex items-center gap-2">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clip-rule="evenodd"></path>
              </svg>
              Mais Quentes
            </h3>
            ${this.generateTableHTML(leadsMQL)}
          </div>
        `;
      }

      // Tabela 2: Leads Normais (com título "Bônus Acelera")
      if (leadsNormais.length > 0) {
        html += `
          <div>
            <h3 class="text-lg font-semibold text-purple-600 mb-3 flex items-center gap-2">
              🎁 Bônus Acelera
            </h3>
            ${this.generateTableHTML(leadsNormais)}
          </div>
        `;
      }

      html += '</div>';

      this.contentEl.innerHTML = html;
      this.contentEl.style.display = 'block';
    },

    generateTableHTML: function (contacts) {
      var self = this;
      return `
        <div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200" style="min-width: 1200px;">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style="min-width: 180px; max-width:180px">
                    Nome
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style="min-width: 220px; max-width:220px">
                    Email
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style="min-width: 130px;">
                    Telefone
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style="min-width: 180px;">
                    Data de Criação
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style="min-width: 140px;">
                    Última Atualização
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style="min-width: 250px;">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                ${contacts.map(function(contact) { return self.generateLeadRow(contact); }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    },

    generateSkeletonHTML: function () {
      return `
          <div class="space-y-6">
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
                   ${Array(5).fill(0).map(function() { return `
                     <tr>
                       <td class="px-6 py-4"><div class="h-4 bg-gray-200 rounded animate-pulse w-32"></div></td>
                       <td class="px-6 py-4"><div class="h-4 bg-gray-200 rounded animate-pulse w-40"></div></td>
                       <td class="px-6 py-4"><div class="h-4 bg-gray-200 rounded animate-pulse w-28"></div></td>
                       <td class="px-6 py-4"><div class="h-4 bg-gray-200 rounded animate-pulse w-20"></div></td>
                       <td class="px-6 py-4"><div class="h-4 bg-gray-200 rounded animate-pulse w-20"></div></td>
                       <td class="px-6 py-4"><div class="h-4 bg-gray-200 rounded animate-pulse w-24"></div></td>
                     </tr>
                   `; }).join('')}
                 </tbody>
               </table>
             </div>
           </div>
         </div>
       `;
    },

    generateLeadRow: function (contact) {
      var nome = (contact.firstname + ' ' + contact.lastname).trim() || 'Sem nome';
      var email = contact.email || 'Sem email';
      var phone = contact.phone || 'Sem telefone';
      var dataCriacao = contact.createdate ? this.formatDate(contact.createdate) : '-';
      var dataAtualizacao = contact.lastmodifieddate ? this.formatDate(contact.lastmodifieddate) : '-';

      // Cidade e Estado
      var cidade = contact.city || '';
      var estado = contact.state || '';
      var localizacao = (cidade && estado) ? cidade + ', ' + estado : (cidade || estado || '');

      // Endereço completo para Google Maps
      var enderecoCompleto = '';
      if (contact.address) enderecoCompleto += contact.address + ', ';
      if (contact.city) enderecoCompleto += contact.city + ', ';
      if (contact.state) enderecoCompleto += contact.state + ', ';
      if (contact.zip) enderecoCompleto += contact.zip;
      enderecoCompleto = enderecoCompleto.trim().replace(/,\s*$/, ''); // Remove vírgula final
      var mapsUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(enderecoCompleto);

      // Verificar se é MQL (lead quente)
      var isMQL = contact.isMQL === true;

      // Serializar dados do contato para passar ao modal
      var contactDataJSON = JSON.stringify(contact).replace(/'/g, '&#39;').replace(/"/g, '&quot;');

      return `
        <tr class="hover:bg-gray-50" id="lead-row-${contact.vid}">
          <td class="px-6 py-4" style="min-width: 280px;">
            <div class="flex items-center gap-1.5">
              <span class="text-sm font-medium text-gray-900">${nome}</span>
              ${isMQL ? `
                <span title="Lead MQL: Marketing Qualified Lead - Alta prioridade" class="inline-flex">
                  <svg class="w-4 h-4 text-orange-500 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clip-rule="evenodd"></path>
                  </svg>
                </span>
              ` : ''}
            </div>
            ${localizacao ? `
              <div class="flex items-center gap-1 mt-1">
                <span class="text-xs text-gray-400">${localizacao}</span>
                ${enderecoCompleto ? `
                  <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" title="Ver no Google Maps" class="text-gray-400 hover:text-blue-600 transition-colors">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                  </a>
                ` : ''}
              </div>
            ` : ''}
          </td>
          <td class="px-6 py-4">
            <div class="text-sm text-gray-500 blur-md select-none transition-all" id="email-${contact.vid}" data-email="${email}" title="Clique em Acelerar para ver o email completo">
              ${email.replace(/(.{2})(.*)(@.*)/, '$1***$3')}
            </div>
          </td>
          <td class="px-6 py-4">
            <div class="text-sm text-gray-500 blur-md select-none transition-all" id="phone-${contact.vid}" data-phone="${phone}" title="Clique em Acelerar para ver o telefone completo">
              ${phone.length > 4 ? '(***) ****-' + phone.substring(phone.length - 4) : '****'}
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            ${dataCriacao}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            ${dataAtualizacao}
          </td>
          <td class="px-4 py-4 text-sm font-medium">
            <div class="flex gap-2">
              <!-- Botão Visualizar -->
              <button
                onclick='window.leadRecoveryModule.visualizarLead(${contactDataJSON})'
                class="cursor-pointer inline-flex items-center px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                title="Visualizar detalhes do lead"
              >
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                </svg>
                Visualizar
              </button>

              <!-- Botão Acelerar -->
              <button
                onclick="window.leadRecoveryModule.acelerarLead('${contact.dealId}', '${contact.vid}', '${nome.replace(/'/g, "\\'")}')"
                class="cursor-pointer inline-flex items-center px-3 py-1 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 hover:text-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                title="Acelerar lead e desbloquear dados"
                id="btn-accelerate-${contact.vid}"
              >
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
                Acelerar
              </button>

              <!-- Botão Descartar 
              <button
                onclick="window.leadRecoveryModule.descartarLead('${contact.dealId}', '${contact.vid}', '${nome.replace(/'/g, "\\'")}')"
                class="cursor-pointer inline-flex items-center px-3 py-1 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                title="Descartar este lead"
                id="btn-discard-${contact.vid}"
              >
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
                Descartar
              </button>-->
            </div>
          </td>
        </tr>
      `;
    },

    formatDate: function (dateString) {
      if (!dateString) return '';
      try {
        var timestamp = parseInt(dateString);
        if (!isNaN(timestamp)) {
          return new Date(timestamp).toLocaleDateString('pt-BR');
        }
        return new Date(dateString).toLocaleDateString('pt-BR');
      } catch (e) {
        return dateString;
      }
    },

    showNoData: function () {
      this.hideAllSections();
      if (!this.contentEl) return;

      var emptyStateHTML = `
          <div class="text-center py-16">
            <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-6">
              <svg class="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>

            <h3 class="text-lg font-medium text-gray-900 mb-2">Nenhum lead disponível</h3>
            <p class="text-gray-500 mb-8 max-w-sm mx-auto">
              Não há leads disponíveis na Campanha Acelera Master no momento.
            </p>
          </div>
        `;

      this.contentEl.innerHTML = emptyStateHTML;
      this.contentEl.style.display = 'block';
    },

    showAccessDenied: function () {
      this.hideAllSections();
      if (!this.contentEl) return;

      var accessDeniedHTML = `
          <div class="text-center py-16">
            <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-6">
              <svg class="h-8 w-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>

            <h3 class="text-lg font-medium text-gray-900 mb-2">Acesso não liberado</h3>
            <p class="text-gray-500 mb-8 max-w-sm mx-auto">
              O módulo Campanha Acelera Master não está liberado para o seu usuário. Entre em contato com o suporte.
            </p>
          </div>
        `;

      this.contentEl.innerHTML = accessDeniedHTML;
      this.contentEl.style.display = 'block';
    },

    showNoListConfigured: function () {
      this.hideAllSections();
      if (!this.contentEl) return;

      var noListHTML = `
          <div class="text-center py-16">
            <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-6">
              <svg class="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <h3 class="text-lg font-medium text-gray-900 mb-2">Lista não configurada</h3>
            <p class="text-gray-500 mb-8 max-w-sm mx-auto">
              Não há lista configurada para a Campanha Acelera Master. Entre em contato com o suporte.
            </p>
          </div>
        `;

      this.contentEl.innerHTML = noListHTML;
      this.contentEl.style.display = 'block';
    },

    /**
     * Visualizar detalhes do lead
     */
    visualizarLead: function (contact) {
      var nome = (contact.firstname + ' ' + contact.lastname).trim() || 'Sem nome';

      // Criar modal
      var modalHTML = `
        <div id="modal-visualizar-lead" class="fixed inset-0 z-50 overflow-y-auto" style="background-color: rgba(0, 0, 0, 0.5);">
          <div class="flex items-center justify-center min-h-screen px-4">
            <div class="bg-white rounded-lg shadow-xl max-w-2xl w-2xl p-6">
              <!-- Header -->
              <div class="flex justify-between items-start mb-6">
                <div>
                  <h3 class="text-xl font-bold text-gray-900">Detalhes do Lead</h3>
                  <p class="text-sm text-gray-500 mt-1">${nome}</p>
                </div>
                <button onclick="window.leadRecoveryModule.fecharModalVisualizar()" class="text-gray-400 hover:text-gray-600">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              <!-- Conteúdo -->
              <div class="space-y-4 max-h-96 overflow-y-auto">
                <!-- Informações de Contato -->
                <div class="bg-gray-50 rounded-lg p-4">
                  <h4 class="font-semibold text-gray-900 mb-3">Informações de Contato</h4>
                  <div class="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span class="text-gray-500">Email:</span>
                      <p class="font-medium text-gray-900">${contact.email }</p>
                    </div>
                    <div>
                      <span class="text-gray-500">Telefone:</span>
                      <p class="font-medium text-gray-900">${contact.phone }</p>
                    </div>
                  </div>
                </div>

                <!-- Endereço -->
                <div class="bg-gray-50 rounded-lg p-4">
                  <h4 class="font-semibold text-gray-900 mb-3">Endereço</h4>
                  <div class="grid grid-cols-2 gap-3 text-sm">
                    <div class="col-span-2">
                      <span class="text-gray-500">Logradouro:</span>
                      <p class="font-medium text-gray-900">${contact.address || '-'}</p>
                    </div>
                    <div>
                      <span class="text-gray-500">Cidade:</span>
                      <p class="font-medium text-gray-900">${contact.city || '-'}</p>
                    </div>
                    <div>
                      <span class="text-gray-500">Estado:</span>
                      <p class="font-medium text-gray-900">${contact.state || '-'}</p>
                    </div>
                    <div>
                      <span class="text-gray-500">CEP:</span>
                      <p class="font-medium text-gray-900">${contact.zip || '-'}</p>
                    </div>
                    <div>
                      <span class="text-gray-500">Complemento:</span>
                      <p class="font-medium text-gray-900">${contact.complemento || '-'}</p>
                    </div>
                  </div>
                </div>

                <!-- Informações do Imóvel -->
                <div class="bg-gray-50 rounded-lg p-4">
                  <h4 class="font-semibold text-gray-900 mb-3">Informações do Imóvel</h4>
                  <div class="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span class="text-gray-500">Tipo de Imóvel:</span>
                      <p class="font-medium text-gray-900">${contact.tipo_de_imovel || '-'}</p>
                    </div>
                    <div>
                      <span class="text-gray-500">Valor do Imóvel:</span>
                      <p class="font-medium text-gray-900">${contact.valor_do_imovel || '-'}</p>
                    </div>
                  </div>
                </div>

                <!-- Objetivos e Soluções -->
                <div class="bg-gray-50 rounded-lg p-4">
                  <h4 class="font-semibold text-gray-900 mb-3">Objetivos e Necessidades</h4>
                  <div class="space-y-3 text-sm">
                    <div>
                      <span class="text-gray-500">Objetivo Principal:</span>
                      <p class="font-medium text-gray-900">${contact.objetivo_principal || '-'}</p>
                    </div>
                    <div>
                      <span class="text-gray-500">Objetivo Secundário:</span>
                      <p class="font-medium text-gray-900">${contact.objetivo_secundario || '-'}</p>
                    </div>
                    <div>
                      <span class="text-gray-500">Solução Procurada:</span>
                      <p class="font-medium text-gray-900">${contact.solucao_procurada || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Footer -->
              <div class="mt-6 flex justify-end">
                <button
                  onclick="window.leadRecoveryModule.fecharModalVisualizar()"
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      // Adicionar modal ao body
      document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    fecharModalVisualizar: function () {
      var modal = document.getElementById('modal-visualizar-lead');
      if (modal) {
        modal.remove();
      }
    },

    /**
     * Gerar link do WhatsApp
     */
    gerarLinkWhatsApp: function (phone) {
      // Limpar telefone (remover caracteres não numéricos)
      var phoneClean = phone.replace(/\D/g, '');

      // Garantir que tenha o código do país (55 para Brasil)
      if (!phoneClean.startsWith('55')) {
        phoneClean = '55' + phoneClean;
      }

      // Mensagem padrão
      var mensagem = encodeURIComponent('Olá! Vi seu interesse pelo HomeCash e gostaria de conversar sobre sua proposta.');

      return 'https://wa.me/' + phoneClean + '?text=' + mensagem;
    },

    /**
     * Descartar lead - Abre modal para selecionar motivo
     */
    descartarLead: function (dealId, contactId, leadNome) {
      var self = this;

      // Abrir modal de motivo de descarte
      this.abrirModalDescarte(dealId, contactId, leadNome);
    },

    /**
     * Abrir modal de motivo de descarte
     */
    abrirModalDescarte: function (dealId, contactId, leadNome) {
      var self = this;

      var modalHTML = `
        <div id="modal-descarte-lead" class="fixed inset-0 z-50 overflow-y-auto" style="background-color: rgba(0, 0, 0, 0.5);">
          <div class="flex items-center justify-center min-h-screen px-4">
            <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <!-- Header -->
              <div class="flex justify-between items-start mb-6">
                <div>
                  <h3 class="text-xl font-bold text-gray-900">Descartar Lead</h3>
                  <p class="text-sm text-gray-500 mt-1">${leadNome}</p>
                </div>
                <button onclick="window.leadRecoveryModule.fecharModalDescarte()" class="text-gray-400 hover:text-gray-600">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              <!-- Conteúdo -->
              <div class="space-y-4">
                <div>
                  <label for="motivo-descarte" class="block text-sm font-medium text-gray-700 mb-2">
                    Motivo do Descarte <span class="text-red-500">*</span>
                  </label>
                  <select
                    id="motivo-descarte"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Selecione o motivo...</option>
                    <option value="sem_interesse">Sem interesse</option>
                    <option value="nao_qualificado">Não qualificado</option>
                    <option value="fora_politica">Fora da política</option>
                    <option value="duplicado">Lead duplicado</option>
                    <option value="sem_contato">Sem resposta/contato</option>
                    <option value="desistiu">Cliente desistiu</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label for="observacao-descarte" class="block text-sm font-medium text-gray-700 mb-2">
                    Observações (opcional)
                  </label>
                  <textarea
                    id="observacao-descarte"
                    rows="3"
                    placeholder="Adicione detalhes sobre o descarte..."
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  ></textarea>
                </div>

                <!-- Mensagens -->
                <div id="modal-descarte-message" class="hidden"></div>
              </div>

              <!-- Footer -->
              <div class="mt-6 flex justify-end gap-3">
                <button
                  onclick="window.leadRecoveryModule.fecharModalDescarte()"
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancelar
                </button>
                <button
                  onclick="window.leadRecoveryModule.confirmarDescarte('${dealId}', '${contactId}', '${leadNome.replace(/'/g, "\\'")}')"
                  id="btn-confirmar-descarte"
                  class="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Confirmar Descarte
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      // Adicionar modal ao body
      document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    fecharModalDescarte: function () {
      var modal = document.getElementById('modal-descarte-lead');
      if (modal) {
        modal.remove();
      }
    },

    /**
     * Confirmar descarte com motivo
     */
    confirmarDescarte: function (dealId, contactId, leadNome) {
      var self = this;

      // Obter valores do formulário
      var motivoSelect = document.getElementById('motivo-descarte');
      var observacaoTextarea = document.getElementById('observacao-descarte');

      var motivo = motivoSelect ? motivoSelect.value : '';
      var observacao = observacaoTextarea ? observacaoTextarea.value.trim() : '';

      // Validar motivo
      if (!motivo) {
        this.showModalDescarteError('Por favor, selecione o motivo do descarte.');
        return;
      }

      // Desabilitar botão e mostrar loading
      var btnConfirmar = document.getElementById('btn-confirmar-descarte');
      if (btnConfirmar) {
        btnConfirmar.disabled = true;
        btnConfirmar.innerHTML = `
          <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processando...
        `;
      }

      // Enviar requisição para endpoint de descarte
      var url = this.n8nConfig.baseUrl + this.n8nConfig.endpoints.discardLead;

      // Obter contact ID do usuário logado
      var loggedInContactId = window.hubspotContactId || null;

      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dealId: dealId,
          contactId: contactId,
          loggedInContactId: loggedInContactId,
          motivo: motivo,
          observacao: observacao
        })
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
        })
        .then(function (data) {
          self.showModalDescarteSuccess('Lead descartado com sucesso!');

          // Fechar modal e recarregar após 1.5 segundos
          setTimeout(function () {
            self.fecharModalDescarte();
            window.location.reload();
          }, 1500);
        })
        .catch(function (error) {
          console.error('❌ Erro ao descartar lead:', error);
          self.showModalDescarteError('Erro ao descartar lead. Tente novamente.');

          // Restaurar botão
          if (btnConfirmar) {
            btnConfirmar.disabled = false;
            btnConfirmar.innerHTML = 'Confirmar Descarte';
          }
        });
    },

    showModalDescarteError: function (message) {
      var messageDiv = document.getElementById('modal-descarte-message');
      if (messageDiv) {
        messageDiv.className = 'p-3 bg-red-50 border border-red-200 rounded-lg';
        messageDiv.innerHTML = `
          <p class="text-sm text-red-800">${message}</p>
        `;
        messageDiv.classList.remove('hidden');
      }
    },

    showModalDescarteSuccess: function (message) {
      var messageDiv = document.getElementById('modal-descarte-message');
      if (messageDiv) {
        messageDiv.className = 'p-3 bg-green-50 border border-green-200 rounded-lg';
        messageDiv.innerHTML = `
          <p class="text-sm text-green-800">${message}</p>
        `;
        messageDiv.classList.remove('hidden');
      }
    },

    /**
     * Acelerar lead - Abre modal de confirmação
     */
    acelerarLead: function (dealId, contactId, leadNome) {
      var self = this;
      this.abrirModalAcelerar(dealId, contactId, leadNome);
    },

    /**
     * Abrir modal de confirmação para acelerar lead
     */
    abrirModalAcelerar: function (dealId, contactId, leadNome) {
      var self = this;

      var modalHTML = `
        <div id="modal-acelerar-lead" class="fixed inset-0 z-50 overflow-y-auto" style="background-color: rgba(0, 0, 0, 0.5);">
          <div class="flex items-center justify-center min-h-screen px-4">
            <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <!-- Header -->
              <div class="flex justify-between items-start mb-4">
                <div class="flex items-center gap-3">
                  <div class="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                    <svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 class="text-lg font-bold text-gray-900">Acelerar Lead</h3>
                    <p class="text-sm text-gray-500">${leadNome}</p>
                  </div>
                </div>
                <button onclick="window.leadRecoveryModule.fecharModalAcelerar()" class="text-gray-400 hover:text-gray-600">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>


              <!-- Mensagens -->
              <div id="modal-acelerar-message" class="hidden mb-4"></div>

              <!-- Footer -->
              <div class="flex justify-end gap-3">
                <button
                  onclick="window.leadRecoveryModule.fecharModalAcelerar()"
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onclick="window.leadRecoveryModule.confirmarAcelerarLead('${dealId}', '${contactId}', '${leadNome.replace(/'/g, "\\'")}')"
                  id="btn-confirmar-acelerar"
                  class="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                >
                  <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                  Acelerar Lead
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      // Adicionar modal ao body
      document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    fecharModalAcelerar: function () {
      var modal = document.getElementById('modal-acelerar-lead');
      if (modal) {
        modal.remove();
      }
    },

    /**
     * Confirmar e processar aceleração do lead
     */
    confirmarAcelerarLead: function (dealId, contactId, leadNome) {
      var self = this;

      // Desabilitar botão e mostrar loading no modal
      var btnConfirmar = document.getElementById('btn-confirmar-acelerar');
      if (btnConfirmar) {
        btnConfirmar.disabled = true;
        btnConfirmar.innerHTML = `
          <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Acelerando...
        `;
      }

      // Desabilitar botão da tabela também
      var btn = document.getElementById('btn-accelerate-' + contactId);
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `
          <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-green-600 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Acelerando...
        `;
      }

      // Enviar requisição
      var url = this.n8nConfig.baseUrl + this.n8nConfig.endpoints.recoverLead;

      // Obter contact ID do usuário logado
      var loggedInContactId = window.hubspotContactId || null;

      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dealId: dealId,
          contactId: contactId,
          loggedInContactId: loggedInContactId
        })
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
        })
        .then(function (data) {
          // Remover blur e mostrar informações completas
          self.removerBlur(contactId);

          // Atualizar botão para "Acelerado"
          if (btn) {
            btn.disabled = true;
            btn.className = 'cursor-not-allowed inline-flex items-center px-3 py-1 text-sm font-medium text-gray-400 bg-gray-100 border border-gray-300 rounded-lg';
            btn.innerHTML = `
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Acelerado
            `;
          }

          // Mostrar sucesso no modal
          self.showModalAcelerarSuccess('Lead acelerado com sucesso! Dados desbloqueados.');

          // Fechar modal após 1.5 segundos
          setTimeout(function () {
            window.location.reload();
          }, 1500);
        })
        .catch(function (error) {
          console.error('❌ Erro ao acelerar lead:', error);
          self.showModalAcelerarError('Erro ao acelerar lead. Tente novamente.');

          // Restaurar botão da tabela
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = `
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
              Acelerar
            `;
          }

          // Restaurar botão do modal
          if (btnConfirmar) {
            btnConfirmar.disabled = false;
            btnConfirmar.innerHTML = `
              <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
              Acelerar Lead
            `;
          }
        });
    },

    showModalAcelerarError: function (message) {
      var messageDiv = document.getElementById('modal-acelerar-message');
      if (messageDiv) {
        messageDiv.className = 'p-3 bg-red-50 border border-red-200 rounded-lg mb-4';
        messageDiv.innerHTML = `
          <div class="flex gap-2">
            <svg class="w-5 h-5 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
            </svg>
            <p class="text-sm text-red-800">${message}</p>
          </div>
        `;
        messageDiv.classList.remove('hidden');
      }
    },

    showModalAcelerarSuccess: function (message) {
      var messageDiv = document.getElementById('modal-acelerar-message');
      if (messageDiv) {
        messageDiv.className = 'p-3 bg-green-50 border border-green-200 rounded-lg mb-4';
        messageDiv.innerHTML = `
          <div class="flex gap-2">
            <svg class="w-5 h-5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
            </svg>
            <p class="text-sm text-green-800">${message}</p>
          </div>
        `;
        messageDiv.classList.remove('hidden');
      }
    },

    /**
     * Remover blur e mostrar informações completas
     */
    removerBlur: function (contactId) {
      // Remover blur do email
      var emailEl = document.getElementById('email-' + contactId);
      if (emailEl) {
        var emailCompleto = emailEl.getAttribute('data-email');
        emailEl.classList.remove('blur-md');
        emailEl.textContent = emailCompleto;
        emailEl.title = 'Email revelado';
      }

      // Remover blur do telefone
      var phoneEl = document.getElementById('phone-' + contactId);
      if (phoneEl) {
        var phoneCompleto = phoneEl.getAttribute('data-phone');
        phoneEl.classList.remove('blur-md');
        phoneEl.textContent = phoneCompleto;
        phoneEl.title = 'Telefone revelado';
      }
    }
  };

  // Expor o módulo globalmente
  window.leadRecoveryModule = module;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      module.init();
    });
  } else {
    module.init();
  }

})();
