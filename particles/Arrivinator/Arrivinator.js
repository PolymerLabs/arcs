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
    <div>{{arrival}}</div>
  </template>
</x-list>
    `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    _render(props) {
      if (props.list && props.list.length) {
        console.log('rendering Arrivinator');
        return {
          items: props.list.map((item) => {
            return {
              arrival: `Arrives August, ${Math.floor(Math.random()*1000)+2017}`
            };
          })
        };
      }
    }
  };

});