/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import Xen from '../components/xen/xen.js';
import Arcs from './arcs.js';

const log = Xen.logFactory('ArcsUtils', '#4a148c');

const ArcsUtils = {
  createArc({id, urlMap, slotComposer, context, loader, storageKey}) {
    const pecFactory = ArcsUtils.createPecFactory(urlMap);
    return new Arcs.Arc({id, pecFactory, slotComposer, context, loader, storageKey});
  },
  createPecFactory(urlMap) {
    // worker paths are relative to worker location, remap urls from there to here
    const remap = ArcsUtils._expandUrls(urlMap);
    return ArcsUtils._createPecWorker.bind(null, urlMap[`worker-entry.js`], remap);
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
  createUrlMap(arcsRoot) {
    // Module import not available in workers yet, we have to use the build for now
    //const lib = document.URL.includes('debug') ? 'source' : 'build';
    const lib = 'build';
    return {
      // TODO(sjmiles): mapping root and dot-root allows browser-cdn-loader to replace right-hand
      // side with fully-qualified URL when loading from worker context
      '/': '/',
      './': './',
      'assets': `${arcsRoot}/shell/assets`,
      'https://$shell': `${arcsRoot}`,
      // TODO(sjmiles): map must always contain (explicitly, no prefixing) a mapping for `worker-entry-cdn.js`
      'worker-entry.js': `${arcsRoot}/shell/${lib}/worker-entry.js`,
      // BC
      'https://$cdn': `${arcsRoot}`,
      'https://$cdn/assets': `${arcsRoot}/shell/assets`,
      'https://$shell/assets': `${arcsRoot}/shell/assets`
    };
  },
  getUrlParam(name) {
    // TODO(sjmiles): memoize url
    const url = new URL(document.location.href);
    return url.searchParams.get(name);
  },
  setUrlParam(name, value) {
    // TODO(sjmiles): memoize url
    const url = new URL(document.location.href);
    if (!value) {
      url.searchParams.delete(name);
    } else {
      url.searchParams.set(name, value);
    }
    window.history.replaceState({}, '', decodeURIComponent(url.href));
  },
  // TODO: move this randomId to the backend.
  randomId() {
    return Date.now().toString(36).substr(2) + Math.random().toString(36).substr(2);
  },
  randomName() {
    const adjectives = ['adamant', 'adroit', 'amatory', 'animistic', 'antic', 'arcadian', 'baleful', 'bellicose', 'bilious', 'boorish', 'calamitous', 'caustic', 'cerulean', 'comely', 'concomitant', 'contumacious', 'corpulent', 'cromulent', 'defamatory', 'didactic', 'dilatory', 'dowdy', 'efficacious', 'effulgent', 'egregious', 'endemic', 'equanimous', 'fastidious', 'feckless', 'friable', 'fulsome', 'garrulous', 'guileless', 'gustatory', 'heuristic', 'histrionic', 'hubristic', 'incendiary', 'insidious', 'insolent', 'intransigent', 'inveterate', 'invidious', 'irksome', 'jejune', 'jocular', 'judicious', 'lachrymose', 'limpid', 'loquacious', 'luminous', 'mannered', 'mendacious', 'meretricious', 'minatory', 'mordant', 'munificent', 'nefarious', 'noxious', 'obtuse', 'parsimonious', 'pendulous', 'pernicious', 'pervasive', 'petulant', 'platitudinous', 'precipitate', 'propitious', 'puckish', 'querulous', 'quiescent', 'rebarbative', 'recalcitrant', 'redolent', 'rhadamanthine', 'risible', 'ruminative', 'sagacious', 'salubrious', 'sartorial', 'sclerotic', 'serpentine', 'spasmodic', 'strident', 'taciturn', 'tenacious', 'tremulous', 'trenchant', 'turbulent', 'turgid', 'ubiquitous', 'uxorious', 'verdant', 'voluble', 'voracious', 'wheedling', 'withering', 'zealous'];
    const nouns = ['ninja', 'chair', 'pancake', 'statue', 'unicorn', 'rainbows', 'laser', 'senor', 'bunny', 'captain', 'nibblets', 'cupcake', 'carrot', 'gnomes', 'glitter', 'potato', 'salad', 'marjoram', 'curtains', 'beets', 'toiletries', 'exorcism', 'stick figures', 'mermaid eggs', 'sea barnacles', 'dragons', 'jellybeans', 'snakes', 'dolls', 'bushes', 'cookies', 'apples', 'ice cream', 'ukulele', 'kazoo', 'banjo', 'opera singer', 'circus', 'trampoline', 'carousel', 'carnival', 'locomotive', 'hot air balloon', 'praying mantis', 'animator', 'artisan', 'artist', 'colorist', 'inker', 'coppersmith', 'director', 'designer', 'flatter', 'stylist', 'leadman', 'limner', 'make-up artist', 'model', 'musician', 'penciller', 'producer', 'stenographer', 'set decorator', 'silversmith', 'teacher', 'auto mechanic', 'beader', 'bobbin boy', 'clerk of the chapel', 'filling station attendant', 'foreman', 'maintenance engineering', 'mechanic', 'miller', 'moldmaker', 'panel beater', 'patternmaker', 'plant operator', 'plumber', 'sawfiler', 'shop foreman', 'soaper', 'stationary engineer', 'wheelwright', 'woodworkers'];
    let rl = list => list[Math.floor(Math.random()*list.length)];
    return `${rl(adjectives)}-${rl(nouns)}`.replace(/ /g, '-');
  },
  metaTypeFromType(type) {
    return JSON.stringify(type ? type.toLiteral() : null);
  },
  typeFromMetaType(metaType) {
    return Arcs.Type.fromLiteral(JSON.parse(metaType));
  },
  async getStoreData(handle) {
    return handle.type.isCollection ? await handle.toList() : await handle.get();
  },
  setStoreData(store, data) {
    this.clearStore(store);
    this.addStoreData(store, data);
  },
  clearStore(store) {
    if (store.toList) {
      // TODO(sjmiles): if we go async here, we have nasty re-entry issues, so
      // hacking store API to fix for now. Probably we need low-level support
      // for 'setStoreData' above.
      const ids = [...store._model.items.keys()];
      //const entities = await store.toList();
      ids.forEach(id => store.remove(id));
    } else {
      store.clear();
    }
  },
  addStoreData(store, data) {
    if (store.type.isCollection) {
      // FIXME: store.generateID may not be safe (session scoped)?
      data && Object.values(data).forEach(e => store.store(e, [store.generateID()]));
    } else {
      data && store.set(data);
    }
  }
};

export default ArcsUtils;
