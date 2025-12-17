const fs = require("fs");
const path = require("path");

// Lire le fichier de traduction
const content = fs.readFileSync("contexts/AppSettingsContext.js", "utf8");
const frMatch = content.match(/fr:\s*\{([\s\S]*?)\n\s*\},\s*\n\s*en:/);
const frContent = frMatch ? frMatch[1] : "";
const validKeys = new Set([...frContent.matchAll(/^\s*(\w+):/gm)].map(m => m[1]));

// Fonction pour trouver les fichiers JS/JSX
function findFiles(dir, files = []) {
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory() && item !== "node_modules" && item !== ".next") {
        findFiles(fullPath, files);
      } else if (item.endsWith(".js") || item.endsWith(".jsx")) {
        files.push(fullPath);
      }
    }
  } catch (e) {}
  return files;
}

// Trouver toutes les utilisations de t(...)
const usedKeys = new Set();
const keyUsage = {};
const files = findFiles("app").concat(findFiles("components"));

for (const file of files) {
  const code = fs.readFileSync(file, "utf8");
  // Chercher t("key") ou t('key')
  const regex = /\bt\(['"](\w+)['"]\)/g;
  let match;
  while ((match = regex.exec(code)) !== null) {
    usedKeys.add(match[1]);
    if (!keyUsage[match[1]]) keyUsage[match[1]] = [];
    keyUsage[match[1]].push(file);
  }
}

// Trouver les clés utilisées mais non définies
const missingKeys = [...usedKeys].filter(k => !validKeys.has(k)).sort();

// Trouver les clés définies mais non utilisées
const unusedKeys = [...validKeys].filter(k => !usedKeys.has(k)).sort();

console.log("=== Analyse des traductions ===\n");
console.log("Clés définies:", validKeys.size);
console.log("Clés utilisées dans le code:", usedKeys.size);
console.log("");

if (missingKeys.length > 0) {
  console.log("⚠️  Clés utilisées mais NON DÉFINIES (" + missingKeys.length + "):");
  missingKeys.forEach(k => {
    console.log("  -", k);
    if (keyUsage[k]) {
      keyUsage[k].slice(0, 2).forEach(f => console.log("      utilisée dans:", f));
    }
  });
  console.log("");
} else {
  console.log("✓ Toutes les clés utilisées sont définies\n");
}

if (unusedKeys.length > 0 && unusedKeys.length < 50) {
  console.log("ℹ️  Clés définies mais non utilisées (" + unusedKeys.length + "):");
  unusedKeys.forEach(k => console.log("  -", k));
} else if (unusedKeys.length >= 50) {
  console.log("ℹ️  " + unusedKeys.length + " clés définies mais non utilisées (certaines peuvent être utilisées dynamiquement)");
}
