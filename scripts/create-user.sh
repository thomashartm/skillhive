#!/bin/bash

# Script to create a user in the TrainHive database
# Usage: ./scripts/create-user.sh <email> <password> <role> [name]

# Check if we're in the project root
if [ ! -f "package.json" ]; then
  echo "Error: This script must be run from the project root directory"
  exit 1
fi

# Check if required arguments are provided
if [ $# -lt 3 ]; then
  echo "Usage: ./scripts/create-user.sh <email> <password> <role> [name]"
  echo ""
  echo "Arguments:"
  echo "  email     User's email address"
  echo "  password  User's password (min 6 characters)"
  echo "  role      User role: USER, PROFESSOR, MANAGER, or ADMIN"
  echo "  name      User's display name (optional, defaults to email prefix)"
  echo ""
  echo "Examples:"
  echo "  ./scripts/create-user.sh admin@example.com admin123 ADMIN \"Admin User\""
  echo "  ./scripts/create-user.sh user@test.com password USER"
  exit 1
fi

# Run the Node.js script
node scripts/create-user.js "$@"
