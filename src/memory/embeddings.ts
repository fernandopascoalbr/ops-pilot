import { pipeline } from '@huggingface/transformers';

export const ALL_MINILM_L6_V2 = 'Xenova/all-MiniLM-L6-v2';

export type EmbeddingVector = number[];

type TensorLike = {
  ort_tensor?: {
    dims?: number[];
    cpuData?: Float32Array | number[];
  };
  dims?: number[];
  cpuData?: Float32Array | number[];
};

type EmbeddingPipeline = (text: string) => Promise<TensorLike>;

let embeddingPipeline: EmbeddingPipeline | null = null;

async function getEmbeddingPipeline(): Promise<EmbeddingPipeline> {
  if (embeddingPipeline) {
    return embeddingPipeline;
  }

  const pipelineInstance = await (pipeline as any)('feature-extraction', ALL_MINILM_L6_V2, {
    pooling: 'mean',
    normalize: true,
  });

  embeddingPipeline = pipelineInstance as unknown as EmbeddingPipeline;
  return embeddingPipeline;
}

function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.hypot(...vector);
  if (!Number.isFinite(magnitude) || magnitude === 0) {
    return vector.map(() => 0);
  }

  return vector.map((value) => value / magnitude);
}

function meanPoolTensor(tensor: TensorLike): number[] {
  const legacyTensor = tensor.ort_tensor ?? tensor;
  const dims = legacyTensor?.dims ?? [];
  const values = Array.from(legacyTensor?.cpuData ?? []);

  if (dims.length >= 3) {
    const seqLength = dims[1] ?? 0;
    const hiddenSize = dims[2] ?? 0;

    if (seqLength > 0 && hiddenSize > 0) {
      const pooled = new Float32Array(hiddenSize);

      for (let hiddenIndex = 0; hiddenIndex < hiddenSize; hiddenIndex += 1) {
        let sum = 0;
        for (let tokenIndex = 0; tokenIndex < seqLength; tokenIndex += 1) {
          const valueIndex = tokenIndex * hiddenSize + hiddenIndex;
          sum += values[valueIndex] ?? 0;
        }
        pooled[hiddenIndex] = sum / seqLength;
      }

      return normalizeVector(Array.from(pooled));
    }
  }

  if (values.length > 0) {
    return normalizeVector(values);
  }

  return [];
}

export async function embedText(text: string): Promise<EmbeddingVector> {
  const rawText = text.trim();

  if (rawText.length === 0) {
    return [];
  }

  const extractor = await getEmbeddingPipeline();
  const output = await extractor(rawText);
  return meanPoolTensor(output as TensorLike);
}
