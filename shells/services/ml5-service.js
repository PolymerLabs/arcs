import {Services} from '../../build/runtime/services.js';

const requireMl5 = async () => {
  if (!window.ml5) {
    await import('https://unpkg.com/ml5@0.2.3/dist/ml5.min.js');
  }
};

const classifyImage = async ({imageUrl}) => {
  console.log('classifying...');
  await requireMl5();
  const image = await loadImage(imageUrl);
  const classifier = await window.ml5.imageClassifier('MobileNet');
  const results = await classifier.classify(image);
  const result = results.shift();
  console.log('classifying done.');
  return {
    label: result.label,
    probability: result.confidence.toFixed(4)
  };
};

const loadImage = async url => {
  return new Promise((resolve) => {
    const image = new Image();
    image.src = url;
    image.onload = async () => resolve(image);
  });
}

Services.register('ml5', {
  classifyImage
});
