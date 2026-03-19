#!/usr/bin/env node

/**
 * validate-analysis.js
 *
 * Validates an OpenAI analysis response against the expected schema.
 * Attempts JSON repair if the response is malformed.
 *
 * Usage:
 *   node validate-analysis.js '{"topicSentence": "...", ...}'
 *   cat response.json | node validate-analysis.js
 *
 * Exit codes:
 *   0 = Valid (or successfully repaired)
 *   1 = Invalid (could not repair)
 *   2 = Invalid input/usage
 */

const fs = require('fs');

/**
 * Required fields and their expected types
 */
const REQUIRED_FIELDS = {
  topicSentence: 'string',
  supportingPoints: 'array',
  conclusionSentence: 'string',
  personalizedSummary: 'string',
  dreamTitle: 'string',
  biblicalReferences: 'array',
  tags: 'array',
  analysis: 'string'
};

/**
 * Validates that a field exists and matches expected type
 */
function validateField(data, fieldName, expectedType) {
  if (!(fieldName in data)) {
    return `Missing required field: ${fieldName}`;
  }

  const value = data[fieldName];
  let actualType = typeof value;

  if (expectedType === 'array' && Array.isArray(value)) {
    actualType = 'array';
  }

  if (actualType !== expectedType) {
    return `Field "${fieldName}" expected ${expectedType}, got ${actualType}`;
  }

  // Type-specific validations
  if (expectedType === 'string' && value.trim() === '') {
    return `Field "${fieldName}" is empty string`;
  }

  if (expectedType === 'array' && value.length === 0) {
    return `Field "${fieldName}" is empty array`;
  }

  return null;
}

/**
 * Validates biblicalReferences array structure
 */
function validateBiblicalReferences(refs) {
  const errors = [];

  if (!Array.isArray(refs)) {
    return ['biblicalReferences is not an array'];
  }

  refs.forEach((ref, index) => {
    if (typeof ref !== 'object' || ref === null) {
      errors.push(`biblicalReferences[${index}] is not an object`);
      return;
    }

    const requiredRefFields = ['citation', 'book', 'chapter', 'verse', 'verseText'];
    requiredRefFields.forEach(field => {
      if (!(field in ref)) {
        errors.push(`biblicalReferences[${index}] missing field: ${field}`);
      }
    });

    // Validate chapter and verse are numbers
    if (typeof ref.chapter !== 'number' || ref.chapter < 1) {
      errors.push(`biblicalReferences[${index}].chapter must be a positive number`);
    }
    if (typeof ref.verse !== 'number' || ref.verse < 1) {
      errors.push(`biblicalReferences[${index}].verse must be a positive number`);
    }

    // Validate citation format (e.g., "Genesis 1:1")
    if (typeof ref.citation === 'string' && !/^[A-Za-z0-9\s:]+$/.test(ref.citation)) {
      errors.push(`biblicalReferences[${index}].citation has invalid format: "${ref.citation}"`);
    }
  });

  return errors;
}

/**
 * Validates supportingPoints array structure
 */
function validateSupportingPoints(points) {
  const errors = [];

  if (!Array.isArray(points)) {
    return ['supportingPoints is not an array'];
  }

  if (points.length < 1 || points.length > 5) {
    errors.push(`supportingPoints must have 1-5 items, got ${points.length}`);
  }

  points.forEach((point, index) => {
    if (typeof point !== 'string') {
      errors.push(`supportingPoints[${index}] is not a string, got ${typeof point}`);
    } else if (point.trim() === '') {
      errors.push(`supportingPoints[${index}] is empty string`);
    } else if (!/\([A-Za-z0-9\s:]+\)/.test(point)) {
      // Warn if no bible citation in parentheses
      console.warn(`⚠️  supportingPoints[${index}] missing bible citation in parentheses`);
    }
  });

  return errors;
}

/**
 * Validates tags array structure
 */
function validateTags(tags) {
  const errors = [];

  if (!Array.isArray(tags)) {
    return ['tags is not an array'];
  }

  if (tags.length < 3 || tags.length > 5) {
    errors.push(`tags must have 3-5 items, got ${tags.length}`);
  }

  tags.forEach((tag, index) => {
    if (typeof tag !== 'string') {
      errors.push(`tags[${index}] is not a string`);
    } else if (tag.trim() === '') {
      errors.push(`tags[${index}] is empty string`);
    } else if (!/^[a-z0-9_\s]+$/.test(tag.toLowerCase())) {
      errors.push(`tags[${index}] contains invalid characters: "${tag}"`);
    } else if (tag.split(/\s+/).length > 3) {
      errors.push(`tags[${index}] has >3 words: "${tag}"`);
    }
  });

  return errors;
}

/**
 * Main validation function
 */
function validateAnalysis(data) {
  const errors = [];

  // Check basic structure
  if (typeof data !== 'object' || data === null) {
    return {
      valid: false,
      errors: ['Response is not a JSON object'],
      data: null,
      repaired: false
    };
  }

  // Validate required fields
  Object.entries(REQUIRED_FIELDS).forEach(([fieldName, expectedType]) => {
    const error = validateField(data, fieldName, expectedType);
    if (error) {
      errors.push(error);
    }
  });

  // Validate complex structures
  if (data.biblicalReferences) {
    const refErrors = validateBiblicalReferences(data.biblicalReferences);
    errors.push(...refErrors);
  }

  if (data.supportingPoints) {
    const pointErrors = validateSupportingPoints(data.supportingPoints);
    errors.push(...pointErrors);
  }

  if (data.tags) {
    const tagErrors = validateTags(data.tags);
    errors.push(...tagErrors);
  }

  return {
    valid: errors.length === 0,
    errors,
    data: errors.length === 0 ? data : null,
    repaired: false
  };
}

/**
 * Attempts to repair malformed JSON
 */
function repairJSON(jsonString) {
  if (typeof jsonString !== 'string') {
    return null;
  }

  let cleaned = jsonString;

  // Remove markdown fences
  cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');

  // Remove control characters
  cleaned = cleaned.replace(/[\u0000-\u001F\u007F]/g, '');

  // Normalize whitespace
  cleaned = cleaned.replace(/\\n/g, ' ');
  cleaned = cleaned.replace(/\n/g, ' ');
  cleaned = cleaned.replace(/\r/g, '');
  cleaned = cleaned.replace(/\t/g, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ');

  // Fix trailing commas
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

  // Fix single backslashes (keep double backslashes)
  cleaned = cleaned.replace(/([^\\])\\(?!\\|")/g, '$1\\\\');

  // Close truncated structures
  const openBraces = (cleaned.match(/{/g) || []).length;
  const closeBraces = (cleaned.match(/}/g) || []).length;
  const openBrackets = (cleaned.match(/\[/g) || []).length;
  const closeBrackets = (cleaned.match(/]/g) || []).length;

  // Close open quotes first
  if ((cleaned.match(/"/g) || []).length % 2 !== 0) {
    cleaned += '"';
  }

  // Close arrays
  for (let i = 0; i < openBrackets - closeBrackets; i++) {
    cleaned += ']';
  }

  // Close objects
  for (let i = 0; i < openBraces - closeBraces; i++) {
    cleaned += '}';
  }

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    return null;
  }
}

/**
 * Main entry point
 */
async function main() {
  let input;

  // Get input from stdin or command-line argument
  if (process.argv[2]) {
    input = process.argv[2];
  } else if (!process.stdin.isTTY) {
    // Read from stdin
    input = await new Promise((resolve, reject) => {
      let data = '';
      process.stdin.on('data', chunk => {
        data += chunk;
      });
      process.stdin.on('end', () => resolve(data));
      process.stdin.on('error', reject);
    });
  } else {
    console.error('Usage: validate-analysis.js <json-string> OR cat file.json | validate-analysis.js');
    process.exit(2);
  }

  // Attempt to parse JSON
  let data;
  try {
    data = JSON.parse(input);
  } catch (parseError) {
    console.log('⚠️  Initial parse failed, attempting repair...');

    const repaired = repairJSON(input);
    if (!repaired) {
      console.error('❌ Could not repair JSON');
      process.exit(1);
    }

    data = repaired;
    console.log('✅ JSON successfully repaired');
  }

  // Validate
  const result = validateAnalysis(data);

  // Output result
  console.log(JSON.stringify(result, null, 2));

  // Exit with appropriate code
  process.exit(result.valid ? 0 : 1);
}

main().catch(error => {
  console.error('❌ Unexpected error:', error.message);
  process.exit(1);
});
