// CANONICAL shared Zod primitives for RenewalRadar CE request validation.
import { z } from 'zod';

export const isoDateSchema = z
  .string({
    required_error: 'Add a date in YYYY-MM-DD format.',
    invalid_type_error: 'Dates need to be text in YYYY-MM-DD format.',
  })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the YYYY-MM-DD format, like 2027-03-31.')
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day
    );
  }, 'That date does not exist on the calendar. Mind checking it?');

export const stateCodeSchema = z
  .string({ required_error: 'Pick the state this license belongs to.' })
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, 'State codes are two letters, like CA or TX.');

export const professionSchema = z.enum(['real_estate', 'insurance'], {
  errorMap: () => ({ message: 'Profession must be real_estate or insurance.' }),
});

export const licenseStatusSchema = z.enum(['active', 'expired', 'inactive'], {
  errorMap: () => ({ message: 'Status must be active, expired, or inactive.' }),
});

export const uuidSchema = z
  .string({ required_error: 'An id is required here.' })
  .uuid('That id does not look right. Refresh and try again.');

export const courseHoursSchema = z
  .number({
    required_error: 'How many hours was this course?',
    invalid_type_error: 'Hours must be a number, like 3 or 1.5.',
  })
  .positive('Hours must be more than zero.')
  .max(100, 'Hours for a single course cap at 100.');
