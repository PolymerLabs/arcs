// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

defineParticle(({DomParticle}) => {

  let template = `
  <img src="{{message}}" height="48px" width="84px" id="{{name}}" style%="{{style}}"></img>
  `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    render(props, state) {
      if (props.messages && props.messages.length) {
        return {
          items: props.messages.map((m, i) => {
            if (m.type == 'mustache') {
              return {subId: i+1, name: m.name, message: m.content, style: {}};
            } else {
              return {subId: i+1, style: {display: 'none'}};
            }
          })
        };
      }
    }
  };
});
