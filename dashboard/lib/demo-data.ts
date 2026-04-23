export const residents = [
  {
    id: "res-001",
    name: "Margaret Ellis",
    room: "12A",
    age: 87,
    need: "Dementia care",
    fallsRisk: "High",
    deterioration: "Medium",
    hydration: "Watch",
    nextReview: "26 Apr",
  },
  {
    id: "res-002",
    name: "George Patel",
    room: "7",
    age: 79,
    need: "Post-stroke rehabilitation",
    fallsRisk: "Medium",
    deterioration: "Low",
    hydration: "Stable",
    nextReview: "3 May",
  },
  {
    id: "res-003",
    name: "Evelyn Morgan",
    room: "21",
    age: 92,
    need: "Nursing care",
    fallsRisk: "Low",
    deterioration: "High",
    hydration: "Concern",
    nextReview: "24 Apr",
  },
]

export const careNotes = [
  {
    resident: "Margaret Ellis",
    type: "Nutrition",
    summary: "Ate half of breakfast, accepted fortified drink, needed prompting with fluids.",
    route: "SOFT_FLAG",
    confidence: "82%",
    tags: ["Effective", "Responsive"],
  },
  {
    resident: "Evelyn Morgan",
    type: "Skin",
    summary: "Redness noted on left heel, pressure relief applied and senior nurse informed.",
    route: "AUTO_FILE",
    confidence: "91%",
    tags: ["Safe", "Effective"],
  },
]

export const marRound = [
  { resident: "Margaret Ellis", room: "12A", medication: "Memantine 10mg", time: "08:00", status: "Administered" },
  { resident: "George Patel", room: "7", medication: "Amlodipine 5mg", time: "08:00", status: "Administered" },
  { resident: "Evelyn Morgan", room: "21", medication: "Paracetamol 1g PRN", time: "10:00", status: "Due" },
]

export const staff = [
  { name: "Amelia Williams", role: "Senior carer", shift: "07:30-15:30", training: 96 },
  { name: "Jon Clarke", role: "Carer", shift: "07:30-15:30", training: 88 },
  { name: "Priya Nair", role: "Nurse", shift: "08:00-20:00", training: 100 },
  { name: "Sam Brooks", role: "Carer", shift: "14:00-22:00", training: 81 },
]

export const incidents = [
  { id: "INC-401", resident: "Margaret Ellis", type: "Unwitnessed fall", severity: "High", status: "RCA in progress" },
  { id: "INC-402", resident: "Evelyn Morgan", type: "Pressure area concern", severity: "Medium", status: "Senior review booked" },
]

export const cqc = [
  { key: "Safe", score: 82, evidence: 46, risk: "Medication omissions and falls learning" },
  { key: "Effective", score: 89, evidence: 33, risk: "Capacity reviews due this week" },
  { key: "Caring", score: 93, evidence: 28, risk: "Family feedback sample is thin" },
  { key: "Responsive", score: 84, evidence: 31, risk: "Complaint closure evidence needed" },
  { key: "Well-led", score: 86, evidence: 52, risk: "Regulation 17 action owners" },
]

export const finance = {
  occupancy: "94%",
  revenue: "GBP 186.4k",
  invoicesDue: 9,
  laBatch: "GBP 74.2k",
  selfFunders: "GBP 112.2k",
}

export const plans = [
  {
    id: "starter",
    name: "Starter",
    price: "GBP 299",
    limit: "35 residents",
    admins: "2 admins",
    features: ["Core dashboard", "Care notes", "Medication visibility"],
  },
  {
    id: "professional",
    name: "Professional",
    price: "GBP 699",
    limit: "90 residents",
    admins: "8 admins",
    highlight: true,
    features: ["AI note quality gate", "Family updates", "Finance exports", "Rota gap alerts"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "GBP 1,499",
    limit: "Unlimited residents",
    admins: "Unlimited admins",
    features: ["Portfolio controls", "Super admin audit", "Custom integrations"],
  },
]

export const careHomes = [
  { id: "home-oakfield", name: "Oakfield House", provider: "Nestiq Care Group", plan: "Professional", status: "Trialing", residents: 43, admins: 2, mrr: "GBP 699", cqc: 87 },
  { id: "home-lakeview", name: "Lakeview Manor", provider: "Nestiq Care Group", plan: "Starter", status: "Active", residents: 28, admins: 1, mrr: "GBP 299", cqc: 81 },
]

export const demoUsers = [
  { id: "usr-super-001", name: "Sofia Platform", email: "superadmin@carehomeos.local", role: "super_admin", home: "CareHomeOS company", status: "Active", password: "CareHomeOS!2026" },
  { id: "usr-admin-001", name: "Ruth Manager", email: "manager@oakfield.local", role: "care_home_admin", home: "Oakfield House", status: "Active", password: "CareHomeOS!2026" },
  { id: "usr-admin-002", name: "Devon Deputy", email: "deputy@oakfield.local", role: "sub_admin", home: "Oakfield House", status: "Invited", password: "CareHomeOS!2026" },
  { id: "usr-staff-001", name: "Amelia Williams", email: "staff@oakfield.local", role: "staff", home: "Oakfield House", status: "Active", password: "CareHomeOS!2026" },
]
