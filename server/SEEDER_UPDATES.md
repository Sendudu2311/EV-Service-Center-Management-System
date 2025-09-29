# Updated Seeder Documentation

This document outlines the comprehensive updates made to the seeder to match the enhanced server models and validation improvements.

## 🎯 Key Updates Applied

### 1. **Enhanced User Data** ✅
- **Strong Passwords**: All accounts now use secure passwords (Admin123!@#, Staff123!@#, etc.)
- **Vietnamese Phone Format**: Proper 09xxxxxxxx format matching validation
- **Vietnamese Names**: Authentic Vietnamese names with proper diacritics
- **Enhanced Certifications**: Structured certification data with URLs and expiry dates
- **Login Tracking**: Added lastLogin timestamps for realistic data

### 2. **Valid Vehicle Data** ✅
- **Proper VIN Format**: All VINs are exactly 17 characters with no I/O/Q characters
  - Tesla Model 3: `5YJ3E1EA4NF123456`
  - Tesla Model Y: `5YJYGDEE8MF789123`
  - VinFast VF e34: `LVVDB11B5NE456789`
  - Hyundai IONIQ 5: `KMHL14JA7PA345678`
  - BMW i4: `WBY8P8C59KV567890`
  - Mercedes EQS: `WMEEJ9AA2NK234567`
- **Enhanced Maintenance**: Proper lastMaintenanceDate and nextMaintenanceDate
- **Additional Vehicles**: Added BMW and Mercedes for more variety
- **Complete Documentation**: Insurance certificates and registration docs

### 3. **Enhanced Appointment Workflow** ✅
- **Complete Workflow History**: Each appointment has detailed state transition tracking
- **Realistic Timestamps**: Proper time progression through workflow states
- **Role-Based Changes**: Workflow history shows which user role made each status change
- **Comprehensive Service Notes**: Detailed technician notes for completed services
- **Customer Arrival Tracking**: Expected vs actual arrival times
- **Priority Levels**: Different priority appointments for testing scenarios

### 4. **Comprehensive Test Scenarios** ✅
- **Pending Appointment**: Awaiting staff confirmation
- **Confirmed Appointment**: Ready for customer arrival
- **Customer Arrived**: Checked in, waiting for service reception
- **In Progress**: Active service work
- **Completed**: Full service history with feedback
- **Various Priorities**: Normal, high priority appointments
- **Multiple Service Centers**: Cross-location testing data

### 5. **Enhanced Part Data** ✅
- **Inventory Reservations**: Parts with reserved stock scenarios
- **Vietnamese Suppliers**: Local supplier information
- **Proper Pricing Structure**: Matches enhanced Part model virtual getters
- **Usage Statistics**: Realistic usage patterns and history
- **Lead Times**: Vietnamese supply chain considerations

## 📊 Test Data Summary

### User Accounts (Enhanced Security)
```
Role         | Email                      | Password        | Phone
-------------|----------------------------|-----------------|------------
Admin        | admin@evservice.com        | Admin123!@#     | 0901234567
Staff        | staff.central@evservice.com| Staff123!@#     | 0902345678
Staff        | staff.d7@evservice.com     | Staff123!@#     | 0903456789
Technician   | tech1@evservice.com        | Tech123!@#      | 0904567890
Technician   | tech2@evservice.com        | Tech123!@#      | 0905678901
Technician   | tech3@evservice.com        | Tech123!@#      | 0906789012
Customer     | customer1@gmail.com        | Customer123!@#  | 0907890123
Customer     | customer2@gmail.com        | Customer123!@#  | 0908901234
Customer     | customer3@gmail.com        | Customer123!@#  | 0909012345
Customer     | customer4@gmail.com        | Customer123!@#  | 0930123456
Customer     | customer5@gmail.com        | Customer123!@#  | 0931234567
```

### Vehicle Fleet (Valid VINs)
```
Brand         | Model      | VIN               | Owner
--------------|------------|-------------------|------------------
Tesla         | Model 3    | 5YJ3E1EA4NF123456 | customer1@gmail.com
Tesla         | Model Y    | 5YJYGDEE8MF789123 | customer1@gmail.com
VinFast       | VF e34     | LVVDB11B5NE456789 | customer2@gmail.com
Hyundai       | IONIQ 5    | KMHL14JA7PA345678 | customer3@gmail.com
BMW           | i4 eDrive40| WBY8P8C59KV567890 | customer4@gmail.com
Mercedes-Benz | EQS 450+   | WMEEJ9AA2NK234567 | customer5@gmail.com
```

### Appointment Status Examples
```
Status            | Core Status    | Description
------------------|----------------|----------------------------------
pending          | Scheduled      | Awaiting staff confirmation
confirmed        | Scheduled      | Staff confirmed, tech assigned
customer_arrived | CheckedIn      | Customer present, ready for service
reception_created| CheckedIn      | Service reception form created
in_progress      | InService      | Active service work
completed        | ReadyForPickup | Service completed
invoiced         | ReadyForPickup | Invoice generated
```

## 🔄 Enhanced Features

### 1. **Workflow Tracking**
- Every appointment status change is logged with timestamp, user, and reason
- Realistic progression through Vietnamese EV service workflow
- Role-based validation ensures only authorized users can make changes

### 2. **Vietnamese Compliance**
- VND currency throughout the system
- 10% VAT calculation in invoices
- Vietnamese business addresses and phone formats
- Local EV brand representation (VinFast)

### 3. **Parts Management**
- Real-time inventory with reservation system
- Vietnamese supplier information
- EV-specific parts categories
- Proper pricing structure with cost/retail/wholesale

### 4. **Service Reception**
- Comprehensive EV checklists
- Battery health assessments
- Motor diagnostics
- Charging system checks
- Photo documentation capability

### 5. **Socket.IO Ready**
- Data structure supports real-time updates
- Appointment progress tracking
- Chat message capabilities
- Status change notifications

## 🧪 Testing Scenarios

### Authentication Testing
```bash
# Test strong password validation
curl -X POST /api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@evservice.com","password":"Admin123!@#"}'
```

### VIN Validation Testing
```bash
# Test valid VIN format
curl -X POST /api/vehicles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"vin":"5YJ3E1EA4NF123456","make":"Tesla","model":"Model 3"}'
```

### Appointment Workflow Testing
```bash
# Test status transition validation
curl -X PUT /api/appointments/APT251201001/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"status":"confirmed","reason":"staff_confirmation"}'
```

### Parts Inventory Testing
```bash
# Test parts availability with virtual getters
curl -X GET /api/parts/BAT-TESLA-3-001 \
  -H "Authorization: Bearer <token>"
# Should return: unitPrice, currentStock, availableStock virtual properties
```

## 🔑 Important Notes

### Database Indexes
The seeder data is optimized for the enhanced database indexes:
- User queries by role and service center
- Appointment queries by customer, status, and date
- Parts queries by category and availability

### Security Enhancements
- All passwords meet strength requirements
- Phone numbers follow Vietnamese format validation
- VINs pass the enhanced regex validation
- User roles properly assigned for access control

### Performance Optimization
- Realistic data volumes for performance testing
- Proper relationships between all entities
- Comprehensive workflow states for load testing
- Multiple service centers for scaling scenarios

## 🚀 Running the Updated Seeder

```bash
# Navigate to server directory
cd server

# Run the enhanced seeder
npm run seed

# Output will show:
# ✅ Database seeding completed successfully!
# 📊 Summary: Enhanced data with proper validation
# 🔑 Test accounts with strong passwords
# 🚗 Valid vehicle VINs
# 📋 Complete appointment workflow states
# 🔧 Enhanced Vietnamese EV service features
```

The updated seeder now provides comprehensive test data that fully validates all the server enhancements and is ready for frontend integration testing! 🎉