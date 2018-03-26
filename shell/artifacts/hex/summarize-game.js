// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({SimpleParticle, html}) => {
  return class extends SimpleParticle {
    getTemplate(slotName) {
      return html`<div>{{message}}</div>`;
    }
    willReceiveProps(props, state) {
      if (!props.gameState) {
        return;
      }
      let {player1, player2, winner, nextPlayer} = props.gameState;
      if (!player1 && !player2) {
        state.message = 'Waiting for players.';
      } else if (player1 && player2) {
        let turn = winner ? `${winner} wins!` : `${nextPlayer}'s turn`;
        state.message = `${player1} vs ${player2}: ${turn}`;
      } else {
        state.message = `${player1 || player2} is waiting for an opponent.`;
      }
    }
    render(props, state) {
      return state;
    }
  };
});
