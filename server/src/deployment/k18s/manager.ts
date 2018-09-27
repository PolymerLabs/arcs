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
  Extensions_v1beta1Api,
  KubeConfig,
  V1beta1HTTPIngressPath,
  V1beta1HTTPIngressRuleValue,
  V1beta1Ingress,
  V1beta1IngressBackend,
  V1beta1IngressRule,
  V1beta1IngressSpec,
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

import {ARCS_NODE_LABEL, arcsKeyFor, DISK_MOUNT_PATH, ON_DISK_DB, VM_URL_PREFIX} from "../utils";
import {
  ARCS_DOCKER_IMAGE,
  ARCS_INGRESS_PREFIX,
  ARCS_MASTER_INGRESS,
  CONTAINER_PORT,
  EXTERNAL_PORT,
  K18S_NAMESPACE
} from "./k18s-constants";
import {GCE_PERSISTENT_DISK_TYPE} from "../gcp/gcp-constants";
import {DEFAULT_GCP_DISK_SIZE} from "../gcp/gcpdisk";

/**
 * An implementation of the Container interface that uses Kubernetes for
 * orchestration of deployed VMs.
 */
class K18sPod implements Container {
  private v1Pod: V1Pod;
  private v1Service: V1Service;
  private k8sApi: Core_v1Api;
  private ingress: V1beta1Ingress;

  constructor(k8sApi: Core_v1Api, v1Pod: V1Pod, v1Service: V1Service, ingress: V1beta1Ingress) {
    this.k8sApi = k8sApi;
    this.v1Pod = v1Pod;
    this.v1Service = v1Service;
    this.ingress = ingress;
  }

  url(): string {
      return 'https://' + this.ingress.spec.rules[0].host + '/' + this.v1Service.metadata.name;
  }

  disk(): PromiseLike<Disk> {
    return Promise.reject("not yet implemented");
  }

  async node(): Promise<string> {
    const {body:v1Pod} = await this.k8sApi.readNamespacedPod(this.v1Pod.metadata.name, K18S_NAMESPACE,
      undefined, false,false);
    return v1Pod.spec.nodeName;
  }
}

export class K18sContainerManager implements ContainerManager {

  k8sApi: Core_v1Api;
  k8sBetaApi: Extensions_v1beta1Api;

  constructor() {
    const kc = new KubeConfig();
    kc.loadFromDefault();
    this.k8sApi = kc.makeApiClient(Core_v1Api);
    this.k8sBetaApi = kc.makeApiClient(Extensions_v1beta1Api);
  }

  async deploy(fingerprint: string, rewrappedKey: string, encryptedDisk: Disk): Promise<Container> {
    if (encryptedDisk.type() !== GCE_PERSISTENT_DISK_TYPE) {
      return Promise.reject(new Error('Cant use non-GCE disk on K8s yet'));
    }

    // TODO: we should probably check to see if a container already exists with this id and is stuck
    // waiting for an unmounted disk, or doesn't exist. We can delete and restart it in that case.
    try {
      /**
       * We need to do 5 things:
       * 1. Attach a GCE disk to specific GCE node
       * 2. Create a Kubernetes PersistentVolume that references an already existing disk
       * (https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
       *
       * 3. Create a Pod that mounts this Persistent Volume and deploys our docker image to this specific node
       *
       * 4. A Kubernetes Service which exposes our Pod is visible to the Ingress
       *
       * 5. Update Ingress to map /cloud/fingerprint -> Service so the external world can find out service
       */
      const mounted = await encryptedDisk.mount(rewrappedKey);
      console.log("Disk mounted " + mounted);
      const {body: createdPersistentVolume} = await this.requestNewPersistentVolume(encryptedDisk);
      console.log("Created new persistent volume " + createdPersistentVolume.metadata.name);
      const {body: createdPod} = await this.requestCreatePod(encryptedDisk, fingerprint, rewrappedKey);
      console.log("Created new pod " + createdPod.metadata.name);
      const {body: createdService} = await this.requestCreateService(fingerprint, createdPod);
      console.log("Created new service " + createdService.metadata.name);
      const {body: updatedIngress} = await this.requestUpdateIngress(fingerprint, createdService);
      console.log("Ingress updated " + JSON.stringify(updatedIngress));
      return Promise.resolve(new K18sPod(this.k8sApi, createdPod, createdService, updatedIngress));
    } catch (e) {
      console.dir(e);
      return Promise.reject(JSON.stringify(e));
    }
  }

  private async requestUpdateIngress(fingerprint: string, service: V1Service) {
    const {body: ingress} = await this.k8sBetaApi.readNamespacedIngress(ARCS_MASTER_INGRESS, K18S_NAMESPACE,
      undefined, false, false);
    const newIngress = new V1beta1Ingress();
    const spec = new V1beta1IngressSpec();
    const rule = new V1beta1IngressRule();
    spec.rules = [rule];
    rule.http = new V1beta1HTTPIngressRuleValue();

    const path = new V1beta1HTTPIngressPath();
    path.path = ARCS_INGRESS_PREFIX + fingerprint + '/*';
    path.backend = new V1beta1IngressBackend();
    path.backend.serviceName = service.metadata.name;
    path.backend.servicePort = EXTERNAL_PORT;
    rule.http.paths = ingress.spec.rules[0].http.paths;
    rule.http.paths.push(path);
    newIngress.spec = spec;

    const oldHeaders = this.k8sBetaApi['defaultHeaders'];
    this.k8sBetaApi['defaultHeaders'] = Object.assign({'Content-Type': 'application/strategic-merge-patch+json'},
      oldHeaders);
    try {
      return await this.k8sBetaApi.patchNamespacedIngress(ARCS_MASTER_INGRESS, K18S_NAMESPACE,
        newIngress, undefined);
    } finally {
      this.k8sBetaApi['defaultHeaders'] = oldHeaders;
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
    service.spec.type = 'NodePort';

    const v1ServicePort = new V1ServicePort();
    v1ServicePort.port = EXTERNAL_PORT;
    v1ServicePort.targetPort = CONTAINER_PORT;

    service.spec.ports = [v1ServicePort];

    return this.k8sApi.createNamespacedService(K18S_NAMESPACE, service);
  }

  private async requestCreatePod(encryptedDisk: Disk, fingerprint: string, rewrappedKey: string) {
    const volumeName = encryptedDisk.id();
    const gceVolume = this.createGCEVolume(volumeName, encryptedDisk);
    const container = this.createContainer(fingerprint, volumeName);

    const v1Pod = new V1Pod();
    v1Pod.kind = 'Pod';
    v1Pod.apiVersion = 'v1';
    v1Pod.spec = new V1PodSpec();
    // force POD to be deployed on arcs-node (where disks are attached)
    v1Pod.spec.nodeSelector = {};
    v1Pod.spec.nodeSelector[ARCS_NODE_LABEL] = "true";

    v1Pod.spec.volumes = [gceVolume];
    v1Pod.spec.containers = [container];
    v1Pod.metadata = new V1ObjectMeta();
    v1Pod.metadata.name = 'pod-' + fingerprint;
    v1Pod.metadata.labels = {};
    v1Pod.metadata.labels['app'] = v1Pod.metadata.name;
    v1Pod.metadata.annotations = {};
    v1Pod.metadata.annotations[arcsKeyFor(fingerprint)] = rewrappedKey;
    return this.k8sApi.createNamespacedPod(K18S_NAMESPACE, v1Pod);
  }

  private createContainer(fingerprint: string, volumeName) {
    const container = new V1Container();
    // TODO: use SHA-1/commit hash based tagging?
    container.image = ARCS_DOCKER_IMAGE;
    container.name = 'container-image-' + fingerprint;
    const volumeMount = this.createVolumeMount(volumeName);
    container.volumeMounts = [volumeMount];
    const targetDiskEnv = new V1EnvVar();
    targetDiskEnv.name = ON_DISK_DB;
    targetDiskEnv.value = "true";
    const urlPrefix = new V1EnvVar();
    urlPrefix.name = VM_URL_PREFIX;
    urlPrefix.value = ARCS_INGRESS_PREFIX + fingerprint;

    container.env = [targetDiskEnv];
    const v1ContainerPort = new V1ContainerPort();
    v1ContainerPort.containerPort = CONTAINER_PORT;
    container.ports = [v1ContainerPort];
    return container;
  }

  private createVolumeMount(volumeName) {
    const volumeMount = new V1VolumeMount();
    volumeMount.name = volumeName;
    volumeMount.mountPath = DISK_MOUNT_PATH;
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
    spec.capacity = {storage: DEFAULT_GCP_DISK_SIZE + 'Gi'};
    spec.gcePersistentDisk = new V1GCEPersistentDiskVolumeSource();
    spec.gcePersistentDisk.fsType = 'ext4';
    spec.gcePersistentDisk.pdName = encryptedDisk.id();
    return spec;
  }

  async find(fingerprint: string): Promise<Container | null> {
    const kc = new KubeConfig();
    kc.loadFromDefault();

    const k8sApi = kc.makeApiClient(Core_v1Api);
    const {body:v1Pod} = await k8sApi.listNamespacedPod(K18S_NAMESPACE, undefined,
      undefined, undefined,
      true, undefined);
    const {body: ingress} = await this.k8sBetaApi.readNamespacedIngress(ARCS_MASTER_INGRESS, K18S_NAMESPACE,
      undefined, false, false);

    const podList = v1Pod.items;
    if (podList.length > 0) {

      const {body:v1Service} = await k8sApi.listNamespacedService(K18S_NAMESPACE, undefined,
        undefined, "metadata.name=svc-"+fingerprint, true, undefined);
      if (v1Service.items.length > 0) {
        return Promise.resolve(new K18sPod(k8sApi, podList[0], v1Service.items[0], ingress));
      }
    }
    return Promise.resolve(null);
  }
}

