import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

import {
  EXPECTED_HEIGHT,
  EXPECTED_WIDTH,
  FIX_TARGETS,
  GATE_PARAMETERS,
  MATTE_PARAMETERS,
  resolveRawPath,
} from "./config.mjs";

export function quantile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.floor((sorted.length - 1) * fraction);
  return sorted[index];
}

function median(values) {
  return quantile(values, 0.5);
}

function smoothstep(edge0, edge1, value) {
  const normalized = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return normalized * normalized * (3 - 2 * normalized);
}

export function keyRayDistance(red, green, blue, key, parameters) {
  const keyMagnitudeSquared = key[0] ** 2 + key[1] ** 2 + key[2] ** 2;
  const projection = (red * key[0] + green * key[1] + blue * key[2]) / keyMagnitudeSquared;
  const scale = Math.max(
    parameters.minimumKeyScale,
    Math.min(parameters.maximumKeyScale, projection),
  );
  return Math.hypot(red - scale * key[0], green - scale * key[1], blue - scale * key[2]);
}

function ensureExpectedDimensions(info, inputPath) {
  if (info.width !== EXPECTED_WIDTH || info.height !== EXPECTED_HEIGHT) {
    throw new Error(
      `${inputPath} is ${info.width}x${info.height}; expected ${EXPECTED_WIDTH}x${EXPECTED_HEIGHT}`,
    );
  }
}

export function estimateKey(data, width, height, channels, parameters) {
  const sampleHeight = Math.max(1, Math.floor(height * parameters.keySampleTopFraction));
  const red = [];
  const green = [];
  const blue = [];
  for (let y = 0; y < sampleHeight; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * channels;
      red.push(data[index]);
      green.push(data[index + 1]);
      blue.push(data[index + 2]);
    }
  }

  const key = [median(red), median(green), median(blue)];
  const distances = [];
  for (let y = 0; y < sampleHeight; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * channels;
      distances.push(
        keyRayDistance(data[index], data[index + 1], data[index + 2], key, parameters),
      );
    }
  }

  const noiseP99 = quantile(distances, 0.99);
  const innerRadius = Math.max(
    parameters.minimumInnerRadius,
    Math.ceil(noiseP99 + parameters.backgroundNoisePadding),
  );
  if (innerRadius >= parameters.outerRadius) {
    throw new Error(`calibrated inner radius ${innerRadius} overlaps outer radius`);
  }

  return {
    rgb: key,
    /** Green key dominance: G - max(R, B). Positive ⇒ greener than the non-green channels. */
    greenDominance: key[1] - Math.max(key[0], key[2]),
    sampleHeight,
    noiseP99,
    innerRadius,
  };
}

/** Green spill metric used by foreground lock, despill, and edge gates. */
export function greenDominance(red, green, blue) {
  return green - Math.max(red, blue);
}

async function buildAlphaMask(data, info, keyEvidence, parameters) {
  const alpha = Buffer.alloc(info.width * info.height);
  const [keyRed, keyGreen, keyBlue] = keyEvidence.rgb;

  for (let pixel = 0; pixel < info.width * info.height; pixel += 1) {
    const index = pixel * info.channels;
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const distance = keyRayDistance(red, green, blue, [keyRed, keyGreen, keyBlue], parameters);
    const dominance = greenDominance(red, green, blue);

    let opacity = smoothstep(keyEvidence.innerRadius, parameters.outerRadius, distance);
    // Non-green subject pixels are forced opaque so hair/skin never go soft by distance alone.
    if (dominance <= parameters.foregroundGreenDominanceCeiling) {
      opacity = 1;
    }
    alpha[pixel] = Math.round(opacity * 255);
  }

  const blurredResult = await sharp(alpha, {
    raw: { width: info.width, height: info.height, channels: 1 },
  })
    .blur(parameters.blurSigma)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const blurred = Buffer.alloc(info.width * info.height);
  for (let pixel = 0; pixel < blurred.length; pixel += 1) {
    blurred[pixel] = blurredResult.data[pixel * blurredResult.info.channels];
  }

  for (let pixel = 0; pixel < blurred.length; pixel += 1) {
    if (blurred[pixel] <= parameters.alphaZeroClamp) {
      blurred[pixel] = 0;
    } else if (blurred[pixel] >= parameters.alphaOpaqueClamp) {
      blurred[pixel] = 255;
    }
  }
  return blurred;
}

async function buildBoundaryMask(alpha, width, height, radius) {
  const transparent = Buffer.alloc(alpha.length);
  for (let pixel = 0; pixel < alpha.length; pixel += 1) {
    transparent[pixel] = alpha[pixel] === 0 ? 255 : 0;
  }
  const dilation = await sharp(transparent, {
    raw: { width, height, channels: 1 },
  })
    // libvips' morphology naming expands white pixels with erode().
    .erode(radius)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const boundary = Buffer.alloc(alpha.length);
  for (let pixel = 0; pixel < alpha.length; pixel += 1) {
    boundary[pixel] = alpha[pixel] > 0 && dilation.data[pixel * dilation.info.channels] > 0 ? 1 : 0;
  }
  return boundary;
}

async function applyAlphaAndDespill(data, info, alpha, parameters) {
  const output = Buffer.alloc(info.width * info.height * 4);
  const boundary = await buildBoundaryMask(
    alpha,
    info.width,
    info.height,
    parameters.despillBoundaryRadius,
  );

  const interiorDespillRowLimit =
    parameters.interiorDespill === true
      ? Math.min(info.height, parameters.interiorDespillMaxY ?? Number.POSITIVE_INFINITY)
      : 0;

  for (let pixel = 0; pixel < info.width * info.height; pixel += 1) {
    const sourceIndex = pixel * info.channels;
    const outputIndex = pixel * 4;
    const opacity = alpha[pixel];
    let red = data[sourceIndex];
    let green = data[sourceIndex + 1];
    let blue = data[sourceIndex + 2];

    if (opacity === 0) {
      red = 0;
      green = 0;
      blue = 0;
    } else if (
      opacity < 255 ||
      boundary[pixel] === 1 ||
      pixel < interiorDespillRowLimit * info.width
    ) {
      // Green-screen despill: pull excess G toward max(R, B) inside the boundary band.
      const excess = Math.max(0, green - Math.max(red, blue) - parameters.despillNeutralMargin);
      if (excess > 0) {
        const neutralTarget = Math.max(red, blue);
        green = Math.round(
          green + (Math.max(0, neutralTarget) - green) * parameters.despillStrength,
        );
      }
    }

    output[outputIndex] = red;
    output[outputIndex + 1] = green;
    output[outputIndex + 2] = blue;
    output[outputIndex + 3] = opacity;
  }
  return output;
}

export async function renderPortrait({ inputPath, outputPath, parameters = MATTE_PARAMETERS }) {
  const { data, info } = await sharp(inputPath)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  ensureExpectedDimensions(info, inputPath);
  const keyEvidence = estimateKey(data, info.width, info.height, info.channels, parameters);
  const alpha = await buildAlphaMask(data, info, keyEvidence, parameters);
  const rgba = await applyAlphaAndDespill(data, info, alpha, parameters);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await sharp(rgba, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false, effort: 10 })
    .toFile(outputPath);

  return { inputPath, outputPath, keyEvidence, parameters };
}

export async function processAllowlistedPortraits({ workspaceRoot, outputDirectory }) {
  const results = [];
  for (const target of FIX_TARGETS) {
    const inputPath = resolveRawPath(workspaceRoot, target);
    const outputPath = path.join(outputDirectory, target.output);
    const parameters = target.matteOverrides
      ? Object.freeze({ ...MATTE_PARAMETERS, ...target.matteOverrides })
      : MATTE_PARAMETERS;
    results.push({
      id: target.id,
      ...(await renderPortrait({ inputPath, outputPath, parameters })),
    });
  }
  return results;
}

function isGreenEdge(red, green, blue, gate) {
  return (
    greenDominance(red, green, blue) > gate.edgeGreenDominanceThreshold &&
    Math.abs(red - blue) < gate.edgeRedBlueDifferenceMaximum
  );
}

function analyzeBinaryComponents(mask, width, height, target) {
  const seen = new Uint8Array(mask.length);
  const queue = new Int32Array(mask.length);
  const components = [];

  for (let start = 0; start < mask.length; start += 1) {
    if (seen[start] === 1 || mask[start] !== target) continue;
    let head = 0;
    let tail = 0;
    let area = 0;
    let touchesCanvasEdge = false;
    let left = width;
    let top = height;
    let right = -1;
    let bottom = -1;
    queue[tail] = start;
    tail += 1;
    seen[start] = 1;

    while (head < tail) {
      const pixel = queue[head];
      head += 1;
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      area += 1;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        touchesCanvasEdge = true;
      }

      const neighbors = [pixel - 1, pixel + 1, pixel - width, pixel + width];
      for (const neighbor of neighbors) {
        if (neighbor < 0 || neighbor >= mask.length || seen[neighbor] === 1) continue;
        const neighborX = neighbor % width;
        if (Math.abs(neighborX - x) > 1 || mask[neighbor] !== target) continue;
        seen[neighbor] = 1;
        queue[tail] = neighbor;
        tail += 1;
      }
    }

    components.push({ area, touchesCanvasEdge, bounds: { left, top, right, bottom } });
  }

  return components.sort((left, right) => right.area - left.area);
}

function analyzeAlphaTopology(alpha, width, height) {
  const foreground = new Uint8Array(alpha.length);
  let subjectPixels = 0;
  for (let pixel = 0; pixel < alpha.length; pixel += 1) {
    if (alpha[pixel] > 0) {
      foreground[pixel] = 1;
      subjectPixels += 1;
    }
  }

  const subjectComponents = analyzeBinaryComponents(foreground, width, height, 1);
  const transparentComponents = analyzeBinaryComponents(foreground, width, height, 0);
  const enclosedTransparent = transparentComponents.filter(
    (component) => !component.touchesCanvasEdge,
  );
  const largestSubject = subjectComponents[0] ?? null;
  const largestEnclosedTransparent = enclosedTransparent[0] ?? null;
  const enclosedTransparentPixels = enclosedTransparent.reduce(
    (total, component) => total + component.area,
    0,
  );

  return {
    subjectComponentCount: subjectComponents.length,
    largestSubjectComponentRatio:
      subjectPixels === 0 || !largestSubject ? 0 : largestSubject.area / subjectPixels,
    largestSubjectBounds: largestSubject?.bounds ?? null,
    detachedSubjectPixels: largestSubject ? subjectPixels - largestSubject.area : subjectPixels,
    enclosedTransparentComponentCount: enclosedTransparent.length,
    enclosedTransparentPixels,
    enclosedTransparentCoverage: enclosedTransparentPixels / alpha.length,
    largestEnclosedTransparentPixels: largestEnclosedTransparent?.area ?? 0,
    largestEnclosedTransparentBounds: largestEnclosedTransparent?.bounds ?? null,
  };
}

export async function inspectPortrait(imagePath, id = path.basename(imagePath)) {
  const file = await fs.readFile(imagePath);
  const sha256 = crypto.createHash("sha256").update(file).digest("hex");
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const total = info.width * info.height;
  let transparent = 0;
  let opaque = 0;
  let partial = 0;
  let edgePixels = 0;
  let greenEdgePixels = 0;
  const alphaMask = Buffer.alloc(total);
  const topBandHeight = Math.max(1, Math.floor(info.height * 0.1));
  let topBandTransparent = 0;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const index = (y * info.width + x) * 4;
      const alpha = data[index + 3];
      alphaMask[y * info.width + x] = alpha;
      if (alpha === 0) transparent += 1;
      else if (alpha === 255) opaque += 1;
      else partial += 1;
      if (y < topBandHeight && alpha === 0) topBandTransparent += 1;
    }
  }

  const boundary = await buildBoundaryMask(
    alphaMask,
    info.width,
    info.height,
    GATE_PARAMETERS.edgeBoundaryRadius,
  );
  for (let pixel = 0; pixel < total; pixel += 1) {
    if (boundary[pixel] !== 1) continue;
    const index = pixel * 4;
    edgePixels += 1;
    if (isGreenEdge(data[index], data[index + 1], data[index + 2], GATE_PARAMETERS)) {
      greenEdgePixels += 1;
    }
  }

  const alphaAt = (x, y) => data[(y * info.width + x) * 4 + 3];
  const exactCanvasCornerAlpha = [
    alphaAt(0, 0),
    alphaAt(info.width - 1, 0),
    alphaAt(0, info.height - 1),
    alphaAt(info.width - 1, info.height - 1),
  ];
  const sideProbeY = Math.floor(info.height * 0.16);
  const backgroundCornerAlpha = [
    alphaAt(0, 0),
    alphaAt(info.width - 1, 0),
    alphaAt(0, sideProbeY),
    alphaAt(info.width - 1, sideProbeY),
  ];
  const topology = analyzeAlphaTopology(alphaMask, info.width, info.height);

  return {
    id,
    path: imagePath,
    dimensions: { width: info.width, height: info.height },
    alphaCoverage: {
      transparent: transparent / total,
      opaque: opaque / total,
      partial: partial / total,
    },
    cornerAlpha: {
      exactCanvas: exactCanvasCornerAlpha,
      backgroundProbes: backgroundCornerAlpha,
    },
    topBandTransparentCoverage: topBandTransparent / (info.width * topBandHeight),
    subjectCoverage: (opaque + partial) / total,
    topology,
    greenEdgeRatio: edgePixels === 0 ? 0 : greenEdgePixels / edgePixels,
    edgePixels,
    greenEdgePixels,
    sha256,
    bytes: file.length,
  };
}

export function evaluateGate(metrics, gate = GATE_PARAMETERS) {
  const failures = [];
  if (
    metrics.dimensions.width !== EXPECTED_WIDTH ||
    metrics.dimensions.height !== EXPECTED_HEIGHT
  ) {
    failures.push(`dimensions must be ${EXPECTED_WIDTH}x${EXPECTED_HEIGHT}`);
  }
  if (
    metrics.cornerAlpha.backgroundProbes.some((alpha) => alpha > gate.maximumBackgroundProbeAlpha)
  ) {
    failures.push("background corner probes must be transparent");
  }
  if (metrics.alphaCoverage.transparent < gate.minimumTransparentCoverage) {
    failures.push(`transparent coverage below ${gate.minimumTransparentCoverage}`);
  }
  if (metrics.topBandTransparentCoverage < gate.minimumTopBandTransparentCoverage) {
    failures.push(`top-band transparency below ${gate.minimumTopBandTransparentCoverage}`);
  }
  if (
    metrics.subjectCoverage < gate.minimumSubjectCoverage ||
    metrics.subjectCoverage > gate.maximumSubjectCoverage
  ) {
    failures.push(
      `subject coverage outside ${gate.minimumSubjectCoverage}-${gate.maximumSubjectCoverage}`,
    );
  }
  if (
    metrics.alphaCoverage.partial < gate.minimumPartialAlphaCoverage ||
    metrics.alphaCoverage.partial > gate.maximumPartialAlphaCoverage
  ) {
    failures.push(
      `partial-alpha coverage outside ${gate.minimumPartialAlphaCoverage}-${gate.maximumPartialAlphaCoverage}`,
    );
  }
  if (metrics.topology.largestSubjectComponentRatio < gate.minimumLargestSubjectComponentRatio) {
    failures.push(
      `largest subject component ratio below ${gate.minimumLargestSubjectComponentRatio}`,
    );
  }
  const dominantTop = metrics.topology.largestSubjectBounds?.top;
  if (
    dominantTop === null ||
    dominantTop === undefined ||
    dominantTop / metrics.dimensions.height < gate.minimumDominantSubjectTopFraction ||
    dominantTop / metrics.dimensions.height > gate.maximumDominantSubjectTopFraction
  ) {
    failures.push(
      `dominant subject top outside ${gate.minimumDominantSubjectTopFraction}-${gate.maximumDominantSubjectTopFraction}`,
    );
  }
  if (metrics.topology.enclosedTransparentCoverage > gate.maximumEnclosedTransparentCoverage) {
    failures.push(`enclosed transparent coverage above ${gate.maximumEnclosedTransparentCoverage}`);
  }
  if (
    metrics.topology.largestEnclosedTransparentPixels > gate.maximumLargestEnclosedTransparentPixels
  ) {
    failures.push(
      `largest enclosed transparent area above ${gate.maximumLargestEnclosedTransparentPixels} pixels`,
    );
  }
  if (metrics.greenEdgeRatio > gate.maximumGreenEdgeRatio) {
    failures.push(`green edge ratio above ${gate.maximumGreenEdgeRatio}`);
  }
  return { pass: failures.length === 0, failures };
}
