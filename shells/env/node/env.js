import {NodeLoader} from './node-loader.js';
import {ArcsEnv} from '../env.js';
import {MessageChannel} from '../../../runtime/ts-build/message-channel.js';
import {ParticleExecutionContext} from '../../../runtime/ts-build/particle-execution-context.js';

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
