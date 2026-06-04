import {
  Briefcase,
  CalendarClock,
  HeartPulse,
  Laptop,
  Mail,
  MessageCircle,
  Plane,
  ShoppingCart,
  Smile,
  Sun,
  Users,
  Utensils,
  type LucideIcon,
} from "lucide-react";

export interface CategoryMeta {
  key: string;
  label: string;
  icon: LucideIcon;
}

export const CATEGORIES: CategoryMeta[] = [
  { key: "greeting", label: "인사·스몰토크", icon: MessageCircle },
  { key: "shopping", label: "쇼핑·결제", icon: ShoppingCart },
  { key: "restaurant", label: "음식·레스토랑", icon: Utensils },
  { key: "travel", label: "여행·교통", icon: Plane },
  { key: "work", label: "직장·업무", icon: Briefcase },
  { key: "phone_email", label: "전화·이메일", icon: Mail },
  { key: "emotion", label: "감정·의견", icon: Smile },
  { key: "schedule", label: "약속·일정", icon: CalendarClock },
  { key: "health", label: "건강·병원", icon: HeartPulse },
  { key: "daily", label: "일상 루틴", icon: Sun },
  { key: "social", label: "인간관계·소셜", icon: Users },
  { key: "it", label: "IT·실무", icon: Laptop },
];

const LABEL_BY_KEY = new Map(CATEGORIES.map((c) => [c.key, c.label]));

export function categoryLabel(key: string): string {
  return LABEL_BY_KEY.get(key) ?? key;
}
