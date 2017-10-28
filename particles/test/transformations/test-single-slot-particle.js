// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({DomParticle}) => {
  return class SingleSlotParticle extends DomParticle {
    get template() {
      return `<div><{{value}}/div>`;
    }
    _render(props, state) {
      let {foo} = props;
      return {
        value: (foo && foo.value) || 'n/a'
      };
    }
  }
});
