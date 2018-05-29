// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({SimpleParticle, html}) => {
  return class extends SimpleParticle {
    getTemplate(slotName) {
      return html`<join-game on-click="onJoin">Join the game!</join-game>`;
    }
    willReceiveProps(props, state) {
      if (props.user && props.user.name) {
        state.name = props.user.name;
        state.canJoin = !props.gameState || (props.gameState.player1 != state.name && props.gameState.player2 != state.name);
      }
    }
    onJoin(e) {
      let gameState = this._props.gameState;
      let name = this._props.user.name;
      let newGameState = gameState ? Object.assign({}, gameState.rawData) : {};
      if (!gameState || !gameState.player1) {
        newGameState.player1 = name;
      } else {
        newGameState.player2 = name;
      }
      const handle = this.handles.get('gameState');
      handle.set(new (handle.entityClass)(newGameState));
    }
    shouldRender(props, state) {
      return state.canJoin;
    }
  };
});