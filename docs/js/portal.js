let tagMap = {};
let activeFilterTag = null;

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });

  // Event delegation for dynamic buttons
  document.addEventListener('click', (e) => {
    const protoBtn = e.target.closest('[data-action="open-proto"]');
    if (protoBtn) {
      const id = protoBtn.dataset.protoId;
      if (Storage.isValidId(id)) openPrototype(id);
      return;
    }

    const filterBtn = e.target.closest('[data-action="filter-tag"]');
    if (filterBtn) {
      const tagId = filterBtn.dataset.tagId || null;
      filterByTag(tagId);
      return;
    }
  });

  loadData();
});

function loadData() {
  const data = Storage.load();
  tagMap = {};
  data.tags.forEach(t => { tagMap[t.id] = t; });
  renderTagFilter(data);
  renderCardView(data);
  renderTableView(data);
}

function renderTagFilter({ tags }) {
  const filterArea = document.getElementById('tag-filter');
  if (!filterArea) return;
  if (!tags || tags.length === 0) {
    filterArea.style.display = 'none';
    return;
  }
  filterArea.style.display = 'flex';
  filterArea.innerHTML =
    `<span class="tag-chip ${activeFilterTag === null ? 'selected' : ''}" style="background:#4b5563" data-action="filter-tag" data-tag-id="">전체</span>` +
    tags.map(t =>
      `<span class="tag-chip ${activeFilterTag === t.id ? 'selected' : ''}" style="background:${sanitizeColor(t.color)}" data-action="filter-tag" data-tag-id="${escapeAttr(t.id)}">${escapeHtml(t.name)}</span>`
    ).join('');
}

function filterByTag(tagId) {
  activeFilterTag = tagId || null;
  loadData();
}

function getFilteredProjects(projects) {
  if (activeFilterTag === null) return projects;
  return projects.filter(p => (p.tagIds || []).includes(activeFilterTag));
}

function openPrototype(id) {
  const html = Storage.getFile(id);
  if (!html) {
    alert('HTML 파일을 찾을 수 없습니다.');
    return;
  }
  // Open in a new window with a sandboxed iframe to prevent access to parent origin
  const viewer = window.open('', '_blank');
  if (!viewer) {
    alert('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.');
    return;
  }
  viewer.document.write(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Prototype Viewer</title>
<style>*{margin:0;padding:0;}iframe{width:100%;height:100vh;border:none;}</style>
</head><body>
<iframe sandbox="allow-scripts allow-same-origin allow-forms allow-popups" srcdoc="${escapeAttr(html)}"></iframe>
</body></html>`);
  viewer.document.close();
}

function renderProjectTags(tagIds) {
  if (!tagIds || tagIds.length === 0) return '';
  return tagIds.map(tid => {
    const tag = tagMap[tid];
    return tag ? `<span class="tag-badge" style="background:${sanitizeColor(tag.color)}">${escapeHtml(tag.name)}</span>` : '';
  }).join('');
}

function renderCardView({ projects, prototypes }) {
  const container = document.getElementById('tab-card');
  const filtered = getFilteredProjects(projects);

  if (filtered.length === 0) {
    container.innerHTML = projects.length === 0
      ? '<div class="empty-state"><p>등록된 프로젝트가 없습니다. Admin 페이지에서 프로젝트를 추가해주세요.</p></div>'
      : '<div class="empty-state"><p>선택한 태그에 해당하는 프로젝트가 없습니다.</p></div>';
    return;
  }

  const html = '<div class="card-grid">' + filtered.map(project => {
    const protos = prototypes.filter(p => p.projectId === project.id);
    const tagsHtml = renderProjectTags(project.tagIds);
    return `
      <div class="project-card">
        <div class="card-header">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <h3 style="margin:0;">${escapeHtml(project.name)}</h3>
            ${tagsHtml}
          </div>
          ${project.description ? `<p>${escapeHtml(project.description)}</p>` : ''}
        </div>
        <div class="card-body">
          ${protos.length === 0
            ? '<p style="color:#9ca3af;font-size:13px;padding:10px 0;">프로토타입 없음</p>'
            : protos.map(proto => {
              const figmaHref = sanitizeUrl(proto.figmaUrl);
              return `
              <div class="proto-item">
                <span class="proto-name">${escapeHtml(proto.name)}</span>
                <div class="proto-links">
                  ${figmaHref ? `<a href="${escapeAttr(figmaHref)}" target="_blank" rel="noopener noreferrer" class="btn btn-figma">Figma</a>` : ''}
                  <button data-action="open-proto" data-proto-id="${escapeAttr(proto.id)}" class="btn btn-primary">HTML</button>
                </div>
              </div>
            `}).join('')
          }
        </div>
      </div>
    `;
  }).join('') + '</div>';

  container.innerHTML = html;
}

function renderTableView({ projects, prototypes }) {
  const container = document.getElementById('tab-table');
  const filtered = getFilteredProjects(projects);
  const filteredIds = new Set(filtered.map(p => p.id));
  const filteredPrototypes = prototypes.filter(p => filteredIds.has(p.projectId));

  if (filteredPrototypes.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>등록된 프로토타입이 없습니다.</p></div>';
    return;
  }

  const projectMap = {};
  projects.forEach(p => { projectMap[p.id] = p; });

  const html = `
    <table class="data-table">
      <thead>
        <tr>
          <th>프로젝트</th>
          <th>제품</th>
          <th>프로토타입</th>
          <th>파일명</th>
          <th>등록일</th>
          <th>링크</th>
        </tr>
      </thead>
      <tbody>
        ${filteredPrototypes.map(proto => {
          const proj = projectMap[proto.projectId];
          const tagsHtml = proj ? renderProjectTags(proj.tagIds) : '';
          const figmaHref = sanitizeUrl(proto.figmaUrl);
          return `
          <tr>
            <td><span class="badge">${escapeHtml(proj ? proj.name : '-')}</span></td>
            <td>${tagsHtml || '<span style="color:#9ca3af">-</span>'}</td>
            <td>${escapeHtml(proto.name)}</td>
            <td style="color:#6b7280;font-size:13px;">${escapeHtml(proto.fileName)}</td>
            <td>${escapeHtml(proto.createdAt)}</td>
            <td>
              <div class="proto-links">
                ${figmaHref ? `<a href="${escapeAttr(figmaHref)}" target="_blank" rel="noopener noreferrer" class="btn btn-figma">Figma</a>` : ''}
                <button data-action="open-proto" data-proto-id="${escapeAttr(proto.id)}" class="btn btn-primary">HTML</button>
              </div>
            </td>
          </tr>
        `}).join('')}
      </tbody>
    </table>
  `;

  container.innerHTML = html;
}
