
export PROJECT_ID=arcs-project
export COMPUTE_ZONE=us-central1-a
export CLUSTER_NAME=personal-cloud
export BUILD_LABEL=gcr.io/arcs-project/deployment:latest
export SERVICE_ACCOUNT=arcs-sa@${PROJECT_ID}.iam.gserviceaccount.com
export DNS_ZONE=skarabrae.org.
export DNS_ZONE_NAME=skarabrae

gcloud config set project $PROJECT_ID
gcloud config set compute/zone $COMPUTE_ZONE

