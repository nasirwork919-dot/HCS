"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import AIHRChat from "@/components/AIHRChat";
import { useLang } from "@/lib/i18n";

type Tier = "Free" | "Essential" | "Professional" | "Strategic";

interface LiveCard {
    kind: "live";
    id: Tier;
    badge?: string;
    badgeZh?: string;
    headerAccent: string;
    pillsTextColor: string;
    title: string;
    titleZh: string;
    tagline: string;
    taglineZh: string;
    trialLimit: number;
    ctaLabel: string;
    ctaLabelZh: string;
    ctaHref: string;
}

interface LockedCard {
    kind: "locked";
    id: Tier;
    icon: string;
    title: string;
    titleZh: string;
    /** Available-now tagline shown under the title; empty string hides it. */
    tagline: string;
    taglineZh: string;
    /** Annual price label, e.g. "S$11,988 /yr". */
    price: string;
    /** Feature bullets — mirrors /membership locale for the same plan. */
    features: string[];
    featuresZh: string[];
    ctaLabel: string;
    ctaLabelZh: string;
    ctaHref: string;
}

type TierCardConfig = LiveCard | LockedCard;

const TIERS: TierCardConfig[] = [
    {
        kind: "live",
        id: "Free",
        badge: "Try 10 free",
        badgeZh: "免费体验10次",
        headerAccent: "from-slate-700/30 to-slate-600/20",
        pillsTextColor: "text-emerald-300",
        title: "AIHR Free",
        titleZh: "AIHR 免费版",
        tagline: "Strict FAQ answers · sign up for the full Free plan (50/week)",
        taglineZh: "严格的常见问题解答 · 注册即可使用完整免费版（每周50次）",
        trialLimit: 10,
        ctaLabel: "Sign Up — Free Plan",
        ctaLabelZh: "注册 — 免费版",
        ctaHref: "/register",
    },
    {
        kind: "live",
        id: "Essential",
        badge: "Try 5 free",
        badgeZh: "免费体验5次",
        headerAccent: "from-emerald-700/40 to-emerald-600/20",
        pillsTextColor: "text-emerald-300",
        title: "AIHR Essential",
        titleZh: "AIHR 基础版",
        tagline: "Detailed write-ups · formulas · comparisons",
        taglineZh: "详细说明 · 计算公式 · 方案比较",
        trialLimit: 5,
        ctaLabel: "Subscribe to AIHR Essential",
        ctaLabelZh: "订阅 AIHR 基础版",
        ctaHref: "/membership",
    },
    {
        kind: "locked",
        id: "Professional",
        icon: "💼",
        title: "AIHR Professional",
        titleZh: "AIHR 专业版",
        tagline: "Growing businesses",
        taglineZh: "成长型企业",
        price: "S$11,988 /yr",
        // Mirrors /membership locale (en) for the Professional plan.
        features: [
            "Everything in Essential",
            "AIHR Pro+ chatbot — advanced responses & knowledge base",
            "Full premium resource vault",
            "Free AI alert on government legislation changes to your email",
            "Higher consultation priority (above Essential)",
            "25% off Virtual Classroom classes",
            "2 HR audits / compliance reviews per year",
            "Premium templates, SOPs & policy packs",
        ],
        featuresZh: [
            "包含基础版所有功能",
            "AIHR Pro+ 聊天机器人 — 更高级的回复与知识库",
            "完整的高级资源库",
            "免费AI警报 — 政府立法变更通知至您的邮箱",
            "更高的咨询优先级（高于基础版）",
            "线上课堂课程享25%折扣",
            "每年2次人力资源审计/合规审查",
            "高级模板、标准作业程序及政策文件包",
        ],
        ctaLabel: "Subscribe to AIHR Professional",
        ctaLabelZh: "订阅 AIHR 专业版",
        ctaHref: "/membership",
    },
    {
        kind: "locked",
        id: "Strategic",
        icon: "👑",
        title: "AIHR Strategic",
        titleZh: "AIHR 战略版",
        tagline: "Enterprise HR teams",
        taglineZh: "企业人力资源团队",
        price: "S$17,988 /yr",
        // Mirrors /membership locale (en) for the Strategic plan.
        features: [
            "Everything in Professional",
            "AIHR Strategic chatbot — widest knowledge base, best performance",
            "Full access to all resources & premium tools",
            "Free AI alert on government legislation changes to your email",
            "Highest consultation priority (fastest response)",
            "35% off Virtual Classroom classes",
            "HR Compliance Audit every 6 months",
            "Team / organisation access (multi-user portal)",
            "Dedicated onboarding & activation session",
        ],
        featuresZh: [
            "包含专业版所有功能",
            "AIHR 战略版聊天机器人 — 最广泛的知识库，最佳性能",
            "完整访问所有资源与高级工具",
            "免费AI警报 — 政府立法变更通知至您的邮箱",
            "最高咨询优先级（最快响应）",
            "线上课堂课程享35%折扣",
            "每6个月一次人力资源合规审计",
            "团队/企业账户（多用户后台）",
            "专属入门指导与启用协助",
        ],
        ctaLabel: "Subscribe to AIHR Strategic",
        ctaLabelZh: "订阅 AIHR 战略版",
        ctaHref: "/membership",
    },
];

export default function TryAIHRPage() {
    const { lang } = useLang();
    const liveTiers = TIERS.filter((t): t is LiveCard => t.kind === "live");
    const [tokens, setTokens] = useState<Partial<Record<Tier, string>>>({});
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const results = await Promise.all(
                    liveTiers.map(async (t) => {
                        const res = await fetch("/api/security/demo-session", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ tier: t.id }),
                        });
                        if (!res.ok) throw new Error(`${t.id}: ${res.status}`);
                        const data = (await res.json()) as { token: string };
                        return [t.id, data.token] as const;
                    }),
                );
                if (!cancelled) {
                    const obj: Partial<Record<Tier, string>> = {};
                    for (const [tier, token] of results) obj[tier] = token;
                    setTokens(obj);
                }
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e.message : "Failed to initialise demo");
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <main className="min-h-screen bg-gradient-to-br from-[#0d1f35] via-[#0a1828] to-[#080f1d] text-white">
            <section className="max-w-[1600px] mx-auto px-4 md:px-6 pt-12 pb-10">
                {/* Header */}
                <div className="text-center mb-10 md:mb-14">
                    <h1 className="font-display text-3xl md:text-5xl leading-tight mb-4">
                        {lang === "zh" ? "体验 AIHR —— 您的 AI 智能人力资源助手" : "Try AIHR — Your AI-Powered HR Assistant"}
                    </h1>
                    <p className="text-base md:text-lg text-slate-300 max-w-3xl mx-auto">
                        {lang === "zh"
                            ? "所有方案均支持即时 AI 对话——免费版、基础版、专业版及战略版。限时开放体验，轻松比较各方案功能与服务深度，选择最适合您企业需求的版本。"
                            : "Chat live on every tier — Free, Essential, Professional, and Strategic — for a limited time. Try them side by side and pick the depth that fits."}
                    </p>
                </div>

                {/* What is the AIHR Platform? */}
                <div className="max-w-3xl mx-auto mb-10 md:mb-14 text-center">
                    <h2 className="font-display text-2xl md:text-3xl mb-4">
                        {lang === "zh" ? "什么是 AIHR？" : "What is the AIHR Platform?"}
                    </h2>
                    <p className="text-sm md:text-base text-slate-300 leading-relaxed">
                        {lang === "zh"
                            ? "AIHR 是一套以合规为核心的人力资源决策智能平台，帮助企业识别人力资源合规风险，并提供 AI 智能合规提醒与人力资源咨询支持。AIHR 不替代您现有系统——它是覆盖在所有系统之上的智能决策保护层，让每一个人力资源决策都有合规依据。AIHR 就像企业人力资源的合规大脑，帮助企业在复杂的监管环境中做出更安全的决策。"
                            : "AIHR is a Compliance-First HR Decision Intelligence Platform designed to help businesses identify HR compliance risks and provide AI-powered compliance alerts together with HR advisory support. AIHR doesn't replace your existing systems — it's an intelligent decision-protection layer that sits on top of everything, so every HR decision has a compliance basis behind it. Think of AIHR as your company's HR compliance brain, helping you make safer decisions in a complex regulatory environment."}
                    </p>
                </div>

                {/* Who Should Join the AIHR Platform? */}
                <div className="max-w-4xl mx-auto mb-10 md:mb-14">
                    <h2 className="font-display text-2xl md:text-3xl mb-6 text-center">
                        {lang === "zh" ? "谁适合加入 AIHR 平台？" : "Who Should Join the AIHR Platform?"}
                    </h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                        {(lang === "zh"
                            ? [
                                  "1️⃣ 中小企业老板 / 创始人 — 希望在企业成长过程中，能降低人力资源合规风险并做出更稳健的人力决策。",
                                  "2️⃣ 正在雇佣或计划雇佣外籍员工的企业 — 需要了解外籍员工配额、工作准证政策及合规要求。",
                                  "3️⃣ 人力资源团队规模较小的企业 — 公司没有完整 HR 团队，希望通过 AI 工具获得专业 HR 合规支持。",
                                  "4️⃣ 人力成本持续上升的企业 — 希望通过更合理的人力结构规划，优化人力成本并提高运营效率。",
                                  "5️⃣ 需要经常面对政府合规申报的企业。",
                              ]
                            : [
                                  "1️⃣ SME Owners / Founders — looking to reduce HR compliance risk and make more confident workforce decisions as their business grows.",
                                  "2️⃣ Companies hiring or planning to hire foreign employees — who need to understand foreign worker quotas, work pass policies, and compliance requirements.",
                                  "3️⃣ Companies with small HR teams — without a full in-house HR team, looking to get professional HR compliance support through AI tools.",
                                  "4️⃣ Businesses facing rising manpower costs — looking to optimise their workforce structure and improve operational efficiency.",
                                  "5️⃣ Companies facing frequent government compliance reporting requirements.",
                              ]
                        ).map((item) => (
                            <div key={item} className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-200 leading-relaxed">
                                {item}
                            </div>
                        ))}
                    </div>
                </div>

                {error && (
                    <div className="max-w-3xl mx-auto mb-6 rounded-lg bg-red-500/10 border border-red-400/30 text-red-200 text-sm px-4 py-3">
                        {lang === "zh" ? `演示暂不可用：${error}` : `Demo unavailable: ${error}`}
                    </div>
                )}

                {/* Cards grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5">
                    {TIERS.map((t) => {
                        if (t.kind === "locked") {
                            return (
                                <div
                                    key={t.id}
                                    className="relative flex flex-col rounded-3xl border border-white/15 bg-white/[0.04] backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden p-6 min-h-[640px] md:min-h-[680px]"
                                >
                                    <div className="flex items-start gap-3 mb-4">
                                        <div className="w-12 h-12 rounded-full bg-[#d4a84b]/15 border border-[#d4a84b]/40 flex items-center justify-center text-2xl flex-shrink-0">
                                            {t.icon}
                                        </div>
                                        <div className="leading-tight">
                                            <h3 className="font-display text-xl md:text-2xl">{lang === "zh" ? t.titleZh : t.title}</h3>
                                            {t.tagline && (
                                                <p className="text-xs md:text-sm text-slate-300 mt-1">{lang === "zh" ? t.taglineZh : t.tagline}</p>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-white text-xl md:text-2xl font-display mb-5">
                                        {lang === "zh" ? t.price.replace("/yr", "/年") : t.price}
                                    </p>
                                    <ul className="space-y-2 mb-6 flex-1">
                                        {(lang === "zh" ? t.featuresZh : t.features).map((f) => (
                                            <li key={f} className="flex items-start gap-2 text-sm text-slate-200 leading-snug">
                                                <span className="text-[#d4a84b] mt-0.5 flex-shrink-0">✓</span>
                                                <span>{f}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <Link
                                        href={t.ctaHref}
                                        className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-[#d4a84b] text-[#0d1f35] font-semibold text-sm py-3 hover:bg-[#b8902f] hover:text-white transition-colors"
                                    >
                                        {lang === "zh" ? t.ctaLabelZh : t.ctaLabel}
                                        <span aria-hidden>→</span>
                                    </Link>
                                </div>
                            );
                        }

                        return (
                            <div
                                key={t.id}
                                className="relative flex flex-col rounded-3xl border border-white/15 bg-white/[0.04] backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden"
                            >
                                {t.badge && (
                                    <div className="absolute top-3 right-3 z-10 inline-flex items-center rounded-full border border-[#d4a84b]/60 bg-[#d4a84b]/15 text-[#e8c97a] text-[10px] font-semibold uppercase tracking-[0.16em] px-2.5 py-1">
                                        {lang === "zh" ? t.badgeZh : t.badge}
                                    </div>
                                )}

                                <div className={`px-5 pt-5 pb-3 bg-gradient-to-br ${t.headerAccent}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`h-2 w-2 rounded-full bg-current ${t.pillsTextColor} animate-pulse`} />
                                        <p className={`text-[10px] uppercase tracking-[0.2em] font-semibold ${t.pillsTextColor}`}>
                                            {lang === "zh" ? "实时" : "Live"}
                                        </p>
                                    </div>
                                    <h3 className="font-display text-xl md:text-2xl">{lang === "zh" ? t.titleZh : t.title}</h3>
                                    <p className="text-xs md:text-sm text-slate-300 mt-1 leading-snug">{lang === "zh" ? t.taglineZh : t.tagline}</p>
                                </div>

                                <div className="px-3 pb-3 flex-1 flex flex-col">
                                    <div className="flex-1 min-h-[520px] md:min-h-[560px] rounded-2xl overflow-hidden border border-white/10 bg-[#F8F5EC]">
                                        {tokens[t.id] ? (
                                            <AIHRChat
                                                compact
                                                demoToken={tokens[t.id]!}
                                                demoTier={t.id}
                                                trialMessageLimit={t.trialLimit}
                                                upgradeHref={t.ctaHref}
                                                key={tokens[t.id]}
                                            />
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-sm text-slate-500">
                                                {lang === "zh" ? "初始化中…" : "Initialising…"}
                                            </div>
                                        )}
                                    </div>

                                    <Link
                                        href={t.ctaHref}
                                        className="mt-3 inline-flex items-center justify-center gap-2 w-full rounded-xl bg-[#d4a84b] text-[#0d1f35] font-semibold text-sm py-3 hover:bg-[#b8902f] hover:text-white transition-colors"
                                    >
                                        {lang === "zh" ? t.ctaLabelZh : t.ctaLabel}
                                        <span aria-hidden>→</span>
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Bottom CTA */}
                <div className="mt-10 md:mt-14 text-center">
                    <p className="text-sm text-slate-400 mb-4">
                        {lang === "zh" ? "已是会员？打开完整体验，查看聊天记录。" : "Already a member? Open the full experience with chat history."}
                    </p>
                    <Link
                        href="/member-portal"
                        className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#d4a84b] to-[#e8c97a] text-[#0d1f35] font-bold text-base md:text-lg px-8 md:px-12 py-3.5 md:py-4 transition-transform hover:scale-[1.02] shadow-2xl shadow-[#d4a84b]/30"
                    >
                        {lang === "zh" ? "前往会员中心" : "Go to Member Portal"}
                        <span aria-hidden>→</span>
                    </Link>
                </div>

                {/* Disclaimer */}
                <p className="text-center text-[11px] text-slate-500 mt-10 max-w-2xl mx-auto leading-relaxed">
                    {lang === "zh"
                        ? "AIHR 仅提供一般性人力资源合规指导，不构成法律意见。如需专业建议，请咨询 HCCS 团队。免费预览为匿名模式，每次浏览器会话后将重置。"
                        : "AIHR provides general HR compliance guidance only — not legal advice. For tailored advice, consult the HCCS team. The free preview is anonymous and resets per browser session."}
                </p>
            </section>
        </main>
    );
}
