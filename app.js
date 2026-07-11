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
            <p class="mt-1 text-xs text-slate-400">${item.description || ''}</p>
          </div>
          <button class="delete-btn rounded-full border border-rose-500/30 px-2.5 py-1 text-xs text-rose-300" data-id="${item.id}">Delete</button>
        </div>`;
      galleryGrid.appendChild(card);
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        try {
          await apiRequest('/api/gallery/delete', {
            method: 'POST',
            body: JSON.stringify({ id })
          });
          pushNotification('Item deleted successfully', 'success');
          await refreshGallery();
        } catch (err) {
          pushNotification(err.message, 'error');
        }
      });
    });
  };

  const refreshGallery = async () => {
    try {
      galleryItems = await loadGallery();
      renderAdminGallery();
    } catch (err) {
      pushNotification('Failed to load gallery items', 'error');
    }
  };

  refreshButton?.addEventListener('click', refreshGallery);

  uploadButton?.addEventListener('click', async () => {
    const title = titleInput?.value.trim();
    const type = typeInput?.value || 'image';
    const description = descriptionInput?.value.trim() || '';
    
    if (!title) {
      pushNotification('Please enter a title.', 'error');
      return;
    }

    let finalImageUrl = "";
    
    if (fileInput && fileInput.files && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      finalImageUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
      });
    } else if (fileInput && fileInput.value) {
      finalImageUrl = fileInput.value.trim();
    }

    if (!finalImageUrl) {
      pushNotification('Please select a file or provide an image link.', 'error');
      return;
    }

