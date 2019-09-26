/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

/* global defineParticle */

defineParticle(({UiParticle, html, log}) => {

  const template = html`
<style>
  [tile-list] {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    padding: 8px 0;
    background-color: var(--slug-color);
  }
  [card] {
    margin: 8px;
    border: 3px solid transparent;
  }
  [card][selected] {
    border: 3px solid #0068a7;
  }
  [pacify] {
    padding: 16px;
    font-style: italic;
  }
</style>

<div slotid="action"></div>
<div pacify hidden="{{haveItems}}">(nothing to show)</div>
<div tile-list>{{items}}</div>

<template items>
  <div card selected$="{{selected}}">
    <div slotid$="{{tile_slot}}" subid$="{{id}}" key="{{id}}" on-click="onSelect"></div>
    <div slotid$="{{annotation_slot}}" subid$="{{id}}"></div>
  </div>
</template>
    `;

  return class extends UiParticle {
    get template() {
      return template;
    }
    shouldRender({list}) {
      return Boolean(list);
    }
    render({list, selected}) {
      if (list) {
        const selectedId = selected && this.idFor(selected);
        //const filtered = list.sort((a, b) => a.name > b.name ? 1 : a.name === b.name ? 0 : -1);
        const filtered = list;
        const models = filtered.map(item => this.renderItem(item, selectedId === this.idFor(item)));
        return {
          haveItems: models.length > 0,
          items: {
            $template: 'items',
            models
          }
        };
      }
    }
    renderItem(entity, selected) {
      return {
        id: this.idFor(entity),
        selected
      };
    }
    onSelect(e) {
      const item = this.props.list.find(i => this.idFor(i) === e.data.key);
      this.handles.get('selected').set(item);
    }
  };

});
