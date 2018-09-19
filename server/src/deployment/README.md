# Arcs Cloud Deployment Management

This package manages server side NodeJS container deployments of the
Arcs runtime and encrypted storage provisioning.

## Design

Arcs Cloud Deployment Managment (*ACDM*) maps client *StorageKey*
fingerprints (see Arcs Key Management System) 1-to-1 to 
deployed NodeJS VMs with attached encrypted disk, available at an 
externally available HTTP endpoint.

To support future implementations with better scalability, this API is
not very opinionated on which cloud to use, or which storage system. 
There are only two real concerns:

1. Node runtimes can be deployed for each StorageKey, and obtain a 
URL to the instance.

2. Personal data is encrypted at rest, the key material is encrypted
end-to-end and the design should allow the keys to be decrypted in a
secure environment with as few privileges as possible.


In order to support multiple cloud backends (GCP, AWS, Azure, etc) as well
as multiple secure storage mechanisms (encrypted disks, bucket storage,
Dropbox/Gdrive FUSE filesystems), high level APIs are coupled with 
specific cloud 'drivers'. The first available implementation is for GCE 
encrypted disks, and container orchestration is handled by kubernetes.

Most of the code in this directory runs in a single 'master' node vm that
orchestrates individual user personal cloud deployments, each associated with
one or more wrapped storage keys. (A given user can have more than one device,
so a node vm deployment with encrypted disk could have multiple wrapped storage
keys associated with it.)

### Operations (on Master Server)

* Look up an existing server for a given wrapped key fingerprint
    1. Returns either the URL of an existing, running, server
    2. Or the URL of an existing server with existing disk (unmounted)
        * includes the existing wrapped key the server is using
        * includes a public key to rewrap an unwrapped key
   
* Mount an unmounted disk
    * Client generates a storage key, wrapped with server public key
    * Sends wrapped key to server
    
* Create a new server and new disk
    * Client generates a storage key, wrapped with device key
    * Client rewraps storage key with cloud server public key
    * Client sends both to master which creates a new container + disk
    * Master returns the URL of the new running server
    
    

