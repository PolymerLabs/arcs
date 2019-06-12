/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

defineParticle(({DomParticle, html}) => {

  const template_ = html`
    <div style="padding: 16px;">
      <h3>Top <b>{{k}}</b> Labels</h3>
      <div>{{things}}</div>
    </div>
    <template thing>
      <b>{{label}}</b>, <i>{{confidence}}</i>
    </template>
  `;

  return class extends DomParticle {
    get template() {
      return template_;
    }
    render({predictions, k}) {
      const topK = k || 1;
      const preds = predictions || [];

      return {
        things: {$template: 'thing', models: preds},
        k: topK
      };
    }
  };

});
