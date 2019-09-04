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

 defineParticle(({UiParticle, html}) => {

   // `html` template-tag will trim (top/bottom) whitespace for you, align your HTML block-left for best results
  const template = html`

<input value="{{name}}" placeholder="Enter your name" spellcheck="false" on-change="onNameInputChange">
<br>
<div slotid="greetingSlot"></div>

  `;

  return class extends UiParticle {
    get template() {
      return template;
    }

    onNameInputChange(e) {
      // changing state will cause `update` to run
      this.setState({name: e.data.value});
    }

    update({}, state) {
      // make a default name, update always runs at least once at startup
      if (!state.name) {
        state.name = 'human';
      }
      // Get the handle "person" and update the data stored to be the name of the person we will greet.
      this.updateSingleton('person', {name: state.name});
    }

  };

});
