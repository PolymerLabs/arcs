// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({DomParticle, html}) => {
  const rootTemplate = html`
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
      hex-cell[border=xy] {
        --border-rotation: 30deg;
      }
      hex-cell[border=yX] {
        --border-rotation: -60deg;
      }
      hex-cell[border=xY] {
        --border-rotation: 120deg;
      }
      hex-cell[border=XY] {
        --border-rotation: 210deg;
      }
      hex-cell[border] {
        background: linear-gradient(var(--border-rotation), var(--hex-x) 0%, var(--hex-x) 50%, var(--hex-y) 50%, var(--hex-y) 0%);
        opacity: 0.25;
      }
      hex-cell[border=x i] {
        background: var(--hex-x);
      }
      hex-cell[border=y i] {
        background: var(--hex-y);
      }
      hex-game[can-move][can-swap] hex-cell:hover,
      hex-game[can-move] hex-cell:not([player]):hover {
        background: var(--current-player-color);
        opacity: 0.5;
      }
      hex-cell[player=x] {
        background: var(--hex-x);
        opacity: 1;
      }
      hex-cell[player=y] {
        background: var(--hex-y);
        opacity: 1;
      }
    </style>
    <div slotid="summary"></div>
    <hex-game player$="{{player}}" can-move$="{{canMove}}" can-swap$="{{canSwap}}" slotid="board"></hex-game>`;
  const cellTemplate = html`<hex-cell player$="{{move}}" border$="{{border}}" on-click="onCellClick" key="{{key}}"></hex-cell>`;

  class Board {
    constructor(size) {
      this._size = size;
      this.reset({});
    }

    get size() {
      return this._size;
    }

    get canSwap() {
      return this._moves == 1;
    }

    get player() {
      return this.winner ? null : this._moves % 2 ? 'x' : 'y';
    }

    get winner() {
      return this._winner;
    }

    _tryFindWinner(x, y, seen) {
      seen = seen || {};
      if (x == undefined) {
        // Start a search along one x and one y edge.
        for (let i = 0; i < this._size; i++) {
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
          let border = [];
          if (x == 0) border.push('x');
          if (y == 0) border.push('y');
          if (x == this.size - 1) border.push('X');
          if (y == this.size - 1) border.push('Y');
          let model = {
            subId: `${x}-${y}`,
            key: {x, y},
          };
          if (border.length) {
            model.border = border.join('');
          }
          let move = this.cell(x, y);
          if (move) {
            model.move = move;
          }
          result.push(model);
        }
      }
      return result;
    }

    serialize() {
      let filledCells = this._board.reduce((acc, v) => acc + (v ? 1 : 0), 0);
      return {
        board: this._board.map(v => v || ' ').join(''),
        swapped: this._moves != filledCells,
      };
    }

    reset({board, swapped}) {
      if (!board) {
        this._board = [];
        for (let i = 0; i < this._size * this._size; i++) {
          this._board.push(null);
        }
        this._moves = 0;
        this._winner = null;
        return;
      }
      this._board = board.split('').map(v => v == ' ' ? null : v);
      this._moves = this._board.reduce((acc, v) => acc + (v ? 1 : 0), 0) + (swapped ? 1 : 0);
      this._tryFindWinner();
    }
  }

  return class extends DomParticle {
    constructor() {
      super();
      this._board = new Board(11);
      this._player = 'x';
      let board = this._board;
      this.setState({
        player: board.player,
        canSwap: board.canSwap,
        items: board.toModel(),
      });
    }
    getTemplate(slotName) {
      if (slotName == 'root')
        return rootTemplate;
      else if (slotName == 'cell')
        return cellTemplate;
    }
    willReceiveProps(props, state, oldProps, oldState) {
      if (!props.user || !props.gameState || !props.gameState.player1 || !props.gameState.player2) {
        state.canMove = false;
        return;
      }
      let board = this._board;
      if (!oldProps.gameState || props.gameState.board != oldProps.gameState.board) {
        board.reset(props.gameState);
        state.player = board.player;
        state.canSwap = board.canSwap;
        state.items = board.toModel();
      }
      state.canMove = board.player == 'x' && props.user.name == props.gameState.player1 
                   || board.player == 'y' && props.user.name == props.gameState.player2;
      // TODO: both players should be able to publish the initial state, but due
      //       to a race in the storage shim we can end up looping forever.
      if (props.user.name == props.gameState.player1 && !props.gameState.nextPlayer && !props.gameState.winner) {
        this.publishGameState(props.gameState);
      }
    }
    render(props, state) {
      return state;
    }
    onCellClick({data: {key: {x, y}}}) {
      if (!this._state.canMove) {
        return;
      }
      if (this._board.trySetCell(x, y)) {
        this.publishGameState();
      }
    }
    publishGameState(gameState) {
      if (!gameState) {
        gameState = this._props.gameState;
      }

      let newGameState = Object.assign({}, gameState.rawData);
      Object.assign(newGameState, this._board.serialize());
      if (this._board.winner) {
        newGameState.winner = this._board.winner == 'x' ? newGameState.player1 : newGameState.player2;
      }
      newGameState.nextPlayer =
          this._board.player 
              ? this._board.player == 'x'
                    ? newGameState.player1
                    : newGameState.player2 
              : null;
      const handle = this.handles.get('gameState');
      handle.set(new (handle.entityClass)(newGameState));
    }
  };
});