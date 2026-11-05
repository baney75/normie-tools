import { Shell } from "./components/Shell";
import { useHashRoute } from "./lib/hashRouter";
import { Agents } from "./pages/Agents";
import { Home } from "./pages/Home";
import { Install } from "./pages/Install";
import { NotFound } from "./pages/NotFound";
import { Research } from "./pages/Research";
import { ToolPage } from "./pages/ToolPage";

export function App() {
  const route = useHashRoute();
  let page;
  switch (route.name) {
    case "home": page = <Home />; break;
    case "agents": page = <Agents />; break;
    case "install": page = <Install />; break;
    case "research": page = <Research />; break;
    case "tool": page = <ToolPage id={route.id} />; break;
    default: page = <NotFound />;
  }
  return <Shell>{page}</Shell>;
}
