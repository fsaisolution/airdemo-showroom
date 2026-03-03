import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { KNOWLEDGE_BASE } from './rag-knowledge.js';

// 加载环境变量
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

// 解析JSON请求体
app.use(express.json());

// 处理 /api/aily 请求
app.post('/api/aily', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing message parameter' 
      });
    }

    // 验证环境变量
    const ARK_API_KEY = process.env.ARK_API_KEY;

    if (!ARK_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Missing ARK_API_KEY environment variable'
      });
    }

    // RAG 检索：根据用户问题提取相关知识
    const userQuestion = message.toLowerCase();
    let contextPrompt = '';
    
    // 关键词匹配
    const keywords = [
      { key: '东华链条', section: '手册识别助手' },
      { key: '高顿', section: 'CFA出题助手' },
      { key: 'gtm', section: 'AI GTM' },
      { key: 'sales', section: 'AI GTM' },
      { key: '巡检', section: 'AI 智能巡检' },
      { key: '装箱', section: '智能3D装箱模拟器' },
      { key: '蕊蕊', section: '蕊蕊' },
      { key: '复盘', section: '蕊蕊' },
      { key: '探探', section: '探探' },
      { key: '调研', section: '探探' },
      { key: '呆呆', section: '呆呆' },
      { key: '图图', section: '图图' },
      { key: '参参', section: '参参' },
      { key: '故事线', section: '参参' },
      { key: '会议', section: '会议任务督办系统' },
      { key: 'erp', section: 'ERP物料缺料计算系统' },
      { key: '物料', section: 'ERP物料缺料计算系统' },
      { key: '缺料', section: 'ERP物料缺料计算系统' },
      { key: '效率先锋', section: '效率先锋Cases管理网站' },
      { key: 'ceo', section: 'AI领航者' },
      { key: '领航者', section: 'AI领航者' },
      { key: 'airdemo', section: 'AirDemo' },
      { key: 'demo', section: 'AirDemo' },
      { key: '数字伙伴', section: '数字伙伴' },
    ];

    const matchedSections = [];
    for (const kw of keywords) {
      if (userQuestion.includes(kw.key)) {
        matchedSections.push(kw.section);
      }
    }

    // 如果有关键词匹配，提取相关文档内容
    if (matchedSections.length > 0) {
      // 简单处理：附加整个知识库（实际生产环境应该更精细地分块）
      contextPrompt = `\n\n请根据以下知识库信息回答用户问题：\n\n${KNOWLEDGE_BASE}\n\n`;
    }

    // 构建最终 prompt
    const systemPrompt = `你是 AirDemo 智能助手，负责解答关于 AirDemo 平台和各个 Demo 项目的问题。${contextPrompt}请用友好的语气回答用户的问题。`;
    
    const fullMessage = contextPrompt 
      ? `${systemPrompt}\n\n用户问题：${message}` 
      : message;

    // 调用火山引擎 ARK API
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ARK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'ep-20260213110643-7v8lj',
        stream: false,
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: fullMessage
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ARK API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // 提取回答内容
    const answer = data?.output?.[0]?.content?.[0]?.text || '（未获取到回答）';

    res.json({
      success: true,
      answer: answer
    });

  } catch (error) {
    console.error('❌ [ARK Proxy] 调用失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get response from ARK API',
    });
  }
});

// 创建Vite服务器
const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: 'spa',
});

// 使用Vite的中间件
app.use(vite.middlewares);

// 启动服务器
app.listen(PORT, () => {
  console.log(`\n🚀 开发服务器已启动`);
  console.log(`📦 前端: http://localhost:${PORT}`);
  console.log(`🤖 API:  http://localhost:${PORT}/api/aily`);
  console.log(`\n按 Ctrl+C 停止服务器\n`);
});
