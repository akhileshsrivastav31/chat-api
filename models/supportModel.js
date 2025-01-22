const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    question: { type: String, required: false },
    answers: [{ type: String, required: false }],
  },
  { _id: false } // Prevents the addition of _id to each question object
);

const SupportModel = new mongoose.Schema({
  supportEmail: { type: String, required: false },
  questions: [questionSchema],
});

module.exports = mongoose.model("Support", SupportModel);
