// @license
// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({DomParticle, html, log, resolver}) => {

  const host = 'friends';

  const template = html`
<style>
  [${host}] {
    padding: 16px;
    font-size: 0.75em;
  }
  [${host}] [head] {
    background-color: #eeeeee;
  }
  [${host}] #friendstable {
    border: 1px solid silver;
    border-right: none;
    border-bottom: none;
  }
  [${host}] #friendstable [row] {
    display: flex;
    align-items: stretch;
    border-bottom: 1px solid silver;
  }
  [${host}] #friendstable span {
    flex: 1;
    flex-shrink: 0;
    border-right: 1px solid silver;
    padding: 8px 12px;
    display: flex;
    align-items: center;
  }
</style>

<div ${host}>

  <h2>Dashboard</h2>

  <div id="friendstable">
    <div row head><span>Friends</span></div>
    <div>{{friends}}</div>
  </div>

  <template friend>
    <div row on-click="_onSelect" key="{{index}}">
      <span>{{avatars}}</span>
      <span style="flex: 3;">{{name}}</span>
    </div>
  </template>

  <template friendsfriend>
    <li><div>{{name}}</div></li>
  </template>

  <template avatar>
    <img style="vertical-align: middle; height: 32px; border-radius: 50%;" src="{{url}}">
  </template>
</div>
    `;

  return class extends DomParticle {
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
