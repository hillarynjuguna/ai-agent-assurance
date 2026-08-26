"use client";

import React, { useState } from 'react';
import { DIMENSIONS, EVIDENCE_OPTIONS } from '../data/dimensions';
import { type DiagnosticDimension, type ScoreData, type ScoreOption } from '../utils/scoring';
import { getPaymentUrl, PaymentProductType } from '../lib/payments/gumroad';

export default function Home() {
  const [metaRisk, setMetaRisk] = useState('Operational');
  const [activeAudiences, setActiveAudiences] = useState<string[]>([]);
  const [activeActions, setActiveActions] = useState<string[]>([]);
  
  // data maps dimension index (1-10) to { cap, evid, na }
  const [dimensionData, setDimensionData] = useState<ScoreData>({});
  const [email, setEmail] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handleCheckout = async (reportType: PaymentProductType) => {
    try {
      setIsCheckingOut(true);
      
      let utmSource: string | undefined;
      let utmMedium: string | undefined;
      let utmCampaign: string | undefined;

      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        utmSource = params.get('utm_source') || params.get('ref') || undefined;
        utmMedium = params.get('utm_medium') || undefined;
        utmCampaign = params.get('utm_campaign') || undefined;
      }
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType,
          reportData: { metaRisk, activeAudiences, activeActions, dimensionData, email, utmSource, utmMedium, utmCampaign }
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        const targetUrl = getPaymentUrl(reportType, data.reportId);
        window.location.href = targetUrl;
      }
    } catch (err) {
      console.error(err);
      window.location.href = getPaymentUrl(reportType);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const toggleAudience = (aud: string) => {
    setActiveAudiences(prev => prev.includes(aud) ? prev.filter(a => a !== aud) : [...prev, aud]);
  };

  const toggleAction = (act: string) => {
    setActiveActions(prev => prev.includes(act) ? prev.filter(a => a !== act) : [...prev, act]);
  };

  const handleScoreChange = (dimIndex: number, field: 'cap' | 'evid', value: number) => {
    setDimensionData(prev => ({
      ...prev,
      [dimIndex]: { ...prev[dimIndex], [field]: value, na: false }
    }));
  };

  const handleNaToggle = (dimIndex: number) => {
    setDimensionData(prev => {
      const current = prev[dimIndex] || { cap: 0, evid: 0, na: false };
      return {
        ...prev,
        [dimIndex]: { ...current, na: !current.na }
      };
    });
  };



  return (
    <div className="container">
      <div className="hero-section" style={{ animation: "fadeInDown 0.8s ease-out" }}>
        <h1 className="hero-heading">Can Your AI Agent Workflow Survive Outside Scrutiny?</h1>
        <div className="hero-sub">Check whether your agentic workflow is ready for payment processor review, investor diligence, insurer underwriting, enterprise clients, or regulators.</div>
        <div style={{ textAlign: 'center', marginTop: '18px' }}>
          <a href="/assurance" className="btn btn-outline">Open Assurance Reviewer Console</a>
        </div>
      </div>

      <div className="glass-panel" style={{ animationDelay: "0.1s" }}>
        <h2 style={{ marginTop: 0, fontSize: '1.4rem' }}>Agent Trust Readiness Diagnostic</h2>
        
        <label>Who needs to trust this workflow?</label>
        <div className="pill-group">
          {['Payment Processor', 'Investor', 'Insurer', 'Enterprise Client', 'Regulator'].map(aud => (
            <div 
              key={aud} 
              role="button"
              tabIndex={0}
              aria-pressed={activeAudiences.includes(aud)}
              className={`pill-toggle ${activeAudiences.includes(aud) ? 'active' : ''}`} 
              onClick={() => toggleAudience(aud)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleAudience(aud); } }}
            >
              {aud}
            </div>
          ))}
        </div>
        
        <label>What does the workflow do?</label>
        <div className="pill-group">
          {['Handles payments', 'Sends emails', 'Accesses customer data', 'Executes purchases', 'Makes recommendations'].map(act => (
            <div 
              key={act} 
              role="button"
              tabIndex={0}
              aria-pressed={activeActions.includes(act)}
              className={`pill-toggle ${activeActions.includes(act) ? 'active' : ''}`} 
              onClick={() => toggleAction(act)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleAction(act); } }}
            >
              {act}
            </div>
          ))}
        </div>
        
        <label>Risk level:</label>
        <div className="pill-group">
          {['Informational', 'Operational', 'Financial', 'Regulated', 'Safety-Critical'].map(risk => (
            <div 
              key={risk} 
              role="button"
              tabIndex={0}
              aria-pressed={metaRisk === risk}
              className={`pill-toggle ${metaRisk === risk ? 'active' : ''}`} 
              onClick={() => setMetaRisk(risk)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMetaRisk(risk); } }}
            >
              {risk}
            </div>
          ))}
        </div>
      </div>

      <div className="layout-grid">
        <div className="questions-column">
          {DIMENSIONS.map((d: DiagnosticDimension, idx: number) => {
            const dimNum = idx + 1;
            const currentData = dimensionData[dimNum] || { cap: 0, evid: 0, na: false };
            const isNA = currentData.na;
            const counterpartyQuestion = d.counterpartyQuestion || d.question;
            const whyItMatters = d.whyItMatters || "External reviewers need a clear control and evidence story before they can rely on this workflow.";

            return (
              <div key={dimNum} className={`dimension-card ${isNA ? 'na-active' : ''}`} style={{ animationDelay: `${0.1 + (idx * 0.05)}s` }}>
                <div className="dimension-header">
                  <div className="dimension-title">Dimension {dimNum}: {d.id}</div>
                  <div className={`na-toggle ${isNA ? 'na-active' : ''}`} onClick={() => handleNaToggle(dimNum)}>
                    {isNA ? 'N/A Applied' : 'Mark N/A'}
                  </div>
                </div>

                <div className="dim-counterparty">
                    <div className="dim-counterparty-title">Counterparty Question</div>
                    <div className="dim-counterparty-question">&quot;{counterpartyQuestion}&quot;</div>
                </div>
                <div className="dim-why">
                    <div className="dim-why-title">Why this matters</div>
                    <div className="dim-why-text">{whyItMatters}</div>
                </div>

                {!isNA && (
                  <div className="options-grid">
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-color)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Capability</div>
                      <select 
                        value={currentData.cap} 
                        onChange={(e) => handleScoreChange(dimNum, 'cap', parseInt(e.target.value))}
                        className="score-select capability"
                      >
                        {d.capOptions.map((opt: ScoreOption) => (
                          <option key={opt.val} value={opt.val} title={opt.desc}>{opt.title}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--evidence-color)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assurance</div>
                      <select 
                        value={currentData.evid} 
                        onChange={(e) => handleScoreChange(dimNum, 'evid', parseInt(e.target.value))}
                        className="score-select assurance"
                      >
                        {EVIDENCE_OPTIONS.map((opt: ScoreOption) => (
                          <option key={opt.val} value={opt.val} title={opt.desc}>{opt.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="results-column">
          <div className="glass-panel" style={{ position: 'sticky', top: '20px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1.2rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '10px' }}>Your Free Trust Readiness Snapshot</h3>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "20px", fontSize: "0.95rem" }}>
              Your workflow has been evaluated against 10 critical dimensions. Enter your email below to instantly reveal your scores, counterparty trust gates, and get a link to your free snapshot.
            </p>
            
            <div style={{ marginTop: '20px' }}>
              <input 
                type="email" 
                placeholder="you@company.com" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.2)', color: '#fff', marginBottom: '15px' }}
              />
              <button 
                className="cta-btn"
                style={{ width: '100%', textAlign: 'center' }}
                onClick={() => handleCheckout('free-snapshot')}
                disabled={!email || !email.includes('@') || isCheckingOut}
              >
                {isCheckingOut ? 'Generating Snapshot...' : 'Reveal My Snapshot'}
              </button>
            </div>
            
            <div style={{ marginTop: "40px", filter: "blur(5px)", opacity: 0.5, pointerEvents: "none", userSelect: "none" }}>
               <div className="score-row">
                 <div className="score-label">Capability Score</div>
                 <div className="score-value capability">??%</div>
               </div>
               <div className="score-row">
                 <div className="score-label">Assurance Score</div>
                 <div className="score-value assurance">??%</div>
               </div>
               <div className="reliance-box" style={{ marginTop: "20px" }}>
                 <div className="reliance-verdict">Generating verdict...</div>
                 <div className="reliance-rationale">Analyzing counterparty trust requirements and operational readiness to determine external reliance probability.</div>
               </div>
               
               <div style={{ marginTop: '30px' }}>
                 <h3 style={{ marginTop: 0, marginBottom: '5px' }}>Counterparty Trust Gates</h3>
                 <div className="trust-gates" style={{ marginTop: "15px" }}>
                   <div className="trust-gate">
                     <div className="gate-name">Payment Processor</div>
                     <div className="gate-status status-weak">EVALUATING</div>
                   </div>
                   <div className="trust-gate">
                     <div className="gate-name">Investor Diligence</div>
                     <div className="gate-status status-weak">EVALUATING</div>
                   </div>
                 </div>
               </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
