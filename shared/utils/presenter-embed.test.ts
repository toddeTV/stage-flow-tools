import { safeParse } from 'valibot';
import { describe, expect, it } from 'vite-plus/test';
import {
  PresenterParentOriginsSchema,
  PresenterEmbedCommandSchema,
  PresenterQuestionQuerySchema,
  ToggleQuestionLockSchema,
  UnpublishQuestionSchema,
} from './validation';

describe('presentation embed boundaries', () => {
  it('disables control by default and validates exact origins', () => {
    expect(safeParse(PresenterParentOriginsSchema, '').output).toEqual([]);
    expect(
      safeParse(
        PresenterParentOriginsSchema,
        'http://localhost:3030, http://localhost:3030',
      ).output,
    ).toEqual([
      'http://localhost:3030',
    ]);
    for (const origin of [
      '*',
      'https://*.example',
      'https://example/path',
      'https://example/',
      'https://user:password@example',
      'null',
    ]) {
      expect(safeParse(PresenterParentOriginsSchema, origin).success).toBe(
        false,
      );
    }
  });
  it('rejects invalid request IDs and repeated selectors', () => {
    for (const requestId of [
      0,
      -1,
      1.2,
      Infinity,
      '1',
    ]) {
      expect(
        safeParse(PresenterEmbedCommandSchema, {
          type: 'stage-flow-tools:context',
          sessionId: 's',
          requestId,
          selection: null,
        }).success,
      ).toBe(false);
    }
    expect(
      safeParse(PresenterQuestionQuerySchema, { key: [
        'one',
        'two',
      ] }).success,
    ).toBe(false);
  });
  it('retains legacy requests and permits deterministic close/lock', () => {
    expect(safeParse(UnpublishQuestionSchema, undefined).success).toBe(true);
    expect(safeParse(UnpublishQuestionSchema, {}).success).toBe(true);
    expect(
      safeParse(UnpublishQuestionSchema, { expectedKey: 'one' }).success,
    ).toBe(true);
    expect(
      safeParse(UnpublishQuestionSchema, { expectedKey: '' }).success,
    ).toBe(false);
    expect(
      safeParse(ToggleQuestionLockSchema, { questionId: 'id', locked: false })
        .output,
    ).toEqual({ questionId: 'id', locked: false });
  });
});
