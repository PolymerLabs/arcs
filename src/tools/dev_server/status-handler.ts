/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Request, Response, NextFunction} from 'express';
import {ExplorerProxy} from './explorer-proxy.js';

/**
 * Handler to the '/status' path showing the state of the server.
 *
 * Very simple at the moment, will likely grow as we add features.
 */
export function status(proxy: ExplorerProxy) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.path !== '/status') {
      return next();
    }

    res.send(`<title>ALDS</title><p>Proxy Status:
        <p>Device: ${proxy.deviceConnected ? 'Connected' : 'Disconnected'}
        <p>Explorer: ${proxy.explorerConnected ? 'Connected' : 'Disconnected'}`);
  };
}
