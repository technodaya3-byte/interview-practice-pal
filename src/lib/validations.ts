import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signUpSchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").max(72, "Password must be less than 72 characters"),
});

export const profileSchema = z.object({
  display_name: z.string().trim().min(1, "Name is required").max(100).optional(),
  address: z.string().max(500).optional().or(z.literal("")),
  college: z.string().max(200).optional().or(z.literal("")),
  degree: z.string().max(200).optional().or(z.literal("")),
  domain: z.string().max(100).optional().or(z.literal("")),
  linkedin_url: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  github_url: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
});

export type SignInFormData = z.infer<typeof signInSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
