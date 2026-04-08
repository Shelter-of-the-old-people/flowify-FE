import { useEffect, useRef } from "react";
import type { IconType } from "react-icons";

import { Box } from "@chakra-ui/react";

import { LogoutMenu, useLogout } from "@/features/auth/logout";

import { SidebarNavItem } from "./SidebarNavItem";

type SidebarUserMenuProps = {
  icon: IconType;
  label: string;
  isExpanded: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
};

export const SidebarUserMenu = ({
  icon,
  label,
  isExpanded,
  isOpen,
  onToggle,
  onClose,
}: SidebarUserMenuProps) => {
  const { isPending, logout } = useLogout();
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;

      if (
        containerRef.current &&
        target instanceof Node &&
        !containerRef.current.contains(target)
      ) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  return (
    <Box ref={containerRef} position="relative">
      <SidebarNavItem
        icon={icon}
        label={label}
        isExpanded={isExpanded}
        isActive={isOpen}
        onClick={onToggle}
      />

      {isOpen ? (
        <Box position="absolute" left="calc(100% + 8px)" bottom="0" zIndex={20}>
          <LogoutMenu
            isPending={isPending}
            onLogout={() => {
              onClose();
              void logout();
            }}
          />
        </Box>
      ) : null}
    </Box>
  );
};
