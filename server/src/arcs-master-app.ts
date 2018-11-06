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
import express from "express";
import cors from "cors";
import fetch from 'node-fetch';

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
    this.express.get('/find/:fingerprint', cors(), this.findDeployment.bind(this));
    this.express.get('/deploy/:fingerprint/:wrappedKey/:rewrappedKey', cors(), this.deploy.bind(this));
    this.express.get('/mount/:fingerprint/:rewrappedKey', cors(), this.deploy.bind(this));
    this.express.get('/lock/:fingerprint', cors(), this.lock.bind(this));
    this.express.get('/unlock/:fingerprint/:rewrappedKey', cors(), this.unlock.bind(this));

    this.express.use(express.static('public'));
  }

  /**
   * GCP doesn't allow uppercase, +,-, or = characters in labels, it also doesn't allow them to exceed 61 characters,
   * so we take a base64 fingerprint, remove illegal characters, and then shorten it to 32-characters.
   * @param str a base64 string, usually a fingerprint.
   */
  gcpSafeIdentifier(str) {
    return str.replace(/[ +\-=]/g, '').toLowerCase().substring(0, 32);
  }

  async lock(req, res, next) {
    console.log("fingerprint is " + req.params.fingerprint);
    const fingerprint = this.gcpSafeIdentifier(req.params.fingerprint);
    console.log("gcp safe fingerprint " + fingerprint);
    try {
      const cloud = CloudManager.forGCP();
      const disk = await cloud.disks().find(fingerprint);
      if (disk) {
        const attached = await disk.isAttached();

        if (attached) {
          const container: Container | null = await cloud.containers().find(fingerprint);
          if (container != null) {
            await fetch("http://" + container.url() + "/lock");
            disk.dismount();
            return;
          }

        }
      }
    } catch (e) {
      console.log(e);
    }
  }

  async unlock(req, res, next) {
    console.log("fingerprint is " + req.params.fingerprint);
    const fingerprint = this.gcpSafeIdentifier(req.params.fingerprint);
    console.log("gcp safe fingerprint " + fingerprint);
    try {
      const cloud = CloudManager.forGCP();
      const disk = await cloud.disks().find(fingerprint);
      if (disk) {
        const attached = await disk.isAttached();
        if (attached) {
          return;
        }
        const container: Container | null = await cloud.containers().find(fingerprint);
        if (container != null) {
          await disk.mount(req.params.rewrappedKey, await container.node());
          await fetch("http://" + container.url() + "/unlock");
          return;
        } else {
          // TODO: if container not found, deploy a new one?
        }
      }
    } catch (e) {
      console.log(e);
    }
  }

  async findDeployment(req, res, next) {
    console.log("fingerprint is " + req.params.fingerprint);
    const fingerprint = this.gcpSafeIdentifier(req.params.fingerprint);
    console.log("gcp safe fingerprint " + fingerprint);
    try {
      const cloud = CloudManager.forGCP();
      const disk = await cloud.disks().find(fingerprint);

      if (!disk) {
        res.send('{"id": "' + fingerprint + '", "status": "disk not found"}');
        return;
      }

      const attached = await disk.isAttached();
      const wrappedKey = await disk.wrappedKeyFor(fingerprint);

      if (!attached) {
        res.send('{"id": "' + fingerprint + '", "status": "detached", "key": "' + wrappedKey + '"}');
        return;
      }

      const container: Container | null = await cloud.containers().find(fingerprint);

      if (container == null) {
        res.send('{"id": "' + fingerprint + '", "status": "container not found"}');
        return;
      }

      const status = container.status();
      if (status !== 'Running') {
        res.send('{"id": "' + fingerprint + '", "status": "pending"}');
      } else {
        res.send('{"id": "' + fingerprint + '", "status": "attached", "url" : "' + container.url() + '"}');
      }
    } catch (e) {
      console.log(e);
    }
  }

  async deploy(req, res, next) {
    const fingerprint = this.gcpSafeIdentifier(req.params.fingerprint);
    const wrappedKey = req.params.wrappedKey;
    const rewrappedKey = req.params.rewrappedKey;


    try {
      const cloud = CloudManager.forGCP();
      const disk = await cloud.disks().create(fingerprint, wrappedKey, rewrappedKey);
      console.log("Disk successfully created with id " + disk.id());
      const container = await cloud.containers().deploy(fingerprint, rewrappedKey, disk).catch(async (e) => {
        console.log("Error deploying new container with new disk, deleting disk with id " + disk.id());
        await disk.delete();
      });
      console.log("Container successfully created with fingerprint " + fingerprint);
      res.send('{"status": "pending", "id": "' + fingerprint + '", "statusUrl": "/find/' + fingerprint + '"}');
    } catch (e) {
      console.log("Error");
      console.dir(e);
      res.send("Can't deploy because " + JSON.stringify(e));
    }
  }

  async mount(req, res, next) {
    const fingerprint = this.gcpSafeIdentifier(req.params.fingerprint);
    const rewrappedKey = req.params.rewrappedKey;
    try {
      const cloud = CloudManager.forGCP();
      const disk = await cloud.disks().find(fingerprint);
      if (disk && !await disk.isAttached()) {
        const container = await cloud.containers().deploy(fingerprint, rewrappedKey, disk);
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
