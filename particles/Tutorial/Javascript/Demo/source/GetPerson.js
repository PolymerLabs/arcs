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
      if (!enteredName) {
        this.setState({enteredName: 'Human'});
      }
    }

    onNameInputChange(e) {
      this.setState({enteredName: e.data.value});
    }

    onClick() {
      const newAvatar = String.fromCharCode(87 + this.props.players.length);
      console.log(`enteredName: `, this.state.enteredName);
      this.appendRawDataToHandle('players', [{name: this.state.enteredName, avatar: newAvatar}]);
    }
  };
});