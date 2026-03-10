// chakra ui 라이브러리를 활용한 global style 정의
export const globalStyles = {
  "*": {
    "&::-webkit-scrollbar": {
      display: "none",
    },
    msOverflowStyle: "none" /* IE and Edge */,
    scrollbarWidth: "none" /* Firefox */,
  },
  "html, body": {},
};
