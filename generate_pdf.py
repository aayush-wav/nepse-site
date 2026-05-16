from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
import re

OUTPUT = "Adolescent_Juvenile_Delinquency_StudyGuide.pdf"

doc = SimpleDocTemplate(
    OUTPUT,
    pagesize=A4,
    leftMargin=2*cm, rightMargin=2*cm,
    topMargin=2.5*cm, bottomMargin=2.5*cm,
    title="Adolescent & Juvenile Delinquency — Complete Study Guide",
)

W, H = A4
styles = getSampleStyleSheet()

# ---------- Custom Styles ----------
cover_title = ParagraphStyle("cover_title", parent=styles["Title"],
    fontSize=26, textColor=colors.HexColor("#1a1a4e"),
    spaceAfter=10, alignment=TA_CENTER, fontName="Helvetica-Bold")

cover_sub = ParagraphStyle("cover_sub", parent=styles["Normal"],
    fontSize=13, textColor=colors.HexColor("#3a3a7a"),
    spaceAfter=6, alignment=TA_CENTER)

ch_head = ParagraphStyle("ch_head",
    fontSize=17, textColor=colors.white,
    fontName="Helvetica-Bold", spaceAfter=4, spaceBefore=4,
    alignment=TA_LEFT, leftIndent=8)

sec_head = ParagraphStyle("sec_head",
    fontSize=13, textColor=colors.HexColor("#1a1a4e"),
    fontName="Helvetica-Bold", spaceAfter=4, spaceBefore=10)

sub_head = ParagraphStyle("sub_head",
    fontSize=11, textColor=colors.HexColor("#2d4a8a"),
    fontName="Helvetica-Bold", spaceAfter=3, spaceBefore=6)

body = ParagraphStyle("body",
    fontSize=10, textColor=colors.HexColor("#222222"),
    fontName="Helvetica", leading=15, spaceAfter=4,
    alignment=TA_JUSTIFY)

bullet_style = ParagraphStyle("bullet_style",
    fontSize=10, textColor=colors.HexColor("#222222"),
    fontName="Helvetica", leading=14, spaceAfter=2,
    leftIndent=14, bulletIndent=4, alignment=TA_LEFT)

tip_style = ParagraphStyle("tip_style",
    fontSize=10, textColor=colors.HexColor("#7a4000"),
    fontName="Helvetica-Oblique", leading=14, spaceAfter=4,
    leftIndent=10, rightIndent=10, alignment=TA_JUSTIFY)

note_head = ParagraphStyle("note_head",
    fontSize=10, textColor=colors.HexColor("#004040"),
    fontName="Helvetica-Bold", spaceAfter=2, spaceBefore=6)

def accent_bar(label):
    """Return a table that looks like a coloured chapter header bar."""
    t = Table([[Paragraph(label, ch_head)]], colWidths=[W - 4*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), colors.HexColor("#1a1a4e")),
        ("ROUNDEDCORNERS", [4]),
        ("TOPPADDING", (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("LEFTPADDING", (0,0), (-1,-1), 10),
    ]))
    return t

def exam_tip(text):
    return [
        Spacer(1, 4),
        Paragraph("⭐ EXAM TIP: " + text, tip_style),
        Spacer(1, 4),
    ]

def B(text):
    return f"<b>{text}</b>"

def hr():
    return HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#aaaacc"), spaceAfter=6, spaceBefore=6)

def bullet(items):
    out = []
    for it in items:
        out.append(Paragraph("• " + it, bullet_style))
    return out

def numbered(items):
    out = []
    for i, it in enumerate(items, 1):
        out.append(Paragraph(f"{i}. " + it, bullet_style))
    return out

# ================================================================
story = []

# ============================================================
# COVER PAGE
# ============================================================
story.append(Spacer(1, 3*cm))
story.append(Paragraph("TRIBHUVAN UNIVERSITY", cover_sub))
story.append(Paragraph("Bachelor Level · 4 Yrs. Prog · Humanities / II Year", cover_sub))
story.append(Spacer(1, 0.5*cm))
story.append(Paragraph("Psychology (Psy. 423)", cover_title))
story.append(Paragraph("Adolescent &amp; Juvenile Delinquency", cover_title))
story.append(Spacer(1, 0.4*cm))
story.append(HRFlowable(width="80%", thickness=2, color=colors.HexColor("#3a3a7a"), hAlign="CENTER"))
story.append(Spacer(1, 0.4*cm))
story.append(Paragraph("COMPLETE EXAM-READY STUDY GUIDE", ParagraphStyle("big", fontSize=15,
    textColor=colors.HexColor("#3a3a7a"), fontName="Helvetica-Bold", alignment=TA_CENTER, spaceAfter=6)))
story.append(Paragraph("Covers ALL Questions from 2078 · 2080 · 2082 Board Exams", cover_sub))
story.append(Spacer(1, 0.3*cm))
story.append(Paragraph("Every topic · Every theory · Every definition · Exam tips included", cover_sub))
story.append(Spacer(1, 2*cm))

toc_data = [
    ["Unit", "Topic", "Page"],
    ["1", "Concepts: Crime, Delinquency & Types", "—"],
    ["2", "Biological & Psychological Factors in Delinquency", "—"],
    ["3", "Theories of Delinquency (Psychoanalytic, Attachment, Social Learning)", "—"],
    ["4", "Moral Development & Delinquency (Kohlberg, Piaget)", "—"],
    ["5", "Life-Span Development: Childhood & Adolescence", "—"],
    ["6", "Developmental Tasks & Hazards of Childhood", "—"],
    ["7", "Adolescent Development: Identity, Gender, Peers & Culture", "—"],
    ["8", "Parenting Styles & Family Influence", "—"],
    ["9", "Externalizing & Internalizing Problems", "—"],
    ["10", "ADHD, Autism Spectrum Disorder & Deviant Behaviour", "—"],
    ["11", "Risk Factors & Protective Factors in Juvenile Delinquency", "—"],
    ["12", "Situation of Children & Adolescents in Nepal", "—"],
    ["13", "Interventions: Counselling, CBT & Psychosocial Intervention", "—"],
    ["14", "Life Skills Development & Prevention of Delinquency", "—"],
    ["15", "Sex Education & Juvenile Delinquency Reduction", "—"],
]
toc_table = Table(toc_data, colWidths=[1.2*cm, 12*cm, 1.5*cm])
toc_table.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#1a1a4e")),
    ("TEXTCOLOR", (0,0), (-1,0), colors.white),
    ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
    ("FONTSIZE", (0,0), (-1,-1), 9),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.HexColor("#f0f0fa"), colors.white]),
    ("GRID", (0,0), (-1,-1), 0.3, colors.HexColor("#aaaacc")),
    ("TOPPADDING", (0,0), (-1,-1), 4),
    ("BOTTOMPADDING", (0,0), (-1,-1), 4),
    ("LEFTPADDING", (0,0), (-1,-1), 6),
]))
story.append(toc_table)
story.append(PageBreak())

# ================================================================
# UNIT 1 — CRIME VS DELINQUENCY
# ================================================================
story.append(accent_bar("UNIT 1 — Crime, Delinquency: Concepts & Types"))
story.append(Spacer(1, 8))

story.append(Paragraph("1.1 What is Crime?", sec_head))
story += [Paragraph(p, body) for p in [
    "Crime is any act or omission that violates a law enforced by the state and is punishable by the legal system. It applies to all individuals regardless of age. Crimes are prosecuted in courts, and the offender (if found guilty) faces penalties such as fines, imprisonment, or other punishments stipulated by the penal code.",
    "Key features of crime: (a) Intentional act or omission, (b) Violates codified law, (c) Punishable by the state, (d) Applies to adults and, in serious cases, to juveniles tried as adults.",
]]

story.append(Paragraph("1.2 What is Delinquency?", sec_head))
story += [Paragraph(p, body) for p in [
    "Juvenile delinquency refers to antisocial or illegal behaviour committed by minors (generally under 18 years). The term encompasses both acts that would be crimes if committed by adults AND status offences — acts that are only illegal because of the offender's age (e.g., truancy, running away from home, underage drinking).",
    "The term 'juvenile delinquent' was first used in the early 20th century to distinguish youth offenders from adult criminals and to emphasise rehabilitation rather than punishment.",
]]

story.append(Paragraph("1.3 Differentiating Crime from Delinquency", sec_head))
diff_data = [
    [B("Dimension"), B("Crime"), B("Delinquency")],
    ["Who commits", "Any person (adult or minor)", "Minors (typically under 18)"],
    ["Legal basis", "Criminal law / Penal Code", "Juvenile Justice Act / special provisions"],
    ["Intent", "Requires criminal intent (mens rea)", "May not require full criminal intent"],
    ["Prosecution", "Criminal court", "Juvenile/family court"],
    ["Objective", "Punishment and deterrence", "Rehabilitation and reformation"],
    ["Record", "Criminal record (permanent)", "Juvenile record (often sealed/expunged)"],
    ["Status offences", "Not applicable", "Includes status offences (truancy, etc.)"],
    ["Severity", "Can range from minor to capital", "Usually minor to moderate"],
    ["Terminology", "Criminal, offender, convict", "Delinquent, youth offender"],
]
dt = Table(diff_data, colWidths=[4.5*cm, 6*cm, 6*cm])
dt.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#2d4a8a")),
    ("TEXTCOLOR", (0,0), (-1,0), colors.white),
    ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
    ("FONTSIZE", (0,0), (-1,-1), 9),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.HexColor("#eef0fa"), colors.white]),
    ("GRID", (0,0), (-1,-1), 0.3, colors.HexColor("#aaaacc")),
    ("TOPPADDING", (0,0), (-1,-1), 4),
    ("BOTTOMPADDING", (0,0), (-1,-1), 4),
    ("LEFTPADDING", (0,0), (-1,-1), 5),
    ("VALIGN", (0,0), (-1,-1), "TOP"),
]))
story.append(dt)
story.append(Spacer(1,6))
story += exam_tip("This comparison table is a favourite long-answer starter. Learn all rows.")

story.append(Paragraph("1.4 Types of Juvenile Delinquency", sec_head))
story += [Paragraph(p, body) for p in [
    "Juvenile delinquency is not a single category — researchers and legal scholars classify it in several ways:",
]]
types = [
    (B("Socialized/Group Delinquency"), "Occurs within a gang or peer group; the delinquent behaviour is conformist within the group but deviant from mainstream society. Example: gang theft, collective vandalism."),
    (B("Unsocialized/Individual Delinquency"), "Committed alone, often linked to personal psychological problems; the juvenile is rejected even by delinquent peers. Higher association with conduct disorder."),
    (B("Status Offences"), "Acts illegal only for minors: truancy, curfew violations, underage drinking, running away. Would NOT be illegal if committed by adults."),
    (B("Index Offences (Delinquent Acts)"), "Acts that are crimes regardless of age: theft, assault, robbery, murder, drug offences."),
    (B("Property Delinquency"), "Theft, burglary, vandalism, arson, shoplifting — the most common category worldwide."),
    (B("Violent/Person Delinquency"), "Assault, rape, homicide — less frequent but more serious."),
    (B("Drug/Substance-Related Delinquency"), "Possession, use, or trafficking of illegal substances."),
    (B("Cyber/Technology Delinquency"), "Hacking, cyberbullying, online fraud — growing category in the digital age."),
    (B("Overt vs Covert"), "Overt: openly aggressive (fighting, bullying). Covert: hidden (stealing, lying, drug use)."),
    (B("Persistent vs Adolescence-Limited (Moffitt, 1993)"), "Life-course-persistent delinquents begin early and continue into adulthood. Adolescence-limited delinquents offend only during teenage years and desist by adulthood."),
]
for t, d in types:
    story.append(Paragraph(f"• {t}: {d}", bullet_style))
story.append(PageBreak())

# ================================================================
# UNIT 2 — BIOLOGICAL & PSYCHOLOGICAL FACTORS
# ================================================================
story.append(accent_bar("UNIT 2 — Biological & Psychological Factors in Delinquency"))
story.append(Spacer(1, 8))

story.append(Paragraph("2.1 Biological Factors", sec_head))
story += [Paragraph(p, body) for p in [
    "Biological theories argue that certain physiological or genetic characteristics predispose individuals to delinquent behaviour. These do NOT say biology is destiny, but rather that biological factors create vulnerabilities.",
]]

bio_factors = [
    ("Genetic Factors", [
        "Twin studies show higher concordance for antisocial behaviour in identical (MZ) than fraternal (DZ) twins (Christiansen, 1977).",
        "Adoption studies (Mednick et al.) show that adopted children whose biological parents were criminal had higher rates of delinquency, even when raised by law-abiding adoptive parents.",
        "Specific genes (e.g., MAOA — 'warrior gene') have been linked to aggression when combined with childhood maltreatment (Caspi et al., 2002).",
    ]),
    ("Neurological Factors", [
        "Prefrontal cortex (PFC) abnormalities impair impulse control, decision-making, and moral reasoning — all relevant to delinquency.",
        "Low resting heart rate is one of the most replicated biological correlates of antisocial behaviour (Raine, 1993). Seen as sign of fearlessness/low autonomic arousal.",
        "EEG studies show slower brainwave activity in delinquents, suggesting cortical under-arousal.",
        "Deficits in the limbic system (amygdala) reduce fear response and empathy.",
    ]),
    ("Hormonal Factors", [
        "High testosterone levels correlate with dominance-seeking and aggression, particularly in adolescent males.",
        "Low cortisol (stress hormone) levels found in persistently aggressive youth — suggesting blunted stress response.",
        "Hormonal surges during puberty increase risk-taking and sensation-seeking behaviour.",
    ]),
    ("Biochemical Factors", [
        "Low serotonin levels are associated with impulsive aggression.",
        "Lead and other heavy metal exposure in early childhood linked to reduced IQ and increased aggressive behaviour.",
        "Prenatal alcohol/drug exposure (FASD) significantly increases risk of delinquency.",
    ]),
    ("Physical Characteristics (Historical)", [
        "Lombroso's 'born criminal' theory (atavistic stigmata — e.g., sloping forehead, long arms) — largely discredited but historically significant.",
        "Sheldon's somatotype theory linked mesomorphic body type (muscular, athletic) to delinquency — weak evidence today.",
    ]),
]
for heading, points in bio_factors:
    story.append(Paragraph(heading, sub_head))
    story += bullet(points)

story.append(Paragraph("2.2 Psychological Factors", sec_head))
psych = [
    ("Intelligence & Cognitive Deficits", [
        "Below-average IQ is a consistent predictor; not because low IQ causes crime, but because poor school performance → frustration → delinquency pathway.",
        "Verbal IQ deficits (language, reading) are stronger predictors than performance IQ.",
    ]),
    ("Personality Factors", [
        "Psychopathy/antisocial personality traits: lack of empathy, callousness, manipulativeness.",
        "High impulsivity, sensation-seeking, and low self-control (Gottfredson & Hirschi's General Theory).",
        "Conduct disorder (CD) in childhood is the single strongest predictor of adult antisocial personality disorder.",
    ]),
    ("Mental Health Disorders", [
        "ADHD — impulsivity and hyperactivity increase risk (discussed in Unit 10).",
        "Oppositional Defiant Disorder (ODD) frequently precedes conduct disorder.",
        "Depression and anxiety can lead to externalising behaviours as coping mechanisms.",
        "Substance use disorders greatly elevate risk.",
    ]),
]
for heading, points in psych:
    story.append(Paragraph(heading, sub_head))
    story += bullet(points)

story += exam_tip("For 15-mark question: Start with definition of delinquency, then cover genetic, neurological, hormonal, biochemical factors with key researchers. End with a critical note that biology interacts with environment.")
story.append(PageBreak())

# ================================================================
# UNIT 3 — THEORIES OF DELINQUENCY
# ================================================================
story.append(accent_bar("UNIT 3 — Theories of Juvenile Delinquency"))
story.append(Spacer(1, 8))

story.append(Paragraph("3.1 Psychoanalytic Theory (Freud)", sec_head))
story += [Paragraph(p, body) for p in [
    "Sigmund Freud's psychoanalytic framework explains delinquency through unconscious conflicts and failures of psychic structure development.",
]]
story.append(Paragraph("Key Concepts:", sub_head))
pa = [
    B("Id, Ego, Superego") + ": The id (instinctual drives — sex and aggression) is present from birth. The ego (rational controller) and superego (moral conscience) develop through socialisation. Delinquency results when the superego is weak, absent, or corrupt.",
    B("Weak Superego") + ": If a child lacks adequate identification with a moral parent figure (especially same-sex parent), the superego fails to develop properly, leaving the id unchecked.",
    B("Corrupt Superego") + ": A child may develop a strong superego that condones criminal values if the parent model is criminal.",
    B("Neurotic Delinquency") + ": Some delinquents commit crimes to seek punishment (unconscious guilt). The crime is committed to be caught and punished, relieving guilt.",
    B("Unconscious Motivation") + ": Delinquent acts may symbolise unresolved Oedipal conflicts, repressed aggression, or displacement of anxiety.",
    B("Defence Mechanisms") + ": Projection (blaming others), denial, and rationalisation are commonly used by delinquents to justify behaviour.",
    B("Aichhorn (1925) — 'Wayward Youth'") + ": Aichhorn applied psychoanalytic ideas to delinquents and showed that early therapeutic relationships could reform delinquent youth. He identified the 'latent delinquent' — youth predisposed to delinquency by early deprivation.",
]
story += bullet(pa)

story.append(Paragraph("3.2 Attachment Theory (Bowlby)", sec_head))
story += [Paragraph(p, body) for p in [
    "John Bowlby proposed that a secure emotional bond (attachment) between infant and primary caregiver is essential for healthy social and emotional development. Disruption of this bond has long-lasting consequences.",
]]
att = [
    B("Secure Attachment") + ": Child trusts caregiver, develops internal working models of relationships as safe and people as trustworthy → positive social behaviour.",
    B("Insecure Attachment") + " (Anxious/Avoidant/Disorganised): Develops when caregivers are inconsistent, neglectful, or abusive. Linked to poor emotional regulation, aggression, and antisocial behaviour.",
    B("Maternal Deprivation Hypothesis") + ": Bowlby argued that separation from the mother in early years (0–3) causes irreversible damage — 'affectionless psychopathy' (inability to feel guilt or form deep relationships).",
    B("'44 Juvenile Thieves' Study (1944)") + ": Bowlby compared 44 juvenile thieves to 44 non-delinquent disturbed youth. Found that 39% of thieves showed 'affectionless' character and 86% of affectionless thieves had experienced early maternal separation.",
    B("Ainsworth's Strange Situation") + ": Identified secure, anxious-ambivalent, and avoidant attachment styles. Disorganised attachment (Main & Solomon) most strongly associated with delinquency.",
    B("Pathway") + ": Insecure attachment → poor peer relationships → rejection → deviant peer groups → delinquency.",
]
story += bullet(att)

story.append(Paragraph("3.3 Social Learning Theory (Bandura)", sec_head))
story += [Paragraph(p, body) for p in [
    "Albert Bandura (1977) argued that behaviour — including aggression and delinquency — is learned through observation, imitation, and reinforcement, not just direct experience.",
]]
slt = [
    B("Observational Learning (Modelling)") + ": Children observe models (parents, peers, media) performing behaviours and learn to imitate them.",
    B("Bobo Doll Experiment (1961, 1963)") + ": Children who observed an adult aggressively beating a Bobo doll reproduced the behaviour, even without direct reinforcement. Established vicarious learning.",
    B("Reinforcement & Punishment") + ": Behaviour that is rewarded (materially or socially) is more likely to be repeated. If delinquent behaviour is reinforced (peer approval, financial gain), it continues.",
    B("Self-Efficacy") + ": A person's belief in their ability to execute behaviour affects whether they will attempt it. High self-efficacy for crime increases risk.",
    B("Cognitive Factors") + ": Bandura emphasised that people don't just respond mechanically — they think about consequences, hold moral disengagement beliefs (rationalising harmful acts as acceptable).",
    B("Differential Reinforcement (Akers, 1985)") + ": Extended Bandura's theory; delinquency is learned through differential association with delinquent peers who reinforce criminal definitions.",
    B("Media Influence") + ": Exposure to violent media increases aggressive cognitions and behaviour — relevant to cyberbullying and copycat crimes.",
]
story += bullet(slt)
story += exam_tip("Compare psychoanalytic (unconscious, past) vs attachment (early bonding, present relationships) vs social learning (observation, environment). Know key researchers and studies for each.")

story.append(Paragraph("3.4 Other Important Theories (Brief)", sec_head))
other_theories = [
    (B("Strain Theory (Merton, 1938)"), "Gap between socially approved goals (wealth, success) and legitimate means to achieve them causes strain. Those blocked from legitimate paths may turn to crime."),
    (B("Labelling Theory (Becker, 1963)"), "Society's reaction to deviance matters more than the act itself. Once labelled 'delinquent', a youth internalises the label (self-fulfilling prophecy), making further delinquency likely."),
    (B("Control/Social Bond Theory (Hirschi, 1969)"), "Delinquency occurs when bonds to society are weak. Four elements: Attachment (to family/school), Commitment (investment in conventional activities), Involvement (in school/work), Belief (in moral validity of law)."),
    (B("Differential Association (Sutherland, 1939)"), "Delinquency is learned through association with others who hold criminal attitudes and definitions favourable to law violation. More associations with criminal definitions than pro-social definitions → delinquency."),
    (B("Ecological Theory (Bronfenbrenner)"), "Development occurs within nested systems: microsystem (family, peers, school), mesosystem (interactions between microsystems), exosystem (community, parents' workplace), macrosystem (culture, laws), chronosystem (time/history). Delinquency reflects disruptions across systems."),
]
for t, d in other_theories:
    story.append(Paragraph(f"• {t}: {d}", bullet_style))
story.append(PageBreak())

# ================================================================
# UNIT 4 — MORAL DEVELOPMENT
# ================================================================
story.append(accent_bar("UNIT 4 — Moral Development & Delinquency"))
story.append(Spacer(1, 8))

story.append(Paragraph("4.1 What is Moral Development?", sec_head))
story += [Paragraph(p, body) for p in [
    "Moral development refers to the process by which children develop values, beliefs, and thinking about right and wrong, fairness, and justice. It involves cognitive (reasoning about rules), affective (empathy, guilt), and behavioural (acting ethically) components.",
]]

story.append(Paragraph("4.2 Piaget's Theory of Moral Development", sec_head))
piaget = [
    B("Heteronomous Morality (5–10 years)") + ": Rules are absolute, given by authority (God, parents), unchangeable. Judges acts by consequences (if serious damage → naughty), not intentions. Believes in 'immanent justice' (bad behaviour automatically leads to punishment).",
    B("Autonomous Morality (10+ years)") + ": Rules are social agreements that can be changed by consent. Judges acts by intentions, not just consequences. Reciprocity and fairness are central principles.",
    B("Limitation") + ": Underestimated young children's moral abilities; modern research shows toddlers have rudimentary sense of fairness.",
]
story += bullet(piaget)

story.append(Paragraph("4.3 Kohlberg's Theory of Moral Development", sec_head))
story += [Paragraph(p, body) for p in [
    "Lawrence Kohlberg (1958, 1969) extended Piaget's work and proposed 3 levels and 6 stages of moral development, based on responses to moral dilemmas (e.g., the Heinz dilemma).",
]]

kohlberg_data = [
    [B("Level"), B("Stage"), B("Basis of Moral Reasoning"), B("Age (approx)")],
    ["PRE-CONVENTIONAL\n(Self-interest)", "Stage 1: Obedience & Punishment", "Avoid punishment; obey rules to escape bad consequences", "Up to ~9 yrs"],
    ["", "Stage 2: Instrumental Purpose", "Self-interest; 'What's in it for me?'; simple exchange", "~7–10 yrs"],
    ["CONVENTIONAL\n(Social norms)", "Stage 3: Interpersonal Accord", "Be a 'good boy/girl'; please others; mutual relationships", "~10–13 yrs"],
    ["", "Stage 4: Social System & Conscience", "Maintain social order, obey laws for society's sake", "Adolescence onward"],
    ["POST-CONVENTIONAL\n(Principles)", "Stage 5: Social Contract", "Rules are agreements; can be changed if unjust; individual rights", "Adulthood"],
    ["", "Stage 6: Universal Ethics", "Abstract principles: justice, dignity; may disobey unjust laws", "Rare/ideal"],
]
kt = Table(kohlberg_data, colWidths=[3.5*cm, 4*cm, 6.5*cm, 2.5*cm])
kt.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#2d4a8a")),
    ("TEXTCOLOR", (0,0), (-1,0), colors.white),
    ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
    ("FONTSIZE", (0,0), (-1,-1), 8.5),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.HexColor("#eef0fa"), colors.white]),
    ("GRID", (0,0), (-1,-1), 0.3, colors.HexColor("#aaaacc")),
    ("TOPPADDING", (0,0), (-1,-1), 4),
    ("BOTTOMPADDING", (0,0), (-1,-1), 4),
    ("LEFTPADDING", (0,0), (-1,-1), 5),
    ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("SPAN", (0,1), (0,2)),
    ("SPAN", (0,3), (0,4)),
    ("SPAN", (0,5), (0,6)),
]))
story.append(kt)
story.append(Spacer(1,6))

story.append(Paragraph("4.4 Criticisms of Kohlberg", sec_head))
story += bullet([
    "Carol Gilligan (1982): Kohlberg's theory based on male samples; ignores 'care ethics' more typical of women. Men reason in justice; women in care/relationships.",
    "Cultural bias: Western, individualistic societies valued; collectivist cultures may score 'lower' but are not less moral.",
    "Gap between moral reasoning and moral action: High stage reasoning does not guarantee moral behaviour.",
    "Does not account for emotions; Haidt's 'moral intuitionist' view holds that moral judgements are emotional first, reasoned second.",
])

story.append(Paragraph("4.5 Role of Moral Development in Delinquent Behaviour", sec_head))
story += [Paragraph(p, body) for p in [
    "Research consistently shows that delinquents tend to reason at lower stages of moral development (Stages 1 and 2 — pre-conventional) compared to non-delinquents who show Stage 3 or 4 reasoning.",
]]
md_del = [
    "Delinquents primarily reason from self-interest and punishment avoidance — they will offend if they think they won't get caught.",
    "Lack of empathy (affective component of morality) means they do not consider harm to victims.",
    "Cognitive distortions (e.g., minimising, blaming victims) allow moral disengagement — justifying harmful acts.",
    "Weak superego (psychoanalytic) parallels Kohlberg's pre-conventional reasoning.",
    "Intervention implication: Moral development programmes that challenge cognitive distortions and promote perspective-taking can raise moral reasoning and reduce recidivism (Gibbs' EQUIP programme).",
    "Gilligan's care perspective: Many delinquent girls may have backgrounds of trauma and relational harm; intervention should address relational ethics, not just rule-following.",
]
story += bullet(md_del)
story += exam_tip("Always link theory to delinquency — show how lower Kohlberg stages manifest as crime. Mentioning Gilligan's critique earns extra marks.")
story.append(PageBreak())

# ================================================================
# UNIT 5 — LIFE SPAN DEVELOPMENT
# ================================================================
story.append(accent_bar("UNIT 5 — Life-Span Development & Juvenile Delinquency"))
story.append(Spacer(1, 8))

story.append(Paragraph("5.1 Overview of Life-Span Perspective", sec_head))
story += [Paragraph(p, body) for p in [
    "The life-span perspective (Baltes) holds that development is: (1) Lifelong, (2) Multidimensional, (3) Multidirectional, (4) Plastic, (5) Contextually embedded, (6) Multidisciplinary. Development at every stage has implications for juvenile delinquency.",
]]

story.append(Paragraph("5.2 Prenatal & Infancy Stage (0–2 years)", sec_head))
inf = [
    "Prenatal exposure to drugs, alcohol (FASD), tobacco, or environmental toxins (lead) increases delinquency risk.",
    "Birth complications (low birth weight, oxygen deprivation) may affect brain development.",
    "Secure attachment established in infancy is the single most important protective factor.",
    "Bowlby: 'Maternal deprivation' during this stage leads to affectionless psychopathy.",
]
story += bullet(inf)

story.append(Paragraph("5.3 Early Childhood (2–6 years) — Erikson: Initiative vs Guilt", sec_head))
ec = [
    "Language and cognitive development; socialisation begins; moral foundations laid (Piaget's heteronomous stage).",
    "Harsh, inconsistent, or abusive parenting during this stage is a strong predictor of later conduct disorder.",
    "Erikson: Failure to achieve initiative leads to guilt and inhibition; OR, without proper guidance, unchecked initiative becomes aggressive behaviour.",
    "Early exposure to domestic violence creates trauma responses that manifest as externalising behaviours.",
    "By age 3, temperamental characteristics (difficult/easy) are identifiable; difficult temperament + poor parenting = elevated risk.",
]
story += bullet(ec)

story.append(Paragraph("5.4 Middle Childhood (6–12 years) — Erikson: Industry vs Inferiority", sec_head))
mc = [
    "School becomes the major developmental arena. Academic failure and peer rejection are critical risk factors.",
    "Children begin to compare themselves to peers (social comparison). Low self-concept can lead to deviant behaviour as compensation.",
    "Piaget: Autonomous morality stage — understanding of intentions and fairness develops.",
    "Kohlberg: Stage 2–3 reasoning; peer rules and group identity become important.",
    "Onset of conduct disorder during this stage indicates high risk for persistent delinquency (Moffitt's 'early onset' pathway).",
    "Peer relationships: being bullied OR bullying others are both risk pathways.",
    "Patterson's 'coercive family process' — children learn coercive behaviours through reinforced interactions with parents.",
]
story += bullet(mc)

story.append(Paragraph("5.5 Adolescence (12–18 years) — THE PEAK PERIOD", sec_head))
story += [Paragraph(p, body) for p in [
    "Adolescence is the most critical stage for the onset of delinquency. The vast majority of delinquent acts peak between ages 15–17.",
]]
ado = [
    "Brain development: The prefrontal cortex (impulse control) is still developing until mid-20s, while the limbic system (reward, emotion) matures earlier — creating the 'imbalance' that promotes risk-taking (Steinberg's dual systems model).",
    "Identity formation (Erikson: Identity vs Role Confusion): Failed identity formation → role diffusion; joining delinquent groups provides a ready-made identity.",
    "Peer influence peaks; peer pressure and need for belonging drive much adolescent delinquency.",
    "Pubertal changes: early maturation, especially in girls, is a risk factor (association with older peers).",
    "Moffitt's 'adolescence-limited' delinquents: most adolescents who offend desist by early adulthood as brain matures and social roles (work, relationships) provide social bonds.",
    "Major mental health issues emerge (depression, anxiety, substance use) which increase risk.",
    "Family conflict peaks; poor parental monitoring during adolescence is a strong risk factor.",
]
story += bullet(ado)
story += exam_tip("'Which stages of life-span development are important in juvenile delinquency?' — Answer: ALL stages contribute, but early childhood (attachment, parenting) and adolescence (brain, peers, identity) are MOST important. Explain why for each.")
story.append(PageBreak())

# ================================================================
# UNIT 6 — DEVELOPMENTAL TASKS OF CHILDHOOD & HAZARDS
# ================================================================
story.append(accent_bar("UNIT 6 — Developmental Tasks & Hazards of Childhood"))
story.append(Spacer(1, 8))

story.append(Paragraph("6.1 Concept of Developmental Tasks (Havighurst)", sec_head))
story += [Paragraph(p, body) for p in [
    "Robert Havighurst (1972) defined developmental tasks as skills, knowledge, functions, and attitudes that individuals must master at a certain point in life. They arise from physical maturation, cultural/societal demands, and personal values. Failure to achieve a task leads to difficulty with future tasks and social disapproval.",
]]

story.append(Paragraph("6.2 Developmental Tasks of Late Childhood (6–12 years)", sec_head))
lc_tasks = [
    "Learning physical skills necessary for ordinary games (catching, throwing, running).",
    "Building wholesome attitudes toward oneself as a growing organism.",
    "Learning to get along with age-mates — cooperation, sharing, competition.",
    "Learning an appropriate gender social role.",
    "Developing fundamental skills in reading, writing, and arithmetic.",
    "Developing concepts necessary for everyday living (time, money, cause-effect).",
    "Developing conscience, morality, and a scale of values (Kohlberg Stages 1–3).",
    "Achieving personal independence from parents while maintaining family bonds.",
    "Developing attitudes toward social groups and institutions (school, law).",
]
story += numbered(lc_tasks)

story.append(Paragraph("6.3 Developmental Hazards of Childhood", sec_head))
story += [Paragraph(p, body) for p in [
    "A developmental hazard is any factor that interferes with successful achievement of developmental tasks. Hazards can be physical, psychological, social, or environmental.",
]]
haz = [
    (B("Physical Hazards"), ["Chronic illness or physical disability limiting activity", "Malnutrition affecting brain development and attention", "Accidents and injuries; sleep disorders"]),
    (B("Psychological Hazards"), ["Learning disabilities (dyslexia, dyscalculia) causing academic failure", "Low IQ or intellectual disability", "Emotional disorders: anxiety, depression, phobias", "Negative self-concept and low self-esteem"]),
    (B("Social Hazards"), ["Peer rejection and social isolation", "Bullying (as victim or perpetrator)", "Dysfunctional family (divorce, domestic violence, parental substance abuse)", "Poverty and community violence exposure"]),
    (B("Environmental Hazards"), ["School failure and poor educational environment", "Neighbourhood crime and lack of safe play spaces", "Media exposure to violence and inappropriate content", "Lack of supervision and enrichment activities"]),
]
for heading, points in haz:
    story.append(Paragraph(heading, sub_head))
    story += bullet(points)

story.append(Paragraph("6.4 Parenting Styles and Their Impact (Baumrind)", sec_head))
story += [Paragraph(p, body) for p in [
    "Diana Baumrind (1966, 1991) identified four parenting styles based on two dimensions: Responsiveness (warmth/acceptance) and Demandingness (control/expectations).",
]]
ps_data = [
    [B("Style"), B("Responsive?"), B("Demanding?"), B("Outcome for Child")],
    ["Authoritative\n(Best)", "HIGH — warm, supportive, listens", "HIGH — sets clear, consistent rules", "High self-esteem, good academic performance, LOW delinquency risk. Child is competent, independent, socially skilled."],
    ["Authoritarian", "LOW — cold, rejecting", "HIGH — strict, punitive", "Obedient but less happy, low self-esteem. Higher risk of aggression and delinquency when parental oversight decreases."],
    ["Permissive\n(Indulgent)", "HIGH — warm, accepting", "LOW — few rules, child-led", "Impulsive, lacking self-discipline. Higher risk of substance use and delinquency."],
    ["Neglectful\n(Uninvolved)", "LOW — uninvested", "LOW — disengaged", "HIGHEST risk for delinquency, poor academic outcomes, insecure attachment, emotional instability."],
]
pst = Table(ps_data, colWidths=[2.8*cm, 3.5*cm, 3.5*cm, 6.7*cm])
pst.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#2d4a8a")),
    ("TEXTCOLOR", (0,0), (-1,0), colors.white),
    ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
    ("FONTSIZE", (0,0), (-1,-1), 8.5),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.HexColor("#eef0fa"), colors.white]),
    ("GRID", (0,0), (-1,-1), 0.3, colors.HexColor("#aaaacc")),
    ("TOPPADDING", (0,0), (-1,-1), 4),
    ("BOTTOMPADDING", (0,0), (-1,-1), 4),
    ("LEFTPADDING", (0,0), (-1,-1), 5),
    ("VALIGN", (0,0), (-1,-1), "TOP"),
]))
story.append(pst)
story += exam_tip("Authoritative parenting is the protective factor; Neglectful parenting is the highest risk. The 2082 question pairs parenting styles with developmental hazards — discuss both.")
story.append(PageBreak())

# ================================================================
# UNIT 7 — ADOLESCENT DEVELOPMENT
# ================================================================
story.append(accent_bar("UNIT 7 — Adolescent Development: Identity, Gender, Peers & Culture"))
story.append(Spacer(1, 8))

story.append(Paragraph("7.1 Characteristics of Adolescence", sec_head))
chars = [
    "Rapid physical growth and puberty (primary & secondary sexual characteristics).",
    "Abstract and formal operational thinking develops (Piaget).",
    "Identity formation becomes the central developmental task (Erikson).",
    "Emotional volatility — mood swings, heightened sensitivity.",
    "Shift from family to peer group orientation.",
    "Development of sexual and romantic interest.",
    "Increased risk-taking and sensation-seeking behaviour.",
    "Development of personal values, ideology, and worldview.",
    "Quest for autonomy and independence from parents.",
]
story += bullet(chars)

story.append(Paragraph("7.2 Identity Development (Erikson's Stage 5 & Marcia)", sec_head))
story += [Paragraph(p, body) for p in [
    "Erik Erikson (1968): The central task of adolescence is Identity vs Role Confusion. Adolescents must integrate past experiences, present capacities, and future goals into a coherent sense of self ('Who am I?').",
    "Successful resolution → Fidelity: a sense of loyalty and commitment to one's identity.",
    "Failed resolution → Role Confusion/Diffusion: the adolescent doesn't know who they are; vulnerable to gang membership (which provides ready-made identity).",
]]

story.append(Paragraph("James Marcia's 4 Identity Statuses:", sub_head))
marcia = [
    (B("Identity Achievement"), "Explored options AND committed to an identity. Highest psychological health."),
    (B("Identity Moratorium"), "Currently exploring, no commitment yet. Healthy but anxious period."),
    (B("Identity Foreclosure"), "Committed WITHOUT exploration (adopted parents' identity). Rigid, vulnerable to delinquency if parental values are criminal."),
    (B("Identity Diffusion"), "Neither explored nor committed. HIGHEST risk for delinquency — no sense of direction."),
]
for t, d in marcia:
    story.append(Paragraph(f"• {t}: {d}", bullet_style))

story.append(Paragraph("7.3 Gender Identity Development", sec_head))
story += [Paragraph(p, body) for p in [
    "Gender identity is the subjective sense of being male, female, or non-binary, which may or may not align with biological sex.",
]]
gender_factors = [
    B("Biological Factors") + ": Hormonal influences (prenatal testosterone) shape neural circuits. Gender dysphoria linked to discordance between chromosomal sex and neural gender identity.",
    B("Social Learning (Bandura)") + ": Children observe and imitate gender-appropriate behaviour. Reinforcement of gender-conforming behaviour (pink for girls, blue for boys).",
    B("Cognitive-Developmental (Kohlberg)") + ": Gender constancy develops in stages: gender labelling (age 2–3), gender stability (4–5), gender consistency (6–7 — understand gender doesn't change).",
    B("Gender Schema Theory (Bem, 1981)") + ": Children create mental schemas of gender and organise information accordingly. Highly gender-schematic children rigidly categorise behaviour.",
    B("Cultural Influences") + ": Culture defines gender norms, roles, and expectations. Traditional cultures impose strict binary roles; more egalitarian cultures allow broader expression.",
    B("Adolescent Gender Development") + ": Pubertal changes intensify gender socialisation ('gender intensification hypothesis' — Hill & Lynch, 1983). Boys and girls experience pressure to conform to traditional roles.",
]
story += bullet(gender_factors)

story.append(Paragraph("7.4 Peer Group Influence in Adolescence", sec_head))
story += [Paragraph(p, body) for p in [
    "The peer group is arguably the MOST INFLUENTIAL social context during adolescence, often superseding family in day-to-day behaviour.",
]]
peers = [
    B("Functions of Peer Groups") + ": Provide a sense of belonging and identity; offer emotional support outside family; serve as a reference group for social comparison; facilitate development of social skills; teach cooperation, competition, and conflict resolution.",
    B("Cliques and Crowds") + ": Cliques are small, intimate groups (5–7) of close friends. Crowds are larger, reputation-based groups (jocks, nerds, outcasts). Crowd membership shapes self-concept and behaviour.",
    B("Peer Pressure") + ": Not always negative — peers can encourage prosocial behaviour. Negative peer pressure → substance use, delinquency, risky sexual behaviour. Adolescents in conformist stage (Kohlberg Stage 3) are most vulnerable.",
    B("Peer Rejection") + ": A powerful predictor of later delinquency. Rejected children often join deviant peer groups as the only social option.",
    B("Deviant Peer Contagion") + ": Grouping delinquent adolescents together (in programmes) can increase delinquency — they reinforce each other's attitudes.",
    B("Online Peers") + ": Social media and online communities extend peer influence beyond physical contact; cyber bullying, gang recruitment online are emerging concerns.",
]
story += bullet(peers)

story.append(Paragraph("7.5 Cultural Influences on Adolescent Development", sec_head))
cult = [
    "Culture provides the macrosystem (Bronfenbrenner) within which all development occurs.",
    "Collectivistic cultures (Nepal, India) emphasise family loyalty, group harmony, and deference to elders — adolescents may experience less identity exploration but stronger family bonds (protective factor).",
    "Individualistic cultures (West) emphasise autonomy and self-determination — more identity exploration, but potentially weaker family bonds.",
    "Cultural rites of passage (e.g., Bratabandha in Nepal) provide structured transitions to adulthood, reducing role confusion.",
    "Acculturation stress: Migrant adolescents navigating two cultures experience higher stress and identity conflict, increasing delinquency risk.",
    "Poverty, caste discrimination, and gender inequality are cultural-level risk factors for delinquency in Nepal.",
]
story += bullet(cult)
story += exam_tip("'Importance of culture and peers in adolescent development' is a 10-mark question. Structure: define each, explain specific functions, link to identity and delinquency, cultural context of Nepal.")
story.append(PageBreak())

# ================================================================
# UNIT 8 — EXTERNALISING & INTERNALISING PROBLEMS
# ================================================================
story.append(accent_bar("UNIT 8 — Externalising & Internalising Problems"))
story.append(Spacer(1, 8))

story.append(Paragraph("8.1 The Broadband Taxonomy", sec_head))
story += [Paragraph(p, body) for p in [
    "Achenbach (1966, 1991) proposed a broadband taxonomy of child psychopathology based on factor analysis of behaviour checklists, yielding two main dimensions: Externalising and Internalising problems.",
]]

ext_int_data = [
    [B("Dimension"), B("Externalising Problems"), B("Internalising Problems")],
    ["Definition", "Behavioural problems directed outward; disrupts others and environment", "Emotional problems directed inward; primarily affect the individual"],
    ["Core features", "Aggression, defiance, rule-breaking, hyperactivity", "Anxiety, depression, withdrawal, somatic complaints"],
    ["Direction of behaviour", "Under-controlled — too much behaviour", "Over-controlled — too little behaviour"],
    ["Main disorders", "ADHD, Conduct Disorder (CD), Oppositional Defiant Disorder (ODD), Substance Use", "Generalised Anxiety Disorder, Depression, Social Phobia, PTSD, Eating Disorders"],
    ["Visibility", "Easily noticed by others; often result in referral", "Often hidden/missed; internalised silently"],
    ["Gender pattern", "More common in males", "More common in females (especially after puberty)"],
    ["Delinquency link", "Direct link — CD and ODD are precursors to delinquency", "Indirect — depression/anxiety can lead to substance use or aggression"],
    ["Prognosis", "More chronic without intervention; stable over time", "Variable; may remit or become chronic (depression)"],
    ["Treatment", "Behavioural, CBT, parent training, stimulant medication (ADHD)", "CBT, medication (antidepressants/anxiolytics), therapy"],
]
ei_table = Table(ext_int_data, colWidths=[3.5*cm, 7*cm, 7*cm])
ei_table.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#2d4a8a")),
    ("TEXTCOLOR", (0,0), (-1,0), colors.white),
    ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
    ("FONTSIZE", (0,0), (-1,-1), 8.5),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.HexColor("#eef0fa"), colors.white]),
    ("GRID", (0,0), (-1,-1), 0.3, colors.HexColor("#aaaacc")),
    ("TOPPADDING", (0,0), (-1,-1), 4),
    ("BOTTOMPADDING", (0,0), (-1,-1), 4),
    ("LEFTPADDING", (0,0), (-1,-1), 5),
    ("VALIGN", (0,0), (-1,-1), "TOP"),
]))
story.append(ei_table)
story.append(Spacer(1,6))

story.append(Paragraph("8.2 Co-morbidity", sec_head))
story += bullet([
    "Externalising and internalising problems often co-occur. A depressed child may also show aggression; an anxious child may develop conduct problems.",
    "Trauma (e.g., abuse, neglect) commonly produces both externalising (aggression, risk-taking) and internalising (PTSD, depression) symptoms.",
    "Substance use is both an externalising behaviour and a way of self-medicating internalising distress.",
])
story += exam_tip("Draw the comparison table in your exam. Mention ADHD and CD as key externalising disorders; depression and anxiety as internalising. Always link to delinquency.")
story.append(PageBreak())

# ================================================================
# UNIT 9 — RISK & PROTECTIVE FACTORS
# ================================================================
story.append(accent_bar("UNIT 9 — Risk Factors & Protective Factors in Juvenile Delinquency"))
story.append(Spacer(1, 8))

story.append(Paragraph("9.1 Risk Factors", sec_head))
story += [Paragraph(p, body) for p in [
    "A risk factor is any characteristic, variable, or hazard that increases the probability of developing delinquent behaviour. Risk factors operate cumulatively — the more risk factors present, the higher the likelihood of delinquency.",
]]

risk_cats = [
    ("Individual/Biological Risk Factors", [
        "Male gender (testosterone, socialisation of aggression).",
        "Difficult temperament in infancy/childhood.",
        "Low intelligence/IQ; poor verbal skills.",
        "Attention-deficit/hyperactivity disorder (ADHD).",
        "Conduct disorder and oppositional defiant disorder.",
        "Early onset of behaviour problems (before age 10).",
        "Low resting heart rate; neurological deficits.",
        "Substance use and abuse.",
        "History of trauma, victimisation, or abuse.",
    ]),
    ("Family Risk Factors", [
        "Parental criminality — strongest single predictor (Farrington & West).",
        "Child abuse and neglect.",
        "Harsh, inconsistent, or neglectful parenting.",
        "Parental substance abuse.",
        "Family breakdown/instability (multiple relocations, frequent separations).",
        "Poor parent-child attachment.",
        "Family conflict and domestic violence.",
        "Large family size with inadequate supervision.",
        "Low family socioeconomic status (SES).",
    ]),
    ("School Risk Factors", [
        "Academic failure and poor school performance.",
        "Low commitment to school.",
        "School drop-out.",
        "Negative school climate (bullying, poor teacher-student relationships).",
        "Truancy and school absenteeism.",
        "Peer rejection in school setting.",
    ]),
    ("Peer Risk Factors", [
        "Association with delinquent or deviant peers.",
        "Gang membership.",
        "Peer rejection by mainstream peers.",
        "Peer pressure to engage in antisocial behaviour.",
    ]),
    ("Community/Neighbourhood Risk Factors", [
        "Poverty and economic deprivation.",
        "High crime neighbourhood.",
        "Drug availability.",
        "Lack of community resources (parks, youth centres).",
        "Community disorganisation and weak social controls.",
        "Discrimination (caste, ethnicity, gender) in Nepal.",
    ]),
    ("Macro-Level/Societal Risk Factors", [
        "Income inequality.",
        "Weak legal system and impunity.",
        "Media glorification of violence and crime.",
        "Cultural norms supporting aggression.",
        "Political instability (relevant in Nepal's context).",
    ]),
]
for cat, points in risk_cats:
    story.append(Paragraph(cat, sub_head))
    story += bullet(points)

story.append(Paragraph("9.2 Protective Factors", sec_head))
story += [Paragraph(p, body) for p in [
    "Protective factors reduce the impact of risk factors and increase resilience. They do not guarantee absence of delinquency but significantly lower probability.",
]]
prot = [
    ("Individual Protective Factors", [
        "High intelligence and good academic ability.",
        "Easy temperament and positive sociability.",
        "Strong self-regulation and impulse control.",
        "High self-esteem and self-efficacy.",
        "Problem-solving skills and coping strategies.",
        "Positive future orientation and goals.",
    ]),
    ("Family Protective Factors", [
        "Secure attachment to at least one caregiver.",
        "Authoritative parenting.",
        "Clear rules, expectations, and consistent discipline.",
        "High parental monitoring and supervision.",
        "Parental involvement in child's school and activities.",
        "Low family conflict.",
    ]),
    ("School & Peer Protective Factors", [
        "Academic success and positive school engagement.",
        "Positive relationships with at least one teacher or mentor.",
        "Association with prosocial peers.",
        "Participation in structured extracurricular activities.",
    ]),
    ("Community Protective Factors", [
        "Strong neighbourhood social cohesion.",
        "Access to youth services and mental health resources.",
        "Safe community with low crime rates.",
        "Religious/cultural institutions providing moral guidance.",
        "Mentor relationships outside the family.",
    ]),
]
for cat, points in prot:
    story.append(Paragraph(cat, sub_head))
    story += bullet(points)
story += exam_tip("Risk factors are often asked as 10-mark questions. Organise by domain (individual, family, school, peer, community). Know at least 3 factors per domain.")
story.append(PageBreak())

# ================================================================
# UNIT 10 — ADHD, ASD & DEVIANT BEHAVIOUR
# ================================================================
story.append(accent_bar("UNIT 10 — ADHD, Autism Spectrum Disorder & Childhood Deviant Behaviour"))
story.append(Spacer(1, 8))

story.append(Paragraph("10.1 Childhood Deviant Behaviour", sec_head))
story += [Paragraph(p, body) for p in [
    "Deviant behaviour in childhood refers to persistent patterns of behaviour that deviate significantly from social and developmental norms and cause significant impairment in functioning. Key disorders include:",
]]
deviant = [
    B("Oppositional Defiant Disorder (ODD)") + ": Pattern of angry/irritable mood, argumentative/defiant behaviour, and vindictiveness lasting ≥6 months. Precursor to Conduct Disorder (CD).",
    B("Conduct Disorder (CD)") + ": Repetitive and persistent pattern of behaviour violating the rights of others OR societal norms. Includes: aggression to people/animals, property destruction, deceitfulness/theft, serious rule violations (truancy, running away). Childhood-onset (before 10) has worse prognosis than adolescence-onset.",
    B("Reactive Attachment Disorder (RAD)") + ": Severely disturbed social relatedness following pathological caregiving. Closely linked to delinquency.",
]
story += bullet(deviant)

story.append(Paragraph("10.2 Attention-Deficit/Hyperactivity Disorder (ADHD)", sec_head))
story += [Paragraph(p, body) for p in [
    "ADHD is a neurodevelopmental disorder characterised by persistent patterns of inattention and/or hyperactivity-impulsivity that interfere with functioning or development. It is the MOST common childhood mental health disorder (5–10% of children worldwide).",
]]

story.append(Paragraph("Types/Presentations:", sub_head))
adhd_types = [
    B("Predominantly Inattentive") + ": Difficulties focusing, easily distracted, forgetful, loses things, doesn't follow through on tasks. Often missed (especially in girls) because less disruptive.",
    B("Predominantly Hyperactive-Impulsive") + ": Fidgets, talks excessively, interrupts, cannot wait, runs/climbs inappropriately, acts as if 'driven by a motor'.",
    B("Combined Presentation") + ": Both inattention and hyperactivity-impulsivity present. Most common and most clinically referred type.",
]
story += bullet(adhd_types)

story.append(Paragraph("Symptoms (DSM-5):", sub_head))
adhd_sym = [
    "Inattention: ≥6 symptoms (or ≥5 in adults) for ≥6 months in ≥2 settings.",
    "Hyperactivity/Impulsivity: ≥6 symptoms (or ≥5 in adults) for ≥6 months.",
    "Symptoms must cause significant functional impairment.",
    "Onset before age 12.",
]
story += bullet(adhd_sym)

story.append(Paragraph("Causes of ADHD:", sub_head))
adhd_causes = [
    B("Genetic") + ": Heritability ~75%; multiple genes involved (DAT1, DRD4, DRD5). Higher in first-degree relatives.",
    B("Neurological") + ": Reduced volume in prefrontal cortex, basal ganglia, and cerebellum. Dopamine and norepinephrine dysregulation.",
    B("Environmental") + ": Prenatal alcohol/tobacco exposure; lead poisoning; very preterm birth; low birth weight.",
    B("NOT caused by") + ": Poor parenting, too much sugar, too much screen time (though screen time may worsen symptoms).",
]
story += bullet(adhd_causes)

story.append(Paragraph("ADHD & Delinquency:", sub_head))
story += bullet([
    "ADHD increases delinquency risk 3–4x. Impulsivity leads to poor decision-making; low frustration tolerance to aggression.",
    "Academic failure secondary to ADHD → school dropout → delinquency pathway.",
    "Often co-occurs with ODD (30–40%) and CD (20–25%).",
    "Treatment: stimulant medication (methylphenidate/Ritalin, amphetamine/Adderall) + behavioural therapy + parent training.",
])

story.append(Paragraph("10.3 Autism Spectrum Disorder (ASD)", sec_head))
story += [Paragraph(p, body) for p in [
    "ASD is a neurodevelopmental disorder characterised by persistent deficits in social communication and interaction across multiple contexts, and restricted, repetitive patterns of behaviour, interests, or activities.",
]]
asd = [
    B("Core Symptom Domain 1 — Social Communication") + ": Deficits in social-emotional reciprocity; abnormal social approach; failure to initiate/respond to social interactions; reduced sharing of interests and emotions; poor integration of verbal and nonverbal communication; deficits in understanding relationships.",
    B("Core Symptom Domain 2 — Restricted/Repetitive Behaviour") + ": Stereotyped movements, use of objects or speech; insistence on sameness; highly restricted interests; hyper- or hypo-reactivity to sensory input.",
    B("Spectrum") + ": Ranges from highly functioning (previously 'Asperger's Syndrome') to those with severe communication and intellectual disabilities.",
    B("Prevalence") + ": ~1 in 36 children (CDC, 2023); more common in males (4:1 ratio).",
    B("Causes") + ": Highly genetic (heritability ~80%); multiple genes; advanced parental age; prenatal complications. NOT caused by vaccines (Wakefield's 1998 study definitively debunked).",
]
story += bullet(asd)

story.append(Paragraph("ASD vs ADHD — Key Differences:", sub_head))
vs_data = [
    [B("Feature"), B("ASD"), B("ADHD")],
    ["Core deficit", "Social communication & restricted behaviour", "Inattention and/or hyperactivity-impulsivity"],
    ["Social interest", "May lack interest in socialising", "WANTS to socialise but struggles with skills"],
    ["Routines", "Insists on routines; distressed by change", "Prefers novelty; bored by routine"],
    ["Attention", "Can hyperfocus on special interests", "Difficulty sustaining attention generally"],
    ["Repetitive behaviour", "Yes (core feature)", "Not a core feature"],
    ["Communication", "Pragmatic language deficits common", "Interrupting, talking too much"],
    ["Sensory", "Hyper/hypo-sensitivity common", "Sensory processing less central"],
    ["Medication", "No core med for ASD; symptom management", "Stimulant medication very effective"],
    ["Co-morbidity", "~30–50% also have ADHD", "~20% also have ASD features"],
]
vt = Table(vs_data, colWidths=[3.5*cm, 6.5*cm, 6.5*cm])
vt.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#2d4a8a")),
    ("TEXTCOLOR", (0,0), (-1,0), colors.white),
    ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
    ("FONTSIZE", (0,0), (-1,-1), 8.5),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.HexColor("#eef0fa"), colors.white]),
    ("GRID", (0,0), (-1,-1), 0.3, colors.HexColor("#aaaacc")),
    ("TOPPADDING", (0,0), (-1,-1), 4),
    ("BOTTOMPADDING", (0,0), (-1,-1), 4),
    ("LEFTPADDING", (0,0), (-1,-1), 5),
    ("VALIGN", (0,0), (-1,-1), "TOP"),
]))
story.append(vt)
story += exam_tip("ASD vs ADHD table is a direct 2082 exam question. Memorise: ASD = social/communication deficit + restricted behaviour; ADHD = inattention/hyperactivity. They can co-occur.")
story.append(PageBreak())

# ================================================================
# UNIT 11 — SITUATION IN NEPAL
# ================================================================
story.append(accent_bar("UNIT 11 — Situation of Children & Adolescents in Nepal"))
story.append(Spacer(1, 8))

story.append(Paragraph("11.1 Children's Rights Framework in Nepal", sec_head))
nepal_rights = [
    "Nepal ratified the UN Convention on the Rights of the Child (UNCRC) in 1990.",
    "The National Children's Act 2018 defines a child as anyone below 18 years.",
    "Juvenile Justice (Procedure) Act defines procedures for juvenile offenders and emphasises rehabilitation.",
    "The Child Protection Policy (2078 BS) mandates multi-sector coordination for child protection.",
]
story += bullet(nepal_rights)

story.append(Paragraph("11.2 Current Situation of Children in Nepal", sec_head))
nep_situation = [
    B("Child Labour") + ": Nepal has one of South Asia's highest child labour rates. Children work in brick kilns, carpet factories, domestic service, and agriculture. Child labour → school dropout → increased delinquency risk.",
    B("Child Marriage") + ": Despite legal age being 20 (with parental consent 18), child marriage (especially girls in rural areas) remains common. Leads to early pregnancy, school dropout, and vulnerability to abuse.",
    B("Trafficking") + ": Nepal is a source country for human trafficking, especially of girls to India and Gulf countries for sexual exploitation and domestic labour.",
    B("Street Children") + ": Thousands of street children in Kathmandu Valley, Pokhara, and Chitwan engage in survival crime.",
    B("Child Abuse") + ": Physical, emotional, and sexual abuse are widespread; severely under-reported due to stigma.",
    B("Education") + ": Despite improvements in enrollment, quality of education and retention (especially in rural/marginalised communities) remains poor.",
    B("Post-Conflict Impact") + ": A decade of Maoist armed conflict (1996–2006) resulted in thousands of child soldiers and displaced children.",
    B("Natural Disasters") + ": 2015 Gorkha earthquake orphaned/displaced thousands of children; disaster-affected children show increased vulnerability.",
]
story += bullet(nep_situation)

story.append(Paragraph("11.3 Juvenile Index Offences in Nepal — Trends & Current State", sec_head))
story += [Paragraph(p, body) for p in [
    "Index offences are crimes that are consistently tracked over time (like an 'index'). For juveniles in Nepal, this typically includes: theft, robbery, assault, rape, murder, and drug offences.",
]]
nepal_stats = [
    "Nepal Police records show that juvenile crime cases have shown fluctuating trends over the past decade.",
    "Theft and robbery constitute the majority of juvenile offences (~60%).",
    "Drug-related offences have increased significantly, particularly in urban areas (Kathmandu, Pokhara, Biratnagar).",
    "Violent offences (murder, rape) by juveniles, while less common, have increased in media visibility.",
    "Male juveniles account for the vast majority of recorded offences (~90%).",
    "Most delinquents are between 14–17 years at time of first offence.",
    "Major contributing factors in Nepal: poverty, family dysfunction, migration, lack of educational opportunities, gang influence, substance abuse.",
    "Nepal's juvenile justice system established Juvenile Correction Homes for rehabilitation, but resources are severely limited.",
    "The Juvenile Justice (Procedure) Act 2063 BS (2006 AD) established separate procedures for juvenile offenders including assessment committees and rehabilitation centres.",
    "Key challenges: overcrowded correction homes, lack of trained juvenile justice professionals, insufficient reintegration support.",
]
story += bullet(nepal_stats)
story += exam_tip("For '2078 Question 3 (15 marks)': Discuss the legal framework, types of offences, trends, and Nepal-specific risk factors. Mention specific laws and policies.")
story.append(PageBreak())

# ================================================================
# UNIT 12 — INTERVENTIONS
# ================================================================
story.append(accent_bar("UNIT 12 — Counselling, CBT & Psychosocial Intervention"))
story.append(Spacer(1, 8))

story.append(Paragraph("12.1 Psychosocial Intervention", sec_head))
story += [Paragraph(p, body) for p in [
    "Psychosocial intervention refers to any intervention that addresses the psychological, social, and relational aspects of an individual's wellbeing and functioning. In the context of delinquency, it encompasses a range of therapeutic, educational, and community-based strategies.",
]]
psi = [
    "Individual therapy (counselling, CBT, psychodynamic therapy).",
    "Family therapy and parent training.",
    "Group therapy and peer-support programmes.",
    "Community-based rehabilitation.",
    "School-based prevention programmes.",
    "Crisis intervention for acute situations.",
    "Case management and multi-agency coordination.",
]
story += bullet(psi)

story.append(Paragraph("12.2 Counselling", sec_head))
story += [Paragraph(p, body) for p in [
    "Counselling is a professional relationship that empowers diverse individuals, families, and groups to accomplish mental health, wellness, educational, and career goals. It uses therapeutic techniques to help clients understand themselves and their problems, and develop effective coping strategies.",
]]
counsel_features = [
    B("Humanistic Base") + ": Carl Rogers' Person-Centred Approach — three core conditions: Empathy (understanding client's perspective), Unconditional Positive Regard (non-judgemental acceptance), Congruence (therapist's authenticity).",
    B("Goals") + ": Insight, emotional processing, improved self-understanding, development of coping strategies, better interpersonal functioning.",
    B("Process") + ": Building rapport → assessment → goal-setting → intervention → evaluation → termination.",
    B("Techniques") + ": Active listening, reflection, paraphrasing, open-ended questions, summarising, challenging cognitive distortions.",
    B("For Adolescents") + ": Must be adapted: more directive, creative techniques (art, play, narrative therapy), shorter sessions, confidentiality issues (limits with parents).",
    B("For Delinquents") + ": Addresses underlying trauma, builds empathy, improves anger management, strengthens prosocial identity.",
]
story += bullet(counsel_features)

story.append(Paragraph("12.3 Cognitive Behavioural Therapy (CBT)", sec_head))
story += [Paragraph(p, body) for p in [
    "CBT is a structured, short-term, problem-focused psychotherapy based on the principle that thoughts, feelings, and behaviours are interconnected. Changing maladaptive thoughts changes feelings and behaviour.",
]]
cbt_pts = [
    B("Theoretical Basis") + ": Aaron Beck (cognitive therapy) + Albert Ellis (Rational Emotive Behaviour Therapy, REBT). Developed from behavioural therapy (classical and operant conditioning) + cognitive revolution.",
    B("The Cognitive Triad (Beck)") + ": Negative views of self ('I am worthless'), the world ('Everything is hopeless'), and the future ('Nothing will change').",
    B("Automatic Thoughts & Schemas") + ": Distorted automatic thoughts (e.g., 'Nobody likes me') arise from deep-seated cognitive schemas formed in childhood.",
    B("Cognitive Distortions") + ": All-or-nothing thinking, overgeneralisation, mental filter, disqualifying the positive, mind-reading, catastrophising, personalisation, should statements.",
    B("CBT Process") + ": Psychoeducation → identifying automatic thoughts → challenging/restructuring thoughts (Socratic questioning) → behavioural experiments → relapse prevention.",
    B("CBT for Delinquents") + ": Targets cognitive distortions that justify criminal behaviour (e.g., 'Victims deserve it'). Anger management, problem-solving skills training, victim empathy training.",
    B("Anger Management (CBT-based)") + ": Identify triggers → physiological cues → cognitive restructuring → behavioural strategies (time-out, relaxation).",
]
story += bullet(cbt_pts)

story.append(Paragraph("12.4 Counselling vs CBT — Key Differences", sec_head))
cc_data = [
    [B("Dimension"), B("Counselling"), B("CBT")],
    ["Focus", "Emotion, insight, relationships", "Thoughts, behaviours, symptoms"],
    ["Structure", "Less structured, client-led", "Highly structured, therapist-guided"],
    ["Duration", "Open-ended", "Time-limited (8–20 sessions typically)"],
    ["Techniques", "Active listening, reflection, empathy", "Thought records, behavioural experiments, homework"],
    ["Goal", "Self-understanding and growth", "Symptom reduction and skill-building"],
    ["Evidence base", "Strong for relational/existential issues", "Strong evidence-base for anxiety, depression, delinquency"],
    ["Homework", "Rare or informal", "Central component of treatment"],
    ["Theoretical roots", "Humanistic/existential/psychodynamic", "Cognitive and behavioural theory"],
]
cct = Table(cc_data, colWidths=[3.5*cm, 7*cm, 7*cm])
cct.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#2d4a8a")),
    ("TEXTCOLOR", (0,0), (-1,0), colors.white),
    ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
    ("FONTSIZE", (0,0), (-1,-1), 8.5),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.HexColor("#eef0fa"), colors.white]),
    ("GRID", (0,0), (-1,-1), 0.3, colors.HexColor("#aaaacc")),
    ("TOPPADDING", (0,0), (-1,-1), 4),
    ("BOTTOMPADDING", (0,0), (-1,-1), 4),
    ("LEFTPADDING", (0,0), (-1,-1), 5),
    ("VALIGN", (0,0), (-1,-1), "TOP"),
]))
story.append(cct)
story.append(Spacer(1,6))

story.append(Paragraph("12.5 Importance of Counselling for Adolescents", sec_head))
counsel_ado = [
    "Adolescence is a period of heightened emotional vulnerability — counselling provides a safe, non-judgemental space.",
    "Helps with identity confusion, family conflict, peer pressure, academic stress, and relationship issues.",
    "Early counselling can prevent escalation of mental health problems to more severe disorders.",
    "School counsellors provide accessible first-line mental health support.",
    "Counselling builds communication skills, emotional literacy, and resilience.",
    "In Nepal context: reduces shame and stigma around mental health if embedded in schools.",
]
story += bullet(counsel_ado)
story += exam_tip("Counselling vs CBT is a direct 2082 exam question. Memorise the table above — write at least 6 comparison points for full marks.")
story.append(PageBreak())

# ================================================================
# UNIT 13 — LIFE SKILLS & PREVENTION
# ================================================================
story.append(accent_bar("UNIT 13 — Life Skills Development & Prevention of Delinquency"))
story.append(Spacer(1, 8))

story.append(Paragraph("13.1 What are Life Skills?", sec_head))
story += [Paragraph(p, body) for p in [
    "The WHO (1997) defines life skills as abilities for adaptive and positive behaviour that enable individuals to deal effectively with the demands and challenges of everyday life. They are the psychosocial competencies that determine how we think, feel, and act.",
]]

story.append(Paragraph("13.2 WHO's Core Life Skills (10 Pairs)", sec_head))
ls_data = [
    [B("Life Skill"), B("Description")],
    ["1. Self-Awareness", "Understanding one's own strengths, weaknesses, needs, values, and reactions"],
    ["2. Empathy", "Understanding others' experiences, feelings, and perspectives"],
    ["3. Critical Thinking", "Analysing information and experiences objectively; questioning assumptions"],
    ["4. Creative Thinking", "Generating novel solutions; thinking outside conventional boundaries"],
    ["5. Decision Making", "Evaluating options, weighing consequences, and choosing wisely"],
    ["6. Problem Solving", "Identifying problems, generating and implementing solutions"],
    ["7. Effective Communication", "Expressing thoughts clearly verbally and non-verbally; active listening"],
    ["8. Interpersonal Skills", "Building positive relationships; managing conflict; negotiation"],
    ["9. Coping with Stress", "Recognising and managing stress from internal and external sources"],
    ["10. Coping with Emotions", "Recognising emotions in self and others; expressing them constructively"],
]
lst = Table(ls_data, colWidths=[4.5*cm, 12*cm])
lst.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#2d4a8a")),
    ("TEXTCOLOR", (0,0), (-1,0), colors.white),
    ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
    ("FONTSIZE", (0,0), (-1,-1), 9),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.HexColor("#eef0fa"), colors.white]),
    ("GRID", (0,0), (-1,-1), 0.3, colors.HexColor("#aaaacc")),
    ("TOPPADDING", (0,0), (-1,-1), 4),
    ("BOTTOMPADDING", (0,0), (-1,-1), 4),
    ("LEFTPADDING", (0,0), (-1,-1), 5),
    ("VALIGN", (0,0), (-1,-1), "TOP"),
]))
story.append(lst)
story.append(Spacer(1,6))

story.append(Paragraph("13.3 Life Skills and Prevention of Delinquency", sec_head))
story += [Paragraph(p, body) for p in [
    "Life skills programmes are among the most evidence-based approaches to primary prevention of delinquency because they address the underlying psychological and social deficits that lead to antisocial behaviour.",
]]
ls_delin = [
    B("Decision-Making Skills") + ": Delinquents often act impulsively without considering consequences. Training in decision-making teaches STOP-THINK-ACT sequences, reducing impulsive offending.",
    B("Problem-Solving") + ": Social problem-solving deficits (poor generation of prosocial solutions, hostile attribution bias) underlie much interpersonal violence. Training improves conflict resolution without aggression.",
    B("Interpersonal Skills") + ": Improving communication, assertiveness (not aggression), and negotiation reduces need for coercive behaviour.",
    B("Emotional Regulation") + ": Poor emotional regulation → anger outbursts, violence. Coping-with-emotions skill reduces reactive aggression.",
    B("Peer Resistance Skills") + ": 'Just Say No' programmes (substance use, delinquency) — teach adolescents to refuse peer pressure assertively.",
    B("Empathy Development") + ": Victim empathy training reduces criminal behaviour because offenders begin to understand the impact of their acts.",
    B("Critical Thinking") + ": Resisting media influence, gang recruitment, and extremist ideology requires critical evaluation skills.",
    B("Self-Awareness") + ": Understanding one's own triggers, values, and identity reduces identity-related risk-taking.",
]
story += bullet(ls_delin)

story.append(Paragraph("13.4 Life Skills Programmes in Schools (Nepal Context)", sec_head))
lsp_nepal = [
    "The Life Skills Based Education (LSBE) curriculum has been integrated into the national school curriculum by the Ministry of Education, Nepal.",
    "Delivered through interactive, participatory pedagogy (role-play, group discussion, games).",
    "Targets social and emotional competencies alongside academic skills.",
    "School-based programmes have the advantage of reaching all children, not just those already in trouble.",
    "Challenges in Nepal: inadequate teacher training, insufficient time allocation, inconsistent implementation.",
]
story += bullet(lsp_nepal)
story += exam_tip("Describe all 10 WHO life skills, then clearly link EACH to how it prevents a specific pathway to delinquency. This structure guarantees full marks.")
story.append(PageBreak())

# ================================================================
# UNIT 14 — SEX EDUCATION
# ================================================================
story.append(accent_bar("UNIT 14 — Sex Education & Reduction of Juvenile Delinquency"))
story.append(Spacer(1, 8))

story.append(Paragraph("14.1 What is Sex Education?", sec_head))
story += [Paragraph(p, body) for p in [
    "Comprehensive sex education (CSE) is a curriculum-based process of teaching and learning about the cognitive, emotional, physical, and social aspects of sexuality. It includes sexual and reproductive health, human development, gender, relationships, personal skills, and rights.",
    "CSE is distinct from abstinence-only education (AO) in that it provides medically accurate, age-appropriate information rather than focusing only on abstinence from sex.",
]]

story.append(Paragraph("14.2 Components of Comprehensive Sex Education", sec_head))
cse = [
    "Human development (puberty, anatomy, reproduction).",
    "Relationships (family, friendship, romantic, societal).",
    "Personal skills (communication, decision-making, assertiveness, consent).",
    "Sexual behaviour (abstinence, sexual expression, healthy relationships).",
    "Sexual health (contraception, STIs, pregnancy, HIV/AIDS).",
    "Society and culture (gender roles, media influence, cultural norms).",
    "Rights and responsibilities (legal rights, consent, protection from exploitation).",
]
story += bullet(cse)

story.append(Paragraph("14.3 Role of Sex Education in Reducing Juvenile Delinquency", sec_head))
sed_delin = [
    B("Prevention of Sexual Offences") + ": Education on consent, bodily autonomy, and sexual rights reduces sexual violence by juveniles. Adolescents who understand consent are less likely to commit sexual assault.",
    B("Reducing Exploitation Vulnerability") + ": Youth educated about grooming, trafficking, and exploitation are less vulnerable to being recruited into prostitution or used in pornography.",
    B("Addressing Curiosity-Driven Delinquency") + ": Adolescents denied accurate information often seek it through risky means. Proper sex education reduces curiosity-driven sexual experimentation and associated risk-taking.",
    B("Reducing Teen Pregnancy") + ": Unintended pregnancy is a pathway to school dropout, poverty, and single parenthood — all risk factors for both the parent and the child's later delinquency.",
    B("STI/HIV Prevention") + ": Reducing STIs and HIV reduces health crises that may push youth into sex work or criminal networks.",
    B("Gender Equality & Violence Prevention") + ": Sex education challenges gender stereotypes and norms supporting violence against women. Boys educated about gender equality commit fewer acts of gender-based violence.",
    B("Identity & Self-Esteem") + ": LGBTQ+ inclusive sex education reduces bullying, victimisation, and self-harm among sexual minority youth.",
    B("Healthy Relationship Skills") + ": Teaching communication, respect, and conflict resolution within relationships reduces intimate partner violence in adolescence.",
    B("Reduction of Shame & Guilt") + ": Shame around sexuality can lead to secrecy, risky behaviour, and victimisation. Normalising healthy sexuality reduces shame-driven deviance.",
    B("Nepal Context") + ": Nepal has high rates of child marriage, sexual abuse, and trafficking. CSE is vital but faces cultural resistance. LSBE curriculum includes age-appropriate sexuality education.",
]
story += bullet(sed_delin)
story += exam_tip("Link each component of sex education to a SPECIFIC delinquency pathway. The examiner wants to see the mechanism, not just 'it's good'.")
story.append(PageBreak())

# ================================================================
# UNIT 15 — QUICK REVISION
# ================================================================
story.append(accent_bar("UNIT 15 — Quick Revision: Key Theorists, Concepts & Mnemonics"))
story.append(Spacer(1, 8))

story.append(Paragraph("15.1 Key Theorists Summary", sec_head))
theorists = [
    ("Sigmund Freud", "Psychoanalytic theory; Id-Ego-Superego; delinquency = weak/corrupt superego"),
    ("John Bowlby", "Attachment theory; maternal deprivation; '44 Thieves Study'; affectionless psychopathy"),
    ("Mary Ainsworth", "Strange Situation; secure/anxious/avoidant attachment types"),
    ("Albert Bandura", "Social Learning Theory; modelling; Bobo Doll experiment; self-efficacy"),
    ("Erik Erikson", "Psychosocial stages; Identity vs Role Confusion (Stage 5); Fidelity"),
    ("James Marcia", "4 identity statuses: Achievement, Moratorium, Foreclosure, Diffusion"),
    ("Jean Piaget", "Cognitive and moral development; heteronomous vs autonomous morality"),
    ("Lawrence Kohlberg", "6 stages of moral development (3 levels); Heinz dilemma"),
    ("Carol Gilligan", "Critique of Kohlberg; ethics of care vs ethics of justice; gender differences"),
    ("Diana Baumrind", "4 parenting styles: Authoritative, Authoritarian, Permissive, Neglectful"),
    ("Robert Havighurst", "Developmental tasks framework"),
    ("Urie Bronfenbrenner", "Ecological systems theory (micro, meso, exo, macro, chrono systems)"),
    ("Robert Merton", "Strain theory; anomie; gap between goals and means"),
    ("Howard Becker", "Labelling theory; self-fulfilling prophecy; 'deviance is not a quality of an act'"),
    ("Travis Hirschi", "Social Bond/Control Theory; 4 bonds: attachment, commitment, involvement, belief"),
    ("Edwin Sutherland", "Differential Association theory; crime as learned behaviour"),
    ("Aaron Beck", "Cognitive Therapy; cognitive triad; automatic thoughts; CBT"),
    ("Albert Ellis", "REBT (Rational Emotive Behaviour Therapy); ABC model"),
    ("Carl Rogers", "Person-Centred Approach; empathy, unconditional positive regard, congruence"),
    ("Terrie Moffitt", "Life-course-persistent vs adolescence-limited delinquency"),
    ("Adrian Raine", "Neurobiology of violence; low resting heart rate; prefrontal cortex"),
    ("Cesare Lombroso", "Atavistic criminal; born criminal theory (historical, discredited)"),
    ("WHO (1997)", "10 core life skills definition and framework"),
]
th_data = [[B("Theorist"), B("Key Contribution")]] + theorists
th_table = Table(th_data, colWidths=[4.5*cm, 12*cm])
th_table.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#1a1a4e")),
    ("TEXTCOLOR", (0,0), (-1,0), colors.white),
    ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
    ("FONTSIZE", (0,0), (-1,-1), 8.5),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.HexColor("#f0f0fa"), colors.white]),
    ("GRID", (0,0), (-1,-1), 0.3, colors.HexColor("#aaaacc")),
    ("TOPPADDING", (0,0), (-1,-1), 3),
    ("BOTTOMPADDING", (0,0), (-1,-1), 3),
    ("LEFTPADDING", (0,0), (-1,-1), 5),
    ("VALIGN", (0,0), (-1,-1), "TOP"),
]))
story.append(th_table)
story.append(Spacer(1,8))

story.append(Paragraph("15.2 Mnemonics", sec_head))
mnemonics = [
    (B("Kohlberg's 6 Stages") + " (in order)", "'Old People Can Maintain Social Peace': Obedience, Personal interest, Conformity, Maintaining order, Social contract, Principles"),
    (B("Baumrind's Parenting") + " (2x2 grid)", "'High-High = Authoritative (BEST); High-Low = Authoritarian; Low-High = Permissive; Low-Low = Neglectful (WORST)'"),
    (B("Marcia's Identity Statuses"), "'AMID' = Achievement, Moratorium, Identity diffusion, Foreclosure (if you've been FORCEd, it's Foreclosure)"),
    (B("Bowlby's 4 Attachment Styles"), "Secure = 'Safe Sea'; Anxious-Ambivalent = 'Anxious Anchor'; Avoidant = 'Away Boat'; Disorganised = 'Drifting'"),
    (B("Risk Factor Domains"), "'I FSPCS' = Individual, Family, School, Peer, Community, Society"),
    (B("WHO 10 Life Skills"), "'SACC DD EIC C' = Self-awareness, Assertive communication, Creative thinking, Critical thinking, Decision-making, Dealing with stress, Empathy, Interpersonal skills, Coping with emotions, problem-solving (Close)"),
    (B("Social Bond Theory"), "'ACIB' = Attachment, Commitment, Involvement, Belief"),
]
for term, mem in mnemonics:
    story.append(Paragraph(f"• {term}: {mem}", bullet_style))

story.append(Paragraph("15.3 All Exam Questions Mapped to Units", sec_head))
q_map = [
    [B("Paper"), B("Question"), B("Unit(s) to Study")],
    ["2080 Q1", "Crime vs delinquency + biological factors", "Unit 1 + Unit 2"],
    ["2080 Q2", "Theories of moral development + role in delinquency", "Unit 4"],
    ["2080 Q3", "Life span stages important in juvenile delinquency", "Unit 5"],
    ["2080 Q4", "Characteristics & developmental tasks of late childhood", "Unit 6"],
    ["2080 Q5", "Culture and peers in adolescent development", "Unit 7"],
    ["2080 Q6", "Externalising vs internalising problems", "Unit 8"],
    ["2080 Q7", "Risk factors in juvenile delinquency", "Unit 9"],
    ["2080 Q8", "Life skill development + prevention of delinquency", "Unit 13"],
    ["2080 Q9", "Sex education + reduction of delinquency", "Unit 14"],
    ["2082 Q1", "Developmental tasks & hazards of childhood + parenting", "Unit 6"],
    ["2082 Q2", "Psychoanalytic theory + juvenile delinquency", "Unit 3"],
    ["2082 Q3", "Juvenile index offences in Nepal", "Unit 11"],
    ["2082 Q4", "Psychosocial intervention + counselling vs CBT", "Unit 12"],
    ["2082 Q5", "Gender factors + gender identity in adolescents", "Unit 7"],
    ["2082 Q6", "Childhood deviant behaviour + ASD vs ADHD", "Unit 10"],
    ["2082 Q7", "Risk factors in juvenile delinquency", "Unit 9"],
    ["2082 Q8", "Peer group in adolescent development", "Unit 7"],
    ["2082 Q9", "Moral behaviour + Kohlberg's theory", "Unit 4"],
    ["2078 Q1", "Psychoanalytic + attachment theory + delinquency", "Unit 3"],
    ["2078 Q2", "Characteristics & tasks of adolescents + role of parents", "Unit 7 + Unit 6"],
    ["2078 Q3", "Situation of children in Nepal", "Unit 11"],
    ["2078 Q4", "Identity development in adolescence", "Unit 7"],
    ["2078 Q5", "Social learning theory", "Unit 3"],
    ["2078 Q6", "Types of juvenile delinquency", "Unit 1"],
    ["2078 Q7", "Symptoms and causes of ADHD", "Unit 10"],
    ["2078 Q8", "Protective factors for juvenile delinquency", "Unit 9"],
    ["2078 Q9", "Importance of counselling for adolescents", "Unit 12"],
]
qm_table = Table(q_map, colWidths=[2.5*cm, 9*cm, 5*cm])
qm_table.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#1a1a4e")),
    ("TEXTCOLOR", (0,0), (-1,0), colors.white),
    ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
    ("FONTSIZE", (0,0), (-1,-1), 8.5),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.HexColor("#f0f0fa"), colors.white]),
    ("GRID", (0,0), (-1,-1), 0.3, colors.HexColor("#aaaacc")),
    ("TOPPADDING", (0,0), (-1,-1), 3),
    ("BOTTOMPADDING", (0,0), (-1,-1), 3),
    ("LEFTPADDING", (0,0), (-1,-1), 5),
    ("VALIGN", (0,0), (-1,-1), "TOP"),
]))
story.append(qm_table)

story.append(Spacer(1,10))
story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1a1a4e")))
story.append(Spacer(1,6))
story.append(Paragraph(
    "Best of luck with your exams! You have everything you need in this guide. "
    "Read each unit, focus on the highlighted Exam Tips, and practise writing full answers using the table comparisons as your backbone.",
    ParagraphStyle("final", fontSize=11, textColor=colors.HexColor("#1a1a4e"),
                   fontName="Helvetica-Bold", alignment=TA_CENTER, spaceAfter=6)
))

# ============================================================
# BUILD
# ============================================================
def add_page_number(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#888888"))
    canvas.drawString(2*cm, 1.2*cm, f"Psy. 423 — Adolescent & Juvenile Delinquency Study Guide")
    canvas.drawRightString(A4[0] - 2*cm, 1.2*cm, f"Page {doc.page}")
    canvas.restoreState()

doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
print("PDF created successfully.")