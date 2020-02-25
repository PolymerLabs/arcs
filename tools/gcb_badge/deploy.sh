#!bin/bash

GCP_PROJECT=arcs-265404
gcloud functions deploy cloud-build-badge \
    --source . \
    --runtime python37 \
    --entry-point build_badge \
    --service-account cloud-build-badge@${GCP_PROJECT}.iam.gserviceaccount.com \
    --trigger-topic=cloud-builds \
    --set-env-vars BADGES_BUCKET=arcs-github-gcb-badges,TEMPLATE_PATH='builds/${repo}/branches/${branch}.svg'
