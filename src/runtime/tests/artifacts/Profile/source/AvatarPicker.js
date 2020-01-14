/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

defineParticle(({UiParticle, html, resolver}) => {

  const host = `avatar-picker`;

  const styles = html`
<style>
  [${host}] [item] {
    display: inline-block;
    width: 96px;
    padding: 8px;
    box-sizing: border-box;
    color: inherit;
    text-decoration: none;
    text-align: center;
  }
  [${host}] [item] img {
    box-sizing: border-box;
    border-radius: 100%;
    width: 80px;
    /*border: 10px solid transparent;*/
  }
  [${host}] [item] img[selected] {
    border: 10px solid red;
  }
</style>
  `;

  const template = html`

${styles}

<div ${host}>
  <div>{{avatars}}</div>
  <hr>
</div>

<template avatars>
  <div item>
    <img selected$="{{selected}}" src="{{url}}" value="{{value}}" on-Click="_onSelectAvatar">
  </div>
</template>

  `.trim();

  return class extends UiParticle {
    get template() {
      return template;
    }
    render(props, state) {
      const avatar = props.avatar || 0;
      const avatars = [];
      for (let i=0; i<33; i++) {
        const url = `https://$cdn/assets/avatars/user (${i+1}).png`;
        avatars.push({
          index: i,
          url: resolver && resolver(url),
          value: url,
          selected: (url === avatar.url)
        });
      }
      return {
        avatars: {
          $template: 'avatars',
          models: avatars
        }
      };
    }
    _onSelectAvatar(e, state) {
      //console.log('avatar: ', e.data.value);
      const avatar = this.handles.get('avatar');
      avatar.set(new avatar.entityClass({url: e.data.value}));
    }
  };

});
