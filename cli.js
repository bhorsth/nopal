#!/usr/bin/env node
/**
 * Berlinger Fridge-tag CLI Tool
 * Parse Fridge-tag files and output JSON
 * 
 * Usage:
 *   node cli.js <file.txt>                    # Parse and output to stdout
 *   node cli.js <file.txt> -o output.json     # Write to file
 *   node cli.js <file.txt> --compact          # Compact JSON output
 *   node cli.js --help                        # Show help
 */

import fs from 'fs'
import path from 'path'
import { FridgeTagParser, toJson } from './src/utils/fridgeTagParser.js'

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2)
  const result = { file: null, output: null, compact: false, help: false }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '-h' || arg === '--help') {
      result.help = true
    } else if (arg === '-o' || arg === '--output') {
      result.output = args[++i]
    } else if (arg === '--compact') {
      result.compact = true
    } else if (!arg.startsWith('-')) {
      result.file = arg
    }
  }

  return result
}

/**
 * Print usage information
 */
function printUsage() {
  console.log(`
Berlinger Fridge-tag Parser CLI

Usage:
  node cli.js [options] FILE

Arguments:
  FILE                 FridgeTag export file to parse

Options:
  -o, --output FILE    Output file (default: stdout)
  --compact            Compact JSON output (no indentation)
  -h, --help           Show this help message

Examples:
  node cli.js data/fridgetag.txt
  node cli.js data/fridgetag.txt -o output.json
  node cli.js data/fridgetag.txt --compact
  `)
}

/**
 * Main entry point
 */
async function main() {
  const args = parseArgs()

  if (args.help || !args.file) {
    printUsage()
    process.exit(args.help ? 0 : 1)
  }

  // Resolve file path
  const filePath = path.resolve(args.file)

  // Check file exists
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`)
    process.exit(1)
  }

  try {
    // Read file
    const content = fs.readFileSync(filePath, 'utf-8')
    
    // Parse
    const parser = new FridgeTagParser()
    const rawData = parser.parseText(content)
    
    // Transform to output format
    const output = toJson(rawData)

    // Format JSON
    const indent = args.compact ? undefined : 2
    const jsonOutput = JSON.stringify(output, null, indent)

    // Output
    if (args.output) {
      const outputPath = path.resolve(args.output)
      fs.writeFileSync(outputPath, jsonOutput)
      console.log(`✓ Parsed file saved to: ${outputPath}`)
    } else {
      console.log(jsonOutput)
    }
  } catch (error) {
    console.error(`Error parsing file: ${error.message}`)
    process.exit(1)
  }
}

main()
