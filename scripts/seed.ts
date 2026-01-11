/**
 * Seed database with sample data for development
 *
 * Usage: pnpm run seed
 */

import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3000';

const sampleQuestions = [
  {
    content: 'What is 2 + 2?',
    type: 'SINGLE_CHOICE',
    options: [
      { label: 'A', content: '3' },
      { label: 'B', content: '4' },
      { label: 'C', content: '5' },
      { label: 'D', content: '6' },
    ],
    answer: 'B',
    difficulty: 1,
    tags: ['math', 'basic'],
  },
  {
    content: 'Which of the following are prime numbers?',
    type: 'MULTIPLE_CHOICE',
    options: [
      { label: 'A', content: '2' },
      { label: 'B', content: '3' },
      { label: 'C', content: '4' },
      { label: 'D', content: '5' },
    ],
    answer: 'A,B,D',
    difficulty: 2,
    tags: ['math', 'numbers'],
  },
  {
    content: 'The Earth is flat.',
    type: 'TRUE_FALSE',
    answer: 'FALSE',
    difficulty: 1,
    tags: ['science', 'general'],
  },
  {
    content: 'Complete the sentence: The capital of China is ____.',
    type: 'FILL_BLANK',
    answer: 'Beijing',
    difficulty: 1,
    tags: ['geography'],
  },
  {
    content: 'Explain the concept of recursion in programming.',
    type: 'ESSAY',
    answer: 'Recursion is a programming technique where a function calls itself to solve a problem by breaking it down into smaller instances of the same problem.',
    difficulty: 3,
    tags: ['programming', 'algorithms'],
  },
];

async function seedDatabase() {
  console.log('Seeding database with sample data...');

  let successCount = 0;
  let failCount = 0;

  for (const question of sampleQuestions) {
    try {
      await axios.post(`${API_URL}/questions`, question);
      console.log(`✓ Seeded: ${question.content.substring(0, 50)}...`);
      successCount++;
    } catch (error: any) {
      console.error(`✗ Failed: ${question.content.substring(0, 50)}...`);
      if (error.response?.data) {
        console.error(`  Error: ${JSON.stringify(error.response.data)}`);
      }
      failCount++;
    }
  }

  // Seed sample exam
  try {
    const exam = await axios.post(`${API_URL}/exams`, {
      title: 'Sample Math Quiz',
      description: 'A basic mathematics quiz for testing',
      duration: 30,
      totalScore: 100,
    });
    console.log(`✓ Created exam: ${exam.data.title}`);

    // Add questions to exam
    for (let i = 0; i < Math.min(3, sampleQuestions.length); i++) {
      await axios.post(`${API_URL}/exams/${exam.data.id}/questions`, {
        questionId: '1', // Would need actual IDs in real scenario
        order: i + 1,
        score: 10,
      });
    }
  } catch (error: any) {
    console.error(`✗ Failed to create exam`);
  }

  console.log('\nSeeding complete!');
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
}

seedDatabase().catch(console.error);
