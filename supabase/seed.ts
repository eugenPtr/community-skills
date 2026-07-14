/**
 * Seed the 19 demo personas (issue #9) into the REMOTE Supabase project the
 * real app talks to — the "close to real world" path.
 *
 * Each persona becomes a genuine auth account via the GoTrue Admin API
 * (admin.createUser), so auth.users AND auth.identities are populated exactly
 * like a real signup. Then it upserts members / profiles / socials with the
 * service-role client (bypasses RLS). Same real-world path runs against local
 * or remote — just point --env-file at the right stack.
 *
 * Idempotent: re-running reuses an existing account matched by login email
 * instead of creating a duplicate. The generated auth UUID is the source of
 * truth for member_id.
 *
 * Run:  pnpm seed   (node --env-file=.env.local --import tsx supabase/seed.ts)
 *
 * Also seeds the DEV-* dev invite codes. This script is only ever run against a
 * seedable target — the local stack or the current demo project. The real prod
 * database is never seeded (invites there come from the Admin batch, issue #4),
 * so there is no in-code guard: the safety is operational — don't run `pnpm
 * seed` against real prod.
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the env
 * file. These never authenticate as a user — the login emails are synthetic
 * (@example.com); the public Contact Email lives in socials.email.
 *
 * Field mapping (persona text → profiles schema, which has no Projects table):
 *   skills                    ← persona Skills
 *   passions                  ← persona Passions
 *   heart_project_description ← persona Project #1 (heart_project_seeking = false)
 */
import { createClient } from "@supabase/supabase-js";
import { embedMember, supabaseEmbedMemberClient } from "@/lib/people-search/embed-member";
import { gatewayEmbedder } from "@/lib/people-search/ai-gateway";

type Socials = {
  phone?: string;
  email?: string; // public Contact Email, distinct from login email
  website?: string;
  linkedin?: string;
  facebook?: string;
  instagram?: string;
  x?: string;
};

type Persona = {
  loginEmail: string;
  name: string;
  location: string;
  skills: string;
  passions: string;
  heartProject: string;
  socials: Socials;
};

const personas: Persona[] = [
  {
    loginEmail: "ana.dumitrescu@example.com",
    name: "Andrei Dumitrescu",
    location: "București, România",
    skills:
      "Construiesc backend-uri solide și fluxuri de date — proiectez scheme Postgres, servicii event-driven, ETL și infrastructură de analiză. Mă pricep să scot date curate și ușor de interogat din surse haotice.",
    passions:
      "Pot să pierd ore întregi descurcând un model de date complicat, până se așază totul la locul lui; mă bucur sincer când o interogare care dura minute se întoarce instant.",
    heartProject:
      "Vreau să construiesc o platformă unde orice echipă să-și ia datele curate singură, fără să aștepte un inginer.",
    socials: { website: "github.com/andreid", linkedin: "linkedin.com/in/andreidumitrescu" },
  },
  {
    loginEmail: "iosif.marin@example.com",
    name: 'Iosif "Joe" Marin',
    location: "Timișoara, România",
    skills:
      "Construiesc case cu materiale moderne — structuri metalice, beton structural, panouri prefabricate și izolație eficientă energetic. Lucrez îngrijit, după cod, și prind drag de fiecare detaliu structural greu pe care reușesc să-l rezolv curat.",
    passions:
      "Prind viață pe șantier în zori, privind cum se ridică o structură exact după plan; mă încarcă un detaliu structural greu care se așază în sfârșit.",
    heartProject:
      "Vreau să fac case cu consum aproape zero de energie, pe care să și le permită oamenii obișnuiți.",
    socials: { phone: "+40 712 345 678", website: "joemarin.build", instagram: "instagram.com/joebuilds" },
  },
  {
    loginEmail: "bogdan.craciun@example.com",
    name: 'Bogdan "Bob" Crăciun',
    location: "Brașov, România",
    skills:
      "Construiesc cu materiale naturale și tradiționale — lemn, cob, tencuială de var, baloți de paie, piatră recuperată. Mă dedic caselor sănătoase, care respiră, și restaurării clădirilor vechi așa cum au fost făcute.",
    passions:
      "Sunt cel mai prezent cu mâinile în var și lemn, modelând un perete care respiră; găsesc liniște în ritmul lent și tactil al construcției naturale.",
    heartProject:
      "Vreau să construiesc case făcute doar din materiale naturale, care respiră și fac bine oamenilor din ele.",
    socials: { website: "craciunnatural.ro", facebook: "facebook.com/craciunnatural", instagram: "instagram.com/bobnatural" },
  },
  {
    loginEmail: "lucia.ferraro@example.com",
    name: "Liviu Fărcaș",
    location: "Cluj-Napoca, România",
    skills:
      "Lucrez în instalație, colaj și artă publică — transform spații și materiale găsite în lucrări în care poți intra. Creez împreună cu comunitatea și duc o comandă de la concept până la montaj.",
    passions:
      "Mă luminez când un spațiu gol și o grămadă de materiale găsite încep să devină ceva viu; mă simt acasă în mijlocul dezordonat al facerii.",
    heartProject:
      "Vreau să aduc artă în spațiile publice, făcută împreună cu oamenii din locul unde trăiește.",
    socials: { website: "liviufarcas.art", instagram: "instagram.com/liviufarcas" },
  },
  {
    loginEmail: "mihai.stan@example.com",
    name: "Mihai Stan",
    location: "Iași, România",
    skills:
      "Sunt pictor în ulei și muralist — portret, picturi murale de mari dimensiuni și palete de culoare care poartă o stare. Iau comenzi de la pânze mici la pereți cât o clădire și mă ocup de pregătirea suprafeței și de finisaje rezistente la exterior.",
    passions:
      "Intru în flow amestecând o culoare până când poartă exact starea pe care o caut; iubesc clipa în care un chip de pe pânză începe să-ți răspundă.",
    heartProject:
      "Vreau să redau cartierelor culoarea și starea, o fațadă pe rând.",
    socials: { website: "behance.net/mihaistan", instagram: "instagram.com/mihaipaints" },
  },
  {
    loginEmail: "carmen.velasco@example.com",
    name: "Cosmin Velea",
    location: "București, România",
    skills:
      "Construiesc brand și creștere de la poziționare până la canale — mesaj, strategie de conținut, campanii și email pe tot ciclul de viață. Caut povestea care face un produs să se lege și o transform într-un motor de creștere care se repetă.",
    passions:
      "Mă energizează clipa în care povestea adevărată a unui brand se așază în sfârșit la locul ei; iubesc când un mesaj clar devine avânt real.",
    heartProject:
      "Vreau să-mi ating libertatea financiară făcând ce-mi place — ajutând oameni și afaceri să construiască și să crească produse digitale.",
    socials: { email: "cosmin@velea.marketing", linkedin: "linkedin.com/in/cosminvelea", x: "x.com/cosminvelea" },
  },
  {
    loginEmail: "tudor.apostol@example.com",
    name: "Tudor Apostol",
    location: "Cluj-Napoca, România",
    skills:
      "Țin proiecte complexe pe drumul lor — definire, planificare, coordonare între echipe și proiectare de procese. Aduc structură calmă în haos: jaloane clare, oameni responsabili și urmărirea aceea neglamuroasă care duce lucrurile la capăt.",
    passions:
      "Mă bucur în liniște când haosul se așază într-un plan clar pe care toți îl pot urma; găsesc calm în a transforma o harababură în avânt.",
    heartProject:
      "Vreau să aduc ordine în proiecte haotice, ca lucrurile ambițioase să ajungă cu adevărat la final.",
    socials: { linkedin: "linkedin.com/in/tudorapostol" },
  },
  {
    loginEmail: "elena.radu@example.com",
    name: "Emil Radu",
    location: "București, România",
    skills:
      "Lucrez cu fondatori și lideri seniori — cultură de echipă, decizii sub presiune, conversații grele și creșterea managerilor. Îi ajut pe lideri să-și vadă punctele oarbe și să construiască echipe care au încredere unele în altele.",
    passions:
      "Sunt cel mai viu în încăpere când un lider își vede punctul orb și ceva se schimbă; iubesc liniștea încărcată dinaintea unei revelații.",
    heartProject:
      "Vreau să ajut liderii să crească echipe în care oamenii au încredere unii în alții.",
    socials: { email: "hello@emilradu.coach", website: "emilradu.coach", linkedin: "linkedin.com/in/emilradu" },
  },
  {
    loginEmail: "radu.pop@example.com",
    name: "Radu Pop",
    location: "Sibiu, România",
    skills:
      "Proiectez și pun în funcțiune sisteme electrice — proiectare electrică pentru clădiri, calcule de sarcină, tablouri, racordare la rețea și instalații solare cu baterii. Duc lucrurile de la schema monofilară până la sistemul verificat și pus sub tensiune.",
    passions:
      "Iubesc clipa în care un sistem gândit de mine pornește curat prima dată; intru în flow urmărind un circuit până când fiecare sarcină se echilibrează.",
    heartProject:
      "Vreau să aduc electricitate sigură, din soare și baterii, în locurile unde rețeaua nu ajunge.",
    socials: { phone: "+40 723 456 789", linkedin: "linkedin.com/in/radupop" },
  },
  {
    loginEmail: "sanda.niculae@example.com",
    name: "Sandu Niculae",
    location: "Timișoara, România",
    skills:
      "Proiectez hardware embedded și firmware — cablaj PCB, microcontrolere, integrare de senzori, IoT de consum mic și aducerea la viață a plăcilor noi. Duc un produs de la schemă, prin prototip, până la hardware care se poate fabrica.",
    passions:
      "Mă luminez când o placă proaspăt lipită pornește prima oară; pierd ore vânând un bug până la un singur registru care se poartă urât.",
    heartProject:
      "Vreau să duc produse electronice de la schiță până la hardware care chiar se poate fabrica.",
    socials: { website: "github.com/sandun", linkedin: "linkedin.com/in/sanduniculae" },
  },
  {
    loginEmail: "sofia.lindgren@example.com",
    name: "Sorin Lungu",
    location: "Brașov, România",
    skills:
      "Compun și produc muzică pentru film, jocuri și sala de concert — orchestrație, texturi electronice și teme muzicale. Citesc o scenă și scriu muzica de care are nevoie; pot să dirijez și să închei mixajul final.",
    passions:
      "Mă pierd ore în partitură, căutând motivul pe care îl cere o scenă; sunt cel mai prezent când sunetul și povestea se prind unul de altul.",
    heartProject:
      "Vreau să scriu muzica de care are nevoie o poveste, exact ce cere fiecare scenă.",
    socials: { website: "sorinlungu.music", instagram: "instagram.com/sorinlungu" },
  },
  {
    loginEmail: "dragos.ilie@example.com",
    name: "Dragoș Ilie",
    location: "Cluj-Napoca, România",
    skills:
      "Îndrum fondatori la început de drum — validarea ideii, strategie de finanțare, pitch și narațiune, și ocolirea greșelilor clasice. Am construit și vândut companii și dau sfaturi directe, din experiență.",
    passions:
      "Mă energizează scânteia din ochii unui fondator care tocmai și-a găsit unghiul; iubesc claritatea cu miză mare a unui pariu timpuriu și formator.",
    heartProject:
      "Vreau să ajut fondatorii la început de drum să ocolească greșelile evidente.",
    socials: { linkedin: "linkedin.com/in/dragosilie", x: "x.com/dragosilie" },
  },
  {
    loginEmail: "petra.novak@example.com",
    name: "Petru Novac",
    location: "Cluj-Napoca, România",
    skills:
      "Proiectez experiențe de produs cap-coadă — cercetare cu utilizatori, fluxuri, wireframe, UI de mare fidelitate și design systems. Fac puntea între ce au nevoie oamenii și ce se poate construi, și testez ca să fiu sigur.",
    passions:
      "Intru în flow când un flux încâlcit devine în sfârșit evident; iubesc să văd un om real trecând lin prin ceva ce am proiectat.",
    heartProject:
      "Vreau să fac produse pe care oamenii le înțeleg din prima.",
    socials: { website: "petrunovac.design", linkedin: "linkedin.com/in/petrunovac" },
  },
  {
    loginEmail: "alex.morgan@example.com",
    name: "Alex Moraru",
    location: "Cluj-Napoca, România",
    skills:
      "Sunt fotograf de documentar și portret — evenimente, ședințe de brand și povești foto de lungă durată. Lucrez mult cu lumina naturală, pun oamenii în largul lor și editez o ședință într-o poveste coerentă.",
    passions:
      "Sunt cel mai prezent vânând cadrul în care lumina, momentul și omul se aliniază; iubesc liniștea editării unei ședințe într-o poveste.",
    heartProject:
      "Vreau să spun în fotografii poveștile oamenilor și ale meseriilor pe care le țin vii.",
    socials: { website: "alexmoraru.photo", instagram: "instagram.com/alexmoraruphoto" },
  },
  {
    loginEmail: "vlad.georgescu@example.com",
    name: "Vlad Georgescu",
    location: "Brașov, România",
    skills:
      "Fac mobilă la comandă și tâmplărie de interior — îmbinări, mobilă din lemn masiv, piese încastrate și restaurarea pieselor vechi. Pornesc de la o schiță și ajung la un obiect îmbinat manual, care ține generații.",
    passions:
      "Mă pierd în ritmul tăierii unei îmbinări strânse cu mâna; iubesc mirosul de lemn proaspăt tăiat și o piesă care mă va supraviețui.",
    heartProject:
      "Vreau să fac mobilă lucrată manual, care să țină generații întregi.",
    socials: { phone: "+40 745 678 901", website: "georgescuwood.ro", instagram: "instagram.com/vladwoodwork" },
  },
  {
    loginEmail: "maria.costa@example.com",
    name: "Marian Costea",
    location: "Iași, România",
    skills:
      "Transform datele în decizii — modele predictive, experimente și testare A/B, sisteme de recomandare și explicarea limpede a rezultatelor pentru oameni non-tehnici. Mă simt la fel de bine într-un notebook și într-o ședință de strategie.",
    passions:
      "Mă luminez când un model scoate la iveală un tipar pe care nu-l văzuse nimeni; iubesc clipa în care datele transformă o bănuială într-o decizie clară.",
    heartProject:
      "Vreau să transform datele în decizii care chiar schimbă ce fac echipele.",
    socials: { website: "github.com/mariancostea", linkedin: "linkedin.com/in/mariancostea" },
  },
  {
    loginEmail: "irina.bancila@example.com",
    name: "Ionuț Băncilă",
    location: "Iași, România",
    skills:
      "Modelez și ridic la roată ceramică funcțională și sculpturală — chimia glazurilor, lucrul la roată și arderea în cuptor. Țin ateliere și iau comenzi pentru veselă și piese de galerie.",
    passions:
      "Sunt cel mai prezent la roată, centrând lutul până se face liniște în cameră; iubesc pariul deschiderii cuptorului după o ardere.",
    heartProject:
      "Vreau să fac ceramică pentru viața de zi cu zi, nu doar pentru raft.",
    socials: { website: "etsy.com/shop/ionutceramics", instagram: "instagram.com/ionutceramics" },
  },
  {
    loginEmail: "andrei.lupu@example.com",
    name: "Andrei Lupu",
    location: "București, România",
    skills:
      "Înregistrez, mixez și fac mastering — tracking în studio, sunet live, post-producție pentru film și tratarea acustică a camerelor. Cunosc și aparatura, și urechea, și scot un rezultat curat și echilibrat în condiții reale.",
    passions:
      "Mă pierd într-un mix căutând clipa în care o piesă începe brusc să respire; iubesc să reglez o cameră până sună în sfârșit adevărat.",
    heartProject:
      "Vreau ca muzica să sune bine și în afara camerei perfecte.",
    socials: { website: "soundcloud.com/andreilupu", linkedin: "linkedin.com/in/andreilupu" },
  },
  {
    loginEmail: "diana.marinescu@example.com",
    name: "Darius Marinescu",
    location: "Cluj-Napoca, România",
    skills:
      "Adun oameni și fac grupurile să funcționeze — design de evenimente, facilitare de ateliere, decizii de grup și construirea de comunități de voluntari. Creez spații în care oamenii se simt în siguranță să contribuie și unde deciziile chiar se iau.",
    passions:
      "Sunt cel mai viu când o cameră de străini devine un grup care decide împreună; iubesc să creez momentul în care oamenii se simt în siguranță să vorbească.",
    heartProject:
      "Vreau să ajut cât mai mulți bărbați să se simtă conectați cu ei înșiși și să simtă că aparțin unui mediu, prin cercurile de bărbați pe care le organizez.",
    socials: { linkedin: "linkedin.com/in/dariusmarinescu", facebook: "facebook.com/dariusfaciliteaza", instagram: "instagram.com/dariusfaciliteaza" },
  },
];

// Split a persona's display name into first/last for the profiles schema. The
// last whitespace-separated token is the last name; everything before it is the
// first name, so nickname forms survive (`Iosif "Joe" Marin` -> `Iosif "Joe"` /
// `Marin`).
function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/);
  const lastName = parts.pop() ?? "";
  return { firstName: parts.join(" "), lastName };
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. --env-file=.env.local)");
}

const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Unclaimed invite codes to walk through the magic-link → claim flow with.
// Seeded into whatever target this runs against (local or demo). The real prod
// DB is never seeded — invites there come from the Admin batch (issue #4).
const devInviteCodes = ["DEV-AAAA-0001", "DEV-AAAA-0002", "DEV-AAAA-0003"];

async function seedDevInvites() {
  const { error } = await admin
    .from("invites")
    .upsert(devInviteCodes.map((code) => ({ code })), { onConflict: "code" });
  if (error) throw new Error(`invites: ${error.message}`);
  console.log(`✓ ${devInviteCodes.length} invite codes.`);
}

// Find an existing auth user id by email, paging through the admin list.
async function findAuthIdByEmail(email: string): Promise<string | null> {
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
}

async function ensureAuthUser(p: Persona): Promise<string> {
  const existing = await findAuthIdByEmail(p.loginEmail);
  if (existing) return existing;
  const { data, error } = await admin.auth.admin.createUser({
    email: p.loginEmail,
    email_confirm: true,
    user_metadata: { name: p.name, seed: true },
  });
  if (error) throw new Error(`createUser ${p.loginEmail}: ${error.message}`);
  return data.user.id;
}

async function main() {
  await seedDevInvites();

  let created = 0;
  let reused = 0;
  for (const p of personas) {
    const before = await findAuthIdByEmail(p.loginEmail);
    const memberId = await ensureAuthUser(p);
    if (before) reused++;
    else created++;

    const m = await admin.from("members").upsert({ id: memberId, email: p.loginEmail }, { onConflict: "id" });
    if (m.error) throw new Error(`members ${p.loginEmail}: ${m.error.message}`);

    const { firstName, lastName } = splitName(p.name);
    const pr = await admin.from("profiles").upsert(
      {
        member_id: memberId,
        first_name: firstName,
        last_name: lastName,
        location: p.location,
        skills: p.skills,
        passions: p.passions,
        heart_project_description: p.heartProject,
        heart_project_seeking: false,
      },
      { onConflict: "member_id" },
    );
    if (pr.error) throw new Error(`profiles ${p.loginEmail}: ${pr.error.message}`);

    const s = await admin.from("socials").upsert(
      {
        member_id: memberId,
        phone: p.socials.phone ?? null,
        email: p.socials.email ?? null,
        website: p.socials.website ?? null,
        linkedin: p.socials.linkedin ?? null,
        facebook: p.socials.facebook ?? null,
        instagram: p.socials.instagram ?? null,
        x: p.socials.x ?? null,
      },
      { onConflict: "member_id" },
    );
    if (s.error) throw new Error(`socials ${p.loginEmail}: ${s.error.message}`);

    // Embed the persona so People Search is testable end-to-end straight after a
    // reset (story 29). This is the one place a reset reaches the network -- the
    // real Gateway embed -- so it needs AI_GATEWAY_API_KEY in the env file.
    await embedMember(
      { embedder: gatewayEmbedder, db: supabaseEmbedMemberClient(admin) },
      memberId,
    );

    console.log(`✓ ${p.name} <${p.loginEmail}> ${before ? "(reused)" : "(created)"} ${memberId}`);
  }
  console.log(`\nDone. ${personas.length} personas — ${created} created, ${reused} reused.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
