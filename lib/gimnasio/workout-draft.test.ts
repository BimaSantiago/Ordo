import { beforeEach, describe, expect, it } from "vitest";
import {
  clearActiveDraft,
  createDraft,
  createDraftExercise,
  createDraftSet,
  getActiveDraft,
  saveActiveDraft,
} from "./workout-draft";

describe("workout-draft", () => {
  beforeEach(async () => {
    await clearActiveDraft();
  });

  it("no hay draft activo antes de iniciar un entrenamiento", async () => {
    expect(await getActiveDraft()).toBeUndefined();
  });

  it("guarda y recupera el entrenamiento en curso (simula cierre y reapertura de la app)", async () => {
    const draft = createDraft({ name: "Push day" });
    const exercise = createDraftExercise("ex-1", "Bench Press", 0);
    exercise.sets.push(createDraftSet(0));
    draft.exercises.push(exercise);

    await saveActiveDraft(draft);

    const recovered = await getActiveDraft();
    expect(recovered).toBeDefined();
    expect(recovered?.name).toBe("Push day");
    expect(recovered?.exercises).toHaveLength(1);
    expect(recovered?.exercises[0].exerciseName).toBe("Bench Press");
    expect(recovered?.exercises[0].sets).toHaveLength(1);
  });

  it("persiste actualizaciones de series (peso/reps/completada) sobre el mismo draft", async () => {
    const draft = createDraft({});
    const exercise = createDraftExercise("ex-1", "Squat", 0);
    const set = createDraftSet(0);
    exercise.sets.push(set);
    draft.exercises.push(exercise);
    await saveActiveDraft(draft);

    const loaded = await getActiveDraft();
    loaded!.exercises[0].sets[0].weightKg = 100;
    loaded!.exercises[0].sets[0].reps = 5;
    loaded!.exercises[0].sets[0].completed = true;
    await saveActiveDraft(loaded!);

    const final = await getActiveDraft();
    expect(final?.exercises[0].sets[0]).toMatchObject({
      weightKg: 100,
      reps: 5,
      completed: true,
    });
  });

  it("limpia el draft al finalizar el entrenamiento", async () => {
    await saveActiveDraft(createDraft({ name: "Full body" }));
    await clearActiveDraft();
    expect(await getActiveDraft()).toBeUndefined();
  });
});
