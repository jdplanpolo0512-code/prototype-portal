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

  document.getElementById('logout-btn').addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });

  document.getElementById('project-form').addEventListener('submit', addProject);
  document.getElementById('prototype-form').addEventListener('submit', addPrototype);
  document.getElementById('tag-form').addEventListener('submit', addTag);

  // Color dot selection
  document.getElementById('color-options').addEventListener('click', (e) => {
    const dot = e.target.closest('.color-dot');
    if (!dot) return;
    document.querySelectorAll('#color-options .color-dot').forEach(d => d.classList.remove('selected'));
    dot.classList.add('selected');
  });

  // Event delegation for dynamic buttons
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (id && !Storage.isValidId(id)) return;

    switch (action) {
      case 'delete-tag': deleteTag(id); break;
      case 'delete-project': deleteProject(id); break;
      case 'edit-project': editProject(id); break;
      case 'delete-prototype': deletePrototype(id); break;
      case 'close-modal': closeEditModal(); break;
      case 'save-project': saveProject(id); break;
      case 'toggle-tag': btn.classList.toggle('selected'); break;
      case 'switch-tab': switchAdminTab(btn.dataset.tab); break;
    }
  });
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

function switchAdminTab(tab) {
  const allowed = ['projects', 'prototypes', 'tags'];
  if (!allowed.includes(tab)) return;
  document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector(`.admin-tab-btn[data-tab="${tab}"]`).classList.add('active');
  document.getElementById(`admin-tab-${tab}`).classList.add('active');
}

let currentData = { projects: [], prototypes: [], tags: [] };

function loadData() {
  currentData = Storage.load();
  renderProjects();
  renderPrototypes();
  renderProjectSelect();
  renderTags();
  renderProjectTagSelect();
}

// ============ TAGS ============
function addTag(e) {
  e.preventDefault();
  const name = document.getElementById('tag-name').value.trim();
  if (!name || name.length > 30) return;

  const selectedDot = document.querySelector('#color-options .color-dot.selected');
  const color = sanitizeColor(selectedDot ? selectedDot.dataset.color : '');

  const data = Storage.load();
  data.tags.push({ id: Storage.generateId(), name, color });
  Storage.save(data);

  document.getElementById('tag-name').value = '';
  loadData();
}

function deleteTag(id) {
  if (!confirm('이 태그를 삭제하시겠습니까? 프로젝트에서도 제거됩니다.')) return;
  const data = Storage.load();
  data.tags = data.tags.filter(t => t.id !== id);
  data.projects.forEach(p => {
    if (p.tagIds) p.tagIds = p.tagIds.filter(tid => tid !== id);
  });
  Storage.save(data);
  loadData();
}

function renderTags() {
  const list = document.getElementById('tag-list');
  const tags = currentData.tags;
  if (tags.length === 0) {
    list.innerHTML = '<li style="color:#9ca3af;font-size:13px;">등록된 태그가 없습니다.</li>';
    return;
  }
  list.innerHTML = tags.map(t => {
    const usedCount = currentData.projects.filter(p => (p.tagIds || []).includes(t.id)).length;
    return `
      <li>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="tag-badge" style="background:${sanitizeColor(t.color)}">${escapeHtml(t.name)}</span>
          <span style="color:#9ca3af;font-size:12px;">${usedCount}개 프로젝트에서 사용 중</span>
        </div>
        <button class="btn btn-danger" data-action="delete-tag" data-id="${escapeAttr(t.id)}">삭제</button>
      </li>
    `;
  }).join('');
}

function renderProjectTagSelect() {
  const area = document.getElementById('project-tags-select');
  const tags = currentData.tags;
  if (tags.length === 0) {
    area.innerHTML = '<p style="color:#9ca3af;font-size:13px;">태그가 없습니다. 제품 태그 관리에서 먼저 추가해주세요.</p>';
    return;
  }
  area.innerHTML = tags.map(t =>
    `<span class="tag-chip" data-action="toggle-tag" data-tag-id="${escapeAttr(t.id)}" style="background:${sanitizeColor(t.color)}">${escapeHtml(t.name)}</span>`
  ).join('');
}

function getSelectedTagIds() {
  return Array.from(document.querySelectorAll('#project-tags-select .tag-chip.selected'))
    .map(el => el.dataset.tagId)
    .filter(id => Storage.isValidId(id));
}

// ============ PROJECTS ============
function addProject(e) {
  e.preventDefault();
  const name = document.getElementById('project-name').value.trim();
  const description = document.getElementById('project-desc').value.trim();
  if (!name || name.length > 100) return;
  if (description.length > 200) return;

  const tagIds = getSelectedTagIds();

  const data = Storage.load();
  data.projects.push({
    id: Storage.generateId(),
    name,
    description,
    tagIds,
    createdAt: new Date().toISOString().slice(0, 10)
  });
  Storage.save(data);

  document.getElementById('project-name').value = '';
  document.getElementById('project-desc').value = '';
  loadData();
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

function editProject(id) {
  const data = Storage.load();
  const project = data.projects.find(p => p.id === id);
  if (!project) return;

  const tags = data.tags;
  const tagChips = tags.map(t => {
    const selected = (project.tagIds || []).includes(t.id) ? 'selected' : '';
    return `<span class="tag-chip ${selected}" data-action="toggle-tag" data-tag-id="${escapeAttr(t.id)}" style="background:${sanitizeColor(t.color)}">${escapeHtml(t.name)}</span>`;
  }).join('');

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'edit-modal';
  modal.innerHTML = `
    <div class="modal-box">
      <h3>프로젝트 수정</h3>
      <div class="form-group" style="margin-bottom:12px;">
        <label>프로젝트 이름</label>
        <input type="text" id="edit-name" value="${escapeAttr(project.name)}" maxlength="100">
      </div>
      <div class="form-group" style="margin-bottom:12px;">
        <label>설명</label>
        <input type="text" id="edit-desc" value="${escapeAttr(project.description || '')}" maxlength="200">
      </div>
      <div class="form-group" style="margin-bottom:12px;">
        <label>제품 태그</label>
        <div id="edit-tags-select" class="tag-select-area">
          ${tags.length === 0 ? '<p style="color:#9ca3af;font-size:13px;">등록된 태그가 없습니다.</p>' : tagChips}
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" data-action="close-modal">취소</button>
        <button class="btn btn-primary" data-action="save-project" data-id="${escapeAttr(id)}">저장</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function closeEditModal() {
  const modal = document.getElementById('edit-modal');
  if (modal) modal.remove();
}

function saveProject(id) {
  const name = document.getElementById('edit-name').value.trim();
  const description = document.getElementById('edit-desc').value.trim();
  const tagIds = Array.from(document.querySelectorAll('#edit-tags-select .tag-chip.selected'))
    .map(el => el.dataset.tagId)
    .filter(tid => Storage.isValidId(tid));

  if (!name || name.length > 100) return;

  const data = Storage.load();
  const project = data.projects.find(p => p.id === id);
  if (!project) return;

  project.name = name;
  project.description = description;
  project.tagIds = tagIds;
  Storage.save(data);

  closeEditModal();
  loadData();
}

function renderProjects() {
  const list = document.getElementById('project-list');
  if (currentData.projects.length === 0) {
    list.innerHTML = '<li style="color:#9ca3af;font-size:13px;">등록된 프로젝트가 없습니다.</li>';
    return;
  }

  const tagMapLocal = {};
  currentData.tags.forEach(t => { tagMapLocal[t.id] = t; });

  list.innerHTML = currentData.projects.map(p => {
    const protoCount = currentData.prototypes.filter(pt => pt.projectId === p.id).length;
    const tagsHtml = (p.tagIds || []).map(tid => {
      const tag = tagMapLocal[tid];
      return tag ? `<span class="tag-badge" style="background:${sanitizeColor(tag.color)}">${escapeHtml(tag.name)}</span>` : '';
    }).join('');

    return `
      <li>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <strong>${escapeHtml(p.name)}</strong>
          ${p.description ? `<span style="color:#9ca3af;font-size:13px;">${escapeHtml(p.description)}</span>` : ''}
          ${tagsHtml}
          <span class="badge" style="margin-left:4px;">${protoCount}개 프로토타입</span>
        </div>
        <div class="btn-group">
          <button class="btn btn-edit" data-action="edit-project" data-id="${escapeAttr(p.id)}">수정</button>
          <button class="btn btn-danger" data-action="delete-project" data-id="${escapeAttr(p.id)}">삭제</button>
        </div>
      </li>
    `;
  }).join('');
}

// ============ PROTOTYPES ============
function renderPrototypes() {
  const list = document.getElementById('prototype-list');
  if (currentData.prototypes.length === 0) {
    list.innerHTML = '<li style="color:#9ca3af;font-size:13px;">등록된 프로토타입이 없습니다.</li>';
    return;
  }

  const projectMap = {};
  currentData.projects.forEach(p => { projectMap[p.id] = p.name; });

  list.innerHTML = currentData.prototypes.map(pt => {
    const figmaHref = sanitizeUrl(pt.figmaUrl);
    return `
    <li>
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="badge">${escapeHtml(projectMap[pt.projectId] || '-')}</span>
        <strong>${escapeHtml(pt.name)}</strong>
        <span style="color:#9ca3af;font-size:13px;">${escapeHtml(pt.fileName)}</span>
        <span style="color:#9ca3af;font-size:12px;">${escapeHtml(pt.createdAt)}</span>
        ${figmaHref ? `<a href="${escapeAttr(figmaHref)}" target="_blank" rel="noopener noreferrer" style="font-size:12px;color:#2563eb;">Figma</a>` : ''}
      </div>
      <button class="btn btn-danger" data-action="delete-prototype" data-id="${escapeAttr(pt.id)}">삭제</button>
    </li>
  `}).join('');
}

function renderProjectSelect() {
  const select = document.getElementById('proto-project');
  select.innerHTML = '<option value="">프로젝트 선택</option>' +
    currentData.projects.map(p => `<option value="${escapeAttr(p.id)}">${escapeHtml(p.name)}</option>`).join('');
}

function addPrototype(e) {
  e.preventDefault();
  const projectId = document.getElementById('proto-project').value;
  const name = document.getElementById('proto-name').value.trim();
  const fileInput = document.getElementById('proto-file');
  const file = fileInput.files[0];
  const figmaUrl = sanitizeUrl(document.getElementById('proto-figma').value.trim());

  if (!projectId || !Storage.isValidId(projectId)) return;
  if (!name || name.length > 100) return;
  if (!file) return;

  if (file.size > MAX_FILE_SIZE) {
    alert(`파일 크기가 너무 큽니다. 최대 ${MAX_FILE_SIZE / 1024 / 1024}MB까지 업로드 가능합니다.`);
    return;
  }

  const ext = file.name.split('.').pop().toLowerCase();
  if (ext !== 'html' && ext !== 'htm') {
    alert('HTML 파일만 업로드 가능합니다.');
    return;
  }

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

function deletePrototype(id) {
  if (!confirm('이 프로토타입을 삭제하시겠습니까?')) return;
  Storage.deleteFile(id);
  const data = Storage.load();
  data.prototypes = data.prototypes.filter(p => p.id !== id);
  Storage.save(data);
  loadData();
}
