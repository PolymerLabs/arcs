import {Xen} from '../lib/xen.js';
import {ArcHost} from '../lib/arc-host.js';
import {DomSlotComposer} from '../lib/dom-slot-composer.js';
import {logFactory} from '../../build/platform/log-web.js';

const log = logFactory('ArcComponent', '#cb23a6');

// TODO(sjmiles): custom elements must derive from HTMLElement. Because we want to choose whether to make this an
// element or not (flexible derivation), we implement as a mixin.
export const ArcComponentMixin = Base => class extends Base {
  // TODO(sjmiles): Although this is strictly speaking a CustomElement API, we use it WLOG to
  // implement observable properties. I could call it observedProperties and delegate
  // observedAttributes to it, but I haven't bothered.
  static get observedAttributes() {
    return ['context', 'storage', 'composer', 'config', 'manifest', 'plan'];
  }
  constructor() {
    super();
    this._props.changed = this.propChanged.bind(this);
  }
  propChanged(name) {
    return (this.props[name] !== this._lastProps[name]);
  }
  //fire(name, value) {
    // TODO(sjmiles): Implement generic event thingie here? Maybe build into XenState? A different mixin? Be abstract?
  //}
  update(props, {host, arc}) {
    if (props.changed('config')) {
      if (host) {
        this.disposeArc(host);
      }
    }
    if (!host && props.config && props.storage) {
      this.state = {host: this.createHost(props)};
    }
    if (!arc && props.config && host) {
      this.spawnArc(host, props.config);
    }
    if (host && props.changed('manifest')) {
      if (props.manifest) {
        // causes host to (attempt to) instantiate first recipe in `manifest`
        host.manifest = props.manifest;
      }
    }
    if (host && props.plan && props.changed('plan')) {
      host.plan = props.plan;
    }
  }
  createHost({context, storage, composer, config}) {
    log('creating host');
    const containers = this.containers || {};
    if (!composer) {
      if (config.suggestionContainer) {
        containers.suggestions = config.suggestionContainer;
      }
      composer = new DomSlotComposer({containers});
    }
    return new ArcHost(context, storage, composer);
  }
  spawnArc(host, config) {
    // awaitState blocks re-entry until the async function has returned
    this.awaitState('arc', async () => this.spawnArcAsync(host, config));
  }
  async spawnArcAsync(host, config) {
    log(`spawning arc [${config.id}]`);
    const arc = await host.spawn(config);
    log(`arc spawned [${config.id}]`);
    this.fire('arc', arc);
    return arc;
  }
  disposeArc(host) {
    log('disposing arc');
    host.disposeArc();
    this.state = {arc: null};
    this.fire('arc', null);
  }
};

export const LauncherArc = Xen.Debug(Xen.AsyncMixin(ArcComponentMixin(Xen.BaseMixin(class {}))), log);
