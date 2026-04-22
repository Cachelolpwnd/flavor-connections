import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/AppShell";
import NotFound from "@/pages/not-found";
import MapPage from "@/pages/MapPage";
import IngredientsPage from "@/pages/IngredientsPage";
import CompoundsPage from "@/pages/CompoundsPage";
import TagsPage from "@/pages/TagsPage";
import AboutPage from "@/pages/AboutPage";
import CuisineMapPage from "@/pages/CuisineMapPage";
import ComparePage from "@/pages/ComparePage";
import RecipesPage from "@/pages/RecipesPage";

if (localStorage.getItem("theme") === "dark") {
  document.documentElement.classList.add("dark");
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={MapPage} />
      <Route path="/cuisines" component={CuisineMapPage} />
      <Route path="/ingredients" component={IngredientsPage} />
      <Route path="/compounds" component={CompoundsPage} />
      <Route path="/tags" component={TagsPage} />
      <Route path="/compare" component={ComparePage} />
      <Route path="/recipes" component={RecipesPage} />
      <Route path="/about" component={AboutPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppShell>
          <Router />
        </AppShell>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
