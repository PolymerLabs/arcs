# TODO(cromwellian): Make the below defaults and allow devs to set their own env vars.
# https://github.com/dylanaraps/pure-sh-bible#default-value
export PROJECT_ID=arcs-project-223901
export COMPUTE_ZONE=us-central1-a
export CLUSTER_NAME=personal-cloud
export BUILD_LABEL=gcr.io/${PROJECT_ID}/deployment:latest
export SERVICE_ACCOUNT=arcs-sa@${PROJECT_ID}.iam.gserviceaccount.com
export DNS_ZONE=skarabrae.org
export DNS_ZONE_NAME=skarabrae

gcloud config set project $PROJECT_ID
gcloud config set compute/zone $COMPUTE_ZONE

