const mongoose = require("mongoose");

const wordSchema = new mongoose.Schema({
  en: { type: String },
  uk: { type: String },
  original: { type: String, required: true },
  inf: { type: String, required: true },
  pos: [{ type: Number, required: true }],
  type: { type: String, required: true },
});

const sentenceSchema = new mongoose.Schema({
  enTranslation: { type: String, required: true },
  ukTranslation: { type: String, required: true },
  words: { type: [wordSchema], required: true },
  original: { type: String },
  type: { type: String },
});

const textSchema = new mongoose.Schema({
  // ownerId: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: ["public", "private"],
  },
  text: { type: [sentenceSchema], required: true },
  videoLink: String,
  title: String,
  description: String,
});

module.exports = mongoose.model("Text", textSchema);
