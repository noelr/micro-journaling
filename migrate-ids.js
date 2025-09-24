#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const JOURNAL_FILE = path.join(os.homedir(), '.micro-journal.json');
const BACKUP_FILE = path.join(os.homedir(), '.micro-journal.backup.json');

function migrateIds() {
  console.log('Starting ID migration...\n');

  // Check if journal file exists
  if (!fs.existsSync(JOURNAL_FILE)) {
    console.error('Error: Journal file not found at', JOURNAL_FILE);
    process.exit(1);
  }

  // Read the current journal
  let entries;
  try {
    const content = fs.readFileSync(JOURNAL_FILE, 'utf8');
    entries = JSON.parse(content);
    console.log(`Found ${entries.length} entries to process.\n`);
  } catch (error) {
    console.error('Error reading journal file:', error.message);
    process.exit(1);
  }

  // Create backup
  try {
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(entries, null, 2));
    console.log('✓ Backup created at:', BACKUP_FILE);
  } catch (error) {
    console.error('Error creating backup:', error.message);
    process.exit(1);
  }

  // Migrate IDs
  let migratedCount = 0;
  let skippedCount = 0;

  const migratedEntries = entries.map(entry => {
    // Skip if already has string ID (already migrated)
    if (typeof entry.id === 'string') {
      skippedCount++;
      console.log(`  Skipping entry ${entry.id} - already migrated`);
      return entry;
    }

    // Convert timestamp to milliseconds
    const timestamp = new Date(entry.timestamp).getTime();

    // Determine the app source
    let app = 'unknown';
    if (entry.source) {
      if (entry.source.app) {
        app = entry.source.app;
      } else if (entry.source.url) {
        app = 'web';
      }
    }

    // Create new ID
    const newId = `${timestamp}-${app}`;

    console.log(`  Migrating entry ${entry.id} → ${newId}`);
    migratedCount++;

    return {
      ...entry,
      id: newId
    };
  });

  // Sort by new IDs to maintain chronological order
  migratedEntries.sort((a, b) => a.id.localeCompare(b.id));

  // Write back the migrated data
  try {
    fs.writeFileSync(JOURNAL_FILE, JSON.stringify(migratedEntries, null, 2));
    console.log('\n✓ Migration complete!');
    console.log(`  - ${migratedCount} entries migrated`);
    console.log(`  - ${skippedCount} entries skipped (already migrated)`);
    console.log(`  - Backup saved at: ${BACKUP_FILE}`);
    console.log('\nYour journal has been successfully migrated to the new ID format.');
  } catch (error) {
    console.error('\nError writing migrated data:', error.message);
    console.error('Your original data is safe in the backup file:', BACKUP_FILE);
    process.exit(1);
  }
}

// Add confirmation prompt
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('=================================');
console.log('Micro Journal ID Migration Script');
console.log('=================================\n');
console.log('This script will:');
console.log('1. Backup your current journal to ~/.micro-journal.backup.json');
console.log('2. Convert numeric IDs to timestamp-based string IDs');
console.log('3. Sort entries chronologically\n');

rl.question('Do you want to proceed? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    rl.close();
    console.log('');
    migrateIds();
  } else {
    console.log('Migration cancelled.');
    rl.close();
    process.exit(0);
  }
});