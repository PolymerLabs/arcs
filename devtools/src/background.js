// Tab ID to port of a DevTools page, background script is a singleton.
let connections = {};

// DevTools page connecting.
chrome.runtime.onConnect.addListener(function(port) {
  // Message from the DevTools page.
  let extensionListener = function(message, sender, sendResponse) {
    if (message.name === 'init') {
      connections[message.tabId] = port;
      chrome.tabs.sendMessage(message.tabId, {initDebug: true});
    }
  };

  port.onMessage.addListener(extensionListener);
  port.onDisconnect.addListener(function(port) {
    port.onMessage.removeListener(extensionListener);
    for (let tabId of Object.keys(connections)) {
      if (connections[tabId] === port) delete connections[tabId];
    }
  });
});

// Message from the content script.
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  let tabId = sender.tab.id;
  if (tabId in connections) {
    connections[tabId].postMessage({message: 'arcs-message', request});
  }
  return true;
});

chrome.webNavigation.onCommitted.addListener(function(details) {
  if (details.frameId !== 0) {
    return; // Ignore if it's not the top-frame.
  }
  let tabId = details.tabId;
  if (tabId in connections) {
    connections[tabId].postMessage({message: 'page-refresh'});
    chrome.tabs.sendMessage(tabId, {initDebug: true});
  }
});
