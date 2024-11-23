
const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const Quiz = require('../models/Quiz');
const Submission = require('../models/Submission');
const authenticateToken = require('../middleware/auth');
const { sendQuizResultEmail, sendImprovementEmail } = require('../utils/emailService');

// Initialize Groq client

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// Generate new quiz
router.post('/generate',authenticateToken,  async (req, res) => {
  try {
    const { grade, subject, totalQuestions, maxScore, difficulty } = req.body;

    const prompt = `Generate a ${difficulty} ${subject} quiz for grade ${grade} with ${totalQuestions} questions. Each question should have 4 options (A, B, C, D) and one correct answer. Format the response as a JSON array of objects, each with 'question', 'options', and 'correctAnswer' fields.`;

    // Request the quiz generation from Groq AI
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama3-8b-8192',
    });

    console.log(completion.choices[0].message.content);
    const responseContent = completion.choices[0].message.content;

    // extract the json array from response content, ie, remove the additional text before the array included by the ai
    const jsonMatch = responseContent.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No valid JSON array found in the response');
    }
    console.log(jsonMatch[0]);
    const questions = JSON.parse(jsonMatch[0].replace(/:\s*([A-D])\s*([,}])/g, ': "$1"$2'));

    // create a new quiz with generated questions
    const quiz = new Quiz({
      grade,
      subject,
      totalQuestions,
      maxScore,
      difficulty,
      questions,
    });

    await quiz.save();
    res.status(201).json(quiz);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error generating quiz', error: error.message });
  }
});

// Function to process quiz submissions and calculate the score
async function processQuizSubmission(quizId, responses, userId) {
  const quiz = await Quiz.findById(quizId);
  if (!quiz) throw new Error('Quiz not found');

  let score = 0;
  const explanations = [];

  // Iterate through each response to calculate the score and provide explanations
  responses.forEach((response) => {
    const question = quiz.questions.find(
      (q) => q._id.toString() === response.questionId
    );
    if (question) {
      const isCorrect = question.correctAnswer === response.userResponse;
      score += isCorrect ? 1 : 0;
      explanations.push({
        question: question.question,
        options: question.options,
        userResponse: response.userResponse,
        correctAnswer: question.correctAnswer,
      });
    }
  });

  console.log(score);
  const submission = new Submission({
    user: userId,
    quiz: quizId,
    responses,
    score,
    explanations,
  });

  console.log(submission);

  await submission.save();
  return { score, explanations };
}

// submit quiz answers
router.post('/submit', authenticateToken, async (req, res) => {
  const { quizId, responses } = req.body;

  if (!mongoose.Types.ObjectId.isValid(quizId)) {
    return res.status(400).json({ error: 'Invalid quizId format' });
  }

  try {
    const result = await processQuizSubmission(quizId, responses, req.user._id);
    await sendQuizResultEmail(req.user.email, result);
    res.json(result);
    const quizzes = await Quiz.find();
     console.log(quizzes);
  } catch (error) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({ message: 'Error submitting quiz', error: error.message });
  }
});
router.post('/retry/:quizId', authenticateToken, async (req, res) => {
  try {
    const { quizId } = req.params;
    const { responses } = req.body;

    // Process the quiz submission for the retry attempt
    const result = await processQuizSubmission(quizId, responses, req.user._id);

    // Send email with quiz results
    await sendQuizResultEmail(req.user.email, result);
    res.json(result);
  } catch (error) {
    console.error('Error retrying quiz:', error);
    res
      .status(500)
      .json({ message: 'Error retrying quiz', error: error.message });
  }
});

// Get quiz history with optional filters
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { grade, subject, score, minScore, maxScore, from, to } = req.query;
    let submissionQuery = { user: req.user._id };
    let quizQuery = {};

    // Handle score filtering in the submission query
    if (score !== undefined) {
      submissionQuery.score = parseInt(score);
    } else {
      if (minScore !== undefined)
        submissionQuery.score = { $gte: parseInt(minScore) };
      if (maxScore !== undefined)
        submissionQuery.score = {
          ...submissionQuery.score,
          $lte: parseInt(maxScore),
        };
    }

    // Handle date range filtering
    if (from && to) {
      submissionQuery.createdAt = {
        $gte: new Date(from),
        $lte: new Date(to),
      };
    }

    // Handle grade and subject filtering in the quiz query
    if (grade !== undefined) quizQuery.grade = parseInt(grade);
    if (subject !== undefined) quizQuery.subject = subject;

    console.log('Submission Query:', submissionQuery);
    console.log('Quiz Query:', quizQuery);

    // First, find all submissions that match the submission criteria
    let submissions = await Submission.find(submissionQuery).populate('quiz');

    console.log('Submissions found:', submissions.length);

    // Then, filter the results based on the quiz criteria
    submissions = submissions.filter((submission) => {
      if (!submission.quiz) return false;

      if (grade !== undefined && submission.quiz.grade !== parseInt(grade))
        return false;
      if (subject !== undefined && submission.quiz.subject !== subject)
        return false;

      return true;
    });

    console.log('Submissions after filtering:', submissions.length);

    res.json(submissions);
  } catch (error) {
    console.error('Error fetching quiz history:', error);
    res
      .status(500)
      .json({ message: 'Error fetching quiz history', error: error.message });
  }
});
router.post('/generate-hint', authenticateToken, async (req, res) => {
  try {
    const { quizId, questionId } = req.body;

    if (!quizId || !questionId) {
      return res.status(400).json({ error: 'quizId and questionId are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(quizId) || !mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({ error: 'Invalid quizId or questionId format' });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const question = quiz.questions.find((q) => q._id.toString() === questionId);
    if (!question) {
      return res.status(404).json({ error: 'Question not found in the quiz' });
    }

    const prompt = `Provide a hint for the following question from a ${quiz.subject} quiz for grade ${quiz.grade}: "${question.question}"`;
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama3-8b-8192',
    });

    const hint = completion.choices[0].message.content.trim();
    console.log(`Generated hint: ${hint}`);

    res.status(200).json({
      message: 'Hint generated successfully',
      question: question.question,
      hint,
    });

    // If the user answered the question incorrectly, send improvement email
    const incorrectResponses = quiz.questions
      .filter((q) => q._id.toString() === questionId && q.correctAnswer !== question.correctAnswer)
      .map((q) => ({
        question: q.question,
        correctAnswer: q.correctAnswer,
        tip: `Focus on the key concepts in ${quiz.subject}.`,
      }));

    if (incorrectResponses.length > 0) {
      await sendImprovementEmail(req.user.email, incorrectResponses);
    }
  } catch (error) {
    console.error('Error generating hint:', error);
    res.status(500).json({ message: 'Error generating hint', error: error.message });
  }
});


module.exports = router;
