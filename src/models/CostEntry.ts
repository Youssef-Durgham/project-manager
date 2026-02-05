import mongoose, { Schema } from 'mongoose';

const CostEntrySchema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  category: { type: String, enum: ['aws', 'api', 'hosting', 'domain', 'database', 'storage', 'ai', 'other'], required: true },
  service: { type: String, required: true }, // e.g. 'Lambda', 'S3', 'OpenAI API', 'MongoDB Atlas'
  amount: { type: Number, required: true }, // in USD
  currency: { type: String, default: 'USD' },
  period: { type: String, enum: ['one-time', 'monthly', 'yearly', 'per-use'], default: 'monthly' },
  startDate: { type: Date },
  endDate: { type: Date },
  notes: { type: String, default: '' },
  isEstimate: { type: Boolean, default: false },
  addedBy: { type: String, enum: ['yusif', 'employee-1', 'system'], default: 'system' },
}, { timestamps: true });

export default mongoose.models.CostEntry || mongoose.model('CostEntry', CostEntrySchema);
