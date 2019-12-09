= DevOps Scripts for configuring GCE, GKE, and K18S =

This directory contains scripts to bring up an instance of Arcs
master on GCP. In the future, it will evolve to support other
clouds such as AWS and Azure. The main multi-cloud portability
comes from leveraging Kubernetes for orchestration and Helm for
package and dependency management. 

The cloud dependent portions of setup are in creating clusters and
service accounts, setting IAM permissions, and configuring DNS
providers. 


== Installation Prerequisites ==
Manual steps: Follow https://cloud.google.com/sdk/docs/quickstarts to install
GCloud SDK.

Install Docker (e.g for OSX https://docs.docker.com/docker-for-mac/install/)

Also install Helm (https://docs.helm.sh/using_helm/#installing-helm)

== Configuration Prerequisites ==

Create a GCP account and enable billing. 

Then run 'gcloud init'
Then run 'gcloud components install kubectl'
Then run 'gcloud components update'

Create a domain on Google Domains registrar. Next, Setup a GCP CloudDNS zone for your
domain and using the Web console of Google Domains, point the nameservers
to the nameservers listed in the CloudeDNS zone for your domain.

Edit environment.sh to configure your your service account, dns zone, project id, etc.

== Run setup scripts once ==

Finally run setup_gke.sh (can only run once)

== Edit/Refresh ==

Runing build.sh builds and pushes docker images to GCP. The services should notice when
new builds are available and redeploy themselves.




