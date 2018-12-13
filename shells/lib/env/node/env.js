import './arcs.js';
import {NodeLoader} from '../../source/node-loader.js';
import {MessageChannel} from '../../../../build/runtime/message-channel.js';
import {ParticleExecutionContext} from '../../../../build/runtime/particle-execution-context.js';
import {EnvBase} from '../env-base.js';

export class Env extends EnvBase {
  constructor(rootPath) {
    super(rootPath, NodeLoader);
  }
  get pecFactory() {
    return id => {
      const channel = new MessageChannel();
      new ParticleExecutionContext(channel.port1, `${id}:inner`, this.loader);
      return channel.port2;
    };
  }
}

// TODO(sjmiles): use a shared import instead of a global
const g = (typeof window === 'undefined') ? global : window;
g.__Env__ = Env;
