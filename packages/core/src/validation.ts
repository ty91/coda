import { z } from 'zod';

import { ASK_RESPONSE_SOURCE, type AskRequestBatch, type AskResponseBatch } from './contracts.js';

const nonEmptyTextSchema = z
  .string()
  .trim()
  .min(1, 'value must not be empty')
  .max(240, 'value must be 240 characters or fewer');

export const nonEmptyDescriptionSchema = nonEmptyTextSchema;

export const statusOptionsSchema = z.object({
  json: z.boolean().default(false),
});

export type StatusOptions = z.infer<typeof statusOptionsSchema>;

const snakeCaseIdSchema = z
  .string()
  .trim()
  .regex(/^[a-z][a-z0-9_]*$/, 'id must be snake_case');

const askOptionSchema = z.object({
  label: nonEmptyTextSchema,
  description: nonEmptyTextSchema,
});

const askQuestionSchema = z
  .object({
    header: z
      .string()
      .trim()
      .min(1, 'header must not be empty')
      .max(12, 'header must be 12 characters or fewer'),
    id: snakeCaseIdSchema,
    question: nonEmptyTextSchema,
    options: z.array(askOptionSchema).min(2, 'options must contain at least 2 entries'),
  })
  .superRefine((question, context) => {
    question.options.forEach((option, optionIndex) => {
      if (option.label.includes('Recommended') && !option.label.endsWith('(Recommended)')) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'recommended option labels must use "(Recommended)" suffix',
          path: ['options', optionIndex, 'label'],
        });
      }
    });
  });

const askNoteSchema = z.object({
  label: nonEmptyTextSchema,
  required: z.boolean().default(false),
});

export const askRequestBatchSchema = z
  .object({
    questions: z.array(askQuestionSchema).min(1, 'questions must contain at least 1 entry'),
    note: askNoteSchema.optional(),
  })
  .superRefine((value, context) => {
    const seen = new Set<string>();

    value.questions.forEach((question, index) => {
      if (seen.has(question.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate question id: ${question.id}`,
          path: ['questions', index, 'id'],
        });
        return;
      }

      seen.add(question.id);
    });
  });

const nullableIsoDatetimeSchema = z
  .string()
  .datetime({ offset: true })
  .nullable();

const askAnswerSchema = z
  .object({
    id: snakeCaseIdSchema,
    selected_label: nonEmptyTextSchema,
    selected_index: z.number().int().min(0).nullable(),
    used_other: z.boolean(),
    other_text: z.string().trim().min(1, 'other_text must not be empty').nullable(),
  })
  .superRefine((value, context) => {
    if (value.used_other && value.other_text === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'other_text is required when used_other is true',
        path: ['other_text'],
      });
    }

    if (!value.used_other && value.other_text !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'other_text must be null when used_other is false',
        path: ['other_text'],
      });
    }

    if (value.used_other && value.selected_index !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'selected_index must be null when used_other is true',
        path: ['selected_index'],
      });
    }
  });

export const askResponseBatchSchema = z.object({
  ask_id: nonEmptyTextSchema,
  answers: z.array(askAnswerSchema),
  note: z.string().trim().min(1, 'note must not be empty').nullable(),
  status: z.enum(['answered', 'cancelled', 'expired']),
  answered_at_iso: nullableIsoDatetimeSchema,
  source: z.literal(ASK_RESPONSE_SOURCE),
});

const askRequestJsonInputSchema = z
  .string()
  .trim()
  .min(1, 'ask request JSON must not be empty');

export const parseNonEmptyDescription = (input: unknown): string => {
  return nonEmptyDescriptionSchema.parse(input);
};

export const parseStatusOptions = (input: unknown): StatusOptions => {
  return statusOptionsSchema.parse(input);
};

export const parseAskRequestBatch = (input: unknown): AskRequestBatch => {
  return askRequestBatchSchema.parse(input);
};

export const parseAskRequestBatchJson = (input: unknown): AskRequestBatch => {
  const jsonText = askRequestJsonInputSchema.parse(input);

  try {
    return parseAskRequestBatch(JSON.parse(jsonText) as unknown);
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      throw new Error(`invalid ask request JSON: ${error.message}`);
    }

    throw error;
  }
};

export const parseAskResponseBatch = (input: unknown): AskResponseBatch => {
  return askResponseBatchSchema.parse(input);
};
