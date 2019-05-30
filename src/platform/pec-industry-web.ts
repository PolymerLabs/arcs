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

let workerUrl;
let workerBlobUrl;

const pecIndustry = loader => {
  // worker paths are relative to worker location, remap urls from there to here
  const remap = _expandUrls(loader._urlMap);
  // get real path from meta path
  const workerUrl = loader._resolve(WORKER_PATH);
  // provision (cached) Blob url (async)
  let workerBlobUrl;
  loader.provisionObjectUrl(workerUrl).then((url: string) => workerBlobUrl = url);
  return id => {
    if (!workerBlobUrl) {
      console.warn('wokerBlob not available, falling back to network URL');
    }
    const worker = new Worker(workerBlobUrl || workerUrl);
    const channel = new MessageChannel();
    worker.postMessage({id: `${id}:inner`, base: remap}, [channel.port1]);
    return channel.port2;
  };
};

const provisionWorkersUrls = loader => {
  workerUrl = loader._resolve(WORKER_PATH);
  loader.provisionObjectUrl(workerUrl).then((url: string) => workerBlobUrl = url);
};

const _expandUrls = urlMap => {
  const remap = {};
  const {origin, pathname} = location;
  Object.keys(urlMap).forEach(k => {
    let path = urlMap[k];
    if (path[0] === '/') {
      path = `${origin}${path}`;
    }
    else if (path.indexOf('//') < 0) {
      path = `${origin}${pathname.split('/').slice(0, -1).join('/')}/${path}`;
    }
    remap[k] = path;
  });
  return remap;
};

export {pecIndustry as PecIndustry};
