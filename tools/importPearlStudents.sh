#!/usr/bin/env bash

# Usage: ./tools/importPearlStudents.sh <path_to_csv>
#
# This script imports PearlStudent data from a CSV file into the database.
# Existing data will be overwritten on primary key (pearlId) conflict.
#
# The expected CSV format is (with header):
# 姓名,珍珠号,身份证后四位
# Example:
# 姓名,珍珠号,身份证后四位
# 刘书婷,13070125022,3823
# 字鑫莹,52060525049,1361
#
# Ensure that environment variables (like DATABASE_URI) are properly set before running.

if [ -z "$1" ]; then
  echo "Usage: $0 <path_to_csv>"
  exit 1
fi

CSV_FILE="$1"

if [ ! -f "$CSV_FILE" ]; then
  echo "Error: File not found: $CSV_FILE"
  exit 1
fi

# Use local ts-node to properly resolve tsconfig-paths
./node_modules/.bin/ts-node --require tsconfig-paths/register -e "
import fs from 'fs';
import 'dotenv/config';
import sequelize from './src/api/database/sequelize';
import PearlStudent from './src/api/database/models/PearlStudent';

async function importData() {
  try {
    const csvData = fs.readFileSync('$CSV_FILE', 'utf-8');
    // Split by lines and handle potential \r from Windows files
    const lines = csvData.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);

    if (lines.length < 2) {
      console.log('No data found in the CSV file (only header or empty).');
      return;
    }

    // Skip the header
    const dataLines = lines.slice(1);
    let importedCount = 0;

    for (const line of dataLines) {
      const parts = line.split(',');
      if (parts.length >= 3) {
        const name = parts[0].trim();
        const pearlId = parts[1].trim();
        const nationalIdLastFour = parts[2].trim();

        await PearlStudent.upsert({
          pearlId: pearlId,
          name: name,
          lowerCaseNationalIdLastFour: nationalIdLastFour.toLowerCase(),
        });
        importedCount++;
      } else {
        console.warn('Skipping invalid line:', line);
      }
    }

    console.log(\`Successfully imported \${importedCount} PearlStudent records.\`);
  } catch (error) {
    console.error('Error importing data:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

importData().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
"
