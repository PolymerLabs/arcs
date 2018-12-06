import {NodeLoader} from './node-loader.js';
import {ArcsEnv} from '../env.js';
import {MessageChannel} from '../../../build/runtime/message-channel.js';
import {ParticleExecutionContext} from '../../../build/runtime/particle-execution-context.js';

class Env extends ArcsEnv {
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

export {Env};
