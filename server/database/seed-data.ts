import type { InputQuestion } from '../../app/types'

export const developmentSeedQuestions = [
  {
    key: 'seed-stage-flow-purpose',
    question_text: {
      en: 'What is Stage Flow Tools designed to support?',
      de: 'Wofür ist Stage Flow Tools gedacht?',
      fr: 'À quoi servent Stage Flow Tools ?',
      ja: 'Stage Flow Tools は何を支援するためのものですか？',
    },
    answer_options: [
      {
        emoji: '⭐',
        text: {
          en: 'Live audience interaction',
          de: 'Live-Interaktion mit dem Publikum',
          fr: 'Interaction avec le public en direct',
          ja: 'ライブでの参加者インタラクション',
        },
      },
      {
        text: {
          en: 'Photo retouching',
          de: 'Bildretusche',
          fr: 'Retouche photo',
          ja: '写真のレタッチ',
        },
      },
      {
        text: {
          en: 'Personal finance tracking',
          de: 'Verwaltung persönlicher Finanzen',
          fr: 'Suivi des finances personnelles',
          ja: '個人の家計管理',
        },
      },
      {
        text: {
          en: 'Static website hosting',
          de: 'Hosting statischer Websites',
          fr: 'Hébergement de sites web statiques',
          ja: '静的ウェブサイトのホスティング',
        },
      },
    ],
    note: {
      en: 'Presenters control questions and results while participants answer from their own devices.',
      de: 'Präsentierende steuern Fragen und Ergebnisse, während Teilnehmende mit ihren eigenen Geräten antworten.',
      fr: [
        'Les présentateurs contrôlent les questions et les résultats',
        'pendant que les participants répondent depuis leurs appareils.',
      ].join(' '),
      ja: '発表者が質問と結果表示を操作し、参加者は各自の端末から回答します。',
    },
  },
  {
    key: 'seed-question-lifecycle',
    question_text: {
      en: 'What should a presenter do before participants can answer a quiz question?',
      de: 'Was müssen Präsentierende tun, bevor Teilnehmende eine Quizfrage beantworten können?',
      fr: 'Que doit faire le présentateur avant que les participants puissent répondre à une question de quiz ?',
      ja: '参加者がクイズの質問に答える前に、発表者は何をする必要がありますか？',
    },
    answer_options: [
      {
        emoji: '⭐',
        text: {
          en: 'Publish it',
          de: 'Sie veröffentlichen',
          fr: 'La publier',
          ja: '公開する',
        },
      },
      {
        text: {
          en: 'Archive it',
          de: 'Sie archivieren',
          fr: "L'archiver",
          ja: 'アーカイブする',
        },
      },
      {
        text: {
          en: 'Delete it',
          de: 'Sie löschen',
          fr: 'La supprimer',
          ja: '削除する',
        },
      },
      {
        text: {
          en: 'Export it',
          de: 'Sie exportieren',
          fr: "L'exporter",
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
      fr: [
        'La publication rend une question active.',
        "Verrouillez-la ensuite pour empêcher d'autres réponses sans supprimer celles qui existent.",
      ].join(' '),
      ja: '公開すると質問がアクティブになります。後でロックすれば、既存の回答を削除せずに追加の回答を止められます。',
    },
  },
] satisfies InputQuestion[]
