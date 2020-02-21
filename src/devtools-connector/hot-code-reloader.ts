/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Arc} from '../runtime/arc.js';
import {ArcDevtoolsChannel, DevtoolsMessage} from './abstract-devtools-channel.js';
import {Particle} from '../runtime/recipe/particle.js';

/**
 * Listens to particle reload events for all particles instantiated in an arc and reloads the particles
 * when their source files change
 */
export class HotCodeReloader {
  private arc: Arc;
  private arcDevtoolsChannel: ArcDevtoolsChannel;

  constructor(arc: Arc, arcDevtoolsChannel: ArcDevtoolsChannel) {
    this.arc = arc;
    this.arcDevtoolsChannel = arcDevtoolsChannel;

    arcDevtoolsChannel.listen('particle-reload', (msg: DevtoolsMessage) => void this._reload(msg.messageBody));
  }

  _reload(filepath: string) {
    const arcs: Arc[] = [this.arc];
    arcs.push(...this.arc.innerArcs);

    for (const arc of arcs) {
      const particles: Particle[] = [];
      for (const particle of arc.peh.particles) {
        if (particle.spec.implFile === filepath) {
          particles.push(particle);
        }
      }
      arc.peh.reload(particles);
    }
  }

  updateParticleSet(particles: Particle[]) {
    const particleSources = [];
    particles.forEach(particle => {
      particleSources.push(particle.spec.implFile);
    });
    this.arcDevtoolsChannel.send({
      messageType: 'watch-particle-sources',
      messageBody: particleSources
    });
  }
}
