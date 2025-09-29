import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Appointment from '../models/Appointment.js';

// Load env vars
dotenv.config();

// Connect to DB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Error connecting to database:', error);
    process.exit(1);
  }
};

// Migration script để update existing appointments với coreStatus
const migrateCoreStatus = async () => {
  try {
    console.log('🚀 Starting Core Status migration...');
    
    // Find all appointments without coreStatus or with incorrect coreStatus
    const appointments = await Appointment.find({});
    
    let updatedCount = 0;
    let totalCount = appointments.length;
    
    console.log(`📊 Found ${totalCount} appointments to process`);
    
    for (const appointment of appointments) {
      // Compute correct coreStatus and reasonCode
      const correctCoreStatus = Appointment.getCoreStatus(appointment.status);
      const correctReasonCode = Appointment.getReasonCode(appointment.status, correctCoreStatus);
      
      // Check if update is needed
      const needsUpdate = 
        appointment.coreStatus !== correctCoreStatus || 
        appointment.reasonCode !== correctReasonCode;
      
      if (needsUpdate) {
        try {
          // Update without triggering pre-save middleware (to avoid conflicts)
          await Appointment.updateOne(
            { _id: appointment._id },
            {
              $set: {
                coreStatus: correctCoreStatus,
                reasonCode: correctReasonCode
              }
            }
          );
          
          updatedCount++;
          
          if (updatedCount % 10 === 0) {
            console.log(`✅ Updated ${updatedCount}/${totalCount} appointments...`);
          }
        } catch (updateError) {
          console.error(`❌ Error updating appointment ${appointment._id}:`, updateError.message);
        }
      }
    }
    
    console.log(`🎉 Migration completed!`);
    console.log(`📈 Total appointments: ${totalCount}`);
    console.log(`🔄 Updated appointments: ${updatedCount}`);
    console.log(`✨ Skipped (already correct): ${totalCount - updatedCount}`);
    
    // Verify migration results
    const verificationStats = await Appointment.aggregate([
      {
        $group: {
          _id: '$coreStatus',
          count: { $sum: 1 },
          statuses: { $addToSet: '$status' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    console.log('\n📊 Migration Results by Core Status:');
    verificationStats.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count} appointments`);
      console.log(`    Detailed statuses: ${stat.statuses.join(', ')}`);
    });
    
    return { totalCount, updatedCount };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

// Rollback function (nếu cần)
const rollbackCoreStatus = async () => {
  try {
    console.log('🔄 Rolling back Core Status migration...');
    
    const result = await Appointment.updateMany(
      {},
      {
        $unset: {
          coreStatus: 1,
          reasonCode: 1
        }
      }
    );
    
    console.log(`✅ Rollback completed. Removed coreStatus and reasonCode from ${result.modifiedCount} appointments`);
    return result.modifiedCount;
    
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
};

// CLI runner
const runMigration = async () => {
  const command = process.argv[2];
  
  await connectDB();
  
  try {
    switch (command) {
      case 'migrate':
        await migrateCoreStatus();
        break;
      case 'rollback':
        await rollbackCoreStatus();
        break;
      case 'verify':
        // Just show current status distribution
        const stats = await Appointment.aggregate([
          {
            $group: {
              _id: { coreStatus: '$coreStatus', status: '$status' },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id.coreStatus': 1, '_id.status': 1 } }
        ]);
        
        console.log('📊 Current Status Distribution:');
        stats.forEach(stat => {
          console.log(`  ${stat._id.coreStatus} -> ${stat._id.status}: ${stat.count}`);
        });
        break;
      default:
        console.log('Usage:');
        console.log('  node migration.js migrate   - Run the migration');
        console.log('  node migration.js rollback  - Rollback the migration');
        console.log('  node migration.js verify    - Verify current status');
    }
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  }
  
  await mongoose.connection.close();
  console.log('Database connection closed.');
};

// Export functions for use in other scripts
export { migrateCoreStatus, rollbackCoreStatus };

// Run if called directly
if (process.argv[1].endsWith('migration.js')) {
  runMigration();
}