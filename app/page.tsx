"use client";

import { useEffect, useMemo, useState } from "react";
import { buildAnchors, demoData, formatTime, generateShifts, weeklyReview } from "../lib/engine";
import type { HabitBarrier, OnboardingData, TinyShift } from "../lib/types";

type View = "landing" | "onboarding" | "map" | "plan" | "dashboard" | "review";
const STORE = "tinyshift-v1";
const steps = ["Your day", "Daily anchors", "Food rhythm", "Movement", "What matters"];

const Icon = ({ name }: { name: "leaf" | "arrow" | "spark" | "clock" | "check" | "walk" | "food" | "home" }) => {
  const icons = { leaf: "✦", arrow: "→", spark: "✺", clock: "◷", check: "✓", walk: "↗", food: "◒", home: "⌂" };
  return <span aria-hidden="true">{icons[name]}</span>;
};

export default function Home() {
  const [view, setView] = useState<View>("landing");
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(demoData);
  const [ready, setReady] = useState(false);
  const [completions, setCompletions] = useState<Record<string, "done" | "missed">>({ move: "done", food: "done" });
  const [missedShift, setMissedShift] = useState<TinyShift | null>(null);
  const [toast, setToast] = useState("");
  const shifts = useMemo(() => generateShifts(data), [data]);

  useEffect(() => {
    const saved = localStorage.getItem(STORE);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.data) setData(parsed.data);
        if (parsed.completions) setCompletions(parsed.completions);
      } catch { /* use friendly defaults */ }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(STORE, JSON.stringify({ data, completions }));
  }, [data, completions, ready]);

  const go = (next: View) => { setView(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const update = (patch: Partial<OnboardingData>) => setData((d) => ({ ...d, ...patch }));
  const flash = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2800); };

  if (!ready) return <div className="loading">Making space for a tiny shift…</div>;

  return (
    <main>
      {view === "landing" ? <Landing onStart={() => { setStep(0); go("onboarding"); }} onDemo={() => { setData(demoData); go("dashboard"); }} /> : (
        <>
          <AppNav view={view} go={go} />
          {view === "onboarding" && <Onboarding step={step} setStep={setStep} data={data} update={update} onDone={() => go("map")} />}
          {view === "map" && <RoutineMap data={data} onContinue={() => go("plan")} />}
          {view === "plan" && <Plan shifts={shifts} onContinue={() => go("dashboard")} />}
          {view === "dashboard" && <Dashboard data={data} shifts={shifts} completions={completions} setCompletions={setCompletions} onMiss={setMissedShift} go={go} />}
          {view === "review" && <Review completions={completions} go={go} />}
        </>
      )}
      {missedShift && <MissDialog shift={missedShift} onClose={() => setMissedShift(null)} onSelect={(barrier) => { setCompletions((c) => ({ ...c, [missedShift.id]: "missed" })); setMissedShift(null); flash(barrier === "tired" ? "We’ll make this easier next time." : "Noted. The plan adapts—not you."); }} />}
      {toast && <div className="toast"><Icon name="spark" /> {toast}</div>}
    </main>
  );
}

function Landing({ onStart, onDemo }: { onStart: () => void; onDemo: () => void }) {
  return <div className="landing">
    <header className="topbar wrap">
      <Brand />
      <div className="top-actions"><button className="text-button" onClick={onDemo}>Try demo</button><button className="button small" onClick={onStart}>Map my routine <Icon name="arrow" /></button></div>
    </header>
    <section className="hero wrap">
      <div className="hero-copy">
        <div className="eyebrow"><Icon name="spark" /> Small changes. Real life.</div>
        <h1>Healthy habits that<br/><em>fit your life.</em></h1>
        <p className="hero-lede">Don’t rebuild your routine. Improve the one you already have. TinyShift learns how your day actually works, then finds food and movement changes easy enough to stick.</p>
        <div className="hero-actions"><button className="button" onClick={onStart}>Map my routine <Icon name="arrow" /></button><button className="button ghost" onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}>See how it works</button></div>
        <div className="proof"><div className="avatars"><span>V</span><span>A</span><span>M</span></div><p><strong>Built around your day</strong><br/>No calories. No guilt. No overhaul.</p></div>
      </div>
      <div className="routine-preview" aria-label="Example routine and TinyShift suggestion">
        <div className="preview-head"><span>Tuesday · your real day</span><span className="live-dot">Mapped</span></div>
        <div className="mini-timeline">
          {[['7:30','Wake'],['8:15','Tea'],['9:00','Work'],['1:30','Lunch'],['5:00','Tea'],['8:30','Dinner'],['11:30','Sleep']].map(([time,label], i) => <div className={`mini-row ${i === 4 ? "active" : ""}`} key={time}><time>{time}</time><span className="dot"/><b>{label}</b>{i === 4 && <span className="plus">+</span>}</div>)}
        </div>
        <div className="suggestion"><div className="suggestion-icon"><Icon name="walk" /></div><div><span>Your tiny shift</span><strong>After your 5 PM tea,<br/>walk for 8 minutes.</strong><p>Minimum version: 3 minutes</p></div></div>
      </div>
    </section>
    <section className="principle wrap"><p>Made for the life you have—not the ideal week in your head.</p><div className="principle-items"><span>◉ Find reliable moments</span><span>◉ Remove the friction</span><span>◉ Start almost too small</span></div></section>
    <section className="how wrap" id="how"><div className="section-kicker">HOW IT WORKS</div><h2>Your routine is the starting line.</h2><div className="how-grid">
      <article><span>01</span><div className="how-icon">◷</div><h3>Map your real day</h3><p>A short conversation uncovers the moments that already happen reliably.</p></article>
      <article><span>02</span><div className="how-icon">⌘</div><h3>Spot easy openings</h3><p>We look for small windows where a better choice asks very little of you.</p></article>
      <article><span>03</span><div className="how-icon">✦</div><h3>Try three tiny shifts</h3><p>One for food, one for movement, and one that makes both easier.</p></article>
    </div></section>
    <footer className="landing-footer wrap"><Brand /><p>A kinder way to build healthier days.</p></footer>
  </div>;
}

function Brand() { return <button className="brand" onClick={() => location.reload()} aria-label="TinyShift home"><span className="brand-mark"><Icon name="leaf" /></span>TinyShift</button>; }

function AppNav({ view, go }: { view: View; go: (v: View) => void }) {
  return <header className="appbar"><Brand /><nav aria-label="Main navigation">
    <button className={view === "dashboard" ? "active" : ""} onClick={() => go("dashboard")}>Today</button>
    <button className={view === "map" ? "active" : ""} onClick={() => go("map")}>My routine</button>
    <button className={view === "review" ? "active" : ""} onClick={() => go("review")}>Weekly review</button>
  </nav><button className="profile-button" onClick={() => go("onboarding")}>V</button></header>;
}

function Onboarding({ step, setStep, data, update, onDone }: { step: number; setStep: (n: number) => void; data: OnboardingData; update: (p: Partial<OnboardingData>) => void; onDone: () => void }) {
  const [customAnchor, setCustomAnchor] = useState("");
  const next = () => step === steps.length - 1 ? onDone() : setStep(step + 1);
  const anchorOptions: [string, string, OnboardingData["routine"]["anchors"][number]["kind"]][] = [["Morning tea","08:00","meal"],["Breakfast","08:30","meal"],["Start work",data.routine.workStart,"work"],["Lunch",data.meals.lunchTime,"meal"],["Afternoon tea",data.meals.afternoonTeaTime,"meal"],["Reach home",data.routine.workEnd,"personal"],["Dinner",data.meals.dinnerTime,"meal"],["Evening TV","21:30","personal"],["Bedtime",data.routine.sleepTime,"personal"],["Prayer","07:45","personal"],["Dog walk","18:00","movement"],["School run","08:15","personal"]];
  const toggleAnchor = (label: string, time: string, kind: OnboardingData["routine"]["anchors"][number]["kind"]) => {
    const exists = data.routine.anchors.some(a => a.label === label);
    const anchors = exists ? data.routine.anchors.filter(a => a.label !== label) : [...data.routine.anchors, { id: label.toLowerCase().replace(/\s+/g,"-"), label, time, kind }];
    update({ routine: { ...data.routine, anchors } });
  };
  const addCustomAnchor = () => {
    const label = customAnchor.trim();
    if (!label) return;
    toggleAnchor(label, "18:00", "personal");
    setCustomAnchor("");
  };
  return <div className="onboarding-shell">
    <div className="progress-head"><button className="back-link" onClick={() => step > 0 && setStep(step - 1)}>← {step ? "Back" : ""}</button><span>{step + 1} of {steps.length}</span><button className="skip" onClick={next}>Skip for now</button></div>
    <div className="progress-track"><span style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
    <section className="question-card">
      <div className="question-step">{steps[step]}</div>
      {step === 0 && <>
        <h1>Let’s start with the shape of your day.</h1><p className="question-copy">Rough answers are perfect. We’re looking for rhythm, not precision.</p>
        <div className="field-grid"><label>Usually wake up<input type="time" value={data.routine.wakeTime} onChange={(e) => update({ routine: { ...data.routine, wakeTime: e.target.value } })}/></label><label>Usually go to sleep<input type="time" value={data.routine.sleepTime} onChange={(e) => update({ routine: { ...data.routine, sleepTime: e.target.value } })}/></label></div>
        <h3>Where does work usually happen?</h3><ChoiceGrid options={[['office','Office'],['home','From home'],['hybrid','Hybrid'],['field','On the move'],['variable','It varies']]} selected={data.routine.workStyle} onSelect={(v) => update({ routine: { ...data.routine, workStyle: v as OnboardingData['routine']['workStyle'] } })}/>
        <div className="field-grid compact"><label>Work starts<input type="time" value={data.routine.workStart} onChange={(e) => update({ routine: { ...data.routine, workStart: e.target.value } })}/></label><label>Work ends<input type="time" value={data.routine.workEnd} onChange={(e) => update({ routine: { ...data.routine, workEnd: e.target.value } })}/></label></div>
      </>}
      {step === 1 && <>
        <h1>Which moments happen most days?</h1><p className="question-copy">These are anchors—reliable moments a tiny action can naturally follow.</p>
        <div className="anchor-grid">{anchorOptions.map(([label,time,kind]) => { const selected = data.routine.anchors.some(a => a.label === label); return <button className={selected ? "choice selected" : "choice"} key={label} onClick={() => toggleAnchor(label,time,kind)}><span>{selected ? "✓" : "+"}</span>{label}</button>; })}{data.routine.anchors.filter(a => !anchorOptions.some(([label]) => label === a.label) && !["Wake up","Sleep"].includes(a.label)).map(a => <button className="choice selected" key={a.id} onClick={() => toggleAnchor(a.label,a.time,a.kind)}><span>✓</span>{a.label}</button>)}</div>
        <div className="custom-anchor"><input aria-label="Custom anchor" placeholder="Add another reliable moment" value={customAnchor} onChange={e => setCustomAnchor(e.target.value)} onKeyDown={e => e.key === "Enter" && addCustomAnchor()}/><button onClick={addCustomAnchor}>+ Add anchor</button></div>
      </>}
      {step === 2 && <>
        <h1>Tell us how food fits into your day.</h1><p className="question-copy">No judging and no calorie math—just the patterns that feel familiar.</p>
        <h3>How often do you have breakfast?</h3><ChoiceGrid options={[['daily','Most days'],['sometimes','Sometimes'],['rarely','Rarely']]} selected={data.meals.breakfast} onSelect={(v) => update({ meals: { ...data.meals, breakfast: v as OnboardingData['meals']['breakfast'] } })}/>
        <div className="field-grid compact"><label>Lunch is around<input type="time" value={data.meals.lunchTime} onChange={(e) => update({ meals: { ...data.meals, lunchTime: e.target.value } })}/></label><label>Dinner is around<input type="time" value={data.meals.dinnerTime} onChange={(e) => update({ meals: { ...data.meals, dinnerTime: e.target.value } })}/></label></div>
        <h3>What would you most like to improve?</h3><ChoiceGrid options={[["General healthier eating","Healthier eating"],["Reduce snacking","Less snacking"],["More protein","More protein"],["More vegetables","More vegetables"],["Reduce ordering","Order less"],["Better breakfast","Better breakfast"]]} selected={data.meals.focus} onSelect={(v) => update({ meals: { ...data.meals, focus: v } })}/>
      </>}
      {step === 3 && <>
        <h1>What does movement look like right now?</h1><p className="question-copy">A two-minute walk counts. We’re meeting you exactly where you are.</p>
        <h3>Days of planned exercise in a usual week</h3><div className="number-picker">{[0,1,2,3,4,5].map(n => <button className={data.exercise.activeDays === n ? "active" : ""} key={n} onClick={() => update({ exercise: { ...data.exercise, activeDays: n } })}>{n}{n === 5 ? "+" : ""}</button>)}</div>
        <h3>What most often gets in the way?</h3><ChoiceGrid options={[["no-time","No time"],["tired","Too tired"],["forget","I forget"],["inconvenient","Too much effort"],["motivation","Don’t enjoy workouts"],["other","My schedule changes"]]} selected={data.exercise.barrier} onSelect={(v) => update({ exercise: { ...data.exercise, barrier: v as HabitBarrier } })}/>
        <label className="toggle-row"><span><b>Mostly seated while working</b><small>This helps us spot movement breaks.</small></span><input type="checkbox" checked={data.exercise.sedentaryWork} onChange={(e) => update({ exercise: { ...data.exercise, sedentaryWork: e.target.checked } })}/><i/></label>
      </>}
      {step === 4 && <>
        <h1>What would make this worth it?</h1><p className="question-copy">We’ll use this as your compass—not as another target to chase.</p>
        <ChoiceGrid multi options={[["Energy","Feel more energetic"],["Long-term health","Long-term health"],["Strength","Feel stronger"],["Mobility","Move more easily"],["Stress reduction","Less stress"],["Better sleep","Sleep better"]]} selected={data.profile.motivation} onSelect={(v) => { const m = data.profile.motivation.includes(v) ? data.profile.motivation.filter(x => x !== v) : [...data.profile.motivation, v]; update({ profile: { ...data.profile, motivation: m } }); }}/>
        <h3>Which pace feels realistic?</h3><div className="approach-list">{[["tiny","Tiny changes I barely notice","The easiest place to begin"],["moderate","A little structure","Still flexible and forgiving"],["ambitious","Give me more to aim for","We’ll keep a minimum version"]].map(([v,title,sub]) => <button className={data.profile.preferredApproach === v ? "approach selected" : "approach"} key={v} onClick={() => update({ profile: { ...data.profile, preferredApproach: v as OnboardingData['profile']['preferredApproach'] } })}><span className="radio"/><span><b>{title}</b><small>{sub}</small></span>{v === "tiny" && <em>Recommended</em>}</button>)}</div>
      </>}
      <div className="question-footer"><p>Your answers stay on this device.</p><button className="button" onClick={next}>{step === steps.length - 1 ? "Build my routine map" : "Continue"} <Icon name="arrow" /></button></div>
    </section>
  </div>;
}

function ChoiceGrid({ options, selected, onSelect, multi = false }: { options: string[][]; selected: string | string[]; onSelect: (v: string) => void; multi?: boolean }) {
  return <div className="choice-grid">{options.map(([value,label]) => { const active = multi ? (selected as string[]).includes(value) : selected === value; return <button className={active ? "choice selected" : "choice"} key={value} onClick={() => onSelect(value)}><span>{active ? "✓" : "○"}</span>{label}</button>; })}</div>;
}

function RoutineMap({ data, onContinue }: { data: OnboardingData; onContinue: () => void }) {
  const anchors = buildAnchors(data);
  const opportunity = (id: string) => id === "tea-pm" ? ["movement","Easy movement opening"] : id === "lunch" ? ["food","Reliable meal anchor"] : id === "home" ? ["environment","Friction-reducing moment"] : null;
  return <div className="page-shell map-page"><div className="page-intro"><div><div className="eyebrow"><Icon name="spark" /> YOUR ROUTINE MAP</div><h1>Your day already has<br/>good places to begin.</h1><p>We found three moments where a tiny change could fit without rearranging your life.</p></div><div className="map-score"><strong>3</strong><span>gentle<br/>openings</span></div></div>
    <div className="map-layout"><section className="timeline-card"><div className="date-row"><div><b>A typical weekday</b><span>{data.routine.predictability === "variable" ? "Flexible schedule" : "Mostly predictable"}</span></div><span className="tag">{data.routine.workStyle} day</span></div>
      <div className="timeline">{anchors.map((a) => { const opp = opportunity(a.id); return <div className="timeline-item" key={a.id}><time>{formatTime(a.time)}</time><div className={`timeline-node ${opp ? "has-opportunity" : ""}`}>{opp ? "+" : ""}</div><div className="timeline-content"><b>{a.label}</b>{opp && <div className={`opportunity ${opp[0]}`}><span><Icon name={opp[0] === "movement" ? "walk" : opp[0] === "food" ? "food" : "home"} /></span><div><small>{opp[0]} opportunity</small><strong>{opp[1]}</strong></div></div>}</div></div>})}</div>
    </section><aside className="analysis-card"><div className="section-kicker">WHAT WE NOTICED</div><h2>The easiest changes begin after something reliable.</h2><div className="insight"><span>01</span><p><b>Your afternoon tea is a strong anchor.</b>You pause there most weekdays, creating a natural movement window.</p></div><div className="insight"><span>02</span><p><b>Food needs visibility, not willpower.</b>Making fruit part of your tea setup removes the need to remember.</p></div><div className="insight"><span>03</span><p><b>Evenings carry more friction.</b>We’ll use setup—not a demanding workout—to keep the option open.</p></div><div className="gentle-note"><Icon name="leaf" /><p><b>We’re not filling every gap.</b><br/>Three small shifts are enough to learn what fits.</p></div></aside></div>
    <div className="bottom-action"><div><span className="pulse-dot"/>Your plan is ready</div><button className="button" onClick={onContinue}>See my 3 Tiny Shifts <Icon name="arrow" /></button></div>
  </div>;
}

function Plan({ shifts, onContinue }: { shifts: TinyShift[]; onContinue: () => void }) {
  return <div className="page-shell plan-page"><div className="page-intro centered"><div><div className="eyebrow"><Icon name="spark" /> YOUR STARTING PLAN</div><h1>Just three shifts.<br/><em>Small on purpose.</em></h1><p>Try these for a week. We’ll learn from what fits—and adjust what doesn’t.</p></div></div>
    <div className="plan-grid">{shifts.map((s, i) => <ShiftDetail key={s.id} shift={s} number={i + 1}/>)}</div>
    <div className="plan-pledge"><div className="pledge-icon"><Icon name="leaf" /></div><div><b>The TinyShift promise</b><p>Missing a habit is information, not failure. The plan should adapt to your life—not the other way around.</p></div><button className="button" onClick={onContinue}>Start my week <Icon name="arrow" /></button></div>
  </div>;
}

function ShiftDetail({ shift, number }: { shift: TinyShift; number: number }) {
  return <article className={`shift-detail ${shift.category}`}><div className="shift-top"><span className="shift-number">0{number}</span><span className="category-pill">{shift.category}</span></div><div className="shift-symbol"><Icon name={shift.category === "movement" ? "walk" : shift.category === "food" ? "food" : "home"}/></div><h2>{shift.title}</h2><div className="stack-line"><small>AFTER</small><b>{shift.anchor}</b><span>↓</span><small>THEN</small><strong>{shift.normalAction}</strong></div><p className="fit-reason">“{shift.reason}”</p><div className="versions"><div><small>MINIMUM VERSION</small><b>{shift.minimumAction}</b></div><div><small>NORMAL VERSION</small><b>{shift.normalAction}</b></div></div><div className="easier"><span>✦</span><p><small>MAKE IT EASIER</small><b>{shift.frictionReducer}</b></p></div></article>;
}

function Dashboard({ data, shifts, completions, setCompletions, onMiss, go }: { data: OnboardingData; shifts: TinyShift[]; completions: Record<string, "done" | "missed">; setCompletions: React.Dispatch<React.SetStateAction<Record<string, "done" | "missed">>>; onMiss: (s: TinyShift) => void; go: (v: View) => void }) {
  const done = Object.values(completions).filter(v => v === "done").length;
  return <div className="dashboard page-shell"><section className="dash-hero"><div><div className="today-label">TUESDAY · AUGUST 11</div><h1>Good morning, {data.profile.name}.</h1><p>Today’s goal isn’t perfection. Just keep the pattern alive.</p></div><div className="day-progress"><div className="progress-ring" style={{ "--progress": `${done / 3 * 360}deg` } as React.CSSProperties}><span><b>{done}</b>/3</span></div><p><b>Tiny Shifts</b><br/>completed today</p></div></section>
    <div className="dashboard-layout"><section><div className="section-title"><div><span>TODAY’S PLAN</span><h2>Three chances to care for yourself.</h2></div><button className="more">•••</button></div><div className="habit-list">{shifts.map((s) => <HabitCard key={s.id} shift={s} status={completions[s.id]} onDone={() => setCompletions(c => ({ ...c, [s.id]: c[s.id] === "done" ? "missed" : "done" }))} onMiss={() => onMiss(s)} />)}</div></section>
      <aside className="dash-side"><article className="week-card"><div className="week-top"><div><span>THIS WEEK</span><strong>11 <small>of 15</small></strong></div><div className="mini-ring">73%</div></div><div className="week-bars">{[4,5,3,4,2,0,0].map((v,i) => <div key={i}><span style={{ height: `${20 + v * 10}px` }}/><small>{"MTWTFSS"[i]}</small></div>)}</div><p>You’re showing up more often than not. That’s how patterns grow.</p><button onClick={() => go("review")}>View weekly review <Icon name="arrow" /></button></article>
      <article className="thought-card"><div className="quote-mark">“</div><p>The best plan is the one that still works on an ordinary Tuesday.</p><span>A note from TinyShift</span></article></aside></div>
  </div>;
}

function HabitCard({ shift, status, onDone, onMiss }: { shift: TinyShift; status?: "done" | "missed"; onDone: () => void; onMiss: () => void }) {
  return <article className={`habit-card ${shift.category} ${status === "done" ? "completed" : ""}`}><div className="habit-icon"><Icon name={shift.category === "movement" ? "walk" : shift.category === "food" ? "food" : "home"}/></div><div className="habit-main"><span>{shift.category}</span><h3>{shift.title}</h3><div className="habit-trigger"><Icon name="clock" /><p><small>{shift.anchor}</small><b>{shift.normalAction}</b></p></div><div className="minimum">Minimum: {shift.minimumAction}</div></div><div className="habit-actions"><button className="done-button" onClick={onDone}><span>{status === "done" ? "✓" : ""}</span>{status === "done" ? "Done" : "Mark done"}</button><button className="not-today" onClick={onMiss}>Not today</button></div></article>;
}

function MissDialog({ shift, onClose, onSelect }: { shift: TinyShift; onClose: () => void; onSelect: (b: HabitBarrier) => void }) {
  const options: [HabitBarrier,string][] = [["forget","I forgot"],["no-time","Too busy"],["tired","Too tired"],["inconvenient","Not convenient"],["motivation","Didn’t feel like it"],["other","Situation changed"]];
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="miss-title" onMouseDown={e => e.stopPropagation()}><button className="modal-close" onClick={onClose}>×</button><div className="modal-icon"><Icon name="leaf" /></div><span>NO JUDGMENT—JUST A CLUE</span><h2 id="miss-title">What got in the way?</h2><p>We’ll use your answer to make “{shift.title}” fit better next time.</p><div className="barrier-grid">{options.map(([v,label]) => <button key={v} onClick={() => onSelect(v)}>{label}<span>→</span></button>)}</div><div className="adapt-note"><Icon name="spark" /><p><b>The plan adapts to you.</b><br/>Missing once doesn’t undo anything.</p></div></div></div>;
}

function Review({ completions, go }: { completions: Record<string, "done" | "missed">; go: (v: View) => void }) {
  const review = weeklyReview(completions);
  return <div className="page-shell review-page"><div className="review-head"><div><div className="eyebrow"><Icon name="spark" /> WEEKLY REVIEW</div><h1>A week of small<br/>useful clues.</h1><p>Here’s what your real life taught us—without grades or guilt.</p></div><div className="week-date">AUG 5 — 11<br/><b>Week 1</b></div></div>
    <section className="score-grid">{Object.entries(review.totals).map(([key,val]) => <article key={key}><div className={`score-icon ${key}`}><Icon name={key === "movement" ? "walk" : key === "food" ? "food" : "home"}/></div><span>{key}</span><strong>{val.done}<small>/{val.opportunities}</small></strong><div className="score-track"><i style={{ width: `${val.done / val.opportunities * 100}%` }}/></div><p>opportunities completed</p></article>)}</section>
    <div className="review-layout"><section className="learning-card"><div className="section-kicker">WHAT WE LEARNED</div><h2>Your best habits follow a reliable pause.</h2>{review.learnings.map((l,i) => <div className="learning" key={l}><span>0{i+1}</span><p>{l}</p></div>)}</section><section className="adjust-card"><div className="section-kicker">ONE GENTLE ADJUSTMENT</div><h2>Let’s move your walking anchor.</h2><div className="move-from"><small>FROM</small><span>After reaching home</span></div><div className="move-arrow">↓</div><div className="move-to"><small>TO</small><span>After lunch</span><em>More reliable</em></div><p>Evenings were often tiring. Lunch gave you a steadier window on four days.</p><button className="button" onClick={() => go("dashboard")}>Use this next week <Icon name="arrow" /></button></section></div>
    <div className="review-footer"><Icon name="leaf" /><p><b>You don’t need a perfect week.</b><br/>You need a plan willing to learn with you.</p></div>
  </div>;
}
