const WORKER_PATH = `https://$shell/lib/build/worker.js`;

export const PecIndustry = loader => {
  // worker paths are relative to worker location, remap urls from there to here
  const remap = _expandUrls(loader._urlMap);
  const workerFactory = workerIndustry(loader);
  return id => {
    const worker = workerFactory();
    const channel = new MessageChannel();
    worker.postMessage({id: `${id}:inner`, base: remap}, [channel.port1]);
    return channel.port2;
  };
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

const workerIndustry = loader => {
  // will eventually (asynchronously) set `provisionWorker.workerBlobUrl`
  provisionWorkerBlob(loader, WORKER_PATH);
  // default url
  const workerUrl = loader._resolve(WORKER_PATH);
  // return Worker factory that uses workerBlobUrl or workerUrl, depending on availability
  return () => new Worker(provisionWorkerBlob.url || workerUrl);
};

const provisionWorkerBlob = async (loader, path) => {
 const code = await loader.loadResource(path);
 provisionWorkerBlob.url = URL.createObjectURL(new Blob([code], {type: 'application/javascript'}));
};

