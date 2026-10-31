import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { pageTitle } from "@/data/site";

const EquilibrioStudy = lazy(
  () => import("@/components/games/equilibrio/EquilibrioStudy"),
);

export const Route = createFileRoute("/experimental/equilibrio")({
  head: () => ({ meta: [{ title: pageTitle("Equilibrio — renderer study") }] }),
  component: () => (
    <ClientOnly
      fallback={
        <div className="p-8 text-sm text-muted">
          The Equilibrio study requires JavaScript and WebGL.
        </div>
      }
    >
      <Suspense
        fallback={
          <div role="status" className="p-8 text-sm text-muted">
            Loading Equilibrio study…
          </div>
        }
      >
        <EquilibrioStudy />
      </Suspense>
    </ClientOnly>
  ),
});
