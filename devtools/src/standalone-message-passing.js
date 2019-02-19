// If not in DevTools, run devtools.js script for message passing.
if (!chrome || !chrome.devtools) {
  const script = document.createElement('script');
  script.setAttribute('src', 'src/devtools.js');
  script.setAttribute('type', 'module');
  document.getElementsByTagName('head')[0].appendChild(script);
}
