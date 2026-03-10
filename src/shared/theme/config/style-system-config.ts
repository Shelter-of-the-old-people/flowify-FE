import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

import { colorSemanticToken, colorToken, layoutToken } from "../../styles";
import { globalStyles } from "../global";

const config = defineConfig({
  cssVarsRoot: ":where(:root, :host)",
  cssVarsPrefix: "sd",

  globalCss: globalStyles,

  theme: {
    tokens: {
      fonts: {
        heading: { value: "Pretendard" },
        body: { value: "Pretendard" },
      },
      colors: colorToken,
      sizes: layoutToken,
    },
    semanticTokens: {
      colors: colorSemanticToken,
    },
  },
});

export const system = createSystem(defaultConfig, config);
