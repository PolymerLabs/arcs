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
  const workerPath = loader._resolve(`https://$shell/lib/build/worker.js`);
  return () => new Worker(workerPath);
};

// const workerIndustry1 = loader => () => {
//   loader.loadResource(`https://$shell/lib/build/worker.js`)
//   // "Server response", used in all examples
//   const response = "self.onmessage=function(e){postMessage('Worker: '+e.data);}";
//   const blob = new Blob([response], {type: 'application/javascript'});
//   const worker = new Worker(URL.createObjectURL(blob));
// };
