jQuery(document).ready(function ($) {
  
  // ---------- Menu Ativo baseado na URL -------- //
  // console.log('Menu state controll actived')
  // Função para atualizar o menu ativo
  function updateActiveMenu() {
    var currentPath = window.location.pathname;
    
    // Mapeamento das rotas para os seletores de menu
    var menuItems = {
      '/dashboard': {
        desktop: 'a[href="/dashboard"]',
        mobile: 'a[href="/dashboard"]'
      },
      '/negocios': {
        desktop: 'a[href="/negocios"]',
        mobile: 'a[href="/negocios"]'
      },
      '/relatorios': {
        desktop: 'a[href="/relatorios"]',
        mobile: 'a[href="/relatorios"]'
      }
    };
    
    // Classes para estado ativo e inativo
    var activeClasses = 'rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white';
    var inactiveClasses = 'rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-blue-800 hover:text-white';
    var activeMobileClasses = 'block rounded-md bg-blue-800 px-3 py-2 text-base font-medium text-white';
    var inactiveMobileClasses = 'block rounded-md px-3 py-2 text-base font-medium text-gray-300 hover:bg-blue-800 hover:text-white';
    
    // Remove o estado ativo de todos os itens do menu desktop
    $('nav .ml-10 a').each(function() {
      $(this).attr('class', inactiveClasses).removeAttr('aria-current');
    });
    
    // Remove o estado ativo de todos os itens do menu mobile
    $('#mobile-menu .space-y-1 a').each(function() {
      $(this).attr('class', inactiveMobileClasses).removeAttr('aria-current');
    });
    
    // Verifica qual página está ativa baseado no pathname
    var activeRoute = null;
    
    // Verifica correspondência exata primeiro
    if (menuItems[currentPath]) {
      activeRoute = currentPath;
    } else {
      // Se não houver correspondência exata, verifica se algum slug está contido na URL
      for (var route in menuItems) {
        if (currentPath.indexOf(route) !== -1 && route !== '/') {
          activeRoute = route;
          break;
        }
      }
    }
    
    // Se encontrou uma rota ativa, aplica o estilo
    if (activeRoute && menuItems[activeRoute]) {
      // Atualiza menu desktop
      var desktopActiveLink = $('nav .ml-10 ' + menuItems[activeRoute].desktop);
      if (desktopActiveLink.length) {
        desktopActiveLink.attr('class', activeClasses).attr('aria-current', 'page');
      }
      
      // Atualiza menu mobile
      var mobileActiveLink = $('#mobile-menu .space-y-1 ' + menuItems[activeRoute].mobile);
      if (mobileActiveLink.length) {
        mobileActiveLink.attr('class', activeMobileClasses).attr('aria-current', 'page');
      }
    }
  }
  
  // Executa a função ao carregar a página
  updateActiveMenu();
  
  // Escuta mudanças na URL (para SPAs ou navegação via AJAX)
  $(window).on('popstate', function() {
    updateActiveMenu();
  });

  // ---------- Toggle do Menu Mobile -------- //
  
  $('[aria-controls="mobile-menu"]').on('click', function() {
    var $button = $(this);
    var $mobileMenu = $('#mobile-menu');
    var isExpanded = $button.attr('aria-expanded') === 'true';
    
    $button.attr('aria-expanded', !isExpanded);
    
    if (isExpanded) {
      $mobileMenu.addClass('hidden');
    } else {
      $mobileMenu.removeClass('hidden');
    }
    
    // Toggle dos ícones do botão
    var $openIcon = $button.find('.block');
    var $closeIcon = $button.find('.hidden');
    
    if ($openIcon.length && $closeIcon.length) {
      $openIcon.toggleClass('hidden block');
      $closeIcon.toggleClass('hidden block');
    }
  });

  $('.ac-blog__action-tag .ac-button').click(function () {
    $(this).siblings('.ac-blog__action-tag-list').toggleClass('active');
  });

  // ---------- Injeção de Classes Tailwind (EXECUÇÃO ÚNICA) -------- //
  if (window.location.pathname.includes('/login') || window.location.href.includes('login')) {
    // VERIFICAÇÃO TRIPLA PARA EVITAR LOOP
    if (window.TAILWIND_INJECTED === true) {
      return;
    }
    
    window.TAILWIND_INJECTED = true;
    
    // console.log('Iniciando script de injeção de classes Tailwind');
    
    // EXECUÇÃO DIRETA - SEM FUNÇÕES QUE PODEM SER CHAMADAS NOVAMENTE
    try {
      // Container principal
      const contentWrapper = document.querySelector('.content-wrapper');
      if (contentWrapper) {
        contentWrapper.className = 'min-h-screen bg-white flex items-center justify-center p-4';
      }
      
      // Container da página de login
      const systemsPage = document.querySelector('.systems-page');
      if (systemsPage) {
        systemsPage.className = 'w-full max-w-md mx-auto';
      }
      
      // Header do login
      const loginHeader = document.querySelector('.membership-login-header');
      if (loginHeader) {
        loginHeader.className = 'bg-white rounded-2xl shadow-xl p-8 space-y-6';
      }
      
      // Título principal
      const title = document.querySelector('h1');
      if (title) {
        title.className = 'text-3xl font-bold text-slate-900 text-center mb-2';
      }
      
      // ÍCONE DO TÍTULO - VERIFICAÇÃO ROBUSTA
      if (title && !document.querySelector('.title-icon-added')) {
        const logo = document.createElement('img');
        logo.src = 'https://rooftopbr.nyc3.cdn.digitaloceanspaces.com/portal/images/logo/logo-franquias-azul.png';
        logo.alt = 'Rooftop Logo';
        logo.className = 'h-40 max-w-xs mx-auto mb-4 title-icon-added';
        title.parentNode.insertBefore(logo, title);
      }
      
      // Descrição
      const description = document.querySelector('p');
      if (description && description.textContent.includes('Esta página está disponível')) {
        description.className = 'text-slate-600 text-center text-sm mb-8';
      }
      
      // Container do formulário
      const formContainer = document.querySelector('.form-container');
      if (formContainer) {
        formContainer.className = 'space-y-6';
      }
      
      // Formulário principal
      const mainForm = document.getElementById('hs-membership-form');
      if (mainForm) {
        mainForm.className = 'space-y-4';
      }
      
      // Campos do formulário
      const formFields = document.querySelectorAll('.hs-form-field');
      formFields.forEach(field => {
        if (!field.querySelector('.hs-error-msgs')) {
          field.className = 'space-y-2';
        }
      });
      
      // Labels (exceto checkboxes)
      const labels = document.querySelectorAll('label:not([for="hs-login-widget-remember"]):not([for="hs-passwordless-auth-explicit-consent"]):not(.hs-membership-global-error):not(.hs-error-msg)');
      labels.forEach(label => {
        label.className = 'block text-sm font-medium text-slate-700';
      });
      
      // Inputs de texto
      const textInputs = document.querySelectorAll('input[type="text"], input[type="password"]');
      textInputs.forEach(input => {
        input.className = 'w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-slate-900 placeholder-slate-400';
      });
      
      // Checkboxes
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(checkbox => {
        checkbox.className = 'h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded';
      });
      
      // Labels dos checkboxes
      const checkboxLabels = document.querySelectorAll('label[for="hs-login-widget-remember"], label[for="hs-passwordless-auth-explicit-consent"]');
      checkboxLabels.forEach(label => {
        label.className = 'ml-2 block text-sm text-slate-600';
      });
      
      // Container dos checkboxes
      const checkboxContainers = document.querySelectorAll('.hs-form-field:has(input[type="checkbox"])');
      checkboxContainers.forEach(container => {
        container.className = 'flex items-start space-x-2';
      });
      
      // Link "Mostrar senha"
      const showPasswordLink = document.querySelector('.hs-login-widget-show-password');
      if (showPasswordLink) {
        const passwordField = showPasswordLink.closest('.hs-form-field');
        if (passwordField) {
          passwordField.className = 'space-y-2 relative';
          showPasswordLink.className = 'absolute right-0 top-0 text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200';
        }
      }
      
      // Link "Esqueceu sua senha?"
      const forgotPasswordLink = document.getElementById('hs_login_reset');
      if (forgotPasswordLink) {
        forgotPasswordLink.className = 'text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200 block text-center';
        if (forgotPasswordLink.parentElement) {
          forgotPasswordLink.parentElement.className = 'text-center';
        }
      }
      
      // Botões de submit
      const submitButtons = document.querySelectorAll('input[type="submit"]');
      submitButtons.forEach(button => {
        button.className = 'w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2';
      });
      
      // Separador "or"
      const separator = document.querySelector('.form-separator');
      if (separator && !separator.querySelector('.bg-white')) {
        separator.className = 'hidden block text-center text-slate-400 text-sm my-6 relative';
        separator.innerHTML = `
          <span class="bg-white px-4 text-slate-400 text-sm relative z-10">ou</span>
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-slate-200"></div>
          </div>
        `;
      }
      
      // Formulário passwordless
      const passwordlessForm = document.getElementById('hs-membership-passwordless-auth-form');
      if (passwordlessForm) {
        passwordlessForm.className = 'hidden space-y-4 border-t border-slate-200 pt-6';
      }
      
      // Texto explicativo do passwordless
      const passwordlessText = passwordlessForm?.querySelector('p');
      if (passwordlessText) {
        passwordlessText.className = 'text-sm text-slate-600 text-center mb-4';
      }
      
      // Link de registro
      const registrationLink = document.querySelector('#hs-login-self-registration-link');
      if (registrationLink) {
        registrationLink.className = 'hidden text-center mt-8 p-4 bg-slate-50 rounded-lg';
        const regText = registrationLink.querySelector('p');
        if (regText) {
          regText.className = 'text-sm text-slate-600';
        }
        const regLinkElement = registrationLink.querySelector('a');
        if (regLinkElement) {
          regLinkElement.className = 'text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200';
        }
      }
      
      // Container de contato do administrador
      const adminContent = document.querySelector('#hs_cos_wrapper_membership_admin_content');
      if (adminContent) {
        adminContent.className = 'text-center mt-6';
        const adminText = adminContent.querySelector('p');
        if (adminText) {
          adminText.className = 'text-sm text-slate-500';
          const adminLink = adminText.querySelector('a');
          if (adminLink) {
            adminLink.className = 'text-blue-600 hover:text-blue-800 transition-colors duration-200';
          }
        }
      }
      
      // Mensagens de erro
      const errorMsgs = document.querySelector('.hs-error-msgs');
      // if (errorMsgs) {
      //   errorMsgs.className = 'bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm text-center mb-4';
      // }
      
      // Containers
      const loaders = document.querySelectorAll('.hs-membership-loader');
      loaders.forEach(loader => {
        loader.className = 'w-full';
      });
      
      const actions = document.querySelectorAll('.actions');
      actions.forEach(action => {
        action.className = 'w-full';
      });
      
      // Event listeners para inputs (uma vez só)
      textInputs.forEach(input => {
        if (!input.dataset.listenersAdded) {
          input.addEventListener('focus', function() {
            this.style.transform = 'scale(1.02)';
            this.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
          });
          
          input.addEventListener('blur', function() {
            this.style.transform = 'scale(1)';
            this.style.boxShadow = 'none';
          });
          
          input.dataset.listenersAdded = 'true';
        }
      });
      
      // Event listeners para botões (uma vez só)
      submitButtons.forEach(button => {
        if (!button.dataset.listenersAdded) {
          button.addEventListener('mouseenter', function() {
            if (!this.disabled) {
              this.style.transform = 'translateY(-1px)';
              this.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
            }
          });
          
          button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = 'none';
          });
          
          button.dataset.listenersAdded = 'true';
        }
      });
      
      // console.log('✅ Classes Tailwind injetadas com sucesso!');
      
    } catch (error) {
      console.error('Erro ao injetar classes:', error);
    }
  }
  console.log('window.location.pathname', window.location.pathname)
  // ---------- Injeção de Classes Tailwind para Reset de Senha (EXECUÇÃO ÚNICA) -------- //
  if (window.location.pathname.includes('/reset') || window.location.href.includes('reset')) {
    // VERIFICAÇÃO TRIPLA PARA EVITAR LOOP
    if (window.TAILWIND_RESET_INJECTED === true) {
      return;
    }
    
    window.TAILWIND_RESET_INJECTED = true;
    
    // console.log('Iniciando script de injeção de classes Tailwind para Reset');
    
    // EXECUÇÃO DIRETA - SEM FUNÇÕES QUE PODEM SER CHAMADAS NOVAMENTE
    try {
      // Container principal
      const sectionWrapper = document.querySelector('.section-wrapper');
      if (sectionWrapper) {
        sectionWrapper.className = 'min-h-screen bg-white flex items-center justify-center p-4';
      }
      
      // Container do formulário de reset
      const formContainer = document.querySelector('.hs-membership-reset-request__form-container');
      if (formContainer) {
        formContainer.className = 'w-full max-w-md mx-auto bg-white rounded-2xl p-8 space-y-6';
      }
      
      // Adicionar logo antes do título
      const heading = document.querySelector('#hs_cos_wrapper_password_reset_request_heading h1');
      if (heading && !document.querySelector('.reset-logo-added')) {
        const logo = document.createElement('img');
        logo.src = 'https://rooftopbr.nyc3.cdn.digitaloceanspaces.com/portal/images/logo/logo-franquias-azul.png';
        logo.alt = 'Rooftop Logo';
        logo.className = 'h-40 max-w-xs mx-auto mb-4 reset-logo-added';
        heading.parentNode.insertBefore(logo, heading);
      }
      
      // Título principal
      const title = document.querySelector('#hs_cos_wrapper_password_reset_request_heading h1');
      if (title) {
        title.className = 'text-3xl font-bold text-slate-900 text-center mb-2';
      }
      
      // Descrição
      const description = document.querySelector('#hs_cos_wrapper_password_reset_request_heading p');
      if (description) {
        description.className = 'text-slate-600 text-center text-sm mb-8';
      }
      
      // Container do heading
      const headingWrapper = document.querySelector('#hs_cos_wrapper_password_reset_request_heading');
      if (headingWrapper) {
        headingWrapper.className = 'text-center space-y-4 mb-6';
      }
      
      // Formulário principal
      const resetForm = document.getElementById('hs-membership-form');
      if (resetForm) {
        resetForm.className = 'space-y-4';
      }
      
      // Campos do formulário
      const formFields = document.querySelectorAll('.hs-form-field');
      formFields.forEach(field => {
        if (!field.querySelector('.hs-error-msgs') && !field.querySelector('.hs-membership-global-message')) {
          field.className = 'space-y-2';
        }
      });
      
      // Labels
      const labels = document.querySelectorAll('label:not(.hs-membership-global-error):not(.hs-error-msg):not(.hs-membership-global-message)');
      labels.forEach(label => {
        if (label.textContent.trim() && !label.classList.contains('hs-membership-global-message')) {
          label.className = 'block text-sm font-medium text-slate-700';
        }
      });
      
      // Input de email
      const emailInput = document.querySelector('#hs-reset-request-widget-email');
      if (emailInput) {
        emailInput.className = 'w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-slate-900 placeholder-slate-400';
      }
      
      // Botão de submit
      const submitButton = document.querySelector('input[type="submit"]');
      if (submitButton) {
        submitButton.className = 'w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2';
      }
      
      // Container do loader
      const loader = document.querySelector('.hs-membership-loader');
      if (loader) {
        loader.className = 'w-full';
      }
      
      // Actions container
      const actions = document.querySelector('.actions');
      if (actions) {
        actions.className = 'w-full';
      }
      
      // Link "Entre" (voltar para login)
      const signInLink = document.querySelector('#hs_cos_wrapper_sign_in_link');
      if (signInLink) {
        signInLink.className = 'text-center mt-6 p-4 bg-slate-50 rounded-lg';
        const signInText = signInLink.querySelector('p');
        if (signInText) {
          signInText.className = 'text-sm text-slate-600';
        }
        const signInLinkElement = signInLink.querySelector('a');
        if (signInLinkElement) {
          signInLinkElement.className = 'text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200';
        }
      }
      
      // Container de contato do administrador
      const adminContact = document.querySelector('#hs_cos_wrapper_admin_contact');
      if (adminContact) {
        adminContact.className = 'text-center mt-6';
        const adminText = adminContact.querySelector('p');
        if (adminText) {
          adminText.className = 'text-sm text-slate-500';
          const adminLink = adminText.querySelector('a');
          if (adminLink) {
            adminLink.className = 'text-blue-600 hover:text-blue-800 transition-colors duration-200';
          }
        }
      }
      
      // Mensagens de erro/sucesso
      // const errorContainer = document.querySelector('.hs-error-msgs');
      // if (errorContainer) {
      //   errorContainer.className = 'bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm text-center mb-4';
      // }
      
      const messageContainer = document.querySelector('.hs-form-field .no-list:not(.hs-error-msgs)');
      if (messageContainer) {
        messageContainer.className = 'bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm text-center mb-4';
      }
      
      // Event listeners para input (uma vez só)
      if (emailInput && !emailInput.dataset.listenersAdded) {
        emailInput.addEventListener('focus', function() {
          this.style.transform = 'scale(1.02)';
          this.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
        });
        
        emailInput.addEventListener('blur', function() {
          this.style.transform = 'scale(1)';
          this.style.boxShadow = 'none';
        });
        
        emailInput.dataset.listenersAdded = 'true';
      }
      
      // Event listeners para botão (uma vez só)
      if (submitButton && !submitButton.dataset.listenersAdded) {
        submitButton.addEventListener('mouseenter', function() {
          if (!this.disabled) {
            this.style.transform = 'translateY(-1px)';
            this.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
          }
        });
        
        submitButton.addEventListener('mouseleave', function() {
          this.style.transform = 'translateY(0)';
          this.style.boxShadow = 'none';
        });
        
        submitButton.dataset.listenersAdded = 'true';
      }
      
      // console.log('✅ Classes Tailwind para Reset de Senha injetadas com sucesso!');
      
    } catch (error) {
      console.error('Erro ao injetar classes para reset de senha:', error);
    }
  }

  // ---------- Injeção de Classes Tailwind para Register (EXECUÇÃO ÚNICA) -------- //
  if (window.location.pathname.includes('/register') || window.location.href.includes('register')) {
    // VERIFICAÇÃO TRIPLA PARA EVITAR LOOP
    if (window.TAILWIND_REGISTER_INJECTED === true) {
      return;
    }
    
    window.TAILWIND_REGISTER_INJECTED = true;
    
    // console.log('Iniciando script de injeção de classes Tailwind para Register');
    
    // EXECUÇÃO DIRETA - SEM FUNÇÕES QUE PODEM SER CHAMADAS NOVAMENTE
    try {
      // Container principal
      const contentWrapper = document.querySelector('.content-wrapper');
      if (contentWrapper) {
        contentWrapper.className = 'min-h-screen bg-white flex items-center justify-center p-4';
      }
      
      // Container da página de registro
      const systemsPage = document.querySelector('.systems-page.membership-register');
      if (systemsPage) {
        systemsPage.className = 'w-full max-w-md mx-auto bg-white rounded-2xl p-8 space-y-6';
      }
      
      // Título principal
      const title = document.querySelector('h1');
      if (title) {
        title.className = 'text-3xl font-bold text-slate-900 text-center mb-2';
      }
      
      // ÍCONE DO TÍTULO - VERIFICAÇÃO ROBUSTA
      if (title && !document.querySelector('.register-logo-added')) {
        const logo = document.createElement('img');
        logo.src = 'https://rooftopbr.nyc3.cdn.digitaloceanspaces.com/portal/images/logo/logo-franquias-azul.png';
        logo.alt = 'Rooftop Logo';
        logo.className = 'h-40 max-w-xs mx-auto mb-4 register-logo-added';
        title.parentNode.insertBefore(logo, title);
      }
      
      // Descrição
      const description = document.querySelector('p');
      if (description && description.textContent.includes('Configure sua senha')) {
        description.className = 'text-slate-600 text-center text-sm mb-8';
      }
      
      // Container do formulário
      const formContainer = document.querySelector('.form-container.membership-register__form');
      if (formContainer) {
        formContainer.className = 'space-y-6';
      }
      
      // Formulário principal
      const mainForm = document.getElementById('hs-membership-form');
      if (mainForm) {
        mainForm.className = 'space-y-4';
      }
      
      // Campos do formulário
      const formFields = document.querySelectorAll('.hs-form-field');
      formFields.forEach(field => {
        if (!field.querySelector('.hs-error-msgs')) {
          field.className = 'space-y-2';
        }
      });
      
      // Labels
      const labels = document.querySelectorAll('label:not(.hs-membership-global-error):not(.hs-error-msg)');
      labels.forEach(label => {
        if (label.textContent.trim()) {
          label.className = 'block text-sm font-medium text-slate-700';
        }
      });
      
      // Inputs de texto, email e senha
      const textInputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"]');
      textInputs.forEach(input => {
        input.className = 'w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-slate-900 placeholder-slate-400';
      });
      
      // Botões de submit
      const submitButtons = document.querySelectorAll('input[type="submit"]');
      submitButtons.forEach(button => {
        button.className = 'w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2';
      });
      
      // Mensagens de erro
      const errorMsgs = document.querySelectorAll('.hs-error-msgs');
      errorMsgs.forEach(errorMsg => {
        errorMsg.className = 'bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm text-center mb-4';
      });
      
      // Container de contato do administrador (se existir)
      const adminContent = document.querySelector('#hs_cos_wrapper_membership_admin_content');
      if (adminContent) {
        adminContent.className = 'text-center mt-6';
        const adminText = adminContent.querySelector('p');
        if (adminText) {
          adminText.className = 'text-sm text-slate-500';
          const adminLink = adminText.querySelector('a');
          if (adminLink) {
            adminLink.className = 'text-blue-600 hover:text-blue-800 transition-colors duration-200';
          }
        }
      }
      
      // Containers
      const loaders = document.querySelectorAll('.hs-membership-loader');
      loaders.forEach(loader => {
        loader.className = 'w-full';
      });
      
      const actions = document.querySelectorAll('.actions');
      actions.forEach(action => {
        action.className = 'w-full';
      });
      
      // Event listeners para inputs (uma vez só)
      textInputs.forEach(input => {
        if (!input.dataset.listenersAdded) {
          input.addEventListener('focus', function() {
            this.style.transform = 'scale(1.02)';
            this.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
          });
          
          input.addEventListener('blur', function() {
            this.style.transform = 'scale(1)';
            this.style.boxShadow = 'none';
          });
          
          input.dataset.listenersAdded = 'true';
        }
      });
      
      // Event listeners para botões (uma vez só)
      submitButtons.forEach(button => {
        if (!button.dataset.listenersAdded) {
          button.addEventListener('mouseenter', function() {
            if (!this.disabled) {
              this.style.transform = 'translateY(-1px)';
              this.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
            }
          });
          
          button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = 'none';
          });
          
          button.dataset.listenersAdded = 'true';
        }
      });
      
      // console.log('✅ Classes Tailwind para Register injetadas com sucesso!');
      
    } catch (error) {
      console.error('Erro ao injetar classes para register:', error);
    }
  }

}); 