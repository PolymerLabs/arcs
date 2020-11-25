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
    <div style="padding: 4px 0;">{{message}}</div>
  `;

  return class extends UiParticle {
    get template() {
      return template;
    }
    shouldRender(props) {
      return Boolean(props && props.product);
    }
    render({product}) {
      const messages = {
        'Power Tool Set': `Newer version available: ${product.name} v2.`,
        'Guardian of the Galaxy Figure': `Manufacturer recommends a more appropriate gift for a 13yo.`,
        'Book: How to Draw': `Award-winning book!`
      };
      return {message: messages[product.name]};
    }
  };
});
