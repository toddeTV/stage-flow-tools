// @vitest-environment happy-dom
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick, reactive } from 'vue';
import { parse } from 'valibot';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import QuizMarkdownText from '~/components/questions/QuizMarkdownText.vue';
import { QuestionInputSchema } from '#shared/utils/validation';
import PresenterEmbedDisplay from './PresenterEmbedDisplay.vue';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function selectedState(key: string) {
  return {
    question: { key, question_text: { en: `Question ${key}` }, answer_options: [], is_active: true },
    results: {},
    totalVotes: 0,
  };
}

describe('read-only selected question display', () => {
  it('counts finished responses rather than all votes and never publishes', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('useRoute', () => ({
      query: { questionKey: 'exercise', mode: 'status', language: 'de' },
    }));
    const fetch = vi.fn().mockResolvedValue({
      question: {
        key: 'exercise',
        is_active: false,
        alreadyPublished: true,
        question_text: { en: 'Progress', de: 'Übungsstand' },
        answer_options: [
          { text: { en: 'Finished' } },
          { text: { en: 'Working' } },
        ],
      },
      results: { Finished: { count: 3 }, Working: { count: 5 } },
      totalVotes: 8,
    });
    vi.stubGlobal('$fetch', fetch);
    const wrapper = mount(PresenterEmbedDisplay, {
      global: {
        stubs: {
          QuizMarkdownText: {
            props: [
              'text',
            ],
            template: '<span>{{ text }}</span>',
          },
        },
      },
    });
    await flushPromises();
    expect(wrapper.text()).toContain('3 fertig');
    expect(wrapper.text()).toContain('8 Antworten');
    expect(wrapper.text()).toContain('Geschlossen');
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      '/api/admin/presenter/question-state',
      { query: { key: 'exercise' } },
    );
    wrapper.unmount();
    await vi.advanceTimersByTimeAsync(10000);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('reveals a valid note without the selected locale or English', async () => {
    const question = parse(QuestionInputSchema, {
      key: 'one',
      question_text: { en: 'Question' },
      answer_options: [
        { text: { en: 'A' } },
        { text: { en: 'B' } },
      ],
      note: { fr: 'Note en français' },
    });
    vi.stubGlobal('useRoute', () => ({
      query: { questionKey: 'one', mode: 'quiz', language: 'de', presenterRefresh: '0' },
    }));
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      question: { ...question, is_active: true, is_locked: true },
      results: {},
      totalVotes: 0,
    }));
    const renderError = vi.fn();
    const wrapper = mount(PresenterEmbedDisplay, {
      global: { components: { QuizMarkdownText }, config: { errorHandler: renderError } },
    });
    await flushPromises();
    expect(renderError).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Note en français');
    wrapper.unmount();
  });

  it('loads a changed question key with periodic polling disabled', async () => {
    vi.useFakeTimers();
    const route = reactive({ query: { questionKey: 'one', presenterRefresh: '0' } });
    vi.stubGlobal('useRoute', () => route);
    const fetch = vi.fn(async (_url: string, options: { query: { key: string } }) => selectedState(options.query.key));
    vi.stubGlobal('$fetch', fetch);
    const wrapper = mount(PresenterEmbedDisplay, { global: { components: { QuizMarkdownText } } });
    await flushPromises();
    expect(wrapper.text()).toContain('Question one');
    route.query.questionKey = 'two';
    await nextTick();
    await flushPromises();
    expect(fetch).toHaveBeenLastCalledWith('/api/admin/presenter/question-state', { query: { key: 'two' } });
    expect(wrapper.text()).toContain('Question two');
    expect(wrapper.text()).not.toContain('Question one');
    await vi.advanceTimersByTimeAsync(10000);
    expect(fetch).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it.each([
    'resolve',
    'reject',
  ] as const)('loads the newest key after an old read settles with %s', async (outcome) => {
    const route = reactive({ query: { questionKey: 'one', presenterRefresh: '0' } });
    vi.stubGlobal('useRoute', () => route);
    let resolve!: (state: ReturnType<typeof selectedState>) => void;
    let reject!: (error: Error) => void;
    const fetch = vi.fn().mockImplementationOnce(() => new Promise((done, fail) => {
      resolve = done;
      reject = fail;
    })).mockResolvedValue(selectedState('two'));
    vi.stubGlobal('$fetch', fetch);
    const wrapper = mount(PresenterEmbedDisplay, { global: { components: { QuizMarkdownText } } });
    route.query.questionKey = 'two';
    await nextTick();
    expect(fetch).toHaveBeenCalledOnce();
    if (outcome === 'resolve') resolve(selectedState('one'));
    else reject(new Error('Old read failed'));
    await flushPromises();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenLastCalledWith('/api/admin/presenter/question-state', { query: { key: 'two' } });
    expect(wrapper.text()).toContain('Question two');
    expect(wrapper.text()).not.toContain('Question one');
    wrapper.unmount();
  });

  it('updates polling cadence without discarding retained results and stops on unmount', async () => {
    vi.useFakeTimers();
    const route = reactive({ query: { questionKey: 'one', presenterRefresh: '0' } });
    vi.stubGlobal('useRoute', () => route);
    const fetch = vi.fn().mockResolvedValue(selectedState('one'));
    vi.stubGlobal('$fetch', fetch);
    const wrapper = mount(PresenterEmbedDisplay, { global: { components: { QuizMarkdownText } } });
    await flushPromises();
    route.query.presenterRefresh = '1';
    await nextTick();
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetch).toHaveBeenCalledTimes(2);
    route.query.presenterRefresh = '0.5';
    await nextTick();
    await vi.advanceTimersByTimeAsync(499);
    expect(fetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetch).toHaveBeenCalledTimes(3);
    route.query.presenterRefresh = '0';
    await nextTick();
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetch).toHaveBeenCalledTimes(3);
    route.query.presenterRefresh = '0.5';
    await nextTick();
    fetch.mockRejectedValueOnce(new Error('Read failed'));
    await vi.advanceTimersByTimeAsync(500);
    expect(wrapper.text()).toContain('Question one');
    expect(wrapper.text()).toContain('Live connection unavailable');
    wrapper.unmount();
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('does not render another selected question when the response key differs', async () => {
    vi.stubGlobal('useRoute', () => ({
      query: { questionKey: 'expected', mode: 'quiz' },
    }));
    vi.stubGlobal(
      '$fetch',
      vi.fn().mockResolvedValue({ question: { key: 'other' } }),
    );
    const wrapper = mount(PresenterEmbedDisplay);
    await flushPromises();
    expect(wrapper.text()).not.toContain('other');
    expect(wrapper.find('li').exists()).toBe(false);
    wrapper.unmount();
  });
});
