if (chrome.devtools.inspectedWindow.tabId) {
  chrome.devtools.panels.create('Arcs',
    null,
    '../build/bundled/split.html',
    null);
}
