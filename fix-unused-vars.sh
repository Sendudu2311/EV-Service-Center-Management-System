#!/bin/bash

# Script to fix @typescript-eslint/no-unused-vars errors
# This script will run multiple quick fixes

echo "Fixing unused vars in various components..."

# Fix Register.tsx - confirmPassword
sed -i '' 's/confirmPassword,/\/\/ confirmPassword,/' src/pages/auth/Register.tsx

# Fix RealTime components
sed -i '' 's/CheckCircleIcon,/\/\/ CheckCircleIcon,/' src/components/RealTime/NotificationCenter.tsx
sed -i '' 's/XMarkIcon,/\/\/ XMarkIcon,/' src/components/RealTime/NotificationCenter.tsx

# Fix Vehicle pages
sed -i '' 's/CalendarIcon,/\/\/ CalendarIcon,/' src/components/Vehicle/VehicleDetails.tsx

# Fix more pages
sed -i '' 's/ClockIcon,/\/\/ ClockIcon,/' src/components/RealTime/StatusIndicator.tsx

echo "Basic fixes applied. Running lint to check progress..."
npm run lint 2>&1 | grep -c "no-unused-vars"