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

defineParticle(({DomParticle}) => {
  const host = `show-leaderboard`;

  const styles = `
<style>
  [${host}] {
    display: flex;
    flex-direction: column;
    font-family: sans-serif;
    font-size: 16px;
    padding: 0 20px;
    max-height: 400px;
    overflow-x: hidden;
    overflow-y: auto;
  }
  [${host}] [avatar] img {
    height: 32px;
    border-radius: 100%;
    vertical-align: middle;
    margin: 0 8px;
  }
  [${host}] [name] {
    padding: 8px;
    font-size: 0.7em;
    min-height: 18px;
  }
  [${host}] [isme] [content] {
    color: #f8f8f8;
    background-color: #1873cd;
  }
</style>
<div ${host}>
  <template stat-entry>
    <div stat isme$="{{isme}}">
      <div name><span avatar><b>{{name}}</b><img src="{{src}}" title="{{name}}" alt="{{name}}"></span></div>
      <div score>{{score}}</div>
      <div move-count>{{moveCount}}</div>
      <div longest-word>{{longestWord}}</div>
      <div highest-scoring-word>{{highestScoringWord}}</div>
      <!-- TODO(wkorman): timestamp -->
    </div>
  </template>
  <div list>{{stats}}</div>
</div>
   `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    _render(props) {
      if (props.stats && props.person)
        return {
            // TODO
        };
    }
  };
});
