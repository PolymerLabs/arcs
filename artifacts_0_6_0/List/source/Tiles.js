// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({DomParticle, html, log}) => {

  const template = html`
<style>
  [tile-list] {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    padding: 8px 0;
  }
  [card] {
    margin: 8px;
    border: 3px solid transparent;
    width: var(--tile-width, calc(100% - 24px));
  }
  [card][selected] {
    border: 3px solid #0068a7;
  }
  [pacify] {
    padding: 16px;
    font-style: italic;
  }
  @media (min-width: 440px) {
    [card] {
      width: var(--tile-width, calc(50% - 24px));
    }
  }
  @media (min-width: 560px) {
    [card] {
      width: var(--tile-width, calc(33% - 24px));
    }
  }
  @media (min-width: 800px) {
    [card] {
      width: var(--tile-width, calc(25% - 24px));
    }
  }
  @media (min-width: 1100px) {
    [card] {
      width: var(--tile-width, calc(20% - 24px));
    }
  }
  @media (min-width: 1400px) {
    [card] {
      width: var(--tile-width, calc(15% - 24px));
    }
  }
</style>

<div slotid="action"></div>
<div pacify hidden="{{haveItems}}">(nothing to show)</div>
<div tile-list>{{items}}</div>

<template tiled-items>
  <div card selected$="{{selected}}">
    <div slotid="tile" subid$="{{id}}" key="{{id}}" on-click="_onSelect"></div>
    <div slotid="annotation" subid$="{{id}}"></div>
  </div>
</template>
    `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    shouldRender({list}) {
      return Boolean(list);
    }
    render({list, selected}) {
      if (list.length) {
        const selectedId = selected && selected.id;
        const sorted = list.sort((a, b) => a.name > b.name ? 1 : a.name === b.name ? 0 : -1);
        const items = {
          $template: 'tiled-items',
          models: sorted.map(item => this.renderItem(item, selectedId === item.id))
        };
        log(items.models);
        return {
          haveItems: true,
          items
        };
      }
    }
    renderItem({id}, selected) {
      return {
        id,
        selected
      };
    }
    _onSelect(e) {
      const item = this._props.list.find(i => i.id === e.data.key);
      this.handles.get('selected').set(item);
    }
  };
});
