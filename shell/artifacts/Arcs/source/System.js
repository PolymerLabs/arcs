// @license
// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({DomParticle, html}) => {

  const host = 'friends';

  const template = html`
<div ${host}>
  <style>
    [${host}] {
      padding: 16px;
    }
  </style>
  <h2>System Test</h2>
  <h3>{{name}}</h3>
</div>
  `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    // async _handlesToProps() {
    //   debugger;
    //   super._handlesToProps();
    // }
    render({system}, state) {
      return {
        name: system && system.name
      };
    }
  };

});
