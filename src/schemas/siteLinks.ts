import { z } from 'zod';

export const SocialLinkSchema = z.object({
  handle: z.string().min(1),
  url: z.string().url(),
  displayLabel: z.string().min(1),
});

export type SocialLink = z.infer<typeof SocialLinkSchema>;

export const SiteLinksSchema = z.object({
  email: z.string().email(),
  secondaryEmail: z.string().email().optional(),
  socials: z.object({
    instagramPoda: SocialLinkSchema,
    tiktok: SocialLinkSchema,
    soundcloud: SocialLinkSchema,
    mixcloud: SocialLinkSchema,
    instagramPartyhive: SocialLinkSchema,
  }),
  legal: z.object({
    privacyPolicyUrl: z
      .string()
      .min(1)
      .refine(
        (val) => val === '#' || val.startsWith('/') || /^https?:\/\//.test(val),
        'Must be "#", a relative route starting with "/", or an http(s) URL'
      ),
  }),
});

export type SiteLinks = z.infer<typeof SiteLinksSchema>;
