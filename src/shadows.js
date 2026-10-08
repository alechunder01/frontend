// Makes every mesh of a loaded model cast and receive shadows.
export const enableShadows = (scene) => {
  scene.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
};
