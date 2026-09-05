#!/bin/bash
# Script de load testing avec Artillery
# Usage: ./tests/load/run-load-test.sh

set -e

echo "=== Project Manager — Load Testing ==="
echo ""

# Vérifier qu'Artillery est installé
if ! command -v npx &> /dev/null; then
    echo "❌ npx non trouvé. Installez Node.js >= 20"
    exit 1
fi

# Vérifier que le serveur est lancé
echo "1. Vérification du serveur..."
if ! curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "⚠️  Serveur non détecté sur localhost:3000"
    echo "   Lancez 'npm run dev' dans un autre terminal"
    echo ""
    read -p "   Continuer quand même ? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Run load test
echo ""
echo "2. Lancement du load test..."
echo "   Phases: Warm up (30s) → Ramp (60s) → Sustained (120s) → Spike (30s) → Cool down (30s)"
echo "   Durée totale: ~4.5 minutes"
echo ""

npx artillery run tests/load/load-test.yml --reporter stdout

echo ""
echo "3. Génération du rapport HTML..."
npx artillery run tests/load/load-test.yml --reporter html tests/load/report-$(date +%Y%m%d-%H%M%S).html

echo ""
echo "✅ Load test terminé!"
echo "   Rapport: tests/load/report-*.html"
