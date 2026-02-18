require('dotenv').config();

const express = require('express');
const session = require('express-session');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Body parsing
app.use(express.urlencoded({ extended: true }));

// Sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 2 }
}));

// Multer config
const storage = multer.diskStorage({
  destination: path.join(__dirname, 'uploads'),
  filename: (req, file, cb) => {
    const unique = crypto.randomBytes(8).toString('hex');
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG and PNG images are allowed'));
    }
  }
});

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  res.redirect('/admin');
}

// === Public Routes ===

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/disclaimer', (req, res) => {
  res.render('disclaimer');
});

app.get('/testimonials', (req, res) => {
  res.render('testimonials');
});

app.post('/submit', (req, res, next) => {
  upload.single('photo')(req, res, (err) => {
    if (err) {
      return res.render('index', { error: err.message });
    }
    if (!req.file) {
      return res.render('index', { error: 'Please upload a photo of the artwork' });
    }

    const secretCode = crypto.randomBytes(8).toString('hex');

    try {
      db.insertSubmission.run({
        secret_code: secretCode,
        photo_path: '/uploads/' + req.file.filename,
        artist_name: req.body.artist_name,
        title: req.body.title,
        date: req.body.date,
        medium: req.body.medium,
        dimensions: req.body.dimensions,
        edition_size: req.body.edition_size || null,
        provenance: req.body.provenance || null,
        exhibition_history: req.body.exhibition_history || null,
        purchase_price: req.body.purchase_price || null,
      });
      res.redirect('/submitted/' + secretCode);
    } catch (e) {
      console.error(e);
      res.render('index', { error: 'Something went wrong. Please try again.' });
    }
  });
});

app.get('/submitted/:code', (req, res) => {
  res.render('submitted', { code: req.params.code });
});

app.get('/check', (req, res) => {
  res.render('check');
});

app.get('/check/:code', (req, res) => {
  const submission = db.getByCode.get(req.params.code);
  if (!submission) {
    return res.render('check', { error: 'No submission found with that code' });
  }
  res.render('result', { submission });
});

// === Admin Routes ===

app.get('/admin', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.redirect('/admin/dashboard');
  }
  res.render('admin-login');
});

app.post('/admin/login', (req, res) => {
  if (req.body.password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    res.redirect('/admin/dashboard');
  } else {
    res.render('admin-login', { error: 'Invalid password' });
  }
});

app.get('/admin/dashboard', requireAdmin, (req, res) => {
  const search = req.query.search || '';
  const submissions = search
    ? db.searchByArtist.all(search)
    : db.getAll.all();
  res.render('admin', { submissions, search });
});

app.get('/admin/submission/:id', requireAdmin, (req, res) => {
  const submission = db.getById.get(req.params.id);
  if (!submission) {
    return res.redirect('/admin/dashboard');
  }
  res.render('admin-detail', { submission });
});

app.post('/admin/appraise/:id', requireAdmin, (req, res) => {
  const { appraisal, estimate_low, estimate_high } = req.body;
  db.updateAppraisal.run(appraisal, estimate_low, estimate_high, req.params.id);
  res.redirect('/admin/dashboard');
});

app.listen(PORT, () => {
  console.log(`Informal Art Consultants running at http://localhost:${PORT}`);
});
