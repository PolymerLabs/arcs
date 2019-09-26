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
  <b>To add a player, enter their name:</b>
  <input value="{{name}}" placeholder="Enter your name" spellcheck="false" on-change="onNameInputChange"> <button on-click="onClick">Enter</button>
    `;

  return class extends DomParticle {
    get template() {
      return template;
    }

    update(props, {enteredName}) {
      // Set default name.
      if (!enteredName) {
        this.setState({enteredName: 'Human'});
      }
    }

    onNameInputChange(e) {
      // Save entered name.
      this.setState({enteredName: e.data.value});
    }

    onClick() {
      // Add the player to the players handle.
      const charX = 88; // X is 88 in unicode.
      const newAvatar = String.fromCharCode(charX + this.props.players.length - 1);
      this.appendRawDataToHandle('players', [{name: this.state.enteredName, avatar: newAvatar}]);
    }
  };
});