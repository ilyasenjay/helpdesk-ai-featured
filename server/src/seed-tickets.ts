import { PrismaClient, TicketStatus, TicketCategory } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { Prisma } from "./generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const TICKET_COUNT = 100;

const customers: { name: string; domain: string }[] = [
  { name: "Sarah Chen", domain: "gmail.com" },
  { name: "Marcus Johnson", domain: "outlook.com" },
  { name: "Priya Patel", domain: "yahoo.com" },
  { name: "David Kim", domain: "acme.io" },
  { name: "Emma Rodriguez", domain: "gmail.com" },
  { name: "James Wilson", domain: "initech.com" },
  { name: "Aisha Khan", domain: "hotmail.com" },
  { name: "Lucas Martin", domain: "globex.com" },
  { name: "Olivia Brown", domain: "gmail.com" },
  { name: "Noah Garcia", domain: "outlook.com" },
  { name: "Sophia Lee", domain: "wayneenterprises.com" },
  { name: "Ethan Davis", domain: "yahoo.com" },
  { name: "Mia Thompson", domain: "gmail.com" },
  { name: "Liam Anderson", domain: "starkindustries.com" },
  { name: "Ava Martinez", domain: "gmail.com" },
  { name: "Benjamin Clark", domain: "outlook.com" },
  { name: "Isabella Lewis", domain: "umbrellacorp.com" },
  { name: "Henry Walker", domain: "gmail.com" },
  { name: "Charlotte Hall", domain: "yahoo.com" },
  { name: "Alexander Young", domain: "hooli.com" },
  { name: "Amelia King", domain: "gmail.com" },
  { name: "Daniel Wright", domain: "outlook.com" },
  { name: "Grace Scott", domain: "gmail.com" },
  { name: "Samuel Green", domain: "acme.io" },
  { name: "Chloe Adams", domain: "yahoo.com" },
  { name: "Ryan Baker", domain: "gmail.com" },
  { name: "Zoe Nelson", domain: "outlook.com" },
  { name: "Nathan Carter", domain: "initech.com" },
  { name: "Lily Mitchell", domain: "gmail.com" },
  { name: "Owen Perez", domain: "hotmail.com" },
];

interface TicketTemplate {
  subject: string;
  body: string;
  category: TicketCategory | null;
}

const templates: TicketTemplate[] = [
  // General questions
  {
    subject: "How do I reset my account password?",
    body: "I'm locked out of my account and the reset email never arrives. Can someone help me regain access?",
    category: TicketCategory.GENERAL_QUESTION,
  },
  {
    subject: "Do you offer multi-user seats on the Pro plan?",
    body: "We're a team of 8 and want to know if the Pro plan supports multiple seats or if we need Business.",
    category: TicketCategory.GENERAL_QUESTION,
  },
  {
    subject: "What's the difference between Starter and Business plans?",
    body: "Trying to decide which plan fits us best — could you break down the feature differences?",
    category: TicketCategory.GENERAL_QUESTION,
  },
  {
    subject: "Can I export my data to CSV?",
    body: "I need to pull all of our records into a spreadsheet for an internal audit. Is there an export option?",
    category: TicketCategory.GENERAL_QUESTION,
  },
  {
    subject: "Is there a mobile app available?",
    body: "I'd like to check tickets on the go. Do you have an iOS or Android app, or just the web dashboard?",
    category: TicketCategory.GENERAL_QUESTION,
  },
  {
    subject: "How do I update my billing address?",
    body: "Our company moved offices and I need to update the billing address on file for invoices.",
    category: TicketCategory.GENERAL_QUESTION,
  },
  {
    subject: "Do you support Single Sign-On (SSO)?",
    body: "Our IT department requires SSO via Okta for any tool we adopt. Is this supported on your platform?",
    category: TicketCategory.GENERAL_QUESTION,
  },
  {
    subject: "What time zone are your support hours in?",
    body: "We're based in Singapore and want to know when live support is actually available to us.",
    category: TicketCategory.GENERAL_QUESTION,
  },
  {
    subject: "Can I invite external contractors to my workspace?",
    body: "We work with freelancers occasionally and want to know if guest access is possible without a full seat.",
    category: TicketCategory.GENERAL_QUESTION,
  },
  {
    subject: "How do I switch from monthly to annual billing?",
    body: "We'd like to save with annual billing — how do we make the switch without losing our current cycle credit?",
    category: TicketCategory.GENERAL_QUESTION,
  },
  {
    subject: "Is there a public API I can integrate with?",
    body: "We want to sync ticket data into our internal BI tool. Do you expose a REST or GraphQL API?",
    category: TicketCategory.GENERAL_QUESTION,
  },
  {
    subject: "Do you have a referral program?",
    body: "I've recommended you to two other companies already — is there a referral discount or credit available?",
    category: TicketCategory.GENERAL_QUESTION,
  },
  {
    subject: "How long is data retained after account deletion?",
    body: "For compliance reasons we need to know your data retention policy after we close an account.",
    category: TicketCategory.GENERAL_QUESTION,
  },
  {
    subject: "Can I white-label the customer portal?",
    body: "We'd like our own logo and domain on the support portal our customers see. Is white-labeling available?",
    category: TicketCategory.GENERAL_QUESTION,
  },
  {
    subject: "What's included in the free trial?",
    body: "Before committing, I want to understand what features are locked during the 14-day trial.",
    category: TicketCategory.GENERAL_QUESTION,
  },

  // Technical questions
  {
    subject: "App crashes when uploading a file larger than 10MB",
    body: "Every time I attach a file over 10MB the browser tab freezes and eventually crashes. Happens on Chrome and Firefox.",
    category: TicketCategory.TECHNICAL_QUESTION,
  },
  {
    subject: "Cannot log in on mobile — stuck on loading screen",
    body: "On my iPhone, the login screen just spins forever after I enter my credentials. Works fine on desktop.",
    category: TicketCategory.TECHNICAL_QUESTION,
  },
  {
    subject: "Dashboard charts aren't rendering in Safari",
    body: "All the analytics charts show up blank in Safari 17 but render fine in Chrome. Console shows a canvas error.",
    category: TicketCategory.TECHNICAL_QUESTION,
  },
  {
    subject: "Getting a 500 error when saving settings",
    body: "Whenever I try to save changes on the settings page I get an internal server error. Started yesterday.",
    category: TicketCategory.TECHNICAL_QUESTION,
  },
  {
    subject: "Two-factor authentication codes never arrive",
    body: "I enabled 2FA via SMS but the verification code never shows up on my phone, even after multiple resends.",
    category: TicketCategory.TECHNICAL_QUESTION,
  },
  {
    subject: "Webhook payloads are missing the customer_id field",
    body: "Our integration broke because the ticket.created webhook stopped including customer_id in the payload.",
    category: TicketCategory.TECHNICAL_QUESTION,
  },
  {
    subject: "Search results are returning stale data",
    body: "I updated a ticket's status but search results still show the old status even after a hard refresh.",
    category: TicketCategory.TECHNICAL_QUESTION,
  },
  {
    subject: "Slack integration stopped posting notifications",
    body: "New ticket alerts used to post to our #support channel automatically, but it's been silent for two days.",
    category: TicketCategory.TECHNICAL_QUESTION,
  },
  {
    subject: "Bulk CSV import fails silently",
    body: "I uploaded a 500-row CSV to bulk-create tickets and the page just shows a spinner forever with no error.",
    category: TicketCategory.TECHNICAL_QUESTION,
  },
  {
    subject: "Dark mode toggle doesn't persist after refresh",
    body: "I switch to dark mode but it resets back to light mode every time I reload the page.",
    category: TicketCategory.TECHNICAL_QUESTION,
  },
  {
    subject: "API returns 429 rate limit errors under normal usage",
    body: "We're well under the documented rate limit but still getting throttled on the /tickets endpoint.",
    category: TicketCategory.TECHNICAL_QUESTION,
  },
  {
    subject: "Password reset link expires immediately",
    body: "I click the reset link from the email within seconds of receiving it and it already says the link expired.",
    category: TicketCategory.TECHNICAL_QUESTION,
  },
  {
    subject: "Notifications are delayed by several hours",
    body: "Email notifications for new replies are arriving 3-4 hours late, which is causing us to miss SLAs.",
    category: TicketCategory.TECHNICAL_QUESTION,
  },
  {
    subject: "Exported PDF reports are missing the last page",
    body: "Every PDF export of our monthly report cuts off the final page of the ticket summary table.",
    category: TicketCategory.TECHNICAL_QUESTION,
  },
  {
    subject: "Custom domain SSL certificate won't validate",
    body: "We pointed support.ourcompany.com at your platform but the SSL certificate has been stuck 'pending' for a week.",
    category: TicketCategory.TECHNICAL_QUESTION,
  },

  // Refund requests
  {
    subject: "Requesting a refund for accidental annual upgrade",
    body: "I meant to renew monthly but accidentally clicked the annual plan. Please refund the difference.",
    category: TicketCategory.REFUND_REQUEST,
  },
  {
    subject: "Charged twice for the same invoice this month",
    body: "My card statement shows two identical charges from you on the same day. Please refund the duplicate.",
    category: TicketCategory.REFUND_REQUEST,
  },
  {
    subject: "Cancelled subscription but still got billed",
    body: "I cancelled last month and got a confirmation email, but I was charged again this billing cycle.",
    category: TicketCategory.REFUND_REQUEST,
  },
  {
    subject: "Refund request: service didn't meet the advertised uptime SLA",
    body: "Your status page shows 6 hours of downtime last month, well below the 99.9% SLA we're paying for.",
    category: TicketCategory.REFUND_REQUEST,
  },
  {
    subject: "Please refund the add-on I purchased by mistake",
    body: "I clicked the wrong button and purchased the analytics add-on, which we don't actually need. Refund please.",
    category: TicketCategory.REFUND_REQUEST,
  },
  {
    subject: "Billed for 15 seats but only using 5 — refund the difference",
    body: "We downsized our team months ago but billing never adjusted the seat count. Please refund the overage.",
    category: TicketCategory.REFUND_REQUEST,
  },
  {
    subject: "Refund needed: downgraded plan but charged old price",
    body: "I downgraded to Starter three weeks ago but this month's invoice still reflects the Business plan price.",
    category: TicketCategory.REFUND_REQUEST,
  },
  {
    subject: "Requesting refund after last week's outage",
    body: "We were unable to access the platform for most of Tuesday. We'd like a prorated refund for the downtime.",
    category: TicketCategory.REFUND_REQUEST,
  },
  {
    subject: "Trial converted to paid without my confirmation",
    body: "My free trial ended and converted to a paid annual plan automatically without any confirmation step. Refund please.",
    category: TicketCategory.REFUND_REQUEST,
  },
  {
    subject: "Refund for duplicate PayPal payment",
    body: "PayPal shows I was charged twice for this month's subscription. Can you refund one of the transactions?",
    category: TicketCategory.REFUND_REQUEST,
  },

  // Uncategorized / general support
  {
    subject: "Need help getting started with the platform",
    body: "We just signed up and aren't sure where to begin. Is there an onboarding guide or checklist?",
    category: null,
  },
  {
    subject: "Question about my account status",
    body: "I'm not sure if my account is active or suspended — the dashboard just shows a blank screen.",
    category: null,
  },
  {
    subject: "Following up on a previous conversation",
    body: "I spoke with someone on chat last week about an issue but never heard back. Following up here.",
    category: null,
  },
  {
    subject: "Feedback about the new dashboard redesign",
    body: "The new layout is nice but the navigation feels harder to find things in. Wanted to share some thoughts.",
    category: null,
  },
  {
    subject: "General inquiry about enterprise contracts",
    body: "Our procurement team asked me to reach out about custom enterprise contract terms. Who can I speak with?",
    category: null,
  },
  {
    subject: "Checking in on ticket status",
    body: "Just wanted to check if there's any update on the issue I reported a few days ago.",
    category: null,
  },
  {
    subject: "Thank you for the quick support last time",
    body: "Wanted to pass along positive feedback — the agent who helped me last month was fantastic.",
    category: null,
  },
  {
    subject: "Unsure which department handles this request",
    body: "Not sure if this is a billing or technical issue, but my invoice PDF and my usage dashboard don't match.",
    category: null,
  },
  {
    subject: "Request to speak with a account manager",
    body: "We're a larger customer and would like a dedicated point of contact instead of the general queue.",
    category: null,
  },
  {
    subject: "Miscellaneous question about the service",
    body: "Just have a quick question that didn't fit neatly into your other categories — is there a changelog page?",
    category: null,
  },
];

const statuses = [TicketStatus.open, TicketStatus.resolved, TicketStatus.closed];

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function randomDateWithinDays(days: number): Date {
  const now = Date.now();
  const offsetMs = Math.floor(Math.random() * days * 24 * 60 * 60 * 1000);
  return new Date(now - offsetMs);
}

function slugifyEmail(name: string): string {
  return name.toLowerCase().replace(/[^a-z]+/g, ".");
}

async function seed(): Promise<void> {
  const data: Prisma.TicketCreateManyInput[] = Array.from({ length: TICKET_COUNT }, () => {
    const template = randomItem(templates);
    const customer = randomItem(customers);
    const createdAt = randomDateWithinDays(90);

    return {
      subject: template.subject,
      body: template.body,
      category: template.category,
      senderName: customer.name,
      customerEmail: `${slugifyEmail(customer.name)}@${customer.domain}`,
      status: randomItem(statuses),
      createdAt,
      updatedAt: createdAt,
    };
  });

  const { count } = await prisma.ticket.createMany({ data });
  console.log(`✓ Seeded ${count} tickets`);
}

seed()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
