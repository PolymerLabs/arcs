import {ParticleExecutionContext} from '../runtime/particle-execution-context.js';
import {MessageChannel} from '../runtime/message-channel.js';
import {Id, IdGenerator} from '../runtime/id.js';

const pecIndustry = loader => {
  return (pecId: Id, idGenerator: IdGenerator) => {
    const channel = new MessageChannel();
    const _throwAway = new ParticleExecutionContext(channel.port1, pecId, idGenerator, loader);
    return channel.port2;
  };
};

export {pecIndustry as PecIndustry};