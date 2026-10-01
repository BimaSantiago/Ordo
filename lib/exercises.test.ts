import { describe, expect, it } from "vitest";
import { bodyHighlights, exerciseImageUrl, MUSCLE_BODY_SLUGS, MUSCLE_GROUP_OPTIONS, needsSide } from "./exercises";

const DATASET_MUSCLES = [
  "abdominals",
  "abductors",
  "adductors",
  "biceps",
  "calves",
  "chest",
  "forearms",
  "glutes",
  "hamstrings",
  "lats",
  "lower back",
  "middle back",
  "neck",
  "quadriceps",
  "shoulders",
  "traps",
  "triceps",
];

describe("MUSCLE_BODY_SLUGS", () => {
  it("cubre los 17 grupos musculares del dataset", () => {
    for (const muscle of DATASET_MUSCLES) expect(MUSCLE_BODY_SLUGS[muscle]?.length ?? 0).toBeGreaterThan(0);
  });

  it("cubre todos los grupos que se pueden elegir en un ejercicio personalizado", () => {
    for (const { value } of MUSCLE_GROUP_OPTIONS) expect(MUSCLE_BODY_SLUGS[value]).toBeDefined();
  });
});

describe("bodyHighlights", () => {
  it("marca el principal con intensidad 1 y los secundarios con 2", () => {
    const { highlights, mainSide } = bodyHighlights("chest", ["shoulders", "triceps"]);
    expect(highlights).toEqual(
      expect.arrayContaining([
        { slug: "chest", intensity: 1 },
        { slug: "deltoids", intensity: 2 },
        { slug: "triceps", intensity: 2 },
      ])
    );
    expect(mainSide).toBe("front");
  });

  it("el principal gana si comparte zona con un secundario", () => {
    const { highlights } = bodyHighlights("lats", ["middle back"]);
    expect(highlights).toEqual([{ slug: "upper-back", intensity: 1 }]);
  });

  it("usa la vista de espalda cuando el principal es de espalda", () => {
    expect(bodyHighlights("lower back", ["glutes"]).mainSide).toBe("back");
    expect(bodyHighlights("hamstrings", null).mainSide).toBe("back");
  });

  it("no truena sin músculos o con valores desconocidos", () => {
    expect(bodyHighlights(null, null)).toEqual({ highlights: [], mainSide: "front" });
    expect(bodyHighlights("otro", ["x"]).highlights).toEqual([]);
  });
});

describe("needsSide", () => {
  it("detecta zonas que solo existen en una vista", () => {
    const { highlights } = bodyHighlights("chest", ["lower back"]);
    expect(needsSide(highlights, "front")).toBe(true);
    expect(needsSide(highlights, "back")).toBe(true);
    expect(needsSide(bodyHighlights("biceps", null).highlights, "back")).toBe(false);
  });
});

describe("exerciseImageUrl", () => {
  it("arma la URL del CDN fijada al commit y codifica el nombre", () => {
    expect(exerciseImageUrl("3_4_Sit-Up/0.jpg")).toBe(
      "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5/exercises/3_4_Sit-Up/0.jpg"
    );
    expect(exerciseImageUrl("Dancer's_Stretch/0.jpg")).toContain("/Dancer's_Stretch/0.jpg");
  });
});
