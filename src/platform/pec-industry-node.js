import {ParticleExecutionContext} from '../runtime/particle-execution-context.js';
import {MessageChannel} from '../runtime/message-channel.js';

export const PecIndustry = loader => {
  return id => {
    const channel = new MessageChannel();
    new ParticleExecutionContext(channel.port1, `${id}:inner`, loader);
    return channel.port2;
  };
};
