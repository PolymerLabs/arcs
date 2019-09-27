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
  <b>Please enter your name:</b>
  <input value="{{name}}" placeholder="Enter your name" spellcheck="false" on-change="onNameInputChange"> <button on-click="onClick">Enter</button>
    `;

  return class extends SimpleParticle {
    get template() {
      return template;
    }

    update(props, {enteredName}) {
      // Set default name.
      if (!enteredName) {
        this.setState({enteredName: 'Human'});
      }
      this.updateSingleton('playerTwo', {name: 'Computer', avatar: '🤖', myTurn: false});
    }

    onNameInputChange(e) {
      // Save entered name.
      this.setState({enteredName: e.data.value});
    }

    onClick() {
      // Add the player to the players handle.
      const newAvatar = String.fromCodePoint(0X1F9D1); 
      this.updateSingleton('playerOne', {name: this.state.enteredName, avatar: newAvatar, myTurn: false});
    }
  };
});