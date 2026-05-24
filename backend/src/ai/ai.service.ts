import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiService {
  private groq: Groq;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService
  ) {
    this.groq = new Groq({ apiKey: this.configService.get<string>('GROQ_API_KEY') });
  }

  async askAi(query: string) {
    try {
      const workerCount = await this.prisma.user.count({ where: { role: 'WORKER' } });
      const attendanceToday = await this.prisma.attendance.count({
        where: { checkIn: { gte: new Date(new Date().setHours(0,0,0,0)) } }
      });

      const systemPrompt = `You are the AI Intelligence core of FenceIn, an enterprise biometric workforce platform.
Current context: We have ${workerCount} registered workers and ${attendanceToday} check-ins today.
Provide actionable insights, predictive analytics, or summaries based on the user's query. Keep responses concise and analytical. Focus on workforce trends, anomalies, and operational insights.`;

      const response = await this.groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        model: 'llama-3.3-70b-versatile',
      });

      return { answer: response.choices[0]?.message?.content || 'Unable to generate response.' };
    } catch (error) {
      throw new InternalServerErrorException('AI Service is currently unavailable.');
    }
  }
}
