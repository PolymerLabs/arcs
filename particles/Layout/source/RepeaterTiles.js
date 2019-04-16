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
    display: inline-block;
    background: #eee;
    color: black;
    width: 120px;
    height: 120px;
    padding: 8px;
    box-sizing: border-box;
    border: 1px dotted gray;
    opacity: 1;
    transition: all 0.3s;
    animation: tile-enter 0.3s;
  }
  @keyframes tile-enter {
    from {
      transform: scale(0);
      opacity: 0;
    }
  }
  /* exit animation */
  [tile].xen-exit {
    transform: scale(0);
    opacity: 0;
  }
  [container] {
    display: block;
    position: relative;
    height: 400px;
    user-select: none;
  }
</style>

<h3>Click the tiles to animate...</h3>

<dom-repeater xen:forward container models="{{models}}">
  <template>
    <div tile key="{{key}}" xen:style="{{style}}" on-click="onTileClick"><span>{{name}}</span></div>
  </template>
</dom-repeater>

  `;

  const Grid = class {
    constructor() {
      this.grid = [];
      this.tiles = [];
      this.key = 0;
    }
    _newTile(name, t, l) {
      const tile = {name, t, l, key: this.key++, color: 'silver'};
      this.tiles.push(tile);
      return tile;
    }
    insert({name, t, l}) {
      const tile = this._newTile(name, t, l);
      const row = this.grid[t] || (this.grid[t] = []);
      row.splice(l, 0, tile);
      for (let i=l+1, col; col=row[i]; i++) {
        col.l++;
      }
    }
    remove({t, l}) {
      const row = this.grid[t];
      for (let i=l, col; (col=row[i]); i++) {
        col.l--;
      }
      const tile = row.splice(l, 1).pop();
      const i = this.tiles.indexOf(tile);
      this.tiles.splice(i, 1);
    }
    operate({insert, remove}) {
      if (insert) {
        this.insert(insert);
      }
      if (remove) {
        this.remove(remove);
      }
    }
  };

  return class extends DomParticle {
    get template() {
      return template;
    }
    update(props, {grid, insert, remove, sweep, unfreeze}) {
      if (!grid) {
        grid = new Grid();
        ['Alfa', 'Bravo'].forEach(name => grid.insert({name, t: 0, l: 0}));
        ['Charlie', 'Delta'].forEach(name => grid.insert({name, t: 1, l: 0}));
      }
      grid.operate({insert, remove});
      this.setState({grid, insert: null, remove: null});
    }
    render(props, {grid}) {
      const models = grid.tiles.map(({name, t, l, key, color}, i) => ({
        key, name, style: `top: ${t*120}px; left: ${l*120}px; z-index: ${1000-i}; background-color: ${color};`
      }));
      return {
        models
      };
    }
    onClick() {
      const {grid} = this.state;
      const live = grid.tiles.filter(tile => !tile.removed);
      switch (live.length) {
        case 4:
          this.setState({insert: {name: 'Echo', t: 0, l: 1}});
          break;
        case 5:
          this.setState({insert: {name: 'Foxtrot', t: 0, l: 0}});
          break;
        case 6: {
          // add random tile
          const t = Math.floor(Math.random()*3);
          const row = grid.grid[t];
          const l = Math.floor(Math.random()*(row ? row.length : 0));
          this.setState({insert: {name: `Golf (${grid.key+1})`, t, l}});
        } break;
        case 7: {
          // remove random tile
          const tile = live[Math.floor(Math.random()*live.length)];
          this.setState({remove: tile});
        } break;
      }
    }
    onTileClick(e) {
      log('TileClick', e.data);
      const tile = this.state.grid.tiles.find(tile => tile.key === e.data.key);
      tile.color = ['red', 'lightblue', 'lightgreen', 'goldenrod'][Math.floor(Math.random()*4)];
      this.onClick(e);
    }
  };

});
