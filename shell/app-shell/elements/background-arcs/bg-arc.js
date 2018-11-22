import Arcs from '../../../lib/arcs.js';
import Xen from '../../../components/xen/xen.js';
import Firebase from '../../../lib/firebase.js';
import '../arc-host.js';

const template = Xen.Template.html`

<style>
  :host {
    display: none;
    position: relative;
    overflow: hidden;
    border: 1px dotted silver;
    padding: 4px;
  }
  /*arc-host {
    display: block;
  }*/
</style>

<arc-host config="{{config}}" manifest="{{manifest}}" key="{{key}}" serialization="{{serialization}}" on-arc="_onArc">
  <div slotid="root"></div>
</arc-host>

`;

const log = Xen.logFactory('BgArc', '#00a300');

class BgArc extends Xen.Debug(Xen.Base, log) {
  static get observedAttributes() {
    return ['userid', 'key', 'context', 'manifest'];
  }
  get template() {
    return template;
  }
  _update({userid, key}, state) {
    if (!state.config) {
      state.config = {
        modality: 'dom',
        root: window.arcsPath,
        rootContainer: this.shadowRoot,
        useStorage: true
      };
    }
    // arc-host will supply `arc` (_onArc) when `key`, `manifest`, and `serialization` have values
    const {arc} = state;
    if (!arc && userid && key && key !== state.key) {
      state.key = key;
      this._updateKey(userid, key);
    }
    if (arc && !state.hasSerialization) {
      state.hasSerialization = true;
      this._updateSerialization(key, arc);
    }
  }
  _render(props, state) {
    return [props, state];
  }
  async _updateKey(userid, key) {
    Firebase.db.child(`users/${userid}/arcs/${key}/touched`).set(Firebase.firebase.database.ServerValue.TIMESTAMP);
    const snap = await Firebase.db.child(`arcs/${key}/serialization`).once('value');
    const serialization = snap.val() || '';
    log('READ serialization', serialization);
    this._setState({serialization, hasSerialization: Boolean(serialization)});
  }
  async _updateSerialization(key, arc) {
    await this._instantiateDefaultRecipe(arc);
    const serialization = await arc.serialize();
    const node = Firebase.db.child(`arcs/${key}/serialization`);
    node.set(serialization);
    console.log('WROTE serialization', serialization);
    return serialization;
  }
  async _instantiateDefaultRecipe(arc) {
    const recipe = arc.context.allRecipes[0];
    if (!recipe) {
      log(`couldn't find default recipe`);
    } else {
      const errors = new Map();
      if (!recipe.normalize({errors})) {
        log(`Couldn't normalize recipe ${recipe.toString()}`); //:\n${[...options.errors.values()].join('\n')}`);
      } else {
        if (!recipe.isResolved()) {
          log(`Cannot instantiate an unresolved recipe: ${recipe.toString({showUnresolved: true})}`);
        } else {
          await arc.instantiate(recipe);
        }
      }
    }
  }
  async _onArc(e, arc) {
    this._setState({arc});
    this._fire('arc', arc);
  }
}

customElements.define('bg-arc', BgArc);
