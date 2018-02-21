// This file initializes debug mode on the arc and contains message receiving
// and queing, so that opening DevTools without showing the Arcs panel is
// sufficient to start gathering information.

(() => {
  let msgQueue = [];
  let windowForEvents = undefined;

  if (chrome && chrome.devtools) {
    // Add the panel for devtools, and flush the events to it once it's shown.
    chrome.devtools.panels.create('Arcs',
      null,
      '../build/bundled/split.html',
      panel => panel.onShown.addListener(panelWindow => {
        if (windowForEvents) return;
        windowForEvents = panelWindow;
        for (msg of msgQueue) fire(msg);
        msgQueue.length = 0;
      }));
  } else {
    // Fire on a regular window without queueing in the standalone scenario.
    windowForEvents = window;
  }

  if (chrome.devtools && chrome.devtools.inspectedWindow.tabId) {
    connectViaExtensionApi();
  } else {
    connectViaWebSocket();
  }

  function connectViaExtensionApi() {
    let backgroundPageConnection = chrome.runtime.connect({name: 'arcs'});
    backgroundPageConnection.postMessage({
        name: 'init',
        tabId: chrome.devtools.inspectedWindow.tabId
    });
    backgroundPageConnection.onMessage.addListener(
      e => queueOrFire(e));
  }

  function connectViaWebSocket() {
    let ws = new WebSocket('ws://localhost:8787');
    ws.onerror = e => console.log('No NodeJS connection found.');
    ws.onopen = e => {
      ws.onmessage = msg => queueOrFire(JSON.parse(msg.data));
      ws.send('init');
    };
  }

  function queueOrFire(msg) {
    if (windowForEvents) {
      fire(msg);
    } else {
      msgQueue.push(msg);
    }
  }

  function fire(msg) {
    windowForEvents.document.dispatchEvent(new CustomEvent('messages', {detail: msg}));
  }
})();
