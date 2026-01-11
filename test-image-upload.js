const fs = require('fs');
const path = require('path');

// 创建一个简单的测试图片 (1x1 PNG)
const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77yQAAAABJRU5ErkJggg==';

// 测试AI服务的图片处理
async function testImageProcessing() {
  try {
    const response = await fetch('http://localhost:3000/api/ai/test-connection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      console.log('AI connection test passed');
    } else {
      const error = await response.text();
      console.log('AI connection test failed:', error);
    }
  } catch (error) {
    console.log('Failed to connect to API:', error.message);
  }
}

testImageProcessing();
