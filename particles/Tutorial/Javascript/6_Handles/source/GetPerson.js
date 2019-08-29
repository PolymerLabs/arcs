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

 defineParticle(({DomParticle, html}) => {

    const template = html`
  <input value="{{name}}" placeholder="Enter your name" spellcheck="false" on-change="onNameInputChange">
  <div slotid="greetingSlot"></div>
    `;

  return class extends DomParticle {
    get template() {
      return template;
    }

    update(props, state) {
      // Get the handle "person" and update the data stored to be the name of the person we will greet.
      this.updateSingleton('person', {name: 'Human'});
    }

    onNameInputChange(e) {
      this.updateSingleton('person', {name: e.data.value});
    }
  };
});