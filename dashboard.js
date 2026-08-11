// Utility to fetch file list from the server
async function fetchJSON(url) {
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to load ${url}`);
    return await resp.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

// Populate document selector
async function loadDocs() {
  const docs = await fetchJSON('docs/index.json');
  const select = document.getElementById('doc-select');
  
  if (docs.length === 0) {
    select.innerHTML = '<option value="">No documents found</option>';
    return;
  }

  docs.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.path; 
    opt.textContent = d.name;
    select.appendChild(opt);
  });
  
  select.addEventListener('change', e => loadDoc(e.target.value));
  
  // load first doc by default
  if (docs.length > 0) {
    loadDoc(docs[0].path);
  }
}

async function loadDoc(path) {
  try {
    const resp = await fetch(path);
    if (!resp.ok) throw new Error('File not found');
    const txt = await resp.text();
    // Parse markdown using marked.js
    document.getElementById('doc-content').innerHTML = marked.parse(txt);
  } catch (error) {
    document.getElementById('doc-content').innerHTML = `<p style="color:red;">Error loading document: ${path}</p>`;
  }
}

// Populate logs list
async function loadLogs() {
  const logs = await fetchJSON('logs/index.json');
  const ul = document.getElementById('log-list');
  
  if (logs.length === 0) {
    ul.innerHTML = '<li>No logs found</li>';
    return;
  }

  logs.forEach(l => {
    const li = document.createElement('li'); 
    li.textContent = l.name;
    li.addEventListener('click', () => {
      // Manage active state
      ul.querySelectorAll('li').forEach(item => item.classList.remove('active'));
      li.classList.add('active');
      loadLog(l.path);
    });
    ul.appendChild(li);
  });
  
  // Load first log by default
  if (logs.length > 0) {
    ul.querySelector('li').classList.add('active');
    loadLog(logs[0].path);
  }
}

async function loadLog(path) {
  try {
    const resp = await fetch(path);
    if (!resp.ok) throw new Error('File not found');
    const txt = await resp.text();
    document.getElementById('log-content').textContent = txt;
    // Scroll to bottom of log
    const logContent = document.getElementById('log-content');
    logContent.scrollTop = logContent.scrollHeight;
  } catch (error) {
    document.getElementById('log-content').textContent = `Error loading log: ${path}`;
  }
}

// Initialise UI
document.addEventListener('DOMContentLoaded', () => {
  loadDocs();
  loadLogs();
});
