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
    <div style%="{{style}}"><span>{{arrival}}</span></div>
    `.trim();

  let daysToMs = 24*60*60*1000;

  return class extends DomParticle {
    get template() {
      return template;
    }
    shouldRender(props) {
      return !!props && !!props.product;
    }
    render(props) {
      const {product} = props;
      const needed = new Date();
      needed.setDate(needed.getDate() + 12);

      let style = null;
      let arrival = '';
      if (product.shipDays) {
        // create a Date-only Date (with a time of 00:00:00etc)
        const estimated = new Date(new Date().toDateString());
        estimated.setDate(estimated.getDate() + product.shipDays);
        if (estimated > needed) {
          style = {color: 'orange', fontWeight: 'bold', fontStyle: 'normal'};
        } else {
          style = {color: 'green'};
        }
        arrival = `Arrives ${estimated.toDateString()}`;
      } else {
        arrival = `No shipping info.`;
      }
      return {
        arrival,
        style
      };
    }
  };
});
