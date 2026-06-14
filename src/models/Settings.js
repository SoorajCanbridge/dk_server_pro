import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

export const Settings = mongoose.model('Settings', settingsSchema);

export async function getSetting(key, defaultValue) {
  const doc = await Settings.findOne({ key });
  return doc ? doc.value : defaultValue;
}

export async function setSetting(key, value) {
  return Settings.findOneAndUpdate({ key }, { value }, { upsert: true, new: true });
}
