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

defineParticle(({DomParticle, resolver, log}) => {
  const host = `social-write-posts`;

  const template = `
<style>
[${host}] {
  background-color: white;
  cursor: pointer;
  position: fixed;
  margin-left: 328px;
  bottom: 50px;
  padding: 8px;
  border-radius: 100%;
  box-shadow: 1px 1px 5px 0px rgba(0,0,0,0.75);
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
  <i style="{{add_icon_style}}" on-click="_onOpenEditor"></i>
</div>
  `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    _shouldRender({post, posts}) {
      return posts;
    }
    _render({post, posts}, state) {
      // TODO(wkorman|sjmiles): Generalize or somehow clean up or document
      // the overall pattern between WritePosts and EditPost.
      if (post && post.message) {
        // Set the post into the right place in the posts set. If we find it
        // already present replace it, otherwise, add it.
        // TODO(dstockwell): Replace this with happy entity mutation approach.
        const targetPost = posts.find(p => p.id === post.id);
        if (targetPost) {
          if (targetPost.message !== post.message) {
            this._views.get('posts').remove(targetPost);
            this._views.get('posts').store(post);
          }
        } else {
          this._views.get('posts').store(post);
        }

        // Clear out the post under edit so that the editor goes away.
        this._views.get('post').clear();
      }
      return {
        add_icon_style: `background: url(${
            resolver(
                'WritePosts/../assets/ic_rainbow_add.svg')}) center no-repeat;`
      };
    }
    _onOpenEditor(e, state) {
      const Post = this._views.get('posts').entityClass;
      // TODO(wkorman): Set existing post data to edit existing.
      this._views.get('post').set(new Post({message: ''}));
    }
  };
});
