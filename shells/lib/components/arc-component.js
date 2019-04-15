import {Xen} from '../xen.js';
import {ArcHost} from './arc-host.js';
import {DomSlotComposer} from './dom-slot-composer.js';
import {logFactory} from '../../../build/platform/log-web.js';

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
  propChanged(name) {
    return (this.props[name] !== this._lastProps[name]);
  }
  //fire(name, value) {
    // TODO(sjmiles): Implement generic event thingie here? Maybe build into XenState? A different mixin? Be abstract?
  //}
  update(props, state) {
    if (this.propChanged('config')) {
      if (state.host) {
        this.disposeArc(state.host);
      }
    }
    if (!state.host && props.config && props.storage && props.context) {
      this.state = {host: this.createHost(props)};
    }
    if (state.host && !state.arc && props.config) {
      this.spawnArc(state.host, props.config);
    }
    if (state.host && this.propChanged('manifest')) {
      if (props.manifest) {
        // causes host to (attempt to) instantiate first recipe in `manifest`
        state.host.manifest = props.manifest;
      }
    }
    if (state.host && props.plan && this.propChanged('plan')) {
      state.host.plan = props.plan;
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
