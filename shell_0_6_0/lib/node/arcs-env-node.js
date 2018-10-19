import {NodeLoader} from './node-loader.js';
import {ArcsEnv} from '../arcs-env.js';
import {MessageChannel} from '../../../runtime/ts-build/message-channel.js';
import {ParticleExecutionContext} from '../../../runtime/particle-execution-context.js';

// TODO(sjmiles): some runtime is ONLY accessible via build because of firebase, leading
// to this tortured construction which affords access to that runtime via ArcsEnv namespace.
import {Arcs} from './runtime.js';
Object.assign(ArcsEnv, Arcs);

class ArcsEnvNode extends ArcsEnv {
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

export {ArcsEnvNode};
