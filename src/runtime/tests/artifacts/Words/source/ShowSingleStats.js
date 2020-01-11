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

defineParticle(({UiParticle, html, log, resolver}) => {
  function importLibrary(clazzType, filename) {
    // TODO(wkorman): The use of a `cdn` url below is a surprising workaround to
    // allow code sharing with the main Words game logic. This particle runs,
    // from a `resolver` perspective, under the auspices and so code path of the
    // Social recipe/particles. However, we're looking to load logic for the
    // Words game. It so happens that the resolver code path also handles
    // resolution of `cdn` urls, thus we can use a fully qualified cdn url to
    // force loading of our shared code from the right place. This is thus
    // fairly lo-fi. and we should eventually explore a cleaner way for embedded
    // recipe particle code to load known-to-be-associated library code.
    if (clazzType === 'undefined') {
      importScripts(
          resolver(`https://$cdn/artifacts/Words/source/${filename}`));
    }
  }
  importLibrary(typeof Scoring, 'Scoring.js');
  importLibrary(typeof Tile, 'Tile.js');
  importLibrary(typeof TileBoard, 'TileBoard.js');

  const host = `show-single-stats`;

  const template = html`
<style>
  [${host}] {
    background-color: var(--stats-bg, inherit);
    color: var(--stats-color, rgba(0, 0, 0, 0.87));
    padding-bottom: 16px;
    border-bottom: solid 0.5px;
    border-bottom-color: #d4d4d4;
    text-decoration: none;
    display: block;
  }
  a[${host}]:visited {
    color: inherit;
  }
  [${host}] [title] {
    font-family: 'Google Sans', sans-serif;
    font-size: 16pt;
    margin-bottom: 14px;
    margin-top: 18px;
  }
  [${host}] [title] [avatar] {
    display: inline-block;
    height: 24px;
    width: 24px;
    min-width: 24px;
    border-radius: 100%;
    margin-left: 16px;
    margin-right: 16px;
    vertical-align: bottom;
  }
  [${host}] [owner] {
    font-size: 14pt;
    margin-right: 6px;
  }
  [${host}] [when] {
    font-size: 12pt;
    color: rgba(0, 0, 0, 0.4);
  }
  [${host}] .gameInfo {
    margin: 0 0 14px 56px;
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
    transform: scale(0.76);
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

  [${host}] .gameInfo {
    font-family: 'Fredoka One', cursive;
    padding-bottom: 0.5em;
    margin: 20px;
    position: relative;
    /* color: white; */
    line-height: 20px;
  }
  [${host}] .gameInfo:focus {
    border: none;
    outline: none;
  }
  [${host}] .gameInfo .caption {
    font-size: 32px;
    margin-bottom: 12px;
  }
  [${host}] .gameInfo .score,
  [${host}] .gameInfo .longestWord,
  [${host}] .gameInfo .highestScoringWord {
    float: left;
    line-height: 20px;
    border-left: 1px solid #222;
    padding-left: 8px;
    padding-right: 8px;
    padding-top: 6px;
  }
  [${host}] .board .tile {
    font-family: 'Fredoka One', cursive;
    border-radius: 16px;
    /* color: white; */
    display: inline-block;
    text-align: center;
    font-size: 18px;
    line-height: 30px;
    width: 28px;
    height: 28px;
    position: absolute;
  }
  [${host}] .board .points {
    position: absolute;
    font-size: 0.5em;
    line-height: normal;
    top: -4px;
    right: -4px;
    color: #000;
    opacity: .2;
  }
  [${host}] .board .selected {
    color: white;
    background: white;
  }
  [${host}] .board .selected span {
    color: red;
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
    background: #fff;
    border-radius: 16px;
    color: #ccc;
    font-size: 10px;
    line-height: 28px;
    text-align: center;
  }
  [${host}] .board .annotation .orientation-left {
    -webkit-transform: scale(-1,1);
  }
  [${host}] .board .annotation .orientation-up {
    -webkit-transform: rotate(-90deg);
  }
  [${host}] .board .annotation .orientation-down {
    -webkit-transform: rotate(90deg);
  }
</style>
<a ${host} href="{{gameHref}}" value="{{id}}">
  <div title>
    <span avatar style='{{avatarStyle}}'></span><span owner>{{owner}}</span><span when>{{time}}</span>
  </div>
  <div class="gameInfo">
    <div class="score"><div class="caption"><span>{{score}}</span> (<span>{{move}}</span> moves)</div>Score</div>
    <div class="longestWord"><div class="caption">{{longestWord}}</div>Longest</div>
    <div class="highestScoringWord"><div class="caption">{{highestScoringWord}}</div>Highest score</div>
    <div style="clear: both;"></div>
  </div>
  <div class="board">
    <div class="gameOver" hidden="{{hideGameOver}}">Game Over</div>
    <span>{{boardCells}}</span>
  </div>
</a>
<template board-cell>
  <div class="{{classes}}" style%="{{style}}">
    <span>{{letter}}</span><div class="points">{{points}}</div>
  </div>
</template>
    `;

  return class extends UiParticle {
    get template() {
      return template;
    }
    avatarToStyle(url) {
      return `background: url('${
          url}') center no-repeat; background-size: cover;`;
    }
    // TODO(wkorman): Share the board to model conversion logic with GamePane.
    // This is a direct copy for now.
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
    findByGameId(entities, gameId) {
      return entities.slice().reverse().find(item => item.gameId == gameId.gameId);
    }
    render({gameId, post, people, user, avatars, boxedStats, boxedBoards, boxedMoves}) {
      if (!gameId || !post || !boxedStats || !boxedBoards) return {};

      // TODO(wkorman): Until we have happy entity mutation, and/or improved
      // boxing, we hack things by leveraging our knowledge that updated data
      // gets boxed and tacked onto the end of the list.
      const stats = this.findByGameId(boxedStats, gameId);
      const board = this.findByGameId(boxedBoards, gameId);
      const move = boxedMoves ? this.findByGameId(boxedMoves, gameId) : null;
      if (!stats || !board) {
        return {hideGameOver: true};
      }

      const tileBoard = new TileBoard(board);
      const boardModels = this.boardToModels(tileBoard, move ? move.coordinates : '');
      const {arcKey, author, createdTimestamp} = post;
      const avatar = this.boxQuery(avatars, author)[0];
      const owner = people.find(p => p.id == author);
      return {
        avatarStyle: avatar ? this.avatarToStyle(resolver(avatar.url)) : '',
        boardCells: {$template: 'board-cell', models: boardModels},
        gameHref: `?arc=${arcKey}&user=${user.id}`,
        hideGameOver: true, // TODO(wkorman): Fix this.
        highestScoringWord: Scoring.highestScoringWordText(stats),
        longestWord: Scoring.longestWordText(stats),
        move: `${stats.moveCount || 0}`,
        owner: owner ? owner.name : '(n/a)',
        score: `${stats.score}`,
        time: new Date(createdTimestamp).toLocaleDateString('en-US', {
          'month': 'short',
          'day': 'numeric'
        })
      };
    }
  };
});
