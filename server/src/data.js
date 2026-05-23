export const users = [
  {
    id: "u1",
    name: "Vamshi",
    email: "vamshi@example.com",
    avatar: "VA",
    passwordHash: "$2a$10$chmLSm606Zgy4C1AA/LrGuIv/G6U3BnjMNkAsrs7OnwtkwHJ/xWZG"
  },
  {
    id: "u2",
    name: "Rahul",
    email: "rahul@example.com",
    avatar: "RA",
    passwordHash: "$2a$10$chmLSm606Zgy4C1AA/LrGuIv/G6U3BnjMNkAsrs7OnwtkwHJ/xWZG"
  },
  {
    id: "u3",
    name: "Priya",
    email: "priya@example.com",
    avatar: "PR",
    passwordHash: "$2a$10$chmLSm606Zgy4C1AA/LrGuIv/G6U3BnjMNkAsrs7OnwtkwHJ/xWZG"
  },
  {
    id: "u4",
    name: "Ananya",
    email: "ananya@example.com",
    avatar: "AN",
    passwordHash: "$2a$10$chmLSm606Zgy4C1AA/LrGuIv/G6U3BnjMNkAsrs7OnwtkwHJ/xWZG"
  }
];

export const groups = [
  {
    id: "g1",
    name: "Goa Trip",
    type: "Trip",
    currency: "INR",
    createdAt: "2026-05-17",
    memberIds: ["u1", "u2", "u3", "u4"]
  },
  {
    id: "g2",
    name: "Flatmates",
    type: "Home",
    currency: "INR",
    createdAt: "2026-05-01",
    memberIds: ["u1", "u2", "u3"]
  }
];

export const expenses = [
  {
    id: "e1",
    groupId: "g1",
    title: "Beach Shack Dinner",
    category: "Food",
    paidBy: "u1",
    amount: 3840,
    date: "2026-05-18",
    status: "settlement_due",
    splits: [
      { userId: "u1", amount: 840 },
      { userId: "u2", amount: 1200 },
      { userId: "u3", amount: 900 },
      { userId: "u4", amount: 900 }
    ],
    receiptItems: [
      { name: "Paneer Tikka", price: 720, assignedTo: ["u1", "u3"] },
      { name: "Prawn Curry", price: 1120, assignedTo: ["u2", "u4"] },
      { name: "Mocktails", price: 760, assignedTo: ["u1", "u2", "u3", "u4"] },
      { name: "GST + Service", price: 1240, assignedTo: ["u1", "u2", "u3", "u4"] }
    ]
  },
  {
    id: "e2",
    groupId: "g1",
    title: "Airport Cab",
    category: "Travel",
    paidBy: "u3",
    amount: 2200,
    date: "2026-05-19",
    status: "paid",
    splits: [
      { userId: "u1", amount: 550 },
      { userId: "u2", amount: 550 },
      { userId: "u3", amount: 550 },
      { userId: "u4", amount: 550 }
    ],
    receiptItems: []
  },
  {
    id: "e3",
    groupId: "g2",
    title: "May Rent",
    category: "Rent",
    paidBy: "u2",
    amount: 36000,
    date: "2026-05-03",
    status: "settlement_due",
    splits: [
      { userId: "u1", amount: 12000 },
      { userId: "u2", amount: 12000 },
      { userId: "u3", amount: 12000 }
    ],
    receiptItems: []
  }
];

export const disputes = [
  {
    id: "d1",
    expenseId: "e1",
    raisedBy: "u2",
    reason: "Mocktails were assigned to everyone, but Ananya skipped drinks.",
    status: "under_review",
    createdAt: "2026-05-20"
  }
];
