#!/bin/bash

echo "=== 测试AI连接API ==="

# 首先登录获取token
echo "1. 登录获取token..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "111111"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ 登录失败"
  echo "响应: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ 登录成功，获取到token"

# 测试AI连接
echo "2. 测试AI连接..."
AI_RESPONSE=$(curl -s -X POST http://localhost:3000/api/ai/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message": "Hello"}')

echo "AI连接测试响应:"
echo "$AI_RESPONSE"

if echo "$AI_RESPONSE" | grep -q "AI API Key not configured"; then
  echo "❌ 仍然提示API Key未配置"
else
  echo "✅ API Key配置正确"
fi
