#!/usr/bin/env python3
"""
daVIRA Pitch Deck Generator — Institutional Light Theme (17 Slides)
- Architectural Light Institutional Aesthetic (#F8FAFC canvas, #FFFFFF cards, #0F172A typography)
- Incorporates all deep, rich, impactful content from the original high-impact pitch
- Focuses on smart money tracking across all trader tiers (Retail, Quants, Prop Desks, Risk Teams)
- Cross-asset whole-market view (Crypto + US Equities NVDA/TSLA + Commodities Gold/Oil on DEXs)
- Strategic 3-Phase Master Roadmap: Signal -> Prop Trading -> Wintermute of India (Infra removed)
- Live active pricing: $10/month for individual traders
- Completely removed any reference to "DIC"
- Direct PowerPoint (PPTX) & PDF export via PowerPoint COM automation
"""

import os
import sys
import pptx
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

os.makedirs("outputs", exist_ok=True)
os.makedirs("public", exist_ok=True)

# -------------------------------------------------------------
# Premium Light Theme Palette
# -------------------------------------------------------------
BG_COLOR      = RGBColor(248, 250, 252)  # #F8FAFC - Architectural Off-White Canvas
CARD_BG       = RGBColor(255, 255, 255)  # #FFFFFF - Pure White Elevated Card
CARD_BORDER   = RGBColor(226, 232, 240)  # #E2E8F0 - Subtle Structural Border
TEXT_PRIMARY  = RGBColor(15, 23, 42)     # #0F172A - Deep Charcoal / Obsidian Text
TEXT_MUTED    = RGBColor(71, 85, 105)    # #475569 - Slate Body Text
TEXT_DIM      = RGBColor(148, 163, 184)  # #94A3B8 - Subdued Meta Text
ACCENT_GREEN  = RGBColor(5, 150, 105)    # #059669 - Institutional Alpha Emerald
ACCENT_BLUE   = RGBColor(2, 132, 199)    # #0284C7 - Cerulean Blue
ACCENT_AMBER  = RGBColor(217, 119, 6)    # #D97706 - Warning / Radar Amber
ACCENT_PURPLE = RGBColor(124, 58, 237)   # #7C3AED - Royal Purple Accent

FONT_NAME = "Arial"
FONT_CODE = "Consolas"

def px_to_in(px):
    return Inches(px / 96.0)

def px_to_pt(size_px):
    return Pt(size_px * 0.75)

def add_card(slide, x, y, w, h, border_color=CARD_BORDER, bg_color=CARD_BG):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, px_to_in(x), px_to_in(y), px_to_in(w), px_to_in(h))
    shape.fill.solid()
    shape.fill.fore_color.rgb = bg_color
    shape.line.color.rgb = border_color
    shape.line.width = Pt(1)
    return shape

def add_text(slide, text_str, x, y, w, h, size=24, color=TEXT_PRIMARY, bold=False, align=PP_ALIGN.LEFT, font=FONT_NAME):
    tb = slide.shapes.add_textbox(px_to_in(x), px_to_in(y), px_to_in(w), px_to_in(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.text = text_str
    p.alignment = align
    p.font.name = font
    p.font.size = px_to_pt(size)
    p.font.bold = bold
    p.font.color.rgb = color
    return tb

def add_header(slide, tag_text, title_text, slide_num, total_slides=17):
    # Brand mark top-left
    add_text(slide, "daVIRA", 64, 30, 160, 28, size=22, color=ACCENT_GREEN, bold=True)
    # Slide index top-right
    add_text(slide, f"{slide_num:02d} / {total_slides:02d}", 1140, 32, 75, 24, size=16, color=TEXT_DIM, align=PP_ALIGN.RIGHT)
    # Tag / Category
    add_text(slide, tag_text.upper(), 64, 76, 1145, 24, size=14, color=ACCENT_BLUE, bold=True)
    # Slide Title
    add_text(slide, title_text, 64, 104, 1145, 48, size=30, color=TEXT_PRIMARY, bold=True)
    # Subtle Divider
    div = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, px_to_in(64), px_to_in(156), px_to_in(1150), px_to_in(1))
    div.fill.solid()
    div.fill.fore_color.rgb = CARD_BORDER
    div.line.fill.background()
    # Footer
    add_text(slide, "daVIRA Intelligence  ·  Institutional Investment Presentation  ·  Confidential", 64, 680, 1145, 20, size=13, color=TEXT_DIM)

def create_deck():
    prs = Presentation()
    prs.slide_width = Inches(13.333333)
    prs.slide_height = Inches(7.5)
    total_slides = 17

    def new_slide():
        slide = prs.slides.add_slide(prs.slide_layouts[6])
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333333), Inches(7.5))
        bg.fill.solid()
        bg.fill.fore_color.rgb = BG_COLOR
        bg.line.fill.background()
        return slide

    # =========================================================================
    # SLIDE 1: COVER
    # =========================================================================
    s = new_slide()
    add_card(s, 64, 60, 1150, 580, border_color=CARD_BORDER, bg_color=CARD_BG)
    
    # Pill Tag
    add_text(s, "INSTITUTIONAL ON-CHAIN ALPHA & ALGORITHMIC TRADING", 100, 100, 800, 24, size=14, color=ACCENT_BLUE, bold=True)
    
    # Hero Title
    add_text(s, "daVIRA Intelligence", 100, 134, 1000, 72, size=54, color=TEXT_PRIMARY, bold=True)
    add_text(s, "Building the Premier Quantitative Powerhouse from India to the Globe", 100, 214, 1000, 36, size=22, color=TEXT_MUTED)

    # 4 Highlight Cards in Hero
    sub_cards = [
        ("Multi-Chain Smart Money", "Real-time 4-way flow decomposition & sub-minute wallet radar on Hyperliquid & cross-chain DEXs.", ACCENT_BLUE),
        ("Cross-Asset Whole Market", "Unified real-time tracking of crypto, US equities (NVDA, TSLA), and commodities (Gold, Oil).", ACCENT_AMBER),
        ("LLM Intelligence Copilot", "Natural language portfolio audits and market discovery: 'Everything just a prompt away'.", ACCENT_PURPLE),
        ("Live Product & Monetization", "Operational V1 terminal indexing 2,000+ top wallets. Live individual subscription: $10/month.", ACCENT_GREEN)
    ]
    for i, (title, desc, accent) in enumerate(sub_cards):
        cx = 100 + i * 268
        add_card(s, cx, 280, 252, 210, border_color=CARD_BORDER)
        add_card(s, cx, 280, 252, 4, border_color=accent, bg_color=accent)
        add_text(s, title, cx + 16, 298, 220, 44, size=16, color=TEXT_PRIMARY, bold=True)
        add_text(s, desc, cx + 16, 348, 220, 126, size=13, color=TEXT_MUTED)

    # Founder Info Box bottom
    add_card(s, 100, 510, 1078, 90, border_color=CARD_BORDER, bg_color=RGBColor(248, 250, 252))
    add_text(s, "FOUNDER: VIVEK GAUTAM  |  Ex-GoQuant  ·  QuantInsti Alumnus  ·  Quantitative Analyst at Leading Crypto Firm", 124, 526, 1030, 24, size=14, color=TEXT_PRIMARY, bold=True)
    add_text(s, "Active Commercial Tier: $10 / Month Individual Plan  ·  Target: Strategic Seed Venture Partners & Institutional Investors", 124, 554, 1030, 24, size=13, color=TEXT_MUTED)

    # =========================================================================
    # SLIDE 2: EXECUTIVE SUMMARY
    # =========================================================================
    s = new_slide()
    add_header(s, "01 / Executive Overview", "Executive Summary: Transparent On-Chain Alpha to Market Making", 2, total_slides)

    exec_cards = [
        ("The Market Shift", "DeFi Liquidity Migration", [
            "Perpetual trading volume is migrating permanently on-chain ($2B–$5B/day on Hyperliquid alone).",
            "Tokenized US equities (NVDA, TSLA) and commodities (Gold, Oil) now trade on DEXs.",
            "Institutions lack transparent, low-latency intelligence on who is driving market moves.",
            "Legacy analytics tools offer noisy vanity scores, mistaking short covers for genuine spot demand."
        ], ACCENT_BLUE),
        ("Current Traction", "Live Working V1 Terminal", [
            "daVIRA V1 is fully operational: indexing 2,000+ top wallets with zero floating-point drift.",
            "Proprietary 4-way flow decomposition isolates new leverage from position exits & short covers.",
            "Live pricing actively deployed: $10/month for individual traders and retail quants.",
            "Built-in execution drag stress testing (0, 5, 10, 25 bps) ensures copy-trading viability."
        ], ACCENT_GREEN),
        ("The 3-Phase Plan", "Evolution to Market Maker", [
            "Phase 1: Multi-Chain Smart Money & Macro Terminal + LLM ('Everything a prompt away').",
            "Phase 2: daVIRA Capital (Proprietary Trading Desk) deploying firm capital on flow alpha.",
            "Phase 3: Algorithmic Market Maker ('The Wintermute of India') quoting CEX/DEX liquidity.",
            "Methodical progression: Software revenue funds prop desk, compounding into high-volume MM."
        ], ACCENT_PURPLE)
    ]

    for i, (ctitle, csub, points, color) in enumerate(exec_cards):
        cx = 64 + i * 395
        add_card(s, cx, 175, 375, 480, border_color=CARD_BORDER)
        add_card(s, cx, 175, 375, 5, border_color=color, bg_color=color)
        add_text(s, ctitle, cx + 22, 195, 330, 28, size=18, color=TEXT_PRIMARY, bold=True)
        add_text(s, csub, cx + 22, 225, 330, 22, size=13, color=color, bold=True)
        
        tb = s.shapes.add_textbox(px_to_in(cx + 22), px_to_in(260), px_to_in(330), px_to_in(375))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        for p_idx, pt in enumerate(points):
            p = tf.paragraphs[0] if p_idx == 0 else tf.add_paragraph()
            p.text = f"•  {pt}"
            p.font.name = FONT_NAME
            p.font.size = px_to_pt(13)
            p.font.color.rgb = TEXT_MUTED
            p.space_after = Pt(12)

    # =========================================================================
    # SLIDE 3: THE PARADIGM SHIFT
    # =========================================================================
    s = new_slide()
    add_header(s, "02 / Market Paradigm", "The Paradigm Shift: Crypto Liquidity is Moving On-Chain", 3, total_slides)

    stats = [
        ("$4.2T+", "Annualized On-Chain Perp Volume", ACCENT_BLUE),
        ("2,000+", "Leaderboard Wallets Controlling 78% Alpha", ACCENT_GREEN),
        ("80%+", "Volume Handled by Algo Traders & Prop Desks", ACCENT_AMBER),
        ("0", "Tier-1 Global Crypto Market Makers in India", ACCENT_PURPLE)
    ]
    for i, (val, lbl, col) in enumerate(stats):
        bx = 64 + i * 295
        add_card(s, bx, 175, 275, 110, border_color=CARD_BORDER)
        add_card(s, bx, 175, 275, 4, border_color=col, bg_color=col)
        add_text(s, val, bx + 18, 190, 240, 42, size=28, color=col, bold=True)
        add_text(s, lbl, bx + 18, 236, 240, 36, size=12, color=TEXT_MUTED)

    # Narrative split: Left (CEX Exodus) & Right (India Opportunity)
    narratives = [
        ("The Centralized Exchange Exodus", "Opaque Orderbooks → Verifiable On-Chain Flows", [
            "Post-FTX, global institutional trading volume is migrating permanently to on-chain perpetual DEXs like Hyperliquid, dYdX, and Solana perps.",
            "On-chain execution provides complete cryptographic auditability: every single trade, liquidation, position increase, and wallet margin balance is publicly verifiable in real time.",
            "Synthetic asset innovation (HIP-1) has brought tokenized US equities (NVDA, TSLA) and commodities (Gold, Crude Oil) on-chain, unlocking 24/7 cross-asset macro trading."
        ], 64, ACCENT_BLUE),
        ("The India Opportunity", "World-Class Quant Talent Without Institutional Infrastructure", [
            "India trains thousands of elite quantitative engineers, mathematical researchers, and algorithmic developers from IITs/NITs every year.",
            "Despite this intellectual dominance, India lacks a premier, globally recognized crypto trading institution or tier-1 quantitative market maker like Wintermute or Jump.",
            "daVIRA is uniquely positioned to capture this generational market opportunity: founded and engineered in India, built for institutional traders and funds globally."
        ], 654, ACCENT_GREEN)
    ]

    for title, sub, bullets, nx, col in narratives:
        add_card(s, nx, 310, 560, 345, border_color=CARD_BORDER)
        add_card(s, nx, 310, 560, 4, border_color=col, bg_color=col)
        add_text(s, title, nx + 24, 330, 510, 28, size=18, color=TEXT_PRIMARY, bold=True)
        add_text(s, sub, nx + 24, 360, 510, 22, size=13, color=col, bold=True)
        
        tb = s.shapes.add_textbox(px_to_in(nx + 24), px_to_in(395), px_to_in(510), px_to_in(245))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        for b_idx, b in enumerate(bullets):
            p = tf.paragraphs[0] if b_idx == 0 else tf.add_paragraph()
            p.text = f"•  {b}"
            p.font.name = FONT_NAME
            p.font.size = px_to_pt(13)
            p.font.color.rgb = TEXT_MUTED
            p.space_after = Pt(12)

    # =========================================================================
    # SLIDE 4: THE PROBLEM
    # =========================================================================
    s = new_slide()
    add_header(s, "03 / Market Gaps", "The Institutional Blindspot in Crypto Alpha & Execution", 4, total_slides)

    problems = [
        ("The Retail Liquidity Trap", "Exit Pumps vs Real Buying", [
            "Retail traders see green candles and buy into distribution phases.",
            "Short-covering squeezes are routinely mistaken for organic institutional spot demand.",
            "Traders lack directional attribution: whether open interest expansion represents fresh long leverage or short covering.",
            "Result: 90%+ of retail traders consistently act as exit liquidity for whales."
        ], ACCENT_AMBER),
        ("Quant Paper Alpha Failure", "The Hidden Drag of Execution", [
            "Wallet leaderboards show hundreds of 'paper-profitable' wallets that look miraculous.",
            "In live execution, copycat strategies collapse due to adverse taker fees, exchange funding rate drag, and slippage.",
            "High-frequency toxic scalpers cannot be replicated by human or institutional swing traders.",
            "Result: Truncated capital and catastrophic drawdown when attempting to mirror top wallets."
        ], ACCENT_BLUE),
        ("Prop Firm Latency & Spoofing", "Stale SQL & Sybil Whales", [
            "Proprietary trading desks waste hours writing bespoke Dune SQL queries that produce stale signals 15 minutes late.",
            "Single whale entities split orders across 10+ sub-wallets to manufacture artificial consensus on leaderboards.",
            "Existing tools provide zero wallet continuity tracking when top traders cycle addresses.",
            "Result: Prop desks operate with lagging data and blind spots against spoofed consensus."
        ], ACCENT_PURPLE)
    ]

    for i, (title, sub, bullets, col) in enumerate(problems):
        px = 64 + i * 395
        add_card(s, px, 175, 375, 480, border_color=CARD_BORDER)
        add_card(s, px, 175, 375, 4, border_color=col, bg_color=col)
        add_text(s, title, px + 22, 195, 330, 28, size=18, color=TEXT_PRIMARY, bold=True)
        add_text(s, sub, px + 22, 225, 330, 22, size=13, color=col, bold=True)
        
        tb = s.shapes.add_textbox(px_to_in(px + 22), px_to_in(260), px_to_in(330), px_to_in(375))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        for b_idx, b in enumerate(bullets):
            p = tf.paragraphs[0] if b_idx == 0 else tf.add_paragraph()
            p.text = f"•  {b}"
            p.font.name = FONT_NAME
            p.font.size = px_to_pt(13)
            p.font.color.rgb = TEXT_MUTED
            p.space_after = Pt(12)

    # =========================================================================
    # SLIDE 5: THE SOLUTION - daVIRA TERMINAL
    # =========================================================================
    s = new_slide()
    add_header(s, "04 / The Solution", "daVIRA Intelligence: Mathematical Rigor & Execution Reality", 5, total_slides)

    solutions = [
        ("4-Way Flow Decomposition", "Isolating Aggressive Leverage", [
            "Deconstructs every on-chain fill into 4 distinct directional vectors: New Longs, Short Covers, New Shorts, and Long Exits.",
            "Instantly exposes whether rising Open Interest is driven by genuine institutional leverage or forced short liquidations.",
            "Eliminates the #1 source of retail losses: buying into exhausted short squeezes."
        ], ACCENT_GREEN),
        ("Execution Drag Stress Testing", "Realism Before Capital Risk", [
            "Simulates live copy-trading performance across tiered taker fee and slippage hurdles: 0, 5, 10, and 25 bps.",
            "Automatically calculates median trade holding duration to filter out toxic HFT scalpers from actionable swing alpha.",
            "Guarantees that surfaced alpha can actually be captured with real capital in live order books."
        ], ACCENT_BLUE),
        ("Cohort Consensus & Anti-Spoofing", "Institutional Whale Radar", [
            "Applies 'one-wallet-one-vote' consensus metrics across top 2,000 wallets to detect true multi-desk directional agreement.",
            "Largest-contributor sensitivity analysis isolates single-whale concentration and synthetic sybil volume.",
            "Sub-minute position change alerts surface accumulation patterns before market breakouts occur."
        ], ACCENT_AMBER),
        ("Pre-Move Volatility Radar", "Front-Running Information Asymmetry", [
            "Detects anomalous wallet positioning 15 to 60 minutes ahead of scheduled macro releases and market-moving events.",
            "Tracks smart money rebalancing into defensive cash or aggressive perp leverage in real time.",
            "Provides institutional and retail traders with an asymmetric informational advantage."
        ], ACCENT_PURPLE)
    ]

    for i, (title, sub, bullets, col) in enumerate(solutions):
        sx = 64 + (i % 2) * 590
        sy = 175 + (i // 2) * 245
        add_card(s, sx, sy, 560, 230, border_color=CARD_BORDER)
        add_card(s, sx, sy, 560, 4, border_color=col, bg_color=col)
        add_text(s, title, sx + 22, sy + 18, 510, 26, size=17, color=TEXT_PRIMARY, bold=True)
        add_text(s, sub, sx + 22, sy + 46, 510, 20, size=13, color=col, bold=True)
        
        tb = s.shapes.add_textbox(px_to_in(sx + 22), px_to_in(sy + 74), px_to_in(510), px_to_in(145))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        for b_idx, b in enumerate(bullets):
            p = tf.paragraphs[0] if b_idx == 0 else tf.add_paragraph()
            p.text = f"✔  {b}"
            p.font.name = FONT_NAME
            p.font.size = px_to_pt(12.5)
            p.font.color.rgb = TEXT_MUTED
            p.space_after = Pt(6)

    # =========================================================================
    # SLIDE 6: SMART MONEY TRACKING FOR EVERY TIER
    # =========================================================================
    s = new_slide()
    add_header(s, "05 / User Impact", "Smart-Money Tracking Empowering Every Tier of Trader", 6, total_slides)

    tiers = [
        ("Normal & Retail Crypto Traders", "Never Be Exit Liquidity Again", [
            "Pain: Buying top of pumps due to confusing short-covering squeezes with organic institutional accumulation.",
            "daVIRA Edge: 4-way flow decomposition clearly highlights whether smart money is opening fresh long leverage or distributing into retail FOMO.",
            "Active Price: $10/month accessible plan brings Wall Street-grade flow transparency to everyday traders."
        ], ACCENT_GREEN),
        ("Individual Crypto Quants", "Reproducible Swing Alpha", [
            "Pain: Leaderboards show high paper PnL wallets that bleed out in live execution due to uncopyable HFT latency and high fees.",
            "daVIRA Edge: Execution-drag stress engine (0, 5, 10, 25 bps) & holding time filtering surface realistic, monetizable swing alpha.",
            "Value: Build and validate systematic copy-trading strategies with provable mathematical edge."
        ], ACCENT_BLUE),
        ("Proprietary Trading Firms", "Instant Cross-Desk Consensus", [
            "Pain: Analysts spend hours writing Dune SQL scripts, resulting in stale alpha that arrives after market volatility has passed.",
            "daVIRA Edge: Instant cohort-level consensus, sub-minute position alerts, and pre-move wallet radar deliver actionable signals ahead of breaks.",
            "Enterprise Seats: $250 – $1,000/month/seat with multi-analyst watchlists, custom webhook alerts, and API feeds."
        ], ACCENT_AMBER),
        ("Institutional Risk Desks", "Anti-Spoofing & Whale Exposure", [
            "Pain: Whales splitting positions across 10+ sub-wallets create the illusion of broad market consensus, baiting risk models.",
            "daVIRA Edge: One-wallet-one-vote agreement metrics & largest-contributor sensitivity instantly expose whale concentration and spoofed consensus.",
            "Protection: Prevents over-leveraging into synthetic liquidity walls and illiquid copycat positioning."
        ], ACCENT_PURPLE)
    ]

    for i, (title, sub, bullets, col) in enumerate(tiers):
        tx = 64 + (i % 2) * 590
        ty = 175 + (i // 2) * 245
        add_card(s, tx, ty, 560, 230, border_color=CARD_BORDER)
        add_card(s, tx, ty, 560, 4, border_color=col, bg_color=col)
        add_text(s, title, tx + 22, ty + 18, 510, 26, size=17, color=TEXT_PRIMARY, bold=True)
        add_text(s, sub, tx + 22, ty + 46, 510, 20, size=13, color=col, bold=True)
        
        tb = s.shapes.add_textbox(px_to_in(tx + 22), px_to_in(ty + 74), px_to_in(510), px_to_in(145))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        for b_idx, b in enumerate(bullets):
            p = tf.paragraphs[0] if b_idx == 0 else tf.add_paragraph()
            p.text = f"•  {b}"
            p.font.name = FONT_NAME
            p.font.size = px_to_pt(12.5)
            p.font.color.rgb = TEXT_MUTED
            p.space_after = Pt(6)

    # =========================================================================
    # SLIDE 7: WHOLE-MARKET VIEW (CRYPTO, EQUITIES & COMMODITIES)
    # =========================================================================
    s = new_slide()
    add_header(s, "06 / Cross-Asset Convergence", "Whole-Market View: Crypto, US Equities and Commodities", 7, total_slides)

    # Top Context Card
    add_card(s, 64, 175, 1150, 100, border_color=CARD_BORDER)
    add_card(s, 64, 175, 1150, 4, border_color=ACCENT_BLUE, bg_color=ACCENT_BLUE)
    add_text(s, "The Decentralized Convergence of Global Financial Markets", 86, 188, 1100, 24, size=16, color=TEXT_PRIMARY, bold=True)
    add_text(s, "Modern perpetual DEXs (Hyperliquid HIP-1, Builder DEXs) have expanded beyond crypto natives to trade synthetic US tech equities (NVDA, TSLA, AAPL), global market indices, and commodities (Gold, Crude Oil). For the first time, traders can inspect real-time global macro asset rotation through a single, verifiable on-chain wallet ledger.", 86, 216, 1100, 48, size=13, color=TEXT_MUTED)

    # 3 Asset Class Pillars
    assets = [
        ("Crypto Beta & Majors", "BTC, ETH, SOL & Altcoins", [
            "Tracking smart-money leverage across major crypto perps.",
            "Real-time funding rate basis arbitrage identification.",
            "Sub-minute alerts when top crypto whales de-risk into stablecoins or synthetic RWA hedges."
        ], ACCENT_GREEN),
        ("US Tech Equities on DEXs", "NVDA, TSLA, AAPL Perps", [
            "24/7 continuous price discovery and institutional positioning outside traditional NYSE market hours.",
            "Observing hedge fund wallets accumulating equity perps ahead of US earnings and CPI releases.",
            "Zero 13F filing lag: see equity allocations instantaneously on-chain."
        ], ACCENT_BLUE),
        ("Commodities & Safe Havens", "Gold & Crude Oil Perps", [
            "Real-time flight-to-safety tracking: observe smart money rotating out of altcoins into Gold during geopolitical shocks.",
            "Unified risk monitoring: correlation shifts between energy commodities, tech stocks, and crypto assets.",
            "Single consolidated portfolio view across all asset classes."
        ], ACCENT_AMBER)
    ]

    for i, (title, sub, bullets, col) in enumerate(assets):
        ax = 64 + i * 395
        add_card(s, ax, 290, 375, 365, border_color=CARD_BORDER)
        add_card(s, ax, 290, 375, 4, border_color=col, bg_color=col)
        add_text(s, title, ax + 20, 308, 330, 26, size=17, color=TEXT_PRIMARY, bold=True)
        add_text(s, sub, ax + 20, 336, 330, 20, size=13, color=col, bold=True)
        
        tb = s.shapes.add_textbox(px_to_in(ax + 20), px_to_in(368), px_to_in(330), px_to_in(270))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        for b_idx, b in enumerate(bullets):
            p = tf.paragraphs[0] if b_idx == 0 else tf.add_paragraph()
            p.text = f"•  {b}"
            p.font.name = FONT_NAME
            p.font.size = px_to_pt(13)
            p.font.color.rgb = TEXT_MUTED
            p.space_after = Pt(12)

    # =========================================================================
    # SLIDE 8: LIVE WORKING PRODUCT TRACTION
    # =========================================================================
    s = new_slide()
    add_header(s, "07 / Product Validation", "Live Working Terminal: Operational Architecture Today", 8, total_slides)

    metrics = [
        ("2,000+", "Leaderboard Wallets Continuously Indexed", ACCENT_BLUE),
        ("Sub-Minute", "Position Change Radar & Alerts", ACCENT_GREEN),
        ("4-Way", "Vector Flow Attribution Engine", ACCENT_AMBER),
        ("0–25 bps", "Taker Fee & Slippage Stress Testing", ACCENT_PURPLE)
    ]
    for i, (val, lbl, col) in enumerate(metrics):
        mx = 64 + i * 295
        add_card(s, mx, 175, 275, 100, border_color=CARD_BORDER)
        add_card(s, mx, 175, 275, 4, border_color=col, bg_color=col)
        add_text(s, val, mx + 18, 188, 240, 38, size=26, color=col, bold=True)
        add_text(s, lbl, mx + 18, 230, 240, 36, size=12, color=TEXT_MUTED)

    features = [
        ("Core Analytics Engine (Implemented & Live)", "Production-ready local-first terminal indexing Hyperliquid L1", [
            "Local SQLite WAL database with Decimal.js zero-floating-point precision.",
            "Flat-to-flat episode reconstruction across 2,000 historical fills per wallet.",
            "Real-time wallet screening, custom tagging, and token-specific track records.",
            "Comprehensive positioning compass evaluating 45% fresh directional exposure, 35% token specialist record, and 20% order balance."
        ], 64, ACCENT_GREEN),
        ("Execution & Risk Stress (Implemented & Live)", "Institutional safeguards & realistic copy-trading validation", [
            "Live fee and slippage stress engine (0, 5, 10, 25 bps) filtering paper-only alpha.",
            "Median holding duration analysis separating HFT scalpers from actionable swing traders.",
            "One-wallet-one-vote agreement index preventing whale spoofing and sybil manipulation.",
            "Active commercial deployment with live $10/month individual subscription tier."
        ], 654, ACCENT_BLUE)
    ]

    for title, sub, bullets, fx, col in features:
        add_card(s, fx, 295, 560, 360, border_color=CARD_BORDER)
        add_card(s, fx, 295, 560, 4, border_color=col, bg_color=col)
        add_text(s, title, fx + 24, 315, 510, 26, size=17, color=TEXT_PRIMARY, bold=True)
        add_text(s, sub, fx + 24, 343, 510, 20, size=13, color=col, bold=True)
        
        tb = s.shapes.add_textbox(px_to_in(fx + 24), px_to_in(375), px_to_in(510), px_to_in(265))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        for b_idx, b in enumerate(bullets):
            p = tf.paragraphs[0] if b_idx == 0 else tf.add_paragraph()
            p.text = f"✔  {b}"
            p.font.name = FONT_NAME
            p.font.size = px_to_pt(13)
            p.font.color.rgb = TEXT_MUTED
            p.space_after = Pt(10)

    # =========================================================================
    # SLIDE 9: THE SECRET WEAPON - LLM INTELLIGENCE LAYER
    # =========================================================================
    s = new_slide()
    add_header(s, "08 / AI Intelligence", "The Secret Weapon: Everything Just a Prompt Away", 9, total_slides)

    # Top Hero Card
    add_card(s, 64, 175, 1150, 110, border_color=CARD_BORDER)
    add_card(s, 64, 175, 1150, 4, border_color=ACCENT_PURPLE, bg_color=ACCENT_PURPLE)
    add_text(s, "Democratizing Quantitative Alpha Through Natural Language", 86, 190, 1100, 26, size=17, color=TEXT_PRIMARY, bold=True)
    add_text(s, "Traders and portfolio managers no longer need to write complex SQL, build Dune dashboards, or parse low-level JSON RPC feeds. daVIRA integrates a specialized LLM semantic router trained on crypto market microstructure, allowing users to query institutional alpha in plain English: 'Everything is just a prompt away'.", 86, 220, 1100, 52, size=13, color=TEXT_MUTED)

    prompts = [
        ("Conversational Alpha Discovery", "Real-Time Market Screening", [
            'Prompt: "Which wallets with >$1M PnL opened fresh long leverage on ETH or NVDA in the last 2 hours?"',
            'Engine Action: Translates prompt into optimized SQLite queries filtering for Episode Type = New Long, Volume > $1M, and Timestamp < 2h.',
            'Output: Instant ranked table of 4 top wallets with entry prices, liquidation buffers, and historical win rates.'
        ], ACCENT_GREEN),
        ("Instant Wallet Due Diligence", "Zero-Code Quantitative Audit", [
            'Prompt: "Audit wallet 0x7a...: what is its true win rate after adjusting for 10 bps taker fees and funding drag?"',
            'Engine Action: Replays 2,000 historical flat-to-flat episodes with simulated 10 bps fee hurdles and computes Sharpe ratio.',
            'Output: Verified copy-trade report showing Sharpe drops from 2.8 to 1.1; surfaces median hold time of 4.2 hours.'
        ], ACCENT_BLUE),
        ("Macro Rotation Alerts", "Cross-Asset Volatility Radar", [
            'Prompt: "Alert me the moment top 10 Gold or Tech equity traders start aggressively hedging with BTC shorts."',
            'Engine Action: Establishes continuous WebSocket trigger monitoring cross-asset correlation breaks and position flips.',
            'Output: Instant push notification to Telegram / Discord / Terminal with full order attribution.'
        ], ACCENT_AMBER)
    ]

    for i, (title, sub, bullets, col) in enumerate(prompts):
        px = 64 + i * 395
        add_card(s, px, 305, 375, 350, border_color=CARD_BORDER)
        add_card(s, px, 305, 375, 4, border_color=col, bg_color=col)
        add_text(s, title, px + 20, 322, 330, 26, size=17, color=TEXT_PRIMARY, bold=True)
        add_text(s, sub, px + 20, 350, 330, 20, size=13, color=col, bold=True)
        
        tb = s.shapes.add_textbox(px_to_in(px + 20), px_to_in(380), px_to_in(330), px_to_in(260))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        for b_idx, b in enumerate(bullets):
            p = tf.paragraphs[0] if b_idx == 0 else tf.add_paragraph()
            p.text = b
            p.font.name = FONT_NAME
            p.font.size = px_to_pt(12.5)
            p.font.color.rgb = TEXT_PRIMARY if "Prompt:" in b else TEXT_MUTED
            p.font.bold = True if "Prompt:" in b else False
            p.space_after = Pt(10)

    # =========================================================================
    # SLIDE 10: THE 3-PHASE MASTER ROADMAP
    # =========================================================================
    s = new_slide()
    add_header(s, "09 / Strategic Vision", "The 3-Phase Master Roadmap: From Signal to Market Making", 10, total_slides)

    phases = [
        ("PHASE 1", "Multi-Chain Alpha Tracker & LLM Intelligence", "Months 1 – 12  ·  Active & Expanding", [
            "Operational V1 terminal indexing Hyperliquid L1; expanding to Solana, Base, and Arbitrum.",
            "Proprietary 4-way flow decomposition, execution-drag stress testing, and positioning compass.",
            "Conversational LLM semantic agent: natural language queries ('Everything just a prompt away').",
            "Active commercial model: $10/month individual subscription scaling to enterprise prop seats ($250–$1,000/mo)."
        ], ACCENT_BLUE),
        ("PHASE 2", "daVIRA Capital (Quantitative Proprietary Trading)", "Months 12 – 24  ·  Alpha Capture", [
            "Deploy internal firm capital to directly exploit proprietary flow signals and funding rate basis.",
            "Delta-neutral statistical arbitrage across decentralized perpetuals and spot order books.",
            "Strict institutional risk controls: max position caps, automated liquidation stop-guards, zero directional bias.",
            "Transforms proprietary data advantage into compounding high-capacity trading balance sheet."
        ], ACCENT_GREEN),
        ("PHASE 3", "Algorithmic Market Maker ('The Wintermute of India')", "Months 24+  ·  Global Scale", [
            "High-frequency algorithmic liquidity provision across Hyperliquid, top DEXs, and major CEXs.",
            "Capturing 2–8 basis points spread on hundreds of millions in daily quoting volume.",
            "Token foundation retainers ($15k–$40k/month per token) for guaranteed order book depth.",
            "Establishing India's premier, globally recognized institutional crypto market-making institution."
        ], ACCENT_PURPLE)
    ]

    for i, (p_tag, p_title, p_time, bullets, col) in enumerate(phases):
        px = 64 + i * 395
        add_card(s, px, 175, 375, 480, border_color=CARD_BORDER)
        add_card(s, px, 175, 375, 5, border_color=col, bg_color=col)
        add_text(s, p_tag, px + 22, 195, 330, 24, size=15, color=col, bold=True)
        add_text(s, p_title, px + 22, 222, 330, 52, size=18, color=TEXT_PRIMARY, bold=True)
        add_text(s, p_time, px + 22, 278, 330, 22, size=13, color=TEXT_DIM, bold=True)
        
        tb = s.shapes.add_textbox(px_to_in(px + 22), px_to_in(310), px_to_in(330), px_to_in(330))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        for b_idx, b in enumerate(bullets):
            p = tf.paragraphs[0] if b_idx == 0 else tf.add_paragraph()
            p.text = f"✔  {b}"
            p.font.name = FONT_NAME
            p.font.size = px_to_pt(13)
            p.font.color.rgb = TEXT_MUTED
            p.space_after = Pt(12)

    # =========================================================================
    # SLIDE 11: PHASE DEEP DIVE (PROP DESK & WINTERMUTE VISION)
    # =========================================================================
    s = new_slide()
    add_header(s, "10 / Strategy Deep-Dive", "Capitalizing on Internal Edge: Prop Trading & Market Making", 11, total_slides)

    deep_dives = [
        ("Phase 2 Deep Dive: daVIRA Capital", "Proprietary Trading Desk Exploiting Internal Information Asymmetry", [
            "The Internal Edge: We see wallet repositioning, liquidation clusters, and cross-asset flow rotation before the broader market.",
            "Systematic Flow Strategies: Automated execution of high-Sharpe swing strategies mirroring verified top-performing smart money cohorts.",
            "Delta-Neutral Basis Arbitrage: Capturing perpetual funding rate premiums between on-chain perp DEXs and centralized exchanges without directional market risk.",
            "Strict Institutional Risk Architecture: Sub-second automated circuit breakers, max portfolio drawdown caps (5%), and zero unhedged overnight delta."
        ], 64, ACCENT_GREEN),
        ("Phase 3 Deep Dive: The Wintermute of India", "Algorithmic Market Maker Providing Global Liquidity from India", [
            "The Liquidity Vacuum: Top tier-1 market makers (Wintermute, Jump, Flow Traders) are Western or Singapore-based, ignoring major regional Asian and emerging token ecosystems.",
            "Two-Sided Quoting Engine: Deploying ultra-low latency continuous quoting models on Hyperliquid, Solana CLOBs, and major CEXs.",
            "Compounding Economics: Capturing high-frequency bid-ask spreads on billions in monthly volume, generating non-directional recurring trading profits.",
            "India Engineering Cost Advantage: World-class quantitative researchers and Rust systems architects from IITs at a 75% cost advantage over London or Chicago."
        ], 654, ACCENT_PURPLE)
    ]

    for title, sub, bullets, dx, col in deep_dives:
        add_card(s, dx, 175, 560, 480, border_color=CARD_BORDER)
        add_card(s, dx, 175, 560, 5, border_color=col, bg_color=col)
        add_text(s, title, dx + 24, 195, 510, 28, size=18, color=TEXT_PRIMARY, bold=True)
        add_text(s, sub, dx + 24, 226, 510, 36, size=13, color=col, bold=True)
        
        tb = s.shapes.add_textbox(px_to_in(dx + 24), px_to_in(272), px_to_in(510), px_to_in(365))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        for b_idx, b in enumerate(bullets):
            p = tf.paragraphs[0] if b_idx == 0 else tf.add_paragraph()
            p.text = f"•  {b}"
            p.font.name = FONT_NAME
            p.font.size = px_to_pt(13)
            p.font.color.rgb = TEXT_MUTED
            p.space_after = Pt(14)

    # =========================================================================
    # SLIDE 12: TARGET MARKET & TAM
    # =========================================================================
    s = new_slide()
    add_header(s, "11 / Total Addressable Market", "Expanding Across High-Value Financial Markets", 12, total_slides)

    tams = [
        ("On-Chain Derivative Volume", "$4.2T+", "Total Annualized Volume on Perp DEXs", "High-frequency perp volume migrating from CEX to DEX platforms like Hyperliquid.", ACCENT_BLUE),
        ("Global Prop Desks & Quant Funds", "5,000+", "Active Institutional Trading Desks", "Proprietary trading firms, hedge funds, and family offices deploying systematic capital.", ACCENT_GREEN),
        ("Active Discretionary & Quant Traders", "2.5M+", "Global Crypto Traders Needing Edge", "Massive market of independent traders and quants seeking institutional transparency.", ACCENT_AMBER),
        ("Institutional Market Making", "$100B+", "Daily Global Crypto Liquidity Provision", "Continuous multi-venue liquidity provision across synthetic equities, commodities, and crypto.", ACCENT_PURPLE)
    ]

    for i, (t_title, t_val, t_sub, t_desc, col) in enumerate(tams):
        tx = 64 + i * 295
        add_card(s, tx, 175, 275, 480, border_color=CARD_BORDER)
        add_card(s, tx, 175, 275, 5, border_color=col, bg_color=col)
        add_text(s, t_title, tx + 18, 195, 240, 48, size=16, color=TEXT_PRIMARY, bold=True)
        add_text(s, t_val, tx + 18, 248, 240, 42, size=32, color=col, bold=True)
        add_text(s, t_sub, tx + 18, 298, 240, 36, size=13, color=col, bold=True)
        add_text(s, t_desc, tx + 18, 345, 240, 80, size=13, color=TEXT_MUTED)
        
        # Strategic edge callout at bottom of card
        add_card(s, tx + 18, 440, 239, 190, border_color=CARD_BORDER, bg_color=RGBColor(248, 250, 252))
        add_text(s, "Strategic Monetization:", tx + 28, 452, 220, 20, size=12, color=TEXT_PRIMARY, bold=True)
        notes = {
            0: "Monetized via data APIs, low-latency execution feeds, and institutional analytics seats.",
            1: "Enterprise subscriptions ($250–$1,000/seat/mo) plus custom multi-chain webhook integrations.",
            2: "High-volume recurring SaaS: live $10/month plan ($120/yr) creates strong compounding ARR.",
            3: "Capturing 2–8 bps bid-ask spreads across hundreds of millions in daily quoting volume."
        }
        add_text(s, notes[i], tx + 28, 480, 220, 130, size=12, color=TEXT_MUTED)

    # =========================================================================
    # SLIDE 13: COMPETITIVE ADVANTAGE MATRIX
    # =========================================================================
    s = new_slide()
    add_header(s, "12 / Competitive Moat", "Why daVIRA Outpaces Existing Market Players", 13, total_slides)

    # Real PPTX Table Shape
    matrix_rows = [
        ("Data Transparency & Proof", "Aggregated black-box vanity scores", "Basic raw wallet statistics", "Proprietary internal data only", "Full execution proof & attribution"),
        ("4-Way Flow Decomposition", "✕ Misidentifies short covering", "✕ Unfiltered raw trade fills", "N/A (Trading desk only)", "✔ 4-vector entry/exit split"),
        ("Cross-Asset Equities & Gold", "✕ Crypto native only", "✕ Crypto native only", "✔ Multi-asset desk", "✔ Real-time DEX macro view"),
        ("Natural Language LLM Copilot", "✕ Basic query filters only", "✕ Static UI tables", "✕ Internal tools only", "✔ 'Everything just a prompt away'"),
        ("Execution Drag Stress Testing", "✕ Assumes 0 fee / 0 slippage", "✕ Paper returns only", "N/A", "✔ 0–25 bps fee & slippage stress"),
        ("Proprietary Trading Arm", "✕ Software vendor only", "✕ Pure analytics UI", "✔ Tier-1 Global MM desk", "✔ Phase 2 daVIRA Capital Desk"),
        ("Algorithmic Market Making", "✕ None", "✕ None", "✔ Tier-1 Global Market Maker", "✔ Phase 3 'Wintermute of India'")
    ]
    
    headers = ["INSTITUTIONAL CAPABILITY", "NANSEN / ARKHAM", "HYPERDASH", "WINTERMUTE", "daVIRA INTELLIGENCE"]
    rows = len(matrix_rows) + 1
    cols = 5
    tbl_shape = s.shapes.add_table(rows, cols, px_to_in(64), px_to_in(175), px_to_in(1150), px_to_in(480))
    table = tbl_shape.table
    table.columns[0].width = Inches(2.8)
    table.columns[1].width = Inches(2.1)
    table.columns[2].width = Inches(1.8)
    table.columns[3].width = Inches(2.0)
    table.columns[4].width = Inches(3.28)

    # Style Header Row
    for c_idx, h_text in enumerate(headers):
        cell = table.cell(0, c_idx)
        cell.fill.solid()
        if c_idx == 4:
            cell.fill.fore_color.rgb = RGBColor(236, 253, 245) # emerald tint
        else:
            cell.fill.fore_color.rgb = RGBColor(248, 250, 252) # slate tint
        cell.margin_left = cell.margin_right = Inches(0.12)
        cell.margin_top = cell.margin_bottom = Inches(0.08)
        tf = cell.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = h_text
        p.font.name = FONT_NAME
        p.font.size = Pt(10.5)
        p.font.bold = True
        if c_idx == 4:
            p.font.color.rgb = ACCENT_GREEN
        else:
            p.font.color.rgb = TEXT_PRIMARY

    # Style Data Rows
    for r_idx, row_data in enumerate(matrix_rows):
        for c_idx, val in enumerate(row_data):
            cell = table.cell(r_idx + 1, c_idx)
            cell.fill.solid()
            if c_idx == 4:
                cell.fill.fore_color.rgb = RGBColor(240, 253, 244) # light emerald
            elif r_idx % 2 == 1:
                cell.fill.fore_color.rgb = RGBColor(248, 250, 252) # subtle zebra
            else:
                cell.fill.fore_color.rgb = RGBColor(255, 255, 255)
            cell.margin_left = cell.margin_right = Inches(0.12)
            cell.margin_top = cell.margin_bottom = Inches(0.08)
            tf = cell.text_frame
            tf.word_wrap = True
            p = tf.paragraphs[0]
            p.text = val
            p.font.name = FONT_NAME
            p.font.size = Pt(10)
            if c_idx == 4:
                p.font.bold = True
                p.font.color.rgb = ACCENT_GREEN
            elif c_idx == 0:
                p.font.bold = True
                p.font.color.rgb = TEXT_PRIMARY
            elif "✔" in val:
                p.font.color.rgb = ACCENT_GREEN
            else:
                p.font.color.rgb = TEXT_MUTED

    # =========================================================================
    # SLIDE 14: BUSINESS MODEL & UNIT ECONOMICS
    # =========================================================================
    s = new_slide()
    add_header(s, "13 / Monetization", "Diversified Revenue Model Across Three Phases", 14, total_slides)

    rev_streams = [
        ("Phase 1: SaaS & Terminal", "High-Margin Recurring Subscriptions", [
            "Individual Trader Plan: $10/month ($120/year). Live actively deployed tier delivering 4-way flow decomposition, wallet screening, and execution-drag stress tests to independent traders.",
            "Enterprise Prop Desk Tier: $250 – $1,000/month per seat with team watchlists, sub-minute webhook alerts, and full historical CSV exports.",
            "Institutional Quant API: $2,500+/month for algorithmic hedge funds requiring dedicated WebSocket streaming."
        ], ACCENT_GREEN),
        ("Phase 2: Proprietary Trading", "High-Capacity Alpha Compounding", [
            "Internal Prop Alpha: Deploying firm capital to capture flow-following momentum and liquidity-exhaustion mean reversion (targeting Sharpe > 3.0).",
            "Cross-Venue Basis Arbitrage: Capturing structural funding rate differentials between on-chain perp DEXs and centralized exchanges.",
            "Reinvestment Flywheel: Trading profits directly compound the firm's balance sheet without external LP dilution."
        ], ACCENT_BLUE),
        ("Phase 3: Market Making", "Volume & Spread Monetization", [
            "Bid-Ask Spread Capture: Capturing 2 to 8 basis points on hundreds of millions in daily automated quoting volume across major DEXs.",
            "Token Foundation Retainers: Recurring liquidity retainers ($15k–$40k/month per token) for guaranteed order book depth and tight spreads.",
            "Cross-DEX Arbitrage: Capturing structural price mispricings between Hyperliquid, Solana CLOBs, and CEX order books."
        ], ACCENT_PURPLE)
    ]

    for i, (title, sub, bullets, col) in enumerate(rev_streams):
        rx = 64 + i * 395
        add_card(s, rx, 175, 375, 480, border_color=CARD_BORDER)
        add_card(s, rx, 175, 375, 5, border_color=col, bg_color=col)
        add_text(s, title, rx + 22, 195, 330, 26, size=18, color=TEXT_PRIMARY, bold=True)
        add_text(s, sub, rx + 22, 224, 330, 22, size=13, color=col, bold=True)
        
        tb = s.shapes.add_textbox(px_to_in(rx + 22), px_to_in(260), px_to_in(330), px_to_in(375))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        for b_idx, b in enumerate(bullets):
            p = tf.paragraphs[0] if b_idx == 0 else tf.add_paragraph()
            p.text = f"•  {b}"
            p.font.name = FONT_NAME
            p.font.size = px_to_pt(13)
            p.font.color.rgb = TEXT_MUTED
            p.space_after = Pt(12)

    # =========================================================================
    # SLIDE 15: TECHNICAL ARCHITECTURE
    # =========================================================================
    s = new_slide()
    add_header(s, "14 / Technology Stack", "High-Throughput, Low-Latency Quantitative Architecture", 15, total_slides)

    arch_blocks = [
        ("01 / High-Throughput Ingestion", "Direct Validator & WebSocket Stream Rails", [
            "Sub-second event stream ingestion from Hyperliquid L1, Solana Geyser, and EVM RPCs.",
            "Deterministic trade deduplication by (block_height, coin, trade_id) with microsecond timestamping.",
            "Continuous memory-mapped buffer handling 100,000+ trade events per second without backpressure."
        ], ACCENT_BLUE),
        ("02 / Processing & Analytics Engine", "Deterministic Mathematical Core", [
            "Node.js 24 + SQLite WAL mode analytical engine with Decimal.js zero-floating-point precision.",
            "Flat-to-flat episode reconstruction across 2,000+ historical fills per wallet.",
            "Continuous real-time calculation of Profit Factor, Max Drawdown, and Agreement Index."
        ], ACCENT_GREEN),
        ("03 / LLM Intelligence & Semantic Agent", "Conversational Alpha Gateway", [
            "Semantic router converting natural language queries into schema-optimized SQL queries.",
            "Zero-shot automated market narrative generation and risk stress testing.",
            "Direct webhook push notifications to Telegram, Discord, and internal proprietary OMS."
        ], ACCENT_PURPLE),
        ("04 / Proprietary Execution & Alpha Core", "Institutional Order Routing & Safety", [
            "Low-latency execution rails with sub-5ms order routing to decentralized venues.",
            "Automated slippage, fee, and leverage guardrails protecting against liquidation cascades.",
            "Real-time wallet continuity tracking and synthetic sybil cluster detection."
        ], ACCENT_AMBER)
    ]

    for i, (title, sub, bullets, col) in enumerate(arch_blocks):
        ax = 64 + (i % 2) * 590
        ay = 175 + (i // 2) * 245
        add_card(s, ax, ay, 560, 230, border_color=CARD_BORDER)
        add_card(s, ax, ay, 560, 4, border_color=col, bg_color=col)
        add_text(s, title, ax + 22, ay + 18, 510, 26, size=17, color=TEXT_PRIMARY, bold=True)
        add_text(s, sub, ax + 22, ay + 46, 510, 20, size=13, color=col, bold=True)
        
        tb = s.shapes.add_textbox(px_to_in(ax + 22), px_to_in(ay + 74), px_to_in(510), px_to_in(145))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        for b_idx, b in enumerate(bullets):
            p = tf.paragraphs[0] if b_idx == 0 else tf.add_paragraph()
            p.text = f"✔  {b}"
            p.font.name = FONT_NAME
            p.font.size = px_to_pt(12.5)
            p.font.color.rgb = TEXT_MUTED
            p.space_after = Pt(6)

    # =========================================================================
    # SLIDE 16: FOUNDER & PEDIGREE
    # =========================================================================
    s = new_slide()
    add_header(s, "15 / Leadership", "Founder: Vivek Gautam — Deep Quantitative & Crypto Pedigree", 16, total_slides)

    add_card(s, 64, 175, 560, 480, border_color=CARD_BORDER)
    add_card(s, 64, 175, 560, 5, border_color=ACCENT_BLUE, bg_color=ACCENT_BLUE)
    add_text(s, "Vivek Gautam", 88, 195, 510, 28, size=20, color=TEXT_PRIMARY, bold=True)
    add_text(s, "Founder & Lead Quantitative Architect", 88, 226, 510, 22, size=13, color=ACCENT_BLUE, bold=True)

    fnd_points = [
        "Ex-GoQuant: Worked at the forefront of institutional crypto market data, normalized order routing, and low-latency infrastructure connecting institutions to crypto venues.",
        "QuantInsti: Formally trained in algorithmic and quantitative finance, financial engineering, econometric modeling, and high-frequency trading systems.",
        "Quantitative Analyst at Leading Crypto Firm: Currently actively analyzing crypto market microstructure, derivative flows, on-chain dynamics, and trading inefficiencies.",
        "Hands-On Full-Stack Systems Builder: Personally architected and engineered the entire daVIRA terminal, WebSocket stream listeners, and quantitative screener algorithms from scratch."
    ]
    tb = s.shapes.add_textbox(px_to_in(88), px_to_in(265), px_to_in(510), px_to_in(370))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    for idx, pt in enumerate(fnd_points):
        p = tf.paragraphs[0] if idx == 0 else tf.add_paragraph()
        p.text = f"•  {pt}"
        p.font.name = FONT_NAME
        p.font.size = px_to_pt(13)
        p.font.color.rgb = TEXT_MUTED
        p.space_after = Pt(14)

    add_card(s, 654, 175, 560, 480, border_color=CARD_BORDER)
    add_card(s, 654, 175, 560, 5, border_color=ACCENT_GREEN, bg_color=ACCENT_GREEN)
    add_text(s, "Why This Team Wins", 678, 195, 510, 28, size=20, color=TEXT_PRIMARY, bold=True)
    add_text(s, "The Perfect Convergence of Market Knowledge & Engineering Execution", 678, 226, 510, 22, size=13, color=ACCENT_GREEN, bold=True)

    adv_points = [
        "Domain Depth Over Hype: Deep mathematical understanding of crypto market microstructure, perpetual swaps, funding rate mechanics, and order book dynamics.",
        "Already Built, Not a Slide Dream: Unlike typical pitch decks asking for capital to write the first line of code, daVIRA has an operational V1 terminal indexing thousands of wallets right now.",
        "The India Engineering Advantage: Access to premier IIT/NIT quantitative, mathematical, and systems engineering talent at a 75% cost advantage over Western competitors.",
        "Relentless Long-Term Vision: Clear, methodical execution trajectory transitioning from high-margin software intelligence into a multi-billion dollar market-making powerhouse."
    ]
    tb2 = s.shapes.add_textbox(px_to_in(678), px_to_in(265), px_to_in(510), px_to_in(370))
    tf2 = tb2.text_frame
    tf2.word_wrap = True
    tf2.margin_left = tf2.margin_top = tf2.margin_right = tf2.margin_bottom = 0
    for idx, pt in enumerate(adv_points):
        p = tf2.paragraphs[0] if idx == 0 else tf2.add_paragraph()
        p.text = f"•  {pt}"
        p.font.name = FONT_NAME
        p.font.size = px_to_pt(13)
        p.font.color.rgb = TEXT_MUTED
        p.space_after = Pt(14)

    # =========================================================================
    # SLIDE 17: STRATEGIC CAPITAL DEPLOYMENT & MILESTONES
    # =========================================================================
    s = new_slide()
    add_header(s, "16 / Strategic Partnership", "Capital Deployment, Milestones & Global Ambition", 17, total_slides)

    add_card(s, 64, 175, 560, 480, border_color=CARD_BORDER)
    add_card(s, 64, 175, 560, 5, border_color=ACCENT_BLUE, bg_color=ACCENT_BLUE)
    add_text(s, "Strategic Capital Deployment", 88, 195, 510, 28, size=20, color=TEXT_PRIMARY, bold=True)
    add_text(s, "Institutional Seed Round with Strategic Venture Partners", 88, 226, 510, 22, size=13, color=ACCENT_BLUE, bold=True)

    allocations = [
        ("45% Quantitative Systems & Core Engineering", "Recruiting top Rust/Node systems engineers and quantitative researchers from premier Indian institutes."),
        ("25% High-Throughput Node Infra & LLM Compute", "Deploying dedicated validator RPC nodes (Hyperliquid, Solana, Base) and fine-tuned LLM inference clusters."),
        ("20% Prop Trading & Market Making Sandbox", "Working capital reserve and liquidity pool for testing delta-neutral quoting models and flow-signal execution."),
        ("10% Legal, Compliance & Global Structuring", "GIFT City / international corporate structuring, regulatory licensing, and institutional compliance frameworks.")
    ]
    tb = s.shapes.add_textbox(px_to_in(88), px_to_in(265), px_to_in(510), px_to_in(370))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    for idx, (head, desc) in enumerate(allocations):
        p = tf.paragraphs[0] if idx == 0 else tf.add_paragraph()
        p.text = f"•  {head}:\n    {desc}"
        p.font.name = FONT_NAME
        p.font.size = px_to_pt(13)
        p.font.color.rgb = TEXT_MUTED
        p.space_after = Pt(14)

    add_card(s, 654, 175, 560, 480, border_color=CARD_BORDER)
    add_card(s, 654, 175, 560, 5, border_color=ACCENT_AMBER, bg_color=ACCENT_AMBER)
    add_text(s, "18-Month Execution Roadmap", 678, 195, 510, 28, size=20, color=TEXT_PRIMARY, bold=True)
    add_text(s, "Disciplined Milestones & Capital Efficiency", 678, 226, 510, 22, size=13, color=ACCENT_AMBER, bold=True)

    milestones = [
        ("Months 1 – 3: Multi-Chain & Conversational LLM Launch", "Expand tracker to Solana & Arbitrum; launch conversational 'Everything just a prompt away' interface; scale $10/mo individual subscriptions."),
        ("Months 4 – 6: Institutional Prop Desk Pilot", "Onboard 50+ global prop desks and quant funds on daVIRA Terminal; establish custom WebSocket feeds and team seats ($250–$1,000/mo)."),
        ("Months 7 – 12: daVIRA Capital (Prop Desk Launch)", "Deploy internal systematic trading strategies exploiting proprietary flow leads and cross-venue funding rate basis arbitrage."),
        ("Months 13 – 18: Algorithmic Market Making Rollout", "Launch automated two-sided quoting engine across Hyperliquid & top DEXs ('Wintermute of India') with institutional risk controls.")
    ]
    tb2 = s.shapes.add_textbox(px_to_in(678), px_to_in(265), px_to_in(510), px_to_in(370))
    tf2 = tb2.text_frame
    tf2.word_wrap = True
    tf2.margin_left = tf2.margin_top = tf2.margin_right = tf2.margin_bottom = 0
    for idx, (m_head, m_desc) in enumerate(milestones):
        p = tf2.paragraphs[0] if idx == 0 else tf2.add_paragraph()
        p.text = f"✔  {m_head}\n    {m_desc}"
        p.font.name = FONT_NAME
        p.font.size = px_to_pt(13)
        p.font.color.rgb = TEXT_MUTED
        p.space_after = Pt(12)

    # -------------------------------------------------------------
    # Save Presentation (Root and Outputs)
    # -------------------------------------------------------------
    pptx_path_root = os.path.abspath("daVIRA_Pitch_Deck.pptx")
    pptx_path_outputs = os.path.abspath("outputs/daVIRA_Pitch_Deck.pptx")
    prs.save(pptx_path_root)
    prs.save(pptx_path_outputs)
    print(f"Saved PPTX to:\n  - {pptx_path_root}\n  - {pptx_path_outputs}")

    # -------------------------------------------------------------
    # Export to PDF using PowerPoint COM automation
    # -------------------------------------------------------------
    pdf_path_root = os.path.abspath("daVIRA_Pitch_Deck.pdf")
    pdf_path_outputs = os.path.abspath("outputs/daVIRA_Pitch_Deck.pdf")
    try:
        import win32com.client
        ppt_app = win32com.client.Dispatch("PowerPoint.Application")
        deck = ppt_app.Presentations.Open(pptx_path_root, ReadOnly=True, Untitled=False, WithWindow=False)
        # ppSaveAsPDF = 32
        deck.SaveAs(pdf_path_root, 32)
        deck.SaveAs(pdf_path_outputs, 32)
        deck.Close()
        ppt_app.Quit()
        print(f"Exported PDF to:\n  - {pdf_path_root}\n  - {pdf_path_outputs}")
    except Exception as e:
        print(f"Warning: PowerPoint COM PDF export failed: {e}")

if __name__ == "__main__":
    create_deck()
