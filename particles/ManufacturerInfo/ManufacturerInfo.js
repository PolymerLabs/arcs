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
<x-list items="{{items}}">
  <template>
    <div style="font-size: 0.85em; /*font-weight: bold;*/ font-style: italic">{{msg}}</div>
  </template>
</x-list>
    `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    _shouldRender(props) {
      return props.list && props.list.length;
    }
    _render(props) {
      return {
        items: props.list.map(item => {
          let msg = '';
          switch (item.name) {
            case 'Power Tool Set':
              msg = `Newer version available: ${item.name} v2.`;
              break;
            case 'Guardian of the Galaxy Figure':
              msg = `Manufacturer recommends a more appropriate gift for a 13yo.`;
              break;
            case 'Book: How to Draw':
              msg = `Award-winning book!`;
              break;
          }
          return {msg};
        })
      };
    }
  };

});
