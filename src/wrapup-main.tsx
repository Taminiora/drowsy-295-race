import "@fontsource/maple-mono/400.css";
import "@fontsource/maple-mono/600.css";
import "@fontsource/maple-mono/700.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WrapupApp } from "./WrapupApp";
import "./wrapup.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WrapupApp />
  </StrictMode>,
);
