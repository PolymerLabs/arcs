
source ./environment.sh

cd ../..
echo "Building Arcs Master Docker Image..."
docker build . -t $BUILD_LABEL
cd server/deployment

echo "Pushing image to GCP repository..."
docker push $BUILD_LABEL

