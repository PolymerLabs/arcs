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

defineParticle(({DomParticle, resolver}) => {
  function importLibrary(filename) {
    importScripts(resolver(`GamePane/${filename}`));
  }
  importLibrary('BoardSolver.js');
  importLibrary('Dictionary.js');
  importLibrary('Scoring.js');
  importLibrary('Tile.js');
  importLibrary('TileBoard.js');

  const host = `move-picker`;

  const styles = `
 <style>
   [${host}] {
     padding: 5px;
   }
   [${host}] .board {
     cursor: pointer;
     user-select: none;
   }
   [${host}] .gameInfo {
     font-size: 1.2em;
     font-variant-caps: all-small-caps;
     padding-bottom: 0.5em;
   }
   [${host}] .board {
     height: 382px;
     width: 357px;
     position: relative;
     user-select: none;
     margin-left: auto;
     margin-right: auto;
     -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
   }
   [${host}] .board .tile {
     background-color: wheat;
     border-radius: 3px;
     color: black;
     display: inline-block;
     text-align: center;
     font: sans-serif;
     line-height: 50px;
     width: 50px;
     height: 50px;
     margin: 1px;
     position: absolute;
   }
   [${host}] .board .points {
     position: absolute;
     font-size: 0.8em;
     line-height: normal;
     top: 0.1em;
     right: 0.2em;
     color: #cc6600;
   }
   [${host}] .board .selected {
     background-color: goldenrod;
     color: white;
   }
   [${host}] .board .selected .points {
     color: white;
   }
   [${host}] .board .fire {
     animation-name: fire;
     animation-duration: 3s;
     animation-iteration-count: infinite;
     background-color: #ff9999;
     color: white;
   }
   [${host}] .board .fire.selected {
     animation-name: fireSelected;
     animation-duration: 3s;
     animation-iteration-count: infinite;
     background-color: #ff99ff;
   }
   [${host}] .board .fire .points {
     color: white;
   }
   [${host}] .board .annotation {
     position: absolute;
   }
   [${host}] .gameOver {
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
 </style>
   `;

  const template = `
 ${styles}
 <div ${host}>
   <div class="loadingDictionary" hidden="{{hideDictionaryLoading}}">
     Loading dictionary&hellip;
   </div>
   <div class="gameInfo" hidden="{{hideGameInfo}}" tabindex="-1" on-keypress="_onKeyPress">
     <div class="score">Score: <span>{{score}}</span></div>
     <div class="move">Move: <span>{{move}}</span></div>
     <div class="longestWord">Longest word: <span>{{longestWord}}</span></div>
     <div class="highestScoringWord">Highest scoring word: <span>{{highestScoringWord}}</span></div>
     <div class="shuffle">Shuffles Remaining: <span>{{shuffleAvailableCount}}</span></div>
     <div>
       <button disabled="{{submitMoveDisabled}}" on-click="_onSubmitMove">Submit Move</button>
       <button disabled="{{shuffleDisabled}}" style%="padding-left: 2em" on-click="_onShuffle">Shuffle</button>
       <button hidden="{{hideSolve}}" style%="padding-left: 2em" on-click="_onSolve">Solve</button>
     </div>
   </div>
   <div class="board">
   <div class="gameOver" hidden="{{hideGameOver}}">Game Over</div>
     <span>{{boardCells}}</span><span>{{annotations}}</span></div>
 </div>
 <template board-cell>
   <div class="{{classes}}" style%="{{style}}" on-mousedown="_onTileMouseDown" on-mouseup="_onTileMouseUp" on-mousemove="_onTileMouseMove" value="{{index}}">
     <span>{{letter}}</span><div class="points">{{points}}</div>
   </div>
 </template>
 <template annotation>
   <div class="annotation" style%="{{style}}">{{content}}</div>
 </template>
      `.trim();

  const DICTIONARY_URL =
      'https://raw.githubusercontent.com/shaper/shaper.github.io/master/resources/words-dictionary.txt';

  const info = console.log.bind(
      console.log,
      '%cGamePane',
      `background: #ff69b4; color: white; padding: 1px 6px 2px 7px; border-radius: 6px;`);

  return class extends DomParticle {
    get template() {
      return template;
    }
    _boardToModels(tileBoard, coordinates) {
      let models = [];
      for (let i = 0; i < tileBoard.size; i++) {
        const tile = tileBoard.tileAtIndex(i);
        const letterClasses = ['tile'];
        let yPixels = tile.y * 50 + tile.y;
        if (tile.isShiftedDown)
          yPixels += 25;
        if (coordinates.indexOf(`(${tile.x},${tile.y})`) != -1)
          letterClasses.push('selected');
        if (tile.style == Tile.Style.FIRE)
          letterClasses.push('fire');
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
    _moveToTiles(tileBoard, move) {
      let tiles = [];
      if (!tileBoard || !move || !move.coordinates)
        return tiles;
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
    _ensureDictionaryLoaded(state) {
      if (!state.dictionaryLoadingStarted) {
        this._setState({dictionaryLoadingStarted: true});
        const particleRef = this;
        const startstamp = performance.now();
        fetch(DICTIONARY_URL).then(response => response.text().then(text => {
          const dictionary = new Dictionary(text);
          const endstamp = performance.now();
          const elapsed = Math.floor(endstamp - startstamp);
          info(`Loaded dictionary [time=${elapsed}ms, wordCount=${
              dictionary.size}].`);
          particleRef._setState({dictionary});
        }));
      }
    }
    _tilesToWord(tiles) {
      return tiles.map(t => t.letter).join('');
    }
    _processSubmittedMove(props, state, tileBoard) {
      let moveData = props.move ? props.move.rawData : {coordinates: ''};
      let moveTiles = this._moveToTiles(tileBoard, props.move);
      let score = 0;
      if (!state.dictionary || !state.moveSubmitted)
        return [moveData, moveTiles, score];
      const word = this._tilesToWord(moveTiles);
      if (!Scoring.isMinimumWordLength(moveTiles.length)) {
        info(`Word is too short [word=${word}].`);
      } else if (!state.dictionary.contains(word)) {
        info(`Word is not in dictionary [word=${word}].`);
      } else {
        score = Scoring.wordScore(moveTiles);
        info(`Scoring word [word=${word}, score=${score}].`);
        const gameOver = tileBoard.applyMove(moveTiles);
        if (gameOver)
          info('Ending game.');
        this._setStats(Scoring.applyMoveStats(props.person, props.stats, word, score));
        this._setBoard({
          letters: tileBoard.toString(),
          shuffleAvailableCount: tileBoard.shuffleAvailableCount,
          state: TileBoard.StateToNumber
                     [gameOver ? TileBoard.State.GAME_OVER :
                                 TileBoard.State.ACTIVE]
        });
      }
      moveData = {coordinates: ''};
      this._setMove(moveData);
      moveTiles = [];
      return [moveData, moveTiles, score];
    }
    _update(props, state, lastProps, lastState) {
      // info('update [props=', props, 'state=', state, '].');
      this._ensureDictionaryLoaded(state);
      let propsBoard = props.board;
      if (!propsBoard) {
        propsBoard = TileBoard.create();
        this._setBoard(propsBoard);
      }
      if (!props.stats && props.person)
        this._setStats(Scoring.create(props.person));
      // TODO(wkorman): Only construct tile board when none yet exists in state.
      const tileBoard = new TileBoard(propsBoard);
      tileBoard.chanceOfFireOnRefill = CHANCE_OF_FIRE_ON_REFILL;
      let [moveData, moveTiles, moveScore] =
          this._processSubmittedMove(props, state, tileBoard);
      this._setState({
        tileBoard,
        move: moveData,
        selectedTiles: moveTiles,
        moveScore: Scoring.wordScore(moveTiles),
        score: props.stats ? props.stats.score : 0,
        moveSubmitted: false
      });
      super._update(props, state, lastProps, lastState);
    }
    _topPixelForHorizontalTransition(fromTile, toTile) {
      let topPixel = fromTile.y * 50 + 18 + fromTile.y;
      if (fromTile.isShiftedDown) {
        topPixel += 25;
        if (toTile.y == fromTile.y)
          topPixel -= 12;
        else
          topPixel += 12;
      } else {
        if (toTile.y == fromTile.y)
          topPixel += 12;
        else
          topPixel -= 12;
      }
      return topPixel;
    }
    _tileTransitionToTextAndPosition(fromTile, toTile) {
      // A sad hard-coded pixel positioned hack. Rework to use alignment with
      // the involved tile position.
      let contentText, positionText;
      if (toTile.x > fromTile.x) {
        contentText = '→';
        const tilesFromRight = BOARD_WIDTH - fromTile.x - 1;
        let topPixel = this._topPixelForHorizontalTransition(fromTile, toTile);
        positionText = `top: ${topPixel}px; right: ${
            tilesFromRight * 50 + tilesFromRight - 9}px;`;
      } else if (toTile.x < fromTile.x) {
        contentText = '←';
        let topPixel = this._topPixelForHorizontalTransition(fromTile, toTile);
        positionText =
            `top: ${topPixel}px; left: ${fromTile.x * 50 + fromTile.x - 9}px;`;
      } else if (toTile.y > fromTile.y) {
        contentText = '↓';
        let topPixel = (fromTile.y + 1) * 50 - 7 + fromTile.y;
        if (fromTile.isShiftedDown)
          topPixel += 25;
        positionText =
            `top: ${topPixel}px; left: ${fromTile.x * 50 + fromTile.x + 22}px;`;
      } else {
        contentText = '↑';
        let topPixel = fromTile.y * 50 - 9 + fromTile.y;
        if (fromTile.isShiftedDown)
          topPixel += 25;
        positionText =
            `top: ${topPixel}px; left: ${fromTile.x * 50 + fromTile.x + 22}px;`;
      }
      return [contentText, positionText];
    }
    _selectedTilesToModels(selectedTiles) {
      let models = [];
      if (selectedTiles.length < 2)
        return models;
      for (let i = 0; i < selectedTiles.length - 1; i++) {
        let [contentText, positionText] = this._tileTransitionToTextAndPosition(
            selectedTiles[i], selectedTiles[i + 1]);
        models.push({style: positionText, content: contentText});
      }
      return models;
    }
    _render(props, state) {
      // info('render [props=', props, 'state=', state, '].');
      if (!state.tileBoard)
        return {
          hideDictionaryLoading: false,
          hideGameInfo: true,
          hideGameOver: true
        };
      let boardModels = this._boardToModels(
          state.tileBoard, state.move ? state.move.coordinates : '');
      let annotationModels = this._selectedTilesToModels(state.selectedTiles);
      const word = this._tilesToWord(state.selectedTiles);
      const moveText = `${word} (${Scoring.wordScore(state.selectedTiles)})`;
      const submitMoveEnabled =
          Scoring.isMinimumWordLength(state.selectedTiles.length) &&
          state.dictionary.contains(word);
      const gameOver = state.tileBoard.state == TileBoard.State.GAME_OVER;
      return {
        annotations: {$template: 'annotation', models: annotationModels},
        boardCells: {$template: 'board-cell', models: boardModels},
        move: moveText,
        longestWord: Scoring.longestWordText(props.stats),
        highestScoringWord: Scoring.highestScoringWordText(props.stats),
        shuffleAvailableCount: state.tileBoard.shuffleAvailableCount,
        score:
            `${state.score} (${props.stats ? props.stats.moveCount : 0} moves)`,
        submitMoveDisabled: gameOver || !submitMoveEnabled,
        shuffleDisabled: gameOver || state.tileBoard.shuffleAvailableCount <= 0,
        hideSolve: !state.debugMode,
        hideDictionaryLoading: true,
        hideGameInfo: false,
        hideGameOver: !gameOver
      };
    }
    _onKeyPress(e, state) {
      this._setState({debugMode: true});
    }
    _onTileMouseDown(e, state) {
      state.lastTileMoused = e.data.value;
      this._selectTile(e, state);
    }
    _onTileMouseUp(e, state) {
      state.lastTileMoused = null;
      this._setState({lastTileMoused: state.lastTileMoused});
    }
    _onTileMouseMove(e, state) {
      if (state.lastTileMoused && state.lastTileMoused != e.data.value) {
        state.lastTileMoused = e.data.value;
        this._selectTile(e, state);
      }
    }
    _selectTile(e, state) {
      const tile = state.tileBoard.tileAtIndex(e.data.value);
      let lastSelectedTile = state.selectedTiles.length == 0 ?
          undefined :
          state.selectedTiles[state.selectedTiles.length - 1];
      // info(
      //   `_selectTile [tile=${tile}, lastSelectedTile=${
      //     lastSelectedTile ? lastSelectedTile : 'undefined'
      //   }].`
      // );
      if (!state.tileBoard.isMoveValid(state.selectedTiles, tile))
        return;
      let newCoordinates = '';
      if (lastSelectedTile && lastSelectedTile.x == tile.x &&
          lastSelectedTile.y == tile.y) {
        // User clicked on same tile last clicked, so de-select it.
        state.selectedTiles.pop();
        // We could pop the last tuple but it's easier to just rebuild,
        // and hopefully we'll move away from a string tuple hack soon.
        for (let i = 0; i < state.selectedTiles.length; i++) {
          if (i > 0)
            newCoordinates += ',';
          let buildTile = state.selectedTiles[i];
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
      this._setMove({coordinates: newCoordinates});
      this._setState({
        move: state.move,
        lastTileMoused: state.lastTileMoused,
        selectedTiles: state.selectedTiles
      });
    }
    _onSubmitMove(e, state) {
      this._setState({moveSubmitted: true});
    }
    _onShuffle(e, state) {
      info(`Shuffling [remaining=${state.tileBoard.shuffleAvailableCount}].`);
      if (state.tileBoard.shuffle()) {
        this._setBoard({
          letters: state.tileBoard.toString(),
          shuffleAvailableCount: state.tileBoard.shuffleAvailableCount
        });
      }
    }
    _onSolve(e, state) {
      const solver = new BoardSolver(state.dictionary, state.tileBoard);
      const words = solver.getValidWords();

      let longestWord;
      let highestScoringWord;
      let highestScore = 0;
      for (let i = 0; i < words.length; i++) {
        if (!longestWord || words[i].text.length > longestWord.text.length)
          longestWord = words[i];
        let wordTiles = [];
        for (let j = 0; j < words[i].text.length; j++)
          wordTiles.push(new Tile(0, words[i].text.charAt(j)));
        let wordScore = Scoring.wordScore(wordTiles);
        if (wordScore > highestScore) {
          highestScore = wordScore;
          highestScoringWord = words[i];
        }
      }

      info(`Solving [words=${words.length}, longestWord=${
          longestWord}, highestScoringWord=${highestScoringWord} (${
          highestScore})].`);
    }
    _setMove(values) {
      this._setView('move', values);
    }
    _setBoard(values) {
      this._setView('board', values);
    }
    _setStats(values) {
      this._setView('stats', values);
    }
    _setView(name, values) {
      const view = this._views.get(name);
      view.set(new view.entityClass(values));
    }
  };
});
