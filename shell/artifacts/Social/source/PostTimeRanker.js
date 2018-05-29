// @license
// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

defineParticle(({Particle}) => {
  return class PostTimeRanker extends Particle {
    setHandles(handles) {
      this.on(handles, 'input', 'change', e => {
        let inputHandle = handles.get('input');
        inputHandle.toList().then(input => {
          // Rank the posts by creation time.
          input.sort((a, b) => {
            return b.createdTimestamp - a.createdTimestamp;
          });
          // Set the final set of posts into the output handle.
          input.forEach((post, index) => {
            post.rank = index;
            handles.get('output').store(post);
          });
        });
      });
    }
  };
});
