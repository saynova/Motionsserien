import { useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp, BookOpen, CalendarDays, Clock, Gavel, Scale, Timer, Trophy } from "lucide-react";

type Lang = "en" | "sv";

const T = {
  en: {
    eyebrow: "Official rules & regulations",
    title: "Rules to play",
    intro: "Please read the rules carefully before registering. By registering, your team accepts these rules.",
    pills: ["10 weeks · Mondays 19:00 & 20:00", "Sets to 15 · golden point at 16", "Set 3 to 9 · golden point at 10", "2 wins up · 1 stay · 0 down", "Schedule published when registration closes"],
    s1: "1. Tournament format & structure",
    s1items: [
      ["Match day", "Every Monday evening, in two sessions: 19:00 and 20:00."],
      ["Season", "10 consecutive weeks of ladder play."],
      ["Divisions", "10 divisions with 3 teams each (30 teams in total)."],
      ["Matches per evening", "Each team plays 2 matches against the other teams in its division."],
      ["Schedule publication", "The official match schedule is published on this website as soon as registration closes and division seeding is finalised."],
    ],
    s2: "2. Match scoring (new 15-point format)",
    s2intro: "Matches are best of three sets — the first team to win 2 sets wins the match.",
    set12: "Sets 1 & 2 — to 15 points",
    set12text: "Rally-point scoring. At 15–15 no two-point lead is needed: the first team to reach 16 wins the set (16–15).",
    set3: "Deciding set 3 — to 9 points",
    set3text: "Played only if the sets are 1–1. At 9–9 the first team to reach 10 wins the match (10–9).",
    s3: "3. Weekly ranking & division movement",
    s3head: ["Result in division", "Next week"],
    s3rows: [["2 wins (1st place)", "Promoted UP one division"], ["1 win (2nd place)", "STAYS in the same division"], ["0 wins / 2 losses (3rd place)", "Relegated DOWN one division"]],
    s3note: "Exceptions: the winner of Division 1 stays in Division 1, and the 3rd-placed team in the lowest division stays in the lowest division.",
    s4: "4. Tiebreaker order",
    s4items: ["Head-to-head result between the tied teams", "Set difference (sets won − sets lost)", "Point difference (points scored − points conceded)", "Total points scored"],
    s5: "5. The General's authority & rule amendments",
    s5items: [
      ["Ranking adjustments", "The General (tournament director) may manually adjust divisions, rankings or placements when necessary — for fair play, withdrawals, substitutions or other extraordinary situations."],
      ["Rule changes during the season", "The General may amend, update or clarify these rules during the season if needed for a fair, smooth and safe tournament. Changes are announced on this website. All decisions of the General are final."],
    ],
    s6: "6. Score submission deadline",
    s6items: ["Results must be reported on the website via Submit score by Wednesday 10:00 (Swedish time) after the match.", "A match without a submitted score by the deadline is recorded as 0–0 (no-show), which counts as a loss for both teams."],
  },
  sv: {
    eyebrow: "Officiella tävlingsbestämmelser",
    title: "Spelregler",
    intro: "Läs reglerna noga innan ni anmäler er. Genom anmälan godkänner laget dessa regler.",
    pills: ["10 veckor · måndagar 19:00 & 20:00", "Set till 15 · avgörande poäng vid 16", "Set 3 till 9 · avgörande poäng vid 10", "2 vinster upp · 1 kvar · 0 ner", "Spelschema publiceras när anmälan stänger"],
    s1: "1. Tävlingsformat & struktur",
    s1items: [
      ["Speldag", "Varje måndagskväll, i två spelpass: 19:00 och 20:00."],
      ["Säsong", "10 veckor i följd i ett stegesystem."],
      ["Divisioner", "10 divisioner med 3 lag i varje (totalt 30 lag)."],
      ["Matcher per kväll", "Varje lag spelar 2 matcher mot övriga lag i sin division."],
      ["Publicering av spelschema", "Det officiella spelschemat publiceras på hemsidan så snart anmälan stänger och seedningen är fastställd."],
    ],
    s2: "2. Poängräkning (nytt 15-poängsformat)",
    s2intro: "Matcherna spelas i bäst av tre set — första laget till 2 vunna set vinner matchen.",
    set12: "Set 1 & 2 — till 15 poäng",
    set12text: "Löpande räkning (rally point). Vid 15–15 krävs ingen tvåpoängsskillnad: laget som först når 16 vinner setet (16–15).",
    set3: "Avgörande set 3 — till 9 poäng",
    set3text: "Spelas endast vid 1–1 i set. Vid 9–9 vinner laget som först når 10 matchen (10–9).",
    s3: "3. Veckovis ranking & divisionsflyttning",
    s3head: ["Resultat i divisionen", "Nästa vecka"],
    s3rows: [["2 vinster (1:a plats)", "Flyttas UPP en division"], ["1 vinst (2:a plats)", "STANNAR KVAR i divisionen"], ["0 vinster / 2 förluster (3:e plats)", "Flyttas NER en division"]],
    s3note: "Undantag: vinnaren i Division 1 stannar i Division 1, och laget på 3:e plats i lägsta divisionen stannar i lägsta divisionen.",
    s4: "4. Särskiljning vid lika resultat",
    s4items: ["Inbördes möte mellan de berörda lagen", "Setskillnad (vunna set − förlorade set)", "Bollskillnad (gjorda poäng − insläppta poäng)", "Flest gjorda poäng"],
    s5: "5. Generalens mandat & regeländringar",
    s5items: [
      ["Rankingjusteringar", "Generalen (tävlingsledaren) får vid behov justera divisioner, ranking eller placeringar — för rättvist spel, avhopp, ersättare eller andra särskilda situationer."],
      ["Regeländringar under säsongen", "Generalen får ändra, uppdatera eller förtydliga reglerna under säsongen om det krävs för en rättvis, smidig och säker tävling. Ändringar meddelas på hemsidan. Generalens beslut är slutgiltiga."],
    ],
    s6: "6. Tidsfrist för resultat",
    s6items: ["Resultat ska rapporteras på hemsidan via Rapportera resultat senast onsdag kl. 10:00 (svensk tid) efter matchen.", "Match utan inlämnat resultat vid deadline registreras som 0–0 (wo), vilket räknas som förlust för båda lagen."],
  },
} as const;

function Block({ icon: Icon, title, children }: { icon: typeof Trophy; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="flex items-center gap-2 font-display text-lg font-bold">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        {title}
      </h3>
      <div className="mt-3 space-y-2 text-sm leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}

export function RulesToPlay() {
  const [lang, setLang] = useState<Lang>("en");
  const t = T[lang];
  const moveIcons = [ArrowUp, ArrowRight, ArrowDown];

  return (
    <section id="rules" className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-accent/10 p-5 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-card/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
            <BookOpen className="size-3.5" aria-hidden="true" />
            {t.eyebrow}
          </span>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">{t.title}</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t.intro}</p>
        </div>
        <div className="inline-flex rounded-full border border-border bg-card p-1 text-xs font-semibold" role="group" aria-label="Language">
          {(["en", "sv"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              aria-pressed={lang === l}
              className={`rounded-full px-3 py-1.5 transition ${lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {l === "en" ? "English" : "Svenska"}
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-5 flex flex-wrap gap-2">
        {t.pills.map((p) => (
          <li key={p} className="rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium">{p}</li>
        ))}
      </ul>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Block icon={CalendarDays} title={t.s1}>
          <dl className="space-y-2">
            {t.s1items.map(([k, v]) => (
              <div key={k}>
                <dt className="font-semibold">{k}</dt>
                <dd className="text-muted-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        </Block>

        <Block icon={Trophy} title={t.s2}>
          <p>{t.s2intro}</p>
          <div className="rounded-lg border border-border bg-secondary/40 p-3">
            <p className="font-semibold">{t.set12}</p>
            <p className="text-muted-foreground">{t.set12text}</p>
          </div>
          <div className="rounded-lg border border-border bg-secondary/40 p-3">
            <p className="font-semibold">{t.set3}</p>
            <p className="text-muted-foreground">{t.set3text}</p>
          </div>
        </Block>

        <Block icon={ArrowUp} title={t.s3}>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/60 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">{t.s3head[0]}</th>
                  <th className="px-3 py-2">{t.s3head[1]}</th>
                </tr>
              </thead>
              <tbody>
                {t.s3rows.map(([a, b], i) => {
                  const Icon = moveIcons[i];
                  return (
                    <tr key={a} className="border-t border-border">
                      <td className="px-3 py-2 font-medium">{a}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1.5">
                          <Icon className="size-4 text-primary" aria-hidden="true" />
                          {b}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">{t.s3note}</p>
        </Block>

        <Block icon={Scale} title={t.s4}>
          <ol className="list-decimal space-y-1 pl-5">
            {t.s4items.map((x) => <li key={x}>{x}</li>)}
          </ol>
        </Block>

        <Block icon={Gavel} title={t.s5}>
          {t.s5items.map(([k, v]) => (
            <p key={k}><strong>{k}:</strong> {v}</p>
          ))}
        </Block>

        <Block icon={Timer} title={t.s6}>
          {t.s6items.map((x) => (
            <p key={x} className="flex gap-2"><Clock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />{x}</p>
          ))}
        </Block>
      </div>
    </section>
  );
}
