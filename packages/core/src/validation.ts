import { z } from 'zod';

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

export const parseNonEmptyDescription = (input: unknown): string => {
  return nonEmptyDescriptionSchema.parse(input);
};

export const parseStatusOptions = (input: unknown): StatusOptions => {
  return statusOptionsSchema.parse(input);
};
