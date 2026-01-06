import { z } from "zod";

// Student validation schema
export const studentSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email must be less than 255 characters"),
  fullName: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .max(100, "Full name must be less than 100 characters"),
});

// Teacher validation schema
export const teacherSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email must be less than 255 characters"),
  fullName: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .max(100, "Full name must be less than 100 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be less than 72 characters"),
});

// Subject validation schema
export const subjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Subject name is required")
    .max(100, "Subject name must be less than 100 characters"),
  description: z
    .string()
    .trim()
    .max(500, "Description must be less than 500 characters")
    .optional()
    .or(z.literal("")),
});

// Assessment validation schema
export const assessmentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
  subject_id: z.string().uuid("Please select a valid subject"),
  duration_minutes: z
    .number()
    .int("Duration must be a whole number")
    .min(1, "Duration must be at least 1 minute")
    .max(480, "Duration cannot exceed 8 hours"),
  passing_score: z
    .number()
    .int("Passing score must be a whole number")
    .min(0, "Passing score cannot be negative")
    .max(100, "Passing score cannot exceed 100"),
});

// Question validation schema
export const questionSchema = z.object({
  question_text: z
    .string()
    .trim()
    .min(1, "Question is required")
    .max(2000, "Question must be less than 2000 characters"),
  option_a: z
    .string()
    .trim()
    .min(1, "Option A is required")
    .max(500, "Option must be less than 500 characters"),
  option_b: z
    .string()
    .trim()
    .min(1, "Option B is required")
    .max(500, "Option must be less than 500 characters"),
  option_c: z
    .string()
    .trim()
    .min(1, "Option C is required")
    .max(500, "Option must be less than 500 characters"),
  option_d: z
    .string()
    .trim()
    .min(1, "Option D is required")
    .max(500, "Option must be less than 500 characters"),
  correct_answer: z.enum(["A", "B", "C", "D"], {
    errorMap: () => ({ message: "Please select the correct answer" }),
  }),
});

export type StudentFormData = z.infer<typeof studentSchema>;
export type TeacherFormData = z.infer<typeof teacherSchema>;
export type SubjectFormData = z.infer<typeof subjectSchema>;
export type AssessmentFormData = z.infer<typeof assessmentSchema>;
export type QuestionFormData = z.infer<typeof questionSchema>;
