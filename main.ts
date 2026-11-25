// Front page for the News Image entry of Wednesday 25 November 2026.
//
// The finished page lives next to this script as entry.png. This
// script's only job is to prove that image is the one the bounty
// asks for, then leave a copy in the directory the harness reads.

import { copyFileSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// The bounty wants a square front page, 1024 pixels on each side,
// stored as a PNG smaller than one mebibyte.
const SIDE_PX = 1024;
const SIZE_LIMIT = 1024 * 1024;

// Every PNG file opens with these eight bytes.
const PNG_MARK = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

// Where this script lives, and where the finished image must go.
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const TARGET_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const SOURCE_FILE = join(SCRIPT_DIR, "entry.png");
const TARGET_FILE = join(TARGET_DIR, "entry.png");

function reject(detail: string): never {
  throw new Error("entry.png rejected: " + detail);
}

function checkSignature(data: Buffer): void {
  if (data.length < PNG_MARK.length) {
    reject(`only ${data.length} bytes long, too short for a PNG`);
  }
  for (const [offset, expected] of PNG_MARK.entries()) {
    if (data[offset] !== expected) {
      reject(
        "opening bytes are " +
          data.subarray(0, PNG_MARK.length).toString("hex") +
          ", not a PNG signature",
      );
    }
  }
}

function checkDimensions(data: Buffer): void {
  // The IHDR chunk starts at byte 8: four bytes of length, four of
  // the letters IHDR, then width and height as big-endian words.
  if (data.length < 24 || data.toString("ascii", 12, 16) !== "IHDR") {
    reject("no IHDR chunk at the start of the file");
  }
  const wide = data.readUInt32BE(16);
  const tall = data.readUInt32BE(20);
  if (wide !== SIDE_PX || tall !== SIDE_PX) {
    reject(`measures ${wide}x${tall}, wanted ${SIDE_PX}x${SIDE_PX}`);
  }
  if (data.length > SIZE_LIMIT) {
    reject(`weighs ${data.length} bytes, over the ${SIZE_LIMIT} byte ceiling`);
  }
}

const page = readFileSync(SOURCE_FILE);
checkSignature(page);
checkDimensions(page);

mkdirSync(TARGET_DIR, { recursive: true });
copyFileSync(SOURCE_FILE, TARGET_FILE);

// Make sure the copy that landed is the whole image, not a
// truncated write, before calling the run a success.
if (statSync(TARGET_FILE).size !== page.length) {
  reject("the copy in the output directory came out the wrong size");
}
console.log(
  `front page (${SIDE_PX}x${SIDE_PX}, ${page.length} bytes) ` +
    `copied to ${TARGET_DIR}`,
);
