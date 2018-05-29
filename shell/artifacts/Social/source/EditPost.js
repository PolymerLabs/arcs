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
  padding: 56px 16px 16px 16px;;
}
[${host}] img {
  display: block;
  width: 256px;
}
[${host}] model-input {
  display: flex;
  flex: 1;
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
  <model-input focus="{{focus}}">
    <textarea value="{{message}}" on-keydown="onKeyDown" on-input="onTextInput"></textarea>
  </model-input>
</div>`;

  return class extends DomParticle {
    get template() {
      return template;
    }
    hasContent(value) {
      return Boolean(value && value.trim().length > 0);
    }
    getDefaultImage() {
      return {url: '', width: 0, height: 0};
    }
    render({user, post, shellTheme}, {
      message,
      image,
      savePost,
      renderParticleSpec,
      renderRecipe,
      uploading,
      uploadPercent
    }) {
      image = image || this.getDefaultImage();
      if (savePost) {
        this.savePost(renderParticleSpec, renderRecipe, user, message, image, shellTheme.key);
      }
      const saveButtonActive =
          Boolean(this.hasContent(message) || this.hasContent(image.url));
      const model = {
        saveButtonActive,
        message: message || '',
        image: image.url,
        hideUploadProgress: !uploading,
        uploadPercent,
        focus: Boolean(post)
      };
      return model;
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
  map 'BOXED_avatar' as avatars
  use #identities as people
  use #user as user
  use '{{item_id}}' as handle1
  slot '{{slot_id}}' as slot1
  {{other_handles}}
  ${renderParticle.name}
    ${renderParticle.connections[0].name} <- handle1
    avatars <- avatars
    people <- people
    user <- user
    {{other_connections}}
    consume item as slot1
      `.trim();
        this._setState({renderParticleSpec, renderRecipe});
      }
    }
    clearPostState() {
      this.setState({savePost: false, message: '', image: this.getDefaultImage()});
    }
    savePost(renderParticleSpec, renderRecipe, user, message, image, arcKey) {
      this.updateVariable('post', {
        renderParticleSpec,
        renderRecipe,
        message,
        image: image.url,
        imageWidth: image.width,
        imageHeight: image.height,
        createdTimestamp: Date.now(),
        author: user.id,
        arcKey
      });
      this.clearPostState();
    }
    onKeyDown(e) {
      if (e.data.keys.code === 'Escape') {
        this.handles.get('post').clear();
        this.clearPostState();
      } else if (e.data.keys.code === 'Enter' && e.data.keys.ctrlKey) {
        this.setState({savePost: true});
      }
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
