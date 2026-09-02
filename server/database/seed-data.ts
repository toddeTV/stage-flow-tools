import type { InputQuestion } from '../../app/types'

export const developmentSeedQuestions = [
  {
    key: 'seed-stage-flow-purpose',
    question_text: {
      en: 'What is Stage Flow Tools designed to support?',
      de: 'Wofür ist Stage Flow Tools gedacht?',
      ja: 'Stage Flow Tools は何を支援するためのものですか？',
    },
    answer_options: [
      {
        emoji: '⭐',
        text: {
          en: 'Live audience interaction',
          de: 'Live-Interaktion mit dem Publikum',
          ja: 'ライブでの参加者インタラクション',
        },
      },
      {
        text: {
          en: 'Photo retouching',
          de: 'Bildretusche',
          ja: '写真のレタッチ',
        },
      },
      {
        text: {
          en: 'Personal finance tracking',
          de: 'Verwaltung persönlicher Finanzen',
          ja: '個人の家計管理',
        },
      },
      {
        text: {
          en: 'Static website hosting',
          de: 'Hosting statischer Websites',
          ja: '静的ウェブサイトのホスティング',
        },
      },
    ],
    note: {
      en: 'Presenters control questions and results while participants answer from their own devices.',
      de: 'Präsentierende steuern Fragen und Ergebnisse, während Teilnehmende mit ihren eigenen Geräten antworten.',
      ja: '発表者が質問と結果表示を操作し、参加者は各自の端末から回答します。',
    },
  },
  {
    key: 'seed-question-lifecycle',
    question_text: {
      en: 'What should a presenter do before participants can answer a quiz question?',
      de: 'Was müssen Präsentierende tun, bevor Teilnehmende eine Quizfrage beantworten können?',
      ja: '参加者がクイズの質問に答える前に、発表者は何をする必要がありますか？',
    },
    answer_options: [
      {
        emoji: '⭐',
        text: {
          en: 'Publish it',
          de: 'Sie veröffentlichen',
          ja: '公開する',
        },
      },
      {
        text: {
          en: 'Archive it',
          de: 'Sie archivieren',
          ja: 'アーカイブする',
        },
      },
      {
        text: {
          en: 'Delete it',
          de: 'Sie löschen',
          ja: '削除する',
        },
      },
      {
        text: {
          en: 'Export it',
          de: 'Sie exportieren',
          ja: 'エクスポートする',
        },
      },
    ],
    note: {
      en: [
        'Publishing makes a question active.',
        'Lock it later to stop additional answers without deleting existing ones.',
      ].join(' '),
      de: [
        'Durch die Veröffentlichung wird eine Frage aktiv.',
        'Später lässt sie sich sperren, ohne bereits abgegebene Antworten zu löschen.',
      ].join(' '),
      ja: '公開すると質問がアクティブになります。後でロックすれば、既存の回答を削除せずに追加の回答を止められます。',
    },
  },
] satisfies InputQuestion[]
