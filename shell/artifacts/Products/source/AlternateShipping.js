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
    <div hidden="{{hidden}}">Alternate stores that can ship to you in time: <span>{{alternatives}}</span></div>
    `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    shouldRender(props) {
      return !!props && !!props.product;
    }
    render(props) {
      const {product, desiredShipping} = props;

      let hidden = true;
      if (props.product.shipDays) {
        const needed = new Date(desiredShipping.desiredShippingDate);
        const estimated = new Date(new Date().toDateString());
        estimated.setDate(estimated.getDate() + product.shipDays);

        hidden = estimated <= needed;
      }

      const alternatives = ['<not yet implemented>'].join(', ');

      return {
        alternatives,
        hidden
      };
    }
  };
});
