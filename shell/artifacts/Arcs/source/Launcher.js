// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

defineParticle(({DomParticle, log, html}) => {

  const host = 'arcs-list';

  const style = html`
<style>
  [${host}] a {
    display: block;
    color: inherit;
    text-decoration: none;
  }
  [${host}] [chip] {
    position: relative;
    display: flex;
    flex-direction: column;
    padding: 20px 20px 16px 16px;
    margin: 4px;
    font-size: 18px;
    color: whitesmoke;
    border-radius: 9px;
    min-height: 64px;
  }
  [${host}] [delete] {
    position: absolute;
    right: 2px;
    top: 3px;
    visibility: hidden;
  }
  [${host}] [chip]:hover [delete] {
    visibility: visible;
  }
  [${host}] [share] {
    margin-top: 16px;
  }
  [${host}] [share] icon:not([show]) {
    display: none;
  }
</style>
`;

  let template = html`

${style}

<div ${host}>
  <div style="display: flex;">
    <div style="flex: 1;">{{columnA}}</div>
    <div style="flex: 1;">{{columnB}}</div>
  </div>
</div>

<template column>
  <div chip style="{{chipStyle}}">
    <icon delete key="{{arcId}}" on-click="_onDelete">remove_circle_outline</icon>
      <a href="{{href}}">
        <div description title="{{description}}" unsafe-html="{{blurb}}"></div>
        <div style="flex: 1;"></div>
        <div share>
          <icon show$="{{self}}">account_circle</icon>
          <icon show$="{{friends}}">people</icon>
        </div>
      </a>
  </div>
</template>
`;

  return class extends DomParticle {
    get template() {
      return template;
    }
    willReceiveProps({arcs}) {
      const collation = this._collateItems(arcs);
      this._setState(collation);
    }
    shouldRender(props, state) {
      return Boolean(state.items);
    }
    render(props, {items, profileItems}) {
      const all = items.concat(profileItems);
      const pivot = (all.length + 1) >> 1;
      const columns = [all.slice(0, pivot), all.slice(pivot)];
      return {
        columnA: {
          $template: 'column',
          models: columns[0],
        },
        columnB: {
          $template: 'column',
          models: columns[1],
        }
      };
    }
    _collateItems(arcs) {
      const result = {
        items: [],
        profileItems: []
      };
      arcs.forEach((a, i) => {
        // each item goes in either the `items` or `profileItems` list
        const list = a.profile ? result.profileItems : result.items;
        // massage the description
        //const blurb = a.description.length > 70 ? a.description.slice(0, 70) + '...' : a.description;
        const blurb = a.description;
        const chipStyle = {
          backgroundColor: a.bg || a.color || 'gray',
          color: a.bg ? a.color : 'white',
        };
        // populate the selected list
        list.push({
          arcId: a.id,
          // Don't allow deleting the 'New Arc' arc.
          disallowDelete: i == 0,
          href: a.href,
          blurb,
          description: a.description,
          icon: a.icon,
          chipStyle,
          self: Boolean(a.profile)
        });
      });
      return result;
    }
    _onDelete(e) {
      const arcId = e.data.key;
      const arc = this._props.arcs.find(a => a.id === arcId);
      if (!arc) {
        log(`Couldn't find arc to delete [arcId=${arcId}].`);
      } else {
        log(`Removing arc [arcId=${arcId}].`);
        this._views.get('arcs').remove(arc);
      }
    }
  };
});
