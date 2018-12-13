import './arcs.js';
import {EnvBase} from '../env-base.js';
import {BrowserLoader} from '../../arcs.js';

export class Env extends EnvBase {
  constructor(rootPath) {
    super(rootPath, BrowserLoader);
  }
  get pecFactory() {
    // worker paths are relative to worker location, remap urls from there to here
    const remap = this._expandUrls(this.pathMap);
    const workerPath = this.loader._resolve(`https://$shell/lib/build/worker.js`);
    return id => {
      const worker = new Worker(workerPath);
      const channel = new MessageChannel();
      worker.postMessage({id: `${id}:inner`, base: remap}, [channel.port1]);
      return channel.port2;
    };
  }
  _expandUrls(urlMap) {
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
  }
}
