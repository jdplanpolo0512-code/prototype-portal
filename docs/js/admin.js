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
  document.getElementById('tag-form').addEventListener('submit', addTag);

  // Color dot selection
  document.getElementById('color-options').addEventListener('click', (e) => {
    const dot = e.target.closest('.color-dot');
    if (!dot) return;
    document.querySelectorAll('#color-options .color-dot').forEach(d => d.classList.remove('selected'));
    dot.classList.add('selected');
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
  document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector(`.admin-tab-btn[data-tab="${tab}"]`).classList.add('active');
  document.getElementById(`admin-tab-${tab}`).classList.add('active');
}

let currentData = { projects: [], prototypes: [], tags: [] };

function loadData() {
  currentData = Storage.load();
  if (!currentData.tags) currentData.tags = [];
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
  const selectedDot = document.querySelector('#color-options .color-dot.selected');
  const color = selectedDot ? selectedDot.dataset.color : '#2563eb';
  if (!name) return;

  const data = Storage.load();
  if (!data.tags) data.tags = [];
  data.tags.push({ id: Storage.generateId(), name, color });
  Storage.save(data);

  document.getElementById('tag-name').value = '';
  loadData();
}

function deleteTag(id) {
  if (!confirm('이 태그를 삭제하시겠습니까? 프로젝트에서도 제거됩니다.')) return;
  const data = Storage.load();
  data.tags = (data.tags || []).filter(t => t.id !== id);
  data.projects.forEach(p => {
    if (p.tagIds) p.tagIds = p.tagIds.filter(tid => tid !== id);
  });
  Storage.save(data);
  loadData();
}

function renderTags() {
  const list = document.getElementById('tag-list');
  const tags = currentData.tags || [];
  if (tags.length === 0) {
    list.innerHTML = '<li style="color:#9ca3af;font-size:13px;">등록된 태그가 없습니다.</li>';
    return;
  }
  list.innerHTML = tags.map(t => {
    const usedCount = currentData.projects.filter(p => (p.tagIds || []).includes(t.id)).length;
    return `
      <li>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="tag-badge" style="background:${escapeHtml(t.color)}">${escapeHtml(t.name)}</span>
          <span style="color:#9ca3af;font-size:12px;">${usedCount}개 프로젝트에서 사용 중</span>
        </div>
        <button class="btn btn-danger" onclick="deleteTag('${t.id}')">삭제</button>
      </li>
    `;
  }).join('');
}

function renderProjectTagSelect() {
  const area = document.getElementById('project-tags-select');
  const tags = currentData.tags || [];
  if (tags.length === 0) {
    area.innerHTML = '<p style="color:#9ca3af;font-size:13px;">태그가 없습니다. 제품 태그 관리에서 먼저 추가해주세요.</p>';
    return;
  }
  area.innerHTML = tags.map(t =>
    `<span class="tag-chip" data-tag-id="${t.id}" style="background:${escapeHtml(t.color)}" onclick="toggleTagChip(this)">${escapeHtml(t.name)}</span>`
  ).join('');
}

function toggleTagChip(el) {
  el.classList.toggle('selected');
}

function getSelectedTagIds() {
  return Array.from(document.querySelectorAll('#project-tags-select .tag-chip.selected'))
    .map(el => el.dataset.tagId);
}

// ============ PROJECTS ============
function addProject(e) {
  e.preventDefault();
  const name = document.getElementById('project-name').value.trim();
  const description = document.getElementById('project-desc').value.trim();
  if (!name) return;

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

  const tags = data.tags || [];
  const tagChips = tags.map(t => {
    const selected = (project.tagIds || []).includes(t.id) ? 'selected' : '';
    return `<span class="tag-chip ${selected}" data-tag-id="${t.id}" style="background:${escapeHtml(t.color)}" onclick="toggleTagChip(this)">${escapeHtml(t.name)}</span>`;
  }).join('');

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'edit-modal';
  modal.innerHTML = `
    <div class="modal-box">
      <h3>프로젝트 수정</h3>
      <div class="form-group" style="margin-bottom:12px;">
        <label>프로젝트 이름</label>
        <input type="text" id="edit-name" value="${escapeHtml(project.name)}">
      </div>
      <div class="form-group" style="margin-bottom:12px;">
        <label>설명</label>
        <input type="text" id="edit-desc" value="${escapeHtml(project.description || '')}">
      </div>
      <div class="form-group" style="margin-bottom:12px;">
        <label>제품 태그</label>
        <div id="edit-tags-select" class="tag-select-area">
          ${tags.length === 0 ? '<p style="color:#9ca3af;font-size:13px;">등록된 태그가 없습니다.</p>' : tagChips}
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="closeEditModal()">취소</button>
        <button class="btn btn-primary" onclick="saveProject('${id}')">저장</button>
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
    .map(el => el.dataset.tagId);

  if (!name) return;

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

  const tagMap = {};
  (currentData.tags || []).forEach(t => { tagMap[t.id] = t; });

  list.innerHTML = currentData.projects.map(p => {
    const protoCount = currentData.prototypes.filter(pt => pt.projectId === p.id).length;
    const tagsHtml = (p.tagIds || []).map(tid => {
      const tag = tagMap[tid];
      return tag ? `<span class="tag-badge" style="background:${escapeHtml(tag.color)}">${escapeHtml(tag.name)}</span>` : '';
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
          <button class="btn btn-edit" onclick="editProject('${p.id}')">수정</button>
          <button class="btn btn-danger" onclick="deleteProject('${p.id}')">삭제</button>
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

  list.innerHTML = currentData.prototypes.map(pt => `
    <li>
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="badge">${escapeHtml(projectMap[pt.projectId] || '-')}</span>
        <strong>${escapeHtml(pt.name)}</strong>
        <span style="color:#9ca3af;font-size:13px;">${pt.fileName || ''}</span>
        <span style="color:#9ca3af;font-size:12px;">${pt.createdAt}</span>
        ${pt.figmaUrl ? `<a href="${escapeHtml(pt.figmaUrl)}" target="_blank" style="font-size:12px;color:#2563eb;">Figma</a>` : ''}
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
