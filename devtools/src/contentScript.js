const startupTime = Date.now();

const log = console.log.bind(console,
  '%cArcsExplorer',
  'background: #000; color: white; padding: 1px 6px 2px 7px; border-radius: 6px;');

let informedAboutVersionMismatch = false;

document.addEventListener('arcs-debug-out', e => {
  try {
    chrome.runtime.sendMessage(e.detail);
  } catch (error) {
    if (error.message.startsWith('Invocation of form runtime.connect(null, ) doesn\'t match definition')
        && !informedAboutVersionMismatch) {
      informedAboutVersionMismatch = true;
      if (confirm('Arcs Explorer detected version mismatch between DevTools Extension and injected Content Script. Do you want to reload the page?')) {
        window.location.reload();
      }
    }
  }
});

let initialized = false;
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  switch (message.messageType) {
    case 'init-debug':
      if (initialized) {
        chrome.runtime.sendMessage([{
          messageType: 'warning',
          messageBody: 'reconnected'
        }]);
        return;
      }
      initialized = true;
      log('Connected.');
      if (document.readyState !== 'loading') {
        addMarkConnectedScript();
      } else {
        document.onreadystatechange = function() {
          if (document.readyState === 'interactive') {
            addMarkConnectedScript();
          }
        };
      }
      chrome.runtime.sendMessage([{
        messageType: 'startup-time',
        messageBody: startupTime
      }]);
      break;
    case 'illuminate': {
      const shell = document.getElementsByTagName('app-shell')[0];
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
    default:
      document.dispatchEvent(new CustomEvent('arcs-debug-in', {detail: message}));
  }
});

function addMarkConnectedScript() {
  document.body.appendChild(Object.assign(document.createElement('script'), {type: 'module', src: chrome.extension.getURL('/src/run-mark-connected.js')}));
}

// Initial ping to background.js.
chrome.runtime.sendMessage('content-script-ready');
