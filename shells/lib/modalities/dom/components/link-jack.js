/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
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
