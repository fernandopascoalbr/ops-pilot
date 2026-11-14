import { z } from 'zod';

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1, 'message must not be empty'),
  strategy: z.string().trim().min(1, 'strategy must not be empty').optional(),
  reflect: z.boolean().optional().default(false),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

