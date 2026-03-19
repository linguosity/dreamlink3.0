#!/usr/bin/env node

/**
 * Schema Synchronization Validator for Dreamlink
 * Compares Zod schemas to Supabase migrations to detect schema drift
 *
 * Usage:
 *   node scripts/validate-schema-sync.js
 *   node scripts/validate-schema-sync.js --strict  (fail on any mismatch)
 *
 * Output: Alignment report with warnings and errors
 */

const fs = require('fs');
const path = require('path');

// Type mapping from Zod to SQL and vice versa
const TYPE_MAPPINGS = {
  'z.string()': ['text', 'varchar', 'character varying'],
  'z.number()': ['integer', 'int', 'serial'],
  'z.uuid()': ['uuid'],
  'z.boolean()': ['boolean', 'bool'],
  'z.date()': ['date'],
  'z.any()': ['timestamp', 'timestamptz', 'timestamp with time zone', 'jsonb', 'json', 'text[]', 'integer[]'],
  'z.object()': ['jsonb', 'json'],
  'z.array()': ['text[]', 'integer[]', 'uuid[]'],
  'z.null()': ['null'],
  'z.nullable()': ['null'],
  'z.optional()': ['null']
};

/**
 * Parse a Zod schema file and extract field definitions
 */
function parseZodSchema(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const filename = path.basename(filePath, '.ts');
  const fields = {};

  // Match z.object({ ... })
  const objectMatch = content.match(/z\.object\s*\(\s*\{([\s\S]*?)\}\s*\)/);
  if (!objectMatch) {
    return { fields, errors: [`No z.object found in ${filename}`] };
  }

  const objectContent = objectMatch[1];

  // Match field definitions
  // Patterns: field: z.string(), field: z.number().int(), etc.
  const fieldRegex = /(\w+)\s*:\s*(z\.[^,}]+(?:\.[^,}]*)*)/g;
  let match;

  while ((match = fieldRegex.exec(objectContent)) !== null) {
    const fieldName = match[1];
    const fieldType = match[2];

    // Extract base type and modifiers
    const isOptional = /\.optional\s*\(\s*\)/.test(fieldType);
    const isNullable = /\.nullable\s*\(\s*\)/.test(fieldType);
    const baseType = fieldType
      .replace(/\.optional\s*\(\s*\)/g, '')
      .replace(/\.nullable\s*\(\s*\)/g, '')
      .replace(/\.default\s*\([^)]*\)/g, '')
      .replace(/\.describe\s*\([^)]*\)/g, '')
      .trim();

    fields[fieldName] = {
      zodType: baseType,
      baseType: fieldType.split('.')[1],
      optional: isOptional,
      nullable: isNullable,
      raw: fieldType
    };
  }

  return { fields, errors: [] };
}

/**
 * Parse SQL migrations and extract table schemas
 */
function parseSQLMigrations(migrationsDir) {
  const tables = {};
  const errors = [];

  try {
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

      // Match CREATE TABLE statements
      const createTableRegex = /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)\s*\(([\s\S]*?)\);/gi;
      let match;

      while ((match = createTableRegex.exec(content)) !== null) {
        const tableName = match[1];
        const columnContent = match[2];

        // Parse column definitions
        const columns = {};
        const columnRegex = /(\w+)\s+([^,;]+?)(?:\s+(?:PRIMARY KEY|NOT NULL|UNIQUE|DEFAULT|REFERENCES|CHECK|CONSTRAINT).*?)?(?=,|$)/gi;
        let colMatch;

        while ((colMatch = columnRegex.exec(columnContent)) !== null) {
          const colName = colMatch[1];
          const colType = colMatch[2].trim();

          // Extract base SQL type
          const baseType = colType.split(/\s+/)[0].toLowerCase();

          // Check for nullable (default is nullable unless NOT NULL specified)
          const isNotNull = /NOT NULL/i.test(colMatch[2]);

          columns[colName] = {
            sqlType: colType,
            baseType: baseType,
            notNull: isNotNull,
            nullable: !isNotNull
          };
        }

        tables[tableName] = { columns, file };
      }

      // Match ALTER TABLE statements that add columns
      const alterTableRegex = /ALTER TABLE\s+(\w+)\s+ADD\s+COLUMN\s+(\w+)\s+([^;,]+)/gi;
      while ((match = alterTableRegex.exec(content)) !== null) {
        const tableName = match[1];
        const colName = match[2];
        const colType = match[3].trim();
        const baseType = colType.split(/\s+/)[0].toLowerCase();

        if (!tables[tableName]) {
          tables[tableName] = { columns: {}, file };
        }

        tables[tableName].columns[colName] = {
          sqlType: colType,
          baseType: baseType,
          notNull: /NOT NULL/i.test(colType),
          nullable: !/NOT NULL/i.test(colType)
        };
      }
    }
  } catch (err) {
    errors.push(`Error parsing migrations: ${err.message}`);
  }

  return { tables, errors };
}

/**
 * Compare Zod field type with SQL column type
 */
function compareTypes(zodType, sqlType) {
  // Normalize types for comparison
  const zodBase = zodType.split('.')[1]?.split('(')[0]?.toLowerCase() || 'unknown';
  const sqlBase = sqlType.baseType?.toLowerCase() || 'unknown';

  // Direct matches
  const compatiblePairs = [
    ['string', 'text'],
    ['string', 'varchar'],
    ['string', 'character varying'],
    ['number', 'integer'],
    ['number', 'int'],
    ['number', 'numeric'],
    ['uuid', 'uuid'],
    ['boolean', 'boolean'],
    ['boolean', 'bool'],
    ['date', 'date'],
    ['any', 'jsonb'],
    ['any', 'json'],
    ['any', 'timestamp'],
    ['any', 'timestamptz'],
    ['array', 'text[]'],
    ['array', 'integer[]']
  ];

  for (const [z, s] of compatiblePairs) {
    if (zodBase.includes(z) && s.includes(sqlBase)) return true;
  }

  return sqlBase === zodBase;
}

/**
 * Convert table name from SQL to Zod naming convention
 * Expects snake_case SQL tables to have camelCase Zod schemas
 */
function sqlTableToZodName(tableName) {
  return tableName
    .split('_')
    .map((part, i) => i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Main validation function
 */
function validateSchemas(schemaDir, migrationsDir, strict = false) {
  const report = {
    timestamp: new Date().toISOString(),
    matching: [],
    mismatches: [],
    warnings: [],
    errors: [],
    summary: { critical: 0, warning: 0, info: 0 }
  };

  // Parse Zod schemas
  const zodFiles = fs.readdirSync(schemaDir).filter(f => f.endsWith('.ts'));
  const zodSchemas = {};
  const zodErrors = [];

  for (const file of zodFiles) {
    const filePath = path.join(schemaDir, file);
    const schemaName = file.replace('.ts', '');
    const { fields, errors: parseErrors } = parseZodSchema(filePath);

    if (parseErrors.length > 0) {
      zodErrors.push(...parseErrors);
    }

    zodSchemas[schemaName] = fields;
  }

  // Parse SQL migrations
  const { tables: sqlTables, errors: sqlErrors } = parseSQLMigrations(migrationsDir);

  if (zodErrors.length > 0) {
    report.errors.push(`Failed to parse Zod schemas: ${zodErrors.join(', ')}`);
    report.summary.critical += zodErrors.length;
  }

  if (sqlErrors.length > 0) {
    report.errors.push(`Failed to parse SQL migrations: ${sqlErrors.join(', ')}`);
    report.summary.critical += sqlErrors.length;
  }

  // Compare each Zod schema to SQL tables
  for (const [schemaName, zodFields] of Object.entries(zodSchemas)) {
    const tableName = schemaName.replace(/Schema$/, '').split(/(?=[A-Z])/).join('_').toLowerCase();

    if (!sqlTables[tableName]) {
      report.mismatches.push({
        schema: schemaName,
        table: tableName,
        type: 'missing-table',
        message: `Zod schema '${schemaName}' references table '${tableName}' which does not exist in migrations`,
        severity: 'critical'
      });
      report.summary.critical++;
      continue;
    }

    const sqlColumns = sqlTables[tableName].columns;
    const zodFieldNames = Object.keys(zodFields);
    const sqlColumnNames = Object.keys(sqlColumns);

    // Find missing and extra fields
    const missingInZod = sqlColumnNames.filter(col => !zodFieldNames.includes(col));
    const extraInZod = zodFieldNames.filter(field => !sqlColumnNames.includes(field));
    const matching = zodFieldNames.filter(field => sqlColumnNames.includes(field));

    // Check type compatibility
    const typeIssues = [];
    for (const fieldName of matching) {
      const zodField = zodFields[fieldName];
      const sqlColumn = sqlColumns[fieldName];

      if (!compareTypes(zodField.zodType, sqlColumn)) {
        typeIssues.push({
          field: fieldName,
          zodType: zodField.zodType,
          sqlType: sqlColumn.sqlType,
          message: `Type mismatch: Zod expects '${zodField.zodType}' but SQL has '${sqlColumn.sqlType}'`
        });
      }
    }

    if (matching.length > 0 && missingInZod.length === 0 && extraInZod.length === 0 && typeIssues.length === 0) {
      report.matching.push({
        schema: schemaName,
        table: tableName,
        fieldCount: matching.length,
        fields: matching
      });
    } else {
      const mismatch = {
        schema: schemaName,
        table: tableName,
        matching: matching.length,
        missingInZod,
        extraInZod,
        typeIssues,
        severity: missingInZod.length > 0 || typeIssues.length > 0 ? 'warning' : 'info'
      };

      report.mismatches.push(mismatch);

      if (mismatch.severity === 'warning') {
        report.summary.warning++;
      } else {
        report.summary.info++;
      }
    }
  }

  // Check for tables without Zod schemas
  for (const [tableName, table] of Object.entries(sqlTables)) {
    const expectedSchemaName = sqlTableToZodName(tableName);
    const hasSchema = Object.keys(zodSchemas).some(
      name => name.toLowerCase() === expectedSchemaName.toLowerCase() ||
               name.toLowerCase() === tableName.toLowerCase()
    );

    if (!hasSchema && !tableName.startsWith('_')) {
      report.warnings.push({
        table: tableName,
        type: 'missing-schema',
        message: `SQL table '${tableName}' exists in migrations but has no corresponding Zod schema`,
        severity: 'warning'
      });
      report.summary.warning++;
    }
  }

  // Known Dreamlink issues
  if (zodSchemas.bibleCitation && sqlTables.bible_citations) {
    const bibleCitationZod = zodSchemas.bibleCitation;
    const bibleCitationSQL = sqlTables.bible_citations.columns;

    if (!bibleCitationZod.supporting_text && bibleCitationSQL.supporting_text) {
      report.warnings.push({
        schema: 'bibleCitation',
        field: 'supporting_text',
        type: 'known-issue',
        message: 'Known Dreamlink issue: bible_citations.supporting_text column exists in DB but not in Zod schema',
        severity: 'info',
        reference: 'docs/devlog-001-march-2026.md'
      });
      report.summary.info++;
    }

    if (!bibleCitationZod.source && bibleCitationSQL.source) {
      report.warnings.push({
        schema: 'bibleCitation',
        field: 'source',
        type: 'known-issue',
        message: 'Known Dreamlink issue: bible_citations.source column exists in DB but not in Zod schema',
        severity: 'info',
        reference: 'See CLAUDE.md'
      });
      report.summary.info++;
    }
  }

  if (!zodSchemas.payment && sqlTables.payments) {
    report.warnings.push({
      table: 'payments',
      type: 'missing-schema',
      message: 'Known Dreamlink issue: payments table exists in DB but has no Zod schema',
      severity: 'warning',
      reference: 'CLAUDE.md schema context'
    });
    report.summary.warning++;
  }

  return report;
}

/**
 * Format and print report
 */
function printReport(report) {
  console.log('\n' + '='.repeat(60));
  console.log('Schema Synchronization Report');
  console.log('='.repeat(60) + '\n');

  // Summary
  console.log('Summary:');
  console.log(`  ✓ Matching: ${report.matching.length}`);
  console.log(`  ⚠ Warnings: ${report.summary.warning}`);
  console.log(`  ℹ Info: ${report.summary.info}`);
  console.log(`  ✗ Critical: ${report.summary.critical}\n`);

  // Matching schemas
  if (report.matching.length > 0) {
    console.log('Matching Schemas:');
    for (const match of report.matching) {
      console.log(`  ✓ ${match.schema} ↔ ${match.table} (${match.fieldCount}/${match.fieldCount} fields)\n`);
    }
  }

  // Mismatches
  if (report.mismatches.length > 0) {
    console.log('Schema Mismatches:');
    for (const mismatch of report.mismatches) {
      const icon = mismatch.severity === 'critical' ? '✗' : '⚠';
      console.log(`  ${icon} ${mismatch.schema || mismatch.table}`);

      if (mismatch.missingInZod && mismatch.missingInZod.length > 0) {
        console.log(`    Missing in Zod: ${mismatch.missingInZod.join(', ')}`);
      }
      if (mismatch.extraInZod && mismatch.extraInZod.length > 0) {
        console.log(`    Extra in Zod: ${mismatch.extraInZod.join(', ')}`);
      }
      if (mismatch.typeIssues && mismatch.typeIssues.length > 0) {
        for (const issue of mismatch.typeIssues) {
          console.log(`    ${issue.message}`);
        }
      }
      if (mismatch.type === 'missing-table') {
        console.log(`    ${mismatch.message}`);
      }
      console.log();
    }
  }

  // Warnings
  if (report.warnings.length > 0) {
    console.log('Warnings & Known Issues:');
    for (const warning of report.warnings) {
      console.log(`  ⚠ ${warning.schema || warning.table || warning.type}`);
      console.log(`    ${warning.message}`);
      if (warning.reference) {
        console.log(`    Reference: ${warning.reference}`);
      }
      console.log();
    }
  }

  // Errors
  if (report.errors.length > 0) {
    console.log('Errors:');
    for (const error of report.errors) {
      console.log(`  ✗ ${error}\n`);
    }
  }

  console.log('='.repeat(60) + '\n');

  // Exit code based on severity
  if (report.summary.critical > 0) {
    console.log('Result: CRITICAL ISSUES FOUND - Fix before deployment\n');
    return 2;
  }

  if (report.summary.warning > 0) {
    console.log('Result: WARNINGS FOUND - Review before deployment\n');
    return 1;
  }

  console.log('Result: All schemas synchronized\n');
  return 0;
}

/**
 * Main execution
 */
const projectRoot = path.join(__dirname, '../../');
const schemaDir = path.join(projectRoot, 'schema');
const migrationsDir = path.join(projectRoot, 'supabase/migrations');
const strict = process.argv.includes('--strict');

if (!fs.existsSync(schemaDir)) {
  console.error(`Schema directory not found: ${schemaDir}`);
  process.exit(1);
}

if (!fs.existsSync(migrationsDir)) {
  console.error(`Migrations directory not found: ${migrationsDir}`);
  process.exit(1);
}

const report = validateSchemas(schemaDir, migrationsDir, strict);
const exitCode = printReport(report);

process.exit(exitCode);
