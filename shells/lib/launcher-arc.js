import {Xen} from './xen.js';
import {ArcHost} from './arc-host.js';
import {DomSlotComposer} from './dom-slot-composer.js';

const log = Xen.logFactory('LauncherArc', '#cb23a6');

// TODO(sjmiles): custom elements must derive from HTMLElement. We can support flexible derivations if
// we implement as a mixin.
const LauncherArcMixin = Base => class extends Base {
  // TODO(sjmiles): Although this is strictly speaking a CustomElement API, we use it WLOG to
  // implement observable properties. We could call it observedProperties and delegate
  // observedAttributes to it, but we haven't bothered.
  static get observedAttributes() {
    return ['context', 'storage', 'composer', 'config', 'manifest', 'plan'];
  }
  fire(name, value) {
    // TODO(sjmiles): implement some generic event thingie here? Maybe build into XenState?
  }
  update(props, state) {
    const {storage, config, manifest, plan} = props;
    if (state.host && config && config !== state.config) {
      this.disposeArc(state.host);
      this.state = {config, arc: null};
    }
    if (!state.host && storage && state.config) {
      state.host = this.createHost();
    }
  }
  createHost() {
    log('creating host');
    let {context, storage, composer, config} = this.props;
    if (!composer) {
      if (config.suggestionContainer) {
        this.containers.suggestions = config.suggestionContainer;
      }
      composer = new DomSlotComposer({containers: this.containers});
    }
    return new ArcHost(context, storage, composer);
  }
  disposeArc(host) {
    log('disposing arc');
    host.disposeArc();
    this.fire('arc', null);
  }
};

export const LauncherArc = Xen.Debug(LauncherArcMixin(Xen.AsyncMixin(Xen.State(null))));

export const LauncherArcElement = class extends Xen.Debug(Xen.BaseMixin(LauncherArc)) {
  // add element-y stuff
};
customElements.define('launcher-arc', LauncherArcElement);
