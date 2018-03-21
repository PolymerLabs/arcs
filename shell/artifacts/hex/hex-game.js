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
        --hex-x: #F44336;
        --hex-y: #2196F3;
      }
      hex-game[player=x] {
        --current-player-color: var(--hex-x);
      }
      hex-game[player=y] {
        --current-player-color: var(--hex-y);
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
      hex-cell[player=x] {
        background: var(--hex-x);
      }
      hex-cell[player=y] {
        background: var(--hex-y);
      }
    </style>
    hex-game <hex-game player$="{{player}}" can-swap$="{{canSwap}}" slotid="board"></hex-game>`;
  const cellTemplate = `<hex-cell player$="{{player}}" on-click="onCellClick"></hex-cell>`;

  class Board {
    constructor(size) {
      this._size = size;
      this._board = [];
      this._player = 0;
      this._moves = 0;
      this._winner = null;
    }

    get size() {
      return this._size;
    }

    get canSwap() {
      return this._moves == 1;
    }

    get player() {
      return this.winner ? null : this._player ? 'x' : 'y';
    }

    get winner() {
      return this._winner;
    }

    _tryFindWinner(x, y, seen) {
      seen = seen || {};
      if (x == undefined) {
        // Start a search along one x and one y edge.
        for (let i = 0; i < size; i++) {
          if (this._tryFindWinner(0, i, seen) || this._tryFindWinner(i, 0, seen))
            return true;
        }
        return false;
      }
      // Traverse all cells adjacent to {x, y} that are set to the same value.
      // If we can traverse both extremities then we have found a connecting path.
      let target = this.cell(x, y);
      if (!target) {
        return false;
      }
      let queue = [[x, y]];
      let min = Infinity;
      let max = -Infinity;
      let size = this.size;
      while (queue.length) {
        let [x, y] = queue.pop();
        seen[x + '-' + y] = true;
        let neighbours = [
          [x+0, y-1],
          [x+1, y-1],
          [x-1, y+0],
          [x+1, y+0],
          [x-1, y+1],
          [x+0, y+1],
        ];
        queue.push(...neighbours.filter(([x, y]) => this.cell(x, y) == target && !seen[x + '-' + y]));
        let value = target == 'x' ? x : y;
        min = Math.min(value, min);
        max = Math.max(value, max);
      }
      if (min == 0 && max == size - 1) {
        this._winner = target;
        return true;
      }
      return false;
    }

    trySetCell(x, y) {
      if (this._winner) {
        return false;
      }
      if (!this._board[x + this.size * y] || this.canSwap) {
        this._board[x + this.size * y] = this.player;
        this._player ^= 1;
        this._moves++;
        this._tryFindWinner(x, y);
        return true;
      }
      return false;
    }

    cell(x, y) {
      if (x >= 0 && x < this.size && y >= 0 && y < this.size)
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
      this._player = 'x';
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