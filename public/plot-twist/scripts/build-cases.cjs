#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const core = require("../js/game.js");

const projectRoot = path.resolve(__dirname, "..");
const casesDirectory = path.join(projectRoot, "cases");
const bundlePath = path.join(projectRoot, "js", "data.js");
const checkOnly = process.argv.includes("--check");

function readCaseSources(directory = casesDirectory) {
  const sourceFiles = fs.readdirSync(directory)
    .filter((fileName) => fileName.endsWith(".json") && !fileName.startsWith("_"))
    .sort();

  if (sourceFiles.length === 0) {
    throw new Error("No case source files were found in plot-twist/cases.");
  }

  return sourceFiles.flatMap((fileName) => {
    const sourcePath = path.join(directory, fileName);
    let parsed;

    try {
      parsed = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
    } catch (error) {
      throw new Error(`${fileName}: ${error.message}`);
    }

    const caseFiles = Array.isArray(parsed) ? parsed : [parsed];
    caseFiles.forEach((caseFile) => {
      if (caseFile && typeof caseFile === "object") {
        Object.defineProperty(caseFile, "__sourceFile", {
          value: fileName,
          enumerable: false
        });
      }
    });
    return caseFiles;
  });
}

function validateCaseSources(caseFiles) {
  const errors = core.validateCaseData(caseFiles);

  if (errors.length > 0) {
    throw new Error(`Case validation failed:\n- ${errors.join("\n- ")}`);
  }

  const sorted = [...caseFiles].sort((first, second) => first.caseNumber - second.caseNumber);

  sorted.forEach((caseFile, index) => {
    const expectedNumber = index + 1;
    if (caseFile.caseNumber !== expectedNumber) {
      errors.push(
        `${caseFile.__sourceFile || caseFile.id}: expected caseNumber ${expectedNumber}, received ${caseFile.caseNumber}.`
      );
    }
  });

  if (errors.length > 0) {
    throw new Error(`Case validation failed:\n- ${errors.join("\n- ")}`);
  }

  return sorted;
}

function createBundle(caseFiles) {
  const serialized = JSON.stringify(caseFiles, null, 2).replace(/\n/g, "\n  ");
  return [
    "(function attachPlotTwistData(root, factory) {",
    "  const data = factory();",
    "",
    "  if (typeof module === \"object\" && module.exports) {",
    "    module.exports = data;",
    "  }",
    "",
    "  root.PlotTwistData = data;",
    "})(typeof globalThis !== \"undefined\" ? globalThis : this, function createPlotTwistData() {",
    "  \"use strict\";",
    "",
    `  const cases = ${serialized};`,
    "",
    "  return { cases };",
    "});",
    ""
  ].join("\n");
}

function bundleIsCurrent(outputPath, bundle) {
  return fs.existsSync(outputPath) && fs.readFileSync(outputPath, "utf8") === bundle;
}

function main() {
  const cases = validateCaseSources(readCaseSources());
  const bundle = createBundle(cases);

  if (checkOnly) {
    if (!bundleIsCurrent(bundlePath, bundle)) {
      throw new Error("js/data.js is stale. Run `npm run cases:build` and commit the generated bundle.");
    }
    console.log(`Validated ${cases.length} case files; js/data.js is current.`);
    return;
  }

  fs.writeFileSync(bundlePath, bundle);
  console.log(`Built ${cases.length} validated case files into js/data.js.`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  readCaseSources,
  validateCaseSources,
  createBundle,
  bundleIsCurrent
};
