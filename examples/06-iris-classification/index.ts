import { Result, Err, Option, newtype, Brand } from "rustlike";

// Simple k-NN classifier using Euclidean distance
// This is a simplified version without actual ML libraries

const IrisSpecies = {
  SETOSA: "setosa",
  VERSICOLOR: "versicolor",
  VIRGINICA: "virginica",
};

// Training data (simplified subset of the Iris dataset)
type SepalLength = Brand<number, "SepalLength">;
type SepalWidth = Brand<number, "SepalWidth">;
type PetalLength = Brand<number, "PetalLength">;
type PetalWidth = Brand<number, "PetalWidth">;

type RawSample = {
  sepalLength: number;
  sepalWidth: number;
  petalLength: number;
  petalWidth: number;
};

type TrainingSample = RawSample & { species: string };

type Iris = {
  sepalLength: SepalLength;
  sepalWidth: SepalWidth;
  petalLength: PetalLength;
  petalWidth: PetalWidth;
  species: string;
};

const SepalLengthCtor = newtype<number, "SepalLength">(
  (n) => typeof n === "number" && n > 0 && n < 20,
  (n) => `Invalid Sepal Length: ${n}`,
);
const SepalWidthCtor = newtype<number, "SepalWidth">(
  (n) => typeof n === "number" && n > 0 && n < 20,
  (n) => `Invalid Sepal Width: ${n}`,
);
const PetalLengthCtor = newtype<number, "PetalLength">(
  (n) => typeof n === "number" && n > 0 && n < 20,
  (n) => `Invalid Petal Length: ${n}`,
);
const PetalWidthCtor = newtype<number, "PetalWidth">(
  (n) => typeof n === "number" && n > 0 && n < 20,
  (n) => `Invalid Petal Width: ${n}`,
);

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

function parseMeasurements(sample: RawSample): Result<Omit<Iris, "species">, string> {
  return SepalLengthCtor.parse(sample.sepalLength).andThen((sepalLength) =>
    SepalWidthCtor.parse(sample.sepalWidth).andThen((sepalWidth) =>
      PetalLengthCtor.parse(sample.petalLength).andThen((petalLength) =>
        PetalWidthCtor.parse(sample.petalWidth).map((petalWidth) => ({
          sepalLength,
          sepalWidth,
          petalLength,
          petalWidth,
        })),
      ),
    ),
  );
}

function parseTrainingSample(sample: TrainingSample): Result<Iris, string> {
  return parseMeasurements(sample).map((measurements) => ({
    ...measurements,
    species: sample.species,
  }));
}

const trainingData: Result<Iris[], string> = Result.all(rawTrainingData.map(parseTrainingSample));

// Calculate Euclidean distance between two samples
function distance(a: Omit<Iris, "species">, b: Omit<Iris, "species">): number {
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
): Result<
  {
    species: string;
    confidence: number;
    votes: Record<string, number>;
    nearestNeighbors: { species: string; distance: string }[];
  },
  string
> {
  return parseMeasurements(sample).andThen((validSample) =>
    trainingData.andThen((data) => {
      if (data.length === 0) {
        return Err("No training data available");
      }

      if (k <= 0 || k > data.length) {
        return Err(`k must be between 1 and ${data.length}`);
      }

      // Calculate distances to all training samples
      const distances = data.map((trainingSample) => ({
        sample: trainingSample,
        distance: distance(validSample, trainingSample),
      }));

      // Sort by distance and take k nearest
      distances.sort((a, b) => a.distance - b.distance);
      const nearest = distances.slice(0, k);

      // Count votes for each species
      const votes: Record<string, number> = {};
      nearest.forEach(({ sample: trainingSample }) => {
        votes[trainingSample.species] = (votes[trainingSample.species] || 0) + 1;
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

      return Option.from(predictedSpecies)
        .okOr("Could not determine species")
        .map((species) => ({
          species,
          confidence: maxVotes / k,
          votes,
          nearestNeighbors: nearest.map((n) => ({
            species: n.sample.species,
            distance: n.distance.toFixed(2),
          })),
        }));
    }),
  );
}

// Demo
console.log("=== Iris Classification Demo ===\n");

// Test samples
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

  classify(measurements).match({
    ok: (result) => {
      console.log(`  Prediction: ${result.species}`);
      console.log(`  Confidence: ${(result.confidence * 100).toFixed(0)}%`);
      console.log(`  Votes: ${JSON.stringify(result.votes)}`);
      console.log(`  Nearest neighbors:`);
      result.nearestNeighbors.forEach((n, i) => {
        console.log(`    ${i + 1}. ${n.species} (distance: ${n.distance})`);
      });
    },
    err: (e) => {
      console.error(`  Error: ${e}`);
    },
  });

  console.log();
});

// Test different k values
console.log("Effect of k parameter (using first test sample):");
const firstSample = testSamples[0]!;
[1, 3, 5].forEach((k) => {
  classify(firstSample, k).match({
    ok: (result) => {
      console.log(
        `  k=${k}: ${result.species} (confidence: ${(result.confidence * 100).toFixed(0)}%)`,
      );
    },
    err: (e) => console.error(`  k=${k}: Error - ${e}`),
  });
});
