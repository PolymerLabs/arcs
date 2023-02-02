/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

/* global defineParticle */

defineParticle(({UiParticle, html}) => {
  const template = html`
<style>
body {
  --stats-bg: #46e0ac;
}
</style>
`;

  return class extends UiParticle {
    get template() {
      return template;
    }
  };
});
