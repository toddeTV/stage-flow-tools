// @vitest-environment happy-dom
import { mount, flushPromises } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import PresenterEmbedDisplay from './PresenterEmbedDisplay.vue';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

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
