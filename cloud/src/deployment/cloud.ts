/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {ContainerManager} from './containers';
import {DiskManager} from './disks';
import {GCPCloud} from './gcp/gcp';


/**
 * Top level interface representing a Cloud service provider capable
 * of provisioning storage and node deployments.
 */
export interface Cloud {
    containers():ContainerManager;
    disks():DiskManager;
}

/**
 * Offers implementations for various cloud providers, currently limited
 * to GCP.
 */
export class CloudManager {
    static forGCP():Cloud {
        return new GCPCloud();
    }
}
