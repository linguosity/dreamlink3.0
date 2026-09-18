// /admin/trends — long-term dream trends, the editorial read on 12 months of
// analyses. Sits behind the auth gate in ../layout.tsx like every admin page.
//
// Chart colors: the 6 categorical slots below were validated with the dataviz
// six-checks script (lightness band, chroma floor, CVD ΔE, normal-vision
// floor, contrast) — light against #FBFAFF, dark against #0E1440 (--surface).
// Change a hex → re-run the validator before shipping. Slot order is fixed;
// color follows the theme, never its month-to-month rank.

import { getDreamTrends } from "@/lib/dreamTrends";
import { ExpandableCard } from "./_components/expandable-card";
import { ExpandableKpi } from "./_components/expandable-kpi";
import { ThemeStreamgraph } from "./_components/theme-streamgraph";
import { MomentumBoard } from "./_components/momentum-list";
import { ScriptureHeatmap } from "./_components/scripture-heatmap";
import { MonthlyVolumeChart } from "./_components/volume-chart";
import { TableView } from "./_components/table-view";

export const metadata = { title: "Trends · DreamRiver Admin" };

// Request-time only, like every page behind the admin gate. An ISR
// `revalidate` here makes the build try to prerender the page, and that
// build-time render hits whatever Supabase the build env points at (locally:
// 127.0.0.1:54321, usually down) and kills `next build`.
export const dynamic = "force-dynamic";

const TREND_TOKENS = `
.trends-scope{
  --trend-1:#2B3FD4;--trend-2:#D97706;--trend-3:#0D9488;
  --trend-4:#7C3AED;--trend-5:#65A30D;--trend-6:#DB2777;
}
.dark .trends-scope{
  --trend-1:#7187FF;--trend-2:#D97706;--trend-3:#0FA294;
  --trend-4:#8B5CF6;--trend-5:#65A30D;--trend-6:#EC4899;
}`;

export default async function TrendsPage() {
  const t = await getDreamTrends();
  const latestDreamers = t.dreamersByMonth[t.dreamersByMonth.length - 1] ?? 0;

  return (
    <div className="space-y-5 trends-scope">
      <style dangerouslySetInnerHTML={{ __html: TREND_TOKENS }} />

      <div className="mb-2">
        <h1 className="font-serif text-[28px] leading-[1.1]">Trends</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          What the <span className="wordmark text-primary">DreamRiver</span>{" "}
          community has been dreaming · last 12 months
        </p>
      </div>

      {/* KPI strip — every tile clicks open into a month-by-month popup */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <ExpandableKpi
          label="Dreams analyzed"
          value={t.totalDreams.toLocaleString()}
          sub="last 12 months"
          icon="droplet"
          monthLabels={t.monthLabels}
          series={t.dreamsByMonth}
          seriesLabel="Dreams"
        />
        <ExpandableKpi
          label="Dreamers this month"
          value={latestDreamers.toLocaleString()}
          sub={`${t.totalDreamers.toLocaleString()} in the last year`}
          icon="users"
          monthLabels={t.monthLabels}
          series={t.dreamersByMonth}
          seriesLabel="Active dreamers"
        />
        <ExpandableKpi
          label="Starred"
          value={`${t.starredPct}%`}
          sub="of dreams marked special"
          icon="star"
          variant="violet"
          monthLabels={t.monthLabels}
          series={t.starredPctByMonth}
          seriesLabel="Starred rate"
          format="pct"
          showSparkline={false}
        />
        <ExpandableKpi
          label="Feedback given"
          value={`${t.feedbackPct}%`}
          sub="of analyses rated by the dreamer"
          icon="feedback"
          variant="violet"
          monthLabels={t.monthLabels}
          series={t.feedbackPctByMonth}
          seriesLabel="Feedback rate"
          format="pct"
          showSparkline={false}
        />
      </div>

      {/* The river of themes */}
      <ExpandableCard
        title="The river of themes"
        sub="The six most recurring themes across all dreams, month by month — band width is how often each appeared"
      >
        <ThemeStreamgraph monthLabels={t.monthLabels} themes={t.themes} />
        <TableView
          caption="Theme mentions by month"
          columns={["Theme", ...t.monthLabels, "Total"]}
          rows={t.themes.map((s) => [s.theme, ...s.counts, s.total])}
        />
      </ExpandableCard>

      {/* Momentum + volume */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        <ExpandableCard
          title="Symbol momentum"
          sub="Themes gaining or losing ground — mentions this quarter vs the one before"
          className="lg:col-span-2"
        >
          <MomentumBoard
            rising={t.rising}
            fading={t.fading}
            newArrivals={t.newArrivals}
          />
          <TableView
            caption="Symbol momentum, prior quarter vs current"
            columns={["Theme", "Prior 90d", "Last 90d", "Change"]}
            rows={[...t.rising, ...t.newArrivals, ...t.fading].map((r) => [
              r.tag,
              r.prior,
              r.current,
              r.pctChange === null ? "new" : `${r.pctChange > 0 ? "+" : ""}${r.pctChange}%`,
            ])}
          />
        </ExpandableCard>

        <ExpandableCard
          title="Dreams per month"
          sub="Submission volume, current month in indigo"
        >
          <MonthlyVolumeChart
            monthLabels={t.monthLabels}
            counts={t.dreamsByMonth}
          />
          <TableView
            caption="Dreams per month"
            columns={["Month", "Dreams", "Dreamers"]}
            rows={t.monthLabels.map((m, i) => [
              m,
              t.dreamsByMonth[i],
              t.dreamersByMonth[i],
            ])}
          />
        </ExpandableCard>
      </div>

      {/* Scripture heatmap */}
      <ExpandableCard
        title="Where scripture keeps landing"
        sub="Books cited in dream interpretations — darker means more dreams cited that book that month"
      >
        <ScriptureHeatmap
          rows={t.scripture}
          max={t.scriptureMax}
          monthLabels={t.monthLabels}
        />
        <TableView
          caption="Scripture citations by book and month"
          columns={["Book", ...t.monthLabels, "Total"]}
          rows={t.scripture.map((r) => [r.book, ...r.counts, r.total])}
        />
      </ExpandableCard>
    </div>
  );
}
