import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router";

import { Box, Flex } from "@chakra-ui/react";

import { ROUTE_PATHS } from "@/shared";
import { Footer, Header } from "@/widgets/layout/components";

const SCROLL_COLLAPSE_THRESHOLD = 24;
const SCROLL_EXPAND_THRESHOLD = 8;

export const LandingLayout = () => {
  const location = useLocation();
  const isMainRoute = location.pathname === ROUTE_PATHS.MAIN;
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);

  useEffect(() => {
    if (!isMainRoute) {
      return;
    }

    let frameId: number | null = null;

    const updateHeaderState = () => {
      frameId = null;
      const scrollY = window.scrollY;

      setIsHeaderCollapsed((current) => {
        if (scrollY > SCROLL_COLLAPSE_THRESHOLD) {
          return true;
        }

        if (scrollY < SCROLL_EXPAND_THRESHOLD) {
          return false;
        }

        return current;
      });
    };

    const scheduleUpdate = () => {
      if (frameId !== null) {
        return;
      }

      frameId = window.requestAnimationFrame(updateHeaderState);
    };

    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });

    return () => {
      window.removeEventListener("scroll", scheduleUpdate);

      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [isMainRoute]);

  return (
    <Flex direction="column" minH="100dvh">
      <Flex
        direction="column"
        maxW={{ base: "100vw", lg: "1280px" }}
        w="100vw"
        mx="auto"
        flex={1}
      >
        <Box
          h={isMainRoute && isHeaderCollapsed ? "0px" : "60px"}
          overflow="hidden"
          transition="height 260ms cubic-bezier(0.22, 1, 0.36, 1)"
        >
          <Box
            opacity={isMainRoute && isHeaderCollapsed ? 0 : 1}
            transform={
              isMainRoute && isHeaderCollapsed
                ? "translateY(-100%)"
                : "translateY(0)"
            }
            transition={[
              "opacity 220ms cubic-bezier(0.22, 1, 0.36, 1)",
              "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)",
            ].join(", ")}
          >
            <Header />
          </Box>
        </Box>
        <Box
          as="main"
          flex={1}
          w="full"
          mx="auto"
          p="pagePadding"
          overflowY={isMainRoute ? "visible" : "auto"}
        >
          <Outlet />
        </Box>
      </Flex>
      <Footer />
    </Flex>
  );
};
