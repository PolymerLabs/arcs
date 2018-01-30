document.addEventListener('arcs-debug', e => {
  chrome.runtime.sendMessage(e.detail);
});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.initDebug) {
    if (document.readyState !== 'loading') {
      addInitDebugScript();
    } else {
      document.onreadystatechange = function() {
        if (document.readyState === 'interactive') {
          addInitDebugScript();
        }
      };
    }
  }
});

function addInitDebugScript() {
  let script = document.createElement('script');
  script.setAttribute('type', 'module');
  script.setAttribute('src', chrome.extension.getURL('/src/run-init-debug.js'));
  document.getElementsByTagName('body')[0].appendChild(script);
}
