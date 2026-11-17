import Link from "next/link";

// The memo behind the product. Written to be read in ten minutes.
export default function VisionPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 pb-20 pt-4">
      <div className="text-xs font-medium uppercase tracking-[0.2em]" style={{ color: "#38bdf8" }}>
        Vision
      </div>
      <h1 className="mt-3 text-balance text-4xl font-semibold leading-tight tracking-tight md:text-5xl">Every document is a map that was never drawn.</h1>
      <p className="mt-6 text-xl leading-relaxed text-mist">
        Research reports, filings, spreadsheets, news, photographs. Nearly all of it describes things that happened somewhere, at some time. The where and the when are in there, buried in prose and columns. AIGIS reads the files, puts every located, dated fact on a timeline map, and then does the part no map has done before: it analyzes whatever you are looking at and tells you what it means.
      </p>

      <Section title="The problem">
        <p>Geographic information systems are forty years old and still built for specialists. ArcGIS is priced for enterprises and takes training to use. QGIS is free and takes a course plus a day of plugins to produce one map. Neither reads a PDF, and neither draws a conclusion. So the analyst who reads everything is the bottleneck, and the map that would make the pattern obvious almost never gets built.</p>
        <p>Asking a map questions is now routine; every chat product can do it. Getting an answer that counts the evidence, checks the outside world and states a hypothesis is not. That gap is the product.</p>
      </Section>

      <Section title="What AIGIS does">
        <ul>
          <li><b>Ingest anything.</b> PDF, CSV, XLSX, Markdown, scans, photos and charts. Tables are column-mapped once by a model and converted row by row; prose is read for every event with a place and a time. Every event gets coordinates, a time, a value, a category and a confidence score, with the source quote attached.</li>
          <li><b>Discover.</b> A deterministic pattern engine scores bursts, hotspots and outliers. A discovery pass then reads the whole set for turning points, divergences, leaders and laggards, and connections between what the documents claimed and what the numbers did.</li>
          <li><b>Brief the window.</b> Whatever region the map shows and whatever span the timeline selects, AIGIS computes the statistics and writes a briefing: a verdict, findings as cards ranked by priority, each with its dates, its places and the number that proves it.</li>
          <li><b>Go deeper.</b> At ingest AIGIS proposes the outside sources that would explain the data: a rate series, a jobs index, a weather record. Switch one on and the briefing researches it live, with citations.</li>
          <li><b>Ask.</b> A conversation that answers with evidence and moves the map to show it. Secondary by design: the product surfaces the insight before the question is asked.</li>
        </ul>
      </Section>

      <Section title="Why now">
        <p>Three things changed in the last two years. Models read documents well enough to extract located, dated facts at scale and at a cost measured in fractions of a cent per page. Search-grounded models return cited answers, so outside context can be pulled in live instead of curated by hand. And web map rendering is open and free: MapLibre, OpenStreetMap, OpenFreeMap tiles. The expensive parts of GIS are now commodities; the valuable part is the intelligence layer on top, and nobody owns it yet.</p>
      </Section>

      <Section title="Who it is for">
        <p>Geospatial analytics is roughly a hundred-billion-dollar market growing eleven to thirteen percent a year, nearly all of it sold to trained GIS users. AIGIS moves the starting line to anyone with a folder of documents and a question that begins with where and when: housing and mortgage analysts, insurers, supply chain teams, public health, newsrooms, researchers, policy staff.</p>
        <p>The first wedge is financial and economic research. The demo is built from public Freddie Mac and FHFA documents: thousands of metro-level readings and three outlook reports become one intelligent map in minutes. Every analyst desk that reads these reports is a seat.</p>
      </Section>

      <Section title="Where it goes">
        <ul>
          <li><b>Teams.</b> Shared stories, standing sources, scheduled re-ingest, alerts when a window&apos;s briefing changes.</li>
          <li><b>Connectors.</b> Email, drives, data rooms and feeds, so documents arrive on their own.</li>
          <li><b>Verticals.</b> Housing and mortgage first, then insurance, logistics and public health, each with its own proposed outside sources.</li>
          <li><b>The model of the world.</b> Every story adds located, dated facts and the relationships between them. That accumulating map is the moat.</li>
        </ul>
      </Section>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link href="/view/sample-housing-markets" className="rounded-full bg-glow px-6 py-3 text-sm font-semibold text-ink hover:opacity-90">
          View Demo
        </Link>
        <Link href="/investor/deck" className="rounded-full border border-fog/60 px-6 py-3 text-sm font-semibold text-fog hover:bg-fog/10">
          See the deck
        </Link>
      </div>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-4 space-y-4 text-lg leading-relaxed text-mist [&_b]:text-fog [&_li]:relative [&_li]:pl-6 [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-[0.65em] [&_li]:before:h-2 [&_li]:before:w-2 [&_li]:before:rounded-full [&_li]:before:bg-glow [&_ul]:space-y-3">{children}</div>
    </section>
  );
}
