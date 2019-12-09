/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {
  Core_v1Api,
  Extensions_v1beta1Api, ExtensionsV1beta1DeploymentSpec,
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
  V1PersistentVolumeSpec, V1PodSpec,
  V1PodTemplateSpec,
  V1Service,
  V1ServicePort,
  V1ServiceSpec,
  V1Volume,
  V1VolumeMount
} from '@kubernetes/client-node';

import {ExtensionsV1beta1Deployment} from '../../../node_modules/@kubernetes/client-node/dist/api';
import {CloudManager} from '../cloud';
import {Container, ContainerManager, DeploymentStatus} from '../containers';
import {Disk} from '../disks';
import {GCE_PERSISTENT_DISK_TYPE} from '../gcp/gcp-constants';
import {DEFAULT_GCP_DISK_SIZE} from '../gcp/gcpdisk';
import {ARCS_KEY_PREFIX, arcsKeyFor, DISK_MOUNT_PATH, ON_DISK_DB, VM_URL_PREFIX} from '../utils';

import {
  ARCS_DOCKER_IMAGE,
  ARCS_INGRESS_PREFIX,
  CONTAINER_PORT,
  EXTERNAL_PORT,
  K18S_NAMESPACE
} from './k18s-constants';


const USE_PREFIX_MAPPING = true;

/**
 * An implementation of the Container interface that uses Kubernetes for
 * orchestration of deployed VMs.
 */
class K18sDeployment implements Container {
  private v1Deployment: ExtensionsV1beta1Deployment;
  private v1Service: V1Service;
  private k8sApi: Core_v1Api;
  private ingress: V1beta1Ingress;

  constructor(k8sApi: Core_v1Api, v1Deployment: ExtensionsV1beta1Deployment, v1Service: V1Service,
              ingress: V1beta1Ingress) {
    this.k8sApi = k8sApi;
    this.v1Deployment = v1Deployment;
    this.v1Service = v1Service;
    this.ingress = ingress;
  }

  url(): string {
    if (USE_PREFIX_MAPPING) {
      const path = this.ingress.spec.rules[0].http.paths
        .filter(x => x.backend.serviceName === this.v1Service.metadata.name);
      return 'https://' + this.ingress.spec.tls[0].hosts[0] + path[0].path.replace('/*', '');
    } else {
      const lb = this.v1Service.status.loadBalancer;
      if (lb && lb.ingress) {
        return 'http://' + lb && lb.ingress[0].ip;
      } else {
        return 'pending';
      }
    }
  }

  status(): DeploymentStatus {
    return this.v1Deployment.status.readyReplicas > 0 ? DeploymentStatus.ATTACHED: DeploymentStatus.PENDING;
  }

  async disk(): Promise<Disk> {
    const diskManager = CloudManager.forGCP().disks();

    const disks = await Promise.all(Object.keys(this.v1Deployment.metadata.labels)
       .filter(x => x.startsWith(ARCS_KEY_PREFIX))
       .map(x => diskManager.find(x.substring(ARCS_KEY_PREFIX.length))));
    if (disks != null && disks.length > 0) {
      const disk:Disk = disks[0] as Disk;
      return Promise.resolve(disk);
    }
    return Promise.reject(new Error('Container has no disk associated'));
  }

  async node(): Promise<string> {
    const {body: v1Pod} = await this.k8sApi.readNamespacedPod(this.v1Deployment.metadata.name, K18S_NAMESPACE,
      undefined, false, false);
    return Promise.resolve(v1Pod.spec.nodeName);
  }
}

export class K18sContainerManager implements ContainerManager {

  k8sApi: Core_v1Api;
  k8sBetaApi: Extensions_v1beta1Api;
  k8sName: string;
  appName: string;
  releaseName: string;

  constructor() {
    const kc = new KubeConfig();
    kc.loadFromDefault();
    this.k8sApi = kc.makeApiClient(Core_v1Api);
    this.k8sBetaApi = kc.makeApiClient(Extensions_v1beta1Api);
    this.k8sName = process.env['MY_NODE_NAME'] || '';
    this.appName = process.env['MY_APP_NAME'] || '';
    this.releaseName = process.env['MY_RELEASE_NAME'] || '';
    if (this.k8sName === '' || this.appName === '' || this.releaseName === '') {
      console.log('Missing environment variable MY_NODE_NAME, MY_APP_NAME, MY_RELEASE_NAME for Docker environment');
      throw new Error('Missing MY_NODE_NAME, MY_APP_NAME, or MY_RELEASE_NAME environment variable');
    }
  }

  /**
   * Find a free node in the GCP cluster where we're going to deploy. Currently picks at random:
   * TODO: watch out for picking full nodes
   * TODO: can we use K8S node affinity somehow for this instead?
   */
  async findAvailableNode(): Promise<string> {
     const {body: nodeList} = await this.k8sApi.listNode();
     const nodeNames = [...nodeList.items.map(node => node.metadata.name)];
     return Promise.resolve(nodeNames[Math.floor(Math.random() * nodeNames.length)]);
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
      const node = await this.findAvailableNode();
      const mounted = await encryptedDisk.mount(rewrappedKey, node);
      console.log('Disk mounted ' + mounted);
      const {body: createdPersistentVolume} = await this.requestNewPersistentVolume(encryptedDisk);
      console.log('Created new persistent volume ' + createdPersistentVolume.metadata.name);
      const {body: createDeployment} = await this.requestCreateDeployment(encryptedDisk, fingerprint, rewrappedKey, node);
      console.log('Created new deployment ' + createDeployment.metadata.name);
      const {body: createdService} = await this.requestCreateService(fingerprint, createDeployment);
      console.log('Created new service ' + createdService.metadata.name);
      let ingress;
      if (USE_PREFIX_MAPPING) {
        const {body: updatedIngress} = await this.requestUpdateIngress(fingerprint, createdService);
        console.log('Ingress updated ' + JSON.stringify(updatedIngress));
        ingress = updatedIngress;
      }
      return Promise.resolve(new K18sDeployment(this.k8sApi, createDeployment, createdService, ingress));
    } catch (e) {
      console.dir(e);
      return Promise.reject(JSON.stringify(e));
    }
  }

  private async requestUpdateIngress(fingerprint: string, service: V1Service) {
    const {body: ingress} = await this.k8sBetaApi.readNamespacedIngress(this.k8sName, K18S_NAMESPACE,
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
    rule.host = ingress.spec.rules[0].host;
    newIngress.spec = spec;

    const oldHeaders = this.k8sBetaApi['defaultHeaders'];
    this.k8sBetaApi['defaultHeaders'] = {'Content-Type': 'application/strategic-merge-patch+json',
      ...oldHeaders};
    try {
      return await this.k8sBetaApi.patchNamespacedIngress(this.k8sName, K18S_NAMESPACE,
        newIngress, undefined);
    } finally {
      this.k8sBetaApi['defaultHeaders'] = oldHeaders;
    }
  }

  private async requestCreateService(fingerprint: string, deployment: ExtensionsV1beta1Deployment) {
    // TODO: consider using NodePort + Ingress
    const service = new V1Service();
    service.apiVersion = 'v1';
    service.kind = 'Service';
    service.spec = new V1ServiceSpec();
    service.metadata = new V1ObjectMeta();
    service.metadata.name = 'svc-' + fingerprint;
    service.spec.selector = {};
    service.spec.selector['app'] = deployment.spec.template.metadata.name;
    service.spec.type = USE_PREFIX_MAPPING ? 'NodePort' : 'LoadBalancer';

    const v1ServicePort = new V1ServicePort();
    v1ServicePort.port = EXTERNAL_PORT;
    v1ServicePort.targetPort = CONTAINER_PORT;

    service.spec.ports = [v1ServicePort];

    return this.k8sApi.createNamespacedService(K18S_NAMESPACE, service);
  }

  private async requestCreateDeployment(encryptedDisk: Disk, fingerprint: string, rewrappedKey: string, node: string) {
    const volumeName = encryptedDisk.id();
    const gceVolume = this.createGCEVolume(volumeName, encryptedDisk);
    const container = this.createContainer(fingerprint, volumeName);

    const v1Deployment = new ExtensionsV1beta1Deployment();
    v1Deployment.kind = 'Deployment';
    v1Deployment.apiVersion = 'extensions/v1beta1';
    v1Deployment.metadata = new V1ObjectMeta();
    v1Deployment.metadata.name = 'pod-' + fingerprint;
    v1Deployment.spec = new ExtensionsV1beta1DeploymentSpec();
    v1Deployment.spec.template = new V1PodTemplateSpec();
    // TODO: use NodeAffinity instead?
    v1Deployment.spec.template.spec = new V1PodSpec();
    v1Deployment.spec.template.spec.nodeSelector = {};
    v1Deployment.spec.template.spec.nodeSelector['kubernetes.io/hostname'] = node;
    v1Deployment.spec.replicas = 1;
    v1Deployment.spec.template.spec.volumes = [gceVolume];
    v1Deployment.spec.template.spec.containers = [container];
    v1Deployment.spec.template.metadata = new V1ObjectMeta();
    v1Deployment.spec.template.metadata.name = 'pod-' + fingerprint;
    v1Deployment.spec.template.metadata.labels = {};
    v1Deployment.spec.template.metadata.labels['app'] = v1Deployment.spec.template.metadata.name;
    v1Deployment.spec.template.metadata.annotations = {};
    v1Deployment.spec.template.metadata.annotations[arcsKeyFor(fingerprint)] = rewrappedKey;
    return this.k8sBetaApi.createNamespacedDeployment(K18S_NAMESPACE, v1Deployment);
  }

  private createContainer(fingerprint: string, volumeName: string) {
    const container = new V1Container();
    // TODO: use SHA-1/commit hash based tagging?
    container.image = ARCS_DOCKER_IMAGE;
    container.name = 'container-image-' + fingerprint;
    const volumeMount = this.createVolumeMount(volumeName);
    container.volumeMounts = [volumeMount];
    const targetDiskEnv = new V1EnvVar();
    targetDiskEnv.name = ON_DISK_DB;
    targetDiskEnv.value = 'true';
    const urlPrefix = new V1EnvVar();

    urlPrefix.name = VM_URL_PREFIX;
    urlPrefix.value = '/';

    container.env = [targetDiskEnv, urlPrefix];
    const v1ContainerPort = new V1ContainerPort();
    v1ContainerPort.containerPort = CONTAINER_PORT;
    container.ports = [v1ContainerPort];
    return container;
  }

  private createVolumeMount(volumeName: string) {
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
  private createGCEVolume(volumeName: string, encryptedDisk: Disk) {
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
    spec.accessModes = ['ReadWriteOnce'];
    spec.capacity = {storage: DEFAULT_GCP_DISK_SIZE + 'Gi'};
    spec.gcePersistentDisk = new V1GCEPersistentDiskVolumeSource();
    spec.gcePersistentDisk.fsType = 'ext4';
    spec.gcePersistentDisk.pdName = encryptedDisk.id();
    return spec;
  }

  async find(fingerprint: string): Promise<Container | null> {

    const {body: v1Deployment} = await this.k8sBetaApi.listNamespacedDeployment(
      K18S_NAMESPACE,
      true // includeUnitialized
    );
    const {body: ingress} = await this.k8sBetaApi.readNamespacedIngress(this.k8sName, K18S_NAMESPACE,
      undefined, false, false);

    const deploymentList = v1Deployment.items;
    if (deploymentList.length > 0) {

      const {body: v1Service} = await this.k8sApi.listNamespacedService(
        K18S_NAMESPACE,
        true, // includeUnitialized
        undefined, // pretty
        undefined, // _continue
        'metadata.name=svc-'+fingerprint, // fieldSelector
        undefined // labelSelector
      );
      if (v1Service.items.length > 0) {
        return Promise.resolve(new K18sDeployment(this.k8sApi, deploymentList[0], v1Service.items[0], ingress));
      }
    }
    return Promise.resolve(null);
  }
}

