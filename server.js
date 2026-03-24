const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

const DATA_FILE = path.join(__dirname, 'data', 'projects.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.html') {
      cb(null, true);
    } else {
      cb(new Error('HTML 파일만 업로드 가능합니다.'));
    }
  }
});

function readData() {
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw);
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// GET all projects + prototypes
app.get('/api/projects', (req, res) => {
  const data = readData();
  res.json(data);
});

// POST create project
app.post('/api/projects', (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: '프로젝트 이름은 필수입니다.' });

  const data = readData();
  const project = {
    id: uuidv4(),
    name,
    description: description || '',
    createdAt: new Date().toISOString().slice(0, 10)
  };
  data.projects.push(project);
  writeData(data);
  res.status(201).json(project);
});

// DELETE project
app.delete('/api/projects/:id', (req, res) => {
  const data = readData();
  const projectId = req.params.id;

  const projectIndex = data.projects.findIndex(p => p.id === projectId);
  if (projectIndex === -1) return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });

  // Delete associated prototypes and their files
  const relatedPrototypes = data.prototypes.filter(p => p.projectId === projectId);
  for (const proto of relatedPrototypes) {
    const filePath = path.join(UPLOADS_DIR, proto.fileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  data.prototypes = data.prototypes.filter(p => p.projectId !== projectId);
  data.projects.splice(projectIndex, 1);
  writeData(data);
  res.json({ success: true });
});

// POST create prototype (with file upload)
app.post('/api/prototypes', upload.single('file'), (req, res) => {
  const { name, projectId, figmaUrl } = req.body;
  if (!name || !projectId) return res.status(400).json({ error: '이름과 프로젝트는 필수입니다.' });
  if (!req.file) return res.status(400).json({ error: 'HTML 파일을 업로드해주세요.' });

  const data = readData();
  const project = data.projects.find(p => p.id === projectId);
  if (!project) return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });

  const prototype = {
    id: uuidv4(),
    projectId,
    name,
    fileName: req.file.filename,
    figmaUrl: figmaUrl || '',
    createdAt: new Date().toISOString().slice(0, 10)
  };
  data.prototypes.push(prototype);
  writeData(data);
  res.status(201).json(prototype);
});

// DELETE prototype
app.delete('/api/prototypes/:id', (req, res) => {
  const data = readData();
  const protoIndex = data.prototypes.findIndex(p => p.id === req.params.id);
  if (protoIndex === -1) return res.status(404).json({ error: '프로토타입을 찾을 수 없습니다.' });

  const proto = data.prototypes[protoIndex];
  const filePath = path.join(UPLOADS_DIR, proto.fileName);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  data.prototypes.splice(protoIndex, 1);
  writeData(data);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Prototype Portal running at http://localhost:${PORT}`);
});
