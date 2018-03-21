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
      hex-cell:hover {
        background: var(--current-player-color);
        opacity: 0.5;
      }
      hex-cell[player=p1] {
        background: var(--hex-p1);
        opacity: 1;
      }
      hex-cell[player=p2] {
        background: var(--hex-p2);
        opacity: 1;
      }
    </style>
    hex-game <hex-game player$="{{player}}" slotid="board"></hex-game>`;
  const cellTemplate = `<hex-cell player$="{{player}}" on-click="onCellClick"></hex-cell>`;

  class Board {
    constructor(size) {
      this._size = size;
      this._board = [];
      this._board.length = size * size;
    }

    get size() {
      return this._size;
    }

    setCell(x, y, value) {
      this._board[x + this.size * y] = value;
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

  let i = 0;
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
          player: this._player,
        };
      }
      if (this.currentSlotName == 'cell') {
        return {
          items: this._board.toModel(),
        };
      }
    }
    onCellClick() {
      // TODO: who clicked me?
      let x = Math.random() * this._board.size |0;
      let y = Math.random() * this._board.size |0;
      this._board.setCell(x, y, this._player);
      this._player = this._player == 'p1' ? 'p2' : 'p1';
      this.setState({a: Math.random()});
    }
  };
});