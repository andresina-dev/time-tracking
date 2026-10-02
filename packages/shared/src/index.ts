import { z } from "zod";

export const roleSchema = z.enum(["employee", "driver", "companion", "admin"]);
export type Role = z.infer<typeof roleSchema>;

export const tourSchema = z.enum(["tour-1", "tour-2", "tour-3"]);
export type Tour = z.infer<typeof tourSchema>;

export const dayStatusSchema = z.enum(["", "K", "U", "F", "UF"]);
export type DayStatus = z.infer<typeof dayStatusSchema>;

export const timeEntrySchema = z.object({
  id: z.string(),
  userId: z.string(),
  date: z.string().date(),
  tour: tourSchema,
  startedAt: z.string().datetime({ offset: true }).nullable(),
  endedAt: z.string().datetime({ offset: true }).nullable(),
  status: z.enum(["draft", "submitted", "approved", "rejected"]),
  dayStatus: dayStatusSchema.default(""),
  remark: z.string().default(""),
  tourNumber: z.number().int().positive(),
  decimalHours: z.number().min(0),
  durationMinutes: z.number().int().nonnegative()
});
export type TimeEntry = z.infer<typeof timeEntrySchema>;

export const startEntrySchema = z.object({
  date: z.string().date(),
  tour: tourSchema,
  dayStatus: dayStatusSchema.default(""),
  remark: z.string().default(""),
  tourNumber: z.number().int().positive(),
  decimalHours: z.number().min(0).max(24).default(0)
});
export type StartEntry = z.infer<typeof startEntrySchema>;

export const updateEntrySchema = z.object({
  startedAt: z.string().datetime({ offset: true }).nullable().optional(),
  endedAt: z.string().datetime({ offset: true }).nullable().optional(),
  dayStatus: dayStatusSchema.optional(),
  remark: z.string().max(500, "Die Bemerkung darf höchstens 500 Zeichen enthalten.").optional(),
  tourNumber: z.number().int().positive().optional(),
  decimalHours: z.number().min(0).max(24).optional(),
  status: z.enum(["draft", "submitted", "approved", "rejected"]).optional()
});
export type UpdateEntry = z.infer<typeof updateEntrySchema>;

export const userStatusSchema = z.enum(["pending", "active"]);
export type UserStatus = z.infer<typeof userStatusSchema>;

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: roleSchema,
  status: userStatusSchema
});
export type User = z.infer<typeof userSchema>;

export const userProfileSchema = z.object({
  salutation: z.enum(["", "Herr", "Frau", "Divers"]).default(""),
  firstName: z.string().trim().max(100).default(""),
  lastName: z.string().trim().max(100).default(""),
  street: z.string().trim().max(150).default(""),
  houseNumber: z.string().trim().max(20).default(""),
  postalCode: z.string().trim().max(20).default(""),
  city: z.string().trim().max(100).default(""),
  mobile: z.string().trim().max(40).default(""),
  sickHours: z.coerce.number().min(0).max(100000).default(0),
  vacationHours: z.coerce.number().min(0).max(100000).default(0),
  licensePlate: z.string().trim().max(20).default(""),
  electricCar: z.boolean().default(false)
});
export type UserProfile = z.infer<typeof userProfileSchema>;

export const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: roleSchema.default("employee"),
  profile: userProfileSchema.default({})
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  // Legt fest, welches Session-Cookie gesetzt wird: getrennte Logins für Frontend und Nutzerverwaltung.
  audience: z.enum(["frontend", "accounts"]).default("frontend")
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email: z.string().email() });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const setPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Das Passwort muss mindestens 8 Zeichen lang sein.")
});
export type SetPasswordInput = z.infer<typeof setPasswordSchema>;

export const spreadsheetQuerySchema = z.object({
  userId: z.string().min(1),
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12)
});

export type SpreadsheetDescriptor = {
  userId: string;
  year: number;
  month: number;
  fileName: string;
  exists: boolean;
};