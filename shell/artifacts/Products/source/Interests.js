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
    <div unsafe-html="{{caption}}"></div>
  </template>
</x-list>
    `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    _willReceiveProps(props) {
      if (props.list) {
        let items = [];
        props.list.forEach(item => {
          switch (item.name) {
            case 'Field Hockey Stick':
              items.push({caption: "<br><br><hr><h2>Field Hockey</h2><i>... is a sport played on a field.</i><hr><br><br>"});
              break;
          }
        });
        this._setState({items});
      }
    }
    _shouldRender(props, state) {
      return Boolean(state.items);
    }
    _render(props, state) {
      return {items: state.items};
    }
  };

});