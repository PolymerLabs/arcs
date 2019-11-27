/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Cloud} from '../cloud.ts';
import {ContainerManager} from '../containers.ts';
import {DiskManager} from '../disks.ts';
import {K18sContainerManager} from '../k18s/manager.ts';

import {GCPDiskManager} from './gcpdisk.ts';

/**
 * Implementation of Cloud interface for GCP.
 */
export class GCPCloud implements Cloud {
    containers(): ContainerManager {
        return new K18sContainerManager();
    }

    disks(): DiskManager {
        return new GCPDiskManager();
    }

}
