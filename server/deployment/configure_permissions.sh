#!/bin/sh

### This needs to be run before GKE nodes can create GCE disks

kubectl apply -f clusterrolebinding.yaml

