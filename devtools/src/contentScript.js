let eventLog = [];
let debouncing = false;

document.addEventListener('arcs-debug', e => {
  eventLog.push(e.detail);
  if (!debouncing) {
    setTimeout(sendMessages, 100);
    debouncing = true;
  }
});

function sendMessages() {
  chrome.runtime.sendMessage(eventLog);
  eventLog = [];
  debouncing = false;
}

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
  script.setAttribute('src', chrome.extension.getURL('/src/initDebug.js'));
  document.getElementsByTagName('body')[0].appendChild(script);
}
