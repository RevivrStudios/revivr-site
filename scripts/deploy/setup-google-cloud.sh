#!/usr/bin/env bash
# Run once in Google Cloud Shell as an administrator of revivr-studios.
set -euo pipefail

PROJECT=revivr-studios
POOL=github-deploy
PROVIDER=revivr-site
SERVICE_ACCOUNT=github-hosting-deploy
EMAIL="${SERVICE_ACCOUNT}@${PROJECT}.iam.gserviceaccount.com"
NUMBER=$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')
CONDITION="assertion.repository_id == '1143607762' && assertion.repository_owner_id == '74626466' && assertion.ref == 'refs/heads/main' && assertion.workflow_ref == 'RevivrStudios/revivr-site/.github/workflows/deploy-hosting.yml@refs/heads/main'"

gcloud services enable iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com firebasehosting.googleapis.com --project="$PROJECT"
if ! gcloud iam service-accounts describe "$EMAIL" --project="$PROJECT" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$SERVICE_ACCOUNT" --project="$PROJECT" --display-name='GitHub Hosting deployment'
fi
if ! gcloud iam workload-identity-pools describe "$POOL" --project="$PROJECT" --location=global >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "$POOL" --project="$PROJECT" --location=global --display-name='GitHub deployment'
fi
if gcloud iam workload-identity-pools providers describe "$PROVIDER" --project="$PROJECT" --location=global --workload-identity-pool="$POOL" >/dev/null 2>&1; then
  PROVIDER_ACTION=update-oidc
else
  PROVIDER_ACTION=create-oidc
fi
gcloud iam workload-identity-pools providers "$PROVIDER_ACTION" "$PROVIDER" \
  --project="$PROJECT" --location=global --workload-identity-pool="$POOL" \
  --issuer-uri=https://token.actions.githubusercontent.com \
  --attribute-mapping='google.subject=assertion.sub,attribute.repository_id=assertion.repository_id' \
  --attribute-condition="$CONDITION"

gcloud iam service-accounts add-iam-policy-binding "$EMAIL" --project="$PROJECT" \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/${NUMBER}/locations/global/workloadIdentityPools/${POOL}/attribute.repository_id/1143607762"
for ROLE in roles/firebasehosting.admin roles/serviceusage.apiKeysViewer; do
  gcloud projects add-iam-policy-binding "$PROJECT" \
    --member="serviceAccount:${EMAIL}" --role="$ROLE" --condition=None >/dev/null
done
echo "FIREBASE_WORKLOAD_IDENTITY_PROVIDER=projects/${NUMBER}/locations/global/workloadIdentityPools/${POOL}/providers/${PROVIDER}"
echo "FIREBASE_DEPLOY_SERVICE_ACCOUNT=${EMAIL}"
