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

defineParticle(({UiParticle, html}) => {

  const template = html`
    <div hidden="{{hidden}}" style="padding: 4px 0;">Alternate stores that can ship to you in time: <span>{{alternatives}}</span></div>
  `;

  return class extends UiParticle {
    get template() {
      return template;
    }
    shouldRender(props) {
      return Boolean(props && props.product);
    }
    render(props) {
      const {product} = props;
      const needed = new Date();
      needed.setDate(needed.getDate() + 12);

      let hidden = true;
      if (props.product.shipDays) {
        // create a date-only Date (with a time of 00:00:00etc)
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
