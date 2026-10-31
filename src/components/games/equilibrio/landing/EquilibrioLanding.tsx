import { useLanguage } from "@/i18n/LanguageContext";
import { defaultPalette, getStageColors } from "../appearance";
import { useLandingControls } from "./useLandingControls";

const button =
  "min-h-10 min-w-10 px-3 py-2 font-mono text-[11px] leading-5 underline-offset-4 transition-[opacity,transform] duration-150 hover:underline active:scale-[0.96] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-35 disabled:no-underline motion-reduce:transform-none motion-reduce:transition-none";

export default function EquilibrioLanding() {
  const { t } = useLanguage();
  const game = useLandingControls();
  const colors = getStageColors(defaultPalette, "dither");
  const focusStage = () => game.stage.current?.focus({ preventScroll: true });

  return (
    <section
      aria-label={t("games.equilibrio.title")}
      data-cursor="red"
      className="flex h-[calc(100svh-3rem)] min-h-0 flex-col md:h-screen"
      style={{ backgroundColor: colors.background, color: colors.foreground }}
    >
      <div className="relative min-h-40 flex-1">
        <div
          ref={game.stage}
          role="group"
          tabIndex={0}
          aria-label={t("games.equilibrio.stage")}
          aria-describedby="equilibrio-instructions"
          aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight W A S D Space E"
          className="absolute inset-0 touch-none select-none overflow-hidden outline-none focus-visible:outline focus-visible:-outline-offset-4 focus-visible:outline-current"
        >
          <div
            ref={game.container}
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
          />
        </div>

        <h1 className="sr-only">{t("games.equilibrio.title")}</h1>

        {(!game.ready || game.error) && (
          <div
            className="absolute inset-0 flex items-center justify-center px-6"
            style={{ backgroundColor: colors.background }}
          >
            <div className="max-w-xs text-center font-mono text-xs leading-relaxed">
              <p role="status">
                {t(
                  `games.equilibrio.${game.error ? "unavailable" : "loading"}`,
                )}
              </p>
              {game.error && (
                <button
                  type="button"
                  onClick={game.retry}
                  className={`${button} mt-4 underline`}
                >
                  {t("games.equilibrio.retry")}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <footer className="relative flex-none px-4 pt-2 pb-4 md:px-8 md:pb-6">
        <div id="equilibrio-instructions" className="sr-only">
          <p>{t("games.equilibrio.keyboard")}</p>
          <p>{t("games.equilibrio.touch")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-1 gap-y-0 md:-ml-3">
          <button
            type="button"
            className={button}
            disabled={!game.ready}
            aria-pressed={game.raised}
            onClick={() => {
              game.toggleRaised();
              focusStage();
            }}
          >
            {t(`games.equilibrio.${game.raised ? "lower" : "raise"}`)}
          </button>
          <button
            type="button"
            className={button}
            disabled={!game.ready}
            onClick={() => {
              game.togglePause();
              // A fresh gesture/focus is required; held keys never restart here.
              if (game.paused) focusStage();
            }}
          >
            {t(`games.equilibrio.${game.paused ? "resume" : "pause"}`)}
          </button>
          <button
            type="button"
            className={button}
            disabled={!game.ready}
            onClick={() => {
              game.recenter();
              focusStage();
            }}
          >
            {t("games.equilibrio.recenter")}
          </button>
        </div>
      </footer>
      <output id="equilibrio-landing-diagnostics" hidden>
        {JSON.stringify({
          ready: game.ready,
          paused: game.paused,
          tilt: game.tilt,
          raised: game.raised,
          stats: game.stats,
          error: game.error,
        })}
      </output>
    </section>
  );
}
