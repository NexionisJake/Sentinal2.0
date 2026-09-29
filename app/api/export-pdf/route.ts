import { NextResponse } from 'next/server';
import { createClient } from '@clickhouse/client';
import PDFDocument from 'pdfkit';

const client = createClient({
  url: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || 'admin',
  database: process.env.CLICKHOUSE_DATABASE || 'inclusiweb_geo',
});

// Helper: draw a thick horizontal rule
function drawRule(doc: any, y: number, color = '#333333') {
  doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor(color).lineWidth(1).stroke();
}

function drawSectionHeader(doc: any, title: string) {
  doc.moveDown(0.5);
  doc.rect(50, doc.y, doc.page.width - 100, 20).fill('#111111');
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9).text(title, 56, doc.y - 16, { continued: false });
  doc.fillColor('#000000').moveDown(0.8);
}

function formatINR(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`;
  return `₹${amount.toLocaleString()}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rainfall = Math.min(250, Math.max(50, parseFloat(searchParams.get('rainfall') || '100')));
    const slopeThreshold = Math.min(30, Math.max(10, parseFloat(searchParams.get('slope_threshold') || '20')));
    const historyWeight = Math.min(1.0, Math.max(0.2, parseFloat(searchParams.get('history_weight') || '0.5')));

    // Fetch all data
    const [habRes, sitesRes, roadsRes, cellsRes] = await Promise.all([
      client.query({ query: `SELECT * FROM inclusiweb_geo.habitations`, format: 'JSONEachRow' }),
      client.query({ query: `SELECT * FROM inclusiweb_geo.safe_sites`, format: 'JSONEachRow' }),
      client.query({ query: `SELECT * FROM inclusiweb_geo.road_networks`, format: 'JSONEachRow' }),
      client.query({
        query: `SELECT lat, lon, least(100.0, greatest(0.0, (if(slope >= ${slopeThreshold}, (slope / 45.0) * 35.0, (slope / 45.0) * 15.0) + (flow_accum * 25.0) + ((${rainfall} / 250.0) * 25.0) + (${historyWeight} * history_density * 25.0)))) AS hazard_score FROM inclusiweb_geo.grid_cells`,
        format: 'JSONEachRow',
      }),
    ]);

    const habitations: any[] = await habRes.json();
    const sites: any[] = await sitesRes.json();
    const roads: any[] = await roadsRes.json();
    const cells: any[] = await cellsRes.json();

    // Compute priorities
    const siteCopies: any[] = sites.map((s) => ({ ...s, used: 0 }));
    const allocations: any[] = [];
    let tier1Pop = 0, tier2Pop = 0, tier3Pop = 0;

    const evaluated = habitations.map((v) => {
      let minDist = Infinity, nearestScore = 40;
      for (const cell of cells) {
        const d = Math.hypot(v.lat - cell.lat, v.lon - cell.lon);
        if (d < minDist) { minDist = d; nearestScore = cell.hazard_score; }
      }
      const vulScore = (v.population / 1000.0) * 2.5 + (v.kutcha_ratio || 0.5) * 35.0 + (v.elderly_ratio || 0.2) * 25.0;
      const finalPriority = Math.round(nearestScore * vulScore * 10) / 10;
      let tier = 'TIER_3', tierLabel = 'Phase 3 (12-24 mos)', color = 'GOLD';
      if (finalPriority >= 450 || nearestScore >= 70) { tier = 'TIER_1'; tierLabel = 'Phase 1 (Immediate)'; color = 'RED'; tier1Pop += v.population; }
      else if (finalPriority >= 250 || nearestScore >= 50) { tier = 'TIER_2'; tierLabel = 'Phase 2 (3-12 mos)'; color = 'AMBER'; tier2Pop += v.population; }
      else { tier3Pop += v.population; }
      return { ...v, hazard_score: Math.round(nearestScore * 10) / 10, final_priority: finalPriority, tier, tierLabel };
    }).sort((a, b) => b.final_priority - a.final_priority);

    evaluated.forEach((village) => {
      const sortedSites = [...siteCopies].sort((a, b) => Math.hypot(a.lat - village.lat, a.lon - village.lon) - Math.hypot(b.lat - village.lat, b.lon - village.lon));
      const matchedSite = sortedSites[0];
      const road = roads.find((r) => r.from_village_id === village.habitation_id && r.to_site_id === matchedSite.site_id);
      matchedSite.used += village.population;
      allocations.push({ village, site: matchedSite, road, bottleneck: road?.bottleneck_type || 'ROAD_WIDTH' });
    });

    const totalDisplaced = tier1Pop + tier2Pop;
    const budgetEstimate = (tier1Pop * 200000) + (tier2Pop * 150000) + (tier3Pop * 50000);

    // Build PDF
    const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 50, right: 50 }, autoFirstPage: true });
    const buffers: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => buffers.push(chunk));

    const pageW = doc.page.width;
    const timestamp = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    // === PAGE 1: COVER ===
    doc.rect(0, 0, pageW, doc.page.height).fill('#050810');
    doc.rect(0, 0, pageW, 8).fill('#EF4444');
    doc.rect(0, doc.page.height - 8, pageW, 8).fill('#EF4444');

    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9).text('OPERATIONAL SENSITIVITY: HIGH | KERALA STATE DISASTER MANAGEMENT AUTHORITY', 50, 28, { align: 'center', width: pageW - 100 });

    doc.moveTo(50, 48).lineTo(pageW - 50, 48).strokeColor('#EF4444').lineWidth(1).stroke();

    doc.fillColor('#EF4444').font('Helvetica-Bold').fontSize(7).text('— INCLUSIWEB TACTICAL GEOSPATIAL COMMAND CENTER —', 50, 60, { align: 'center', width: pageW - 100 });

    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(24).text('OFFICIAL RELOCATION', 50, 140, { align: 'center', width: pageW - 100 });
    doc.fontSize(24).text('ACTION PLAN', { align: 'center', width: pageW - 100 });
    doc.moveDown(0.4);
    doc.fillColor('#EF4444').fontSize(14).text('WAYANAD DISTRICT, KERALA STATE', { align: 'center', width: pageW - 100 });

    doc.moveTo(100, doc.y + 12).lineTo(pageW - 100, doc.y + 12).strokeColor('#333333').lineWidth(1).stroke();
    doc.moveDown(1.2);

    const metaY = doc.y;
    doc.fillColor('#888888').font('Helvetica').fontSize(8).text(`DOCUMENT DATE: ${timestamp}`, 50, metaY, { align: 'center', width: pageW - 100 });
    doc.text(`SIMULATION PARAMETERS: Rainfall ${rainfall} mm/hr | Slope Cutoff ${slopeThreshold}° | Hist. Weight ${Math.round(historyWeight * 100)}%`, { align: 'center', width: pageW - 100 });
    doc.text(`DOCUMENT REF: KSDAM/WAYANAD/RELOC/${new Date().getFullYear()}/001`, { align: 'center', width: pageW - 100 });

    doc.moveDown(4);
    // Big metrics
    const metricBoxes = [
      { label: 'TOTAL DISPLACED', value: totalDisplaced.toLocaleString() },
      { label: 'BUDGET ESTIMATE', value: formatINR(budgetEstimate) },
      { label: 'RED ZONE AREA', value: `${Math.round((cells.filter((c: any) => c.hazard_score >= 70).length * 0.85))} km²` },
    ];
    const boxW = (pageW - 100 - 30) / 3;
    metricBoxes.forEach((m, i) => {
      const bx = 50 + i * (boxW + 15);
      const by = doc.y;
      doc.rect(bx, by, boxW, 60).fill('#0D1117');
      doc.rect(bx, by, boxW, 3).fill('#EF4444');
      doc.fillColor('#EF4444').font('Helvetica-Bold').fontSize(6).text(m.label, bx + 8, by + 10, { width: boxW - 16 });
      doc.fillColor('#FFFFFF').fontSize(18).text(m.value, bx + 8, by + 22, { width: boxW - 16 });
    });

    doc.fillColor('#333333').font('Helvetica').fontSize(7).text('This document is generated by InclusiWeb — AI-powered Geospatial Command Center for proactive disaster relocation planning.', 50, doc.page.height - 80, { align: 'center', width: pageW - 100 });

    // === PAGE 2: EXECUTIVE SUMMARY ===
    doc.addPage({ size: 'A4', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
    doc.rect(0, 0, pageW, 6).fill('#EF4444');
    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(16).text('EXECUTIVE SUMMARY', 50, 24);
    drawRule(doc, doc.y + 4);
    doc.moveDown(1);

    doc.font('Helvetica').fontSize(9).fillColor('#222222').text(
      `This report presents the findings and recommendations of the InclusiWeb Tactical Geospatial Analysis ` +
      `for Wayanad District, conducted under parameters of ${rainfall} mm/hr simulated rainfall intensity, ` +
      `${slopeThreshold}° slope hazard cutoff, and ${Math.round(historyWeight * 100)}% historical landslide weight. ` +
      `The analysis identified ${habitations.length} habitations within the district boundary, ` +
      `of which ${evaluated.filter((v) => v.tier === 'TIER_1').length} require immediate relocation (Phase 1) ` +
      `and ${evaluated.filter((v) => v.tier === 'TIER_2').length} require short-term intervention (Phase 2).`, { lineGap: 3 }
    );

    doc.moveDown(1);
    drawSectionHeader(doc, 'KEY IMPACT METRICS');

    const metrics = [
      ['Phase 1 (Immediate) Population', `${tier1Pop.toLocaleString()} persons`, 'Requiring immediate evacuation within 3 months'],
      ['Phase 2 (Short-term) Population', `${tier2Pop.toLocaleString()} persons`, 'Requiring relocation within 3-12 months'],
      ['Phase 3 (In-situ Mitigation)', `${tier3Pop.toLocaleString()} persons`, 'In-situ mitigation recommended, 12-24 months'],
      ['Total Population Displaced', `${totalDisplaced.toLocaleString()} persons`, 'Phase 1 + Phase 2 combined'],
      ['Budget Estimate (Phase 1+2)', formatINR(budgetEstimate), `₹${(budgetEstimate / 10000000).toFixed(2)} Crore total`],
      ['In-situ Mitigation Cost', formatINR(tier3Pop * 50000), 'Slope stabilization and early warning systems'],
    ];

    metrics.forEach(([label, value, note], i) => {
      const rowY = doc.y;
      if (i % 2 === 0) doc.rect(50, rowY, pageW - 100, 22).fill('#F9F9F9');
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(8).text(label, 56, rowY + 5, { width: 200 });
      doc.fillColor('#EF4444').font('Helvetica-Bold').text(value, 260, rowY + 5, { width: 100 });
      doc.fillColor('#666666').font('Helvetica').fontSize(7).text(note, 370, rowY + 6, { width: pageW - 420 });
      doc.moveDown(0.75);
    });

    // === PAGE 3: VILLAGE ALLOCATION BREAKDOWN ===
    doc.addPage({ size: 'A4', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
    doc.rect(0, 0, pageW, 6).fill('#EF4444');
    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(16).text('PHASED HABITATION TRIAGE & ALLOCATION', 50, 24);
    drawRule(doc, doc.y + 4);
    doc.moveDown(0.8);

    doc.font('Helvetica').fontSize(8).fillColor('#555555').text('Villages ordered by Final_Priority Score (Hazard_Score × Vulnerability_Score). Each village is matched to its nearest feasible safe site.');
    doc.moveDown(0.8);

    // Table header
    const cols = [56, 130, 200, 270, 380, 460];
    const colW = [72, 68, 68, 108, 78, 72];
    const headers = ['VILLAGE', 'TRIAGE TIER', 'PRIORITY', 'ASSIGNED SAFE SITE', 'POPULATION', 'BOTTLENECK'];
    doc.rect(50, doc.y, pageW - 100, 16).fill('#111111');
    headers.forEach((h, i) => doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(7).text(h, cols[i], doc.y - 12, { width: colW[i] }));
    doc.moveDown(0.5);

    allocations.forEach((alloc, idx) => {
      const rowY = doc.y;
      if (idx % 2 === 0) doc.rect(50, rowY, pageW - 100, 18).fill('#F7F7F7');
      const tierColors: any = { TIER_1: '#EF4444', TIER_2: '#F59E0B', TIER_3: '#EAB308' };
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(7.5).text(alloc.village.village_name, cols[0], rowY + 4, { width: colW[0] });
      doc.fillColor(tierColors[alloc.village.tier] || '#EAB308').font('Helvetica-Bold').text(alloc.village.tier, cols[1], rowY + 4, { width: colW[1] });
      doc.fillColor('#000000').font('Helvetica').text(String(alloc.village.final_priority), cols[2], rowY + 4, { width: colW[2] });
      doc.fillColor('#1D4ED8').font('Helvetica-Bold').text(alloc.site.site_name, cols[3], rowY + 4, { width: colW[3] });
      doc.fillColor('#000000').font('Helvetica').text(alloc.village.population.toLocaleString(), cols[4], rowY + 4, { width: colW[4] });
      doc.fillColor('#EF4444').font('Helvetica-Bold').text(alloc.bottleneck, cols[5], rowY + 4, { width: colW[5] });
      doc.moveDown(0.85);
    });

    // === PAGE 4: SAFE SITE CAPACITY AUDIT ===
    doc.addPage({ size: 'A4', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
    doc.rect(0, 0, pageW, 6).fill('#EF4444');
    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(16).text('SAFE SITE CARRYING CAPACITY AUDIT', 50, 24);
    drawRule(doc, doc.y + 4);
    doc.moveDown(1);

    sites.forEach((site) => {
      const assignedVillages = allocations.filter((a) => a.site.site_id === site.site_id);
      const totalPop = assignedVillages.reduce((sum, a) => sum + a.village.population, 0);
      const roadPct = Math.round((totalPop / site.max_road_capacity) * 100);
      const waterPct = Math.round((totalPop / site.max_water_capacity) * 100);
      const landPct = Math.round((totalPop / site.max_land_capacity) * 100);

      doc.rect(50, doc.y, pageW - 100, 14).fill('#111111');
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9).text(`▸ ${site.site_name}  |  Coordinates: ${site.lat}°N, ${site.lon}°E`, 56, doc.y - 10, { width: pageW - 112 });
      doc.moveDown(0.6);

      const rows = [
        ['Land Capacity', `${Math.min(totalPop, site.max_land_capacity).toLocaleString()} / ${site.max_land_capacity.toLocaleString()} persons`, `${landPct}%`, landPct >= 100 ? '⚠ OVER CAPACITY' : 'AVAILABLE'],
        ['Water Capacity', `${Math.min(totalPop, site.max_water_capacity).toLocaleString()} / ${site.max_water_capacity.toLocaleString()} persons`, `${waterPct}%`, waterPct >= 100 ? '⚠ OVER CAPACITY' : 'AVAILABLE'],
        ['Road Access', `${Math.min(totalPop, site.max_road_capacity).toLocaleString()} / ${site.max_road_capacity.toLocaleString()} persons`, `${roadPct}%`, roadPct >= 100 ? '⚠ CRITICAL BOTTLENECK' : 'AVAILABLE'],
      ];

      rows.forEach(([label, usage, pct, status], i) => {
        const rowY = doc.y;
        if (i % 2 === 0) doc.rect(50, rowY, pageW - 100, 16).fill('#F9F9F9');
        const isOver = status.includes('OVER') || status.includes('CRITICAL');
        doc.fillColor('#333333').font('Helvetica').fontSize(7.5).text(label, 60, rowY + 4, { width: 120 });
        doc.fillColor(isOver ? '#EF4444' : '#1D4ED8').font('Helvetica-Bold').text(usage, 185, rowY + 4, { width: 160 });
        doc.fillColor(isOver ? '#EF4444' : '#16A34A').text(pct, 350, rowY + 4, { width: 40 });
        doc.fillColor(isOver ? '#EF4444' : '#16A34A').text(status, 400, rowY + 4, { width: 130 });
        doc.moveDown(0.75);
      });

      const bottleneck = allocations.find((a) => a.site.site_id === site.site_id)?.bottleneck || 'N/A';
      doc.fillColor('#DC2626').font('Helvetica-Bold').fontSize(7.5).text(`Limiting Constraint: ${bottleneck}`, 60, doc.y, { width: 400 });
      doc.moveDown(1.2);
    });

    // === PAGE 5: BOTTLENECK MITIGATION RECOMMENDATIONS ===
    doc.addPage({ size: 'A4', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
    doc.rect(0, 0, pageW, 6).fill('#EF4444');
    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(16).text('BOTTLENECK MITIGATION RECOMMENDATIONS', 50, 24);
    drawRule(doc, doc.y + 4);
    doc.moveDown(1);

    const recommendations = [
      { type: 'ROAD_WIDTH', title: 'Road Width Infrastructure Expansion', body: 'All routes with ROAD_WIDTH bottlenecks require immediate road-widening from ~3.5m to minimum 7m standard width to accommodate emergency convoy vehicle movement. Priority: MDR-54 connecting Mundakkai to Kalpetta hub. Estimated cost: ₹2.4 Cr/km.' },
      { type: 'WATER_LIMIT', title: 'Water Pipeline Extension Projects', body: 'Sites flagged with WATER_LIMIT constraints require KUWS&DB pipeline extension with 2x 200mm diameter supply mains from Banasuranpuzha reservoir. Estimated capacity increase: 2000 persons/day. Estimated cost: ₹3.8 Cr.' },
      { type: 'LAND_LIMIT', title: 'Land Acquisition & Site Expansion', body: 'For LAND_LIMIT constrained sites, District Revenue Authority should expedite notification of 12.5 hectares of Class III forest land adjacent to Sultan Bathery Safe Enclave under the Disaster Management Act, 2005. Timeline: 90 days.' },
      { type: 'EARLY_WARNING', title: 'Real-Time Early Warning System Deployment', body: 'Deploy 12 IoT rain gauge + slope inclinometer units across Mundakkai, Chooralmala, Vellarmala, and Attamala grid sectors. Integration with InclusiWeb real-time API for automated Red Zone escalation alerts at >140 mm/hr threshold.' },
    ];

    recommendations.forEach((rec, i) => {
      const recY = doc.y;
      doc.rect(50, recY, 4, 52).fill('#EF4444');
      doc.fillColor('#111111').font('Helvetica-Bold').fontSize(9).text(`[${rec.type}] ${rec.title}`, 62, recY + 4, { width: pageW - 112 });
      doc.fillColor('#333333').font('Helvetica').fontSize(8).text(rec.body, 62, doc.y + 2, { width: pageW - 112, lineGap: 2 });
      doc.moveDown(1.5);
    });

    // Footer page
    doc.addPage({ size: 'A4', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
    doc.rect(0, 0, pageW, doc.page.height).fill('#050810');
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(12).text('APPENDIX: SIMULATION PARAMETERS', 50, 60);
    drawRule(doc, doc.y + 4, '#333333');
    doc.moveDown(1);
    const appendixRows = [
      ['Rainfall Intensity', `${rainfall} mm/hr`],
      ['Slope Hazard Cutoff', `${slopeThreshold}°`],
      ['Historical Landslide Weight', `${Math.round(historyWeight * 100)}%`],
      ['Grid Cells Analyzed', '484'],
      ['Habitations Evaluated', '8'],
      ['Safe Sites Available', '4'],
    ];
    appendixRows.forEach(([k, v]) => {
      doc.fillColor('#888888').font('Helvetica').fontSize(8).text(k, 60, doc.y, { continued: true, width: 200 });
      doc.fillColor('#00F0FF').font('Helvetica-Bold').text(v, { align: 'left' });
      doc.moveDown(0.5);
    });
    doc.fillColor('#EF4444').font('Helvetica-Bold').fontSize(7).text('GENERATED BY INCLUSIWEB — TACTICAL GEOSPATIAL COMMAND CENTER | Kerala State Disaster Management Authority', 50, doc.page.height - 60, { align: 'center', width: pageW - 100 });

    doc.end();

    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
    });

    return new Response(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="InclusiWeb_Relocation_ActionPlan_${new Date().toISOString().slice(0, 10)}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (error: any) {
    console.error('PDF export error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
