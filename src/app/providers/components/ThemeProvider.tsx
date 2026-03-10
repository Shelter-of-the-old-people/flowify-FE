import { ChakraProvider } from "@chakra-ui/react";

import { system } from "@/shared";

type Props = {
  children: React.ReactNode;
};

export const ThemeProvider = ({ children }: Props) => {
  return <ChakraProvider value={system}>{children}</ChakraProvider>;
};
