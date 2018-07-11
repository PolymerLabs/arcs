// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({DomParticle, resolver, html}) => {

  let host = `show-list`;

  const template = html`

<div ${host} style="padding: 8px;">
  <style>
    [${host}] {
      max-width: 400px;
      margin: 0 auto;
    }
    [${host}] > [items] {
      background-color: white;
    }
    [${host}] > [items] > [item] {
      padding: 16px 0;
      border-top: 1px solid #eeeeee;
    }
    [${host}] > [items] > [item]:last-child {
      border-bottom: 1px solid #eeeeee;
    }
    [${host}] div[slotid="annotation"] {
      font-size: 0.75em;
    }
    [${host}] > [items] p {
      margin: 0;
    }
  </style>

  <div slotid="preamble"></div>
  <div items>{{items}}</div>
  <div slotid="action"></div>
  <div slotid="postamble"></div>

  <template items>
    <div item>
      <div slotid="item" subid="{{id}}" key="{{id}}" on-click="_onSelect"></div>
      <!-- <div slotid="action" subid="{{id}}"></div> -->
      <div slotid="annotation" subid="{{id}}"></div>
    </div>
  </template>

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
    _onSelect(e) {
      const item = this._props.items.find(i => i.id === e.data.key);
      const selected = this.handles.get('selected');
      if (item && selected) {
        selected.set(item);
      }
    }
  };
});
