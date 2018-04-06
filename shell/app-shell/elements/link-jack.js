
if (window.top !== window) {
  document.addEventListener('click', e => {
    const anchor = e.path.find(el => el.localName === 'a');
    if (anchor) {
      e.preventDefault();
      console.log(anchor.href);
    }
  });
}
