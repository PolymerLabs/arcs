/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Disk, DiskManager} from "../disks";
import Compute from '@google-cloud/compute';

import {arcsKeyFor} from "../utils";


/**
 * Represents disk storage provisioned on a cloud provider.
 */
class GCPDisk implements Disk {

  diskApi: Compute.Disk;

  constructor(diskApi) {
    this.diskApi = diskApi;
  }

  isAttached(): boolean {
    return false;
  }

  mount(rewrappedKey: string): boolean {
    return false;
  }

  id(): string {
    return this.diskApi.name;
  }

  type(): string {
    return 'gcePersistentDisk';
  }
}

/**
 * Allows the provisioning of encrypted disk storage in a
 * cloud provider.
 */
export class GCPDiskManager implements DiskManager {
  async create(wrappedKey: string, rewrappedKey: string): Promise<Disk> {

    const arcskey = arcsKeyFor(wrappedKey);

    const config = {
      sizeGb: 10,
      name: arcskey,
      "diskEncryptionKey": {
        "rsaEncryptedKey": rewrappedKey
      },
      labels: {}
    };

    config[arcskey] = true;

    try {
      const compute = new Compute();
      const zone = compute.zone('us-central1-a');
      const [disk, operation, resp] = await zone.createDisk(arcskey, config);
      return Promise.resolve(new GCPDisk(disk));

    } catch (e) {
      return Promise.reject(e);
    }
  }

  async find(fingerprint: string): Promise<Disk | null> {
    const compute = new Compute();
    const zone = compute.zone('us-central1-a');

    const [disks, nextQuery, apiResponse] = await zone.getDisks({autoPaginate: false});
    for (const disk of disks) {
      const metadata = await disk.getMetadata().then(data => data[0]);
      if (metadata['labels'] && metadata['labels'][arcsKeyFor(fingerprint)] === true ||
        disk.name === arcsKeyFor(fingerprint)) {
        return Promise.resolve(new GCPDisk(disk));
      }
    }
    return Promise.resolve(null);
  }
}

