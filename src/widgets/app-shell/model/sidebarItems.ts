import type { IconType } from "react-icons";
import {
  MdAdd,
  MdHelpOutline,
  MdKeyboardDoubleArrowRight,
  MdOutlineHome,
  MdOutlineInventory2,
  MdOutlinePerson,
  MdOutlineSettings,
  MdOutlineWorkspaces,
} from "react-icons/md";

import { ROUTE_PATHS } from "@/shared";

export type SidebarItemKind = "action" | "route" | "placeholder" | "user";

export type SidebarItem = {
  id: string;
  label: string;
  icon: IconType;
  kind: SidebarItemKind;
  path?: string;
};

export const sidebarControlItem: SidebarItem = {
  id: "toggle",
  label: "펼치기",
  icon: MdKeyboardDoubleArrowRight,
  kind: "action",
};

export const sidebarPrimaryItems: SidebarItem[] = [
  {
    id: "create-workflow",
    label: "새 워크플로우",
    icon: MdAdd,
    kind: "action",
  },
  {
    id: "home",
    label: "홈",
    icon: MdOutlineHome,
    kind: "route",
    path: ROUTE_PATHS.MAIN,
  },
  {
    id: "workflows",
    label: "워크플로우",
    icon: MdOutlineWorkspaces,
    kind: "route",
    path: ROUTE_PATHS.WORKFLOWS,
  },
  {
    id: "templates",
    label: "템플릿",
    icon: MdOutlineInventory2,
    kind: "route",
    path: ROUTE_PATHS.TEMPLATES,
  },
];

export const sidebarSecondaryItems: SidebarItem[] = [
  {
    id: "account",
    label: "계정",
    icon: MdOutlinePerson,
    kind: "user",
  },
  {
    id: "help",
    label: "문의",
    icon: MdHelpOutline,
    kind: "placeholder",
  },
  {
    id: "settings",
    label: "설정",
    icon: MdOutlineSettings,
    kind: "placeholder",
  },
];
