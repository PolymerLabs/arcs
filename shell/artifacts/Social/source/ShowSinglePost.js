// @license
// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

defineParticle(({DomParticle, html}) => {
  const host = `social-show-single-post`;

  const template = html`
<style>
  [${host}] {
    font-family: 'Google Sans', sans-serif;
    font-size: 16pt;
    color: rgba(0, 0, 0, 0.87);
    border-top: 1px solid lightgrey;
  }
  [${host}] {
    padding-bottom: 16px;
    border-bottom: solid 0.5px;
    border-bottom-color: #d4d4d4;
  }
  [${host}] [content] {
    margin: 0 16px 0 56px;
  }
  [${host}] [content] img {
    display: block;
    width: 256px;
  }
</style>
<div ${host} content value="{{id}}">
  <img src="{{image}}">
  <span>{{message}}</span>
</div>
    `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    render({message, image, id}) {
      // TODO(wkorman): Maybe we need to render the author avatar and time of
      // post here as well. It will be rendered identically for different post
      // types, so currently hoping we can do it generically in the containing
      // aggregated feed particle on a per-post basis somehow.
      return {
        message,
        image: image || '',
        id
      };
    }
  };
});
