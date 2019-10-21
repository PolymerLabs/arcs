/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

const WORKER_PATH = `https://$build/worker.js`;

const pecIndustry = loader => {
  // worker paths are relative to worker location, remap urls from there to here
  const remap = _expandUrls(loader._urlMap);
  // get real path from meta path
  const workerUrl = loader.resolve(WORKER_PATH);
  // provision (cached) Blob url (async, same workerBlobUrl is captured in both closures)
  let workerBlobUrl;
  loader.provisionObjectUrl(workerUrl).then((url: string) => workerBlobUrl = url);
  // return a pecfactory
  return id => {
    if (!workerBlobUrl) {
      console.warn('workerBlob not available, falling back to network URL');
    }
    const worker = new Worker(workerBlobUrl || workerUrl);
    const channel = new MessageChannel();
    worker.postMessage({id: `${id}:inner`, base: remap, logLevel: window['logLevel']}, [channel.port1]);
    return channel.port2;
  };
};

const _expandUrls = urlMap => {
  const remap = {};
  const {origin, pathname} = window.location;
  const transform = (path: string) => {
    // leading slash without a protocol is considered absolute
    if (path[0] === '/') {
      // reroute root in absolute path
      path = `${origin}${path}`;
    }
    // anything with '//' in it is assumed to be non-local (have a protocol)
    else if (path.indexOf('//') < 0) {
      // remap local path to absolute path
      path = `${origin}${pathname.split('/').slice(0, -1).join('/')}/${path}`;
    }
    return path;
  };

  Object.keys(urlMap).forEach(k => {
    const config = urlMap[k];
    remap[k] = typeof config === 'string'
        ? transform(config)
        : {...config, root: transform(config.root)};
  });
  return remap;
};

export {pecIndustry as PecIndustry};
