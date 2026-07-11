require('dotenv').config();

const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');

const app = express();
app.use('/css', express.static('css'));
app.use('/js', express.static('js'));
app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;
const dataDir = path.join(__dirname, 'data');
const usersFile = path.join(dataDir, 'users.json');
const galleryFile = path.join(dataDir, 'gallery.json');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'welkinzdevera8@gmail.com';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'Loveyy';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'March162024';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-secret-to-a-strong-one';

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) {
      return fallback;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content || 'null') || fallback;
  } catch (error) {
    console.error(`Failed to read ${filePath}:`, error);
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

async function ensureData() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(usersFile)) {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    writeJson(usersFile, [
      {
        id: 'admin',
        name: 'Administrator',
        email: ADMIN_EMAIL,
        username: ADMIN_USERNAME,
        password: passwordHash,
        role: 'admin',
        displayName: 'Admin',
        bio: 'Secure administrator account.'
      }
    ]);
  }

  if (!fs.existsSync(galleryFile)) {
    writeJson(galleryFile, [
      {
        id: '1',
        title: 'Editorial Set',
        category: 'Editorial',
        description: 'A curated collection with cinematic lighting.',
        image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80',
        type: 'image',
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2
      },
      {
        id: '2',
        title: 'Travel Notes',
        category: 'Travel',
        description: 'Warm tones and wide-open landscapes.',
        image: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=900&q=80',
        type: 'image',
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5
      },
      {
        id: '3',
        title: 'Studio Portraits',
        category: 'Portraits',
        description: 'Thoughtful framing with intentional contrast.',
        image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80',
        type: 'image',
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 8
      }
    ]);
  }
}

function findUserByEmail(email) {
  const users = readJson(usersFile, []);
  return users.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

function findUserByUsername(username) {
  const users = readJson(usersFile, []);
  return users.find((user) => user.username.toLowerCase() === username.toLowerCase());
}

function findUserById(id) {
  const users = readJson(usersFile, []);
  return users.find((user) => user.id === id);
}

function authRequired(req, res, next) {
  if (req.session.user) {
    return next();
  }
  return res.status(401).json({ error: 'Not authenticated' });
}

function adminRequired(req, res, next) {
  if (req.session.user?.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Admin access required' });
}

app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    name: 'atelier.sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 3
    }
  })
);

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  req.session.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  };

  return res.json({ name: user.name, role: user.role });
});

app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  if (findUserByEmail(email)) {
    return res.status(409).json({ error: 'Email is already registered.' });
  }

  const users = readJson(usersFile, []);
  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = {
    id: Date.now().toString(),
    name,
    email,
    password: passwordHash,
    role: 'user',
    displayName: name,
    bio: ''
  };
  users.push(newUser);
  writeJson(usersFile, users);

  req.session.user = {
    id: newUser.id,
    email: newUser.email,
    name: newUser.name,
    role: newUser.role
  };

  return res.json({ name: newUser.name, role: newUser.role });
});

app.post('/api/forgot', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }
  return res.json({ message: 'If this email exists, a recovery link has been sent.' });
});

app.post('/api/admin-login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const user = findUserByUsername(username);
  if (!user || user.role !== 'admin') {
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }

  req.session.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  };

  return res.json({ name: user.name, role: user.role });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('atelier.sid');
    res.json({ message: 'Logged out successfully.' });
  });
});

app.get('/api/session', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  return res.json({ user: req.session.user });
});

app.get('/api/gallery', authRequired, (req, res) => {
  const allItems = readJson(galleryFile, []);
  return res.json(allItems);
});

app.post('/api/gallery/upload', authRequired, (req, res) => {
  const { title, category, description, image, type } = req.body;
  if (!title || !image) {
    return res.status(400).json({ error: 'Title and image are required.' });
  }

  const items = readJson(galleryFile, []);
  const item = {
    id: Date.now().toString(),
    title,
    category: category || 'Editorial',
    description: description || 'Uploaded to the gallery.',
    image,
    type: type || 'image',
    createdAt: Date.now()
  };
  items.unshift(item);
  writeJson(galleryFile, items);

  return res.json({ success: true, item });
});

app.post('/api/gallery/delete', adminRequired, (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Item id is required.' });
  }

  const items = readJson(galleryFile, []);
  const filtered = items.filter((item) => item.id !== id);
  writeJson(galleryFile, filtered);

  return res.json({ success: true });
});

app.get('/api/profile', authRequired, (req, res) => {
  const user = findUserById(req.session.user.id);
  if (!user) {
    return res.status(404).json({ error: 'Profile not found.' });
  }
  return res.json({
    name: user.name,
    email: user.email,
    role: user.role,
    displayName: user.displayName || user.name,
    bio: user.bio || ''
  });
});

app.post('/api/profile', authRequired, (req, res) => {
  const { displayName, bio } = req.body;
  const users = readJson(usersFile, []);
  const userIndex = users.findIndex((u) => u.id === req.session.user.id);
  if (userIndex < 0) {
    return res.status(404).json({ error: 'Profile not found.' });
  }

  users[userIndex].displayName = displayName || users[userIndex].name;
  users[userIndex].bio = bio || '';
  writeJson(usersFile, users);

  return res.json({ success: true });
});

app.use(express.static(path.join(__dirname, '.')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

ensureData().then(() => {
  app.listen(PORT, () => {
    console.log(`Atelier Gallery backend listening on http://localhost:${PORT}`);
  });
});
