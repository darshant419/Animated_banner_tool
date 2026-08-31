import type { DesignElement } from '../store/designStore';

export type TemplateMode = 'emr' | 'animated';

export type BannerTemplate = {
    id: string;
    name: string;
    mode: TemplateMode;
    category: string;
    accent?: string;
    width: number;
    height: number;
    totalDuration: number;
    elements: DesignElement[];
};

export const EMR_ISI_TEXT = `<h2 class="mb-7 mt-5 ">IMPORTANT SAFETY INFO & INDICATION </h2>

<p class="mb-10-title"><strong>Warnings and Precautions</strong></p>
<ul>
  <li class="mb-7"><strong>Dyslipidemia:</strong> Hypercholesterolemia and hypertriglyceridemia occurred in patients taking ORSERDU at an incidence of 30% and 27%, respectively. The incidence of Grade 3 and 4 hypercholesterolemia and hypertriglyceridemia were 0.9% and 2.2%, respectively. Monitor lipid profile prior to starting and periodically while taking ORSERDU.</li>
  <li class="mb-7"><strong>Embryo-Fetal Toxicity:</strong> Based on findings in animals and its mechanism of action, ORSERDU can cause fetal harm when administered to a pregnant woman. Advise pregnant women and females of reproductive potential of the potential risk to a fetus. Advise females of reproductive potential to use effective contraception during treatment with ORSERDU and for 1 week after the last dose. Advise male patients with female partners of reproductive potential to use effective contraception during treatment with ORSERDU and for 1 week after the last dose.</li>
</ul>

<p class="mb-10-title"><strong>Adverse Reactions</strong></p>
<ul>
  <li class="mb-7"><strong>Serious adverse reactions</strong> occurred in 12% of patients who received ORSERDU. Serious adverse reactions in >1% of patients who received ORSERDU were musculoskeletal pain (1.7%) and nausea (1.3%). Fatal adverse reactions occurred in 1.7% of patients who received ORSERDU, including cardiac arrest, septic shock, diverticulitis, and unknown cause (one patient each).</li>
  <li class="mb-7"><strong>The most common adverse reactions</strong> (&ge;10%), including laboratory abnormalities, of ORSERDU were musculoskeletal pain (41%), nausea (35%), increased cholesterol (30%), increased AST (29%), increased triglycerides (27%), fatigue (26%), decreased hemoglobin (26%), vomiting (19%), increased ALT (17%), decreased sodium (16%), increased creatinine (16%), decreased appetite (15%), diarrhea (13%), headache (12%), constipation (12%), abdominal pain (11%), hot flush (11%), and dyspepsia (10%).</li>
</ul>

<p class="mb-10-title"><strong>Drug Interactions</strong></p>
<ul>
  <li class="mb-7"><strong>Concomitant use with CYP3A4 inducers and/or inhibitors:</strong> Avoid concomitant use of strong or moderate CYP3A4 inhibitors with ORSERDU. Avoid concomitant use of strong or moderate CYP3A4 inducers with ORSERDU.</li>
</ul>

<p class="mb-10-title"><strong>Use in Specific Populations</strong></p>
<ul>
  <li class="mb-7"><strong>Lactation:</strong> Advise lactating women to not breastfeed during treatment with ORSERDU and for 1 week after the last dose.</li>
  <li class="mb-7"><strong>Hepatic Impairment:</strong> Avoid use of ORSERDU in patients with severe hepatic impairment (Child-Pugh C). Reduce the dose of ORSERDU in patients with moderate hepatic impairment (Child-Pugh B).</li>
</ul>

<p class="mb-10">The safety and effectiveness of ORSERDU in pediatric patients have not been established.</p>
<p class="mb-10">ORSERDU is available as 345 mg tablets and<br> 86 mg tablets.</p>
<p class="mb-10"><strong>To report SUSPECTED ADVERSE REACTIONS, contact Stemline Therapeutics, Inc. at 1-877-332-7961 or FDA at <br />1-800-FDA-1088 or <a href="https://www.fda.gov/safety/medwatch-fda-safety-information-and-adverse-event-reporting-program" target="_blank" style="color:#000000;text-decoration:underline;word-break: break-all;">www.fda.gov/medwatch</a>.</strong></p>

<h2 class="mb-7 mt-5 ">INDICATION</h2>
<p class="mb-10">ORSERDU (elacestrant) is indicated for the treatment of postmenopausal women or adult men with estrogen receptor (ER)-positive, human epidermal growth factor receptor 2 (HER2)-negative, <i>ESR1</i>-mutated advanced or metastatic breast cancer with disease progression following at least one line of endocrine therapy.</p>
<p class="mb-10" style="font-size:12px;line-height:14px;padding-left:0"><strong>Please see full <a href="https://rxmenarinistemline.com/ORSERDU_elacestrant_Full_Prescribing_Information.pdf" target="_blank" style="color:#000000;text-decoration:underline;text-underline-offset: 1px;font-weight:bold;">Prescribing Information</a>, including Patient Information.</strong></p>
<p style="margin-bottom: 12px; font-size: 12px; line-height: 14px;">*EMERALD was an open-label, global, phase 3 trial of postmenopausal women or men with confirmed ER+/HER2- advanced or metastatic breast cancer (N=478) who had progressed after 1-2 lines of ET, at least one in combination with a CDK4/6i, randomized (1:1) to receive ORSERDU or endocrine therapy (fulvestrant) or an aromatase inhibitor (anastrozole, letrozole, or exemestane). A major efficacy endpoint was PFS by BIRC in patients with the <i>ESR1</i>m (n=228). An exploratory post hoc analysis evaluated efficacy and safety in patients with <i>ESR1</i>m treated with prior ET + CDK4/6i for &ge;12 months (n=159).<sup>1,2</sup></p>
<p class="mb-10" style="font-size:10px;line-height:12px;padding-left:0;"><strong>Abbreviations:</strong> BIRC, blinded imaging review committee; CDK4/6i, cyclin-dependent kinase 4/6 inhibitor; ER+, estrogen receptor-positive; <i>ESR1</i>m, estrogen receptor 1 mutation; ET, endocrine therapy; HER2-, human epidermal growth factor receptor 2-negative; mBC, metastatic breast cancer; PFS, progression-free survival.</p>
<p class="mb-10" style="font-size:10px;line-height:12px;padding-left:0;"><strong>References: 1.</strong> ORSERDU [prescribing information]. New York, NY: Stemline Therapeutics, Inc., a Menarini Group Company; 2023. <b>2.</b> Bardia A, Cort&eacute;s J, Bidard FC, et al. Elacestrant in ER+, HER2- metastatic breast cancer with <i>ESR1</i>-mutated tumors: subgroup analyses from the phase III EMERALD trial by prior duration of endocrine therapy plus CDK4/6 inhibitor and in clinical subgroups.<br><i>Clin Cancer Res</i>. 2024;30(19):4299-4309.</p>
<p style="font-size:8px;line-height:10px;color:#000; font-family: Lato, sans-serif;">ORSERDU is a registered trademark of the Menarini Group.<br>&copy; 2026 Stemline Therapeutics, Inc., a Menarini Group Company.<br>All rights reserved. 02/26 MAT-US-ELA-01292</p>`;

const HEADLINE_1 = 'The First and Only\nOral SERD';
const HEADLINE_2 = 'Proven Efficacy in\nESR1-mutant mBC';
const HEADLINE_3 = 'Empowering Patients\nwith Mutant mBC';

export const BANNER_TEMPLATES: BannerTemplate[] = [
    {
        id: 'emr-static-300x250',
        name: 'EMR Static Banner',
        mode: 'emr',
        category: 'Static / Medical',
        accent: '#006937',
        width: 300,
        height: 250,
        totalDuration: 6,
        elements: [
            { id: 'bg-template', type: 'image', x: 0, y: 0, width: 300, height: 162, src: '/emr_assets/bgg.png' },
            { id: 'isi-template', type: 'isiScroll', x: 0, y: 162, width: 300, height: 88, isiText: EMR_ISI_TEXT, isiScrollSpeed: 30, isiAutoStart: true, fontSize: 12, fill: '#006937' },
            { id: 'isi-logo-template', type: 'image', x: 10, y: 130, width: 80, height: 20, src: '/emr_assets/isi-logo.png' },
        ],
    },
    {
        id: 'emr-master-animated-300x250',
        name: 'Master EMR Animated Sequence',
        mode: 'animated',
        category: 'Animated / Medical',
        accent: '#7c3aed',
        width: 300,
        height: 250,
        totalDuration: 12,
        elements: [
            { id: 'bg', type: 'image', x: 0, y: 0, width: 300, height: 162, src: '/emr_assets/bgg.png' },
            { id: 'orb', type: 'image', x: -20, y: -20, width: 150, height: 150, src: '/emr_assets/orb.png', animation: 'slideInLeft', animationDuration: 1.5, animationLoop: true },
            { id: 'logo', type: 'image', x: 180, y: 100, width: 110, height: 50, src: '/emr_assets/logo.png', animation: 'fadeIn', animationDuration: 1, animationDelay: 0.5 },
            {
                id: 'headline-1', type: 'text', x: 20, y: 40, text: HEADLINE_1, fontSize: 22,
                fill: '#006937', fontWeight: 'bold',
                anim: {
                    keyframes: [
                        { id: 'h1-a', time: 0, opacity: 0, easing: 'power1.out' },
                        { id: 'h1-b', time: 1, opacity: 100, easing: 'power1.out' },
                        { id: 'h1-c', time: 3.5, opacity: 100, easing: 'power1.out' },
                        { id: 'h1-d', time: 4, opacity: 0, easing: 'power1.in' },
                    ],
                },
            },
            {
                id: 'headline-2', type: 'text', x: 20, y: 40, text: HEADLINE_2, fontSize: 20,
                fill: '#006937', fontWeight: 'bold',
                anim: {
                    keyframes: [
                        { id: 'h2-a', time: 4.5, opacity: 0, easing: 'power1.out' },
                        { id: 'h2-b', time: 5.5, opacity: 100, easing: 'power1.out' },
                        { id: 'h2-c', time: 7.5, opacity: 100, easing: 'power1.out' },
                        { id: 'h2-d', time: 8, opacity: 0, easing: 'power1.in' },
                    ],
                },
            },
            {
                id: 'headline-3', type: 'text', x: 20, y: 40, text: HEADLINE_3, fontSize: 20,
                fill: '#006937', fontWeight: 'bold',
                anim: {
                    keyframes: [
                        { id: 'h3-a', time: 8.5, opacity: 0, y: 0, easing: 'power2.out' },
                        { id: 'h3-b', time: 9.5, opacity: 100, y: 40, easing: 'power2.out' },
                    ],
                },
            },
            {
                id: 'cta', type: 'image', x: 20, y: 100, width: 100, height: 35, src: '/emr_assets/cta.png',
                anim: {
                    keyframes: [
                        { id: 'cta-a', time: 9.5, opacity: 0, scaleX: 0.5, scaleY: 0.5, easing: 'back.out' },
                        { id: 'cta-b', time: 10.3, opacity: 100, scaleX: 1, scaleY: 1, easing: 'back.out' },
                    ],
                },
            },
            { id: 'isi', type: 'isiScroll', x: 0, y: 162, width: 300, height: 88, isiText: EMR_ISI_TEXT, isiScrollSpeed: 30, isiAutoStart: true, fontSize: 12, fill: '#006937' },
        ],
    },
    {
        id: 'emr-static-728x90',
        name: 'EMR Leaderboard',
        mode: 'emr',
        category: 'Static / Medical',
        accent: '#0e7490',
        width: 728,
        height: 90,
        totalDuration: 6,
        elements: [
            { id: 'bg-lb', type: 'image', x: 0, y: 0, width: 728, height: 64, src: '/emr_assets/bgg.png' },
            { id: 'isi-lb', type: 'isiScroll', x: 0, y: 64, width: 728, height: 26, isiText: EMR_ISI_TEXT, isiScrollSpeed: 30, isiAutoStart: true, fontSize: 8, fill: '#006937' },
        ],
    },
    {
        id: 'emr-static-336x280',
        name: 'EMR Large Rectangle',
        mode: 'emr',
        category: 'Static / Medical',
        accent: '#166534',
        width: 336,
        height: 280,
        totalDuration: 6,
        elements: [
            { id: 'bg-lr', type: 'image', x: 0, y: 0, width: 336, height: 192, src: '/emr_assets/bgg.png' },
            { id: 'isi-lr', type: 'isiScroll', x: 0, y: 192, width: 336, height: 88, isiText: EMR_ISI_TEXT, isiScrollSpeed: 30, isiAutoStart: true, fontSize: 12, fill: '#006937' },
        ],
    },
    {
        id: 'emr-animated-320x100',
        name: 'EMR Mobile Animated',
        mode: 'animated',
        category: 'Animated / Medical',
        accent: '#4f46e5',
        width: 320,
        height: 100,
        totalDuration: 8,
        elements: [
            { id: 'bg-m', type: 'image', x: 0, y: 0, width: 320, height: 100, src: '/emr_assets/bgg.png' },
            {
                id: 'headline-m', type: 'text', x: 12, y: 10, text: 'The First and Only\nOral SERD', fontSize: 16,
                fill: '#006937', fontWeight: 'bold', animation: 'slideInLeft', animationDuration: 1,
            },
            { id: 'cta-m', type: 'image', x: 210, y: 30, width: 90, height: 35, src: '/emr_assets/cta.png', animation: 'fadeIn', animationDuration: 1, animationDelay: 1 },
            { id: 'isi-m', type: 'isiScroll', x: 0, y: 64, width: 320, height: 36, isiText: EMR_ISI_TEXT, isiScrollSpeed: 30, isiAutoStart: true, fontSize: 8, fill: '#006937' },
        ],
    },
];

export const getTemplateById = (id: string) => BANNER_TEMPLATES.find((t) => t.id === id);