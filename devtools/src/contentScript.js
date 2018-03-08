let log = console.log.bind(console,
  '%cArcsExplorer',
  'background: #000; color: white; padding: 1px 6px 2px 7px; border-radius: 6px;');

let informedAboutVersionMismatch = false;

document.addEventListener('arcs-debug', e => {
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

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  switch (message.messageType) {
    case 'init-debug':
      log('init-debug message received, injecting run-init-debug script.');
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
    case 'illuminate': {
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
  }
});

function addInitDebugScript() {
  let script = document.createElement('script');
  script.setAttribute('type', 'module');
  script.setAttribute('src', chrome.extension.getURL('/src/run-init-debug.js'));
  document.getElementsByTagName('body')[0].appendChild(script);
}
