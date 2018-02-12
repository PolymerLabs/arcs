// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

defineParticle(({ DomParticle, log, html }) => {

  const host = 'arcs-list';

  const style = html`
<style>
  [${host}] a {
    color: inherit;
    text-decoration: none;
  }
  [${host}] i {
    font-size: 48px;
  }
  [${host}] .material-icons {
    font-family: 'Material Icons';
    font-style: normal;
    -webkit-font-feature-settings: 'liga';
    -webkit-font-smoothing: antialiased;
    vertical-align: middle;
    cursor: pointer;
    font-size: 24px;
    padding-right: 4px;
  }
  [${host}] [arc-chip] {
    position: relative;
    display: flex;
    flex-direction: column;
    padding: 16px;
    margin: 4px;
    font-size: 18px;
    color: whitesmoke;
    border-radius: 9px;
    min-height: 56px;
  }
  [${host}] [delete] {
    position: absolute;
    right: 2px;
    top: 4px;
    visibility: hidden;
  }
  [${host}] [arc-chip]:hover [delete] {
    visibility: visible;
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
  <div arc-chip style="{{backStyle}}">
    <div delete class="material-icons" key="{{arcId}}" on-click="_onDelete">remove_circle_outline</div>
    <a href="{{href}}" Xtarget="_blank">
      <div description title="{{description}}" unsafe-html="{{blurb}}"></div>
      <div style="flex: 1;"></div>
      <div style="margin-top: 32px;"><i class="material-icons">account_circle</i><i class="material-icons">account_circle</i><i class="material-icons">account_circle</i><i class="material-icons">account_circle</i></div>
    </a>
  </div>
</template>
`;

  return class extends DomParticle {
    get template() {
      return template;
    }
    _willReceiveProps({arcs}) {
      const collation = this._collateItems(arcs);
      this._setState(collation);
    }
    _shouldRender(props, state) {
      return Boolean(state.items);
    }
    _render(props, {items, profileItems}) {
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
      let result = {
        items: [],
        profileItems: []
      };
      arcs.forEach((a, i) => {
        // each item goes in either the `items` or `profileItems` list
        let list = a.profile ? result.profileItems : result.items;
        // massage the description
        let blurb =
          a.description.length > 70
            ? a.description.slice(0, 70) + '...'
            : a.description;
        let bg = a.bg || a.color || 'gray';
        let color = a.bg ? a.color : 'white';
        // populate the selected list
        list.push({
          arcId: a.id,
          // Don't allow deleting the 'New Arc' arc.
          disallowDelete: i == 0,
          href: a.href,
          blurb,
          description: a.description,
          icon: a.icon,
          backStyle: {
            color: color,
            backgroundColor: bg
          }
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
