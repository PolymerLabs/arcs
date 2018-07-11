// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

defineParticle(({DomParticle, html, resolver}) => {
  const host = `show-collection`;
  const styles = html`
  <style>
    [${host}] {
      padding: 16px;
      background-color: white;
      max-width: 400px;
      margin: 0 auto;
    }
    [${host}] > [head] {
      display: flex;
      align-items: center;
      padding: 4px 0;
      /*color: #aaaaaa;*/
      font-size: 1.2em;
    }
    [${host}] > [items] {
      background-color: white;
    }
    [${host}] > [items] > [item] {
      /*
      padding: 0 0 32px 0;
      box-shadow: 0 0 2px rgba(0,0,0,0.2);
      */
      padding: 16px 0;
      border-top: 1px solid #eeeeee;
    }
    [${host}] > [items] > [item]:last-child {
      border-bottom: 1px solid #eeeeee;
    }
    [${host}] div[slotid="annotation"] {
      font-size: 0.7em;
    }
    [${host}] [empty] {
      color: #aaaaaa;
      font-size: 14px;
      font-style: italic;
      padding: 10px 0;
    }
    [${host}] > [items] p {
      margin: 0;
    }
  </style>
  `;

  const template = html`

<div ${host}>
${styles}
  <div head>
    <span>List</span>
  </div>
  <div slotid="preamble"></div>
  <div empty hidden="{{hasItems}}">List is empty</div>
  <div items>{{items}}</div>
  <template items>
    <div item>
      <div slotid="item" subid="{{id}}"></div>
      <div slotid="annotation" subid="{{id}}"></div>
    </div>
  </template>
  <div slotid="action"></div>
  <div slotid="postamble"></div>
</div>

  `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    render({collection}) {
      collection = collection || [];
      return {
        hasItems: collection.length > 0,
        items: {
          $template: 'items',
          models: collection.map(({id}) => ({id}))
        }
      };
    }
  };
 });
