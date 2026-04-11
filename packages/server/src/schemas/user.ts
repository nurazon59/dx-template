import { z } from "zod";

export const UserSchema = z
  .object({
    id: z.string().uuid(),
    slackUserId: z.string(),
    displayName: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .meta({ ref: "User" });

export const CreateUserInputSchema = z
  .object({
    slackUserId: z.string().min(1),
    displayName: z.string().min(1),
  })
  .meta({ ref: "CreateUserInput" });
