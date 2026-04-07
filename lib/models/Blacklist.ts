import mongoose, { Schema, Document } from 'mongoose';

export interface IBlacklist extends Document {
  stir: string;
  name: string;
  reason: string;
  created_at: Date;
}

const BlacklistSchema: Schema = new Schema({
  stir: { type: String, required: true },
  name: { type: String, required: true },
  reason: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

export default mongoose.models.Blacklist || mongoose.model<IBlacklist>('Blacklist', BlacklistSchema);
