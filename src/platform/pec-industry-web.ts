/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {PecFactory} from '../runtime/particle-execution-context.js';
import {Id, IdGenerator} from '../runtime/id.js';
import {workerPool} from '../runtime/worker-pool.js';

const WORKER_PATH = `https://$build/worker.js`;

export const pecIndustry = (loader): PecFactory => {
  // worker paths are relative to worker location, remap urls from there to here
  const remap = expandUrls(loader.urlMap);
  // get real path from meta path
  const workerUrl = loader.resolve(WORKER_PATH);
  const urlParams = new URLSearchParams(window.location.search);
  // use service worker cache instead of generating blobs
  const useCache = location.protocol === 'https:' && urlParams.has('use-cache');
  // get system tracing channel
  const systemTraceChannel = urlParams.get('systrace') || '';
  // provision (cached) Blob url (async, same workerBlobUrl is captured in both closures)
  let workerBlobUrl;
  if (!useCache) {
    loader.provisionObjectUrl(workerUrl).then((url: string) => workerBlobUrl = url);
  }
  // delegate worker and channel creation api to the worker pool factory
  workerPool.apis = {
    create: () => ({
      worker: new Worker(workerBlobUrl || workerUrl),
      channel: new MessageChannel(),
      usage: 0,
    })
  };
  // spawn workers ahead of time at runtime initialization
  // effective only when the use-worker-pool url parameter is supplied
  workerPool.shrinkOrGrow();
  // return a pecfactory
  const factory = (id: Id, idGenerator?: IdGenerator) => {
    if (!workerBlobUrl && !useCache) {
      console.warn('workerBlob not available, falling back to network URL');
    }
    const poolEntry = workerPool.resume();
    const worker =
        poolEntry ? poolEntry.worker : new Worker(workerBlobUrl || workerUrl);
    const channel =
        poolEntry ? poolEntry.channel : new MessageChannel();
    // Should emplace if the worker pool management is ON and
    // a new worker and its messaging channel are created.
    if (workerPool.active && !poolEntry) {
      workerPool.emplace(worker, channel);
    }
    worker.postMessage({
      id: `${id}:inner`,
      base: remap,
      logLevel: window['logLevel'],
      traceChannel: systemTraceChannel,
      inWorkerPool: workerPool.exist(channel.port2),
    }, [channel.port1]);
    // shrink or grow workers at run-time overlapping with new PEC execution
    // effective only when the use-worker-pool url parameter is supplied
    workerPool.shrinkOrGrow();
    return channel.port2;
  };
  // TODO(sjmiles): PecFactory type is defined against custom `MessageChannel` and `MessagePort` objects, not the
  // browser-standard objects used here. We need to clean this up, it's only working de facto.
  return factory as unknown as PecFactory;
};

const expandUrls = urlMap => {
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
