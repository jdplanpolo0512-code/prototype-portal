document.addEventListener('DOMContentLoaded', () => {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });

  loadData();
});

function loadData() {
  const data = Storage.load();
  renderCardView(data);
  renderTableView(data);
}

function openPrototype(id) {
  const html = Storage.getFile(id);
  if (!html) {
    alert('HTML 파일을 찾을 수 없습니다.');
    return;
  }
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

function renderCardView({ projects, prototypes }) {
  const container = document.getElementById('tab-card');

  if (projects.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>등록된 프로젝트가 없습니다. Admin 페이지에서 프로젝트를 추가해주세요.</p></div>';
    return;
  }

  const html = '<div class="card-grid">' + projects.map(project => {
    const protos = prototypes.filter(p => p.projectId === project.id);
    return `
      <div class="project-card">
        <div class="card-header">
          <h3>${escapeHtml(project.name)}</h3>
          ${project.description ? `<p>${escapeHtml(project.description)}</p>` : ''}
        </div>
        <div class="card-body">
          ${protos.length === 0
            ? '<p style="color:#9ca3af;font-size:13px;padding:10px 0;">프로토타입 없음</p>'
            : protos.map(proto => `
              <div class="proto-item">
                <span class="proto-name">${escapeHtml(proto.name)}</span>
                <div class="proto-links">
                  ${proto.figmaUrl ? `<a href="${escapeHtml(proto.figmaUrl)}" target="_blank" class="btn btn-figma">Figma</a>` : ''}
                  <button onclick="openPrototype('${proto.id}')" class="btn btn-primary">HTML</button>
                </div>
              </div>
            `).join('')
          }
        </div>
      </div>
    `;
  }).join('') + '</div>';

  container.innerHTML = html;
}

function renderTableView({ projects, prototypes }) {
  const container = document.getElementById('tab-table');

  if (prototypes.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>등록된 프로토타입이 없습니다.</p></div>';
    return;
  }

  const projectMap = {};
  projects.forEach(p => { projectMap[p.id] = p.name; });

  const html = `
    <table class="data-table">
      <thead>
        <tr>
          <th>프로젝트</th>
          <th>프로토타입</th>
          <th>파일명</th>
          <th>등록일</th>
          <th>링크</th>
        </tr>
      </thead>
      <tbody>
        ${prototypes.map(proto => `
          <tr>
            <td><span class="badge">${escapeHtml(projectMap[proto.projectId] || '-')}</span></td>
            <td>${escapeHtml(proto.name)}</td>
            <td style="color:#6b7280;font-size:13px;">${escapeHtml(proto.fileName || '-')}</td>
            <td>${proto.createdAt}</td>
            <td>
              <div class="proto-links">
                ${proto.figmaUrl ? `<a href="${escapeHtml(proto.figmaUrl)}" target="_blank" class="btn btn-figma">Figma</a>` : ''}
                <button onclick="openPrototype('${proto.id}')" class="btn btn-primary">HTML</button>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  container.innerHTML = html;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
