// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({DomParticle}) => {
  const rootTemplate = `
    <style>
      hex-game {
        --hex-p1: #F44336;
        --hex-p2: #2196F3;
      }
      hex-game[player=p1] {
        --current-player-color: var(--hex-p1);
      }
      hex-game[player=p2] {
        --current-player-color: var(--hex-p2);
      }
      hex-game[can-swap] {
        --swap-color: var(--current-player-color);
      }

      /* TODO: Remove this once we switch slots to use shadow dom */
      hexa-gon > div {
        width: 100%;
        height: 100%;
      }
      hex-cell {
        width: 100%;
        height: 100%;
        display: block;
      }
      hex-game[can-swap] hex-cell:hover,
      hex-cell:not([player]):hover {
        background: var(--current-player-color);
        opacity: 0.5;
      }
      hex-cell[player=p1] {
        background: var(--hex-p1);
      }
      hex-cell[player=p2] {
        background: var(--hex-p2);
      }
    </style>
    hex-game <hex-game player$="{{player}}" can-swap$="{{canSwap}}" slotid="board"></hex-game>`;
  const cellTemplate = `<hex-cell player$="{{player}}" on-click="onCellClick"></hex-cell>`;

  class Board {
    constructor(size) {
      this._size = size;
      this._board = [];
      this._board.length = size * size;
      this._player = 0;
      this._moves = 0;
    }

    get size() {
      return this._size;
    }

    get canSwap() {
      return this._moves == 1;
    }

    get player() {
      return this._player ? 'p1' : 'p2';
    }

    trySetCell(x, y) {
      if (!this._board[x + this.size * y] || this.canSwap) {
        this._board[x + this.size * y] = this.player;
        this._player ^= 1;
        this._moves++;
        return true;
      }
      return false;
    }

    cell(x, y) {
      return this._board[x + this.size * y];
    }

    toModel() {
      let result = [];
      for (let x = 0; x < this.size; x++) {
        for (let y = 0; y < this.size; y++) {
          let value = this.cell(x, y);
          if (value) {
            result.push({subId: `${x}-${y}`, player: value});
          }
        }
      }
      return result;
    }
  }

  return class extends DomParticle {
    constructor() {
      super();
      this._board = new Board(8);
      this._player = 'p1';
    }
    getTemplate(slotName) {
      if (slotName == 'root')
        return rootTemplate;
      else if (slotName == 'cell')
        return cellTemplate;
    }
    render(props, state) {
      if (this.currentSlotName == 'root') {
        return {
          player: state.player,
          canSwap: state.canSwap,
        };
      }
      if (this.currentSlotName == 'cell') {
        return {
          items: state.cells || [],
        };
      }
    }
    onCellClick(e) {
      let subId = e.data.subId;
      let [x, y] = subId.split('-');
      x = Number(x);
      y = Number(y);
      let board = this._board;
      board.trySetCell(x, y);
      this.setState({
        player: board.player,
        canSwap: board.canSwap,
        cells: board.toModel(),
      });
    }
  };
});