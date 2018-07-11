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

  let template = `
  <!-- TODO: the docs say we should add the video to the scene assets and then reference
    it here. This requires a second slot and the ability to render into two slots at once
    which I'm not sure how to do yet.

    <!--<video id="thevideo" preload="auto"
    src="assets/trailer.mp4"
    width="160" height="90" autoplay loop="true"
    crossOrigin="anonymous"></video>-->

    -->
  <video id="thevideo" src="assets/trailer.mp4" width="160" height="90" crossOrigin="anonymous"></video>
  <a-video src="#thevideo" crossOrigin="anonymous" width="4" height="2.25" position="-2 5 -6" rotation="20 0 0"></a-video>
  <video-controller config={{config}} video="thevideo"></video-controller>
  `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    render(props, state) {
      if (props.controls && props.controls.length) {
        let c = props.controls[props.controls.length - 1];
        return {
          mode: c.mode,
          position: c.position,
          ts: c.ts,
          volume: c.volume,
          config: {
            mode: c.mode,
            position: c.position,
            ts: c.ts,
            volume: c.volume,
          }};
      }
    }
  };
});