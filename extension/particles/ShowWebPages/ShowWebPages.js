// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

"use strict";

defineParticle(({DomParticle}) => {

  let template = `
<div show-urls>
  <div style="padding: 6px;">Found <span>{{count}}</span> item(s).</div>
  <hr>
  <x-list items="{{items}}">
    <template>
      <div style="height: 20px; padding: 8px" item>
        <a href="{{url}}"><img src="{{image}}" height="16px" width="16px"></a>
        <a href="{{url}}">{{name}}</a>
      </div>
    </template>
  </x-list>
</div>
    `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    _shouldRender(props, state) {
      return Boolean(props.list);
    }
    _render(props, state) {
      let items = props.list.map(({rawData}) => {
        // We're rendering a bunch of different things here, some of them
        // don't have images or names. Let's use sane defaults.
        let o = Object.assign(
          {'image': 'artifacts/arc.png'},
          rawData);
        if (!o['name'] || o['name']==='') {
          o['name'] = o['@type']+': '+o['url'];
        }
        return o;
      });

      return {
        items,
        count: items.length
      };
    }
  };

});
