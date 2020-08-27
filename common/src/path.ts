
/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

//const isString = s => (typeof s === 'string');
// a qualified url is an absolute path with `https` protocol
const isQualifiedUrl = (s: string) =>/^https?:\/\//.test(s);
//const isSchemaOrgUrl = (s: string) => /\/\/schema.org\//.test(s);
// absolute if path starts at root or contains a Window drive specifier
const isAbsolutePath = (s: string) => s && (s[0] === '/' || s[1] === ':');

export class Path {
  // concatenates `prefix` and `path`
  // - support only '/' delimiter
  // - removes filename from prefix (aka pure paths must end in /)
  // - collapses extra '/' and normalizes thrash (e.g. '/foo/..' becomes '/')
  //
  static join(prefix: string, path: string): string {
    if (isQualifiedUrl(path) || isAbsolutePath(path)) {
      return path;
    }
    path = this.normalizeDots(`${this.extractPath(prefix)}${path}`);
    return path;
  }
  // TODO(sjmiles): public because it's used in manifest.ts, can we simplify?
  // removes everything after the final slash
  static extractPath(fileName: string): string {
    return fileName ? fileName.replace(/[/][^/]+$/, '/') : '';
  }
  // convert `././foo/bar/../baz` to `./foo/baz`
  protected static normalizeDots(path: string): string {
    if (!path) {
      return '';
    }
    // only unix slashes
    path = path.replace(/\\/g, '/');
    // replace '/./' with '/'
    path = path.replace(/\/\.\//g, '/');
    // replace '<prefix><name>/..' with '<prefix>'
    const norm = (s: string) => s.replace(/[^./]+\/\.\.\//g, '');
    // keep removing `<name>/../` until there are no more
    for (let n = norm(path); n !== path; path = n, n = norm(path));
    // remove '//' except after `:`
    path = path.replace(/([^:])(\/\/)/g, '$1/');
    return path;
  }
  static url(root, path?) {
    console.log('Path', root, path);
    return (new URL(path || '', root));
  }
  // resolve(mapper, path: string) {
  //   let resolved: string = path;
  //   const macro = mapper.findUrlMapMacro(path);
  //   if (macro) {
  //     const config = mapper.urlMap[macro];
  //     if (isString(config)) {
  //       resolved = `${config}${path.slice(macro.length)}`;
  //     } else {
  //       resolved = mapper.resolveConfiguredPath(path, macro, config);
  //     }
  //   }
  //   return this.normalizeDots(resolved);
  // }
}
