const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

const DIAS = ['miercoles', 'viernes', 'domingo', 'vigilias'];
// Guardar todo en uploads/ para que un solo volumen persista datos y archivos
const MIEMBROS_FILE = path.join(__dirname, 'uploads', '_data', 'miembros.json');

// ── Crear carpetas necesarias ──────────────────────────────────────────────
[
  ...DIAS.map(d => path.join(__dirname, 'uploads', d)),
  path.join(__dirname, 'uploads', 'fotos'),
  path.join(__dirname, 'uploads', '_data')
].forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); });

if (!fs.existsSync(MIEMBROS_FILE)) fs.writeFileSync(MIEMBROS_FILE, '[]', 'utf8');

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/logo', express.static(path.join(__dirname, 'logo')));

// ── Helpers miembros ───────────────────────────────────────────────────────
function leerMiembros() {
  try { return JSON.parse(fs.readFileSync(MIEMBROS_FILE, 'utf8')); }
  catch { return []; }
}
function guardarMiembros(data) {
  fs.writeFileSync(MIEMBROS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ── Multer PDFs ────────────────────────────────────────────────────────────
const storagePDF = multer.diskStorage({
  destination: (req, file, cb) => {
    const dia = req.params.dia;
    if (!DIAS.includes(dia)) return cb(new Error('Día no válido'));
    cb(null, path.join(__dirname, 'uploads', dia));
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ.\-_ ]/g, '_').trim();
    const dest = path.join(__dirname, 'uploads', req.params.dia, safeName);
    if (fs.existsSync(dest)) {
      const ext = path.extname(safeName);
      cb(null, `${path.basename(safeName, ext)}_${Date.now()}${ext}`);
    } else {
      cb(null, safeName);
    }
  }
});
const uploadPDF = multer({
  storage: storagePDF,
  fileFilter: (req, file, cb) =>
    file.mimetype === 'application/pdf' ? cb(null, true) : cb(new Error('Solo PDFs')),
  limits: { fileSize: 20 * 1024 * 1024 }
});

// ── Multer Fotos ───────────────────────────────────────────────────────────
const FOTO_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const storageFoto = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads', 'fotos')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${Date.now()}_${randomUUID()}${ext}`);
  }
});
const uploadFoto = multer({
  storage: storageFoto,
  fileFilter: (req, file, cb) =>
    FOTO_MIMES.includes(file.mimetype) ? cb(null, true) : cb(new Error('Solo imágenes JPG/PNG/WEBP')),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// ══════════════════════════════════════════════════════════════════════════
// RUTAS: PDFs
// ══════════════════════════════════════════════════════════════════════════

app.post('/api/upload/:dia', (req, res) => {
  if (!DIAS.includes(req.params.dia)) return res.status(400).json({ error: 'Día no válido' });
  uploadPDF.single('pdf')(req, res, err => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });
    res.json({ success: true, filename: req.file.filename });
  });
});

app.get('/api/archivos/:dia', (req, res) => {
  if (!DIAS.includes(req.params.dia)) return res.status(400).json({ error: 'Día no válido' });
  fs.readdir(path.join(__dirname, 'uploads', req.params.dia), (err, files) => {
    if (err) return res.status(500).json({ error: 'Error leyendo archivos' });
    res.json(files.filter(f => f.toLowerCase().endsWith('.pdf')));
  });
});

app.delete('/api/archivos/:dia/:filename', (req, res) => {
  if (!DIAS.includes(req.params.dia)) return res.status(400).json({ error: 'Día no válido' });
  const safeName = path.basename(req.params.filename);
  const filePath = path.join(__dirname, 'uploads', req.params.dia, safeName);
  const expectedDir = path.resolve(__dirname, 'uploads', req.params.dia);
  if (!path.resolve(filePath).startsWith(expectedDir)) return res.status(400).json({ error: 'Ruta no permitida' });
  fs.unlink(filePath, err => {
    if (err) return res.status(500).json({ error: 'No se pudo eliminar' });
    res.json({ success: true });
  });
});

// ══════════════════════════════════════════════════════════════════════════
// RUTAS: Miembros
// ══════════════════════════════════════════════════════════════════════════

app.get('/api/miembros', (req, res) => {
  res.json(leerMiembros());
});

app.post('/api/miembros', (req, res) => {
  uploadFoto.single('foto')(req, res, err => {
    if (err) return res.status(400).json({ error: err.message });

    const nombre = (req.body.nombre || '').trim();
    const cargo = (req.body.cargo || '').trim();
    const instrumento = (req.body.instrumento || '').trim();

    if (!nombre || !cargo) return res.status(400).json({ error: 'Nombre y cargo son requeridos' });

    const miembros = leerMiembros();
    const nuevo = {
      id: randomUUID(),
      nombre,
      cargo,
      instrumento,
      foto: req.file ? req.file.filename : null,
      creado: new Date().toISOString()
    };
    miembros.push(nuevo);
    guardarMiembros(miembros);
    res.json(nuevo);
  });
});

app.put('/api/miembros/:id', (req, res) => {
  uploadFoto.single('foto')(req, res, err => {
    if (err) return res.status(400).json({ error: err.message });

    const { id } = req.params;
    const nombre = (req.body.nombre || '').trim();
    const cargo = (req.body.cargo || '').trim();
    const instrumento = (req.body.instrumento || '').trim();

    if (!nombre || !cargo) return res.status(400).json({ error: 'Nombre y cargo son requeridos' });

    const miembros = leerMiembros();
    const idx = miembros.findIndex(m => m.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Miembro no encontrado' });

    // Si hay foto nueva, borrar la anterior
    if (req.file && miembros[idx].foto) {
      const oldFoto = path.join(__dirname, 'uploads', 'fotos', miembros[idx].foto);
      if (fs.existsSync(oldFoto)) fs.unlink(oldFoto, () => {});
    }

    miembros[idx] = {
      ...miembros[idx],
      nombre,
      cargo,
      instrumento,
      foto: req.file ? req.file.filename : miembros[idx].foto
    };
    guardarMiembros(miembros);
    res.json(miembros[idx]);
  });
});

app.delete('/api/miembros/:id', (req, res) => {
  const miembros = leerMiembros();
  const idx = miembros.findIndex(m => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Miembro no encontrado' });

  if (miembros[idx].foto) {
    const fotoPath = path.join(__dirname, 'uploads', 'fotos', miembros[idx].foto);
    if (fs.existsSync(fotoPath)) fs.unlink(fotoPath, () => {});
  }
  miembros.splice(idx, 1);
  guardarMiembros(miembros);
  res.json({ success: true });
});

// ── Iniciar servidor ───────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`Servidor GDA corriendo en http://localhost:${PORT}`));
