import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useRef, useEffect } from "react";
import {
  Building2, Presentation, UserRound, Bot, Users,
  ArrowRight, Check, Globe, Menu, X, Mail, Phone, ChevronUp, Star, Sparkles,
  LayoutDashboard, LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import heroCafeImg from "@/assets/hero-collage-cafe.jpg";
import heroCallImg from "@/assets/hero-collage-call.jpg";
import heroMobileImg from "@/assets/hero-collage-mobile.jpg";
import heroTravelImg from "@/assets/hero-collage-travel.jpg";
import instructorMarkImg from "@/assets/instructor-mark.png";
import testimonialRekaImg from "@/assets/testimonial-reka.jpg";
import testimonialAdriennImg from "@/assets/testimonial-adrienn.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Több mint angol — Premium English Training for Professionals" },
      { name: "description", content: "Tailor-made, coaching-oriented English training for adults, managers and company leaders. Beyond language — preparation for a new era." },
      { property: "og:title", content: "Több mint angol — Premium English Training" },
      { property: "og:description", content: "Coaching-oriented professional English training for executives and driven adults." },
    ],
  }),
  component: Index,
});

type Lang = "en" | "hu" | "de";

const IMPRESSUM_DATA = {
  company: "Incantation Korlátolt Felelősségű Társaság",
  address: "9022 Győr, Bisinger József sétány 30. 3. em. 4. ajtó",
  emails: ["szommark@gmail.com", "szombathelyi.mark@tobbmintangol.hu"],
  registryNumber: "08-09-037063",
  court: "Győri Törvényszék Cégbírósága",
  taxNumber: "32636114-1-08",
  euTaxNumber: "HU32636114",
  taxStatus: "érvényes adószám",
  statusStart: "2024. 09. 03.",
  hosting: {
    name: "Websupport Magyarország Kft.",
    phone: "+36 1 700 2323",
    email: "info@mhosting.hu",
    address: "H-1119 Budapest, Fehérvári út 97-99.",
  },
} as const;

const PRIVACY_POLICY = {
  title: "Adatvédelmi (adatkezelési) tájékoztató",
  intro: `${IMPRESSUM_DATA.company} (a továbbiakban: Adatkezelő) az alábbiakban tájékoztatja Önt a nyelvtanfolyamok szervezésével összefüggésben végzett adatkezelési tevékenységéről, az Európai Parlament és a Tanács (EU) 2016/679 rendelete (GDPR), valamint az információs önrendelkezési jogról és az információszabadságról szóló 2011. évi CXII. törvény (Infotv.) alapján.`,
  effectiveDate: "Hatályos: 2026. 08. 10.",
  sections: [
    {
      heading: "1. Az adatkezelő adatai",
      list: [
        `Név: ${IMPRESSUM_DATA.company}`,
        `Székhely: ${IMPRESSUM_DATA.address}`,
        `Adószám / cégjegyzékszám: ${IMPRESSUM_DATA.taxNumber} / ${IMPRESSUM_DATA.registryNumber}`,
        `E-mail: ${IMPRESSUM_DATA.emails.join(", ")}`,
        "Telefon: 20/284-7797",
        "Képviselő: Szombathelyi Márk",
      ],
    },
    {
      heading: "2. A kezelt adatok köre",
      list: [
        "Azonosító adatok: név, születési hely és idő (amennyiben szükséges pl. igazolás kiállításához)",
        "Kapcsolattartási adatok: e-mail cím, telefonszám, lakcím/levelezési cím",
        "Tanfolyamhoz kapcsolódó adatok: jelentkezés adatai, választott kurzus, nyelvi szint, részvételi/haladási adatok",
        "Számlázási adatok: számlázási név és cím, a kifizetéshez szükséges adatok (a fizetés technikai lebonyolítása jellemzően külső szolgáltatón keresztül történik, bankkártyaadatot az Adatkezelő nem tárol)",
      ],
    },
    {
      heading: "3. Az adatkezelés céljai",
      list: [
        "A nyelvtanfolyamra történő jelentkezés, a szerződés (részvételi jogviszony) létrehozása és teljesítése, a tanfolyam megszervezése és lebonyolítása.",
        "A hatályos jogszabályok alapján kötelező adatszolgáltatási és bejelentési kötelezettségek teljesítése (pl. számviteli és adózási jogszabályok szerinti bizonylatolás, adóhatóság felé történő adatszolgáltatás).",
      ],
      footnote: "Az adatokat az Adatkezelő más célra – így különösen marketing, profilalkotás vagy harmadik fél számára történő értékesítés céljára – nem használja fel.",
    },
    {
      heading: "4. Az adatkezelés jogalapja",
      list: [
        "GDPR 6. cikk (1) bekezdés b) pont: a szerződés (tanfolyamra történő jelentkezés) teljesítéséhez szükséges adatkezelés.",
        "GDPR 6. cikk (1) bekezdés c) pont: az Adatkezelőre vonatkozó jogi kötelezettség (pl. számviteli, adó- és egyéb jogszabályi bejelentési kötelezettségek) teljesítése.",
      ],
    },
    {
      heading: "5. Az adatkezelés időtartama",
      list: [
        "A szerződés teljesítéséhez kapcsolódó adatokat a jogviszony (tanfolyam) lezárultáig, azt követően a jogszabályban előírt megőrzési időn belül (pl. számviteli bizonylatok esetén a Számv. tv. szerint 8 évig) kezeli az Adatkezelő.",
        "A jogi kötelezettség teljesítéséhez szükséges adatokat a vonatkozó jogszabályban meghatározott ideig őrzi meg.",
      ],
    },
    {
      heading: "6. Adattovábbítás, adatfeldolgozók",
      intro: "Az adatokhoz kizárólag az Adatkezelő e feladattal megbízott munkatársai, valamint az alábbi adatfeldolgozók férhetnek hozzá:",
      list: [
        "Könyvelési/számlázási szolgáltató: nincs megadva",
        "Online fizetési/számlázó rendszer üzemeltetője: nincs megadva",
        `Tárhely-/rendszerszolgáltató: ${IMPRESSUM_DATA.hosting.name} (${IMPRESSUM_DATA.hosting.address}, ${IMPRESSUM_DATA.hosting.phone}, ${IMPRESSUM_DATA.hosting.email})`,
      ],
      footnote: "Adatok továbbítására jogszabályi kötelezettség teljesítése esetén (pl. adóhatóság, egyéb hatóság megkeresésére) kerülhet sor.",
    },
    {
      heading: "7. Az érintettek jogai",
      intro: "Ön jogosult:",
      list: [
        "tájékoztatást kérni a kezelt adatairól,",
        "kérni az adatok helyesbítését, illetve – amennyiben jogszabály másképp nem rendelkezik – törlését,",
        "kérni az adatkezelés korlátozását,",
        "élni az adathordozhatósághoz való jogával,",
        "tiltakozni az adatkezelés ellen.",
      ],
      footnote: "Kérelmét a fenti elérhetőségeken terjesztheti elő; az Adatkezelő a kérelmet legkésőbb 30 napon belül megválaszolja.",
    },
    {
      heading: "8. Adatbiztonság",
      paragraph: "Az Adatkezelő megfelelő technikai és szervezési intézkedésekkel gondoskodik a kezelt adatok biztonságáról, védi azokat a jogosulatlan hozzáféréssel, megváltoztatással, továbbítással, nyilvánosságra hozatallal, törléssel vagy megsemmisítéssel, valamint véletlen megsemmisüléssel és sérüléssel szemben.",
    },
    {
      heading: "9. Jogorvoslat",
      paragraph: "Jogsérelem esetén Ön a Nemzeti Adatvédelmi és Információszabadság Hatósághoz (NAIH, 1055 Budapest, Falk Miksa utca 9–11., www.naih.hu) fordulhat panasszal, illetve jogait bíróság előtt is érvényesítheti.",
    },
    {
      heading: "10. A tájékoztató módosítása",
      paragraph: "Az Adatkezelő fenntartja a jogot jelen tájékoztató egyoldalú módosítására; a módosított tájékoztatót a honlapon teszi közzé.",
    },
  ],
} as const;

const translations = {
  en: {
    nav: { courses: "Courses", about: "About Us", reviews: "Reviews", blog: "Blog", contact: "Contact", cta: "Free Placement Test", ctaLoggedIn: "New Test", login: "Log in", dashboard: "Dashboard", signOut: "Sign out", signedOut: "Signed out" },
    hero: {
      eyebrow: "Premium English for a new era",
      title1: "Connect to the world.",
      title2: "Speak with ease.",
      title3: "Learn the trendiest way.",
      subtitle: "Tailor-made, coaching-oriented professional and general English language training for adults, managers, and company leaders.",
      ctaPrimary: "Start Your Journey",
      ctaResults: "Display My Test Results",
      ctaSecondary: "Explore Courses",
      badges: ["Adults & executives", "Coaching-led method", "Industry-specific tracks"],
    },
    value: {
      kicker: "Why choose us",
      title: "More than English — a competitive advantage",
      body: "Designed for driven professionals who want to go beyond basic language practice. We prepare you to understand, adapt, grow and flourish in a challenging global economy — through a blend of language education, real-world context and coaching techniques.",
      pills: ["Coaching mindset", "Real business context", "Measurable progress", "Executive-grade delivery"],
    },
    courses: {
      kicker: "Our courses",
      title: "Programs engineered for outcomes",
      learnMore: "Learn more",
      items: [
        { title: "Corporate English & German", desc: "Tailored language training for enterprises and business teams — English or German, delivered on-site or online.", tag: "B2B" },
        { title: "Presentation Skills in English", desc: "Structure, deliver and own the room — English presentation training for professionals.", tag: "Speak" },
        { title: "One-on-One Language Sessions", desc: "Fully personalized 1:1 coaching — your pace, your goals, your schedule.", tag: "1:1" },
        { title: "AI English", desc: "Practice with AI-powered tools between sessions — instant feedback, adaptive drills, real progress.", tag: "AI" },
        { title: "Business English Club", desc: "A recurring group format for professionals to practice, network and stay sharp in English.", tag: "Club" },
      ],
    },
    inquiry: {
      title: "Get in touch",
      descPrefix: "Leave your details and we'll follow up about",
      name: "Full name",
      email: "Email",
      company: "Company name",
      companyPh: "Acme Inc.",
      submit: "Send",
      success: "Thanks! We'll be in touch shortly.",
      error: "Something went wrong. Please try again.",
      nameError: "Please enter your name.",
      emailError: "Please enter a valid email.",
      companyError: "Please enter your company name.",
    },
    form: {
      kicker: "Free placement test",
      title: "Find your starting line",
      sub: "Create your account and we'll match you with the right track.",
      name: "Full name", email: "Email", password: "Password",
      focus: "What is your main focus area?",
      focusPh: "Select a focus area",
      focusOptions: ["Grammar"],
      focusComingSoon: "More focus areas (coming soon)",
      focusOther: "Other (specify)",
      focusOtherPh: "Tell us your specific focus",
      submit: "Get my placement",
    },
    about: {
      title: "About Us",
      instructors: [
        { role: "Founder & Lead Coach-Trainer", bio: "Teaching adults since 2007. History degree, systems programming qualification, certified professional coach, and extensive experience writing economic language exam tasks." },
      ],
    },
    testimonials: {
      kicker: "Reviews",
      title: "What our clients say",
      items: [
        { role: "Purchaser", quote: "The one-on-one lesson helped me a great deal in being able to deliver my professional presentation in a polished style. The material came together in a very short time — the lesson was marked by a flexible approach and shared brainstorming." },
        { role: "Mechanical / Design Engineer", quote: "I speak English much more naturally and confidently — even in unexpected situations." },
        { role: "Manager & Coach", quote: "We always talk about the things that concern me at the moment. Conveying my own thoughts helps me speak more fluently." },
        { role: "Company Manager, Electrical Engineer", quote: "My grammar, vocabulary, listening comprehension and speaking skills have improved a lot. Highly recommended to anyone frustrated with traditional systems." },
      ],
    },
    blog: { kicker: "Blog", title: "From our journal", readMore: "Read more" },
    footer: { rights: "All rights reserved.", privacy: "Privacy Policy", imp: "Impressum", reg: "Adult education registry number: B/2020/002545", tagline: "Premium, coaching-oriented English training for adults, executives and company leaders.", contactTitle: "Contact", legalTitle: "Legal", madeFor: "Made for driven professionals." },
    impressum: {
      title: "Impressum",
      company: "Company", address: "Registered address", email: "Email",
      registryNumber: "Company registration number", court: "Registered with", courtValue: "Registry Court of the Győr Regional Court",
      taxNumber: "Tax number", euTaxNumber: "EU VAT number", taxStatus: "Tax number status", taxStatusValue: "valid",
      statusStart: "Status effective from",
      hostingTitle: "Hosting provider", hostingName: "Provider", hostingPhone: "Phone", hostingEmail: "Email", hostingAddress: "Address",
      close: "Close",
    },
  },
  hu: {
    nav: { courses: "Kurzusok", about: "Rólunk", reviews: "Vélemények", blog: "Blog", contact: "Kapcsolat", cta: "Ingyenes szintfelmérő", ctaLoggedIn: "Új teszt", login: "Bejelentkezés", dashboard: "Irányítópult", signOut: "Kijelentkezés", signedOut: "Sikeres kijelentkezés" },
    hero: {
      eyebrow: "Prémium angol egy új korszakra",
      title1: "Kapcsolódj a világhoz.",
      title2: "Beszélj könnyedén.",
      title3: "Tanulj a legtrendibb módon.",
      subtitle: "Személyre szabott, coaching szemléletű szakmai és általános angol nyelvi képzés felnőtteknek, vezetőknek és cégtulajdonosoknak.",
      ctaPrimary: "Találd meg a szinted!",
      ctaResults: "Eredményeim megtekintése",
      ctaSecondary: "Kurzusok",
      badges: ["Felnőtteknek és vezetőknek", "Coaching szemléletű módszer", "Iparág-specifikus képzések"],
    },
    value: {
      kicker: "Miért minket válassz",
      title: "Több mint angol — versenyelőny",
      body: "Olyan, motivált ügyfeleknek készült, akik túl akarnak lépni az alap nyelvi gyakorláson. Felkészítünk arra, hogy megértsd, alkalmazkodj, fejlődj és kibontakozz a kihívásokkal teli globális gazdaságban — nyelvoktatás, valós kontextus és coaching technikák ötvözésével.",
      pills: ["Coaching szemlélet", "Valós üzleti kontextus", "Mérhető fejlődés", "Vezetői szintű minőség"],
    },
    courses: {
      kicker: "Kurzusaink",
      title: "Eredményekre tervezve",
      learnMore: "Tudj meg többet",
      items: [
        { title: "Vállalati angol és német", desc: "Vállalatoknak és üzleti csapatoknak szabott nyelvi képzés — angolul vagy németül, helyszínen vagy online.", tag: "B2B" },
        { title: "Prezentációs készségek angolul", desc: "Építsd fel, add elő és urald a termet — angol nyelvű prezentációs képzés szakembereknek.", tag: "Speak" },
        { title: "Egyéni nyelvórák", desc: "Teljesen személyre szabott 1:1 coaching — a saját tempódban, céljaid szerint, a te időbeosztásodhoz igazítva.", tag: "1:1" },
        { title: "AI angol", desc: "Gyakorolj MI-alapú eszközökkel az órák között — azonnali visszajelzés, adaptív feladatok, valódi fejlődés.", tag: "AI" },
        { title: "Business English Club", desc: "Visszatérő csoportos forma szakembereknek — gyakorlás, kapcsolatépítés és angol nyelvi frissesség.", tag: "Club" },
      ],
    },
    inquiry: {
      title: "Kapcsolatfelvétel",
      descPrefix: "Add meg az elérhetőségeid, és jelentkezünk ezzel kapcsolatban:",
      name: "Teljes név",
      email: "Email",
      company: "Cégnév",
      companyPh: "Cégnév Kft.",
      submit: "Küldés",
      success: "Köszönjük! Hamarosan jelentkezünk.",
      error: "Hiba történt. Próbáld újra.",
      nameError: "Add meg a neved.",
      emailError: "Érvénytelen e-mail cím.",
      companyError: "Add meg a céged nevét.",
    },
    form: {
      kicker: "Ingyenes szintfelmérő",
      title: "Találd meg a kiindulópontod",
      sub: "Hozd létre a fiókod és a megfelelő képzésre irányítunk.",
      name: "Teljes név", email: "Email", password: "Jelszó",
      focus: "Mi a fő fókuszterületed?",
      focusPh: "Válassz fókuszt",
      focusOptions: ["Nyelvtan"],
      focusComingSoon: "További fókuszterületek (hamarosan)",
      focusOther: "Egyéb (add meg)",
      focusOtherPh: "Írd le a saját fókuszod",
      submit: "Szintfelmérés indítása",
    },
    about: {
      title: "Rólunk",
      instructors: [
        { role: "Alapító és vezető coach-trainer", bio: "2007 óta tanít felnőtteket. Történész diploma, rendszerprogramozói képesítés, minősített professzionális coach, és kiterjedt tapasztalat gazdasági nyelvvizsga-feladatok írásában." },
      ],
    },
    testimonials: {
      kicker: "Vélemények",
      title: "Mit mondanak ügyfeleink",
      items: [
        { role: "Beszerző", quote: "Az egyéni óra sokat segített abban, hogy a szakmai prezentációmat választékos stílusban legyek képes megtartani. Nagyon rövid idő alatt összeállt az anyag, rugalmas hozzáállás, közös ötletelés jellemezte az órát." },
        { role: "Gépészmérnök, tervezőmérnök", quote: "Sokkal természetesebben és magabiztosabban beszélek angolul — még váratlan helyzetekben is." },
        { role: "Ügyvezető és coach", quote: "Mindig azokról a dolgokról beszélgetünk, amik éppen foglalkoztatnak. A saját gondolataim megfogalmazása segít, hogy folyékonyabban beszéljek." },
        { role: "Cégvezető, villamosmérnök", quote: "Sokat fejlődött a nyelvtani tudásom, a szókincsem, a hallás utáni értésem és a beszédkészségem. Bátran ajánlom mindenkinek, akit csalódottá tett a hagyományos oktatási rendszer." },
      ],
    },
    blog: { kicker: "Blog", title: "Legfrissebb bejegyzéseink", readMore: "Tovább" },
    footer: { rights: "Minden jog fenntartva.", privacy: "Adatvédelem", imp: "Impresszum", reg: "Felnőttképzési nyilvántartási szám: B/2020/002545", tagline: "Prémium, coaching szemléletű angol nyelvi képzés felnőtteknek, vezetőknek és cégtulajdonosoknak.", contactTitle: "Kapcsolat", legalTitle: "Jogi információk", madeFor: "Motivált szakembereknek készült." },
    impressum: {
      title: "Impresszum",
      company: "Cégnév", address: "Székhely", email: "Email",
      registryNumber: "Cégjegyzékszám", court: "Nyilvántartó bíróság", courtValue: "Győri Törvényszék Cégbírósága",
      taxNumber: "Adószám", euTaxNumber: "Közösségi adószám", taxStatus: "Adószám státusza", taxStatusValue: "érvényes adószám",
      statusStart: "Státusz kezdete",
      hostingTitle: "Tárhelyszolgáltató", hostingName: "Szolgáltató", hostingPhone: "Telefon", hostingEmail: "Email", hostingAddress: "Cím",
      close: "Bezárás",
    },
  },
  de: {
    nav: { courses: "Kurse", about: "Über uns", reviews: "Bewertungen", blog: "Blog", contact: "Kontakt", cta: "Kostenloser Einstufungstest", ctaLoggedIn: "Neuer Test", login: "Anmelden", dashboard: "Dashboard", signOut: "Abmelden", signedOut: "Abgemeldet" },
    hero: {
      eyebrow: "Premium-Englisch für eine neue Ära",
      title1: "Verbinde dich mit der Welt.",
      title2: "Sprich mit Leichtigkeit.",
      title3: "Lerne auf die trendigste Art.",
      subtitle: "Maßgeschneidertes, coaching-orientiertes Business- und Allgemeinenglisch für Erwachsene, Manager und Führungskräfte.",
      ctaPrimary: "Starte deine Reise",
      ctaResults: "Meine Testergebnisse anzeigen",
      ctaSecondary: "Kurse entdecken",
      badges: ["Erwachsene & Führungskräfte", "Coaching-orientierte Methode", "Branchenspezifische Programme"],
    },
    value: {
      kicker: "Warum wir",
      title: "Mehr als Englisch — ein Wettbewerbsvorteil",
      body: "Für ambitionierte Berufstätige, die über klassisches Sprachtraining hinausgehen wollen. Wir bereiten dich darauf vor, in einer fordernden globalen Wirtschaft zu verstehen, dich anzupassen, zu wachsen und zu glänzen — durch Sprache, realen Kontext und Coaching.",
      pills: ["Coaching-Ansatz", "Realer Geschäftskontext", "Messbarer Fortschritt", "Executive-Qualität"],
    },
    courses: {
      kicker: "Unsere Kurse",
      title: "Programme für echte Ergebnisse",
      learnMore: "Mehr erfahren",
      items: [
        { title: "Business-Englisch & -Deutsch", desc: "Maßgeschneidertes Sprachtraining für Unternehmen und Teams — Englisch oder Deutsch, vor Ort oder online.", tag: "B2B" },
        { title: "Präsentationstraining auf Englisch", desc: "Struktur, Vortrag und Souveränität — Präsentationstraining auf Englisch für Berufstätige.", tag: "Speak" },
        { title: "Einzelunterricht", desc: "Vollständig personalisiertes 1:1-Coaching — in deinem Tempo, nach deinen Zielen und deinem Zeitplan.", tag: "1:1" },
        { title: "KI-Englisch", desc: "Übe zwischen den Sitzungen mit KI-gestützten Tools — sofortiges Feedback, adaptive Übungen, echter Fortschritt.", tag: "AI" },
        { title: "Business English Club", desc: "Ein wiederkehrendes Gruppenformat für Berufstätige — Üben, Networking und sprachliche Frische auf Englisch.", tag: "Club" },
      ],
    },
    inquiry: {
      title: "Kontakt aufnehmen",
      descPrefix: "Gib deine Kontaktdaten ein, wir melden uns bezüglich:",
      name: "Voller Name",
      email: "E-Mail",
      company: "Firmenname",
      companyPh: "Firma GmbH",
      submit: "Senden",
      success: "Danke! Wir melden uns in Kürze.",
      error: "Etwas ist schiefgelaufen. Bitte erneut versuchen.",
      nameError: "Bitte gib deinen Namen ein.",
      emailError: "Ungültige E-Mail-Adresse.",
      companyError: "Bitte gib deinen Firmennamen ein.",
    },
    form: {
      kicker: "Kostenloser Einstufungstest",
      title: "Finde deinen Startpunkt",
      sub: "Erstelle dein Konto und wir finden den passenden Kurs.",
      name: "Voller Name", email: "E-Mail", password: "Passwort",
      focus: "Was ist dein Hauptfokus?",
      focusPh: "Fokus wählen",
      focusOptions: ["Grammatik"],
      focusComingSoon: "Weitere Themen (bald verfügbar)",
      focusOther: "Sonstiges (angeben)",
      focusOtherPh: "Beschreibe deinen Fokus",
      submit: "Einstufung erhalten",
    },
    about: {
      title: "Über uns",
      instructors: [
        { role: "Gründer & Leitender Coach-Trainer", bio: "Unterrichtet Erwachsene seit 2007. Geschichtsstudium, Qualifikation als Systemprogrammierer, zertifizierter professioneller Coach und umfangreiche Erfahrung im Verfassen von Wirtschaftssprachprüfungsaufgaben." },
      ],
    },
    testimonials: {
      kicker: "Bewertungen",
      title: "Was unsere Kunden sagen",
      items: [
        { role: "Einkäuferin", quote: "Die Einzelstunde hat mir sehr geholfen, meine fachliche Präsentation in einem gewählten Stil zu halten. Das Material kam in sehr kurzer Zeit zusammen — die Stunde war geprägt von einer flexiblen Herangehensweise und gemeinsamem Brainstorming." },
        { role: "Maschinenbau- / Konstruktionsingenieur", quote: "Ich spreche viel natürlicher und selbstbewusster Englisch — sogar in unerwarteten Situationen." },
        { role: "Geschäftsführerin & Coach", quote: "Wir sprechen immer über die Dinge, die mich gerade beschäftigen. Meine eigenen Gedanken auszudrücken hilft mir, flüssiger zu sprechen." },
        { role: "Firmenleiter, Elektroingenieur", quote: "Meine Grammatik, mein Wortschatz, mein Hörverständnis und meine Sprechfertigkeit haben sich stark verbessert. Ich empfehle es jedem, der von traditionellen Systemen enttäuscht ist." },
      ],
    },
    blog: { kicker: "Blog", title: "Aus unserem Journal", readMore: "Weiterlesen" },
    footer: { rights: "Alle Rechte vorbehalten.", privacy: "Datenschutz", imp: "Impressum", reg: "Erwachsenenbildungsregisternummer: B/2020/002545", tagline: "Maßgeschneidertes, coaching-orientiertes Englischtraining für Erwachsene, Führungskräfte und Unternehmensleiter.", contactTitle: "Kontakt", legalTitle: "Rechtliches", madeFor: "Für ambitionierte Berufstätige gemacht." },
    impressum: {
      title: "Impressum",
      company: "Firma", address: "Sitz", email: "E-Mail",
      registryNumber: "Handelsregisternummer", court: "Registergericht", courtValue: "Registergericht des Regionalgerichts Győr",
      taxNumber: "Steuernummer", euTaxNumber: "USt-IdNr.", taxStatus: "Steuernummer-Status", taxStatusValue: "gültige Steuernummer",
      statusStart: "Status gültig ab",
      hostingTitle: "Hosting-Anbieter", hostingName: "Anbieter", hostingPhone: "Telefon", hostingEmail: "E-Mail", hostingAddress: "Adresse",
      close: "Schließen",
    },
  },
} as const;

const courseMeta = [
  { icon: Building2, featured: true },
  { icon: Presentation, featured: false },
  { icon: UserRound, featured: true },
  { icon: Bot, featured: false },
  { icon: Users, featured: false },
];

const CORPORATE_COURSE_INDEX = 0;
const AI_ENGLISH_COURSE_INDEX = 3;
const AI_ENGLISH_URL = "https://aienglish.hu";

const instructors = [
  { name: "Márk Szombathelyi", initials: "MS", photo: instructorMarkImg },
];

const testimonials = [
  { name: "Réka Förhécz-Mihályi", photo: testimonialRekaImg },
  { name: "Attila" },
  { name: "Adrienn Varga-Horváth", photo: testimonialAdriennImg },
  { name: "Imi" },
];

const langLabels: Record<Lang, { label: string; flag: string }> = {
  en: { label: "English", flag: "EN" },
  hu: { label: "Magyar", flag: "HU" },
  de: { label: "Deutsch", flag: "DE" },
};

function Index() {
  const [lang, setLang] = useState<Lang>("hu");
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = translations[lang];
  const formRef = useRef<HTMLDivElement>(null);
  const coursesRef = useRef<HTMLDivElement>(null);
  const blogRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  type BlogCard = { slug: string; title: string; excerpt: string; image_url: string | null; published_at: string };
  const [blogPosts, setBlogPosts] = useState<BlogCard[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("slug, title, excerpt, image_url, published_at")
        .eq("published", true)
        .order("published_at", { ascending: false });
      if (data) setBlogPosts(data);
    })();
  }, []);
  useEffect(() => {
    if (window.location.hash === "#blog" && blogPosts.length > 0) {
      blogRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [blogPosts]);

  const [form, setForm] = useState({ name: "", email: "", focus: "" });
  const [focusChoice, setFocusChoice] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim();
    if (!name) return toast.error(lang === "hu" ? "Add meg a neved." : lang === "de" ? "Bitte gib deinen Namen ein." : "Please enter your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return toast.error(lang === "hu" ? "Érvénytelen e-mail cím." : lang === "de" ? "Ungültige E-Mail-Adresse." : "Please enter a valid email.");
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, focus: form.focus || null, language: lang }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSubmitted(true);
      toast.success(
        lang === "hu" ? "Köszönjük! Hamarosan jelentkezünk." :
        lang === "de" ? "Danke! Wir melden uns in Kürze." :
        "Thanks! We'll be in touch shortly."
      );
      if (data?.id) {
        if (data?.sessionToken) {
          try { sessionStorage.setItem(`lead-token:${data.id}`, data.sessionToken); } catch {}
        }
        navigate({ to: "/grammar-test/$leadId", params: { leadId: data.id } });
        return;
      }
      setForm({ name: "", email: "", focus: "" });
    } catch (err) {
      console.error(err);
      toast.error(
        lang === "hu" ? "Hiba történt. Próbáld újra." :
        lang === "de" ? "Etwas ist schiefgelaufen. Bitte erneut versuchen." :
        "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const [impressumOpen, setImpressumOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  const [inquiryCourseIndex, setInquiryCourseIndex] = useState<number | null>(null);
  const [inquiryForm, setInquiryForm] = useState({ name: "", email: "", company: "" });
  const [inquirySubmitting, setInquirySubmitting] = useState(false);
  const [inquirySubmitted, setInquirySubmitted] = useState(false);
  const isCorporateInquiry = inquiryCourseIndex === CORPORATE_COURSE_INDEX;

  const openInquiry = (i: number) => {
    setInquiryCourseIndex(i);
    setInquiryForm({ name: "", email: "", company: "" });
    setInquirySubmitted(false);
  };

  const handleInquirySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (inquiryCourseIndex === null) return;
    const name = inquiryForm.name.trim();
    const email = inquiryForm.email.trim();
    const company = inquiryForm.company.trim();
    if (!name) return toast.error(t.inquiry.nameError);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error(t.inquiry.emailError);
    if (isCorporateInquiry && !company) return toast.error(t.inquiry.companyError);

    setInquirySubmitting(true);
    try {
      const res = await fetch("/api/public/course-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          companyName: isCorporateInquiry ? company : undefined,
          course: t.courses.items[inquiryCourseIndex].title,
          language: lang,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setInquirySubmitted(true);
      toast.success(t.inquiry.success);
    } catch (err) {
      console.error(err);
      toast.error(t.inquiry.error);
    } finally {
      setInquirySubmitting(false);
    }
  };

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileOpen(false);
  };

  const [authUser, setAuthUser] = useState<{ email: string; name: string } | null>(null);
  useEffect(() => {
    let mounted = true;
    const apply = (user: { email?: string | null; user_metadata?: { name?: string } } | null) => {
      if (!mounted) return;
      if (user?.email) setAuthUser({ email: user.email, name: user.user_metadata?.name ?? user.email });
      else setAuthUser(null);
    };
    supabase.auth.getUser().then(({ data }) => apply(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => apply(s?.user ?? null));
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);
  const initials = authUser
    ? authUser.name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || authUser.email[0].toUpperCase()
    : "";
  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success(t.nav.signedOut);
  };

  const nav = useMemo(() => ([
    { key: "courses", label: t.nav.courses, onClick: () => scrollTo(coursesRef) },
    { key: "about", label: t.nav.about, onClick: () => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" }) },
    { key: "reviews", label: t.nav.reviews, onClick: () => document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth" }) },
    { key: "blog", label: t.nav.blog, onClick: () => scrollTo(blogRef) },
    { key: "contact", label: t.nav.contact, onClick: () => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" }) },
  ]), [t]);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <a href="#top" className="group flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--gradient-hero)] text-xs font-bold text-primary-foreground shadow-[var(--shadow-card)]">T</span>
            <span className="text-[15px] font-semibold tracking-tight">Több mint angol</span>
          </a>
          <nav className="hidden items-center gap-1 lg:flex">
            {nav.map((n) => (
              <button key={n.key} onClick={n.onClick}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                {n.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {authUser ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="hidden items-center gap-2 rounded-full border border-border bg-card px-2 py-1 pr-3 text-sm font-medium transition-colors hover:bg-muted sm:inline-flex">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-[var(--teal-accent)] text-xs font-semibold text-primary">{initials}</AvatarFallback>
                    </Avatar>
                    <span className="max-w-[140px] truncate">{authUser.name}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate({ to: "/dashboard" })}>
                    <LayoutDashboard className="mr-2 h-4 w-4" /> {t.nav.dashboard}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" /> {t.nav.signOut}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" onClick={() => navigate({ to: "/auth" })} className="hidden sm:inline-flex">
                {t.nav.login}
              </Button>
            )}
            <Button onClick={() => navigate({ to: "/free-placement-test" })} className="hidden bg-[var(--teal-accent)] text-primary hover:bg-[var(--teal-accent-strong)] sm:inline-flex">
              {authUser ? t.nav.ctaLoggedIn : t.nav.cta} <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
            <button onClick={() => setMobileOpen((o) => !o)} className="rounded-md p-2 text-foreground lg:hidden">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="border-t border-border bg-background lg:hidden">
            <div className="flex flex-col gap-1 px-5 py-3">
              {nav.map((n) => (
                <button key={n.key} onClick={n.onClick} className="rounded-md px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-muted">
                  {n.label}
                </button>
              ))}
              {authUser ? (
                <>
                  <Button variant="outline" onClick={() => navigate({ to: "/dashboard" })} className="mt-2">{t.nav.dashboard}</Button>
                  <Button variant="ghost" onClick={signOut}>{t.nav.signOut}</Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => navigate({ to: "/auth" })} className="mt-2">{t.nav.login}</Button>
              )}
              <Button onClick={() => navigate({ to: "/free-placement-test" })} className="mt-2 bg-[var(--teal-accent)] text-primary hover:bg-[var(--teal-accent-strong)]">
                {authUser ? t.nav.ctaLoggedIn : t.nav.cta}
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <section id="top" className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{ background: "var(--gradient-hero)" }}
        />
        <div className="absolute inset-0 -z-10 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, oklch(0.72 0.13 195 / 0.35), transparent 50%), radial-gradient(circle at 80% 60%, oklch(0.45 0.10 240 / 0.5), transparent 55%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-[-10%] top-1/2 -z-10 hidden h-[520px] w-[520px] -translate-y-1/2 rounded-full opacity-40 blur-3xl lg:block"
          style={{ background: "radial-gradient(circle, var(--teal-accent) 0%, transparent 70%)" }}
        />
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-12 lg:gap-10 lg:px-8 lg:py-28">
          <div className="lg:col-span-7 text-primary-foreground">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white/80 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-[var(--teal-accent)]" />
              {t.hero.eyebrow}
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              <span className="hero-line block bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent" style={{ animationDelay: "0ms" }}>{t.hero.title1}</span>
              <span className="hero-line mt-2 block text-white/90" style={{ animationDelay: "150ms" }}>{t.hero.title2}</span>
              <span
                className="hero-line hero-shimmer mt-2 block bg-clip-text text-transparent"
                style={{
                  animationDelay: "300ms, 0ms",
                  backgroundImage: "linear-gradient(90deg, var(--teal-accent) 0%, oklch(0.85 0.13 195) 50%, var(--teal-accent-strong) 100%)",
                }}
              >
                {t.hero.title3}
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
              {t.hero.subtitle}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              {authUser ? (
                <Button size="lg" onClick={() => navigate({ to: "/dashboard" })}
                  className="h-12 bg-[var(--teal-accent)] px-6 text-[15px] font-semibold text-primary shadow-[var(--shadow-elegant)] transition-all hover:-translate-y-0.5 hover:bg-[var(--teal-accent-strong)]">
                  {t.hero.ctaResults} <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              ) : (
                <Button size="lg" onClick={() => scrollTo(formRef)}
                  className="h-12 bg-[var(--teal-accent)] px-6 text-[15px] font-semibold text-primary shadow-[var(--shadow-elegant)] transition-all hover:-translate-y-0.5 hover:bg-[var(--teal-accent-strong)]">
                  {t.hero.ctaPrimary} <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              )}
              <Button size="lg" variant="outline" onClick={() => scrollTo(coursesRef)}
                className="h-12 border-white/30 bg-white/5 px-6 text-[15px] font-semibold text-white hover:bg-white/10 hover:text-white">
                {t.hero.ctaSecondary}
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-white/60">
              {t.hero.badges.map((b) => (
                <div key={b} className="flex items-center gap-2"><Check className="h-4 w-4 text-[var(--teal-accent)]" /> {b}</div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative mx-auto aspect-[5/6] w-full max-w-[460px]">
              {/* Soft teal glow behind collage */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10 rounded-[2rem] opacity-50 blur-3xl"
                style={{ background: "radial-gradient(circle at 60% 40%, var(--teal-accent) 0%, transparent 65%)" }}
              />

              {/* Card A — café (large, top-left) */}
              <div className="absolute left-0 top-0 w-[62%] -rotate-2 overflow-hidden rounded-2xl border border-white/15 shadow-[var(--shadow-elegant)] ring-1 ring-white/10 transition-transform duration-500 hover:-translate-y-1 hover:rotate-0">
                <img src={heroCafeImg} alt="Friends having a natural conversation in a modern café" width={1024} height={1024} className="aspect-[4/5] h-auto w-full object-cover" />
              </div>

              {/* Card B — call (medium, top-right, raised) */}
              <div className="absolute right-0 top-[8%] w-[46%] rotate-3 overflow-hidden rounded-2xl border border-white/15 shadow-[var(--shadow-elegant)] ring-1 ring-white/10 transition-transform duration-500 hover:-translate-y-1 hover:rotate-0">
                <img src={heroCallImg} alt="Professional on a laptop video call" width={1024} height={1024} className="aspect-square h-auto w-full object-cover" />
              </div>

              {/* Card C — mobile (medium, bottom-left) */}
              <div className="absolute bottom-0 left-[6%] w-[48%] rotate-2 overflow-hidden rounded-2xl border border-white/15 shadow-[var(--shadow-elegant)] ring-1 ring-white/10 transition-transform duration-500 hover:-translate-y-1 hover:rotate-0">
                <img src={heroMobileImg} alt="Modern learner with smartphone and headphones" width={1024} height={1024} className="aspect-square h-auto w-full object-cover" />
              </div>

              {/* Card D — travel (small floating) */}
              <div className="hero-float absolute -right-2 bottom-[10%] w-[42%] -rotate-3 overflow-hidden rounded-2xl border border-white/20 shadow-[var(--shadow-elegant)] ring-1 ring-white/10">
                <img src={heroTravelImg} alt="Traveler connecting globally on a smartphone" width={1024} height={1024} className="aspect-[4/5] h-auto w-full object-cover" />
              </div>

              {/* Floating chip */}
              <div className="absolute -left-3 top-[42%] inline-flex items-center gap-2 rounded-full border border-white/15 bg-primary/80 px-3 py-1.5 text-[11px] font-semibold text-white shadow-[var(--shadow-card)] backdrop-blur-xl">
                <Globe className="h-3.5 w-3.5 text-[var(--teal-accent)]" />
                Speak with the world
              </div>
              <div className="absolute -right-2 top-[2%] inline-flex items-center gap-1.5 rounded-full bg-[var(--teal-accent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary shadow-[var(--shadow-card)]">
                <Sparkles className="h-3 w-3" /> Live & real
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VALUE */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-12 lg:px-8">
          <div className="lg:col-span-5">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--teal-accent-strong)]">
              {t.value.kicker}
            </span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {t.value.title}
            </h2>
          </div>
          <div className="lg:col-span-7">
            <p className="text-lg leading-relaxed text-muted-foreground">{t.value.body}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {t.value.pills.map((p) => (
                <span key={p} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-sm font-medium text-foreground">
                  <Check className="h-3.5 w-3.5 text-[var(--teal-accent-strong)]" />
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* COURSES */}
      <section ref={coursesRef} id="courses" className="bg-secondary/40">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--teal-accent-strong)]">{t.courses.kicker}</span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{t.courses.title}</h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {t.courses.items.map((c, i) => {
              const meta = courseMeta[i];
              const Icon = meta.icon;
              return (
                <div key={c.title}
                  className={`group relative flex flex-col rounded-2xl border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)] ${meta.featured ? "border-[var(--teal-accent)]/40 ring-1 ring-[var(--teal-accent)]/20" : "border-border"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform group-hover:scale-105">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-[var(--teal-accent)]/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--teal-accent-strong)]">
                      {c.tag}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold tracking-tight">{c.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{c.desc}</p>
                  {i === AI_ENGLISH_COURSE_INDEX ? (
                    <a href={AI_ENGLISH_URL} target="_blank" rel="noopener noreferrer"
                      className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-[var(--teal-accent-strong)]">
                      {t.courses.learnMore} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </a>
                  ) : (
                    <button onClick={() => openInquiry(i)}
                      className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-[var(--teal-accent-strong)]">
                      {t.courses.learnMore} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* COURSE INQUIRY DIALOG */}
      <Dialog open={inquiryCourseIndex !== null} onOpenChange={(open) => { if (!open) setInquiryCourseIndex(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.inquiry.title}</DialogTitle>
            {inquiryCourseIndex !== null && (
              <DialogDescription>
                {t.inquiry.descPrefix} "{t.courses.items[inquiryCourseIndex].title}"
              </DialogDescription>
            )}
          </DialogHeader>
          <form onSubmit={handleInquirySubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inquiry-name">{t.inquiry.name}</Label>
              <Input id="inquiry-name" required maxLength={120} value={inquiryForm.name}
                onChange={(e) => setInquiryForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Jane Doe" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inquiry-email">{t.inquiry.email}</Label>
              <Input id="inquiry-email" type="email" required maxLength={255} value={inquiryForm.email}
                onChange={(e) => setInquiryForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="you@company.com" className="h-11" />
            </div>
            {isCorporateInquiry && (
              <div className="space-y-2">
                <Label htmlFor="inquiry-company">{t.inquiry.company}</Label>
                <Input id="inquiry-company" required maxLength={200} value={inquiryForm.company}
                  onChange={(e) => setInquiryForm((f) => ({ ...f, company: e.target.value }))}
                  placeholder={t.inquiry.companyPh} className="h-11" />
              </div>
            )}
            <Button type="submit" disabled={inquirySubmitting}
              className="h-12 w-full bg-[var(--teal-accent)] text-base font-semibold text-primary hover:bg-[var(--teal-accent-strong)] disabled:opacity-60">
              {inquirySubmitting ? "…" : t.inquiry.submit} <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
            {inquirySubmitted && (
              <p className="text-center text-sm text-[var(--teal-accent-strong)]">{t.inquiry.success}</p>
            )}
          </form>
        </DialogContent>
      </Dialog>

      {/* FORM */}
      <section ref={formRef} id="signup" className="relative isolate overflow-hidden bg-background">
        <div className="absolute inset-x-0 top-0 -z-10 h-2/3"
          style={{ background: "linear-gradient(180deg, oklch(0.96 0.012 250) 0%, transparent 100%)" }} />
        <div className="mx-auto max-w-2xl px-5 py-20 lg:px-8">
          <div className="rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-elegant)] sm:p-10">
            <div className="text-center">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--teal-accent-strong)]">{t.form.kicker}</span>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{t.form.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{t.form.sub}</p>
            </div>
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">{t.form.name}</Label>
                <Input id="name" required maxLength={120} value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Jane Doe" className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t.form.email}</Label>
                <Input id="email" type="email" required maxLength={255} value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="you@company.com" className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>{t.form.focus}</Label>
                <Select
                  value={focusChoice}
                  onValueChange={(v) => {
                    setFocusChoice(v);
                    setForm((f) => ({ ...f, focus: v }));
                  }}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={t.form.focusPh} />
                  </SelectTrigger>
                  <SelectContent>
                    {t.form.focusOptions.map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                    <SelectItem value={t.form.focusComingSoon} disabled>{t.form.focusComingSoon}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={submitting}
                className="h-12 w-full bg-[var(--teal-accent)] text-base font-semibold text-primary hover:bg-[var(--teal-accent-strong)] disabled:opacity-60">
                {submitting ? "…" : t.form.submit} <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
              {submitted && (
                <p className="text-center text-sm text-[var(--teal-accent-strong)]">
                  {lang === "hu" ? "Köszönjük! Hamarosan jelentkezünk e-mailben." :
                   lang === "de" ? "Danke! Wir melden uns per E-Mail." :
                   "Thanks! A confirmation email is on the way."}
                </p>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* INSTRUCTORS */}
      <section id="about" className="border-t border-border bg-secondary/30">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t.about.title}</h2>
          </div>
          <div className="mx-auto mt-12 grid max-w-2xl gap-6">
            {instructors.map((p, i) => {
              const info = t.about.instructors[i];
              return (
                <div key={p.name} className="group flex flex-col gap-5 rounded-2xl border border-border bg-card p-7 transition-all hover:shadow-[var(--shadow-card)] sm:flex-row">
                  {p.photo ? (
                    <img src={p.photo} alt={p.name} width={96} height={96}
                      className="h-24 w-24 shrink-0 rounded-2xl object-cover shadow-[var(--shadow-card)]" />
                  ) : (
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl text-2xl font-semibold text-primary-foreground shadow-[var(--shadow-card)]"
                      style={{ background: "var(--gradient-hero)" }}>
                      {p.initials}
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight">{p.name}</h3>
                    <div className="mt-0.5 text-sm font-medium text-[var(--teal-accent-strong)]">{info.role}</div>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{info.bio}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="reviews" className="bg-background">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--teal-accent-strong)]">{t.testimonials.kicker}</span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{t.testimonials.title}</h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {testimonials.map((r, i) => {
              const info = t.testimonials.items[i];
              return (
                <figure key={r.name} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-7 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]">
                  <div className="flex gap-0.5 text-[var(--teal-accent-strong)]">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                  </div>
                  <blockquote className="text-base leading-relaxed text-foreground">"{info.quote}"</blockquote>
                  <figcaption className="mt-auto flex items-center gap-3 border-t border-border pt-4">
                    {r.photo ? (
                      <img src={r.photo} alt={r.name} width={40} height={40}
                        className="h-10 w-10 shrink-0 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                        {r.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-semibold">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{info.role}</div>
                    </div>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </div>
      </section>

      {/* BLOG */}
      {blogPosts.length > 0 && (
        <section ref={blogRef} id="blog" className="border-t border-border bg-secondary/30">
          <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--teal-accent-strong)]">{t.blog.kicker}</span>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{t.blog.title}</h2>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {blogPosts.map((post) => (
                <Link key={post.slug} to="/blog/$slug" params={{ slug: post.slug }}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)]">
                  {post.image_url && (
                    <div className="aspect-[16/10] w-full overflow-hidden bg-muted">
                      <img src={post.image_url} alt={post.title} loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-6">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {new Date(post.published_at).toLocaleDateString(lang === "hu" ? "hu-HU" : lang === "de" ? "de-DE" : "en-GB", { year: "numeric", month: "long", day: "numeric" })}
                    </span>
                    <h3 className="mt-2 text-lg font-semibold leading-snug tracking-tight">{post.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors group-hover:text-[var(--teal-accent-strong)]">
                      {t.blog.readMore} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer id="contact" className="relative border-t border-border bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-3 lg:px-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--teal-accent)] text-xs font-bold text-primary">T</span>
              <span className="text-base font-semibold tracking-tight">Több mint angol</span>
            </div>
            <p className="mt-4 max-w-sm text-sm text-primary-foreground/70">
              {t.footer.tagline}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-primary-foreground/80">{t.footer.contactTitle}</h4>
            <ul className="mt-4 space-y-3 text-sm text-primary-foreground/75">
              <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-[var(--teal-accent)]" /> szombathelyi.mark@tobbmintangol.hu</li>
              <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-[var(--teal-accent)]" /> info@tobbmintangol.hu</li>
              <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-[var(--teal-accent)]" /> 20/284-7797</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-primary-foreground/80">{t.footer.legalTitle}</h4>
            <ul className="mt-4 space-y-3 text-sm text-primary-foreground/75">
              <li>{t.footer.reg}</li>
              <li className="flex gap-4">
                <button type="button" onClick={() => setPrivacyOpen(true)} className="hover:text-[var(--teal-accent)]">{t.footer.privacy}</button>
                <button type="button" onClick={() => setImpressumOpen(true)} className="hover:text-[var(--teal-accent)]">{t.footer.imp}</button>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 text-xs text-primary-foreground/60 lg:px-8">
            <span>© {new Date().getFullYear()} Több mint angol. {t.footer.rights}</span>
            <span className="hidden sm:inline">{t.footer.madeFor}</span>
          </div>
        </div>
      </footer>

      {/* IMPRESSUM DIALOG */}
      <Dialog open={impressumOpen} onOpenChange={setImpressumOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.impressum.title}</DialogTitle>
          </DialogHeader>
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="font-semibold text-foreground">{t.impressum.company}</dt>
              <dd className="text-muted-foreground">{IMPRESSUM_DATA.company}</dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">{t.impressum.address}</dt>
              <dd className="text-muted-foreground">{IMPRESSUM_DATA.address}</dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">{t.impressum.email}</dt>
              <dd className="text-muted-foreground">{IMPRESSUM_DATA.emails.join(", ")}</dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">{t.impressum.registryNumber}</dt>
              <dd className="text-muted-foreground">{IMPRESSUM_DATA.registryNumber}</dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">{t.impressum.court}</dt>
              <dd className="text-muted-foreground">{t.impressum.courtValue}</dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">{t.impressum.taxNumber}</dt>
              <dd className="text-muted-foreground">{IMPRESSUM_DATA.taxNumber}</dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">{t.impressum.euTaxNumber}</dt>
              <dd className="text-muted-foreground">{IMPRESSUM_DATA.euTaxNumber}</dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">{t.impressum.taxStatus}</dt>
              <dd className="text-muted-foreground">{t.impressum.taxStatusValue}</dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">{t.impressum.statusStart}</dt>
              <dd className="text-muted-foreground">{IMPRESSUM_DATA.statusStart}</dd>
            </div>
            <div className="border-t border-border pt-4">
              <dt className="font-semibold text-foreground">{t.impressum.hostingTitle}</dt>
              <dd className="mt-1 space-y-1 text-muted-foreground">
                <p>{t.impressum.hostingName}: {IMPRESSUM_DATA.hosting.name}</p>
                <p>{t.impressum.hostingPhone}: {IMPRESSUM_DATA.hosting.phone}</p>
                <p>{t.impressum.hostingEmail}: {IMPRESSUM_DATA.hosting.email}</p>
                <p>{t.impressum.hostingAddress}: {IMPRESSUM_DATA.hosting.address}</p>
              </dd>
            </div>
          </dl>
          <Button onClick={() => setImpressumOpen(false)} className="mt-2 h-11 w-full">
            {t.impressum.close}
          </Button>
        </DialogContent>
      </Dialog>

      {/* PRIVACY POLICY DIALOG */}
      <Dialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{PRIVACY_POLICY.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 text-sm">
            <p className="text-muted-foreground">{PRIVACY_POLICY.intro}</p>
            {PRIVACY_POLICY.sections.map((section) => (
              <div key={section.heading}>
                <h4 className="font-semibold text-foreground">{section.heading}</h4>
                {"intro" in section && section.intro && (
                  <p className="mt-1 text-muted-foreground">{section.intro}</p>
                )}
                {"paragraph" in section && section.paragraph && (
                  <p className="mt-1 text-muted-foreground">{section.paragraph}</p>
                )}
                {"list" in section && section.list && (
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                    {section.list.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                )}
                {"footnote" in section && section.footnote && (
                  <p className="mt-1 text-muted-foreground">{section.footnote}</p>
                )}
              </div>
            ))}
            <p className="text-xs text-muted-foreground">{PRIVACY_POLICY.effectiveDate}</p>
          </div>
          <Button onClick={() => setPrivacyOpen(false)} className="mt-2 h-11 w-full">
            {t.impressum.close}
          </Button>
        </DialogContent>
      </Dialog>

      {/* LANGUAGE DROP-UP */}
      <div className="fixed bottom-5 right-5 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-[var(--teal-accent)]/50">
              <Globe className="h-4 w-4 text-[var(--teal-accent-strong)]" />
              {langLabels[lang].flag}
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="mb-2 w-40">
            {(Object.keys(langLabels) as Lang[]).map((l) => (
              <DropdownMenuItem key={l} onClick={() => setLang(l)}
                className={`cursor-pointer ${l === lang ? "bg-muted font-semibold" : ""}`}>
                <span className="mr-2 text-xs font-bold text-muted-foreground">{langLabels[l].flag}</span>
                {langLabels[l].label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
