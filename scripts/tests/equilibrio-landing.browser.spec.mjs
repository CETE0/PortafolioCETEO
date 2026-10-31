import { test, expect } from "@playwright/test";

const state = async (page) =>
  JSON.parse(
    await page.locator("#equilibrio-landing-diagnostics").textContent(),
  );
const stage = (page) =>
  page.locator('[aria-describedby="equilibrio-instructions"]');
const ready = async (page) =>
  expect
    .poll(async () => (await state(page)).ready, { timeout: 30000 })
    .toBe(true);

async function spyOnDraws(page) {
  await page.addInitScript(() => {
    window.__equilibrioDraws = 0;
    for (const Type of [
      window.WebGLRenderingContext,
      window.WebGL2RenderingContext,
    ]) {
      if (!Type) continue;
      for (const method of ["drawArrays", "drawElements"]) {
        const original = Type.prototype[method];
        Type.prototype[method] = function (...args) {
          window.__equilibrioDraws++;
          return original.apply(this, args);
        };
      }
    }
  });
}
const draws = (page) => page.evaluate(() => window.__equilibrioDraws);

test("landing replaces the shooter with one native sculpture and no development dashboard", async ({
  page,
}, testInfo) => {
  const requests = [];
  const errors = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await ready(page);
  await expect(
    page.getByRole("heading", { name: "Equilibrio", exact: true }),
  ).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(1);
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Measure 15-second demo" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Godot web", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("slider")).toHaveCount(0);
  expect(
    requests.filter((url) =>
      /ExperimentalShooter|ArtShooter|equilibrio\/godot|lil-gui/.test(url),
    ),
  ).toEqual([]);
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("landing-desktop.png") });
});

test("weight tilts the real platform; hopping, raising and a tumble return remain usable", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await ready(page);
  await stage(page).focus();
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(650);
  await page.keyboard.up("ArrowRight");
  // The plank rests tipped, so wait for the walk itself rather than any tilt.
  await expect
    .poll(async () => (await state(page)).stats.x)
    .toBeGreaterThan(0.5);
  const weighted = (await state(page)).stats;
  expect(weighted.x).toBeGreaterThan(0.5);
  expect(weighted.z).toBeLessThan(-0.3);
  expect(weighted.y).not.toBeCloseTo(0.96, 2);
  await page.screenshot({
    path: testInfo.outputPath("landing-loaded-platform.png"),
  });
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect
    .poll(async () =>
      Math.hypot((await state(page)).stats.x, (await state(page)).stats.z),
    )
    .toBeLessThan(0.01);
  await page.keyboard.press("Space");
  await expect.poll(async () => (await state(page)).stats.grounded).toBe(false);
  await expect
    .poll(async () => (await state(page)).stats.grounded, { timeout: 4000 })
    .toBe(true);
  await page.keyboard.press("KeyE");
  await expect(
    page.getByRole("button", { name: "Lower", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("KeyE");
  await expect(
    page.getByRole("button", { name: "Raise", exact: true }),
  ).toBeVisible();
  await page.keyboard.down("ArrowRight");
  await expect
    .poll(async () => (await state(page)).stats.fallCount, { timeout: 8000 })
    .toBeGreaterThan(0);
  await page.keyboard.up("ArrowRight");
  await expect
    .poll(
      async () => {
        const stats = (await state(page)).stats;
        return (
          stats.phase === "playing" &&
          stats.grounded &&
          Math.hypot(stats.x, stats.z) < 1
        );
      },
      { timeout: 5000 },
    )
    .toBe(true);
  await expect(page.getByText("GAME OVER", { exact: true })).toHaveCount(0);
});

test("pause, visibility and offscreen reasons stop GPU draws and cannot override manual pause", async ({
  page,
}) => {
  await spyOnDraws(page);
  await page.goto("/");
  await ready(page);
  await page.waitForTimeout(300);
  expect(await draws(page)).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.waitForTimeout(100);
  const stopped = await draws(page);
  await page.waitForTimeout(400);
  expect(await draws(page)).toBe(stopped);
  await page.evaluate(() => {
    const section = document.querySelector('section[aria-label="Equilibrio"]');
    section.style.transform = "translateY(200vh)";
  });
  await page.waitForTimeout(100);
  await page.evaluate(() => {
    document.querySelector('section[aria-label="Equilibrio"]').style.transform =
      "";
  });
  await page.waitForTimeout(150);
  expect((await state(page)).paused).toBe(true);
  expect(await draws(page)).toBe(stopped);
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect.poll(() => draws(page)).toBeGreaterThan(stopped);
  await page.evaluate(() => {
    document.querySelector('section[aria-label="Equilibrio"]').style.transform =
      "translateY(200vh)";
  });
  await expect.poll(async () => (await state(page)).paused).toBe(true);
  const offscreen = await draws(page);
  await page.waitForTimeout(400);
  expect(await draws(page)).toBe(offscreen);
  await page.evaluate(() => {
    document.querySelector('section[aria-label="Equilibrio"]').style.transform =
      "";
  });
  await expect.poll(async () => (await state(page)).paused).toBe(false);
  await expect.poll(() => draws(page)).toBeGreaterThan(offscreen);
  await page.evaluate(() => {
    window.__hiddenDescriptor = Object.getOwnPropertyDescriptor(
      document,
      "hidden",
    );
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(async () => (await state(page)).paused).toBe(true);
  const hidden = await draws(page);
  await page.waitForTimeout(300);
  expect(await draws(page)).toBe(hidden);
  await page.evaluate(() => {
    if (window.__hiddenDescriptor)
      Object.defineProperty(document, "hidden", window.__hiddenDescriptor);
    else delete document.hidden;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(async () => (await state(page)).paused).toBe(false);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.evaluate(() => {
    document.querySelector('section[aria-label="Equilibrio"]').style.transform =
      "translateY(200vh)";
  });
  await page.waitForTimeout(150);
  const beforeResize = await draws(page);
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.waitForTimeout(150);
  expect(await draws(page)).toBe(beforeResize);
  await page.evaluate(() => {
    document.querySelector('section[aria-label="Equilibrio"]').style.transform =
      "";
  });
  await expect.poll(() => draws(page)).toBeGreaterThan(beforeResize);
  const refreshed = await draws(page);
  await page.waitForTimeout(300);
  expect(await draws(page)).toBe(refreshed);
  expect((await state(page)).paused).toBe(true);
});

test("mobile controls fit, menu pauses correctly, and resizing out of an open menu does not get stuck", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await ready(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const footer = await page
    .getByRole("button", { name: "Tilt", exact: true })
    .boundingBox();
  expect(footer.y + footer.height).toBeLessThanOrEqual(844);
  await page.screenshot({ path: testInfo.outputPath("landing-mobile.png") });
  const tap = (pointerType) =>
    stage(page).evaluate((element, pointerType) => {
      const init = {
        bubbles: true,
        isPrimary: true,
        pointerId: 7,
        pointerType,
        button: 0,
        clientX: 100,
        clientY: 100,
      };
      element.dispatchEvent(new PointerEvent("pointerdown", init));
      element.dispatchEvent(new PointerEvent("pointerup", init));
    }, pointerType);
  await tap("touch");
  await expect.poll(async () => (await state(page)).raised).toBe(true);
  expect((await state(page)).stats.grounded).toBe(true);
  await tap("touch");
  await expect.poll(async () => (await state(page)).raised).toBe(false);
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await expect.poll(async () => (await state(page)).paused).toBe(true);
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect.poll(async () => (await state(page)).paused).toBe(false);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => (await state(page)).paused).toBe(true);
  await page.getByRole("button", { name: "Close menu", exact: true }).click();
  await expect.poll(async () => (await state(page)).paused).toBe(false);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page.getByRole("button", { name: "Close menu", exact: true }).click();
  expect((await state(page)).paused).toBe(true);
});

test("reduced motion is opt-in, keyboard input stays scoped, and navigation cleans up the canvas", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await ready(page);
  expect((await state(page)).paused).toBe(true);
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await stage(page).focus();
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: "Reset", exact: true }).focus();
  await page.keyboard.up("ArrowRight");
  await page.getByRole("link", { name: "CONTACT-ABOUT", exact: true }).click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(page.locator("canvas")).toHaveCount(0);
  await page
    .getByRole("link", { name: "Mateo Cereceda", exact: true })
    .first()
    .click();
  await ready(page);
  await expect(page.locator("canvas")).toHaveCount(1);
});

test("motion denial/no readings fall back; synthetic tilt calibrates and drives the camera-relative controls", async ({
  page,
}) => {
  await page.goto("/");
  await ready(page);
  await page.evaluate(() =>
    Object.defineProperty(DeviceOrientationEvent, "requestPermission", {
      configurable: true,
      value: async () => "denied",
    }),
  );
  await page.getByRole("button", { name: "Tilt", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Tilt denied" }),
  ).toBeVisible();
  await page.evaluate(() =>
    Object.defineProperty(DeviceOrientationEvent, "requestPermission", {
      configurable: true,
      value: async () => "granted",
    }),
  );
  await page.getByRole("button", { name: "Tilt", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "No tilt readings" }),
  ).toBeVisible({ timeout: 6000 });
  await page.getByRole("button", { name: "Tilt", exact: true }).click();
  await page.evaluate(() =>
    window.dispatchEvent(
      new DeviceOrientationEvent("deviceorientation", { beta: 30, gamma: 0 }),
    ),
  );
  await expect.poll(async () => (await state(page)).tilt).toBe("on");
  for (let i = 0; i < 12; i++) {
    await page.evaluate(() =>
      window.dispatchEvent(
        new DeviceOrientationEvent("deviceorientation", {
          beta: 30,
          gamma: 8,
        }),
      ),
    );
    await page.waitForTimeout(30);
  }
  await expect
    .poll(async () => (await state(page)).stats.x)
    .toBeGreaterThan(0.2);
  await expect
    .poll(async () => (await state(page)).stats.inputX)
    .toBeGreaterThan(0.2);
  expect((await state(page)).stats.grounded).toBe(true);
  await stage(page).click();
  await expect.poll(async () => (await state(page)).stats.grounded).toBe(false);
  expect((await state(page)).stats.inputX).toBeGreaterThan(0.2);
  await page.getByRole("button", { name: "Tilt off", exact: true }).click();
  expect((await state(page)).tilt).toBe("off");
});

test("late permission after client navigation cannot attach a sensor or revive the game", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await ready(page);
  await page.evaluate(() => {
    window.__orientationListeners = 0;
    const add = window.addEventListener.bind(window);
    window.addEventListener = (type, ...args) => {
      if (type === "deviceorientation") window.__orientationListeners++;
      return add(type, ...args);
    };
    Object.defineProperty(DeviceOrientationEvent, "requestPermission", {
      configurable: true,
      value: () =>
        new Promise((resolve) => {
          window.__resolveTiltPermission = resolve;
        }),
    });
  });
  await page.getByRole("button", { name: "Tilt", exact: true }).click();
  await expect.poll(async () => (await state(page)).tilt).toBe("requesting");
  await page.getByRole("link", { name: "CONTACT-ABOUT", exact: true }).click();
  await page.evaluate(() => window.__resolveTiltPermission("granted"));
  await page.waitForTimeout(150);
  await expect(page.locator("canvas")).toHaveCount(0);
  expect(await page.evaluate(() => window.__orientationListeners)).toBe(0);
  expect(errors).toEqual([]);
});

test("landing controls are translated and changing language does not restart the renderer", async ({
  page,
}) => {
  await page.goto("/");
  await ready(page);
  await page.getByRole("button", { name: "ES", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Subir", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Inclinar", exact: true }),
  ).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(1);
  expect((await state(page)).ready).toBe(true);
  await page
    .getByRole("link", { name: "CONTACTO-ACERCA", exact: true })
    .click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(page.locator("canvas")).toHaveCount(0);
});

test("missing models and missing WebGL fail gracefully without blocking portfolio navigation", async ({
  page,
}) => {
  await page.route("**/equilibrio/models/Caja.obj", (route) => route.abort());
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Retry", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "CONTACT-ABOUT", exact: true }),
  ).toBeVisible();
  await page.unroute("**/equilibrio/models/Caja.obj");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await ready(page);
  await expect(page.locator("canvas")).toHaveCount(1);
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (/webgl/i.test(type)) return null;
      return original.call(this, type, ...args);
    };
  });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Retry", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "CONTACT-ABOUT", exact: true }).click();
  await expect(page).toHaveURL(/\/contact$/);
});
