const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: { type: [String], required: true },
  correctAnswer: { type: String, required: true },
});

const QuizSchema = new mongoose.Schema(
  {
    grade: { type: Number, required: true },
    subject: { type: String, required: true },
    totalQuestions: { type: Number, required: true },
    maxScore: { type: Number, required: true },
    difficulty: {
      type: String,
      enum: ['EASY', 'MEDIUM', 'HARD'],
      required: true,
    },
    questions: [QuestionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Quiz', QuizSchema);
