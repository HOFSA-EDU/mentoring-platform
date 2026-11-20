import {
  BookOpenCheck,
  CalendarRange,
  CircleGauge,
  ClipboardList,
  FileQuestion,
  FlaskConical,
  GraduationCap,
  Handshake,
  ListChecks,
  MessageCircleMore,
  TrendingUp,
  UserRoundCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import type { UserRole } from "@/modules/identity/domain/role";

export type ShellNavigationItem = {
  label: string;
  href?: string;
  icon: LucideIcon;
};

type RoleShellConfig = {
  homeHref: string;
  navigation: ShellNavigationItem[];
};

export const roleShellConfig: Record<UserRole, RoleShellConfig> = {
  STUDENT: {
    homeHref: "/student",
    navigation: [
      { label: "Overview", href: "/student", icon: CircleGauge },
      { label: "Check-ins", href: "/student/check-ins", icon: ClipboardList },
      { label: "Quests", href: "/student/quests", icon: FlaskConical },
      { label: "My Journey", href: "/student#semester-journey", icon: TrendingUp },
      { label: "Agreed actions", href: "/student/mentoring", icon: Handshake },
    ],
  },
  MENTOR: {
    homeHref: "/mentor",
    navigation: [
      { label: "Overview", href: "/mentor", icon: CircleGauge },
      { label: "Assigned students", href: "/mentor/students", icon: UsersRound },
      { label: "Conversation requests", href: "/mentor/students?signal=YES", icon: MessageCircleMore },
      { label: "Follow-ups", href: "/mentor/follow-ups", icon: BookOpenCheck },
    ],
  },
  ADMIN: {
    homeHref: "/admin",
    navigation: [
      { label: "Overview", href: "/admin", icon: CircleGauge },
      { label: "Students", href: "/admin/students", icon: GraduationCap },
      { label: "Mentors", href: "/admin/mentors", icon: UsersRound },
      { label: "Assignments", href: "/admin/assignments", icon: UserRoundCheck },
      { label: "Semesters", href: "/admin/semesters", icon: CalendarRange },
      { label: "Questions", href: "/admin/questions", icon: FileQuestion },
      { label: "Quest Templates", href: "/admin/quest-templates", icon: ListChecks },
    ],
  },
};
