
source ./environment.sh

echo "Project id is $PROJECT_ID"
# Create a service account with roles for our GKE cluster
echo "Creating service account ${SERVICE_ACCOUNT}..."
gcloud iam service-accounts create arcs-sa --project $PROJECT_ID --display-name 'arcs-service-account'

echo "Setting service account roles..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member serviceAccount:$SERVICE_ACCOUNT --role roles/editor
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member serviceAccount:$SERVICE_ACCOUNT --role roles/container.admin
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member serviceAccount:$SERVICE_ACCOUNT --role roles/compute.instanceAdmin

# Create a cluster using the specified service account
echo "Creating cluster ${CLUSTER_NAME} a minimum of 3 nodes and maximum of 10..."
gcloud container clusters create $CLUSTER_NAME --project $PROJECT_ID --zone $COMPUTE_ZONE --node-locations $COMPUTE_ZONE \
    --num-nodes 3 \
    --min-nodes 3 \
    --max-nodes 10 \
    --enable-autoscaling \
    --enable-autorepair \
    --enable-autoupgrade \
    --enable-cloud-logging \
    --enable-cloud-monitoring \
    --service-account=$SERVICE_ACCOUNT

# Download credentials for kubernetes
echo "Fetching Kubernetes credentials for clusrter..."
gcloud container clusters get-credentials $CLUSTER_NAME

source ./setup_dns.sh
source ./setup_helm.sh

