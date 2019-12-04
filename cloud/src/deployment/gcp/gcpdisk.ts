/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import common from '@google-cloud/common';
import Compute from '@google-cloud/compute';

import {CloudManager} from '../cloud';
import {Disk, DiskManager} from '../disks';
import {ARCS_NODE_LABEL, arcsKeyFor, waitForGcp} from '../utils';

import {GCE_PERSISTENT_DISK_TYPE, GCP_ZONE} from './gcp-constants';

/**
 * Represents disk storage provisioned on a cloud provider.
 */
class GCPDisk implements Disk {

  diskApi: Compute.Disk;
  private computeApi: Compute;

  constructor(compute: Compute, diskApi: Compute.Disk) {
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

  async dismount(): Promise<boolean> {
    const zone = this.computeApi.zone(GCP_ZONE);

    try {
      const [vms] = await zone.getVMs();

      if (vms !== undefined) {
        for (const vm of vms) {
          if (vm.metadata.metadata.items.find(x => x.key === ARCS_NODE_LABEL) !== undefined) {
            console.log('Trying to detach ' + vm.metadata.name + ' from ' + this.diskApi.name);
            const [operation, apiResponse] = await vm.detachDisk(this.diskApi);
            if (operation.warnings) {
              console.log('Warnings: ' + operation.warnings.join('\n'));
            }
            return Promise.resolve(!apiResponse['httpErrorStatusCode'] || apiResponse['httpErrorStatusCode'] !== 200);
          }
        }
      }
      return Promise.reject(new Error('Can\'t find arcs-node VM'));
    } catch (e) {
      console.log('Error trying to dismount disk');
      return Promise.reject(e);
    }
  }

  async mount(rewrappedKey: string, node: string): Promise<boolean> {
    const zone = this.computeApi.zone(GCP_ZONE);

    try {
      const [vms] = await zone.getVMs();

      if (vms !== undefined) {
        for (const vm of vms) {
          if (vm.metadata.name === node) {
            const [operation, apiResponse] = await vm.attachDisk(this.diskApi, {
              'diskEncryptionKey': {
                'rsaEncryptedKey': rewrappedKey
              }
            });
            if (operation.warnings) {
              console.log('Warnings: ' + operation.warnings.join('\n'));
            }

            return Promise.resolve(!apiResponse['httpErrorStatusCode'] || apiResponse['httpErrorStatusCode'] !== 200);
          }
        }
      }
      return Promise.reject(new Error('Can\'t find VM ' + node));
    } catch (e) {
      console.log('Error trying to mount disk');
      return Promise.reject(e);
    }
  }

  async delete(): Promise<void> {
    return CloudManager.forGCP().disks().delete(this);
  }

  id(): string {
    return this.diskApi.name;
  }

  type(): string {
    return GCE_PERSISTENT_DISK_TYPE;
  }

  async wrappedKeyFor(fingerprint:string): Promise<string> {
    return Promise.resolve(JSON.parse(this.diskApi.metadata.description)[arcsKeyFor(fingerprint)]);
  }
}

class BetaCompute extends Compute {
  private packageJson: {} = {};
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

export const DEFAULT_GCP_DISK_SIZE = '10';

/**
 * Allows the provisioning of encrypted disk storage in a
 * cloud provider.
 */
export class GCPDiskManager implements DiskManager {
  async create(fingerprint: string, wrappedKey: string, rewrappedKey: string): Promise<Disk> {

    const arcskey = arcsKeyFor(fingerprint);
    const config = {
      'type': 'projects/arcs-project/zones/us-central1-a/diskTypes/pd-standard',
      'sizeGb': DEFAULT_GCP_DISK_SIZE,
      'name': arcskey,
      'diskEncryptionKey': {
        'rsaEncryptedKey': rewrappedKey
      },
      'description': {
      },
      'labels': {
      }
    };

    config['labels'][arcskey] = true;
    const keyDesc: {[index: string]: string} = {};
    keyDesc[arcskey] = wrappedKey;
    config['description']=JSON.stringify(keyDesc);
    console.log('putting description '+ console.dir(keyDesc) + '\n as ' + JSON.stringify(keyDesc));
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

  async delete(disk: Disk): Promise<void> {
    // TODO: this is a pretty dangerous, irreversible operation, leave unimplemented for now.
    console.log('Operation not implemented, can\'t delete disks.');
    return Promise.resolve();
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

