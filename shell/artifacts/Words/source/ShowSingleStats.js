/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
'use strict';

defineParticle(({DomParticle, html, log, resolver}) => {
  function importLibrary(filename) {
    // TODO(wkorman): The use of a `cdn` url below is a surprising workaround to
    // allow code sharing with the main Words game logic. This particle runs,
    // from a `resolver` perspective, under the auspices and so code path of the
    // Social recipe/particles. However, we're looking to load logic for the
    // Words game. It so happens that the resolver code path also handles
    // resolution of `cdn` urls, thus we can use a fully qualified cdn url to
    // force loading of our shared code from the right place. This is thus
    // fairly lo-fi. and we should eventually explore a cleaner way for embedded
    // recipe particle code to load known-to-be-associated library code.
    importScripts(resolver(`https://$cdn/artifacts/Words/source/${filename}`));
  }
  if (typeof Scoring === 'undefined') importLibrary('Scoring.js');
  if (typeof Tile === 'undefined') importLibrary('Tile.js');
  if (typeof TileBoard === 'undefined') importLibrary('TileBoard.js');

  const host = `show-single-stats`;

  const template = html`
<style>
  [${host}] {
    padding: 5px;
  }
  [${host}] .board {
    cursor: pointer;
    user-select: none;
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
</style>
<div ${host}>
  <div class="gameInfo">
    <div class="score">Score: <span>{{score}}</span></div>
    <div class="longestWord">Longest word: <span>{{longestWord}}</span></div>
    <div class="highestScoringWord">Highest scoring word: <span>{{highestScoringWord}}</span></div>
  </div>
  <div class="board">
    <div class="gameOver" hidden="{{hideGameOver}}">Game Over</div>
    <span>{{boardCells}}</span>
  </div>
</div>
<template board-cell>
  <div class="{{classes}}" style%="{{style}}">
    <span>{{letter}}</span><div class="points">{{points}}</div>
  </div>
</template>
    `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    // TODO(wkorman): Share the board to model conversion logic with GamePane.
    // This is a direct copy for now.
    boardToModels(tileBoard) {
      let models = [];
      for (let i = 0; i < tileBoard.size; i++) {
        const tile = tileBoard.tileAtIndex(i);
        const letterClasses = ['tile'];
        let yPixels = tile.y * 50 + tile.y;
        if (tile.isShiftedDown)
          yPixels += 25;
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
    render({gameId, post, boxedStats, boxedBoards}) {
      if (!gameId || !post || !boxedStats || !boxedBoards) return {};

      // TODO(wkorman):
      // - Integrate and show the move data, if any.
      // - Display user name and avatar to follow layout of social post.

      // TODO(wkorman): Until we have happy entity mutation, and/or improved
      // boxing, we hack things by leveraging our knowledge that updated data
      // gets boxed and tacked onto the end of the list.
      const stats = boxedStats.slice().reverse().find(b => b.gameId == gameId.gameId);
      const board = boxedBoards.slice().reverse().find(b => b.gameId == gameId.gameId);
      if (!stats || !board) {
        return {hideGameOver: true};
      }

      const tileBoard = new TileBoard(board);
      let boardModels = this.boardToModels(tileBoard);
      return {
        boardCells: {$template: 'board-cell', models: boardModels},
        hideGameOver: true, // TODO(wkorman): Fix this.
        longestWord: Scoring.longestWordText(stats),
        highestScoringWord: Scoring.highestScoringWordText(stats),
        score: `${stats.score} (${stats.moveCount} moves)`
      };
    }
  };
});
