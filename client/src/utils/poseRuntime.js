import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-converter';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';
import { createDetector, SupportedModels, movenet } from '@tensorflow-models/pose-detection';

export async function createPoseDetector() {
  try { await tf.setBackend('webgl'); } catch { await tf.setBackend('cpu'); }
  await tf.ready();
  return createDetector(SupportedModels.MoveNet, {
    modelType: movenet.modelType.SINGLEPOSE_LIGHTNING,
    enableSmoothing: true,
  });
}
