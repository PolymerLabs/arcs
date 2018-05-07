/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

let systemHandlers = [];

export function reportSystemException(exception, methodName, particle) {
  for (let handler of systemHandlers)
    handler(exception, methodName, particle);
}

export function registerSystemExceptionHandler(handler) {
  if (!systemHandlers.includes(handler))
    systemHandlers.push(handler);
}

export function removeSystemExceptionHandler(handler) {
  let idx = systemHandlers.indexOf(handler);
  if (idx > -1)
    systemHandlers.splice(idx, 1);
}
