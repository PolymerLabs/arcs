source ./environment.sh

source ./configure_helm_permissions.sh

# Initialize helm
echo "Initialing Helm"
helm init --wait  --service-account tiller 
helm repo update
helm dep build ./arcs

# Needed by external-dns
kubectl create clusterrolebinding default-admin --clusterrole cluster-admin --serviceaccount=default:default

# CloudDNS service account
echo "Setting up service account for clouddns ${PROJECT_ID}"

gcloud iam service-accounts create prod-clouddns-svc-acct-secret \
  --display-name=${PROJECT_ID} \
  --project=${PROJECT_ID}

gcloud iam service-accounts keys create ./prod-clouddns-service-account.json \
--iam-account=prod-clouddns-svc-acct-secret@${PROJECT_ID}.iam.gserviceaccount.com \
--project=${PROJECT_ID}

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
--member=serviceAccount:prod-clouddns-svc-acct-secret@${PROJECT_ID}.iam.gserviceaccount.com \
--role=roles/dns.admin

kubectl create secret generic prod-clouddns-svc-acct-secret \
--from-file=./prod-clouddns-service-account.json

helm install ./arcs \
  --set domain=${DNS_ZONE} \
  --set arcs=${SERVICE_ACCOUNT} \
  --set project=${PROJECT_ID} \
  --set image.repository=gcr.io/${PROJECT_ID}/deployment


