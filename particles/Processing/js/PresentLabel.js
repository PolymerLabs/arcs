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

    <style>
      td {
       padding: 0 5px 0 5px;
      }
    </style>


    <div style="padding: 16px;">
      <h3>Top <span>{{k}}</span> Labels</h3>
      <div>{{things}}</div>
    <template thing>
      <tr>
       <td><b>{{label}}</b></td>
       <td>{{confidence}}</td>
      <tr/>
    </template>
  `;

  return class extends DomParticle {
    get template() {
      return template_;
    }
    render({predictions, k}) {
      const preds = predictions || [];
      const topK = k || preds.length;
      const models = preds.map((p) => ({label: p.label, confidence: p.confidence.toFixed(4)}));

      return {
        things: {$template: 'thing', models},
        k: topK
      };
    }
  };

});
