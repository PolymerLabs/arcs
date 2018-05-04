// @license
// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({DomParticle}) => {
  return class A extends DomParticle {
    get template() {
      return `<div mux-a><{{value}}</div>`;
    }
    render(props, state) {
      return {value: 'A'};
    }
  };
});
