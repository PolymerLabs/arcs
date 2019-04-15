/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

defineParticle(({DomParticle, html, log, resolver}) => {

  const template = html`

<style>
  :host {
    padding: 16px;
  }
  [tile] {
    position: absolute;
    background: #eee;
    color: black;
    transition: all 0.3s;
    width: 120px;
    height: 120px;
    padding: 8px;
    box-sizing: border-box;
    border: 1px dotted gray;
  }
  [container] {
    position: relative;
  }
</style>

<h3>Click the tiles to animate...</h3>

<div container>
  <div>{{tiles}}</div>
</div>

<template tile>
  <span tile xen:style="{{style}}" on-click="onClick">{{name}}</span>
</template>

  `;

  const Grid = class {
    constructor() {
      this.grid = [];
      this.tiles = [];
    }
    _newTile(name, t, l) {
      const tile = {name, t, l};
      tile.id = this.tiles.push(tile) - 1;
      return tile;
    }
    add(name, t) {
      const tile = this._newTile(name, t, 0);
      const row = this.grid[t] || (this.grid[t] = []);
      tile.l = row.push(tile) - 1;
    }
    insert(name, t, l) {
      const tile = this._newTile(name, t, l);
      const row = this.grid[t] || (this.grid[t] = []);
      row.splice(l, 0, tile);
      for (let i=l+1, col; col=row[i]; i++) {
        col.l++;
      }
    }
    remove(t, l) {
      const row = this.grid[t];
      const tile = row[l];
      this.tiles.splice(tile.id, 1);
      for (let i=tile.id, sibling; sibling=this.grid[i]; i++) {
        sibling.id--;
      }
      row.splice(l, 1);
      for (let i=l, col; col=row[i]; i++) {
        col.l--;
      }
    }
    get models() {
      const models = [];
      for (let i=0, tile; tile=this.tiles[i]; i++) {
        models.push(tile);
      }
      return models;
    }
  };

  return class extends DomParticle {
    get template() {
      return template;
    }
    update(props, state) {
      if (!state.grid) {
        state.grid = new Grid();
        ['Alfa', 'Bravo'].forEach(n => state.grid.add(n, 0));
        ['Charlie', 'Delta'].forEach(n => state.grid.add(n, 1));
      }
    }
    render(props, state) {
      const renderModels = state.grid.models.map(({name, t, l}, i) => ({
        name,
        style: `top: ${t*120}px; left: ${l*120}px; z-index: ${1000-i};`
      }));
      return {
        tiles: {
          $template: 'tile',
          models: renderModels
        }
      };
    }
    onClick() {
      const {grid} = this.state;
      switch (grid.tiles.length) {
        case 4:
          grid.insert('Echo', 0, 1);
          break;
        case 5:
          grid.insert('Foxtrot', 0, 0);
          break;
        case 6:
          grid.insert('Golf', 0, 1);
          break;
        case 7:
          grid.remove(0, 1);
          break;
      }
      this._invalidate();
    }
  };

});
