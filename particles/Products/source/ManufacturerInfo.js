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

defineParticle(({DomParticle, html}) => {

  const template = html`
    <div style="padding: 4px 0;">{{message}}</div>
  `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    shouldRender(props) {
      return Boolean(props && props.product);
    }
    render({product}) {
      const messages = {
        'Power Tool Set': `Newer version, ${product.name} v2, is available now.`,
        'Guardian of the Galaxy Figure': `Manufacturer recommended for ages 13 and older.`,
        'Book: How to Draw': `Award-winning book!`
      };
      return {message: messages[product.name]};
    }
  };
});
