/**
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

export async function dynamicScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    document.head.appendChild(Object.assign(document.createElement('script'), {
      src,
      onload: () => resolve(),
      onerror: err => reject(err)
    }));
  });
}
