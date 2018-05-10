// @license
// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({DomParticle, resolver, html}) => {

  let host = `show-post-list`;

  const template = html`
<style>
  [${host}] [items] p {
    margin: 0;
  }
</style>
<div ${host} style="padding: 8px;">
  <template items>
    <div slotid="item" subid="{{id}}" key="{{id}}"></div>
    <div slotid="action" subid="{{id}}"></div>
  </template>
  <div items>{{items}}</div>
</div>
    `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    shouldRender(props) {
      return Boolean(props.items);
    }
    render({items}) {
      items.sort((a, b) => a.rank - b.rank);
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
