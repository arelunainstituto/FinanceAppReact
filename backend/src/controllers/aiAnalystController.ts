import { Request, Response } from 'express';
import { aiAnalystService } from '../services/aiAnalystService';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface N8NRequest {
  message: string;
  userName: string;
  userEmail: string;
  history?: ChatMessage[];
}

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
  };
}

export const aiAnalystController = {
  async testConnection(_req: Request, res: Response) {
    try {
      console.log('🤖 Testing AI Analyst connection...');
      
      const isConnected = await aiAnalystService.testConnection();
      
      if (isConnected) {
        return res.json({
          success: true,
          message: 'AI Analyst connection successful',
          data: { connected: true }
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'AI Analyst connection failed',
          data: { connected: false }
        });
      }
    } catch (error) {
      console.error('❌ Error testing AI Analyst connection:', error);
      return res.status(500).json({
        success: false,
        message: 'Error testing AI Analyst connection',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  async sendMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const { message, userName, userEmail, history }: N8NRequest = req.body;
      const user = req.user; // From auth middleware

      console.log('🤖 AI Analyst message request:', {
        userName,
        userEmail,
        messageLength: message?.length || 0,
        historyLength: history?.length || 0,
        userId: user?.id
      });

      // Validate required fields
      if (!message || !userName || !userEmail) {
        return res.status(400).json({
          success: false,
          message: 'Message, userName and userEmail are required'
        });
      }

      // Send message to N8N webhook
      const result = await aiAnalystService.sendMessage(message, userName, userEmail, history);

      console.log('🤖 AI Analyst response received:', {
        success: result.success,
        responseLength: result.response?.length || 0
      });

      return res.json({
        success: result.success,
        message: result.success ? 'Message processed successfully' : 'Error processing message',
        data: {
          response: result.response,
          error: result.error
        }
      });

    } catch (error) {
      console.error('❌ Error in AI Analyst sendMessage:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};
