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

defineParticle(({DomParticle, resolver, log, html}) => {
  const host = `social-write-posts`;

  const template = html`
<style>
  [${host}] {
    background-color: white;
    cursor: pointer;
    position: fixed;
    /* margin-left: 328px; */
    /* right: 16px; */
    left: calc(100% - 20px - 64px);
    bottom: 50px;
    padding: 8px;
    border-radius: 100%;
    box-shadow: 0px 1px 8px 0px rgba(0,0,0,0.25);
    box-sizing: border-box;
  }
  [${host}] i {
    display: block;
    border-radius: 100%;
    width: 24px;
    height: 24px;
    padding: 8px;
  }
  [${host}] i:active {
    background-color: #b0e3ff !important;
  }
</style>
<div ${host}>
  <i style="{{add_icon_style}}" on-click="onOpenEditor"></i>
</div>`;

  return class extends DomParticle {
    get template() {
      return template;
    }
    shouldRender({post, posts}) {
      return posts;
    }
    hasContent(value) {
      return Boolean(value && value.trim().length > 0);
    }
    render({post, posts}, state) {
      // TODO(wkorman|sjmiles): Generalize or somehow clean up or document
      // the overall pattern between WritePosts and EditPost.
      if (post &&
          (this.hasContent(post.message) || this.hasContent(post.image))) {
        this.updateSet('posts', post);
        // Clear out the post under edit so that the editor goes away.
        this.handles.get('post').clear();
      }
      return {
        add_icon_style: `background: url(${
            resolver(
                'WritePosts/../assets/ic_rainbow_add.svg')}) center no-repeat;`
      };
    }
    onOpenEditor(e, state) {
      // TODO(wkorman): Set existing post data to edit existing.
      this.updateVariable('post', {message: '', image: ''});
    }
  };
});
