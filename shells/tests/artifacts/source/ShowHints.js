/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

defineParticle(({UiParticle, html}) => {

  const host = `show-hints`;

  return class extends UiParticle {
    get template() {
      return html`
<div ${host}>
<div slotid="question"></div>
${['A', 'B', 'C', 'D', 'E'].map((id, index) => `<span slotid="hints" subid$="${id}"><span>${index}</span>:</span>`).join('')}
</div>
      `;
    }

    render() {}
  };
});
