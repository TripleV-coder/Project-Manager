const COLUMNS = [
  {
    name: 'À faire',
    count: 3,
    cards: [
      { title: 'Recetter le sprint', tag: 'Haute', tagTone: 'rose', due: '4 avr', people: ['MA'] },
      { title: 'Préparer la démo', tag: 'Moyenne', tagTone: 'amber', due: '6 avr', people: ['JE'] },
    ],
  },
  {
    name: 'En cours',
    count: 2,
    cards: [
      {
        title: 'Design Dashboard',
        tag: 'Design',
        tagTone: 'violet',
        due: "Aujourd'hui",
        people: ['SA', 'MA'],
        progress: 70,
      },
      { title: 'API des sprints', tag: 'Dev', tagTone: 'sky', due: '5 avr', people: ['JE'] },
    ],
  },
  {
    name: 'En révision',
    count: 1,
    cards: [
      { title: 'Charte projet', tag: 'Revue', tagTone: 'indigo', due: 'Hier', people: ['MA'] },
    ],
  },
  {
    name: 'Terminé',
    count: 2,
    cards: [
      {
        title: 'Budget initial saisi',
        tag: 'OK',
        tagTone: 'emerald',
        due: '2 avr',
        people: ['SA'],
      },
    ],
  },
];

const TAG_CLASS = {
  rose: 'bg-sky-50 text-sky-700',
  amber: 'bg-sky-50 text-sky-700',
  violet: 'bg-sky-50 text-sky-700',
  sky: 'bg-sky-50 text-sky-700',
  indigo: 'bg-sky-50 text-sky-700',
  emerald: 'bg-sky-50 text-sky-700',
};

const AVATAR_CLASS = {
  MA: 'bg-sky-600 text-white',
  JE: 'bg-sky-500 text-white',
  SA: 'bg-sky-700 text-white',
};

function Avatar({ initials }) {
  return (
    <span
      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ring-2 ring-white ${AVATAR_CLASS[initials] || 'bg-sky-500 text-white'}`}
    >
      {initials}
    </span>
  );
}

function TaskCard({ card }) {
  return (
    <article className="rounded-lg border border-sky-300/80 bg-white p-2.5 shadow-sm">
      <div className="mb-1.5 flex items-start justify-between gap-1">
        <p className="text-[11px] font-semibold leading-snug text-slate-900">{card.title}</p>
        <span
          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${TAG_CLASS[card.tagTone]}`}
        >
          {card.tag}
        </span>
      </div>
      {typeof card.progress === 'number' ? (
        <div className="mb-2 h-1 overflow-hidden rounded-full bg-sky-50">
          <div className="h-full rounded-full bg-sky-500" style={{ width: `${card.progress}%` }} />
        </div>
      ) : null}
      <div className="flex items-center justify-between">
        <div className="flex -space-x-1">
          {card.people.map((person) => (
            <Avatar key={person} initials={person} />
          ))}
        </div>
        <span className="text-[10px] font-medium text-slate-500">{card.due}</span>
      </div>
    </article>
  );
}

export default function DashboardMockup() {
  return (
    <div className="relative" aria-hidden="true">
      <div className="pointer-events-none absolute -inset-8 rounded-[2rem] bg-sky-200/50 blur-2xl" />

      <div className="landing-float absolute -left-3 top-16 z-10 hidden w-40 rounded-xl border border-sky-300 bg-white p-3 shadow-lg sm:block">
        <p className="text-[10px] font-medium text-slate-500">Sprint 12</p>
        <p className="mt-0.5 text-sm font-bold text-slate-900">62% livré</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sky-50">
          <div className="h-full w-[62%] rounded-full bg-sky-500" />
        </div>
      </div>

      <div className="landing-float-delayed absolute -right-2 bottom-10 z-10 hidden rounded-xl border border-sky-300 bg-white px-3 py-2 shadow-lg sm:flex">
        <div className="flex -space-x-1.5">
          <Avatar initials="MA" />
          <Avatar initials="JE" />
          <Avatar initials="SA" />
        </div>
        <p className="ml-2 text-[11px] font-semibold text-slate-800">3 sur la tâche</p>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-sky-300 bg-white shadow-2xl shadow-sky-900/10">
        <div className="flex items-center gap-1.5 border-b border-sky-300 bg-sky-50 px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-sky-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
          <span className="ml-3 truncate text-[11px] font-medium text-slate-500">
            PM / Refonte portail client
          </span>
        </div>

        <div className="flex min-h-[340px]">
          <aside className="hidden w-40 shrink-0 border-r border-sky-300 bg-sky-50 p-3 md:block">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Projets
            </p>
            <ul className="space-y-1 text-[11px] font-medium">
              <li className="rounded-md bg-sky-600 px-2 py-1.5 text-white">Portail client</li>
              <li className="rounded-md px-2 py-1.5 text-slate-700">Intranet RH</li>
              <li className="rounded-md px-2 py-1.5 text-slate-700">App mobile</li>
            </ul>
            <p className="mb-2 mt-5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Espace
            </p>
            <ul className="space-y-1 text-[11px] text-slate-600">
              <li className="px-2 py-1">Tableau de bord</li>
              <li className="rounded-md bg-white px-2 py-1 font-semibold text-sky-700 shadow-sm">
                Kanban
              </li>
              <li className="px-2 py-1">Sprints</li>
              <li className="px-2 py-1">Budget</li>
            </ul>
          </aside>

          <div className="min-w-0 flex-1 p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-slate-900">Tableau Kanban</p>
                <p className="text-[11px] text-slate-500">Sprint 12 · 8 jours restants</p>
              </div>
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                En cours
              </span>
            </div>
            <div className="grid auto-cols-[minmax(9.5rem,1fr)] grid-flow-col gap-2 overflow-x-auto pb-1 md:grid-flow-row md:grid-cols-4">
              {COLUMNS.map((column) => (
                <div key={column.name} className="min-w-[9.5rem] rounded-xl bg-sky-50 p-2">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      {column.name}
                    </p>
                    <span className="text-[10px] font-semibold text-slate-400">{column.count}</span>
                  </div>
                  <div className="space-y-2">
                    {column.cards.map((card) => (
                      <TaskCard key={card.title} card={card} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
