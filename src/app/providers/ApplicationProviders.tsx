import { QueryProvider, ThemeProvider } from "./components";

type Props = {
  children: React.ReactNode;
};

export const ApplicationProviders = ({ children }: Props) => {
  return (
    <QueryProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryProvider>
  );
};
