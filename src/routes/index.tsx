import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  defaultPalette,
  getStageColors,
} from "@/components/games/equilibrio/appearance";

const EquilibrioLanding = lazy(
  () => import("@/components/games/equilibrio/landing/EquilibrioLanding"),
);

export const Route = createFileRoute("/")({
  component: Home,
});

function LandingPlaceholder() {
  const { t } = useLanguage();
  const colors = getStageColors(defaultPalette, "dither");
  return (
    <div
      data-cursor="red"
      className="flex h-full items-center justify-center px-6 font-mono text-xs"
      style={{ backgroundColor: colors.background, color: colors.foreground }}
    >
      <p role="status">{t("games.equilibrio.loading")}</p>
    </div>
  );
}

function Home() {
  return (
    <ClientOnly fallback={<LandingPlaceholder />}>
      <Suspense fallback={<LandingPlaceholder />}>
        <EquilibrioLanding />
      </Suspense>
    </ClientOnly>
  );
}
