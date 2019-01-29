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

// generate platform specific environment
import './config.js';

// platform agnostic code
import {Utils} from '../lib/utils.js';
import {ArcHost} from '../lib/arc-host.js';
import {RamSlotComposer} from '../lib/ram-slot-composer.js';
import {UserArcs} from '../lib/user-arcs.js';
import {UserContext} from '../lib/user-context.js';
import {UserPlanner} from '../lib/user-planner.js';
import {Const} from '../configuration/constants.js';
import {DevtoolsConnection} from '../../build/runtime/debug/devtools-connection.js';

const contextManifest = `
  import 'https://$particles/canonical.manifest'
  import 'https://$particles/Profile/Sharing.recipe'
`;

const rootContainer = {
  root: 'root-context',
  toproot: 'toproot-context',
  modal: 'modal-context'
};

export class PlannerShellInterface {
  /**
   * Starts a continuous shell planning import.
   *
   * @param assetsPath a path (relative or absolute) to locate planning assets.
   * @param userid the User Id to do planning for.
   * @param storageKeyBase Plans will be stored in a key that begins with this prefix.
   *   If not specified use a key based on the Launcher Arc.
   */
  static async start(assetsPath, storage, userid, options) {
    if (!assetsPath || !userid || !storage) {
      throw new Error('assetsPath, userid, and storage required');
    }
    // connect to DevTools if running with --explore
    await maybeConnectToDevTools();
    // create an arcs environment
    Utils.init(assetsPath);
    // observe user's arc list
    const userArcs = new UserArcs(storage, userid);
    // base context (particles & recipes) from static manifest
    const context = await Utils.parse(contextManifest);
    // userContext continually updates context based on user's arcs
    const userContext = new UserContext();
    // wait for context to spin up
    await userContext.init(storage, userid, context);
    // subscribe context to changes in user arcs
    userArcs.subscribe(change => userContext.onArc(change));
    // wait for context to bloom before planning
    let userPlanner;
    setTimeout(() => {
      // visualize context
      visualizeContext(context);
      // define a host factory
      const hostFactory = () => {
        const composer = new RamSlotComposer({rootContainer});
        const host = new ArcHost(context, storage, composer);
        return host;
      };
      // instantiate planner
      userPlanner = new UserPlanner(userid, hostFactory, options);
      // subscribe planner to changes in user arcs
      userArcs.subscribe(change => userPlanner.onArc(change));
    }, 4000);
  }
}

// These are sample users for testing.
PlannerShellInterface.DEFAULT_USER_ID = Const.defaultUserId;
PlannerShellInterface.DEFAULT_STORAGE = Const.defaultStorageKey;
PlannerShellInterface.DEFAULT_MANIFEST = Const.defaultManifest;

const visualizeContext = context => {
  console.log('== context ===========================');
  console.log('recipes:');
  console.log(context.allRecipes.map(recipe => recipe._name));
  console.log('stores:');
  console.log(context.allStores.map(store => store.name));
  console.log('======================================');
};

const maybeConnectToDevTools = async () => {
  if (process.argv.includes('--explore')) {
    console.log('Waiting for Arcs Explorer');
    DevtoolsConnection.ensure();
    await DevtoolsConnection.onceConnected;
  }
};
