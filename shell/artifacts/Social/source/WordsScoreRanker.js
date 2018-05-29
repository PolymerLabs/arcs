// @license
// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

defineParticle(({Particle}) => {
  return class WordsScoreRanker extends Particle {
    getGameScore(stats, post) {
      // TODO(wkorman): Consider particle refactor to push game specific score
      // ranking into a separate data particle. For now we hack via recipe's
      // immediate value for demonstrative purposes.
      let [, gameIdA] = post.renderRecipe.match(/{"gameId": "([^"]+)"}/);
      const targetStats =
          stats.slice().reverse().find(s => s.gameId == gameIdA);
      return targetStats.score;
    }

    processInput(statsHandle, inputHandle, handles) {
      Promise.all([inputHandle.toList(), statsHandle.toList()])
          .then(([input, stats]) => {
            // Filter out only the Words game posts.
            let wordsPosts = input.filter(post => {
              if (post.renderParticleSpec) {
                const renderParticle = JSON.parse(post.renderParticleSpec);
                return renderParticle.name == 'ShowSingleStats';
              }
              return false;
            });

            // Rank the Words posts by descending score.
            wordsPosts.sort((a, b) => {
              const scoreA = this.getGameScore(stats, a);
              const scoreB = this.getGameScore(stats, b);
              return (scoreA == scoreB) ? 0 : (scoreA > scoreB ? -1 : 1);
            });

            // Set the final set of posts into the output handle.
            wordsPosts.forEach((post, index) => {
              post.rank = index;
              handles.get('output').store(post);
            });

            // TODO: set appropriate relevance.
            this.relevance = wordsPosts.length;
          });
    }

    setHandles(handles) {
      this.on(handles, ['stats', 'input'], 'change', e => {
        this._statsHandle = handles.get('stats');
        this._inputHandle = handles.get('input');
        if (this._statsHandle && this._inputHandle)
          this.processInput(this._statsHandle, this._inputHandle, handles);
      });
    }
  };
});
