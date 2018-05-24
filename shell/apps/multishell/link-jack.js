
const jackLinks = (target, cb) => {
  setTimeout(() =>
    target.addEventListener('click', e => {
      const anchor = e.path.find(el => el.localName === 'a');
      if (anchor && anchor.href) {
        e.stopImmediatePropagation();
        e.stopPropagation();
        e.preventDefault();
        cb(e, anchor);
      }
    })
  , 2000);
};

// const jackLinks = (target, cb) => {
//   console.log(target.readyState);
//   const ready = {interactive: 1, complete: 1};
//   if (!ready[target.readyState]) {
//     target.addEventListener('readystatechange', ready => reallyJackLinks(target, cb));
//   } else {
//     reallyJackLinks(target, cb);
//   }
// };

// const reallyJackLinks = (target, cb) => {
//   target.addEventListener('click', e => {
//     const anchor = e.path.find(el => el.localName === 'a');
//     if (anchor) {
//       e.preventDefault();
//       cb(e, anchor);
//     }
//   });
// };

export default jackLinks;
