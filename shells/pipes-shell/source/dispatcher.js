/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

export const dispatcher = {
  dispatch(msg, ...args) {
    if (!msg.message) {
      console.warn('[message] field missing from envelope');
    } else {
      const handler = `${msg.message}`;
      if (this[handler]) {
        return this[handler](msg, ...args);
      } else {
        console.warn('unknown message: ', msg);
      }
    }
  }
};
