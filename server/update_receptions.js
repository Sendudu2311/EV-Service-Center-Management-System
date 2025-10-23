import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const updateReceptions = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const ServiceReception = mongoose.model('ServiceReception', new mongoose.Schema({}, { strict: false }));
    
    const result = await ServiceReception.updateMany(
      { 'submissionStatus.submittedToStaff': false },
      { 
        $set: { 
          'submissionStatus.submittedToStaff': true,
          'submissionStatus.submittedAt': new Date()
        } 
      }
    );

    console.log('Updated:', result.modifiedCount, 'documents');
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

updateReceptions();
