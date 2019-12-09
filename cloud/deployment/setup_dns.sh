
source ./environment.sh

gcloud dns managed-zones create $DNS_ZONE_NAME \
    --dns-name ${DNS_ZONE}. \
    --description "Automatically managed zone by kubernetes.io/external-dns"
