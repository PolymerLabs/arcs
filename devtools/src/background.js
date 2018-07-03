// Tab ID to port of a DevTools page, background script is a singleton.
let connections = {};
// Tab ID to `true` if given tab already pinged us.
let tabsReady = {};

// DevTools page connecting.
chrome.runtime.onConnect.addListener(function(port) {
  // Message from the DevTools page.
  let extensionListener = function(message, sender, sendResponse) {
    console.log(`Received "${message.name}" message from DevTools page for tab.${message.tabId}.`);
    switch (message.name) {
      case 'init':
        connections[message.tabId] = port;
        if (message.tabId in tabsReady) {
          console.log(`Establishing connection for tab.${message.tabId}, tab is ready.`);
          chrome.tabs.sendMessage(message.tabId, {messageType: 'init-debug'});
        } else {
          console.log(`Establishing connection for tab.${message.tabId}, tab not yet ready.`);
        }
        break;
      case 'command':
        chrome.tabs.sendMessage(message.tabId, message.msg);
        break;
    }
  };

  port.onMessage.addListener(extensionListener);
  port.onDisconnect.addListener(function(port) {
    port.onMessage.removeListener(extensionListener);
    for (let tabId of Object.keys(connections)) {
      if (connections[tabId] === port) {
        console.log(`DevTools port for tab.${tabId} got disconnected. Removing the connection.`);
        delete connections[tabId];
      }
    }
  });
});

// Message from the content script.
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  let tabId = sender.tab.id;
  if (message === 'content-script-ready') {
    tabsReady[tabId] = true;
    if (tabId in connections) { // If devtools ready, reply to start debugging.
      console.log(`Received 'content-script-ready' for tab.${tabId}, devtools is ready.`);
      chrome.tabs.sendMessage(tabId, {messageType: 'init-debug'});
    } else { // If devtools not ready we'll wait for devtools to be opened.
      console.log(`Received 'content-script-ready' for tab.${tabId}, waiting for devtools.`);
    }
    return;
  }

  if (tabId in connections) {
    connections[tabId].postMessage(message);
    console.log(`Forwarded ${message.length} messages from tab.${tabId} to its DevTools page`);
  } else {
    console.log(`Missing connection for tab.${tabId} that is sending messages.`);
  }
  return true;
});

chrome.webNavigation.onCommitted.addListener(function(details) {
  if (details.frameId !== 0) {
    return; // Ignore if it's not the top-frame.
  }
  let tabId = details.tabId;
  if (tabId in connections) {
    console.log(`Registered page refresh for tab.${tabId}.`);
    connections[tabId].postMessage([{messageType: 'page-refresh'}]);
    delete tabsReady[tabId];
  }
});
