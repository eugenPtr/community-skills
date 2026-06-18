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
    name: "Ana Dumitrescu",
    location: "Bucharest, Romania",
    skills:
      "Designs reliable backends and data pipelines — Postgres schema design, event-driven services, ETL, and analytics infrastructure. Strong on scaling read-heavy systems and getting clean, queryable data out of messy sources.",
    passions:
      "Loses track of time untangling a gnarly data model until it finally clicks; quietly thrilled when a query that used to take minutes returns instantly.",
    heartProject:
      "Self-serve data platform — building infrastructure so any team can get clean, trustworthy data without waiting on an engineer.",
    socials: { website: "github.com/anad", linkedin: "linkedin.com/in/anadumitrescu" },
  },
  {
    loginEmail: "iosif.marin@example.com",
    name: 'Iosif "Joe" Marin',
    location: "Timișoara, Romania",
    skills:
      "Builds homes fast and precise with modern materials — steel framing, structural concrete, prefab panels, energy-efficient insulation. Specializes in tight timelines and code-compliant, low-maintenance structures.",
    passions:
      "Comes alive on site at first light, watching a precise frame go up exactly to plan; energized by cracking a tricky structural detail.",
    heartProject:
      "Net-zero homes at speed — on a mission to make low-energy, code-compliant homes buildable in a single season at normal cost.",
    socials: { phone: "+40 712 345 678", website: "joemarin.build", instagram: "instagram.com/joebuilds" },
  },
  {
    loginEmail: "bogdan.craciun@example.com",
    name: 'Bogdan "Bob" Crăciun',
    location: "Brașov, Romania",
    skills:
      "Builds with natural and traditional materials — timber framing, cob, lime plaster, straw-bale, reclaimed stone. Focuses on breathable, healthy, low-impact homes and restoring old buildings the way they were made.",
    passions:
      "Most present with his hands in lime and timber, shaping a wall that breathes; finds flow in the slow, tactile rhythm of natural building.",
    heartProject:
      "Homes that breathe — working toward houses built entirely from natural, breathable materials that are good for the people in them and the land.",
    socials: { website: "craciunnatural.ro", facebook: "facebook.com/craciunnatural", instagram: "instagram.com/bobnatural" },
  },
  {
    loginEmail: "lucia.ferraro@example.com",
    name: "Lucia Ferraro",
    location: "Lisbon, Portugal",
    skills:
      "Works across installation, collage, and public art — turns spaces and found materials into immersive pieces. Collaborates with communities to co-create work and is comfortable scoping commissions from concept to install.",
    passions:
      "Lights up when a raw space and a pile of found materials start becoming something alive; thrives in the messy middle of making.",
    heartProject:
      "Art that belongs to a place — creating immersive public installations co-made with the communities they live in.",
    socials: { website: "luciaferraro.art", instagram: "instagram.com/luciaferraro" },
  },
  {
    loginEmail: "mihai.stan@example.com",
    name: "Mihai Stan",
    location: "Iași, Romania",
    skills:
      "Oil painter and muralist — portraiture, large-scale wall murals, and color palettes that carry a mood. Takes commissions from small canvases to building-sized walls and handles surface prep and durable outdoor finishes.",
    passions:
      "Falls into deep flow mixing a color until it carries the exact mood; loves the moment a face on the canvas starts to look back.",
    heartProject:
      "City as canvas — aiming to give whole neighborhoods their mood back, one facade at a time.",
    socials: { website: "behance.net/mihaistan", instagram: "instagram.com/mihaipaints" },
  },
  {
    loginEmail: "carmen.velasco@example.com",
    name: "Carmen Velasco",
    location: "Barcelona, Spain",
    skills:
      "Builds growth and brand from positioning down to channels — messaging, content strategy, performance campaigns, and lifecycle email. Strong on finding the story that makes a product click and turning it into a repeatable acquisition engine.",
    passions:
      "Energized by the click when a brand's true story finally lands; loves watching a sharp message turn into real momentum.",
    heartProject:
      "Repeatable growth engine — helping founders find the story that makes a product click and turn it into acquisition that compounds.",
    socials: { email: "carmen@velasco.marketing", linkedin: "linkedin.com/in/carmenvelasco", x: "x.com/carmenvel" },
  },
  {
    loginEmail: "tudor.apostol@example.com",
    name: "Tudor Apostol",
    location: "Cluj-Napoca, Romania",
    skills:
      "Keeps complex projects on track — scoping, planning, cross-team coordination, and operational process design. Brings calm structure to chaos: clear milestones, owners, and the unglamorous follow-through that ships things.",
    passions:
      "Quietly thrilled when chaos resolves into a clear plan everyone can follow; finds calm in turning a mess into momentum.",
    heartProject:
      "Calm in complex delivery — bringing structure to chaotic projects so ambitious things actually ship.",
    socials: { linkedin: "linkedin.com/in/tudorapostol" },
  },
  {
    loginEmail: "elena.radu@example.com",
    name: "Elena Radu",
    location: "Bucharest, Romania",
    skills:
      "Coaches founders and senior leaders — team culture, decision-making under pressure, hard conversations, and growing managers. Helps leaders see their blind spots and build teams that trust each other.",
    passions:
      "Most alive in the room when a leader sees their blind spot and something shifts; loves the charged silence before a breakthrough.",
    heartProject:
      "Leaders who build trust — coaching founders to grow teams that trust each other and make hard calls well.",
    socials: { email: "hello@elenaradu.coach", website: "elenaradu.coach", linkedin: "linkedin.com/in/elenaradu" },
  },
  {
    loginEmail: "radu.pop@example.com",
    name: "Radu Pop",
    location: "Sibiu, Romania",
    skills:
      "Designs and commissions electrical power systems — building electrical design, load calculations, switchgear, grid connection, and solar/battery installations. Handles the path from single-line diagram to inspected, energized system.",
    passions:
      "Loves the moment a system he designed first energizes cleanly; finds flow tracing a circuit until every load balances.",
    heartProject:
      "Power off the grid — designing solar+storage systems that bring reliable electricity to places the grid doesn't reach.",
    socials: { phone: "+40 723 456 789", linkedin: "linkedin.com/in/radupop" },
  },
  {
    loginEmail: "sanda.niculae@example.com",
    name: "Sanda Niculae",
    location: "Timișoara, Romania",
    skills:
      "Designs embedded hardware and firmware — PCB layout, microcontrollers, sensor integration, low-power IoT, and bring-up/debug of new boards. Takes a product from schematic through prototype to manufacturable hardware.",
    passions:
      "Lights up when a freshly soldered board boots for the first time; loses hours chasing a bug down to a single misbehaving register.",
    heartProject:
      "Hardware that ships — set on taking embedded products from schematic all the way to manufacturable hardware.",
    socials: { website: "github.com/sandan", linkedin: "linkedin.com/in/sandaniculae" },
  },
  {
    loginEmail: "sofia.lindgren@example.com",
    name: "Sofia Lindgren",
    location: "Stockholm, Sweden",
    skills:
      "Composes and produces music for film, games, and the concert hall — orchestral scoring, electronic textures, and theme writing. Reads a scene and writes the music it needs; comfortable conducting and producing a final mix.",
    passions:
      "Disappears into a score for hours, hunting the one motif a scene is asking for; most present when sound and story lock together.",
    heartProject:
      "The music a scene needs — composing scores that listen to the story and write exactly what it asks for.",
    socials: { website: "sofialindgren.music", instagram: "instagram.com/sofialindgren" },
  },
  {
    loginEmail: "dragos.ilie@example.com",
    name: "Dragoș Ilie",
    location: "Cluj-Napoca, Romania",
    skills:
      "Mentors early founders — validating ideas, fundraising strategy, pitch and narrative, and avoiding common first-time mistakes. Has built and sold companies and gives direct, experience-backed advice.",
    passions:
      "Energized by the spark in a founder who just found their wedge; loves the high-stakes clarity of an early, formative bet.",
    heartProject:
      "Founders who skip the obvious mistakes — mentoring early teams through validation, fundraising, and narrative with direct, experience-backed advice.",
    socials: { linkedin: "linkedin.com/in/dragosilie", x: "x.com/dragosilie" },
  },
  {
    loginEmail: "petra.novak@example.com",
    name: "Petra Novak",
    location: "Ljubljana, Slovenia",
    skills:
      "Designs product experiences end-to-end — user research, flows, wireframes, high-fidelity UI, and design systems. Bridges what users need and what's buildable, and runs usability testing to prove it.",
    passions:
      "Hits flow when a tangled flow finally becomes obvious; loves watching a real user breeze through something she designed.",
    heartProject:
      "Products people understand instantly — designing end-to-end experiences and proving they work with real users.",
    socials: { website: "petranovak.design", linkedin: "linkedin.com/in/petranovak" },
  },
  {
    loginEmail: "alex.morgan@example.com",
    name: "Alex Morgan",
    location: "Cluj-Napoca, Romania",
    skills:
      "Documentary and portrait photographer — events, brand shoots, and long-form photo stories. Strong on natural light, putting people at ease, and editing a shoot into a coherent narrative.",
    passions:
      "Most present chasing the one frame where light, moment, and person align; loves the quiet of editing a shoot into a story.",
    heartProject:
      "Stories told in pictures — building long-form photo essays on people and the crafts they keep alive.",
    socials: { website: "alexmorgan.photo", instagram: "instagram.com/alexmorganphoto" },
  },
  {
    loginEmail: "vlad.georgescu@example.com",
    name: "Vlad Georgescu",
    location: "Brașov, Romania",
    skills:
      "Builds custom furniture and interior woodwork — joinery, hardwood furniture, built-ins, and restoration of old pieces. Works from a sketch to a finished, hand-joined object that lasts generations.",
    passions:
      "Loses himself in the rhythm of cutting a tight joint by hand; loves the smell of fresh-cut wood and a piece that will outlast him.",
    heartProject:
      "Furniture that outlives us — building hand-joined pieces meant to last generations.",
    socials: { phone: "+40 745 678 901", website: "georgescuwood.ro", instagram: "instagram.com/vladwoodwork" },
  },
  {
    loginEmail: "maria.costa@example.com",
    name: "Maria Costa",
    location: "Porto, Portugal",
    skills:
      "Turns data into decisions — predictive modeling, experimentation/AB testing, recommender systems, and clear communication of results to non-technical stakeholders. Equally happy in a notebook and in a strategy meeting.",
    passions:
      "Lights up when a model reveals a pattern no one saw; loves the moment data turns a hunch into a clear decision.",
    heartProject:
      "Decisions, not dashboards — turning data into models that actually change what teams do.",
    socials: { website: "github.com/mariacosta", linkedin: "linkedin.com/in/mariacosta" },
  },
  {
    loginEmail: "irina.bancila@example.com",
    name: "Irina Băncilă",
    location: "Iași, Romania",
    skills:
      "Hand-builds and throws functional and sculptural ceramics — glaze chemistry, wheel throwing, and kiln firing. Teaches workshops and takes commissions for tableware and gallery pieces.",
    passions:
      "Most present at the wheel, centering clay until the room goes quiet; loves the gamble of opening the kiln after a firing.",
    heartProject:
      "Beauty made to be used — making ceramics meant for daily life, not just the shelf.",
    socials: { website: "etsy.com/shop/irinaceramics", instagram: "instagram.com/irinaceramics" },
  },
  {
    loginEmail: "andrei.lupu@example.com",
    name: "Andrei Lupu",
    location: "Bucharest, Romania",
    skills:
      "Records, mixes, and masters audio — studio tracking, live sound, post-production for film, and acoustic treatment of rooms. Knows both the gear and the ear; gets a clean, balanced result under real-world constraints.",
    passions:
      "Disappears into a mix chasing the moment a track suddenly breathes; loves dialing in a room until it finally sounds true.",
    heartProject:
      "A clean result under real constraints — recording and mixing so music sounds right outside the perfect room.",
    socials: { website: "soundcloud.com/andreilupu", linkedin: "linkedin.com/in/andreilupu" },
  },
  {
    loginEmail: "diana.marinescu@example.com",
    name: "Diana Marinescu",
    location: "Cluj-Napoca, Romania",
    skills:
      "Brings people together and makes groups work — event design, workshop facilitation, group decision-making, and building volunteer communities. Creates spaces where people feel safe to contribute and decisions actually get made.",
    passions:
      "Most alive when a room of strangers becomes a group that decides together; loves designing the moment people feel safe to speak.",
    heartProject:
      "Spaces where decisions actually happen — designing gatherings where people feel safe to contribute and groups truly decide together.",
    socials: { linkedin: "linkedin.com/in/dianamarinescu", facebook: "facebook.com/dianafacilitates", instagram: "instagram.com/dianafacilitates" },
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
