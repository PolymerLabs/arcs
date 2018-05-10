// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

defineParticle(({DomParticle, resolver}) => {
  let host = `show-collection`;

  let styles = `
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
    padding: 8px 0;
    color: #aaaaaa;
    // font-weight: bold;
  }
  [${host}] > [items] [item] {
    // padding: 0 0 32px 0;
    background-color: white;
    border-bottom: 1px solid #eeeeee;
  }
  [${host}] > [items] [item]:last-child {
    border: none;
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
  [${host}] [items] p {
    margin: 0;
  }
  </style>
  `;

  let template = `
  ${styles}
<div ${host}>
  <div head>
    <span>Your shortlist</span>
  </div>

  <div slotid="preamble"></div>

  <div empty hidden="{{hasItems}}">List is empty</div>

  <template items>
    <div slotid="item" subid="{{id}}" style="background: white;box-shadow: 0 0 2px rgba(0,0,0,.2); padding: 16px; "></div>
    <div slotid="annotation" subid="{{id}}"></div>
  </template>
  <div items>{{items}}</div>

  <div slotid="action"></div>

  <div slotid="postamble"></div>
</div>
    `.trim();
  return class extends DomParticle {
    get template() {
      return template;
    }
    render(props) {
      let {collection} = props;
      return {
        hasItems: collection && collection.length > 0,
        items: {
          $template: 'items',
          models: collection ? collection.map(item => {
            return {
              id: item.id
            };
          }) : []
        }
      };
    }
  };
 });
