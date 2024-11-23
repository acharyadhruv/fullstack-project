const { Resend } = require('resend');

// Initialize Resend client with API key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY);


async function sendQuizResultEmail(userEmail, result) {
  const { score, explanations } = result;

  const mailOptions = {
    from: 'onboarding@project0x.org', // Update with your verified sender email
    to: userEmail,
    subject: 'Your Quiz Results',
    html: `
      <h1>Quiz Results</h1>
      <p><strong>Your Score:</strong> ${score} out of ${explanations.length}</p>
      <h2>Explanations</h2>
      <ul>
        ${explanations
          .map(
            (exp) => `
          <li>
            <p><strong>Question:</strong> ${exp.question}</p>
            <p><strong>Options:</strong> ${exp.options.join(', ')}</p>
            <p><strong>Your Response:</strong> ${exp.userResponse}</p>
            <p><strong>Correct Answer:</strong> ${exp.correctAnswer}</p>
          </li>
        `
          )
          .join('')}
      </ul>
    `,
  };

  try {
    const response = await resend.emails.send(mailOptions);
    console.log('Quiz result email sent successfully:', response.id);
    return response;
  } catch (error) {
    console.error('Error sending quiz result email:', error.message);
    throw new Error('Quiz result email sending failed.');
  }
}


async function sendImprovementEmail(userEmail, improvementSuggestions) {
  const mailOptions = {
    from: 'onboarding@project0x.org', // Update with your verified sender email
    to: userEmail,
    subject: 'Suggestions for Improvement',
    html: `
      <h1>Improvement Suggestions</h1>
      <p>We noticed some areas where you can improve. Here are our suggestions:</p>
      <ul>
        ${improvementSuggestions
          .map(
            (suggestion) => `
          <li>
            <p><strong>Question:</strong> ${suggestion.question}</p>
            <p><strong>Correct Answer:</strong> ${suggestion.correctAnswer}</p>
            <p><strong>Tip:</strong> ${suggestion.tip}</p>
          </li>
        `
          )
          .join('')}
      </ul>
    `,
  };

  try {
    const response = await resend.emails.send(mailOptions);
    console.log('Improvement email sent successfully:', response.id);
    return response;
  } catch (error) {
    console.error('Error sending improvement email:', error.message);
    throw new Error('Improvement email sending failed.');
  }
}

module.exports = { sendQuizResultEmail, sendImprovementEmail };
