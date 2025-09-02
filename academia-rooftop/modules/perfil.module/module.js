// Perfil Module - Portal do Franqueado Rooftop
(function() {
    'use strict';
  
    var module = {
      init: function() {
        this.container = document.querySelector('[data-module="perfilModule"]');
        if (!this.container) return;
        
        this.loadingEl = this.container.querySelector('.perfil-loading');
        this.contentEl = this.container.querySelector('.perfil-content');
        this.errorEl = this.container.querySelector('.perfil-error');
        this.notFoundEl = this.container.querySelector('.perfil-not-found');
        
        this.loadPerfil();
      },
  
      loadPerfil: function() {
        var self = this;
        
        this.hideAllSections();
        if (this.loadingEl) this.loadingEl.style.display = 'block';

        setTimeout(function() {
          if (window.hubspotContatoData && window.hubspotContatoData.success) {
            console.log('✅ Dados do contato encontrados:', window.hubspotContatoData.data);
            self.handlePerfilResponse(window.hubspotContatoData.data);
          } else {
            console.log('❌ Nenhum dado de contato encontrado');
            self.showNotFound();
          }
        }, 500);
      },
  
      hideAllSections: function() {
        if (this.loadingEl) this.loadingEl.style.display = 'none';
        if (this.contentEl) this.contentEl.style.display = 'none';
        if (this.errorEl) this.errorEl.style.display = 'none';
        if (this.notFoundEl) this.notFoundEl.style.display = 'none';
      },
  
      handlePerfilResponse: function(contato) {
        this.hideAllSections();
        this.renderPerfil(contato);
      },
  
      renderPerfil: function(contato) {
        var self = this;
        if (!this.contentEl) return;
        
        // Store contact reference for later use
        this.currentContato = contato;
        
        // Get the profile photo URL first, then render the profile
        this.getFotoPerfilUrl(contato.foto_de_perfil)
          .then(function(fotoPerfilUrl) {
            var html = self.generatePerfilHTML(contato, fotoPerfilUrl);
            self.contentEl.innerHTML = html;
            self.contentEl.style.display = 'block';
            
            self.addEventListeners();
            console.log('✅ Perfil renderizado para:', contato.firstname, contato.lastname);
          })
          .catch(function(error) {
            console.error('❌ Erro ao renderizar perfil:', error);
            // Render without photo in case of error
            var html = self.generatePerfilHTML(contato, null);
            self.contentEl.innerHTML = html;
            self.contentEl.style.display = 'block';
            self.addEventListeners();
          });
      },

      generatePerfilHTML: function(contato, fotoPerfilUrl) {
        // Use the fotoPerfilUrl parameter that was fetched asynchronously
        fotoPerfilUrl = fotoPerfilUrl || '';
        // var nomeCompleto = (contato.firstname || '') + ' ' + (contato.lastname || '');
        console.log('fotoPerfilUrl', fotoPerfilUrl);
        return `
          <div class="p-4 sm:p-6 lg:p-8">
            <!-- Header -->
            <div class="flex items-center justify-between mb-8">
              <div class="flex items-center space-x-4">
                <button onclick="window.history.back()" class="btn btn-ghost btn-icon">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                  </svg>
                </button>
                <h1 class="text-3xl font-bold text-slate-900">Perfil do Franqueado</h1>
              </div>
            </div>

            <!-- Profile Card -->
            <div class="card p-8 mb-8">
              <div class="flex flex-col lg:flex-row lg:items-start lg:space-x-8">
                
                <!-- Profile Photo -->
                <div class="flex-shrink-0 mb-6 lg:mb-0">
                  <div class="relative">
                    <div class="w-32 h-32 rounded-full overflow-hidden bg-slate-100 border-4 border-white shadow-lg">
                      ${fotoPerfilUrl ? 
                        `<img src="${fotoPerfilUrl}" alt="Foto de perfil" class="w-full h-full object-cover" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                         <div class="w-full h-full flex items-center justify-center bg-slate-200" style="display: none;">
                           <svg class="w-16 h-16 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                             <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z"/>
                           </svg>
                         </div>` :
                        `<div class="w-full h-full flex items-center justify-center bg-slate-200">
                           <svg class="w-16 h-16 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                             <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z"/>
                           </svg>
                         </div>`
                      }
                    </div>
                    <button id="edit-profile-photo-btn" class="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg transition-colors">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                      </svg>
                    </button>
                    <!-- Hidden file input for photo upload -->
                    <input type="file" id="profile-photo-input" accept="image/*" style="display: none;" />
                  </div>
                </div>

                <!-- Profile Form -->
                <div class="flex-grow">
                  <form id="perfil-form" class="space-y-6">
                    
                    <!-- Nome e Sobrenome -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label for="firstname" class="block text-sm font-medium text-slate-700 mb-2">
                          Nome
                        </label>
                        <input 
                          type="text" 
                          id="firstname" 
                          name="firstname" 
                          value="${contato.firstname || ''}" 
                          class="form-input"
                          placeholder="Digite seu nome"
                        >
                      </div>
                      <div>
                        <label for="lastname" class="block text-sm font-medium text-slate-700 mb-2">
                          Sobrenome
                        </label>
                        <input 
                          type="text" 
                          id="lastname" 
                          name="lastname" 
                          value="${contato.lastname || ''}" 
                          class="form-input"
                          placeholder="Digite seu sobrenome"
                        >
                      </div>
                    </div>

                    <!-- Email -->
                    <div>
                      <label for="email" class="block text-sm font-medium text-slate-700 mb-2">
                        Email
                      </label>
                      <input 
                        type="email" 
                        id="email" 
                        name="email" 
                        value="${contato.email || ''}" 
                        class="form-input"
                        placeholder="Digite seu email"
                      >
                    </div>

                    <!-- Telefone -->
                    <div>
                      <label for="phone" class="block text-sm font-medium text-slate-700 mb-2">
                        Telefone
                      </label>
                      <input 
                        type="tel" 
                        id="phone" 
                        name="phone" 
                        value="${contato.phone || ''}" 
                        class="form-input"
                        placeholder="Digite seu telefone"
                      >
                    </div>

                    <!-- CNPJ -->
                    <div>
                      <label for="cnpj_do_franqueado" class="block text-sm font-medium text-slate-700 mb-2">
                        CNPJ do Franqueado
                      </label>
                      <input 
                        type="text" 
                        id="cnpj_do_franqueado" 
                        name="cnpj_do_franqueado" 
                        value="${contato.cnpj_do_franqueado || ''}" 
                        class="form-input"
                        placeholder="Digite o CNPJ"
                      >
                    </div>

                    <!-- Botões de Ação -->
                    <div class="flex flex-col sm:flex-row sm:justify-end sm:space-x-3 space-y-3 sm:space-y-0 pt-6 border-t border-slate-200">
                      <button 
                        type="button" 
                        onclick="window.history.back()" 
                        class="btn btn-secondary"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit" 
                        class="btn btn-primary"
                      >
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        Salvar Alterações
                      </button>
                    </div>

                  </form>
                </div>

              </div>
            </div>

            <!-- Informações Adicionais -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <!-- Dados da Conta -->
              <div class="card p-6">
                <h3 class="text-lg font-semibold text-slate-900 mb-4">Informações da Conta</h3>
                <div class="space-y-3">
                  <div class="flex justify-between items-center py-2 border-b border-slate-100">
                    <span class="text-sm text-slate-600">ID do Contato</span>
                    <span class="text-sm font-medium text-slate-900">${contato.hs_object_id || 'N/A'}</span>
                  </div>
                  <div class="flex justify-between items-center py-2 border-b border-slate-100">
                    <span class="text-sm text-slate-600">Data de Criação</span>
                    
                    <span class="text-sm font-medium text-slate-900">${contato.createdate}</span>
                  </div>
                  <div class="flex justify-between items-center py-2">
                    <span class="text-sm text-slate-600">Última Modificação</span>
                    <span class="text-sm font-medium text-slate-900">${contato.lastmodifieddate}</span>
                  </div>
                </div>
              </div>

              <!-- Ações Rápidas -->
              <div class="card p-6">
                <h3 class="text-lg font-semibold text-slate-900 mb-4">Ações Rápidas</h3>
                <div class="space-y-3">
                  <button onclick="window.location.href='/negocios'" class="w-full btn btn-secondary justify-start">
                    <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    Ver Negócios
                  </button>
                  <button onclick="window.location.href='/dashboard'" class="w-full btn btn-secondary justify-start">
                    <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                    </svg>
                    Ir para Dashboard
                  </button>
                  <button onclick="window.location.href='/cadastrar-imovel'" class="w-full btn btn-secondary justify-start">
                    <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                    </svg>
                    Cadastrar Imóvel
                  </button>
                </div>
              </div>

            </div>
          </div>
        `;
      },

      getFotoPerfilUrl: function(fotoPerfilId) {
        console.log('fotoPerfilId', fotoPerfilId);
        if (!fotoPerfilId || fotoPerfilId === '' || fotoPerfilId === 'null') {
          return Promise.resolve(null);
        }

        // Make GET request to the get-file endpoint and wait for response
        return fetch(`https://n8n2.rooftop.com.br/webhook/portal/get-file?id=${fotoPerfilId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        })
        .then(function(response) {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.json();
        })
        .then(function(data) {
          console.log('📁 Resposta do get-file:', data);
          // Return the URL from the response
          return data.url || null;
        })
        .catch(function(error) {
          console.error('❌ Erro ao buscar foto de perfil:', error);
          return null;
        });
      },

      formatDate: function(dateString) {
        if (!dateString) return 'N/A';
        
        var date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      },

      addEventListeners: function() {
        var self = this;
        var form = document.getElementById('perfil-form');
        
        if (form) {
          form.addEventListener('submit', function(e) {
            e.preventDefault();
            self.handleFormSubmit(e);
          });
        }

        // Add CNPJ mask
        var cnpjInput = document.getElementById('cnpj_do_franqueado');
        if (cnpjInput) {
          cnpjInput.addEventListener('input', function(e) {
            self.maskCNPJ(e.target);
          });
        }

        // Add phone mask
        var phoneInput = document.getElementById('phone');
        if (phoneInput) {
          phoneInput.addEventListener('input', function(e) {
            self.maskPhone(e.target);
          });
        }

        // Add profile photo upload event listeners
        var editPhotoBtn = document.getElementById('edit-profile-photo-btn');
        var photoInput = document.getElementById('profile-photo-input');
        
        if (editPhotoBtn && photoInput) {
          editPhotoBtn.addEventListener('click', function(e) {
            e.preventDefault();
            photoInput.click();
          });
          
          photoInput.addEventListener('change', function(e) {
            if (e.target.files && e.target.files.length > 0) {
              var file = e.target.files[0];
              self.uploadProfilePhoto(file);
            }
          });
        }
      },

      handleFormSubmit: function(e) {
        var self = this;
        var formData = new FormData(e.target);
        var data = {};
        
        for (var [key, value] of formData.entries()) {
          data[key] = value;
        }
        
        console.log('📝 Dados do perfil para salvar:', data);
        
        // Show loading state
        var submitBtn = e.target.querySelector('button[type="submit"]');
        var originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = `
          <svg class="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Salvando...
        `;
        submitBtn.disabled = true;
        
        // Get the current contact email
        var email = this.currentContato.email;
        
        // Prepare updates array - only include fields that have changed
        var updates = [];
        
        // Check each field against original data and add to updates if changed
        if (data.firstname !== this.currentContato.firstname) {
          updates.push({ field: 'firstname', value: data.firstname });
        }
        
        if (data.lastname !== this.currentContato.lastname) {
          updates.push({ field: 'lastname', value: data.lastname });
        }
        
        if (data.email !== this.currentContato.email) {
          updates.push({ field: 'email', value: data.email });
          // Update email for subsequent requests
          email = data.email;
        }
        
        if (data.phone !== this.currentContato.phone) {
          updates.push({ field: 'phone', value: data.phone });
        }
        
        if (data.cnpj_do_franqueado !== this.currentContato.cnpj_do_franqueado) {
          updates.push({ field: 'cnpj_do_franqueado', value: data.cnpj_do_franqueado });
        }
        
        console.log('📤 Campos a serem atualizados:', updates);
        
        if (updates.length === 0) {
          // No changes detected
          submitBtn.innerHTML = originalText;
          submitBtn.disabled = false;
          self.showSuccessMessage('Nenhuma alteração detectada!');
          return;
        }
        
        // Send updates sequentially
        this.updateContactFields(email, updates, 0)
          .then(function() {
            // Update current contact data with new values
            Object.keys(data).forEach(function(key) {
              self.currentContato[key] = data[key];
            });
            
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            self.showSuccessMessage('Perfil atualizado com sucesso!');
          })
          .catch(function(error) {
            console.error('❌ Erro ao atualizar perfil:', error);
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            self.showErrorMessage('Erro ao atualizar perfil. Tente novamente.');
          });
      },

      updateContactFields: function(email, updates, index) {
        var self = this;
        
        if (index >= updates.length) {
          return Promise.resolve();
        }
        
        var update = updates[index];
        var payload = {
          email: email
        };
        
        // Add the field and value to the payload
        payload[update.field] = update.value;
        
        console.log(`📤 Enviando atualização ${index + 1}/${updates.length}:`, payload);
        
        return fetch('https://n8n2.rooftop.com.br/webhook/portal/update-contact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        })
        .then(function(response) {
          if (!response.ok) {
            throw new Error(`Erro na atualização do campo ${update.field}: ${response.status}`);
          }
          return response.json();
        })
        .then(function(data) {
          console.log(`✅ Campo ${update.field} atualizado com sucesso:`, data);
          
          // Continue with next update
          return self.updateContactFields(email, updates, index + 1);
        })
        .catch(function(error) {
          console.error(`❌ Erro ao atualizar campo ${update.field}:`, error);
          throw error;
        });
      },

      maskCNPJ: function(input) {
        var value = input.value.replace(/\D/g, '');
        value = value.replace(/^(\d{2})(\d)/, '$1.$2');
        value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
        value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
        value = value.replace(/(\d{4})(\d)/, '$1-$2');
        input.value = value;
      },

      maskPhone: function(input) {
        var value = input.value.replace(/\D/g, '');
        if (value.length <= 10) {
          value = value.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        } else {
          value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        }
        input.value = value;
      },

      uploadProfilePhoto: function(file) {
        var self = this;
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          this.showErrorMessage('Por favor, selecione apenas arquivos de imagem.');
          return;
        }
        
        // Validate file size (5MB limit)
        var maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
          this.showErrorMessage('A imagem deve ter no máximo 5MB.');
          return;
        }
        
        console.log('📸 Iniciando upload da foto de perfil:', file.name);
        
        // Show upload progress
        this.showUploadProgress();
        
        var contactId = this.currentContato.hs_object_id;
        var existingFileId = this.currentContato.foto_de_perfil || '';
        
        var formData = new FormData();
        formData.append('file', file);
        formData.append('fileName', file.name);
        formData.append('contact_id', contactId); // Using contact ID as ticket ID
        formData.append('field_name', 'foto_de_perfil');
        
        // Add existing file ID if exists
        if (existingFileId && existingFileId !== '' && existingFileId !== 'null') {
          formData.append('existing_file_ids', existingFileId);
        }
        
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
          console.log('📸 Foto de perfil enviada com sucesso:', data);
          
          // Extract the new file ID from response
          var newFileId = null;
          if (data && data.properties && data.properties.foto_de_perfil) {
            var allIds = data.properties.foto_de_perfil.split(/[;,]/).map(function(id) { 
              return id.trim(); 
            }).filter(function(id) { 
              return id !== ''; 
            });
            
            if (allIds.length > 0) {
              newFileId = allIds[allIds.length - 1]; // Get the last ID (newest)
            }
          }
          
          if (newFileId) {
            // Update the current contact data
            self.currentContato.foto_de_perfil = newFileId;
            
            // Reload the profile to show the new photo
            self.renderPerfil(self.currentContato);
            
            self.showSuccessMessage('Foto de perfil atualizada com sucesso!');
          } else {
            console.warn('Não foi possível extrair o ID da nova foto');
            self.showSuccessMessage('Foto enviada, mas pode demorar alguns instantes para aparecer.');
          }
        })
        .catch(function(error) {
          console.error('❌ Erro ao enviar foto de perfil:', error);
          self.showErrorMessage('Erro ao enviar foto. Tente novamente.');
        })
        .finally(function() {
          self.hideUploadProgress();
        });
      },

      showUploadProgress: function() {
        var editBtn = document.getElementById('edit-profile-photo-btn');
        if (editBtn) {
          editBtn.innerHTML = `
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          `;
          editBtn.disabled = true;
          editBtn.classList.add('opacity-50');
        }
      },

      hideUploadProgress: function() {
        var editBtn = document.getElementById('edit-profile-photo-btn');
        if (editBtn) {
          editBtn.innerHTML = `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
            </svg>
          `;
          editBtn.disabled = false;
          editBtn.classList.remove('opacity-50');
        }
      },

      showSuccessMessage: function(message) {
        var notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2';
        notification.innerHTML = `
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(function() {
          notification.remove();
        }, 3000);
      },

      showErrorMessage: function(message) {
        var notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2';
        notification.innerHTML = `
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
          <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(function() {
          notification.remove();
        }, 5000);
      },
      
      showNotFound: function() {
        this.hideAllSections();
        if (this.notFoundEl) {
          this.notFoundEl.style.display = 'block';
        }
      },

      showError: function() {
        this.hideAllSections();
        if (this.errorEl) {
          this.errorEl.style.display = 'block';
        }
      }
    };

    window.perfilModule = module;
  
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        module.init();
      });
    } else {
      module.init();
    }
  
  })();