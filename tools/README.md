# arcs / tools

## Manual Deployment of CI Docker image

1. Make sure you are a part of the [arcsproject Docker hub organization](https://hub.docker.com/orgs/arcsproject).

2. Log into your docker account on your host machine.

    ```
    docker login [--password <pass>][--username <user>]
    ```

3. Build the docker image from the project root:

    ```
    docker build -f tools/Dockerfile.CI -t <tag-name-of-image> .
    ```

4. Get the ID of the image you just built.

   ```
   docker images
   ```

5. Tag the image-to-upload to associate it with the target repository
   TODO(bgogul): Rename docker path to fit with Parker.

    ```
    docker tag <image-from-last-step> arcsproject/travis-build:latest
    ```

6. Push the image

   ```
   docker push arcsproject/travis-build:latest
   ```


## Run Android Integration Tests

Android Integration Tests need to run on a device or emulator. There
are two ways to run them:

### Run locally with an Android dev phone or emulator

   ```
   ./run-android-e2e-tests-locally
   ```

### Run in Firebase Test Lab

   ```
   ./run-android-e2e-tests-on-firebase
