/**
 * Unit tests for formatDurationMinutes utility
 */

import { strict as assert } from "node:assert";
import { formatDurationMinutes } from "./formatDuration.js";

// Test case: 33 minutes -> "33m"
const result1 = formatDurationMinutes(33);
assert.equal(result1, "33m", "33 minutes should format to '33m'");

// Test case: 60 minutes -> "1h"
const result2 = formatDurationMinutes(60);
assert.equal(result2, "1h", "60 minutes should format to '1h'");

// Test case: 90 minutes -> "1h 30m"
const result3 = formatDurationMinutes(90);
assert.equal(result3, "1h 30m", "90 minutes should format to '1h 30m'");

// Test case: 120 minutes -> "2h"
const result4 = formatDurationMinutes(120);
assert.equal(result4, "2h", "120 minutes should format to '2h'");

// Test case: 1 minute -> "1m"
const result5 = formatDurationMinutes(1);
assert.equal(result5, "1m", "1 minute should format to '1m'");

// Test case: 59 minutes -> "59m"
const result6 = formatDurationMinutes(59);
assert.equal(result6, "59m", "59 minutes should format to '59m'");

// Test case: 180 minutes -> "3h"
const result7 = formatDurationMinutes(180);
assert.equal(result7, "3h", "180 minutes should format to '3h'");

// Test case: 150 minutes -> "2h 30m"
const result8 = formatDurationMinutes(150);
assert.equal(result8, "2h 30m", "150 minutes should format to '2h 30m'");

// Test case: 599 minutes -> "9h 59m"
const result9 = formatDurationMinutes(599);
assert.equal(result9, "9h 59m", "599 minutes should format to '9h 59m'");

// Test case: 600 minutes -> "10h"
const result10 = formatDurationMinutes(600);
assert.equal(result10, "10h", "600 minutes should format to '10h'");

// Test error case: 0 minutes should throw
try {
  formatDurationMinutes(0);
  assert.fail("formatDurationMinutes(0) should throw an error");
} catch (error) {
  assert.ok(error instanceof Error, "Should throw an Error");
  assert.ok(error.message.includes("at least 1"), "Error message should mention minimum value");
}

// Test error case: negative minutes should throw
try {
  formatDurationMinutes(-1);
  assert.fail("formatDurationMinutes(-1) should throw an error");
} catch (error) {
  assert.ok(error instanceof Error, "Should throw an Error");
}

console.log("✅ All formatDurationMinutes tests passed");

