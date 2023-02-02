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

  const template = html`

<div hidden="{{notAlsoOn}}" style="padding: 4px 0;">
  <span>Also on:</span> <span unsafe-html="{{choices.description}}"></span>
</div>

  `.trim();

  return class extends UiParticle {
    get template() {
      return template;
    }
    shouldRender(props) {
      return Boolean(props.choices);
    }
    render({product, choices}) {
      const notAlsoOn = !product || !choices.find(c => c.name === product.name);
      return {
        notAlsoOn
      };
    }
  };
});
