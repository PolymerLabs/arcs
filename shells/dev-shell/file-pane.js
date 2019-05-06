const template = `
  <style>
    #manifest {
      font-size: 12px;
      min-width: 700px;
      padding: 10px;
      border: 1px solid #ccc;
    }
    .tab-panel {
      width: fit-content;
      margin: 10px 0 20px 0;
    }
    .tab-row {
      overflow: hidden;
      background-color: #f1f1f1;
      border: 1px solid #ccc;
      border-bottom: none;
    }
    .tab-row button {
      background-color: inherit;
      cursor: pointer;
      float: left;
      border: none;
      outline: none;
      padding: 10px 16px;
    }
    .tab-row button:hover {
      background-color: #ddd;
    }
    .tab-row button.active {
      background-color: #ccc;
    }
    #files textarea {
      font-size: 12px;
      min-width: 700px;
      padding: 10px;
      border: 1px solid #ccc;
    }
  </style>
  <textarea id="manifest" rows="10" spellcheck="false"></textarea>
  <div class="tab-panel">
    <div class="tab-row">
      <div id="tabs"></div>
      <button id="add-button">+</button>
    </div>
    <div id="files"></div>
  </div>`;

export class FilePane extends HTMLElement {
  connectedCallback() {
    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = template;

    this.manifest = shadowRoot.getElementById('manifest');
    this.tabs = shadowRoot.getElementById('tabs');
    this.files = shadowRoot.getElementById('files');
    this.addButton = shadowRoot.getElementById('add-button');

    this.manifest.addEventListener('keypress', this.interceptCtrlEnter.bind(this));
    this.addButton.addEventListener('click', this.addFile.bind(this));
    this.fileBase = 'a'.charCodeAt(0);
    this.addFile();
  }

  setExecuteCallback(executeCallback) {
    this.executeCallback = executeCallback;
  }

  interceptCtrlEnter(event) {
    if (event.key === 'Enter' && event.ctrlKey) {
      this.executeCallback();
      event.preventDefault();
    }
  }

  addFile() {
    const file = document.createElement('textarea');
    file.rows = 10;
    file.spellcheck = false;
    file.addEventListener('keypress', this.interceptCtrlEnter.bind(this));

    const tab = document.createElement('button');
    tab.textContent = `${String.fromCharCode(this.fileBase++)}.js`;
    tab.linkedFile = file;
    tab.addEventListener('click', this.showFile.bind(this));

    this.tabs.appendChild(tab);
    this.files.appendChild(file);
    tab.click();

    if (this.fileBase > 'z'.charCodeAt(0)) {
      this.addButton.style.display = 'none';
    }
  }

  showFile(event) {
    for (const tab of this.tabs.children) {
      tab.classList.remove('active');
    }
    for (const file of this.files.children) {
      file.style.display = 'none';
    }
    event.target.classList.add('active');
    event.target.linkedFile.style.display = 'block';
  }

  getManifest() {
    return this.manifest.value;
  }

  getFileMap() {
    const fileMap = {};
    for (const tab of this.tabs.children) {
      fileMap['./' + tab.textContent] = tab.linkedFile.value;
    }
    return fileMap;
  }

  exportFiles() {
    const lines = ['[manifest]\n', this.getManifest() + '\n'];
    for (const tab of this.tabs.children) {
      lines.push(`\n[${tab.textContent}]\n`, tab.linkedFile.value + '\n');
    }

    const a = document.createElement('a');
    a.download = 'dev-shell.txt';
    a.href = window.URL.createObjectURL(new Blob(lines, {type: 'text/plain'}));
    a.dataset.downloadurl = ['text/plain', a.download, a.href].join(':');
    a.click();
  }

  seedExample(manifest, particle) {
    this.manifest.textContent = manifest;
    this.files.children[0].textContent = particle;
    this.manifest.focus();
  }
}

window.customElements.define('file-pane', FilePane);
