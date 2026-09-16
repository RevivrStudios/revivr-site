# Production deployment

Push tested changes to `main` to deploy Firebase Hosting for `revivr-studios`.
The **Deploy Firebase Hosting** workflow can also be run manually on `main`.
Feature branches do not deploy. Check the Actions run before reporting a release live.

Google Workload Identity Federation exchanges GitHub's OIDC identity for short-lived
credentials. No Firebase login, refresh token, or service-account JSON key is stored
in GitHub. The trust condition requires this repository's numeric ID, its owner's
numeric ID, `main`, and this exact deployment workflow.

## One-time administrator setup

Run `setup-google-cloud.sh` in Google Cloud Shell. It creates a dedicated identity
with Firebase Hosting Admin and API Keys Viewer (required by the Firebase CLI).
It allows the restricted GitHub identity to impersonate that service account.
Set the two printed values as GitHub repository **Actions variables**:

- `FIREBASE_WORKLOAD_IDENTITY_PROVIDER`
- `FIREBASE_DEPLOY_SERVICE_ACCOUNT`

These are identifiers, not secrets. Routine deployments require no administrator login.
To revoke deployment access, disable the `revivr-site` identity provider in the
`github-deploy` pool or remove its service-account impersonation binding.

## Runtime models outside Git

Sixteen model files are intentionally ignored by Git. `runtime-assets.json` records
the URLs and SHA-256 hashes of their already-published versions. Before building,
`restore-runtime-assets.mjs` restores missing files and verifies every hash. It
fails on modified local files, download errors, or mismatches rather than publishing
an incomplete site. Keep the local originals backed up. This restoration depends
on the currently published asset URLs remaining available; deleting those files
from Hosting requires arranging another approved asset source first.

When deliberately changing a model, review its distribution rights, publish the
approved asset, and update its manifest checksum together with the source change.
Do not force-add the ignored model directories to this public repository.

## Local verification

```sh
npm ci
node scripts/deploy/restore-runtime-assets.mjs
node --test tests/*.test.mjs
npm run build
```

Authentication occurs only after tests and build, immediately before deployment.
Actions and Firebase CLI versions are pinned; update them deliberately.
