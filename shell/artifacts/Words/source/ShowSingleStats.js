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

defineParticle(({DomParticle, html}) => {
  importScripts(resolver(`GamePane/Scoring.js`));

  const host = `show-single-stats`;

  const template = html`
<div ${host}>{{message}}</div>
   `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    render({stats}) {
      const message = stats ? Scoring.scoreToMessage(stats) : '';
      return {message};
    }
  };
});
