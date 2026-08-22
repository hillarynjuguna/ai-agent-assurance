export type ScoreEntry = {
    cap: number;
    evid: number;
    na: boolean;
};

export type ScoreData = Record<number, ScoreEntry>;

export type ScoreOption = {
    val: number;
    title: string;
    desc: string;
};

export type DiagnosticDimension = {
    id: number;
    title: string;
    weight: number;
    question?: string;
    counterpartyQuestion?: string;
    whyItMatters?: string;
    regulatoryTags?: string[];
    capOptions: ScoreOption[];
};

export function calculateScores(data: ScoreData, dimensionsList: DiagnosticDimension[], isHighRisk: boolean) {
    let totalCap = 0;
    let totalEvid = 0;
    let maxCap = 0;
    let maxEvid = 0;
    let naCount = 0;
    const gaps: string[] = [];

    dimensionsList.forEach((d, index) => {
        const i = index + 1;
        const entry = data[i] || { cap: 0, evid: 0, na: false };
        const weight = d.weight || 1;
        if (entry.na) {
            naCount++;
        } else {
            maxCap += 3 * weight;
            maxEvid += 4 * weight;
            totalCap += entry.cap * weight;
            totalEvid += entry.evid * weight;
            
            // Check for gaps
            if (entry.cap < 2) {
                gaps.push(`D${i}: Capability deficit (${d.title})`);
            }
            if (entry.evid < 2) {
                gaps.push(`D${i}: Assurance deficit (${d.title})`);
            }
        }
    });

    const capPct = maxCap > 0 ? Math.round((totalCap / maxCap) * 100) : 0;
    const assurPct = maxEvid > 0 ? Math.round((totalEvid / maxEvid) * 100) : 0;
    
    let capZone = "low";
    if (capPct >= 80) capZone = "high";
    else if (capPct >= 50) capZone = "medium";
    
    let assurZone = "low";
    if (assurPct >= 70) assurZone = "high";
    else if (assurPct >= 40) assurZone = "medium";

    // Reliance Verdict Logic
    let verdict = "";
    let rationale = "";
    let ctaHead = "";
    let ctaSub = "";

    if (capPct === 0 && assurPct === 0 && naCount === 0) {
        verdict = "Reliance Recommendation: Pending";
        rationale = "Complete the diagnostic to view readiness.";
        ctaHead = "Run the diagnostic to see readiness.";
        ctaSub = "Identify blockers affecting counterparty approval.";
    } else if (assurZone === "high" && capZone === "high") {
        verdict = "Reliance Verdict: RELIANCE-READY";
        rationale = "This workflow meets standard institutional thresholds for external reliance. Strong capability controls are backed by verifiable evidence.";
        ctaHead = "Your workflow is reliance-ready.";
        ctaSub = "You have the evidence needed to pass processor approval, enterprise procurement, or investor diligence. Unlock the official report for your data room.";
    } else if (assurZone === "high" || capZone === "high") {
        verdict = "Reliance Verdict: CONDITIONAL RELIANCE";
        rationale = "This workflow may be acceptable for client-facing use only after evidence gaps are closed in audit provenance, human override, or containment.\\n\\nLikely counterparty concern:\\nPayment processors, insurers, and enterprise clients may reject this workflow because the system cannot fully prove what the agent did or how damage is contained.";
        ctaHead = "Your workflow is conditionally ready.";
        ctaSub = "You have actionable blockers that will slow down enterprise procurement or investor diligence. Unlock the report to see how to fix them.";
    } else {
        verdict = "Reliance Verdict: NOT RELIANCE-READY";
        rationale = "This workflow is highly experimental. Counterparties will view this as unmanaged shadow-AI risk.\\n\\nLikely counterparty concern:\\nInvestors and insurers will flag this as a critical liability. The system lacks both the capability to control the agent and the evidence to prove it.";
        ctaHead = "Your workflow is not yet reliance-ready.";
        ctaSub = "You have critical blockers that will halt processor approval, enterprise procurement, insurance review, or investor diligence.";
    }

    if (isHighRisk && (capPct < 80 || assurPct < 80) && !verdict.includes("Pending")) {
        verdict = verdict === "Reliance Verdict: RELIANCE-READY"
            ? "Reliance Verdict: CONDITIONAL (AT RISK)"
            : "Reliance Verdict: NOT RELIANCE-READY";
        rationale = "Because this operation is classified as Financial/Regulated/Safety-Critical, these controls are insufficient for unconditional deployment without stronger capability and assurance thresholds.";
        ctaHead = "High-risk workflow is not reliance-ready.";
    }

    // Trust Gates Logic
    const gates = {
        payment: { status: 'PENDING', cssClass: 'status-gap', text: 'PENDING' },
        investor: { status: 'PENDING', cssClass: 'status-gap', text: 'PENDING' },
        insurer: { status: 'PENDING', cssClass: 'status-gap', text: 'PENDING' },
        client: { status: 'PENDING', cssClass: 'status-gap', text: 'PENDING' },
        regulator: { status: 'PENDING', cssClass: 'status-gap', text: 'PENDING' }
    };

    if (capPct > 0 || assurPct > 0) {
        const d1 = data[1] || { cap: 0, evid: 0 };
        const d2 = data[2] || { cap: 0, evid: 0 };
        const d9 = data[9] || { cap: 0, evid: 0 };
        const d10 = data[10] || { cap: 0, evid: 0 };

        // Payment Processor
        let payRisk = 0;
        if (d1.cap < 2) payRisk += 2;
        if (d10.cap < 2) payRisk += 2;
        if (payRisk >= 2) gates.payment = { status: 'NOT READY', cssClass: 'status-not-ready', text: 'HIGH RISK' };
        else if (payRisk === 0 && assurPct > 60) gates.payment = { status: 'READY', cssClass: 'status-ready', text: 'READY' };
        else gates.payment = { status: 'AT RISK', cssClass: 'status-weak', text: 'AT RISK' };

        // Investor
        if (assurPct > 70 && capPct > 70) gates.investor = { status: 'READY', cssClass: 'status-ready', text: 'READY' };
        else if (assurPct > 40) gates.investor = { status: 'CONDITIONAL', cssClass: 'status-conditional', text: 'CONDITIONAL' };
        else gates.investor = { status: 'AT RISK', cssClass: 'status-weak', text: 'AT RISK' };

        // Insurer
        let insRisk = 0;
        if (d2.evid < 2) insRisk += 2;
        if (d9.cap < 2) insRisk += 1;
        if (insRisk >= 2) gates.insurer = { status: 'EVIDENCE GAP', cssClass: 'status-gap', text: 'WEAK' };
        else if (insRisk === 1) gates.insurer = { status: 'WEAK', cssClass: 'status-weak', text: 'WEAK' };
        else gates.insurer = { status: 'READY', cssClass: 'status-ready', text: 'READY' };

        // Client
        if (capPct > 80 && assurPct > 80) gates.client = { status: 'READY', cssClass: 'status-ready', text: 'READY' };
        else if (capPct > 60 && assurPct > 50) gates.client = { status: 'CONDITIONAL', cssClass: 'status-conditional', text: 'CONDITIONAL' };
        else gates.client = { status: 'NOT READY', cssClass: 'status-not-ready', text: 'NOT READY' };

        // Regulator
        if (d2.evid === 0) gates.regulator = { status: 'EVIDENCE GAP', cssClass: 'status-gap', text: 'EVIDENCE GAP' };
        else if (d2.evid < 3) gates.regulator = { status: 'AT RISK', cssClass: 'status-weak', text: 'AT RISK' };
        else gates.regulator = { status: 'READY', cssClass: 'status-ready', text: 'READY' };
    }

    const blockerCount = gaps.length > 0 ? gaps.length : (naCount > 0 ? naCount : 0);
    if (blockerCount > 0 && capPct > 0) {
        ctaSub = `You have ${blockerCount} priority blockers that could affect processor approval, enterprise procurement, insurance review, or investor diligence.`;
    }

    return {
        capPct,
        assurPct,
        capZone,
        assurZone,
        gaps,
        verdict,
        rationale,
        ctaHead,
        ctaSub,
        gates
    };
}
