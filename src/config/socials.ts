export type SocialPriority = "lead" | "primary" | "secondary";

export type SocialLink = {
  id: "instagram" | "telegram" | "youtube" | "email" | "threads" | "tiktok";
  label: string;
  href: string;
  priority: SocialPriority;
};

export const SOCIALS: readonly SocialLink[] = [
  { id: "instagram", label: "Instagram", href: "https://www.instagram.com/y.elyginn/", priority: "lead" },
  { id: "telegram", label: "Telegram", href: "https://t.me/YuriElygin", priority: "primary" },
  { id: "email", label: "Email", href: "mailto:y.elyginn@gmail.com", priority: "primary" },
  { id: "youtube", label: "YouTube", href: "https://www.youtube.com/@YuriElygin", priority: "primary" },
  { id: "threads", label: "Threads", href: "https://www.threads.com/@y.elyginn?xmt=AQG0SYWjzuo2P6yTjRp1vQ_NIYKKRIArjre9fZ78MbhuM6Q", priority: "secondary" },
  { id: "tiktok", label: "TikTok", href: "https://www.tiktok.com/@user8546575808274", priority: "secondary" },
] as const;

export const PRIMARY_SOCIALS = SOCIALS.filter((social) => social.priority !== "secondary");
export const SECONDARY_SOCIALS = SOCIALS.filter((social) => social.priority === "secondary");
