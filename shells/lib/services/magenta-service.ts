/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {dynamicScript} from '../platform/dynamic-script-web.js';
import {Services} from '../runtime/services.js';

const magentaUrl = 'https://cdn.jsdelivr.net/npm/@magenta/music@^1.0.0';

export const requireMagenta = async () => {
  if (!window['mm']) {
    await dynamicScript(magentaUrl);
  }
  console.log('Theoretically loaded magenta.');
  return window['mm'];
};

export const loadAndPlayMusic = async () => {
  const magenta = await requireMagenta();
  const model = new magenta.MusicVAE(
    'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/trio_4bar');
  const player = new magenta.Player();
  player.resumeContext(); // enable audio
  model.sample(1)
    .then((samples) => player.start(samples[0], 80));
};

Services.register('magenta', {
  loadAndPlayMusic
});
