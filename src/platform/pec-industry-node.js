import {ParticleExecutionContext} from '../runtime/particle-execution-context.js';
import {MessageChannel} from '../runtime/message-channel.js';

export const PecIndustry = loader => {
  return id => {
    const channel = new MessageChannel();
    new ParticleExecutionContext(channel.port1, `${id}:inner`, loader);
    return channel.port2;
  };
};

const _expandUrls = urlMap => {
  const remap = {};
  const {origin, pathname} = location;
  Object.keys(urlMap).forEach(k => {
    let path = urlMap[k];
    if (path[0] === '/') {
      path = `${origin}${path}`;
    }
    else if (path.indexOf('//') < 0) {
      path = `${origin}${pathname.split('/').slice(0, -1).join('/')}/${path}`;
    }
    remap[k] = path;
  });
  return remap;
};