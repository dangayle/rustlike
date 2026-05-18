// Idiomatic TypeScript version - runtime validation without branded types
const IrisSpecies = {
  SETOSA: "setosa",
  VERSICOLOR: "versicolor",
  VIRGINICA: "virginica",
};

type RawSample = {
  sepalLength: number;
  sepalWidth: number;
  petalLength: number;
  petalWidth: number;
};

type TrainingSample = RawSample & { species: string };

// Validate at usage time (manual checks)
function validateMeasurements(sample: RawSample): void {
  if (
    typeof sample.sepalLength !== "number" ||
    sample.sepalLength <= 0 ||
    sample.sepalLength >= 20
  ) {
    throw new Error(`Invalid Sepal Length: ${sample.sepalLength}`);
  }
  if (typeof sample.sepalWidth !== "number" || sample.sepalWidth <= 0 || sample.sepalWidth >= 20) {
    throw new Error(`Invalid Sepal Width: ${sample.sepalWidth}`);
  }
  if (
    typeof sample.petalLength !== "number" ||
    sample.petalLength <= 0 ||
    sample.petalLength >= 20
  ) {
    throw new Error(`Invalid Petal Length: ${sample.petalLength}`);
  }
  if (typeof sample.petalWidth !== "number" || sample.petalWidth <= 0 || sample.petalWidth >= 20) {
    throw new Error(`Invalid Petal Width: ${sample.petalWidth}`);
  }
}

const rawTrainingData: TrainingSample[] = [
  {
    sepalLength: 5.1,
    sepalWidth: 3.5,
    petalLength: 1.4,
    petalWidth: 0.2,
    species: IrisSpecies.SETOSA,
  },
  {
    sepalLength: 4.9,
    sepalWidth: 3.0,
    petalLength: 1.4,
    petalWidth: 0.2,
    species: IrisSpecies.SETOSA,
  },
  {
    sepalLength: 4.7,
    sepalWidth: 3.2,
    petalLength: 1.3,
    petalWidth: 0.2,
    species: IrisSpecies.SETOSA,
  },
  {
    sepalLength: 7.0,
    sepalWidth: 3.2,
    petalLength: 4.7,
    petalWidth: 1.4,
    species: IrisSpecies.VERSICOLOR,
  },
  {
    sepalLength: 6.4,
    sepalWidth: 3.2,
    petalLength: 4.5,
    petalWidth: 1.5,
    species: IrisSpecies.VERSICOLOR,
  },
  {
    sepalLength: 6.9,
    sepalWidth: 3.1,
    petalLength: 4.9,
    petalWidth: 1.5,
    species: IrisSpecies.VERSICOLOR,
  },
  {
    sepalLength: 6.3,
    sepalWidth: 3.3,
    petalLength: 6.0,
    petalWidth: 2.5,
    species: IrisSpecies.VIRGINICA,
  },
  {
    sepalLength: 5.8,
    sepalWidth: 2.7,
    petalLength: 5.1,
    petalWidth: 1.9,
    species: IrisSpecies.VIRGINICA,
  },
  {
    sepalLength: 7.1,
    sepalWidth: 3.0,
    petalLength: 5.9,
    petalWidth: 2.1,
    species: IrisSpecies.VIRGINICA,
  },
];

// Calculate Euclidean distance
function distance(a: RawSample, b: RawSample): number {
  const dSepalLength = a.sepalLength - b.sepalLength;
  const dSepalWidth = a.sepalWidth - b.sepalWidth;
  const dPetalLength = a.petalLength - b.petalLength;
  const dPetalWidth = a.petalWidth - b.petalWidth;

  return Math.sqrt(dSepalLength ** 2 + dSepalWidth ** 2 + dPetalLength ** 2 + dPetalWidth ** 2);
}

// k-NN classification
function classify(
  sample: RawSample,
  k = 3,
): {
  species: string;
  confidence: number;
  votes: Record<string, number>;
  nearestNeighbors: { species: string; distance: string }[];
} {
  // Validate input
  validateMeasurements(sample);

  if (rawTrainingData.length === 0) {
    throw new Error("No training data available");
  }

  if (k <= 0 || k > rawTrainingData.length) {
    throw new Error(`k must be between 1 and ${rawTrainingData.length}`);
  }

  // Calculate distances
  const distances = rawTrainingData.map((trainingSample) => ({
    sample: trainingSample,
    distance: distance(sample, trainingSample),
  }));

  // Sort and get k nearest
  distances.sort((a, b) => a.distance - b.distance);
  const nearest = distances.slice(0, k);

  // Count votes
  const votes: Record<string, number> = {};
  nearest.forEach(({ sample: trainingSample }) => {
    votes[trainingSample.species] = (votes[trainingSample.species] ?? 0) + 1;
  });

  // Find species with most votes
  let maxVotes = 0;
  let predictedSpecies: string | null = null;

  for (const [species, count] of Object.entries(votes)) {
    if (count > maxVotes) {
      maxVotes = count;
      predictedSpecies = species;
    }
  }

  if (!predictedSpecies) {
    throw new Error("Could not determine species");
  }

  return {
    species: predictedSpecies,
    confidence: maxVotes / k,
    votes,
    nearestNeighbors: nearest.map((n) => ({
      species: n.sample.species,
      distance: n.distance.toFixed(2),
    })),
  };
}

// Demo
console.log("=== Iris Classification Demo ===\n");

const testSamples = [
  {
    name: "Small flower (likely Setosa)",
    sepalLength: 5.0,
    sepalWidth: 3.4,
    petalLength: 1.5,
    petalWidth: 0.2,
  },
  {
    name: "Medium flower (likely Versicolor)",
    sepalLength: 6.5,
    sepalWidth: 3.0,
    petalLength: 4.8,
    petalWidth: 1.5,
  },
  {
    name: "Large flower (likely Virginica)",
    sepalLength: 6.5,
    sepalWidth: 3.0,
    petalLength: 5.8,
    petalWidth: 2.2,
  },
  { name: "Invalid sample", sepalLength: -1, sepalWidth: 3.0, petalLength: 4.0, petalWidth: 1.0 },
];

testSamples.forEach(({ name, ...measurements }) => {
  console.log(`${name}:`);
  console.log(
    `  Measurements: SL=${measurements.sepalLength}, SW=${measurements.sepalWidth}, PL=${measurements.petalLength}, PW=${measurements.petalWidth}`,
  );

  try {
    const result = classify(measurements);
    console.log(`  Prediction: ${result.species}`);
    console.log(`  Confidence: ${(result.confidence * 100).toFixed(0)}%`);
    console.log(`  Votes: ${JSON.stringify(result.votes)}`);
    console.log(`  Nearest neighbors:`);
    result.nearestNeighbors.forEach((n, i) => {
      console.log(`    ${i + 1}. ${n.species} (distance: ${n.distance})`);
    });
  } catch (e) {
    console.error(`  Error: ${(e as Error).message}`);
  }

  console.log();
});

// Test different k values
console.log("Effect of k parameter (using first test sample):");
const firstSample = { sepalLength: 5.0, sepalWidth: 3.4, petalLength: 1.5, petalWidth: 0.2 };
[1, 3, 5].forEach((k) => {
  try {
    const result = classify(firstSample, k);
    console.log(
      `  k=${k}: ${result.species} (confidence: ${(result.confidence * 100).toFixed(0)}%)`,
    );
  } catch (e) {
    console.error(`  k=${k}: Error - ${(e as Error).message}`);
  }
});
