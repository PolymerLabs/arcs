/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

"use strict";

defineParticle(({DomParticle}) => {

  let template = `
    <div style%="{{style}}" id="{{subId}}"><span>{{arrival}}</span></div>
    `.trim();

  let daysToMs = 24*60*60*1000;

  return class extends DomParticle {
    get template() {
      return template;
    }
    _render(props) {
      if (props.list && props.list.length) {
        let now = Date.now();
        let needed = new Date('2017-08-04').getTime();
        return {
          items: props.list.map((item, i) => {
            // TODO(sjmiles): bypass schema for the moment
            item = item.rawData;
            let subId = item.name.replace(/ /g,'').toLowerCase();
            let style = null;
            let arrival = '';
            if (item.shipDays) {
              let then = new Date(now + item.shipDays*daysToMs);
              if (then > needed) {
                style = {color: 'orange', fontWeight: 'bold', fontStyle: 'normal'};
              } else {
                style = {color: 'green'};
              }
              arrival = `Arrives ${then.toDateString()}`;
            } else {
              arrival = `No shipping info.`;
            }
            return {
              subId,
              arrival,
              style
            };
          })
        };
      }
    }
  };

});
