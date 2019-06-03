/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */


export async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    function cleanup() {
      image.onload = null;
      image.onerror = null;
    }

    image.src = url;
    image.onload = async () => {cleanup(); resolve(image);};
    image.onerror = async (error) => {cleanup(); reject(error);};

  });
}
