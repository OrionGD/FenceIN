import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { PrismaService } from '../prisma/prisma.service';
import { MongoService } from '../mongo/mongo.service';

@Injectable()
export class AiService {
  private groq: Groq;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private mongo: MongoService,
  ) {
    this.groq = new Groq({ apiKey: this.configService.get<string>('GROQ_API_KEY') });
  }

  async askAi(query: string, userId?: string, tenantId?: string | null) {
    try {
      // ── Live database context ──────────────────────────────────────────────────
      // Queries are scoped to tenantId when available.
      // AI must NEVER fabricate metrics — if data is unavailable it must say so explicitly.
      let workerCount: number | null = null;
      let attendanceToday: number | null = null;
      let dataAvailable = false;

      try {
        const tenantFilter = tenantId ? { tenantId } : {};

        [workerCount, attendanceToday] = await Promise.all([
          this.prisma.user.count({ where: { userRole: 'WORKER', ...tenantFilter } }),
          this.prisma.attendance.count({
            where: {
              checkIn: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
              ...tenantFilter
            },
          }),
        ]);
        dataAvailable = true;
      } catch (dbErr: any) {
        console.error('[AI] Database query failed — AI will declare data unavailable:', dbErr.message);
      }

      // ── System Prompt ──────────────────────────────────────────────────────────
      const systemPrompt = dataAvailable
        ? `You are the AI Intelligence core of FenceIN, an enterprise biometric workforce platform.

SYSTEM BOUNDARIES — STRICTLY ENFORCED:
- You are a read-only analytical assistant. You MUST NOT impersonate any real employee, executive, manager, or operator.
- You MUST NOT fabricate executive approvals, operational decisions, or access grants.
- You MUST NOT simulate, roleplay, or pretend to be a human supervisor or security officer.
- You MUST NOT generate fake telemetry readings, invent incident reports, or manufacture metrics.
- All insights you provide must be strictly grounded in the live database context provided below.
- If a question cannot be answered from the available context, say: "Insufficient live data for this query."
- You MUST NOT invent any numbers, percentages, or statistics beyond what is listed in LIVE DATABASE CONTEXT.

LIVE DATABASE CONTEXT (authoritative, real-time):
- Total registered workers: ${workerCount}
- Biometric check-ins today: ${attendanceToday}
${tenantId ? `- Tenant scope: ${tenantId}` : '- Tenant scope: platform-wide'}

Your role: Provide concise, data-driven analytical insights, predictive workforce summaries, compliance observations, and anomaly detection based solely on the real operational context above. Keep responses professional and under 4 sentences.`
        : `You are the AI Intelligence core of FenceIN, an enterprise biometric workforce platform.

CRITICAL — DATA UNAVAILABLE:
The live database could not be queried at this time due to a backend error.
You MUST respond to any operational query with exactly: "Data unavailable. The live database context could not be retrieved. Please retry or contact your administrator."
Do NOT attempt to answer, estimate, or infer any operational metrics.`;

      const t0 = Date.now();
      const response = await this.groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query },
        ],
        model: 'llama-3.3-70b-versatile',
        max_tokens: 150,
        user: userId || 'anonymous-user',
      } as any);
      const latencyMs = Date.now() - t0;

      const answer =
        response.choices[0]?.message?.content ||
        'Data unavailable. The AI engine returned an empty response.';
      const tokensUsed =
        (response.usage?.prompt_tokens ?? 0) + (response.usage?.completion_tokens ?? 0);

      // Persist to MongoDB — AI chat history + telemetry
      const context = dataAvailable
        ? { workerCount, attendanceToday, tenantId: tenantId ?? 'platform-wide' }
        : { error: 'database_unavailable' };

      await this.mongo.logAiChat({
        tenantId: tenantId ?? null,
        userId: userId ?? null,
        query,
        answer,
        model: 'llama-3.3-70b-versatile',
        tokensUsed,
        context,
      });
      await this.mongo.logTelemetry({
        tenantId: tenantId ?? null,
        source: 'nestjs_gateway',
        event: 'ai_query',
        latencyMs,
        metadata: { tokensUsed, dataAvailable },
      });

      return { answer, dataAvailable };
    } catch (error) {
      throw new InternalServerErrorException('AI Service is currently unavailable.');
    }
  }
}
