// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

"use strict";

defineParticle(({DomParticle, resolver}) => {

  let host = `show-list`;

  const template = `
<style>
  [${host}] [items] p {
    margin: 0;
  }
</style>
<div ${host} style="padding: 8px;">
  <template items>
    <div slotid="item" subid="{{id}}"></div>
    <div slotid="action" subid="{{id}}"></div>
  </template>
  <div items>{{items}}</div>
  <hr>
</div>
    `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    _shouldRender(props) {
      return Boolean(props.items);
    }
    _render({items}) {
      return {
        items: {
          $template: 'items',
          models: items.map(item => {
            return {
              id: item.id
            };
          })
        }
      };
    }
  };
});