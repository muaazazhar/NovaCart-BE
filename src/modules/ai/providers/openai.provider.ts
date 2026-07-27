import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type {
  LlmCompletionOptions,
  LlmProvider,
} from '../interfaces/ai.interfaces';

@Injectable()
export class OpenAiProvider implements LlmProvider {
  private readonly logger = new Logger(OpenAiProvider.name);
  private readonly client: OpenAI | null;
  private readonly model: string;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ai.apiKey');
    this.model = this.configService.get<string>('ai.model') || 'gpt-4.1-mini';
    this.enabled = this.configService.get<boolean>('ai.enabled') ?? !!apiKey;

    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    } else {
      this.client = null;
      this.logger.warn(
        'OPENAI_API_KEY is not set. Nova AI will use deterministic fallback responses.',
      );
    }
  }

  isConfigured(): boolean {
    return !!this.client && this.enabled;
  }

  getModel(): string {
    return this.model;
  }

  async complete(options: LlmCompletionOptions): Promise<string> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Nova AI LLM provider is not configured. Set OPENAI_API_KEY.',
      );
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: options.messages,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 1200,
        ...(options.jsonMode
          ? { response_format: { type: 'json_object' as const } }
          : {}),
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new ServiceUnavailableException('Empty response from LLM provider');
      }
      return content;
    } catch (error) {
      this.logger.error(`OpenAI completion failed: ${(error as Error).message}`);
      throw new ServiceUnavailableException(
        `Nova AI request failed: ${(error as Error).message}`,
      );
    }
  }

  async *stream(options: LlmCompletionOptions): AsyncGenerator<string, void, unknown> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Nova AI LLM provider is not configured. Set OPENAI_API_KEY.',
      );
    }

    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: options.messages,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 1200,
        stream: true,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          yield delta;
        }
      }
    } catch (error) {
      this.logger.error(`OpenAI stream failed: ${(error as Error).message}`);
      throw new ServiceUnavailableException(
        `Nova AI stream failed: ${(error as Error).message}`,
      );
    }
  }
}
