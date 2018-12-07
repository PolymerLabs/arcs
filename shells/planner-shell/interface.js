// @license
// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

/**
 * External interface into remote planning to allow for clean
 * separation/isolation.
 */

import {Env} from '../env/node/env.js';
// import {UserContext} from './shell/user-context.js';
// import {ArcFactory} from './arc-factory.js';
// import {DevtoolsConnection} from '../../../runtime/ts-build/debug/devtools-connection.js';
import {RamSlotComposer} from '../lib/ram-slot-composer.js';
import {UserArcs} from '../lib/user-arcs.js';
import {UserPlanner} from '../lib/user-planner.js';
import {Const} from '../configuration/constants.js';

export class ShellPlanningInterface {
  /**
   * Starts a continuous shell planning import.
   *
   * @param assetsPath a path (relative or absolute) to locate planning assets.
   * @param userid the User Id to do planning for.
   * @param storageKeyBase Plans will be stored in a key that begins with this prefix.
   *   If not specified use a key based on the Launcher Arc.
   */
  static async start(assetsPath, storage, userid, debug) {
    if (!assetsPath || !userid || !storage) {
      throw new Error('assetsPath, userid, and storage required');
    }
    // create an arcs environment
    const env = new Env(assetsPath);
    env.pathMap[`https://$artifacts/`] = `../../particles/`;

    // create a composer configured for node
    const composer = new RamSlotComposer();

    // TODO(sjmiles): should be elsewhere
    // if (process.argv.includes('--explore')) {
    //   console.log('Waiting for Arcs Explorer');
    //   DevtoolsConnection.ensure();
    //   await DevtoolsConnection.onceConnected;
    // }

    // initialize context
    const context = await env.parse(`import '${ShellPlanningInterface.DEFAULT_MANIFEST}'`);

    // const factory = new ArcFactory(assetsPath);
    // const context = await factory.createContext(ShellPlanningInterface.DEFAULT_MANIFEST);
    // const user = new UserContext();
    // user._setProps({userid, context});
    // const planner = new UserPlanner(factory, context, userid, storageKeyBase, debug);

    const userPlanner = new UserPlanner(env, userid, context, storage, composer);
    // conduit for arcKeys between userArcs and userPlanner
    const arcsInfoHandler = info => userPlanner.arcChanged(info);
    const userArcs = new UserArcs(env, storage, userid, arcsInfoHandler);
  }
}

// These are sample users for testing.
ShellPlanningInterface.DEFAULT_USER_ID = Const.defaultUserId;
ShellPlanningInterface.DEFAULT_STORAGE = Const.defaultStorageKey;
ShellPlanningInterface.DEFAULT_MANIFEST = Const.defaultManifest;
