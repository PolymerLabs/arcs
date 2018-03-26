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

defineParticle(({DomParticle}) => {

  let template = `
    <div style="/*font-size: 0.85em;*/ /*font-weight: bold;*/ font-style: italic">{{msg}}</div>
    `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    shouldRender(props) {
      return !!props && !!props.product;
    }
    render(props) {
      let {product} = props;
      let msg = '';
      if (product.name.toLowerCase().includes('mustang')) {
        msg = [
          `Manufacturer recommends a more appropriate gift for a 13yo.`,
          `Newer version available: 5.0`
        ];
      } else if (product.name.toLowerCase().includes('minecraft')) {
        msg = `Manufacturer recommends ${product.name}`;
      }
      return {msg};
    }
  };
});
