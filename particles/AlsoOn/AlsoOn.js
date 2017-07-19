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
    <div hidden="{{not_also_on}}">
      <span>Also on:</span> <span>{{choices.description}}</span>
    </div>
  </template>
</x-list>
    `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    _shouldRender(props) {
      return props.list && props.list.length && props.choices;
    }
    _render(props) {
      return {
        items: props.list.map(item => {
          let not_also_on = !Boolean(props.choices.find(c => c.name === item.name));
          return {
            not_also_on
          };
        })
      };
    }
  };

});