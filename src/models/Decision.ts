import mongoose, { Schema } from 'mongoose';

const DecisionSchema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  reasoning: { type: String, default: '' }, // why this decision was made
  alternatives: [{ type: String }], // what else was considered
  madeBy: { type: String, enum: ['yusif', 'employee-1', 'both'], default: 'both' },
  category: { type: String, enum: ['architecture', 'tech-stack', 'design', 'process', 'business', 'other'], default: 'other' },
  impact: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: { type: String, enum: ['proposed', 'accepted', 'superseded', 'deprecated'], default: 'accepted' },
  relatedTaskIds: [{ type: String }],
  supersededBy: { type: Schema.Types.ObjectId, ref: 'Decision' },
}, { timestamps: true });

export default mongoose.models.Decision || mongoose.model('Decision', DecisionSchema);
