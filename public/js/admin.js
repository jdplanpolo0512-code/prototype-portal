document.addEventListener('DOMContentLoaded', () => {
  loadData();

  document.getElementById('project-form').addEventListener('submit', addProject);
  document.getElementById('prototype-form').addEventListener('submit', addPrototype);
});

let currentData = { projects: [], prototypes: [] };

async function loadData() {
  const res = await fetch('/api/projects');
  currentData = await res.json();
  renderProjects();
  renderPrototypes();
  renderProjectSelect();
}

function renderProjects() {
  const list = document.getElementById('project-list');
  if (currentData.projects.length === 0) {
    list.innerHTML = '<li style="color:#86868b;font-size:13px;">등록된 프로젝트가 없습니다.</li>';
    return;
  }
  list.innerHTML = currentData.projects.map(p => {
    const protoCount = currentData.prototypes.filter(pt => pt.projectId === p.id).length;
    return `
      <li>
        <div>
          <strong>${escapeHtml(p.name)}</strong>
          ${p.description ? `<span style="color:#86868b;margin-left:8px;font-size:13px;">${escapeHtml(p.description)}</span>` : ''}
          <span class="badge" style="margin-left:8px;">${protoCount}개 프로토타입</span>
        </div>
        <button class="btn btn-danger" onclick="deleteProject('${p.id}')">삭제</button>
      </li>
    `;
  }).join('');
}

function renderPrototypes() {
  const list = document.getElementById('prototype-list');
  if (currentData.prototypes.length === 0) {
    list.innerHTML = '<li style="color:#86868b;font-size:13px;">등록된 프로토타입이 없습니다.</li>';
    return;
  }

  const projectMap = {};
  currentData.projects.forEach(p => { projectMap[p.id] = p.name; });

  list.innerHTML = currentData.prototypes.map(pt => `
    <li>
      <div>
        <span class="badge">${escapeHtml(projectMap[pt.projectId] || '-')}</span>
        <strong style="margin-left:8px;">${escapeHtml(pt.name)}</strong>
        <span style="color:#86868b;margin-left:8px;font-size:13px;">${pt.createdAt}</span>
        ${pt.figmaUrl ? `<a href="${escapeHtml(pt.figmaUrl)}" target="_blank" style="margin-left:8px;font-size:12px;color:#0071e3;">Figma</a>` : ''}
      </div>
      <button class="btn btn-danger" onclick="deletePrototype('${pt.id}')">삭제</button>
    </li>
  `).join('');
}

function renderProjectSelect() {
  const select = document.getElementById('proto-project');
  select.innerHTML = '<option value="">프로젝트 선택</option>' +
    currentData.projects.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
}

async function addProject(e) {
  e.preventDefault();
  const name = document.getElementById('project-name').value.trim();
  const description = document.getElementById('project-desc').value.trim();
  if (!name) return;

  await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description })
  });

  document.getElementById('project-name').value = '';
  document.getElementById('project-desc').value = '';
  loadData();
}

async function addPrototype(e) {
  e.preventDefault();
  const projectId = document.getElementById('proto-project').value;
  const name = document.getElementById('proto-name').value.trim();
  const file = document.getElementById('proto-file').files[0];
  const figmaUrl = document.getElementById('proto-figma').value.trim();

  if (!projectId || !name || !file) return;

  const formData = new FormData();
  formData.append('projectId', projectId);
  formData.append('name', name);
  formData.append('file', file);
  if (figmaUrl) formData.append('figmaUrl', figmaUrl);

  await fetch('/api/prototypes', {
    method: 'POST',
    body: formData
  });

  document.getElementById('prototype-form').reset();
  loadData();
}

async function deleteProject(id) {
  if (!confirm('이 프로젝트와 관련 프로토타입이 모두 삭제됩니다. 계속하시겠습니까?')) return;
  await fetch(`/api/projects/${id}`, { method: 'DELETE' });
  loadData();
}

async function deletePrototype(id) {
  if (!confirm('이 프로토타입을 삭제하시겠습니까?')) return;
  await fetch(`/api/prototypes/${id}`, { method: 'DELETE' });
  loadData();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
