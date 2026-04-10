import mongoose, { Schema, Document } from 'mongoose';

export interface IBlacklist extends Document {
  stir: string;
  name: string;
  reason: string;
  airport: string;
  is_global: boolean;
  created_at: Date;
}

const BlacklistSchema: Schema = new Schema({
  stir: { type: String, required: true },
  name: { type: String, required: true },
  reason: { type: String, required: true },
  airport: { type: String, default: 'ALL' },
  is_global: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
});

export default mongoose.models.Blacklist || mongoose.model<IBlacklist>('Blacklist', BlacklistSchema);
