import mongoose from 'mongoose';

const accountRecoveryRequestSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  center: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  }
}, {
  timestamps: true
});

const AccountRecoveryRequest = mongoose.model('AccountRecoveryRequest', accountRecoveryRequestSchema);

export default AccountRecoveryRequest;



