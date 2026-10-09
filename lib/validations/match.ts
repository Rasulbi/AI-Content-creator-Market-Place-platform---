import { z } from "zod";

export const inviteCreatorSchema = z.object({
  campaign_id: z.string().uuid("Invalid campaign ID"),
  creator_profile_id: z.string().uuid("Invalid creator profile ID"),
  proposal_notes: z.string().trim().max(2000).optional().nullable(),
});

export type InviteCreatorInput = z.infer<typeof inviteCreatorSchema>;

export const respondMatchSchema = z.object({
  match_id: z.string().uuid("Invalid match ID"),
  action: z.enum(["accepted", "declined"]),
  proposal_notes: z.string().trim().max(2000).optional().nullable(),
});

export type RespondMatchInput = z.infer<typeof respondMatchSchema>;

export const hireCreatorSchema = z.object({
  match_id: z.string().uuid("Invalid match ID"),
});

export type HireCreatorInput = z.infer<typeof hireCreatorSchema>;
