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


import common from "@google-cloud/common";
import {Container} from "../containers";

/**
 * Represents disk storage provisioned on a cloud provider.
 */
class GCPDisk implements Disk {

  diskApi: Compute.Disk;
  private computeApi: Compute;

  constructor(compute: Compute, diskApi) {
    this.computeApi = compute;
    this.diskApi = diskApi;
  }

  async isAttached(): Promise<boolean> {
    const [metadata, resp] = await this.diskApi.getMetadata();
    if (metadata['users'] && metadata['users'].length) {
      return true;
    }
    return false;
  }

  async mount(rewrappedKey: string): Promise<boolean> {
    // TODO: assert can only be mounted to one node at a time
    const zone = this.computeApi.zone('us-central1-a');

    try {
      const [vms] = await zone.getVMs();

      if (vms !== undefined) {
        for (const vm of vms) {
          if (vm.metadata.metadata.items.find(x => x.key === 'arcs-node') !== undefined) {
            const [operation, apiResponse] = await vm.attachDisk(this.diskApi, {
              "diskEncryptionKey": {
                "rsaEncryptedKey": rewrappedKey
              }
            });
            return !apiResponse['httpErrorStatusCode'] || apiResponse['httpErrorStatusCode'] !== 200;
          }
        }
      }
      return Promise.reject(new Error("Can't find arcs-node VM"));
    } catch(e) {
      return Promise.reject(e);
    }
  }

  id(): string {
    return this.diskApi.name;
  }

  type(): string {
    return 'gcePersistentDisk';
  }

  wrappedKeyFor(fingerprint:string): Promise<string> {
    return Promise.resolve(this.diskApi['labels'][arcsKeyFor(fingerprint)]);
  }
}

class BetaCompute extends Compute {
  private packageJson: any;
  constructor(options?) {
    super(options);
    options = common.util.normalizeArguments(this, options);

    var config = {
      baseUrl: 'https://www.googleapis.com/compute/beta',
      scopes: ['https://www.googleapis.com/auth/compute'],
      packageJson: this.packageJson
    };

    // HACK: Reinitialize with beta API to pick up new baseURL
    common.Service.call(this, config, options);
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
      "type": "projects/arcs-project/zones/us-central1-a/diskTypes/pd-standard",
      "sizeGb": "10",
      "name": arcskey,
      "diskEncryptionKey": {
        "rsaEncryptedKey": rewrappedKey
      },
      "labels": {
      }
    };

    config['labels'][arcskey] = rewrappedKey;

    try {
      const compute:Compute = new BetaCompute();
      const zone = compute.zone('us-central1-a');
      const [disk, operation, resp] = await zone.createDisk(arcskey, config);
      return Promise.resolve(new GCPDisk(compute, disk));

    } catch (e) {
      return Promise.reject(e);
    }
  }

  async find(fingerprint: string): Promise<Disk | null> {
    const compute:Compute = new BetaCompute();
    const zone = compute.zone('us-central1-a');

    const [disks, nextQuery, apiResponse] = await zone.getDisks({autoPaginate: false});
    for (const disk of disks) {
      const metadata = await disk.getMetadata().then(data => data[0]);
      if (metadata['labels'] && metadata['labels'][arcsKeyFor(fingerprint)] === true ||
        disk.name === arcsKeyFor(fingerprint)) {
        return Promise.resolve(new GCPDisk(compute, disk));
      }
    }
    return Promise.resolve(null);
  }
}

