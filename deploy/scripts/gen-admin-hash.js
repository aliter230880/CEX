#!/usr/bin/env node
// Usage: node gen-admin-hash.js <your-admin-password>
// Outputs the bcrypt hash to paste into ADMIN_PASSWORD in .env

import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error("Usage: node gen-admin-hash.js <your-admin-password>");
  process.exit(1);
}

const hash = await bcrypt.hash(password, 12);
console.log("\n✅ Your ADMIN_PASSWORD bcrypt hash:\n");
console.log(hash);
console.log("\nPaste this value into deploy/.env as ADMIN_PASSWORD=<hash>\n");
