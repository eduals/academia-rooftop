document.addEventListener('DOMContentLoaded', function() {
  // console.log('Header Portal Module JS Carregado');

  // Load profile photo
  loadProfilePhoto();

  // Load franqueado details
  loadFranqueadoDetalhes();
  
  // Desktop Avatar Dropdown
  const userMenuButton = document.getElementById('user-menu-button');
  const userMenuDropdown = document.getElementById('user-menu-dropdown');
  
  // Mobile Menu Toggle
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');
  const menuIconOpen = document.getElementById('menu-icon-open');
  const menuIconClose = document.getElementById('menu-icon-close');

  // console.log('Elementos encontrados:');
  // console.log('- mobileMenuButton:', mobileMenuButton);
  // console.log('- mobileMenu:', mobileMenu);
  // console.log('- menuIconOpen:', menuIconOpen);
  // console.log('- menuIconClose:', menuIconClose);

  // Desktop Avatar Dropdown Functionality
  if (userMenuButton && userMenuDropdown) {
    userMenuButton.addEventListener('click', function(e) {
      e.stopPropagation();
      
      const isExpanded = userMenuButton.getAttribute('aria-expanded') === 'true';
      
      if (isExpanded) {
        // Close dropdown
        userMenuDropdown.classList.add('hidden');
        userMenuButton.setAttribute('aria-expanded', 'false');
      } else {
        // Open dropdown
        userMenuDropdown.classList.remove('hidden');
        userMenuButton.setAttribute('aria-expanded', 'true');
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
      if (!userMenuButton.contains(e.target) && !userMenuDropdown.contains(e.target)) {
        userMenuDropdown.classList.add('hidden');
        userMenuButton.setAttribute('aria-expanded', 'false');
      }
    });

    // Close dropdown on ESC key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        userMenuDropdown.classList.add('hidden');
        userMenuButton.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Mobile Menu Functionality
  if (mobileMenuButton && mobileMenu) {
    // console.log('Event listener adicionado ao botão mobile menu');
    mobileMenuButton.addEventListener('click', function() {
      // console.log('Clique detectado no botão mobile menu');
      const isExpanded = mobileMenuButton.getAttribute('aria-expanded') === 'true';
      // console.log('Estado atual aria-expanded:', isExpanded);
      
      if (isExpanded) {
        // Close mobile menu
        mobileMenu.classList.add('hidden');
        mobileMenuButton.setAttribute('aria-expanded', 'false');
        
        // Switch icons
        if (menuIconOpen) menuIconOpen.classList.remove('hidden');
        if (menuIconClose) menuIconClose.classList.add('hidden');
        
        // Enable body scroll
        document.body.classList.remove('no-scroll');
      } else {
        // Open mobile menu
        mobileMenu.classList.remove('hidden');
        mobileMenuButton.setAttribute('aria-expanded', 'true');
        
        // Switch icons
        if (menuIconOpen) menuIconOpen.classList.add('hidden');
        if (menuIconClose) menuIconClose.classList.remove('hidden');
        
        // Disable body scroll
        document.body.classList.add('no-scroll');
      }
    });

    // Close mobile menu when clicking on menu links
    const mobileMenuLinks = mobileMenu.querySelectorAll('a');
    mobileMenuLinks.forEach(link => {
      link.addEventListener('click', function() {
        mobileMenu.classList.add('hidden');
        mobileMenuButton.setAttribute('aria-expanded', 'false');
        
        // Switch icons back
        if (menuIconOpen) menuIconOpen.classList.remove('hidden');
        if (menuIconClose) menuIconClose.classList.add('hidden');
        
        // Enable body scroll
        document.body.classList.remove('no-scroll');
      });
    });
  }

  // Franqueado details loading function
  function loadFranqueadoDetalhes() {
    const contactId = window.contact_id;

    if (!contactId) {
      console.warn('Contact ID não disponível para carregar dados do franqueado');
      updateFranqueadoInfo('Não disponível', 'Não disponível');
      return;
    }

    fetch(`https://n8n2.rooftop.com.br/webhook/portal/get-franqueado-detalhes?contact_id=${contactId}`)
      .then(response => response.json())
      .then(data => {
        if (data && data.razao_social && data.nome_completo_do_representante_legal) {
          updateFranqueadoInfo(data.razao_social, data.nome_completo_do_representante_legal);
        } else {
          console.warn('Dados do franqueado incompletos:', data);
          updateFranqueadoInfo('Não disponível', 'Não disponível');
        }
      })
      .catch(error => {
        console.error('Erro ao carregar dados do franqueado:', error);
        updateFranqueadoInfo('Erro ao carregar', 'Erro ao carregar');
      });
  }

  function updateFranqueadoInfo(razaoSocial, representanteLegal) {
    const razaoSocialElement = document.getElementById('franqueado-razao-social');
    const representanteElement = document.getElementById('franqueado-representante');

    if (razaoSocialElement) {
      razaoSocialElement.textContent = razaoSocial;
    }

    if (representanteElement) {
      representanteElement.textContent = representanteLegal;
    }
  }

  // Profile photo loading function
  function loadProfilePhoto() {
    const fotoDePerfilId = window.membership_contact?.foto_de_perfil;

    if (fotoDePerfilId) {
      fetch(`https://n8n2.rooftop.com.br/webhook/portal/get-file?id=${fotoDePerfilId}`)
        .then(response => response.json())
        .then(data => {
          if (data && data.url) {
            updateProfileImages(data.url);
          } else {
            updateProfileImages('https://rooftopbr.nyc3.cdn.digitaloceanspaces.com/portal/images/avatar_placeholder.png');
          }
        })
        .catch(error => {
          console.error('Erro ao carregar foto de perfil:', error);
          updateProfileImages('https://rooftopbr.nyc3.cdn.digitaloceanspaces.com/portal/images/avatar_placeholder.png');
        });
    } else {
      updateProfileImages('https://rooftopbr.nyc3.cdn.digitaloceanspaces.com/portal/images/avatar_placeholder.png');
    }
  }

  function updateProfileImages(imageUrl) {
    // Update desktop avatar
    const desktopAvatar = document.querySelector('#user-menu-button img');
    if (desktopAvatar) {
      desktopAvatar.src = imageUrl;
    }

    // Update mobile avatar if exists
    const mobileAvatar = document.querySelector('#mobile-menu img[class*="rounded-full"]');
    if (mobileAvatar) {
      mobileAvatar.src = imageUrl;
    }
  }
});