// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

"use strict";

defineParticle(({DomParticle, resolver}) => {

  let host = 'person-bar';

  let template = `
<style>
  [${host}] {
    background-color: #fbfbfb;
  }
  [${host}] div {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: right;
    padding: 8px 8px 4px 8px;
    cursor: pointer;
  }
  [${host}] img {
    width: 24px;
    height: 24px;
    border-radius: 100%;
    /*border: 1px solid silver;*/
    box-sizing: border-box;
  }
  [${host}] img:not([active]) {
    opacity: 0.2;
    /*border: 1px solid transparent;*/
  }
</style>

<div ${host}>
  <div>{{people}}</div>
  <template people>
    <img src="{{avatar}}" title="{{name}}" active$="{{active}}">
  </template>
</div>
    `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    _willReceiveProps(props) {
      // TODO(sjmiles): best way to translate entity data into POJO?
      let people = props.people.map((person, i) => {
        return {
          index: i,
          name: person.name,
          avatar: resolver(`https://$cdn/assets/avatars/${person.avatar || 'user.jpg'}`),
          active: Boolean(person.active) //Math.random()<0.3
        };
      });
      this._setState({people});
      setInterval(() => this._willReceiveProps(this._props), 60000);
    }
    _render(props, state) {
      return {
        people: {
          $template: 'people',
          models: state.people || []
        }
      };
    }
  };

});
