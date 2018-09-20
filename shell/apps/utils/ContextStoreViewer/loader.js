import Arcs from '../../../lib/arcs.js';
import ArcsUtils from '../../../lib/arcs-utils.js';

const createLoader = ({root, urls}) => {
  // create default URL map
  const urlMap = ArcsUtils.createUrlMap(root);
  // create a system loader
  // TODO(sjmiles): `pecFactory` creates loader objects (via worker-entry*.js) for the innerPEC,
  // but we have to create one by hand for manifest loading
  const loader = new Arcs.BrowserLoader(urlMap);
  // add `urls` to `urlMap` after a resolve pass
  if (urls) {
    Object.keys(urls).forEach(k => urlMap[k] = loader._resolve(urls[k]));
  }
  return loader;
};

export {createLoader};
