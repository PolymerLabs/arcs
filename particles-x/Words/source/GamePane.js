/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
'use strict';

/* global defineParticle */

defineParticle(({SimpleParticle, html, resolver, log}) => {

  const importLibrary = filename => importScripts(resolver(`GamePane/${filename}`));

  importLibrary('BoardSolver.js');
  importLibrary('Dictionary.js');
  importLibrary('Scoring.js');
  importLibrary('Tile.js');
  importLibrary('TileBoard.js');

  /* global Dictionary, Tile, TileBoard, Scoring, BoardSolver, CHANCE_OF_FIRE_ON_REFILL, BOARD_WIDTH */

  const template = html`

<style>
  @import url('https://fonts.googleapis.com/css?family=Fredoka+One');
  :host {
    height: 100%;
    background-image: linear-gradient(to right top, #5100ff, #ff00a2, #ff003d, #ffaa00, #d6ff00);
    position: absolute;
    width: 100%;
    padding: 0px;
    -webkit-font-smoothing: antialiased;
  }
  button:enabled {
    cursor: pointer;
  }
  .board {
    cursor: pointer;
    user-select: none;
    height: 382px;
    margin-top: 2em;
    position: relative;
    width: 357px;
    user-select: none;
    margin-left: auto;
    margin-right: auto;
    -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
  }
  .gameInfo {
    font-family: 'Fredoka One', cursive;
    padding-bottom: 0.5em;
    margin: 20px;
    position: relative;
    color: white;
    line-height: 20px;
  }
  .gameInfo:focus,
  button:focus {
    border: none;
    outline: none;
  }
  .gameInfo button {
    font-size: 14px;
    color: rgba(0,0,0,.8);
    text-transform: uppercase;
  }
  .gameInfo button[disabled] {
    opacity: .4;
  }
  .gameInfo .caption {
    font-size: 32px;
    margin-bottom: 12px;
  }
  .gameInfo .score,
  .gameInfo .shuffle,
  .gameInfo .longestWord,
  .gameInfo .highestScoringWord {
    float: left;
    line-height: 20px;
    border-left: 1px solid white;
    padding-left: 8px;
    padding-top: 6px;
  }
  .gameInfo .shuffle,
  .gameInfo .highestScoringWord {
    margin-left: 8px;
  }
  .gameInfo .longestWord {
    clear: left;
  }
  .gameInfo .longestWord,
  .gameInfo .highestScoringWord {
    margin-top: 0.5em;
  }
  .board .tile {
    font-family: 'Fredoka One', cursive;
    border-radius: 16px;
    color: white;
    display: inline-block;
    text-align: center;
    font-size: 18px;
    line-height: 30px;
    width: 28px;
    height: 28px;
    position: absolute;
  }
  .board .points {
    position: absolute;
    font-size: 0.5em;
    line-height: normal;
    top: -4px;
    right: -4px;
    color: #000;
    opacity: .2;
  }
  .board .selected {
    color: white;
    background: white;
  }
  .board .selected span {
    color: red;
  }
  .board .fire {
    animation-name: fire;
    animation-duration: 3s;
    animation-iteration-count: infinite;
    background-color: #ff9999;
    color: white;
  }
  .board .fire.selected {
    animation-name: fireSelected;
    animation-duration: 3s;
    animation-iteration-count: infinite;
    background-color: #ff99ff;
  }
  .board .fire .points {
    color: white;
  }
  .board .annotation {
    position: absolute;
    background: #fff;
    border-radius: 16px;
    color: #ccc;
    font-size: 10px;
    line-height: 28px;
    text-align: center;
  }
  .board .annotation .orientation-left {
    transform: scale(-1,1);
  }
  .board .annotation .orientation-up {
    transform: rotate(-90deg);
  }
  .board .annotation .orientation-down {
    transform: rotate(90deg);
  }
  button {
    font-family: 'Fredoka One', cursive;
    background: none;
    border: none;
    color: black;
  }
  .gameOver {
    text-align: center;
    font-size: 48px;
    color: red;
    width: 100%;
    height: 100%;
    opacity: 0.5;
    background-color: black;
    position: relative;
    z-index: 1000;
    line-height: 381px;
    vertical-align: middle;
    cursor: default;
  }
  @keyframes fire {
    0% { background-color: #ff9999; }
    50% { background-color: #ff0000; }
    100% { background-color: #ff9999; }
  }
  @keyframes fireSelected {
    0% { background-color: #ff99ff; }
    50% { background-color: #ff3399; }
    100% { background-color: #ff99ff; }
  }
  #intro-logo {
    font-family: 'Fredoka One', cursive;
    font-size: 24vw;
    color: white;
    opacity: .15;
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate3d(-50%,-68%,0);
  }
  #button-start {
    cursor: pointer;
    color: white;
    font-size: 28px;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate3d(-50%,180%,0);
    display: block;
    z-index: 10000;
    width: 80%;
  }
  #button-start:focus {
    outline: none;
  }
  @media (max-width: 720px) {
    #intro-logo {
      font-size: 32vw;
    }
    #button-start {
      transform: translate3d(-50%,100%,0);
    }
  }
  #loading-msg {
    font-family: 'Fredoka One', cursive;
    color: white;
    opacity: .7;
    background: none;
    font-size: 36px;
    position: absolute;
    top: 50%;
    left: 50%;
  transform: translate3d(-50%,-50%,0);
    z-index: 10000;
  }
  @keyframes blink {
    0% {
      opacity: .2;
    }
    20% {
      opacity: 1;
    }
    100% {
      opacity: .2;
    }
  }
  #loading-msg span {
    animation-name: blink;
    animation-duration: 1.4s;
    animation-iteration-count: infinite;
    animation-fill-mode: both;
  }
  #loading-msg span:nth-child(2) {
    animation-delay: .2s;
  }
  #loading-msg span:nth-child(3) {
    animation-delay: .4s;
  }
</style>

<div hidden="{{hideStartGame}}">
  <div id="intro-logo">words</div>
  <button id="button-start" on-click="onStartGame">➜ Start Game</button>
</div>
<div id="loading-msg" hidden="{{hideDictionaryLoading}}">
  Loading dictionary<span>.</span><span>.</span><span>.</span>
</div>
<div class="gameInfo" hidden="{{hideGameInfo}}" tabindex="-1" on-keypress="onKeyPress">
  <div class="score"><div class="caption"><span>{{score}}</span> (<span>{{move}}</span> moves)</div>Score</div>
  <div class="shuffle"><div class="caption">{{shuffleAvailableCount}}</div>Shuffles</div>
  <div class="longestWord"><div class="caption">{{longestWord}}</div>Longest</div>
  <div class="highestScoringWord"><div class="caption">{{highestScoringWord}}</div>Highest score</div>
  <div style="position: absolute; right: 0; top: 0; z-index: 10000;">
    <button disabled="{{submitMoveDisabled}}" on-click="onSubmitMove">Submit Move</button>
    <button disabled="{{shuffleDisabled}}" style="padding-left: 2em" on-click="onShuffle">Shuffle</button>
    <button hidden="{{hideSolve}}" style="padding-left: 2em" on-click="onSolve">Solve</button>
  </div>
  <div style="clear: both;"></div>
</div>
<div class="board">
  <div class="gameOver" hidden="{{hideGameOver}}">Game Over</div>
  <span style="position:relative;z-index:1000;">{{boardCells}}</span><span>{{annotations}}</span>
</div>

<template board-cell>
  <div class="{{classes}}" style%="{{style}}" on-mousedown="onTileMouseDown" on-mouseup="onTileMouseUp" on-mousemove="onTileMouseMove" value="{{index}}">
    <span>{{letter}}</span><div class="points">{{points}}</div>
  </div>
</template>

<template annotation>
  <div class="annotation" style%="{{style}}"><div class="{{orientation}}">{{content}}</div></div>
</template>
      `;

  const DICTIONARY_URL =
      'https://raw.githubusercontent.com/shaper/shaper.github.io/master/resources/words-dictionary.txt';

  const RENDER_STATE = {
    START_GAME: {
      hideStartGame: false,
      hideDictionaryLoading: true,
      hideGameInfo: true,
      hideGameOver: true
    },
    LOADING: {
      hideStartGame: true,
      hideDictionaryLoading: false,
      hideGameInfo: true,
      hideGameOver: true
    }
  };

  return class extends SimpleParticle {
    get template() {
      return template;
    }
    update(props, state) {
      const {renderParticle, board} = props;
      if (!state.gameStarted && board && board.letters) {
        this.onStartGame();
      }
      if (renderParticle && !state.renderParticleSpec) {
        const renderParticleSpec = JSON.stringify(renderParticle.toLiteral());
        this.setState({renderParticleSpec});
      }
      if (state.gameStarted && state.dictionary) {
        this.updateBoard(props, state);
      }
    }
    updateBoard(props, state) {
      let {board, stats, person} = props;
      if (!board) {
        // TileBoard.create returns a board configuration POJO
        board = this.setBoard(TileBoard.create());
      }
      // TileBoard constructor consumes a board configuration POJO
      const tileBoard = new TileBoard(board);
      if (!stats && person) {
        this.setStats(Scoring.create(person, board.gameId));
      }
      board.chanceOfFireOnRefill = CHANCE_OF_FIRE_ON_REFILL;
      const {moveData, moveTiles} = this.processSubmittedMove(props, state, tileBoard);
      this.setState({
        tileBoard,
        move: moveData,
        selectedTiles: moveTiles,
        moveScore: Scoring.wordScore(moveTiles),
        score: stats ? stats.score : 0,
        moveSubmitted: false
      });
    }
    processSubmittedMove(props, state, tileBoard) {
      const {move, person, stats} = props;
      let moveData = move ? this.dataClone(move) : {coordinates: ''};
      let moveTiles = this.moveToTiles(tileBoard, move);
      let score = 0;
      if (state.dictionary && state.moveSubmitted /*&& !state.renderParticleSpec*/) {
        const word = this.tilesToWord(moveTiles);
        if (!Scoring.isMinimumWordLength(moveTiles.length)) {
          log(`Word is too short [word=${word}].`);
        } else if (!state.dictionary.contains(word)) {
          log(`Word is not in dictionary [word=${word}].`);
        } else {
          score = this.scoreWord(word, tileBoard, moveTiles, person, stats);
          //this.updatePosts(props, state, tileBoard);
        }
        moveData = {coordinates: '', gameId: tileBoard.gameId};
        this.setMove(moveData);
        moveTiles = [];
      }
      return {moveData, moveTiles, score};
    }
    scoreWord(word, tileBoard, moveTiles, person, stats) {
      const score = Scoring.wordScore(moveTiles);
      log(`Scoring word [word=${word}, score=${score}].`);
      const gameOver = tileBoard.applyMove(moveTiles);
      if (gameOver) {
        log('Ending game.');
      }
      this.setStats(Scoring.applyMoveStats(tileBoard.gameId, person, stats, word, score));
      const gameState = gameOver ? TileBoard.State.GAME_OVER : TileBoard.State.ACTIVE;
      this.setBoard({
        gameId: tileBoard.gameId,
        letters: tileBoard.toString(),
        shuffleAvailableCount: tileBoard.shuffleAvailableCount,
        state: TileBoard.StateToNumber[gameState]
      });
      return score;
    }
    render(props, state) {
      if (!state.gameStarted) {
        return RENDER_STATE.START_GAME;
      }
      if (!state.dictionary) {
        return RENDER_STATE.LOADING;
      }
      const boardModels = this.boardToModels(state.tileBoard, state.move ? state.move.coordinates : '');
      const annotationModels = this.selectedTilesToModels(state.selectedTiles);
      const word = this.tilesToWord(state.selectedTiles);
      const submitMoveEnabled =
          Scoring.isMinimumWordLength(state.selectedTiles.length) &&
          state.dictionary.contains(word)
          ;
      const gameOver = state.tileBoard.state == TileBoard.State.GAME_OVER;
      return {
        annotations: {$template: 'annotation', models: annotationModels},
        boardCells: {$template: 'board-cell', models: boardModels},
        move: `${props.stats.moveCount || 0}`,
        longestWord: Scoring.longestWordText(props.stats),
        highestScoringWord: Scoring.highestScoringWordText(props.stats),
        shuffleAvailableCount: `${state.tileBoard.shuffleAvailableCount}`,
        score: `${state.score}`,
        submitMoveDisabled: gameOver || !submitMoveEnabled,
        shuffleDisabled: gameOver || state.tileBoard.shuffleAvailableCount <= 0,
        hideSolve: !state.debugMode,
        hideStartGame: true,
        hideDictionaryLoading: true,
        hideGameInfo: false,
        hideGameOver: !gameOver
      };
    }
    boardToModels(tileBoard, coordinates) {
      const models = [];
      for (let i = 0; i < tileBoard.size; i++) {
        const tile = tileBoard.tileAtIndex(i);
        const letterClasses = ['tile'];
        let yPixels = tile.y * 50 + tile.y;
        if (tile.isShiftedDown) {
          yPixels += 25;
        }
        if (coordinates.indexOf(`(${tile.x},${tile.y})`) != -1) {
          letterClasses.push('selected');
        }
        if (tile.style == Tile.Style.FIRE) {
          letterClasses.push('fire');
        }
        models.push({
          letter: tile.letter,
          points: Scoring.pointsForLetter(tile.letter),
          index: i,
          style: `top: ${yPixels}px; left: ${tile.x * 50 + tile.x}px;`,
          classes: letterClasses.join(' ')
        });
      }
      return models;
    }
    moveToTiles(tileBoard, move) {
      const tiles = [];
      if (!tileBoard || !move || !move.coordinates) {
        return tiles;
      }
      // TODO(wkorman): If move coordinates were stored as a list of x/y tuples
      // this would be much simpler.
      const tuples = move.coordinates.match(/(\d+,\d+)/g);
      for (let i = 0; i < tuples.length; i++) {
        const parts = tuples[i].split(',');
        const x = parseInt(parts[0]);
        const y = parseInt(parts[1]);
        tiles.push(tileBoard.tileAt(x, y));
      }
      return tiles;
    }
    tilesToWord(tiles) {
      return tiles.map(t => t.letter).join('');
    }
    topPixelForHorizontalTransition(fromTile, toTile) {
      let topPixel = fromTile.y * 50 + 18 + fromTile.y;
      if (fromTile.isShiftedDown) {
        topPixel += 25;
        if (toTile.y == fromTile.y) {
          topPixel -= 12;
        } else {
          topPixel += 12;
        }
      } else {
        if (toTile.y == fromTile.y) {
          topPixel += 12;
        } else {
          topPixel -= 12;
        }
      }
      return topPixel;
    }
    tileTransitionToTextAndPosition(fromTile, toTile) {
      // A sad hard-coded pixel positioned hack. Rework to use alignment with
      // the involved tile position.
      let contentText;
      let positionText;
      let orientation;
      if (toTile.x > fromTile.x) {
        // contentText = '→';
        contentText = '➜'; // right arrow
        orientation = 'orientation-right';
        const tilesFromRight = BOARD_WIDTH - fromTile.x - 1;
        const topPixel = this.topPixelForHorizontalTransition(fromTile, toTile);

        let downward = false;
        // calculate upward or downward
        if (fromTile.x%2==0) {
          if (toTile.y > fromTile.y) {
            downward = true;
          }
        } else {
          if (toTile.y == fromTile.y) {
            downward = true;
          }
        }
        if (downward) {
          positionText = `top: ${topPixel - 18}px; right: ${
              tilesFromRight * 50 + tilesFromRight - 30}px; width: 83px; height: 29px; transform: rotate(27deg);`;

        } else {
          positionText = `top: ${topPixel - 20}px; right: ${
              tilesFromRight * 50 + tilesFromRight - 30}px; width: 83px; height: 29px; transform: rotate(-27deg);`;

        }

      } else if (toTile.x < fromTile.x) {
        contentText = '➜';
        orientation = 'orientation-left';
        const topPixel = this.topPixelForHorizontalTransition(fromTile, toTile);

        let downward = false;
        // calculate upward or downward
        if (fromTile.x%2==0) {
          if (toTile.y > fromTile.y) {
            downward = true;
          }
        } else {
          if (toTile.y == fromTile.y) {
            downward = true;
          }
        }
        if (downward) {
          positionText =
              `top: ${topPixel - 18.5}px; left: ${fromTile.x * 50 + fromTile.x - 53}px; width: 83px; height: 29px; transform: rotate(-27deg);`;

        } else {
          positionText =
              `top: ${topPixel - 18.5}px; left: ${fromTile.x * 50 + fromTile.x - 53}px; width: 83px; height: 29px; transform: rotate(27deg);`;

        }
      } else if (toTile.y > fromTile.y) {
        contentText = '➜';//'↓';
        orientation = 'orientation-down';
        let topPixel = (fromTile.y + 1) * 50 - 7 + fromTile.y;
        if (fromTile.isShiftedDown) {
          topPixel += 25;
        }
        positionText =
            `top: ${topPixel-43}px; left: ${fromTile.x * 50 + fromTile.x }px; width: 28px; height: 80px; line-height:80px;`;
      } else {
        contentText = '➜';//'↑';
        orientation = 'orientation-up';
        let topPixel = fromTile.y * 50 - 9 + fromTile.y;
        if (fromTile.isShiftedDown) {
          topPixel += 25;
        }
        positionText =
            `top: ${topPixel-43}px; left: ${fromTile.x * 50 + fromTile.x }px; width: 28px; height: 80px; line-height:80px;`;
      }
      return [contentText, positionText, orientation];
    }
    selectedTilesToModels(selectedTiles) {
      const models = [];
      if (selectedTiles.length < 2) {
        return models;
      }
      for (let i = 0; i < selectedTiles.length - 1; i++) {
        const [contentText, positionText, orientation] = this.tileTransitionToTextAndPosition(
            selectedTiles[i], selectedTiles[i + 1]);
        models.push({style: positionText, content: contentText, orientation: orientation});
      }
      return models;
    }
    onKeyPress(e, state) {
      this.setState({debugMode: true});
    }
    onTileMouseDown(e, state) {
      state.lastTileMoused = e.data.value;
      this.selectTile(e, state);
    }
    onTileMouseUp(e, state) {
      state.lastTileMoused = null;
      this.setState({lastTileMoused: state.lastTileMoused});
    }
    onTileMouseMove(e, state) {
      if (state.lastTileMoused && state.lastTileMoused != e.data.value) {
        state.lastTileMoused = e.data.value;
        this.selectTile(e, state);
      }
    }
    selectTile(e, state) {
      const tile = state.tileBoard.tileAtIndex(e.data.value);
      const lastSelectedTile = state.selectedTiles.length == 0 ?
          undefined :
          state.selectedTiles[state.selectedTiles.length - 1];
      // log(
      //   `_selectTile [tile=${tile}, lastSelectedTile=${
      //     lastSelectedTile ? lastSelectedTile : 'undefined'
      //   }].`
      // );
      if (!state.tileBoard.isMoveValid(state.selectedTiles, tile)) {
        return;
      }
      let newCoordinates = '';
      if (lastSelectedTile && lastSelectedTile.x == tile.x &&
          lastSelectedTile.y == tile.y) {
        // User clicked on same tile last clicked, so de-select it.
        state.selectedTiles.pop();
        // We could pop the last tuple but it's easier to just rebuild,
        // and hopefully we'll move away from a string tuple hack soon.
        for (let i = 0; i < state.selectedTiles.length; i++) {
          if (i > 0) {
            newCoordinates += ',';
          }
          const buildTile = state.selectedTiles[i];
          newCoordinates += `(${buildTile.x},${buildTile.y})`;
        }
      } else {
        // Append the new tile to the existing selection.
        state.selectedTiles.push(tile);
        newCoordinates = `(${tile.x},${tile.y})`;
        if (state.move.coordinates) {
          newCoordinates = `${state.move.coordinates},${newCoordinates}`;
        }
      }
      state.move.coordinates = newCoordinates;
      // TODO(wkorman): Consider making Move purely state.
      this.setMove(
          {gameId: state.tileBoard.gameId, coordinates: newCoordinates});
      this.setState({
        move: state.move,
        lastTileMoused: state.lastTileMoused,
        selectedTiles: state.selectedTiles
      });
    }
    onSubmitMove(e, state) {
      this.setState({moveSubmitted: true});
    }
    onShuffle(e, state) {
      log(`Shuffling [remaining=${state.tileBoard.shuffleAvailableCount}].`);
      if (state.tileBoard.shuffle()) {
        this.setBoard({
          gameId: state.tileBoard.gameId,
          letters: state.tileBoard.toString(),
          shuffleAvailableCount: state.tileBoard.shuffleAvailableCount,
          state: TileBoard.StateToNumber[state.tileBoard.state]
        });
      }
    }
    async onStartGame(e, state) {
      this.setState({
        gameStarted: true,
        dictionaryLoadingStarted: true,
        hideStartGame: true,
        hideDictionaryLoading: false
      });
      const startstamp = performance.now();
      const response = await fetch(DICTIONARY_URL);
      const text = await response.text();
      const dictionary = new Dictionary(text);
      const elapsed = Math.floor(performance.now() - startstamp);
      log(`Loaded dictionary [time=${elapsed}ms, wordCount=${
          dictionary.size}].`);
      this.setState({dictionary});
    }
    onSolve(e, state) {
      const solver = new BoardSolver(state.dictionary, state.tileBoard);
      const words = solver.getValidWords();

      let longestWord;
      let highestScoringWord;
      let highestScore = 0;
      for (let i = 0; i < words.length; i++) {
        if (!longestWord || words[i].text.length > longestWord.text.length) {
          longestWord = words[i];
        }
        const wordTiles = [];
        for (let j = 0; j < words[i].text.length; j++) {
          wordTiles.push(new Tile(0, words[i].text.charAt(j)));
        }
        const wordScore = Scoring.wordScore(wordTiles);
        if (wordScore > highestScore) {
          highestScore = wordScore;
          highestScoringWord = words[i];
        }
      }

      log(`Solving [words=${words.length}, longestWord=${
          longestWord}, highestScoringWord=${highestScoringWord} (${
          highestScore})].`);
    }
    setMove(move) {
      this.set('move', move);
      return move;
    }
    setBoard(board) {
      // TODO(wkorman): See if we can preserve id and reuse existing instance.
      this.set('board', board);
      return board;
    }
    setStats(stats) {
      this.set('stats', stats);
      return stats;
    }
    //
    // social bits
    //
/*
    updatePosts(props, state, tileBoard) {
      // TODO(wkorman): Rework the below for brevity and simplicity. We
      // should only really need to write this once, and ideally to a
      // single Post rather than a collection.
      const postValues = {
        arcKey: props.key,
        author: props.person.id,
        createdTimestamp: Date.now(),
        renderRecipe: this.buildRenderRecipe(props.renderParticle, tileBoard.gameId),
        renderParticleSpec: state.renderParticleSpec
      };
      const newPost = this.set('post', postValues);
      for (let i = props.posts.length - 1; i >= 0; i--) {
        this.handles.get('posts').remove(props.posts[i]);
      }
      this.updateCollection('posts', newPost);
    }
    buildRenderRecipe(renderParticle, gameId) {
      return SimpleParticle
          .buildManifest`
${renderParticle}

store GameId of GameIdStore {Text gameId} in GameIdJson
resource GameIdJson
  start
  [{"gameId": "${gameId}"}]

recipe
  avatars: map 'BOXED_avatar'
  boxedBoards: map 'BOXED_board'
  boxedStats: map 'BOXED_stats'
  boxedMoves: map 'BOXED_move'
  gameId: map GameId
  people: use #identities
  user: use #user
  handle1: use '{{item_id}}'
  slot1: slot '{{slot_id}}'
  {{other_handles}}
  ${renderParticle.name}
    ${renderParticle.connections[0].name}: reads handle1
    boxedBoards: reads boxedBoards
    boxedStats: reads boxedStats
    boxedMoves: reads boxedMoves
    gameId: reads gameId
    avatars: reads avatars
    people: reads people
    user: reads user
    {{other_connections}}
    item: consumes slot1
      `.trim();
    }
    */

  };
});
