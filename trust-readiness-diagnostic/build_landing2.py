import os

out_dir = r'C:\Users\jacef\Documents\Agentic-Commerce-Zero-Capital-Launch-Kit\trust-readiness-diagnostic'

# ─── PRODUCT 2: Founder Trust Review (No $$ double dollar, No em-dashes, Clean) ───────────

html2 = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Founder Trust Review</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: { extend: { fontFamily: { sans: ['Inter','system-ui','sans-serif'] } } }
    }
  </script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    html{scroll-behavior:smooth}
    body{font-family:'Inter',system-ui,sans-serif;background:#0c0e18;color:#e2e8f0;overflow-x:hidden}
    body.light{background:#f8fafc!important;color:#0f111a!important}
    .hero-bg{background:linear-gradient(135deg,#0c0e18 0%,#12141f 30%,#0e1020 60%,#0c0e18 100%);position:relative;overflow:hidden}
    body.light .hero-bg{background:linear-gradient(135deg,#fefce8 0%,#fffbeb 50%,#fef3c7 100%)!important}
    .hero-bg::before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse 80% 50% at 20% 30%,rgba(245,158,11,.12) 0%,transparent 60%),radial-gradient(ellipse 60% 40% at 80% 70%,rgba(99,102,241,.08) 0%,transparent 60%);pointer-events:none}
    .grid-overlay{position:absolute;inset:0;background-image:linear-gradient(rgba(245,158,11,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(245,158,11,.04) 1px,transparent 1px);background-size:60px 60px;pointer-events:none}
    .particle{position:absolute;border-radius:50%;opacity:.35;animation:float 8s ease-in-out infinite}
    @keyframes float{0%,100%{transform:translateY(0) rotate(0)}33%{transform:translateY(-20px) rotate(5deg)}66%{transform:translateY(-10px) rotate(-3deg)}}
    @keyframes pulse-amber{0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,.5)}50%{box-shadow:0 0 0 14px rgba(245,158,11,0)}}
    .amber-badge{animation:pulse-amber 2.5s ease-in-out infinite}
    @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
    .btn-amber{background:linear-gradient(135deg,#f59e0b,#d97706,#f59e0b);background-size:200% auto;animation:shimmer 3s linear infinite;transition:transform .2s ease,box-shadow .2s ease;text-decoration:none;display:inline-block;cursor:pointer}
    .btn-amber:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(245,158,11,.4)}
    .btn-amber:active{transform:translateY(0)}
    .gold-card{background:rgba(20,18,10,.7);border:1px solid rgba(245,158,11,.25);backdrop-filter:blur(12px);transition:border-color .3s ease,transform .3s ease,box-shadow .3s ease}
    body.light .gold-card{background:rgba(255,255,255,.85)!important;border:1px solid rgba(245,158,11,.3)!important;color:#0f111a!important}
    .gold-card:hover{border-color:rgba(245,158,11,.6);transform:translateY(-4px);box-shadow:0 12px 40px rgba(245,158,11,.12)}
    .reveal{opacity:0;transform:translateY(30px);transition:opacity .6s ease,transform .6s ease}
    .reveal.visible{opacity:1;transform:translateY(0)}
    .gold-number{background:linear-gradient(135deg,#f59e0b,#fbbf24);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
    .faq-body{max-height:0;overflow:hidden;transition:max-height .35s ease}
    .faq-body.open{max-height:400px}
    .hr-gold{height:1px;background:linear-gradient(90deg,transparent,rgba(245,158,11,.5),rgba(99,102,241,.4),transparent)}
    .toggle-btn{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);transition:background .2s}
    body.light .toggle-btn{background:rgba(0,0,0,.06)!important;border:1px solid rgba(0,0,0,.12)!important}
    .nav-scrolled{background:rgba(12,14,24,.95)!important;backdrop-filter:blur(20px);border-bottom:1px solid rgba(245,158,11,.2)}
    body.light .nav-scrolled{background:rgba(248,250,252,.95)!important}
    .disclaimer{background:rgba(245,158,11,.05);border-left:3px solid rgba(245,158,11,.4)}
    .cover-img{width:100%;border-radius:16px;box-shadow:0 24px 80px rgba(0,0,0,.6),0 0 0 1px rgba(245,158,11,.2);transition:transform .4s ease}
    .cover-img:hover{transform:scale(1.02)}
    .step-num{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#d97706);color:#000;font-weight:900;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  </style>
</head>
<body class="dark" id="page-body">

<!-- NAV -->
<nav id="navbar" class="fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 py-4">
  <div class="max-w-6xl mx-auto flex items-center justify-between">
    <div class="flex items-center gap-2">
      <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background:linear-gradient(135deg,#f59e0b,#6366f1)">
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <span class="font-bold text-sm tracking-wide text-white" style="opacity:.9">Founder Trust Review</span>
    </div>
    <div class="flex items-center gap-4">
      <button id="mode-toggle" class="toggle-btn rounded-full px-3 py-1.5 text-xs font-medium text-gray-400">&#9728;&#65039; Light</button>
      <a data-gumroad-action="buy" class="btn-amber text-black text-sm font-bold px-5 py-2 rounded-full">Get Review (<span data-gumroad-field="price">149</span>)</a>
    </div>
  </div>
</nav>

<!-- HERO -->
<section class="hero-bg min-h-screen flex items-center pt-20 pb-24 px-6">
  <div class="grid-overlay"></div>
  <div class="particle" style="top:15%;left:10%;animation-delay:0s;width:8px;height:8px;background:#f59e0b"></div>
  <div class="particle" style="top:40%;left:5%;animation-delay:1.5s;width:4px;height:4px;background:#6366f1"></div>
  <div class="particle" style="top:70%;left:15%;animation-delay:3s;width:12px;height:12px;background:#fbbf24"></div>
  <div class="particle" style="top:20%;right:8%;animation-delay:0.8s;width:6px;height:6px;background:#818cf8"></div>
  <div class="particle" style="top:60%;right:12%;animation-delay:2.2s;width:8px;height:8px;background:#f59e0b"></div>

  <div class="max-w-6xl mx-auto relative z-10 w-full">
    <div class="grid lg:grid-cols-2 gap-16 items-center">
      <div>
        <div class="inline-flex items-center gap-2 amber-badge rounded-full px-4 py-1.5 mb-8" style="background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.4)">
          <span style="width:8px;height:8px;border-radius:50%;background:#f59e0b;display:inline-block"></span>
          <span class="text-amber-400 text-xs font-semibold tracking-widest" style="text-transform:uppercase">Expert Architecture Review</span>
        </div>

        <div class="mb-3">
          <span class="text-xs font-semibold tracking-widest" style="color:#6366f1;text-transform:uppercase">Founder Trust Review</span>
        </div>
        <h1 class="text-4xl lg:text-5xl xl:text-6xl font-black leading-none mb-6" style="color:#fff">
          Your Agentic AI,<br />
          <span class="gold-number">Ready to Withstand</span><br />
          Expert Scrutiny
        </h1>
        <p class="text-lg text-gray-400 mb-4 leading-relaxed" style="max-width:480px">
          Not just a score. A senior governance engineer reviews your actual control architecture, telling you exactly what will fail under payment processor, investor, or insurer due diligence.
        </p>
        <p class="text-base text-gray-300 mb-8 leading-relaxed" style="max-width:480px">
          The <strong style="color:#e2e8f0">Founder Trust Review</strong> is a hands-on 48-hour architecture review going beyond the automated diagnostic. You get written findings, a custom remediation roadmap, and DDQ preparation tailored to your specific counterparty targets.
        </p>

        <!-- What is included -->
        <div class="gold-card rounded-2xl p-5 mb-8" style="max-width:480px">
          <div class="text-amber-400 text-xs font-semibold tracking-widest mb-3" style="text-transform:uppercase">Includes Everything In The $19 Report, Plus:</div>
          <ul class="space-y-2">
            <li class="flex items-start gap-2 text-sm text-gray-300"><span style="color:#f59e0b">+</span>Written Architecture Review Notes from a senior governance engineer</li>
            <li class="flex items-start gap-2 text-sm text-gray-300"><span style="color:#f59e0b">+</span>Customized Remediation Roadmap for your specific stack</li>
            <li class="flex items-start gap-2 text-sm text-gray-300"><span style="color:#f59e0b">+</span>Counterparty-specific DDQ Guidance for your target gates</li>
            <li class="flex items-start gap-2 text-sm text-gray-300"><span style="color:#f59e0b">+</span>48-hour priority delivery</li>
          </ul>
        </div>

        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <a data-gumroad-action="buy" class="btn-amber text-black font-bold px-8 py-4 rounded-xl text-lg">Get Your Review ($149)</a>
          <div class="text-sm text-gray-500">&#10003; 48hr delivery &nbsp;&middot;&nbsp; &#10003; Early-access pricing</div>
        </div>
        <p class="text-xs text-gray-600 mt-6" style="max-width:400px">Pre-diligence diagnostic aid. Not legal, regulatory, insurance, or investment advice. External acceptance is not guaranteed.</p>
      </div>

      <div class="hidden lg:block">
        <img src="https://public-files.gumroad.com/yx5114zvpfhgcxz0vl218q768amw" alt="Founder Trust Review cover" class="cover-img" loading="lazy" />
        <div class="mt-4 flex items-center justify-between px-2">
          <div class="flex items-center gap-2">
            <span style="color:#f59e0b">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
            <span class="text-gray-400 text-sm" data-gumroad-field="review-count">Be the first to review</span>
          </div>
          <span class="text-xs text-gray-600">Expert Review &middot; $149</span>
        </div>
      </div>
    </div>
  </div>
</section>

<div class="hr-gold"></div>

<!-- STATS -->
<section class="py-12 px-6" style="background:rgba(20,18,10,.5)">
  <div class="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
    <div class="reveal"><div class="gold-number text-4xl font-black mb-1">10</div><div class="text-gray-400 text-sm">Dimensions Reviewed</div></div>
    <div class="reveal"><div class="gold-number text-4xl font-black mb-1">5</div><div class="text-gray-400 text-sm">Counterparty Profiles</div></div>
    <div class="reveal"><div class="gold-number text-4xl font-black mb-1">48h</div><div class="text-gray-400 text-sm">Delivery Window</div></div>
    <div class="reveal"><div class="gold-number text-4xl font-black mb-1">$149</div><div class="text-gray-400 text-sm">Early Access Price</div></div>
  </div>
</section>

<div class="hr-gold"></div>

<!-- HOW IT WORKS -->
<section class="py-24 px-6">
  <div class="max-w-4xl mx-auto">
    <div class="text-center mb-16 reveal">
      <span class="text-amber-400 text-xs font-semibold tracking-widest mb-4 block" style="text-transform:uppercase">Process</span>
      <h2 class="text-3xl lg:text-4xl font-black text-white mb-4">How the Review Works</h2>
      <p class="text-gray-400 max-w-xl mx-auto">A 3-step process from purchase to delivery of your complete review package.</p>
    </div>
    <div class="space-y-6">
      <div class="gold-card rounded-2xl p-6 flex items-start gap-5 reveal">
        <div class="step-num">1</div>
        <div>
          <h3 class="font-bold text-white mb-1">Purchase &amp; Submit Your Workflow Details</h3>
          <p class="text-gray-400 text-sm leading-relaxed">After checkout, reply to your Gumroad receipt with your workflow title, risk level, agent authorization scope, and a brief description of what the agent is permitted to do. If you have a Report ID from the online diagnostic, include it to automatically link your full diagnostic payload.</p>
        </div>
      </div>
      <div class="gold-card rounded-2xl p-6 flex items-start gap-5 reveal">
        <div class="step-num">2</div>
        <div>
          <h3 class="font-bold text-white mb-1">Manual Review by Our Governance Team</h3>
          <p class="text-gray-400 text-sm leading-relaxed">Our governance engineering team evaluates your control architecture across all 10 diagnostic dimensions. We look for specific failure patterns that payment processors, investors, insurers, and enterprise clients have flagged in real due diligence scenarios.</p>
        </div>
      </div>
      <div class="gold-card rounded-2xl p-6 flex items-start gap-5 reveal">
        <div class="step-num">3</div>
        <div>
          <h3 class="font-bold text-white mb-1">48-Hour Delivery of Your Full Review Package</h3>
          <p class="text-gray-400 text-sm leading-relaxed">Within 48 business hours you receive your complete package by email: Full Agent Trust Readiness Report, Written Architecture Review Notes, Customized Remediation Roadmap, and Counterparty DDQ Guidance tailored to your specific target gates.</p>
        </div>
      </div>
    </div>
  </div>
</section>

<div class="hr-gold"></div>

<!-- WHAT YOU GET -->
<section class="py-24 px-6" style="background:rgba(12,14,24,.8)">
  <div class="max-w-6xl mx-auto">
    <div class="text-center mb-16 reveal">
      <span class="text-amber-400 text-xs font-semibold tracking-widest mb-4 block" style="text-transform:uppercase">Deliverables</span>
      <h2 class="text-3xl lg:text-4xl font-black text-white mb-4">Complete Review Package</h2>
      <p class="text-gray-400 max-w-xl mx-auto">Everything you need to walk into any counterparty conversation with confidence.</p>
    </div>
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div class="gold-card rounded-2xl p-6 reveal">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style="background:rgba(245,158,11,.2)">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <h3 class="font-bold text-white mb-2">Full 10-Dimension Report</h3>
        <p class="text-gray-400 text-sm leading-relaxed">Complete Agent Trust Readiness Report covering all 10 control dimensions with capability and assurance scores.</p>
      </div>
      <div class="gold-card rounded-2xl p-6 reveal">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style="background:rgba(99,102,241,.2)">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <h3 class="font-bold text-white mb-2">Written Architecture Review</h3>
        <p class="text-gray-400 text-sm leading-relaxed">Senior governance engineer findings on your specific control architecture: a real, detailed assessment of your setup.</p>
      </div>
      <div class="gold-card rounded-2xl p-6 reveal">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style="background:rgba(245,158,11,.2)">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <h3 class="font-bold text-white mb-2">Custom Remediation Roadmap</h3>
        <p class="text-gray-400 text-sm leading-relaxed">Remediation priorities built around your specific technology stack, risk level, and target counterparties.</p>
      </div>
      <div class="gold-card rounded-2xl p-6 reveal">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style="background:rgba(99,102,241,.2)">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <h3 class="font-bold text-white mb-2">Evidence Checklist Mapping</h3>
        <p class="text-gray-400 text-sm leading-relaxed">Exactly which documents, logs, and artifacts you need to produce for each dimension: Red Flags and Acceptable Evidence per gate.</p>
      </div>
      <div class="gold-card rounded-2xl p-6 reveal">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style="background:rgba(245,158,11,.2)">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <h3 class="font-bold text-white mb-2">Counterparty DDQ Guidance</h3>
        <p class="text-gray-400 text-sm leading-relaxed">The exact due-diligence questions your target counterparties will ask, complete with prepared rationale specific to your architecture.</p>
      </div>
      <div class="gold-card rounded-2xl p-6 reveal">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style="background:rgba(99,102,241,.2)">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <h3 class="font-bold text-white mb-2">48-Hour Priority Delivery</h3>
        <p class="text-gray-400 text-sm leading-relaxed">All deliverables emailed to your purchase address within 48 business hours, fast enough to prepare before your next diligence meeting.</p>
      </div>
    </div>
  </div>
</section>

<div class="hr-gold"></div>

<!-- WHO IT IS FOR -->
<section class="py-24 px-6">
  <div class="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-start">
    <div class="reveal">
      <span class="text-amber-400 text-xs font-semibold tracking-widest mb-4 block" style="text-transform:uppercase">Best For</span>
      <h2 class="text-2xl font-black text-white mb-8">Who Gets the Most Value</h2>
      <ul class="space-y-4">
        <li class="flex items-start gap-3"><span style="color:#f59e0b;margin-top:2px">&#10003;</span><span class="text-gray-300 text-sm">Founders preparing for seed or Series A technical due diligence</span></li>
        <li class="flex items-start gap-3"><span style="color:#f59e0b;margin-top:2px">&#10003;</span><span class="text-gray-300 text-sm">Agentic SaaS builders launching customer-facing autonomous workflows</span></li>
        <li class="flex items-start gap-3"><span style="color:#f59e0b;margin-top:2px">&#10003;</span><span class="text-gray-300 text-sm">Fintech operators deploying payment or financial data agents</span></li>
        <li class="flex items-start gap-3"><span style="color:#f59e0b;margin-top:2px">&#10003;</span><span class="text-gray-300 text-sm">AI development agencies seeking to validate client workflow governance</span></li>
        <li class="flex items-start gap-3"><span style="color:#f59e0b;margin-top:2px">&#10003;</span><span class="text-gray-300 text-sm">Teams preparing for enterprise CISO vendor procurement reviews</span></li>
        <li class="flex items-start gap-3"><span style="color:#f59e0b;margin-top:2px">&#10003;</span><span class="text-gray-300 text-sm">Anyone who received a Conditional verdict on the $19 Report and needs a path forward</span></li>
      </ul>
    </div>
    <div class="reveal">
      <span class="text-red-400 text-xs font-semibold tracking-widest mb-4 block" style="text-transform:uppercase">Not For</span>
      <h2 class="text-2xl font-black text-white mb-8">Not a Fit If You Need</h2>
      <ul class="space-y-4">
        <li class="flex items-start gap-3"><span style="color:#ef4444;margin-top:2px">&#10007;</span><span class="text-gray-400 text-sm">Official legal or regulatory certification</span></li>
        <li class="flex items-start gap-3"><span style="color:#ef4444;margin-top:2px">&#10007;</span><span class="text-gray-400 text-sm">A promise that payment processors or investors will approve your workflow</span></li>
        <li class="flex items-start gap-3"><span style="color:#ef4444;margin-top:2px">&#10007;</span><span class="text-gray-400 text-sm">Penetration testing or formal security auditing</span></li>
        <li class="flex items-start gap-3"><span style="color:#ef4444;margin-top:2px">&#10007;</span><span class="text-gray-400 text-sm">Teams unwilling to share basic workflow architecture details</span></li>
      </ul>
    </div>
  </div>
</section>

<div class="hr-gold"></div>

<!-- FAQ -->
<section class="py-24 px-6" style="background:rgba(12,14,24,.6)">
  <div class="max-w-3xl mx-auto">
    <div class="text-center mb-16 reveal">
      <span class="text-amber-400 text-xs font-semibold tracking-widest mb-4 block" style="text-transform:uppercase">FAQ</span>
      <h2 class="text-3xl font-black text-white">Common Questions</h2>
    </div>
    <div class="space-y-3">
      <div class="gold-card rounded-xl overflow-hidden reveal">
        <button class="faq-btn w-full text-left px-6 py-4 flex items-center justify-between" aria-expanded="false"><span class="font-semibold text-white text-sm">How is this different from the $19 report?</span><span class="faq-icon text-amber-400 text-lg">+</span></button>
        <div class="faq-body px-6 pb-4"><p class="text-gray-400 text-sm leading-relaxed">The $19 report is automated and fast, making it great for self-assessment. The Founder Trust Review adds a senior governance engineer who reads your architecture, writes specific findings, and tailors remediation to your stack and counterparty targets.</p></div>
      </div>
      <div class="gold-card rounded-xl overflow-hidden reveal">
        <button class="faq-btn w-full text-left px-6 py-4 flex items-center justify-between" aria-expanded="false"><span class="font-semibold text-white text-sm">Do I need the $19 report first?</span><span class="faq-icon text-amber-400 text-lg">+</span></button>
        <div class="faq-body px-6 pb-4"><p class="text-gray-400 text-sm leading-relaxed">No. You can purchase the Founder Trust Review directly. If you have a Report ID from the online diagnostic, include it to help us work faster. If not, just describe your workflow and we run the full assessment from scratch.</p></div>
      </div>
      <div class="gold-card rounded-xl overflow-hidden reveal">
        <button class="faq-btn w-full text-left px-6 py-4 flex items-center justify-between" aria-expanded="false"><span class="font-semibold text-white text-sm">What information do I need to provide?</span><span class="faq-icon text-amber-400 text-lg">+</span></button>
        <div class="faq-body px-6 pb-4"><p class="text-gray-400 text-sm leading-relaxed">Your workflow title, risk level, a description of what the agent is authorized to do, your high-level technology stack, and which counterparties you are targeting: payment processors, investors, insurers, enterprise clients, or regulators.</p></div>
      </div>
      <div class="gold-card rounded-xl overflow-hidden reveal">
        <button class="faq-btn w-full text-left px-6 py-4 flex items-center justify-between" aria-expanded="false"><span class="font-semibold text-white text-sm">Is this a guarantee of counterparty approval?</span><span class="faq-icon text-amber-400 text-lg">+</span></button>
        <div class="faq-body px-6 pb-4"><p class="text-gray-400 text-sm leading-relaxed">No. This is a pre-diligence preparation service. Counterparties conduct their own independent audits. This review improves your readiness and helps you identify and close gaps before those audits occur.</p></div>
      </div>
      <div class="gold-card rounded-xl overflow-hidden reveal">
        <button class="faq-btn w-full text-left px-6 py-4 flex items-center justify-between" aria-expanded="false"><span class="font-semibold text-white text-sm">What does "48 business hours" mean exactly?</span><span class="faq-icon text-amber-400 text-lg">+</span></button>
        <div class="faq-body px-6 pb-4"><p class="text-gray-400 text-sm leading-relaxed">48 business hours from receipt of your workflow details (not from time of purchase). If you purchase on Friday and submit details Monday morning, delivery is by Wednesday COB. We will email you to confirm receipt and give you an estimated delivery window.</p></div>
      </div>
    </div>
  </div>
</section>

<div class="hr-gold"></div>

<!-- FINAL CTA -->
<section class="py-32 px-6 hero-bg relative">
  <div class="grid-overlay" style="opacity:.5"></div>
  <div class="max-w-3xl mx-auto text-center relative z-10 reveal">
    <div class="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8" style="background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.4)">
      <span style="width:8px;height:8px;border-radius:50%;background:#f59e0b;display:inline-block"></span>
      <span class="text-amber-400 text-xs font-semibold tracking-widest" style="text-transform:uppercase">Early Access (Limited Slots)</span>
    </div>
    <h2 class="text-4xl lg:text-5xl font-black text-white mb-6">Get Expert Eyes<br /><span class="gold-number">On Your Architecture</span></h2>
    <p class="text-gray-400 text-lg mb-10 max-w-xl mx-auto">Before a payment processor, investor, or insurer gets to scrutinize your agentic workflow, let a governance engineer find and fix the gaps first.</p>
    <a data-gumroad-action="buy" class="btn-amber text-black font-black px-12 py-5 rounded-2xl text-xl mb-4">Get the Founder Trust Review ($149)</a>
    <div class="text-sm text-gray-500 mt-4">&#10003; 48-hour delivery &nbsp; &#10003; Written findings &nbsp; &#10003; Custom roadmap</div>

    <div class="mt-8 p-4 rounded-xl text-center" style="background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.2)">
      <p class="text-sm text-gray-400">Want to start with self-assessment first?</p>
      <a href="hillarynjuguna.gumroad.com/l/agent-trust-readiness-report" class="text-indigo-400 text-sm font-semibold" style="text-decoration:none">Get the $19 Agent Trust Readiness Report &#8594;</a>
    </div>

    <div class="disclaimer mt-10 rounded-xl p-4 text-left">
      <p class="text-xs text-gray-500 leading-relaxed"><strong class="text-amber-500">Important Disclaimer:</strong> This is a pre-diligence preparation service. It does not constitute formal legal, regulatory, cyber insurance, payment processor, or investment advice. External counterparty acceptance is subject to independent audit and is not guaranteed.</p>
    </div>
  </div>
</section>

<!-- FOOTER -->
<footer class="px-6 py-10 border-t" style="border-color:rgba(245,158,11,.15)">
  <div class="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
    <div class="flex items-center gap-2">
      <div class="w-6 h-6 rounded flex items-center justify-center" style="background:linear-gradient(135deg,#f59e0b,#6366f1)">
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <span class="text-gray-400 text-sm">Founder Trust Review</span>
    </div>
    <div class="text-gray-600 text-xs text-center">Pre-diligence preparation service. Not legal, regulatory, or investment advice.</div>
    <a href="hillarynjuguna.gumroad.com" class="text-gray-500 text-sm">More products &#8594;</a>
  </div>
</footer>

<script>
  var body=document.getElementById('page-body'),btn=document.getElementById('mode-toggle');
  btn.addEventListener('click',function(){
    if(body.classList.contains('dark')){
      body.classList.replace('dark','light');
      btn.innerHTML='&#127769; Dark';
    } else {
      body.classList.replace('light','dark');
      btn.innerHTML='&#9728;&#65039; Light';
    }
  });
  var nav=document.getElementById('navbar');
  window.addEventListener('scroll',function(){nav.classList.toggle('nav-scrolled',window.scrollY>60);},{passive:true});
  var obs=new IntersectionObserver(function(e){e.forEach(function(x){if(x.isIntersecting){x.target.classList.add('visible');obs.unobserve(x.target);}});},{threshold:0.12});
  document.querySelectorAll('.reveal').forEach(function(el){obs.observe(el);});
  document.querySelectorAll('.faq-btn').forEach(function(b){b.addEventListener('click',function(){
    var bd=b.nextElementSibling,icon=b.querySelector('.faq-icon'),open=bd.classList.contains('open');
    document.querySelectorAll('.faq-body').forEach(function(x){x.classList.remove('open');});
    document.querySelectorAll('.faq-icon').forEach(function(x){x.style.transform='';});
    document.querySelectorAll('.faq-btn').forEach(function(x){x.setAttribute('aria-expanded','false');});
    if(!open){bd.classList.add('open');icon.style.transform='rotate(45deg)';b.setAttribute('aria-expanded','true');}
  });});
</script>
</body>
</html>"""

out2 = os.path.join(out_dir, 'landing2.html')
with open(out2, 'w', encoding='ascii', errors='xmlcharrefreplace') as f:
    f.write(html2)
print(f'landing2.html written: {os.path.getsize(out2)} bytes')
