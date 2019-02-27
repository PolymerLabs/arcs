// @license
// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({DomParticle}) => {
  return class ShowPostTwo extends DomParticle {
    get template() {
      return `
        <div><span>TWO: </span><span>{{message}}</span></div>
      `;
    }
    shouldRender(props) {
      return props && props.post;
    }
    render({post}, state) {
      return {
        message: post.message
      };
    }
  };
});
