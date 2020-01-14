/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

defineParticle(({UiParticle, html, log, resolver}) => {

  const host = 'friends';

  const template = html`
<style>
  [${host}] {
    padding: 16px;
    font-size: 0.75em;
  }
  [${host}] [section] {
    padding: 8px;
  }
  [${host}] [item] {
    cursor: pointer;
  }
</style>

<div ${host}>
  <h2>My Friends</h2>

  <ul>{{friends}}</ul>

  <template friend>
    <li>
      <div>{{name}}</div>
      <ul>{{avatars}}</ul>
      <h4>Friends of <span>{{name}}</span></h4>
      <ul>{{friends}}</ul>
    </li>
  </template>

  <template friendsfriend>
    <li><div>{{name}}</div></li>
  </template>

  <template avatar>
    <li><img style="vertical-align: middle; height: 64px; border-radius: 50%;" src="{{url}}"></li>
  </template>
</div>
    `;

  return class extends UiParticle {
    get template() {
      return template;
    }
    render({friends, people, avatars}, state) {
      const model = {
        friends: ''
      };
      if (friends && people && avatars) {
        model.friends = {
          $template: 'friend',
          models: friends.map(friend => this.friendToModel(friend))
        };
      }
      return model;
    }
    friendToModel(friend) {
      const {people, avatars} = this._props;
      const friendsOfFriend = this.boxQuery(people, friend.id);
      const avatarsOfFriend = this.boxQuery(avatars, friend.id);
      return {
        name: friend.name,
        avatars: {
          $template: 'avatar',
          models: avatarsOfFriend.map(avatar => ({url: resolver(avatar.url)}))
        },
        friends: {
          $template: 'friendsfriend',
          models: friendsOfFriend.map(friend => ({name: friend.id}))
        }
      };
    }
  };

});
