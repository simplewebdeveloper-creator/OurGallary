const API_BASE = '';

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Server error');
  }
  return data;
}

function pushNotification(message, type = 'info') {
  const target = document.getElementById('notifications');
  if (!target) return;
  const tone = type === 'error' ? 'border-rose-500/30 text-rose-300' : 'border-emerald-500/30 text-emerald-300';
  const item = document.createElement('div');
  item.className = `rounded-2xl border bg-white/5 p-3 ${tone}`;
  item.textContent = message;
  target.prepend(item);
  setTimeout(() => item.remove(), 4200);
}

function setAuthMessage(message) {
  const element = document.getElementById('formMessage');
  if (element) element.textContent = message;
}

function setAuthMode(mode) {
  const modeButtons = document.querySelectorAll('.mode-btn');
  const nameGroup = document.getElementById('nameGroup');
  const confirmGroup = document.getElementById('confirmGroup');
  modeButtons.forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle('bg-white/15', active);
    button.classList.toggle('text-white', active);
    button.classList.toggle('text-slate-300', !active);
  });
  nameGroup?.classList.toggle('hidden', mode !== 'register');
  confirmGroup?.classList.toggle('hidden', mode !== 'register');
  const form = document.getElementById('authForm');
  if (form) {
    const submitCopy = mode === 'forgot' ? 'Send reset link' : mode === 'register' ? 'Create account' : 'Sign in';
    form.querySelector('button[type="submit"]').textContent = submitCopy;
  }
  setAuthMessage(mode === 'forgot' ? 'We will email a secure recovery link.' : 'Use your details to continue.');
}

async function initializeAuth() {
  const form = document.getElementById('authForm');
  const modeButtons = document.querySelectorAll('.mode-btn');
  const params = new URLSearchParams(window.location.search);
  let mode = params.get('mode') || 'login';

  modeButtons.forEach((button) => button.addEventListener('click', () => {
    mode = button.dataset.mode;
    setAuthMode(mode);
  }));

  setAuthMode(mode);

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = document.getElementById('name')?.value.trim() || '';
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword')?.value || '';

    if (!email || !password) {
      setAuthMessage('Please complete your email and password.');
      return;
    }

    try {
      if (mode === 'register') {
        if (!name) {
          setAuthMessage('Please add your full name.');
          return;
        }
        if (password.length < 8) {
          setAuthMessage('Password should be at least 8 characters.');
          return;
        }
        if (password !== confirmPassword) {
          setAuthMessage('Passwords do not match.');
          return;
        }
        await apiRequest('/api/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, password })
        });
        window.location.href = 'user-dashboard.html';
        return;
      }

      if (mode === 'forgot') {
        await apiRequest('/api/forgot', {
          method: 'POST',
          body: JSON.stringify({ email })
        });
        setAuthMessage('If that email exists, a recovery link was sent.');
        return;
      }

      await apiRequest('/api/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      window.location.href = 'user-dashboard.html';
    } catch (error) {
      setAuthMessage(error.message);
    }
  });
}

async function initializeAdminLogin() {
  const form = document.getElementById('adminLoginForm');
  const message = document.getElementById('adminLoginMessage');

  // If page is opened via the file:// protocol, inform the user to open via the server.
  if (location.protocol === 'file:') {
    if (message) message.textContent = 'This page must be opened through the backend server (e.g. http://localhost:3000/admin-login.html). Start the server and open that URL.';
    return;
  }

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = document.getElementById('adminUsername')?.value.trim();
    const password = document.getElementById('adminPassword')?.value;

    if (!username || !password) {
      if (message) message.textContent = 'Username and password are required.';
      return;
    }

    try {
      await apiRequest('/api/admin-login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      window.location.href = 'admin-dashboard.html';
    } catch (error) {
      // If fetch fails because backend is unreachable, provide a clearer message.
      const errMsg = error.message && error.message.toLowerCase().includes('failed') ? 'Unable to reach backend. Start the server and open this page via http://localhost:3000/admin-login.html' : error.message;
      if (message) message.textContent = errMsg;
    }
  });
}

async function fetchSession() {
  try {
    const data = await apiRequest('/api/session');
    return data.user;
  } catch {
    return null;
  }
}

async function loadGallery() {
  return apiRequest('/api/gallery');
}

function renderGalleryItems(items, container) {
  if (!container) return;
  container.innerHTML = '';
  items.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-3';
    card.innerHTML = `
      <div class="mb-3 overflow-hidden rounded-[1.2rem]">
        ${item.type === 'video' ? `<video controls class="h-44 w-full object-cover bg-black"><source src="${item.image}" /></video>` : `<img src="${item.image}" alt="${item.title}" class="h-44 w-full object-cover" />`}
      </div>
      <div class="flex items-start justify-between gap-2">
        <div>
          <h3 class="text-sm font-semibold text-white">${item.title}</h3>
          <p class="mt-1 text-sm text-slate-400">${item.description}</p>
        </div>
        <a href="${item.image}" download class="rounded-full border border-emerald-500/30 px-2.5 py-1 text-xs text-emerald-300">Download</a>
      </div>`;
    container.appendChild(card);
  });
}

async function initializeAdminDashboard() {
  const session = await fetchSession();
  if (!session || session.role !== 'admin') {
    window.location.href = 'admin-login.html';
    return;
  }

  const galleryGrid = document.getElementById('adminGalleryGrid');
  const status = document.getElementById('adminStatus');
  const refreshButton = document.getElementById('refreshGalleryBtn');
  const uploadButton = document.getElementById('adminUploadBtn');
  const titleInput = document.getElementById('adminTitle');
  const typeInput = document.getElementById('adminType');
  const fileInput = document.getElementById('adminFile');
  const descriptionInput = document.getElementById('adminDescription');
  const logoutButton = document.getElementById('adminLogoutBtn');
  let galleryItems = [];

  const renderAdminGallery = () => {
    if (!galleryGrid) return;
    galleryGrid.innerHTML = '';
    galleryItems.forEach((item) => {
      const card = document.createElement('article');
      card.className = 'rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-3';
      card.innerHTML = `
        <div class="mb-3 overflow-hidden rounded-[1.2rem]">
          ${item.type === 'video' ? `<video controls class="h-40 w-full object-cover bg-black"><source src="${item.image}" /></video>` : `<img src="${item.image}" alt="${item.title}" class="h-40 w-full object-cover" />`}
        </div>
        <div class="flex items-start justify-between gap-2">
          <div>
            <h3 class="text-sm font-semibold text-white">${item.title}</h3>
            <p class="mt-1 text-sm text-slate-400">${item.description}</p>
          </div>
          <button data-id="${item.id}" class="delete-btn rounded-full border border-rose-500/30 px-2.5 py-1 text-xs text-rose-300">Delete</button>
        </div>`;
      galleryGrid.appendChild(card);
    });

    galleryGrid.querySelectorAll('.delete-btn').forEach((button) => {
      button.addEventListener('click', async () => {
        const id = button.getAttribute('data-id');
        try {
          await apiRequest('/api/gallery/delete', {
            method: 'POST',
            body: JSON.stringify({ id })
          });
          galleryItems = galleryItems.filter((item) => item.id !== id);
          renderAdminGallery();
          if (status) status.textContent = 'Item removed from the shared gallery.';
        } catch (error) {
          if (status) status.textContent = error.message;
        }
      });
    });
  };

  const refreshGallery = async () => {
    try {
      galleryItems = await loadGallery();
      renderAdminGallery();
    } catch (error) {
      if (status) status.textContent = error.message;
    }
  };

  const uploadMedia = async () => {
    const title = titleInput?.value.trim();
    const type = typeInput?.value || 'image';
    const file = fileInput?.files?.[0];
    const description = descriptionInput?.value.trim() || 'Shared by admin';

    if (!title || !file) {
      if (status) status.textContent = 'Please enter a title and choose a file from your device.';
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await apiRequest('/api/gallery/upload', {
          method: 'POST',
          body: JSON.stringify({
            title,
            category: 'Admin',
            description,
            image: reader.result,
            type: file.type.startsWith('video') ? 'video' : type
          })
        });
        titleInput.value = '';
        fileInput.value = '';
        descriptionInput.value = '';
        if (status) status.textContent = 'Media published to the user gallery.';
        await refreshGallery();
      } catch (error) {
        if (status) status.textContent = error.message;
      }
    };
    reader.readAsDataURL(file);
  };

  refreshButton?.addEventListener('click', refreshGallery);
  uploadButton?.addEventListener('click', uploadMedia);
  logoutButton?.addEventListener('click', async () => {
    await apiRequest('/api/logout', { method: 'POST' });
    window.location.href = 'index.html';
  });

  await refreshGallery();
  if (status) status.textContent = 'Admin controls are live. You can add or remove gallery media.';
}

async function initializeUserDashboard() {
  const session = await fetchSession();
  if (!session) {
    window.location.href = 'auth.html?mode=login';
    return;
  }

  const greeting = document.getElementById('userGreeting');
  const grid = document.getElementById('userGalleryGrid');
  const logoutButton = document.getElementById('userLogoutBtn');

  if (greeting) greeting.textContent = session.name || 'Guest';

  const renderUserGallery = async () => {
    try {
      const items = await loadGallery();
      renderGalleryItems(items, grid);
    } catch (error) {
      pushNotification(error.message, 'error');
    }
  };

  logoutButton?.addEventListener('click', async () => {
    await apiRequest('/api/logout', { method: 'POST' });
    window.location.href = 'index.html';
  });

  await renderUserGallery();
}

async function initializeDashboard() {
  const session = await fetchSession();
  if (!session) {
    window.location.href = 'auth.html';
    return;
  }

  const profileName = document.getElementById('profileName');
  const profileDisplayName = document.getElementById('profileDisplayName');
  const profileBio = document.getElementById('profileBio');
  const searchInput = document.getElementById('searchInput');
  const filterSelect = document.getElementById('filterSelect');
  const sortSelect = document.getElementById('sortSelect');
  const galleryGrid = document.getElementById('galleryGrid');
  const emptyState = document.getElementById('emptyState');
  const pageInfo = document.getElementById('pageInfo');
  const pagination = document.getElementById('pagination');
  const logoutBtn = document.getElementById('logoutBtn');
  const saveProfileBtn = document.getElementById('saveProfileBtn');
  const fileInput = document.getElementById('fileInput');
  const uploadBtn = document.getElementById('uploadBtn');
  const previewWrap = document.getElementById('previewWrap');
  const previewImage = document.getElementById('previewImage');
  const fileName = document.getElementById('fileName');
  const fileSize = document.getElementById('fileSize');
  const categoryInput = document.getElementById('categoryInput');
  const descriptionInput = document.getElementById('descriptionInput');
  const uploadProgress = document.getElementById('uploadProgress');
  const dropArea = document.getElementById('dropArea');

  let currentPage = 1;
  let selectedFile = null;
  let selectedPreview = '';
  let galleryItems = [];

  const loadProfile = async () => {
    try {
      const data = await apiRequest('/api/profile');
      if (profileName) profileName.textContent = data.displayName || data.name || 'Alicia';
      if (profileDisplayName) profileDisplayName.value = data.displayName || data.name || 'Alicia';
      if (profileBio) profileBio.value = data.bio || 'Visual storyteller crafting elevated digital galleries.';
    } catch (error) {
      console.warn(error.message);
    }
  };

  const renderGallery = () => {
    const term = searchInput?.value.trim().toLowerCase() || '';
    const category = filterSelect?.value || 'all';
    const sort = sortSelect?.value || 'newest';

    const filtered = galleryItems
      .filter((item) => {
        const matchesSearch = !term || item.title.toLowerCase().includes(term) || item.description.toLowerCase().includes(term) || item.category.toLowerCase().includes(term);
        const matchesCategory = category === 'all' || item.category === category;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (sort === 'name') return a.title.localeCompare(b.title);
        if (sort === 'oldest') return a.createdAt - b.createdAt;
        return b.createdAt - a.createdAt;
      });

    const pageSize = 4;
    const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
    currentPage = Math.min(currentPage, pages);
    const start = (currentPage - 1) * pageSize;
    const visibleItems = filtered.slice(start, start + pageSize);

    if (galleryGrid) {
      galleryGrid.innerHTML = '';
      if (!visibleItems.length) {
        emptyState?.classList.remove('hidden');
        pageInfo.textContent = 'No matching entries';
        pagination.innerHTML = '';
        return;
      }
      emptyState?.classList.add('hidden');
      visibleItems.forEach((item) => {
        const card = document.createElement('article');
        card.className = 'card-hover overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/70';
        card.innerHTML = `
          <img loading="lazy" src="${item.image}" alt="${item.title}" class="h-44 w-full object-cover" />
          <div class="p-4">
            <div class="flex items-center justify-between gap-2">
              <h4 class="text-sm font-semibold text-white">${item.title}</h4>
              <span class="rounded-full bg-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300">${item.category}</span>
            </div>
            <p class="mt-2 text-sm leading-6 text-slate-400">${item.description}</p>
          </div>`;
        galleryGrid.appendChild(card);
      });
    }

    pageInfo.textContent = `Showing ${visibleItems.length} of ${filtered.length} entries`;
    if (pagination) {
      pagination.innerHTML = '';
      for (let index = 1; index <= pages; index += 1) {
        const button = document.createElement('button');
        button.className = `rounded-full px-3 py-2 text-sm ${index === currentPage ? 'bg-brand-600 text-white' : 'border border-white/10 bg-white/5 text-slate-300'}`;
        button.textContent = index;
        button.addEventListener('click', () => {
          currentPage = index;
          renderGallery();
        });
        pagination.appendChild(button);
      }
    }
  };

  const refreshGallery = async () => {
    try {
      galleryItems = await loadGallery();
      renderGallery();
    } catch (error) {
      pushNotification(error.message, 'error');
    }
  };

  [searchInput, filterSelect, sortSelect].forEach((element) => {
    element?.addEventListener('input', renderGallery);
    element?.addEventListener('change', renderGallery);
  });

  const updatePreview = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      selectedPreview = reader.result;
      previewImage.src = selectedPreview;
      previewWrap.classList.remove('hidden');
      fileName.textContent = file.name;
      fileSize.textContent = `${(file.size / 1024).toFixed(0)} KB`;
      selectedFile = file;
    };
    reader.readAsDataURL(file);
  };

  fileInput?.addEventListener('change', (event) => updatePreview(event.target.files?.[0]));

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropArea?.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropArea.classList.add('drag-active');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropArea?.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropArea.classList.remove('drag-active');
    });
  });

  dropArea?.addEventListener('drop', (event) => {
    const file = event.dataTransfer?.files?.[0];
    if (file) updatePreview(file);
  });

  uploadBtn?.addEventListener('click', () => {
    if (!selectedFile) {
      pushNotification('Select an image before uploading.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await apiRequest('/api/gallery/upload', {
          method: 'POST',
          body: JSON.stringify({
            title: selectedFile.name.replace(/\.[^/.]+$/, ''),
            category: categoryInput?.value.trim() || 'Editorial',
            description: descriptionInput?.value.trim() || 'Freshly uploaded to the gallery.',
            image: reader.result,
            type: selectedFile.type.startsWith('video') ? 'video' : 'image'
          })
        });
        categoryInput.value = '';
        descriptionInput.value = '';
        fileInput.value = '';
        previewWrap.classList.add('hidden');
        uploadProgress.style.width = '100%';
        pushNotification('Upload complete. Your image is now part of the gallery.', 'success');
        await refreshGallery();
        setTimeout(() => { uploadProgress.style.width = '0%'; }, 200);
      } catch (error) {
        pushNotification(error.message, 'error');
      }
    };
    reader.readAsDataURL(selectedFile);
  });

  saveProfileBtn?.addEventListener('click', async () => {
    try {
      await apiRequest('/api/profile', {
        method: 'POST',
        body: JSON.stringify({
          displayName: profileDisplayName?.value.trim() || 'Alicia',
          bio: profileBio?.value.trim() || 'Visual storyteller crafting elevated digital galleries.'
        })
      });
      if (profileName) profileName.textContent = profileDisplayName?.value.trim() || 'Alicia';
      pushNotification('Profile saved successfully.', 'success');
    } catch (error) {
      pushNotification(error.message, 'error');
    }
  });

  logoutBtn?.addEventListener('click', async () => {
    await apiRequest('/api/logout', { method: 'POST' });
    window.location.href = 'index.html';
  });

  await loadProfile();
  await refreshGallery();
}

if (document.getElementById('adminLoginForm')) {
  initializeAdminLogin();
}

if (document.getElementById('adminGalleryGrid')) {
  initializeAdminDashboard();
}

if (document.getElementById('userGalleryGrid')) {
  initializeUserDashboard();
}

if (document.getElementById('authForm')) {
  initializeAuth();
}

if (document.getElementById('galleryGrid')) {
  initializeDashboard();
}
