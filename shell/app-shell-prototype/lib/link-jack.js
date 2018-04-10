const jackLinks = (window, cb) => {
  window.addEventListener('click', e => {
    const anchor = e.path.find(el => el.localName === 'a');
    if (anchor) {
      e.preventDefault();
      cb(anchor);
    }
  });
};

export default jackLinks;
