const ADMIN_HASH = 'b0af13f7bca765b431e4beb5121c96f2232575cc766248204a7d99fb9809b3e8';

async function sha256(text) {
  const encoded = new TextEncoder().encode(text);
  const buffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('admin-auth') === 'true') {
    showAdmin();
  }

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('login-id').value.trim();
    const pw = document.getElementById('login-pw').value;
    const hash = await sha256(id + ':' + pw);

    if (hash === ADMIN_HASH) {
      sessionStorage.setItem('admin-auth', 'true');
      showAdmin();
    } else {
      document.getElementById('login-error').style.display = 'block';
    }
  });

  document.getElementById('project-form').addEventListener('submit', addProject);
  document.getElementById('prototype-form').addEventListener('submit', addPrototype);
});

function showAdmin() {
  document.getElementById('login-overlay').style.display = 'none';
  document.getElementById('admin-content').style.display = 'block';
  document.getElementById('logout-btn').style.display = 'inline';
  loadData();
}

function logout() {
  sessionStorage.removeItem('admin-auth');
  location.reload();
}

let currentData = { projects: [], prototypes: [] };

function loadData() {
  currentData = Storage.load();
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

function addProject(e) {
  e.preventDefault();
  const name = document.getElementById('project-name').value.trim();
  const description = document.getElementById('project-desc').value.trim();
  if (!name) return;

  const data = Storage.load();
  data.projects.push({
    id: Storage.generateId(),
    name,
    description,
    createdAt: new Date().toISOString().slice(0, 10)
  });
  Storage.save(data);

  document.getElementById('project-name').value = '';
  document.getElementById('project-desc').value = '';
  loadData();
}

function addPrototype(e) {
  e.preventDefault();
  const projectId = document.getElementById('proto-project').value;
  const name = document.getElementById('proto-name').value.trim();
  const fileInput = document.getElementById('proto-file');
  const file = fileInput.files[0];
  const figmaUrl = document.getElementById('proto-figma').value.trim();

  if (!projectId || !name || !file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    const htmlContent = evt.target.result;
    const id = Storage.generateId();

    try {
      Storage.saveFile(id, htmlContent);
    } catch (err) {
      alert('파일 저장 실패: 브라우저 저장 용량을 초과했습니다. 기존 프로토타입을 삭제 후 다시 시도해주세요.');
      return;
    }

    const data = Storage.load();
    data.prototypes.push({
      id,
      projectId,
      name,
      fileName: file.name,
      figmaUrl,
      createdAt: new Date().toISOString().slice(0, 10)
    });
    Storage.save(data);

    document.getElementById('prototype-form').reset();
    loadData();
  };
  reader.readAsText(file);
}

function deleteProject(id) {
  if (!confirm('이 프로젝트와 관련 프로토타입이 모두 삭제됩니다. 계속하시겠습니까?')) return;
  const data = Storage.load();
  data.prototypes.filter(p => p.projectId === id).forEach(p => Storage.deleteFile(p.id));
  data.projects = data.projects.filter(p => p.id !== id);
  data.prototypes = data.prototypes.filter(p => p.projectId !== id);
  Storage.save(data);
  loadData();
}

function deletePrototype(id) {
  if (!confirm('이 프로토타입을 삭제하시겠습니까?')) return;
  Storage.deleteFile(id);
  const data = Storage.load();
  data.prototypes = data.prototypes.filter(p => p.id !== id);
  Storage.save(data);
  loadData();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
