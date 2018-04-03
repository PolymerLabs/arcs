// @license
// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

defineParticle(({DomParticle, html, log, resolver}) => {
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
  [${host}][content] {
    margin: 0 16px 0 56px;
  }
  [${host}][content] [avatar] {
    display: inline-block;
    height: 24px;
    width: 24px;
    min-width: 24px;
    border-radius: 100%;
    margin-left: 16px;
    margin-right: 16px;
    vertical-align: bottom;
  }
  [${host}][content] img {
    display: block;
    width: 256px;
  }
</style>
<div ${host} content value="{{id}}">
  <div title>
    <span avatar style='{{avatarStyle}}'></span>
  </div>
  <img src="{{image}}">
  <span>{{message}}</span>
</div>
    `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    _avatarSetToMap(avatars) {
      const avatarMap = {};
      if (avatars)
        avatars.map(a => avatarMap[a.owner] = a.url);
      return avatarMap;
    }
    _avatarToStyle(url) {
      return `background: url('${
          url}') center no-repeat; background-size: cover;`;
    }
    willReceiveProps(props) {
      // log(`willReceiveProps [post=${props.post}].`);
      if (props.post) {
        this._setState({
          avatars: this._avatarSetToMap(props.avatars),
        });
      }
    }
    render(props) {
      // log(`render [post=${props.post}].`);
      if (!props.post)
        return {};
      const {message, image, id, author} = props.post;
      return {
        message,
        image: image || '',
        id,
        avatarStyle: this._avatarToStyle(resolver(this._state.avatars[author]))
      };
    }
  };
});
