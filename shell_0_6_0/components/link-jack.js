export const linkJack = (target, cb) => {
  target.addEventListener('click', e => {
    if (!e.ctrlKey) {
      const anchor = e.composedPath().find(el => el.localName === 'a');
      if (anchor) {
        e.preventDefault();
        cb(anchor);
      }
    }
  }, true);
};
