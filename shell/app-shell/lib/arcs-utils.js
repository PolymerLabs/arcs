/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import Xen from '../../components/xen/xen.js';
const Arcs = window.Arcs;

const ArcsUtils = {
  createArc({id, urlMap, slotComposer, context, loader}) {
    // worker paths are relative to worker location, remap urls from there to here
    let remap = ArcsUtils._expandUrls(urlMap);
    let pecFactory = ArcsUtils._createPecWorker.bind(null, urlMap[`worker-entry-cdn.js`], remap);
    return new Arcs.Arc({id, pecFactory, slotComposer, context, loader});
  },
  _expandUrls(urlMap) {
    let remap = {};
    Object.keys(urlMap).forEach(k => {
      let path = urlMap[k];
      if (path[0] === '/') {
        path = `${location.origin}${path}`;
      } else if (path.indexOf('//') < 0) {
        let root = location.origin + location.pathname.split('/').slice(0, -1).join('/');
        path = `${root}/${path}`;
      }
      remap[k] = path;
    });
    return remap;
  },
  _createPecWorker(path, map, id) {
    const channel = new MessageChannel();
    const worker = new Worker(path);
    worker.postMessage({id: `${id}:inner`, base: map}, [channel.port1]);
    return channel.port2;
  },
  createUrlMap(cdnRoot) {
    // Module import not available in workers yet, we have to use the build for now
    //const lib = document.URL.includes('debug') ? 'source' : 'lib';
    const lib = 'lib';
    return {
      // TODO(sjmiles): mapping root and dot-root allows browser-cdn-loader to replace right-hand
      // side with fully-qualified URL when loading from worker context
      '/': '/',
      './': './',
      'assets': `${cdnRoot}/assets`,
      'https://$cdn': `${cdnRoot}`,
      // TODO(sjmiles): map must always contain (explicitly, no prefixing) a mapping for `worker-entry-cdn.js`
      'worker-entry-cdn.js': `${cdnRoot}/${lib}/worker-entry-cdn.js`
    };
  },
  async makePlans(arc, timeout) {
    let generations = [];
    let planner = new Arcs.Planner();
    planner.init(arc);
    let plans = await planner.suggest(timeout || 5000, generations);
    plans.generations = generations;
    return plans;
  },
  async parseManifest(fileName, content, loader) {
    return await Arcs.Manifest.parse(content,
      {id: null, fileName, loader, registry: null, position: {line: 1, column: 0}});
  },
  setUrlParam(name, value) {
    let url = new URL(document.location.href);
    url.searchParams.set(name, value);
    window.history.replaceState({}, "", decodeURIComponent(url.href));
  },
  // TODO: move this randomId to the backend.
  randomId() {
    return Date.now().toString(36).substr(2) + Math.random().toString(36).substr(2);
  },
  randomName() {
    const adjectives = ["adamant", "adroit", "amatory", "animistic", "antic", "arcadian", "baleful", "bellicose", "bilious", "boorish", "calamitous", "caustic", "cerulean", "comely", "concomitant", "contumacious", "corpulent", "cromulent", "defamatory", "didactic", "dilatory", "dowdy", "efficacious", "effulgent", "egregious", "endemic", "equanimous", "fastidious", "feckless", "friable", "fulsome", "garrulous", "guileless", "gustatory", "heuristic", "histrionic", "hubristic", "incendiary", "insidious", "insolent", "intransigent", "inveterate", "invidious", "irksome", "jejune", "jocular", "judicious", "lachrymose", "limpid", "loquacious", "luminous", "mannered", "mendacious", "meretricious", "minatory", "mordant", "munificent", "nefarious", "noxious", "obtuse", "parsimonious", "pendulous", "pernicious", "pervasive", "petulant", "platitudinous", "precipitate", "propitious", "puckish", "querulous", "quiescent", "rebarbative", "recalcitrant", "redolent", "rhadamanthine", "risible", "ruminative", "sagacious", "salubrious", "sartorial", "sclerotic", "serpentine", "spasmodic", "strident", "taciturn", "tenacious", "tremulous", "trenchant", "turbulent", "turgid", "ubiquitous", "uxorious", "verdant", "voluble", "voracious", "wheedling", "withering", "zealous"];
    const nouns = ["ninja", "chair", "pancake", "statue", "unicorn", "rainbows", "laser", "senor", "bunny", "captain", "nibblets", "cupcake", "carrot", "gnomes", "glitter", "potato", "salad", "marjoram", "curtains", "beets", "toiletries", "exorcism", "stick figures", "mermaid eggs", "sea barnacles", "dragons", "jellybeans", "snakes", "dolls", "bushes", "cookies", "apples", "ice cream", "ukulele", "kazoo", "banjo", "opera singer", "circus", "trampoline", "carousel", "carnival", "locomotive", "hot air balloon", "praying mantis", "animator", "artisan", "artist", "colorist", "inker", "coppersmith", "director", "designer", "flatter", "stylist", "leadman", "limner", "make-up artist", "model", "musician", "penciller", "producer", "stenographer", "set decorator", "silversmith", "teacher", "auto mechanic", "beader", "bobbin boy", "clerk of the chapel", "filling station attendant", "foreman", "maintenance engineering", "mechanic", "miller", "moldmaker", "panel beater", "patternmaker", "plant operator", "plumber", "sawfiler", "shop foreman", "soaper", "stationary engineer", "wheelwright", "woodworkers"];
    let rl = list => list[Math.floor(Math.random()*list.length)];
    return `${rl(adjectives)}-${rl(nouns)}`.replace(/ /g, '-');
  },
  async describeArc(arc) {
    const combinedSuggestion = await new Arcs.Description(arc).getArcDescription();
    return combinedSuggestion || '';
  },
  removeUndefined(object) {
    return JSON.parse(JSON.stringify(object));
  },
  async createOrUpdateHandle(arc, remoteHandle, idPrefix) {
    let {metadata, values} = remoteHandle;
    // construct type object
    let type = ArcsUtils.typeFromMetaType(metadata.type);
    // construct id
    let id = ArcsUtils.getContextHandleId(type, metadata.tags, idPrefix);
    // find or create a handle in the arc context
    let handle = await ArcsUtils._requireHandle(arc, type, metadata.name, id, metadata.tags);
    await ArcsUtils.setHandleData(handle, values);
    return handle;
  },
  // Returns the context handle id for the given params.
  getContextHandleId(type, tags, prefix) {
    return ''
      + (prefix ? `${prefix}_` : '')
      + (`${type.toString().replace(' ', '-')}_`).replace(/[\[\]]/g, '!')
      + ((tags && [...tags].length) ? `${[...tags].sort().join('-').replace(/#/g, '')}` : '')
      ;
  },
  _getHandleDescription(name, tags, user, owner) {
      let noun = (user === owner) ? 'my' : `<b>${owner}'s</b>`;
      if (tags && tags.length) {
        return `${noun} ${tags[0].substring(1)}`;
      }
      if (name) {
        return `${noun} ${name}`;
      }
  },
  async _requireHandle(arc, type, name, id, tags) {
    let handle = arc.context.findHandleById(id);
    if (!handle) {
      handle = await arc.context.newView(type, name, id, tags);
      ArcsUtils.log('synthesized handle', id, tags);
    }
    return handle;
  },
  metaTypeFromType(type) {
    return JSON.stringify(type ? type.toLiteral() : null);
  },
  typeFromMetaType(metaType) {
    return Arcs.Type.fromLiteral(JSON.parse(metaType));
  },
  async getHandleData(handle) {
    return handle.toList ? await handle.toList() : {id: handle.id, rawData: handle._stored && handle._stored.rawData || {}};
  },
  async setHandleData(handle, data) {
    await this.clearHandle(handle);
    this.addHandleData(handle, data);
  },
  async clearHandle(handle) {
    if (handle.toList) {
      let entities = await handle.toList();
      entities.forEach(e => handle.remove(e.id));
    } else {
      // TODO(sjmiles): necessary? correct semantics?
      handle.clear();
    }
  },
  addHandleData(handle, data) {
    if (handle.toList) {
      data && Object.values(data).forEach(e => handle.store(e));
    } else {
      handle.set(data);
    }
  },
  getUserProfileKeys(user) {
    return ArcsUtils.intersectArcKeys(user.arcs, user.profiles);
  },
  getUserShareKeys(user) {
    return ArcsUtils.intersectArcKeys(user.arcs, user.shares);
  },
  intersectArcKeys(arcs, other) {
    // TODO(sjmiles): database has no referential integrity, so
    // `user.[profiles|shares]` may contain dead keys (aka keys not in `arcs`).
    // The corrected set is the intersection of `user.arcs` and `user.[profiles|shares]`.
    return arcs && other ? Object.keys(arcs).filter(key => Boolean(other[key])) : [];
  },
  // usage: this._debouncer = debounce(this._debouncer, task, 100);
  debounce(key, action, delay) {
    if (key) {
      clearTimeout(key);
    }
    if (action && delay) {
      return setTimeout(action, delay);
    }
  },
  html(strings, ...values) {
    return (strings[0] + values.map((v, i) => v + strings[i + 1]).join('')).trim();
  },
  log: Xen.Base.logFactory('ArcsUtils', '#4a148c')
};

export default ArcsUtils;
