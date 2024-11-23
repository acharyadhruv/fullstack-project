
const mongoose = require('mongoose');

const ResponseSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz.questions',
    required: true,
  },
  userResponse: { type: String, required: true },
});

const SubmissionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    responses: [ResponseSchema],
    score: { type: Number, required: true },
    explanations: { type: mongoose.Schema.Types.Array },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Submission', SubmissionSchema);
