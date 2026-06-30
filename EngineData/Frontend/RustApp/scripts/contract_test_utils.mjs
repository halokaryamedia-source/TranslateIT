import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function createContractValidator({ rootDir }) {
  const errors = [];
  const filesRead = new Set();

  function addError(message) {
    errors.push(message);
  }

  function readText(relativePath, options = {}) {
    const { required = true } = options;
    filesRead.add(relativePath);
    const absolutePath = resolve(rootDir, relativePath);
    if (!existsSync(absolutePath)) {
      if (required) addError(`Missing file: ${relativePath}`);
      return "";
    }
    return readFileSync(absolutePath, "utf8");
  }

  function ensureFileExists(relativePath, label = "file") {
    const absolutePath = resolve(rootDir, relativePath);
    if (!existsSync(absolutePath)) addError(`${label}: missing ${relativePath}`);
  }

  function expectIncludes(source, marker, label) {
    if (!source.includes(marker)) addError(`${label}: missing ${marker}`);
  }

  function expectAnyIncludes(source, markers, label) {
    if (!markers.some((marker) => source.includes(marker))) {
      addError(`${label}: missing one of ${markers.join(" | ")}`);
    }
  }

  function expectRegex(source, regex, label) {
    if (!regex.test(source)) addError(`${label}: missing pattern ${regex}`);
  }

  return {
    errors,
    filesRead,
    addError,
    readText,
    ensureFileExists,
    expectIncludes,
    expectAnyIncludes,
    expectRegex,
  };
}

export function collectRegexMatches(source, regex, groupIndex = 1) {
  const flags = regex.flags.includes("g") ? regex.flags : `${regex.flags}g`;
  const matcher = new RegExp(regex.source, flags);
  const matches = [];
  let match;
  while ((match = matcher.exec(source)) !== null) {
    matches.push(match[groupIndex] ?? match[0]);
  }
  return matches;
}

export function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function hasNonEmptyText(value, minLength = 1) {
  return typeof value === "string" && value.trim().length >= minLength;
}

export function printContractResult({ title, errors, successMessage }) {
  if (errors.length > 0) {
    console.error(`${title} failed:`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(successMessage);
}
