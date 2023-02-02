/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

defineParticle(({UiParticle, html, log}) => {

  const host = `show-tiles`;

  const template = html`
<style>
  [${host}] {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    padding: 8px 0;
    /* need to be able to theme these colors */
    background-color: #333333;
    color: whitesmoke;
  }
  [${host}] > [card] {
    margin: 8px;
    width: calc(50% - 24px);
    border: 3px solid transparent;
  }
  [${host}] > [card][selected] {
    border: 3px solid #524c00;
  }
  @media (min-width: 540px) {
    [${host}] > [card] {
      width: calc(33% - 24px);
    }
  }
  @media (min-width: 800px) {
    [${host}] > [card] {
      width: calc(25% - 24px);
    }
  }
  @media (min-width: 1000px) {
    [${host}] > [card] {
      width: calc(20% - 24px);
    }
  }
  @media (min-width: 1400px) {
    [${host}] > [card] {
      width: calc(10% - 24px);
    }
  }
</style>

<template tiled-items>
  <div card selected$="{{selected}}">
    <div slotid="action" subid$="{{id}}"></div>
    <div slotid="tile" subid$="{{id}}" key="{{id}}" on-click="_onSelect"></div>
  </div>
</template>

<div ${host}>{{items}}</div>
    `.trim();

  return class extends UiParticle {
    get template() {
      return template;
    }
    shouldRender({items}) {
      return Boolean(items);
    }
    async willReceiveProps({items, selected}) {
      if (selected && selected.delete) {
        this.handles.get('selected').clear();
        log('request to delete', selected);
        const item = items.find(item => item.id === selected.id);
        if (item) {
          this.handles.get('items').remove(item);
          log('new list', await this.handles.get('items').toList());
        }
      }
    }
    render({items, selected}) {
      const sorted = items.sort((a, b) => a.name > b.name ? 1 : a.name === b.name ? 0 : -1);
      const selectedId = selected && selected.id;
      log(`selected: ${selectedId}`);
      return {
        items: {
          $template: 'tiled-items',
          models: sorted.map(item => {
            log(`rendering: ${item.id}`);
            return {
              id: item.id,
              selected: selectedId === item.id
            };
          })
        }
      };
    }
    _onSelect(e) {
      const item = this._props.items.find(i => i.id === e.data.key);
      this.handles.get('selected').set(item);
    }
  };
});
