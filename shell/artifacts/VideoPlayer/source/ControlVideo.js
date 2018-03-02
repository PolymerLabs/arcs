/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

defineParticle(({DomParticle}) => {

  /*
    let template = `
<span>{{mode}}</span> @ <span>{{position}}</span>
<button on-click="_play">Play</button>
<button on-click="_pause">Pause</button>
<button on-click="_restart">Restart</button><br>
<button on-click="_downVolume">--</button>
<button on-click="_muteVolume">mute</button>
<button on-click="_upVolume">++</button>
  `.trim();
*/
  
  let template = `
<style>
  [video-controller] button {
    background-color: transparent;
    border: none;
    padding: 0;
  }
</style>
<div video-controller style="padding: 4px;">
  <div style="display: flex;">
    <button on-click="_play"><i class="material-icons">play_arrow</i></button>
    <button on-click="_pause"><i class="material-icons">pause</i></button>
    <button on-click="_restart"><i class="material-icons">replay</i></button>
    <div style="flex: 1; text-align: center; font-size: 0.7em;"><span>{{mode}}</span> @ <span>{{position}}</span></div>
    <button on-click="_muteVolume"><i class="material-icons">volume_mute</i></button>
    <button on-click="_downVolume"><i class="material-icons">volume_down</i></button>
    <button on-click="_upVolume"><i class="material-icons">volume_up</i></button>
  </div>
</div>
  `.trim();

  let Play = 'play';
  let Pause = 'pause';
  
  return class Compose extends DomParticle {
    get template() {
      return template;
    }
    _getInitialState() {
      return {mode: undefined, position: 0, ts: Date.now(), volume: 20};
    }
    _willReceiveProps(props) {
      if (props.controls && props.controls.length) {
        let last = props.controls[props.controls.length - 1];
        this._setState({
          mode: last.mode,
          position: Number(last.position),
          ts: Number(last.ts),
          volume: Number(last.volume),
          changed: false,
        });
      }
    }
    _setVideoPlayback({mode, ts, position, volume}) {
      const VideoPlayback = this._views.get('controls').entityClass;
      this._views.get('controls').store(new VideoPlayback({mode, ts, position, volume}));
    }
    _updateState(newMode) {
      let {position, mode, ts} = this._state;
      if (mode == newMode)
        return;
      let newTs = Date.now();
      if (newMode == Pause) {
        // Compute the new position. Mode used to be play.
        console.log('mode', mode);
        console.assert(mode == Play);
        position += (newTs - ts);
      }
      this._setState({mode: newMode, ts: Number(newTs), position: Number(position), changed: true});
    }
    _play(e, state) {
      this._updateState(Play);
    }
    _pause(e, state) {
      this._updateState(Pause);
    }
    _restart(e, state) {
      this._setState({mode: Play, position: 0, ts: Date.now(), changed: true});
    }
    _downVolume(e, state) {
      this._setState({changed: true, volume: Math.max(0, this._state.volume - 10)});
    }
    _upVolume(e, state) {
      this._setState({changed: true, volume: Math.max(0, this._state.volume + 10)});
    }
    _muteVolume(e, state) {
      this._setState({changed: true, volume: 0});
    }
    _render(props, state) {
      if (state.changed) {
        this._setVideoPlayback(state);
        state.changed = false;
      }
      return state;
    }
  };
});