// Try different Gemini models to find which one works
const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = 'AIzaSyBt6DLJZ2C5x6aWDJB110YsqEiQJ-1WCF4';
const genAI = new GoogleGenerativeAI(API_KEY);

const modelsToTry = [
  'gemini-pro',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro-latest',
  'gemini-2.0-flash-exp',
];

async function testModel(modelName) {
  try {
    console.log(`\n🔍 Testing: ${modelName}...`);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent('Say "Hello"');
    const response = await result.response;
    const text = response.text();
    console.log(`✅ SUCCESS: ${modelName} works!`);
    console.log(`   Response: ${text.substring(0, 50)}...`);
    return true;
  } catch (error) {
    console.log(`❌ FAILED: ${modelName}`);
    console.log(`   Error: ${error.message.substring(0, 80)}...`);
    return false;
  }
}

async function findWorkingModel() {
  console.log('🚀 Testing Gemini models with your API key...\n');
  
  for (const modelName of modelsToTry) {
    const works = await testModel(modelName);
    if (works) {
      console.log(`\n✅✅✅ FOUND WORKING MODEL: ${modelName} ✅✅✅\n`);
      break;
    }
  }
}

findWorkingModel();
