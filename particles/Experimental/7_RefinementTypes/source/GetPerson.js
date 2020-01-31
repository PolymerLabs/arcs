/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

 /* global defineParticle */


defineParticle(({SimpleParticle, html}) => {

  const template = html`
<input placeholder="Enter your name" spellcheck="false" on-change="onNameInputChange">
  `;

  return class extends SimpleParticle {
    get template() {
      return template;
    }

    // Because we have some logic to implement, we use update instead of render.
    update() {
      // To set the "person" handle, we call this.set, pass the handle name as a
      // string, and then a JSON representation of the updated information. In this
      // case we give person the default value of "Human" so we have a value to
      // work with in the DisplayGreeting particle.
      this.set('person', {name: 'Human'});
    }

    onNameInputChange(e) {
      // Update the value of person when the human enters a value.
      this.set('person', {name: e.data.value});
    }
  };
});
