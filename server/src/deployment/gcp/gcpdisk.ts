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

import {ARCS_NODE_LABEL, arcsKeyFor, waitForGcp} from "../utils";


import common from "@google-cloud/common";
import {GCE_PERSISTENT_DISK_TYPE, GCP_ZONE} from "./gcp-constants";

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
    const [metadata] = await this.diskApi.getMetadata();
    if (metadata['users'] && metadata['users'].length) {
      return true;
    }
    return false;
  }

  async mount(rewrappedKey: string): Promise<boolean> {
    const zone = this.computeApi.zone(GCP_ZONE);

    try {
      const [vms] = await zone.getVMs();

      if (vms !== undefined) {
        for (const vm of vms) {
          if (vm.metadata.metadata.items.find(x => x.key === ARCS_NODE_LABEL) !== undefined) {
            const [operation, apiResponse] = await vm.attachDisk(this.diskApi, {
              "diskEncryptionKey": {
                "rsaEncryptedKey": rewrappedKey
              }
            });
            return Promise.resolve(!apiResponse['httpErrorStatusCode'] || apiResponse['httpErrorStatusCode'] !== 200);
          }
        }
      }
      return Promise.reject(new Error("Can't find arcs-node VM"));
    } catch(e) {
      console.log("Error trying to mount disk");
      return Promise.reject(e);
    }
  }

  id(): string {
    return this.diskApi.name;
  }

  type(): string {
    return GCE_PERSISTENT_DISK_TYPE;
  }

  wrappedKeyFor(fingerprint:string): Promise<string> {
    return Promise.resolve(this.diskApi['annotations'][arcsKeyFor(fingerprint)]);
  }
}

class BetaCompute extends Compute {
  private packageJson: {};
  constructor(options?) {
    super(options);
    options = common.util.normalizeArguments(this, options);

    const config = {
      baseUrl: 'https://www.googleapis.com/compute/beta',
      scopes: ['https://www.googleapis.com/auth/compute'],
      packageJson: this.packageJson
    };

    // HACK: Reinitialize with beta API to pick up new baseURL
    common.Service.call(this, config, options);
  }
}

export const DEFAULT_GCP_DISK_SIZE = "10";

/**
 * Allows the provisioning of encrypted disk storage in a
 * cloud provider.
 */
export class GCPDiskManager implements DiskManager {
  async create(wrappedKey: string, rewrappedKey: string): Promise<Disk> {

    const arcskey = arcsKeyFor(wrappedKey);
    const config = {
      "type": "projects/arcs-project/zones/us-central1-a/diskTypes/pd-standard",
      "sizeGb": DEFAULT_GCP_DISK_SIZE,
      "name": arcskey,
      "diskEncryptionKey": {
        "rsaEncryptedKey": rewrappedKey
      },
      "annotations": {
      },
      "labels": {
      }
    };

    config['labels'][arcskey] = true;
    config['annotations'][arcskey] = rewrappedKey;

    try {
      const compute:Compute = new BetaCompute();
      const zone = compute.zone(GCP_ZONE);
      const disk = await waitForGcp(() => zone.createDisk(arcskey, config),
        async (d:Compute.Disk) => {
          const [metadata] = await d.getMetadata();
          return Promise.resolve(metadata.status === 'READY');
        });
      return Promise.resolve(new GCPDisk(compute, disk));
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async find(fingerprint: string): Promise<Disk | null> {
    const compute:Compute = new BetaCompute();
    const zone = compute.zone(GCP_ZONE);

    const [disks] = await zone.getDisks({autoPaginate: false});
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

