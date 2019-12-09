/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Stores} from './stores.js';
import {logsFactory} from '../../build/platform/logs-factory.js';
import {EntityType} from '../../build/runtime/type.js';

const {log} = logsFactory('Shares', '#999900');

const preallocate = {
  userName: 'UserNameShare',
  avatar: 'AvatarShare',
  arcs: 'ArcMetaShare'
};

export const initShares = context => {
  Object.keys(preallocate).forEach(name => {
    const shareTypeName = preallocate[name];
    const schema = context.findSchemaByName(shareTypeName);
    if (!schema) {
      log(`found no schema called [${shareTypeName}]`);
    } else {
      log(`creating share-stores for tag [${name}]`);
      createShare(context, `BOXED_${name}`, schema);
      createShare(context, `PROFILE_${name}`, schema);
      createShare(context, `FRIEND_${name}`, schema);
    }
  });
};

const createShare = async (context, name, schema) => {
  const type = (new EntityType(schema)).collectionOf();
  await Stores.requireStore(context, type, {
    name,
    id: name,
    tags: [`share`],
    storageKey: null
  });
};
