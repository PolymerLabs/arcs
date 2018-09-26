import {Arc} from '../../../runtime/arc.js';
import {BrowserLoader} from './shell/browser-loader.js';
import {MockSlotComposer} from './runtime/mock-slot-composer.js';
import {MessageChannel} from '../../../runtime/message-channel.js';
import {ParticleExecutionContext} from '../../../runtime/particle-execution-context.js';
import {fetch} from '../../../runtime/fetch-node.js';
import {Runtime} from '../../../runtime/ts-build/runtime.js';

//const LoaderKind = Loader;
const LoaderKind = BrowserLoader;
// TODO(sjmiles): hack to plumb `fetch` into Particle space under node
LoaderKind.fetch = fetch;

//const ComposerKind = SlotComposer;
const ComposerKind = MockSlotComposer;

const ArcFactory = class {
  constructor() {
    this.loader = new LoaderKind({
      'https://$cdn/': '../../../',
      'https://$shell/': '../../../',
      'https://$artifacts/': '../../../artifacts/',
      'https://sjmiles.github.io/': '../../../../'
    });
    //console.log(loader);
    //console.log(slotComposer);
    this.pecFactory = function(id) {
      let channel = new MessageChannel();
      new ParticleExecutionContext(channel.port1, `${id}:inner`, this.loader);
      return channel.port2;
    };
    //console.log(pecFactory);
    //const arcsPath = '../../arcs';
    //const arcsURL = 'http://localhost/projects/arcs/arcs';
  }
  getParams(context) {
    const {pecFactory, slotComposer, loader} = this;
    return {
      id: `server-arc`,
      pecFactory,
      loader,
      context,
      storageKey: null,
      slotComposer: this.createComposer()
    };
  }
  createComposer() {
    return new ComposerKind({
      affordance: 'mock',
      rootContainer: {
        toproot: 'toproot-context',
        root: 'root-context',
        modal: 'modal-context'
      }
    });
  }
  spawn(context) {
    const params = this.getParams(context);
    const arc = new Arc(params);
    // TODO(sjmiles): no analog in shell?
    params.slotComposer.pec = arc.pec;
    return arc;
  }
  deserialize(context, serialization) {
    const params = this.getParams(context);
    params.serialization = serialization;
    params.fileName = './serialized.manifest';
    //console.log(params);
    const arc = Arc.deserialize(params);
    // TODO(sjmiles): no analog in shell?
    params.slotComposer.pec = arc.pec;
    return arc;
  }
  async createContext(serialization) {
    const loader = this.loader;
    // TODO(sjmiles): do we need to be able to `config` this value?
    const fileName = './in-memory.manifest';
    try {
      return await Runtime.parseManifest(serialization || '', {loader, fileName});
    } catch (x) {
      console.warn(x);
      return await Runtime.parseManifest('', {loader, fileName});
    }
  }
};

export {ArcFactory};
