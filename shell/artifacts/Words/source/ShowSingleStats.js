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

defineParticle(({DomParticle, html}) => {
  const host = `show-single-stats`;

  const template = html`
<div ${host}>{{message}}</div>
   `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    scoreToMessage(stats) {
      return `Words Puzzle Game Stats -- Highest scoring word: ${
          stats.highestScoringWord} (${
          stats.highestScoringWordScore}). Longest word: ${stats.longestWord} (${
          stats.longestWordScore}). Score: ${stats.score}. Moves: ${
          stats.moveCount}.`;
    }
    render({stats}) {
      const message = stats ? this.scoreToMessage(stats) : '';
      return {message};
    }
  };
});
