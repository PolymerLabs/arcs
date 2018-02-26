document.addEventListener('arcs-debug', e => {
  chrome.runtime.sendMessage(e.detail);
});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  switch (message.messageType) {
    case 'init-debug':
      if (document.readyState !== 'loading') {
        addInitDebugScript();
      } else {
        document.onreadystatechange = function() {
          if (document.readyState === 'interactive') {
            addInitDebugScript();
          }
        };
      }
      break;
    case 'illuminate':
      let shell = document.getElementsByTagName('app-shell')[0];
      switch (message.messageBody) {
        case 'on':
          shell.setAttribute('illuminate', '');
          break;
        case 'off':
          shell.removeAttribute('illuminate');
          break;
      }
      break;
  }
});

function addInitDebugScript() {
  let script = document.createElement('script');
  script.setAttribute('type', 'module');
  script.setAttribute('src', chrome.extension.getURL('/src/run-init-debug.js'));
  document.getElementsByTagName('body')[0].appendChild(script);
}
