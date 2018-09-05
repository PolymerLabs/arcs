import Arcs from '../../lib/arcs.js';
import Xen from '../../../components/xen/xen.js';

const template = Xen.Template.html`

<style>
  :host {
    display: none;
    position: relative;
    overflow: hidden;
    border: 1px dotted silver;
    padding: 4px;
  }
  arc-host {
    display: block;
  }
</style>

<arc-host config="{{config}}" manifest="{{manifest}}" key="{{key}}" serialization="{{serialization}}" on-arc="_onArc">
  <div slotid="root"></div>
</arc-host>

`;

const log = Xen.logFactory('BgArc', '#00a300');

class BgArc extends Xen.Debug(Xen.Base, log) {
  static get observedAttributes() {
    return [];
  }
  get template() {
    return template;
  }
  _render(props, state) {
    return state;
  }
  _didMount() {
    this._initArc();
  }
  _initArc() {
    this._setState({
      config: {
        affordance: 'dom',
        root: window.arcsPath,
        rootContainer: this.shadowRoot,
        //manifestPath: params.get('manifest'),
        //solo: params.get('solo'),
        //defaultManifest: window.defaultManifest,
        //userid: params.get('user') || localStorage.getItem(Const.LOCALSTORAGE.user),
        //key: params.get('arc') || null,
        //search: params.get('search') || '',
        //urls: window.shellUrls || {},
        //useStorage: params.has('store'),
        //useSerialization: params.has('serial')
      },
      manifest: '',
      serialization: '',
      key: 'launcher'
    });
  }
  async _onArc(e) {
    const arc = e.detail;
    const manifestContent = `
      import '${window.arcsPath}/artifacts/Pipes/Pipes.recipes'
    `;
    const options = {
      fileName: './in-memory.manifest',
      loader: arc._loader
    };
    const manifest = window.manifest = await Arcs.Runtime.parseManifest(manifestContent, options);
    //console.log(manifest);
    const recipe = manifest.recipes[0];
    // console.log(recipe);
    const errors = new Map();
    if (!recipe.normalize({errors})) {
      console.log(`Couldn't normalize recipe ${recipe.toString()}:\n${[...options.errors.values()].join('\n')}`);
    } else {
      //console.log(recipe.isResolved());
      if (!recipe.isResolved()) {
        console.log(`Cannot instantiate an unresolved recipe: ${recipe.toString({showUnresolved: true})}`);
      } else {
        arc.instantiate(recipe);
      }
    }
  }
}

customElements.define('bg-arc', BgArc);
