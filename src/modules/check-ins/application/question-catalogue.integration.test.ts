import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { selectWeeklyQuestions } from "@/modules/check-ins/domain/question-selection";
import expected from "./fixtures/question-catalogue.json";

describe("English question catalogue", () => {
  afterAll(() => prisma.$disconnect());

  it("matches the supplied wording, domains, contexts and option order exactly", async () => {
    const questions = await prisma.question.findMany({
      where: { active: true }, include: { options: { orderBy: { sortOrder: "asc" } } },
    });
    expect(questions).toHaveLength(25);
    expect(questions.filter((question) => question.context === "ONBOARDING")).toHaveLength(10);
    for (const specification of expected) {
      const question = questions.find((candidate) => candidate.text === specification.text);
      expect(question).toMatchObject({
        context: specification.context, domain: specification.domain, stable: specification.stable,
      });
      expect(question?.options.map((option) => option.label)).toEqual(specification.labels);
    }
    const unscored = questions.flatMap((question) => question.options)
      .filter((option) => option.directionValue === null).map((option) => option.label).sort();
    expect(unscored).toEqual([
      "I am not sure.", "I did not need help this week.", "There was no situation like this.",
    ]);
  });

  it("keeps three stable and two deterministic rotating questions across a full cycle", async () => {
    const weekly = await prisma.question.findMany({ where: { context: "WEEKLY", active: true } });
    expect(weekly.filter((question) => question.stable)).toHaveLength(3);
    const rotating = weekly.filter((question) => !question.stable);
    expect(rotating).toHaveLength(12);
    for (const domain of new Set(rotating.map((question) => question.domain))) {
      expect(rotating.filter((question) => question.domain === domain)).toHaveLength(2);
    }
    const seen = new Set<string>();
    for (let week = 0; week < 12; week += 1) {
      const selection = selectWeeklyQuestions(weekly, week);
      expect(selection.stable).toHaveLength(3);
      expect(selection.rotating).toHaveLength(2);
      expect(selection.all).toHaveLength(5);
      expect(selection.rotating[0].domain).not.toBe(selection.rotating[1].domain);
      expect(selection).toEqual(selectWeeklyQuestions([...weekly].reverse(), week));
      expect(selection).toEqual(selectWeeklyQuestions(weekly, week + 12));
      selection.rotating.forEach((question) => seen.add(question.id));
    }
    expect(seen.size).toBe(12);
  });
});
