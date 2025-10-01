#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const OLD_JOURNAL_FILE = path.join(os.homedir(), '.micro-journal.json');
const OLD_BACKUP_FILE = path.join(os.homedir(), '.micro-journal.backup.json');
const NEW_DIR = path.join(os.homedir(), '.micro-journal');
const NEW_JOURNAL_FILE = path.join(NEW_DIR, 'data.json');
const NEW_BACKUP_FILE = path.join(NEW_DIR, 'data.json.backup');

function migrateDirectory() {
  console.log('Starting directory migration...\n');

  // Check what files exist
  const oldJournalExists = fs.existsSync(OLD_JOURNAL_FILE);
  const oldBackupExists = fs.existsSync(OLD_BACKUP_FILE);

  if (!oldJournalExists && !oldBackupExists) {
    console.log('No old files found. Nothing to migrate.');
    console.log('The new directory structure will be created automatically when you create entries.');
    process.exit(0);
  }

  // Check if new directory already exists
  if (fs.existsSync(NEW_DIR)) {
    console.log(`Directory ${NEW_DIR} already exists.`);

    // Check if new files exist
    if (fs.existsSync(NEW_JOURNAL_FILE)) {
      console.log(`\nWarning: ${NEW_JOURNAL_FILE} already exists!`);
      console.log('Migration cancelled to avoid overwriting existing data.');
      console.log('\nIf you want to migrate, please manually backup and remove the existing files first.');
      process.exit(1);
    }
  } else {
    // Create new directory
    try {
      fs.mkdirSync(NEW_DIR, { recursive: true });
      console.log(`✓ Created directory: ${NEW_DIR}`);
    } catch (error) {
      console.error('Error creating directory:', error.message);
      process.exit(1);
    }
  }

  let migratedFiles = 0;

  // Migrate main journal file
  if (oldJournalExists) {
    try {
      // Read and verify the file is valid JSON
      const content = fs.readFileSync(OLD_JOURNAL_FILE, 'utf8');
      JSON.parse(content); // Validate JSON

      // Move file
      fs.copyFileSync(OLD_JOURNAL_FILE, NEW_JOURNAL_FILE);
      console.log(`✓ Copied: ${OLD_JOURNAL_FILE} → ${NEW_JOURNAL_FILE}`);

      // Remove old file
      fs.unlinkSync(OLD_JOURNAL_FILE);
      console.log(`✓ Removed: ${OLD_JOURNAL_FILE}`);

      migratedFiles++;
    } catch (error) {
      console.error('Error migrating journal file:', error.message);
      process.exit(1);
    }
  }

  // Migrate backup file if it exists
  if (oldBackupExists) {
    try {
      fs.copyFileSync(OLD_BACKUP_FILE, NEW_BACKUP_FILE);
      console.log(`✓ Copied: ${OLD_BACKUP_FILE} → ${NEW_BACKUP_FILE}`);

      // Remove old backup
      fs.unlinkSync(OLD_BACKUP_FILE);
      console.log(`✓ Removed: ${OLD_BACKUP_FILE}`);

      migratedFiles++;
    } catch (error) {
      console.error('Error migrating backup file:', error.message);
      console.error('Main journal was migrated successfully, but backup migration failed.');
      process.exit(1);
    }
  }

  console.log('\n✓ Migration complete!');
  console.log(`  - ${migratedFiles} file(s) migrated`);
  console.log(`  - New location: ${NEW_DIR}`);
  console.log('\nYour journal has been successfully migrated to the new directory structure.');
  console.log('\nTo configure a custom device name, create:');
  console.log(`  ${path.join(NEW_DIR, 'config.json')}`);
  console.log('\nWith content:');
  console.log('  {');
  console.log('    "device": "your-device-name"');
  console.log('  }');
}

// Add confirmation prompt
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('=========================================');
console.log('Micro Journal Directory Migration Script');
console.log('=========================================\n');
console.log('This script will:');
console.log('1. Create ~/.micro-journal/ directory');
console.log('2. Move ~/.micro-journal.json → ~/.micro-journal/data.json');
console.log('3. Move ~/.micro-journal.backup.json → ~/.micro-journal/data.json.backup (if exists)');
console.log('4. Remove old files after successful migration\n');

rl.question('Do you want to proceed? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    rl.close();
    console.log('');
    migrateDirectory();
  } else {
    console.log('Migration cancelled.');
    rl.close();
    process.exit(0);
  }
});
