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

defineParticle(({Particle}) => {
  return class WordsScoreRanker extends Particle {
    setHandles(handles) {
      this.handles = handles;
    }

    onHandleSync(handle, input) {
      this.updateOutput(handle, input);
    }

    onHandleUpdate(handle, update) {
      handle.toList().then(input => this.updateOutput(handle, input));
    }

    getGameScore(stats, post) {
      // TODO(wkorman): Consider particle refactor to push game specific score
      // ranking into a separate data particle. For now we hack via recipe's
      // immediate value for demonstrative purposes.
      const [, gameIdA] = post.renderRecipe.match(/{"gameId": "([^"]+)"}/);
      const targetStats =
          stats.slice().reverse().find(s => s.gameId == gameIdA);
      return targetStats.score;
    }

    updateOutput(handle, input) {
      if (handle.name == 'input') {
        this.inputValues = input;
      } else if (handle.name == 'stats') {
        this.statsValues = input;
      }
      if (!this.inputValues || !this.statsValues) return;

      // Filter out only the Words game posts.
      const wordsPosts = this.inputValues.filter(post => {
        if (post.renderParticleSpec) {
          const renderParticle = JSON.parse(post.renderParticleSpec);
          return renderParticle.name == 'ShowSingleStats';
        }
        return false;
      });

      // Rank the Words posts by descending score.
      wordsPosts.sort((a, b) => {
        const scoreA = this.getGameScore(this.statsValues, a);
        const scoreB = this.getGameScore(this.statsValues, b);
        return (scoreA == scoreB) ? 0 : (scoreA > scoreB ? -1 : 1);
      });

      // Set the final set of posts into the output handle.
      wordsPosts.forEach((post, index) => {
        post.rank = index;
        this.handles.get('output').store(post);
      });
    }
  };
});
