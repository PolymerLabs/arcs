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

defineParticle(({DomParticle, html, log}) => {
  const host = `social-edit-post`;

  const template = html`
<style>
[${host}] {
  font-family: 'Google Sans', sans-serif;
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 56px 8px 8px 8px;
}
[${host}] img {
  display: block;
  width: 256px;
}
[${host}] textarea {
  flex: 1;
  border: none;
  font-family: 'Google Sans', sans-serif;
  font-size: 16pt;
  outline: none;
  resize: none;
}
[${host}] [post-buttons] {
  position: absolute;
  right: 8px;
  top: 8px;
}
[${host}] [post-buttons] > * {
  border-radius: 100%;
  color: lightgrey;
  display: inline-block;
  padding: 8px;
}
[${host}] [post-buttons] > *:active {
  background-color: #b0e3ff;
}
[${host}] [post-buttons] > [active] {
  color: black;
}
[${host}] [post-buttons] > [active][primary] {
  color: green;
}
[${host}] [upload-progress] {
  text-align: center;
  font-size: 32px;
}
</style>
<div ${host}>
  <div post-buttons>
    <icon on-click="onDeletePost">delete</icon>
    <firebase-upload active accept="image/*" on-upload="onAttachPhoto" on-progress="onProgressPhoto" on-error="onErrorPhoto"><icon>attach_file</icon></firebase-upload>
    <icon primary active$="{{saveButtonActive}}" on-click="onSavePost">done</icon>
  </div>
  <div hidden="{{hideUploadProgress}}" upload-progress>
    <span>{{uploadPercent}}</span>%
  </div>
  <img src="{{image}}">
  <textarea value="{{message}}" on-input="onTextInput"></textarea>
</div>`;

  return class extends DomParticle {
    get template() {
      return template;
    }
    hasContent(value) {
      return Boolean(value && value.trim().length > 0);
    }
    render({user, post}, {
      message,
      image,
      savePost,
      renderParticleSpec,
      renderRecipe,
      uploading,
      uploadPercent
    }) {
      if (savePost) {
        this.savePost(renderParticleSpec, renderRecipe, user, message, image);
      }
      const saveButtonActive =
          this.hasContent(message) || (image && this.hasContent(image.url));
      const model = {
        saveButtonActive,
        message: message || '',
        image: image ? image.url : '',
        hideUploadProgress: !uploading,
        uploadPercent
      };
      return model;
    }
    setHandle(name, data) {
      const handle = this._views.get(name);
      handle.set(new (handle.entityClass)(data));
    }
    willReceiveProps({renderParticle}, state) {
      // TODO(wkorman): Consider sharing recipe with analogous Words item logic,
      // for example, we could move more of it into PostMuxer.
      if (renderParticle && !state.renderParticleSpec) {
        const renderParticleSpec = JSON.stringify(renderParticle.toLiteral());
        const renderRecipe = DomParticle
                                 .buildManifest`
${renderParticle}
recipe
  map #BOXED_avatar as avatars
  use '{{item_id}}' as v1
  slot '{{slot_id}}' as s1
  {{other_views}}
  ${renderParticle.name}
    ${renderParticle.connections[0].name} <- v1
    {{other_connections}}
    consume item as s1
      `.trim();
        this._setState({renderParticleSpec, renderRecipe});
      }
    }
    savePost(renderParticleSpec, renderRecipe, user, message, image) {
      this.setHandle('post', {
        renderParticleSpec,
        renderRecipe,
        message,
        image: image.url,
        imageWidth: image.width,
        imageHeight: image.height,
        createdTimestamp: Date.now(),
        author: user.id
      });
      this.setState({savePost: false, message: '', image: null});
    }
    onTextInput(e) {
      this.setState({message: e.data.value});
    }
    // TODO(wkorman): Add onDeletePost.
    onSavePost(e) {
      this.setState({savePost: true});
    }
    onAttachPhoto(e) {
      const image = e.data.value;
      this.setState({uploading: false, uploadPercent: '0', image});
    }
    onProgressPhoto(e) {
      const uploadPercent = String(e.data.value);
      this.setState({uploading: true, uploadPercent});
    }
    onErrorPhoto(e) {
      this.setState({uploading: false, uploadPercent: '0'});
    }
  };
});
