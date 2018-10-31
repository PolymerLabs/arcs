#!/bin/sh

### This needs to be run before GKE nodes can create GCE disks
echo "Configuring RBAC for Helm"
kubectl apply -f tiller-clusterrolebinding.yaml

