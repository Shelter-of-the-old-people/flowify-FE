import { Button } from "@chakra-ui/react";

type LogoutMenuProps = {
  isPending?: boolean;
  onLogout: () => void;
};

export const LogoutMenu = ({
  isPending = false,
  onLogout,
}: LogoutMenuProps) => {
  return (
    <Button
      size="sm"
      bg="white"
      color="gray.900"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="12px"
      boxShadow="0 10px 30px rgba(15, 23, 42, 0.12)"
      _hover={{ bg: "gray.50" }}
      _active={{ bg: "gray.100" }}
      loading={isPending}
      onClick={onLogout}
    >
      로그아웃
    </Button>
  );
};
