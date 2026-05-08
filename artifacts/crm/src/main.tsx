import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./tailwind.generated.css";

setBaseUrl(import.meta.env.VITE_API_URL ?? null);

createRoot(document.getElementById("root")!).render(<App />);
