// Cadastrar Imóvel Module - Portal Rooftop
(function() {
    'use strict';
  
    var module = {
      init: function() {
        this.container = document.querySelector('[data-module="cadastrarImovelModule"]');
        if (!this.container) return;
        
        this.formContainer = document.getElementById('cadastrar-imovel-form');
        this.submitBtn = document.getElementById('submit-btn');
        
        this.addEventListeners();
        this.initializeForm();
      },

      initializeForm: function() {
        // Apply input masks
        this.applyMasks();
        
        // Set up conditional fields
        this.setupConditionalFields();
        
        // Set up CEP auto-complete
        this.setupCEPLookup();
      },

      addEventListeners: function() {
        var self = this;
        
        if (this.submitBtn) {
          this.submitBtn.addEventListener('click', function(e) {
            e.preventDefault();
            self.handleFormSubmit(e);
          });
        }
      },

      applyMasks: function() {
        var self = this;
        
        // Phone mask
        var phoneInput = document.getElementById('telefone_cliente');
        if (phoneInput) {
          phoneInput.addEventListener('input', function(e) {
            self.maskPhone(e.target);
          });
        }

        // CPF mask
        var cpfInput = document.getElementById('cpf_cliente');
        if (cpfInput) {
          cpfInput.addEventListener('input', function(e) {
            self.maskCPF(e.target);
          });
        }

        // CEP mask
        var cepInput = document.getElementById('cep');
        if (cepInput) {
          cepInput.addEventListener('input', function(e) {
            self.maskCEP(e.target);
          });
        }

        // Currency masks (removed valor_imovel since it's now a select)

        var valorDividasInput = document.getElementById('valor_dividas');
        if (valorDividasInput) {
          valorDividasInput.addEventListener('input', function(e) {
            self.maskCurrency(e.target);
          });
        }
      },

      setupConditionalFields: function() {
        var dividasRadios = document.querySelectorAll('input[name="possui_dividas"]');
        var valorDividasGroup = document.getElementById('valor_dividas_group');
        
        dividasRadios.forEach(function(radio) {
          radio.addEventListener('change', function() {
            if (this.value === 'Sim') {
              valorDividasGroup.style.display = 'block';
              document.getElementById('valor_dividas').setAttribute('required', 'required');
            } else {
              valorDividasGroup.style.display = 'none';
              document.getElementById('valor_dividas').removeAttribute('required');
              document.getElementById('valor_dividas').value = '';
            }
          });
        });
      },

      setupCEPLookup: function() {
        var self = this;
        var cepInput = document.getElementById('cep');
        
        if (cepInput) {
          cepInput.addEventListener('input', function() {
            var cep = this.value.replace(/\D/g, '');
            if (cep.length === 8) {
              self.lookupCEP(cep);
            } else {
              self.clearCEPStatus();
            }
          });
          
          cepInput.addEventListener('blur', function() {
            var cep = this.value.replace(/\D/g, '');
            if (cep.length === 8) {
              self.lookupCEP(cep);
            }
          });
        }
      },

      lookupCEP: function(cep) {
        var self = this;
        
        this.showCEPLoading();
        
        fetch(`https://viacep.com.br/ws/${cep}/json/`)
          .then(response => response.json())
          .then(data => {
            if (!data.erro) {
              // Fill address fields with ViaCEP data
              document.getElementById('endereco').value = data.logradouro || '';
              document.getElementById('cidade').value = data.localidade || '';
              document.getElementById('estado').value = data.uf || '';
              
              // Add bairro field if it exists
              var bairroField = document.getElementById('bairro');
              if (bairroField && data.bairro) {
                bairroField.value = data.bairro;
              }
              
              this.showCEPSuccess('CEP encontrado!');
            } else {
              this.showCEPError('CEP não encontrado. Você pode preencher os dados manualmente.');
            }
          })
          .catch(error => {
            console.log('Erro ao buscar CEP:', error);
            this.showCEPError('Erro ao buscar CEP. Você pode preencher os dados manualmente.');
          });
      },

      handleFormSubmit: function(e) {
        var self = this;
        
        if (!this.validateForm()) {
          return;
        }

        this.setLoadingState(true);
        
        var formData = this.collectFormData();
        console.log('window.cadastrarImovelData', window.cadastrarImovelData)

        console.log('📝 Dados do formulário:', formData);
        
        // First check if contact exists
        this.checkContactExists(formData.email_cliente, formData.telefone_cliente, formData.cep, formData.numero, formData.complemento, formData.cidade, formData.cpf_cliente)
          .then(function(canProceed) {
            console.log('canProceed', canProceed)
            if (canProceed.allowed) {
              // Add all contact-exist response properties to payload
              if (canProceed.reassign) {
                formData.reassign = true;
              }
              
              // Add existing ticket ID if provided
              if (canProceed.ticketId) {
                formData.existTicketId = canProceed.ticketId;
              }
              
              // Add existing deal ID if provided
              if (canProceed.dealId) {
                formData.existDealId = canProceed.dealId;
              }
              
              // Add all boolean flags from contact-exist response
              if (canProceed.dealExists !== undefined) {
                formData.dealExists = canProceed.dealExists;
              }
              
              if (canProceed.ticketExists !== undefined) {
                formData.ticketExists = canProceed.ticketExists;
              }
              
              // Add contactExists and isClosed flags
              if (canProceed.contactExists !== undefined) {
                formData.contactExists = canProceed.contactExists;
              }
              
              if (canProceed.isClosed !== undefined) {
                formData.isClosed = canProceed.isClosed;
              }
              return self.submitToWebhook(formData);
            } else {
              // Contact exists and belongs to another franchisee
              throw new Error('CONTACT_EXISTS');
            }
          })
          .then(function(response) {
            self.showSuccessMessage('Imóvel cadastrado com sucesso!');
            self.resetForm();
          })
          .catch(function(error) {
            if (error.message === 'CONTACT_EXISTS') {
              self.showErrorMessage('Este cliente já está cadastrado e pertence à Rooftop ou a outro franqueado. Entre em contato com o backoffice da Rooftop.');
            } else {
              self.showErrorMessage('Erro ao cadastrar imóvel. Tente novamente.');
              console.error('Erro no envio:', error);
            }
          })
          .finally(function() {
            self.setLoadingState(false);
          });
      },

      validateForm: function() {
        var requiredFields = this.formContainer.querySelectorAll('[required]');
        var isValid = true;
        
        requiredFields.forEach(function(field) {
          if (!field.value.trim()) {
            field.style.borderColor = '#ef4444';
            isValid = false;
          } else {
            field.style.borderColor = '#cbd5e1';
          }
        });

        if (!isValid) {
          this.showErrorMessage('Por favor, preencha todos os campos obrigatórios.');
        }

        return isValid;
      },

      collectFormData: function() {
        var data = {};
        
        // Manually collect all form inputs
        var inputs = this.formContainer.querySelectorAll('input, select, textarea');
        
        inputs.forEach(function(input) {
          if (input.name) {
            if (input.type === 'radio') {
              if (input.checked) {
                data[input.name] = input.value;
              }
            } else {
              data[input.name] = input.value;
            }
          }
        });

        // Add contact_id from HubL
        data.contact_id = window.cadastrarImovelData.contactId;
        
        // Clean currency values (valor_imovel is now a select, no need to parse)
        if (data.valor_dividas) {
          data.valor_dividas = this.parseCurrency(data.valor_dividas);
        }
        
        // Format phone number to +55 format
        if (data.telefone_cliente) {
          data.telefone_cliente = this.formatPhoneForEndpoint(data.telefone_cliente);
        }
        
        // Add timestamp
        data.timestamp = new Date().toISOString();
        data.source = 'portal_rooftop';
        
        return data;
      },

      submitToWebhook: function(data) {
        return fetch(window.cadastrarImovelData.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data)
        });
      },

      setLoadingState: function(loading) {
        if (loading) {
          this.submitBtn.disabled = true;
          this.submitBtn.innerHTML = `
            <svg class="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Cadastrando...
          `;
        } else {
          this.submitBtn.disabled = false;
          this.submitBtn.innerHTML = `
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            Cadastrar Imóvel
          `;
        }
      },

      resetForm: function() {
        // Manually reset all form fields
        var inputs = this.formContainer.querySelectorAll('input, select, textarea');
        
        inputs.forEach(function(input) {
          if (input.type === 'radio' || input.type === 'checkbox') {
            input.checked = false;
          } else {
            input.value = '';
          }
          input.style.borderColor = '#cbd5e1';
        });
        
        // Hide conditional fields
        document.getElementById('valor_dividas_group').style.display = 'none';
      },

      // Input masks
      maskPhone: function(input) {
        var value = input.value.replace(/\D/g, '');
        if (value.length <= 10) {
          value = value.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        } else {
          value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        }
        input.value = value;
      },

      maskCEP: function(input) {
        var value = input.value.replace(/\D/g, '');
        value = value.replace(/(\d{5})(\d{3})/, '$1-$2');
        input.value = value;
      },

      maskCPF: function(input) {
        var value = input.value.replace(/\D/g, '');
        value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        input.value = value;
      },

      maskCurrency: function(input) {
        var value = input.value.replace(/\D/g, '');
        value = (value / 100).toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
        input.value = value;
      },

      parseCurrency: function(value) {
        return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
      },

      formatPhoneForEndpoint: function(phone) {
        // Remove all non-digit characters
        var digits = phone.replace(/\D/g, '');
        
        // Add +55 prefix if not already present
        if (digits.length === 10 || digits.length === 11) {
          return '+55' + digits;
        }
        
        // If already has country code, just add + if missing
        if (digits.length === 12 || digits.length === 13) {
          return '+' + digits;
        }
        
        // Return original if format is unexpected
        return phone;
      },

      // CEP Status Methods
      clearCEPStatus: function() {
        document.getElementById('cep-status').style.display = 'none';
        document.getElementById('cep-message').style.display = 'none';
        document.getElementById('cep-loading').style.display = 'none';
        document.getElementById('cep-success').style.display = 'none';
        document.getElementById('cep-error').style.display = 'none';
      },

      showCEPLoading: function() {
        this.clearCEPStatus();
        document.getElementById('cep-status').style.display = 'block';
        document.getElementById('cep-loading').style.display = 'block';
      },

      showCEPSuccess: function(message) {
        this.clearCEPStatus();
        document.getElementById('cep-status').style.display = 'block';
        document.getElementById('cep-success').style.display = 'block';
        
        var messageEl = document.getElementById('cep-message');
        messageEl.textContent = message;
        messageEl.className = 'text-sm mt-1 text-green-600';
        messageEl.style.display = 'block';
        
        // Hide message after 3 seconds
        setTimeout(function() {
          messageEl.style.display = 'none';
          document.getElementById('cep-status').style.display = 'none';
        }, 3000);
      },

      showCEPError: function(message) {
        this.clearCEPStatus();
        document.getElementById('cep-status').style.display = 'block';
        document.getElementById('cep-error').style.display = 'block';
        
        var messageEl = document.getElementById('cep-message');
        messageEl.textContent = message;
        messageEl.className = 'text-sm mt-1 text-red-600';
        messageEl.style.display = 'block';
        
        // Hide message after 5 seconds
        setTimeout(function() {
          messageEl.style.display = 'none';
          document.getElementById('cep-status').style.display = 'none';
        }, 5000);
      },

      // Contact existence check
      checkContactExists: function(email, phone, cep, numero, complemento, cidade, cpf) {
        var payload = {
          email_cliente: email,
          telefone_cliente: phone,
          cep: cep,
          numero: numero,
          complemento: complemento,
          cidade: cidade,
          cpf_cliente: cpf
        };
        
        console.log('🔍 Verificando se contato existe:', payload);
        
        return fetch('https://n8n2.rooftop.com.br/webhook/portal/contact-exist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        })
        .then(function(response) {
          return response.json();
        })
        .then(function(data) {
          console.log('📞 Resposta da verificação:', data);
          
          // Data comes directly in the expected format
          if (data.contactExists && !data.isClosed) {
            // Contact exists and is open (belongs to another franchisee or is active)
            return { allowed: false, reassign: false };
          } else if (data.contactExists && data.isClosed) {
            // Contact exists but is closed/lost - can be reassigned
            var result = { 
              allowed: true, 
              reassign: true
            };
            
            // Add ticket ID if exists
            if (data.ticketExists && data.ticketId && data.ticketId !== "0") {
              result.ticketId = data.ticketId.trim();
            }
            
            // Add deal ID if exists
            if (data.dealExists && data.dealId && data.dealId !== "0") {
              result.dealId = data.dealId.trim();
            }
            
            // Add all boolean flags from response
            result.dealExists = data.dealExists;
            result.ticketExists = data.ticketExists;
            result.contactExists = data.contactExists;
            result.isClosed = data.isClosed;
            
            return result;
          } else {
            // Contact doesn't exist - allow creation
            return { allowed: true, reassign: false };
          }
        })
        .catch(function(error) {
          console.error('Erro ao verificar contato:', error);
          // On error, allow creation to proceed
          return { allowed: true, reassign: false };
        });
      },

      // Notification messages
      showSuccessMessage: function(message) {
        this.showNotification(message, 'success');
      },

      showErrorMessage: function(message) {
        this.showNotification(message, 'error');
      },

      showNotification: function(message, type) {
        var notification = document.createElement('div');
        var bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
        var icon = type === 'success' 
          ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>'
          : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>';
        
        notification.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2`;
        notification.innerHTML = `
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            ${icon}
          </svg>
          <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(function() {
          notification.remove();
        }, 5000);
      }
    };

    window.cadastrarImovelModule = module;
  
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        module.init();
      });
    } else {
      module.init();
    }
  
  })();