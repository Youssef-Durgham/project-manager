import mongoose, { Schema, Document } from 'mongoose';

const SprintSchema = new Schema({
  name: { type: String, required: true },
  projectId: { type: String, required: true, index: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  taskIds: [{ type: String }], // task IDs included in this sprint
  goals: [{ type: String }], // sprint goals
  status: { type: String, enum: ['planning', 'active', 'completed'], default: 'planning' },
}, { timestamps: true });

export default mongoose.models.Sprint || mongoose.model('Sprint', SprintSchema);
