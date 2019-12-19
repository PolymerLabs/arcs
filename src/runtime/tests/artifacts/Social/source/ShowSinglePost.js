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
  const host = `social-show-single-post`;

  const template = html`
<style>
  [${host}] {
    font-family: 'Google Sans', sans-serif;
    font-size: 16pt;
    color: rgba(0, 0, 0, 0.87);
    padding-bottom: 16px;
    border-bottom: solid 0.5px;
    border-bottom-color: #d4d4d4;
    text-decoration: none;
    display: block;
  }
  [${host}] [content] {
    margin: 0 16px 0 56px;
  }
  [${host}] [title] {
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
  [${host}] [content] img {
    display: block;
    width: 256px;
  }
  [${host}] [owner] {
    font-size: 14pt;
    margin-right: 6px;
  }
  [${host}] [when] {
    font-size: 12pt;
    color: rgba(0, 0, 0, 0.4);
  }
</style>
<a ${host} href="{{blogHref}}" value="{{id}}">
  <div title>
    <span avatar style='{{avatarStyle}}'></span><span owner>{{owner}}</span><span when>{{time}}</span>
  </div>
  <div content>
    <img src="{{image}}" width="{{imageWidth}}" height="{{imageHeight}}">
    <span>{{message}}</span>
  </div>
</a>`;

  return class extends UiParticle {
    get template() {
      return template;
    }
    avatarToStyle(url) {
      return `background: url('${url}') center no-repeat; background-size: cover;`;
    }
    clampSize(width, height) {
      if (!width || !height) {
        return {clampedWidth: width, clampedHeight: height};
      }
      const ratio = width / height;
      const maxWidth = 256;
      const clampedWidth = Math.min(maxWidth, width);
      const clampedHeight = clampedWidth / ratio;
      return {clampedWidth, clampedHeight};
    }
    render(props, state) {
      if (!props.post || !props.user) {
        return {};
      }
      const {arcKey, author, createdTimestamp, id, image, imageHeight, imageWidth, message} = props.post;
      const {clampedWidth, clampedHeight} =
          this.clampSize(imageWidth, imageHeight);
      const avatar = this.boxQuery(props.avatars, author)[0];
      const owner = props.people.find(p => p.id === author);
      return {
        id,
        avatarStyle: avatar ? this.avatarToStyle(resolver(avatar.url)) : '',
        blogHref: `?arc=${arcKey}&user=${props.user.id}`,
        image: image || '',
        imageWidth: clampedWidth,
        imageHeight: clampedHeight,
        message,
        owner: owner && owner.name,
        time: new Date(createdTimestamp).toLocaleDateString('en-US', {
          'month': 'short',
          'day': 'numeric'
        })
      };
    }
  };
});
