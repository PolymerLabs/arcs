// This file initializes debug mode on the arc and contains message receiving
// and queing, so that opening DevTools without showing the Arcs panel is
// sufficient to start gathering information.

// TODO: Clean this up a little bit, it's spaghetti-ish.

(() => {
  let msgQueue = [];
  let windowForEvents = undefined;

  // Use the extension API if we're in devtools and having a window to inspect.
  // Otherwise use WebSocket. In later case we might be in devtools but running
  // against NodeJS, but in such case there's no window to inspect.
  let sendMessage = (chrome.devtools && chrome.devtools.inspectedWindow.tabId)
      ? connectViaExtensionApi()
      : connectViaWebSocket();

  if (chrome && chrome.devtools) {
    // Add the panel for devtools, and flush the events to it once it's shown.
    chrome.devtools.panels.create('Arcs',
      null,
      '../build/split-index.html',
      panel => panel.onShown.addListener(panelWindow => initializeWindow(panelWindow)));
  } else {
    // Fire on a regular window without queueing in the standalone scenario.
    initializeWindow(window);
  }

  function initializeWindow(w) {
    if (windowForEvents) return;
    windowForEvents = w;
    w.document.addEventListener('command', e => sendMessage(e.detail));
    for (let msg of msgQueue) fire(msg);
    msgQueue.length = 0;
    w.document.dispatchEvent(new Event('arcs-communication-channel-ready'));
  }

  function connectViaExtensionApi() {
    let backgroundPageConnection = chrome.runtime.connect({name: 'arcs'});
    backgroundPageConnection.postMessage({
        name: 'init',
        tabId: chrome.devtools.inspectedWindow.tabId
    });
    backgroundPageConnection.onMessage.addListener(
      e => queueOrFire(e));
    return msg => {
      backgroundPageConnection.postMessage({
          name: 'command',
          tabId: chrome.devtools.inspectedWindow.tabId,
          msg
      });
    };
  }

  function connectViaWebSocket() {
    let ws;

    let retriesLeft = 5;
    (function createWebSocket() {
      ws = new WebSocket('ws://localhost:8787');
      ws.onopen = e => {
        console.log(`WebSocket connection established.`);
        ws.onmessage = msg => queueOrFire(JSON.parse(msg.data));
        ws.send('init');
      };
      ws.onerror = e => {
        console.log(`No WebSocket connection found, ${retriesLeft} retries left.`);
        if (retriesLeft--) setTimeout(createWebSocket, 300);
      };
    })();
    return msg => ws.send(JSON.stringify(msg));
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
