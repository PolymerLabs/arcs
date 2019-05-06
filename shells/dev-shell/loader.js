import {PlatformLoader} from '../../../build/platform/loader-web.js';

export class DevShellLoader extends PlatformLoader {
  constructor(fileMap) {
    super({
      'https://$arcs/': '../../',
      'https://$particles/': '../../particles/',
      'https://$build/': '../../shells/lib/build/' // for worker.js
    });
    super.flushCaches();
    this._fileMap = fileMap;
  }

  loadResource(path) {
    return this._fileMap[path] || super.loadResource(path);
  }

  path(fileName) {
    return this._fileMap[fileName] ? fileName : super.path(fileName);
  }

  clone() {
    return new DevShellLoader(this._fileMap, this._urlMap);
  }
}
