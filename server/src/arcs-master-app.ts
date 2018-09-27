// @license
// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {AppBase} from "./app";
import {Cloud, CloudManager} from "./deployment/cloud";
import {Container} from "./deployment/containers";

/**
 * A server for managing a collection of pouchdbapp VMs, including creating and deploying new ones,
 * locating existing deployments, and shutting down existing deployments.
 */
class ArcsMasterApp extends AppBase {

  constructor() {
    super();
  }

  protected addRoutes() {
    super.addRoutes();
    this.express.get('/:fingerprint', this.findDeployment.bind(this));
    this.express.get('/deploy/:fingerprint/:wrappedkey', this.deploy.bind(this));
    this.express.get('/mount/:fingerprint/:wrappedkey', this.deploy.bind(this));

  }

  /**
   * GCP doesn't allow uppercase, +,-, or = characters in labels, it also doesn't allow them to exceed 61 characters,
   * so we take a base64 fingerprint, remove illegal characters, and then shorten it to 32-characters.
   * @param str a base64 string, usually a fingerprint.
   */
  gcpSafeIdentifier(str) {
    return str.replace(/[ +-=]/g, '').toLowerCase().substring(0, 32);
  }

  async findDeployment(req, res, next) {
    const fingerprint = this.gcpSafeIdentifier(req.params.fingerprint);

    try {
      const cloud = CloudManager.forGCP();
      const disk = await cloud.disks().find(fingerprint);
      if (disk) {
        const attached = await disk.isAttached();
        const wrappedKey  = await disk.wrappedKeyFor(fingerprint);

        if (attached) {
          const container: Container | null = await cloud.containers().find(fingerprint);
          if (container != null) {
            const url = container.url();
            if (url === 'pending') {
              res.send('{"id": "' + fingerprint + '", "status": "pending"}');
            } else {
              res.send('{"id": "' + fingerprint + '", "status": "attached", "url" : "' + url + '"}');
            }
            return;
          }
          res.send('{"id": "' + fingerprint + '", "status": "container not found"}');
          return;
        } else {
          res.send('{"id": "' + fingerprint + '", "status": "detached", "key": "' + wrappedKey + '"}');
          return;
        }
      } else {
        res.send('{"id": "' + fingerprint + '", "status": "disk not found"}');
        return;
      }
    } catch (e) {
      console.log(e);
    }
  }

  async deploy(req, res, next) {
    const fingerprint = this.gcpSafeIdentifier(req.params.fingerprint);
    const wrappedkey = req.params.wrappedkey;
    try {
      const cloud = CloudManager.forGCP();
      const disk = await cloud.disks().create(fingerprint, wrappedkey);
      console.log("Disk successfully created with id " + disk.id());
      const container = await cloud.containers().deploy(fingerprint, wrappedkey, disk);
      console.log("Container successfully created with fingerprint " + fingerprint);
      res.send('{"status": "pending", "id": "' + fingerprint + '", "statusUrl": "/' + fingerprint + '"}');
    } catch (e) {
      console.log("Error");
      console.dir(e);
      res.send("Can't deploy because " + JSON.stringify(e));
    }
  }

  async mount(req, res, next) {
    const fingerprint = this.gcpSafeIdentifier(req.params.fingerprint);
    const wrappedkey = req.params.wrappedkey;
    try {
      const cloud = CloudManager.forGCP();
      const disk = await cloud.disks().create(fingerprint, wrappedkey);
      if (disk && !await disk.isAttached()) {
        const container = await cloud.containers().deploy(fingerprint, wrappedkey, disk);
        console.log("Disk successfully mounted with id " + disk.id());
        console.log("Container successfully created with fingerprint " + fingerprint);
        res.send('{"status": "pending", "id": "' + fingerprint + '", "statusUrl": "/' + fingerprint + '"}');
      }
    } catch (e) {
      res.send("Can't deploy because " + JSON.stringify(e));
    }
  }
}

export const app = new ArcsMasterApp().express;
