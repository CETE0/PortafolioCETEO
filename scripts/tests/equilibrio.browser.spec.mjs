import { test, expect } from "@playwright/test";

const diagnostics = async (page) =>
  JSON.parse(await page.locator("#equilibrio-diagnostics").textContent());
const stage = (page) =>
  page.getByRole("group", { name: /^Interactive Equilibrio stage/ });
const ready = async (page) =>
  expect
    .poll(async () => (await diagnostics(page)).ready, { timeout: 60000 })
    .toBe(true);
const position = async (page) => {
  await page.waitForTimeout(1200); // engine diagnostics publish at 1 Hz
  return (await diagnostics(page)).stats;
};

for (const lifecycle of [
  "window-blur",
  "stage-blur",
  "visibility-only",
  "repeat-after-blur",
]) {
  test(`input release: ${lifecycle}`, async ({ page }, testInfo) => {
    await page.goto("/experimental/equilibrio");
    await ready(page);
    await stage(page).focus();
    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(250);
    await page.evaluate(async (kind) => {
      const stage = document.querySelector(
        '[aria-label^="Interactive Equilibrio stage"]',
      );
      if (kind === "stage-blur") stage.blur();
      else if (kind === "visibility-only") {
        const original = Object.getOwnPropertyDescriptor(document, "hidden");
        Object.defineProperty(document, "hidden", {
          configurable: true,
          get: () => true,
        });
        document.dispatchEvent(new Event("visibilitychange"));
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (original) Object.defineProperty(document, "hidden", original);
        else delete document.hidden;
        document.dispatchEvent(new Event("visibilitychange"));
      } else {
        window.dispatchEvent(new Event("blur"));
        if (kind === "repeat-after-blur")
          stage.dispatchEvent(
            new KeyboardEvent("keydown", {
              key: "ArrowRight",
              repeat: true,
              bubbles: true,
            }),
          );
      }
    }, lifecycle);
    const first = await position(page);
    const second = await position(page);
    await page.keyboard.up("ArrowRight");
    await testInfo.attach("positions", {
      body: JSON.stringify({ lifecycle, first, second }),
      contentType: "application/json",
    });
    expect(second.fallCount).toBe(first.fallCount);
    expect(second.x).toBeCloseTo(first.x, 2);
    expect(second.z).toBeCloseTo(first.z, 2);
  });
}

test("both renderers: original character, shaders, benchmark and iframe resources", async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/experimental/equilibrio");
  for (const engine of ["three", "godot"]) {
    await page
      .getByRole("button", {
        name: engine === "three" ? "Three.js" : "Godot web",
        exact: true,
      })
      .click();
    await ready(page);
    await expect
      .poll(async () => (await diagnostics(page)).stats?.triangles ?? 0)
      .toBeGreaterThan(6000);
    for (const mode of ["ASCII", "Unshaded", "Dither"]) {
      await page.getByRole("button", { name: mode, exact: true }).click();
      await page.waitForTimeout(250);
      await testInfo.attach(`${engine}-${mode}`, {
        body: await stage(page).screenshot(),
        contentType: "image/png",
      });
    }
    await page.getByRole("button", { name: "Raise", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Lower", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.waitForTimeout(450);
    await testInfo.attach(`${engine}-raised`, {
      body: await stage(page).screenshot(),
      contentType: "image/png",
    });
    await page.getByRole("button", { name: "Lower", exact: true }).click();
    if (engine === "three") {
      const grain = page.getByRole("slider", { name: /Dither grain/ });
      await grain.focus();
      await grain.press("Home");
      await expect.poll(async () => (await diagnostics(page)).grain).toBe(1);
    }
    await page
      .getByRole("button", { name: "Measure 15-second demo", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (await diagnostics(page)).results.filter(
            (result) => result.engine === engine,
          ).length,
        { timeout: 22000 },
      )
      .toBe(1);
    const result = (await diagnostics(page)).results.find(
      (item) => item.engine === engine,
    );
    expect(result.frames.samples).toBeGreaterThan(30);
    expect(result.frames.fps).toBeGreaterThan(0);
    expect(result.grain).toBe(1);
    expect(result.palette).toBe(
      engine === "three" ? "carbon" : "godot-reference",
    );
    if (engine === "godot")
      expect(
        result.resources.some(
          (resource) =>
            resource.url.endsWith("index.wasm.gz") &&
            resource.encodedBytes > 1000000,
        ),
      ).toBe(true);
  }
  const data = await diagnostics(page);
  await testInfo.attach("comparison", {
    body: JSON.stringify(data, null, 2),
    contentType: "application/json",
  });
  console.log("COMPARISON", JSON.stringify(data.results));
  const downloadEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download results", exact: true })
    .click();
  const download = await downloadEvent;
  await download.saveAs(testInfo.outputPath("comparison.json"));
  expect(errors).toEqual([]);
});

test("dither visual calibration against the Godot reference", async ({
  page,
}, testInfo) => {
  const captures = [];
  for (const engine of ["three", "godot"]) {
    await page.goto(`/experimental/equilibrio?engine=${engine}`);
    await ready(page);
    await page.getByRole("button", { name: "Unshaded", exact: true }).click();
    await page.waitForTimeout(150);
    const solid = await stage(page).screenshot({
      path: testInfo.outputPath(`${engine}-solid.png`),
    });
    await page.getByRole("button", { name: "Dither", exact: true }).click();
    await page.waitForTimeout(150);
    const dither = await stage(page).screenshot({
      path: testInfo.outputPath(`${engine}-dither.png`),
    });
    const measurement = await page.evaluate(
      async ({ solid, dither, palette }) => {
        const decode = async (base64) => {
          const bitmap = await createImageBitmap(
            await (await fetch(`data:image/png;base64,${base64}`)).blob(),
          );
          const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
          const context = canvas.getContext("2d");
          context.drawImage(bitmap, 0, 0);
          bitmap.close();
          return context.getImageData(0, 0, canvas.width, canvas.height);
        };
        const raw = await decode(solid);
        const shaded = await decode(dither);
        const mask = [];
        for (let y = 0; y < raw.height - 50; y++)
          for (let x = 0; x < raw.width; x++) {
            const offset = (y * raw.width + x) * 4;
            const [r, g, b] = raw.data.slice(offset, offset + 3);
            if (r > 35 && Math.max(r, g, b) - Math.min(r, g, b) < 12)
              mask.push({ x, y, offset });
          }
        const top = Math.min(...mask.map((pixel) => pixel.y));
        const bottom = Math.max(...mask.map((pixel) => pixel.y));
        const body = mask.filter(
          (pixel) => pixel.y < top + (bottom - top) * 0.5,
        );
        const ivory = (pixels) =>
          pixels.filter(
            ({ offset }) =>
              shaded.data[offset] > 180 && shaded.data[offset + 1] > 180,
          ).length / pixels.length;
        const matches = (offset, palette) =>
          palette.every(
            (value, channel) =>
              Math.abs(shaded.data[offset + channel] - value) <= 2,
          );
        const paletteCoverage =
          mask.filter(
            ({ offset }) =>
              matches(offset, palette[0]) || matches(offset, palette[1]),
          ).length / mask.length;
        return {
          width: raw.width,
          height: raw.height,
          objectPixels: mask.length,
          bodyPixels: body.length,
          ivoryCoverage: ivory(mask),
          bodyIvoryCoverage: ivory(body),
          paletteCoverage,
        };
      },
      {
        solid: solid.toString("base64"),
        dither: dither.toString("base64"),
        palette:
          engine === "three"
            ? [
                [20, 20, 20],
                [245, 243, 236],
              ]
            : [
                [18, 23, 56],
                [245, 232, 199],
              ],
      },
    );
    captures.push({ engine, ...measurement });
    console.log("VISUAL", JSON.stringify({ engine, ...measurement }));
  }
  await testInfo.attach("visual-calibration", {
    body: JSON.stringify(captures, null, 2),
    contentType: "application/json",
  });
  expect(captures[0].bodyPixels).toBeGreaterThan(1000);
  expect(
    Math.abs(captures[0].bodyIvoryCoverage - captures[1].bodyIvoryCoverage),
  ).toBeLessThan(0.08);
  expect(
    Math.abs(captures[0].ivoryCoverage - captures[1].ivoryCoverage),
  ).toBeLessThan(0.08);
  expect(captures[0].paletteCoverage).toBeGreaterThan(0.99);
});

test("print palettes and larger Bayer grain redraw while paused without restarting the game", async ({
  page,
}, testInfo) => {
  await page.goto("/experimental/equilibrio");
  await ready(page);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Resume", exact: true }),
  ).toBeVisible();
  const canvas = page.locator('canvas[aria-label^="Pícaro"]');
  for (const palette of [
    { id: "carbon", name: "Carbon", dark: [20, 20, 20] },
    { id: "paper", name: "Paper", dark: [20, 20, 20] },
    { id: "red", name: "Red print", dark: [231, 0, 11] },
  ]) {
    await page.getByRole("button", { name: palette.name, exact: true }).click();
    await expect
      .poll(async () => (await diagnostics(page)).palette)
      .toBe(palette.id);
    await page.waitForTimeout(100);
    const image = await canvas.screenshot({
      path: testInfo.outputPath(`${palette.id}-palette.png`),
    });
    const counts = await page.evaluate(
      async ({ png, dark }) => {
        const bitmap = await createImageBitmap(
          await (await fetch(`data:image/png;base64,${png}`)).blob(),
        );
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const context = canvas.getContext("2d");
        context.drawImage(bitmap, 0, 0);
        bitmap.close();
        const pixels = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        ).data;
        const counts = {
          dark: 0,
          light: 0,
          other: 0,
          total: pixels.length / 4,
        };
        const matches = (offset, color) =>
          color.every(
            (value, channel) => Math.abs(pixels[offset + channel] - value) <= 2,
          );
        for (let i = 0; i < pixels.length; i += 4) {
          if (matches(i, dark)) counts.dark++;
          else if (matches(i, [245, 243, 236])) counts.light++;
          else counts.other++;
        }
        return counts;
      },
      { png: image.toString("base64"), dark: palette.dark },
    );
    expect(counts.dark).toBeGreaterThan(500);
    expect(counts.light).toBeGreaterThan(500);
    expect(counts.other / counts.total).toBeLessThan(0.01);
    expect((await diagnostics(page)).paused).toBe(true);
  }
  const slider = page.getByRole("slider", { name: /Dither grain/ });
  await slider.focus();
  await slider.press("Home");
  await page.waitForTimeout(100);
  const fine = await canvas.screenshot({
    path: testInfo.outputPath("fine-grain.png"),
  });
  await slider.press("End");
  await expect.poll(async () => (await diagnostics(page)).grain).toBe(3);
  await page.waitForTimeout(100);
  const coarse = await canvas.screenshot({
    path: testInfo.outputPath("coarse-grain.png"),
  });
  expect(coarse.equals(fine)).toBe(false);
  await page.getByRole("button", { name: "Godot web", exact: true }).click();
  await ready(page);
  await expect(
    page.getByRole("button", { name: "Carbon", exact: true }),
  ).toBeDisabled();
  await expect(slider).toBeDisabled();
});

test("reduced motion starts paused and mobile permission denial preserves fallback controls", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/experimental/equilibrio?engine=godot");
  await ready(page);
  await expect(
    page.getByRole("button", { name: "Resume", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.evaluate(() => {
    Object.defineProperty(DeviceOrientationEvent, "requestPermission", {
      configurable: true,
      value: async () => "denied",
    });
  });
  await page.getByRole("button", { name: "Enable tilt", exact: true }).click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Motion permission was not granted" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Hop", exact: true }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
