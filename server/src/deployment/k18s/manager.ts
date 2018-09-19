/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Container, ContainerManager} from "../containers";
import {Disk} from "../disks";

import {
  Core_v1Api,
  KubeConfig,
  V1Container,
  V1ContainerPort,
  V1EnvVar,
  V1GCEPersistentDiskVolumeSource,
  V1ObjectMeta,
  V1PersistentVolume,
  V1PersistentVolumeSpec,
  V1Pod,
  V1PodSpec,
  V1Service,
  V1ServicePort,
  V1ServiceSpec,
  V1Volume,
  V1VolumeMount
} from "@kubernetes/client-node";
import {ON_DISK_DB} from "../utils";

const CONTAINER_PORT = 8080;
const EXTERNAL_PORT = 80;

/**
 * An implementation of the Container interface that uses Kubernetes for
 * orchestration of deployed VMs.
 */
class K18sPod implements Container {
  private v1Pod: V1Pod;
  private v1Service: V1Service;

  constructor(v1Pod: V1Pod, v1Service: V1Service) {
    this.v1Pod = v1Pod;
    this.v1Service = v1Service;
  }

  url(): string {
    // TODO: hacky, we should use JSON
    if (this.v1Service.status && this.v1Service.status.loadBalancer &&
      this.v1Service.status.loadBalancer.ingress && this.v1Service.status.loadBalancer.ingress.length) {
      const ingress = this.v1Service.status.loadBalancer.ingress[0];
      // TODO: this needs to be HTTPS, which requires an Ingress server + DNS + TLS cert to be configured
      return 'http://' + ingress.ip + ':' + this.v1Service.spec.ports[0].port;
    } else {
      return 'pending';
    }
  }

  disk(): PromiseLike<Disk> {
    return Promise.reject("not yet implemented");
  }

}

export class K18sContainerManager implements ContainerManager {

  k8sApi: Core_v1Api;

  constructor() {
    const kc = new KubeConfig();
    kc.loadFromDefault();
    this.k8sApi = kc.makeApiClient(Core_v1Api);
  }

  async deploy(fingerprint: string, encryptedDisk: Disk): Promise<Container> {
    if (encryptedDisk.type() !== 'gcePersistentDisk') {
      return Promise.reject(new Error('Cant use non-GCE disk on K8s yet'));
    }

    try {
      /**
       * We need to do 3 things:
       * 1. Create a Kubernetes PersistentVolume that references an already existing disk
       * (https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
       *
       * 2. Create a Pod that mounts this Persistent Volume and deploys our docker image
       *
       * 3. A Kubernetes Service which acts as an Ingress so that our Pod is visible to the
       * external world with an external IP address.
       *
       * TODO: rather than give each Pod their own external IP, we can create an Ingress object
       * that does virtual hosting. We use a single external load balancer IP, and map
       * /<user key fingerprint/pathInfo to each deployed pod. So Container addresses returned to client
       * will be https://<load balancer ip>:443/<base64 user key/<action, e.g. pouchdb>.
       *
       * TODO: use lets-encrypt to provision a cert and deploy it as a Kubernetes secret
       * TODO: need some kind of cloud-dns setup script so SSL cert has a domain name
       */
      const {body: createdPersistentVolume} = await this.requestNewPersistentVolume(encryptedDisk);
      console.log("Created new persistent volume " + createdPersistentVolume.metadata.name);
      const {body: createdPod} = await this.requestCreatePod(encryptedDisk, fingerprint);
      console.log("Created new pod " + createdPod.metadata.name);
      const {body: createdService} = await this.requestCreateService(fingerprint, createdPod);
      console.log("Created new service " + createdService.metadata.name);
      return Promise.resolve(new K18sPod(createdPod, createdService));
    } catch (e) {
      return Promise.reject(e);
    }
  }

  private async requestCreateService(fingerprint: string, pod: V1Pod) {
    // TODO: consider using NodePort + Ingress
    const service = new V1Service();
    service.apiVersion = 'v1';
    service.kind = 'Service';
    service.spec = new V1ServiceSpec();
    service.metadata = new V1ObjectMeta();
    service.metadata.name = 'svc-' + fingerprint;
    service.spec.selector = {};
    service.spec.selector['app'] = pod.metadata.name;
    service.spec.type = 'LoadBalancer';

    const v1ServicePort = new V1ServicePort();
    v1ServicePort.port = EXTERNAL_PORT;
    v1ServicePort.targetPort = CONTAINER_PORT;

    service.spec.ports = [v1ServicePort];

    return this.k8sApi.createNamespacedService('default', service);
  }

  private async requestCreatePod(encryptedDisk: Disk, fingerprint: string) {
    const volumeName = encryptedDisk.id();
    const gceVolume = this.createGCEVolume(volumeName, encryptedDisk);
    const container = this.createContainer(fingerprint, volumeName);

    const v1Pod = new V1Pod();
    v1Pod.kind = 'Pod';
    v1Pod.apiVersion = 'v1';
    v1Pod.spec = new V1PodSpec();
    v1Pod.spec.volumes = [gceVolume];
    v1Pod.spec.containers = [container];
    v1Pod.metadata = new V1ObjectMeta();
    v1Pod.metadata.name = 'pod-' + fingerprint;
    v1Pod.metadata.labels = {};
    v1Pod.metadata.labels['app'] = v1Pod.metadata.name;

    return this.k8sApi.createNamespacedPod('default', v1Pod);
  }

  private createContainer(fingerprint: string, volumeName) {
    const container = new V1Container();
    // TODO: use SHA-1/commit hash based tagging?
    container.image = 'gcr.io/arcs-project/deployment:latest';
    container.name = 'container-image-' + fingerprint;
    const volumeMount = this.createVolumeMount(volumeName);
    container.volumeMounts = [volumeMount];
    const targetDiskEnv = new V1EnvVar();
    targetDiskEnv.name = ON_DISK_DB;
    targetDiskEnv.value = "true";
    container.env = [targetDiskEnv];
    const v1ContainerPort = new V1ContainerPort();
    v1ContainerPort.containerPort = CONTAINER_PORT;
    container.ports = [v1ContainerPort];
    return container;
  }

  private createVolumeMount(volumeName) {
    const volumeMount = new V1VolumeMount();
    volumeMount.name = volumeName;
    volumeMount.mountPath = '/personalcloud';
    return volumeMount;
  }

  /**
   * Create a reference to an existing GCE disk.
   * @param volumeName the name of the volume
   * @param encryptedDisk the existing disk already created by GCE
   */
  private createGCEVolume(volumeName, encryptedDisk: Disk) {
    const gceVolume = new V1Volume();
    gceVolume.name = volumeName;
    gceVolume.gcePersistentDisk = new V1GCEPersistentDiskVolumeSource();
    gceVolume.gcePersistentDisk.fsType = 'ext4';
    gceVolume.gcePersistentDisk.pdName = encryptedDisk.id();
    return gceVolume;
  }

  /**
   * Creates a new Kubernetes 'PersistentVolume' object.
   * @param k8sApi kubernetes API
   * @param encryptedDisk the GCE disk to use
   */
  private async requestNewPersistentVolume(encryptedDisk: Disk) {
    const newPersistentVolume = new V1PersistentVolume();
    newPersistentVolume.metadata = new V1ObjectMeta();
    newPersistentVolume.metadata.name = 'pv-' + encryptedDisk.id();
    newPersistentVolume.apiVersion = 'v1';
    newPersistentVolume.kind = 'PersistentVolume';
    newPersistentVolume.spec = this.makePersistentVolumeSpec(encryptedDisk);
    return this.k8sApi.createPersistentVolume(newPersistentVolume);
  }

  private makePersistentVolumeSpec(encryptedDisk: Disk) {
    const spec = new V1PersistentVolumeSpec();
    spec.accessModes = ["ReadWriteOnce"];
    spec.capacity = {storage: '10Gi'};
    spec.gcePersistentDisk = new V1GCEPersistentDiskVolumeSource();
    spec.gcePersistentDisk.fsType = 'ext4';
    spec.gcePersistentDisk.pdName = encryptedDisk.id();
    return spec;
  }

  async find(fingerprint: string): Promise<Container | null> {
    const kc = new KubeConfig();
    kc.loadFromDefault();

    const k8sApi = kc.makeApiClient(Core_v1Api);
    const {response, body} = await k8sApi.listNamespacedPod('default', undefined,
      undefined, undefined,
      true, undefined);

    const podList = body.items;
    if (podList.length > 0) {

      const {response, body} = await k8sApi.listNamespacedService('default', undefined,
        undefined, "metadata.name=svc-"+fingerprint, true, undefined);
      if (body.items.length > 0) {
        return Promise.resolve(new K18sPod(podList[0], body.items[0]));
      }
    }
    return Promise.resolve(null);
  }
}

