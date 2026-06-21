const tickets = [
  {
    id: "INC-4821",
    user: "Marcus Chen",
    title: "Can't access anything, internet down",
    time: "09:14 AM",
    priority: "high",
    type: "switch-fault",
    location: "Floor 3, West Wing",
    ip: "10.14.3.47",
    diagnosis: {
      summary: "Packet loss detected starting at hop 4 (core switch SW-12). Likely cause: switch port flapping on Gi0/24.",
      confidence: "High",
      rootCause: "Switch Port Fault",
      icon: "⚠️"
    },
    topology: [
      { label: "Marcus Chen", sublabel: "10.14.3.47", type: "user", status: "ok" },
      { label: "AP-3W-07", sublabel: "Wi-Fi 6 · -58 dBm", type: "ap", status: "ok" },
      { label: "SW-14", sublabel: "Access switch · Gi0/11", type: "switch", status: "ok" },
      { label: "SW-12", sublabel: "Core switch · Gi0/24", type: "switch", status: "fault" },
      { label: "WAN-GW1", sublabel: "ISP handoff", type: "wan", status: "ok" }
    ],
    diagnostics: [
      { name: "Ping (LAN gateway)", status: "ok", detail: "2ms avg · 0% loss" },
      { name: "Ping (8.8.8.8)", status: "fault", detail: "72% packet loss" },
      { name: "DNS resolution", status: "ok", detail: "12ms · Resolved OK" },
      { name: "Traceroute", status: "fault", detail: "Loss starts hop 4 · SW-12" },
      { name: "VPN tunnel", status: "ok", detail: "Not in use" },
      { name: "Wi-Fi signal", status: "ok", detail: "-58 dBm · Channel 36" },
      { name: "Switch port (SW-14)", status: "ok", detail: "Up · 1Gbps · 0 errors" },
      { name: "Switch port (SW-12 Gi0/24)", status: "fault", detail: "Flapping · 847 err last 10m" },
      { name: "Recent config changes", status: "amber", detail: "VLAN change SW-12 · 08:52 AM" }
    ],
    affectedUsers: [
      { name: "Priya Patel", detail: "Floor 3 West · same root cause" },
      { name: "James Whitmore", detail: "Floor 3 West · same root cause" },
      { name: "Sofia Reyes", detail: "Floor 3 West · same root cause" }
    ],
    similarTickets: [
      { id: "INC-4390", title: "Port flapping SW-12", resolution: "Replaced SFP module in Gi0/20. Cleared.", daysAgo: 23, match: 94 },
      { id: "INC-3871", title: "Core switch errors Floor 3", resolution: "Firmware update resolved persistent CRC errors.", daysAgo: 61, match: 78 },
      { id: "INC-3204", title: "Packet loss investigation", resolution: "Escalated to Network Eng. Faulty patch cable at IDF.", daysAgo: 102, match: 65 }
    ],
    portHistory: {
      switch: "SW-12",
      port: "Gi0/24",
      events: [
        { time: "09:11 AM", event: "Port went down", type: "fault" },
        { time: "09:11 AM", event: "Port came up", type: "ok" },
        { time: "09:10 AM", event: "Port went down", type: "fault" },
        { time: "09:09 AM", event: "847 CRC errors logged", type: "fault" },
        { time: "08:52 AM", event: "VLAN config change applied", type: "amber" },
        { time: "08:00 AM", event: "Port stable — no events", type: "ok" }
      ]
    }
  },
  {
    id: "INC-4819",
    user: "Diane Foster",
    title: "VPN super slow, video calls dropping",
    time: "08:47 AM",
    priority: "medium",
    type: "vpn-degraded",
    location: "Remote / Home",
    ip: "192.168.1.104",
    diagnosis: {
      summary: "VPN tunnel is up but routing through a degraded secondary WAN path. Latency 310ms vs normal 28ms. Primary ISP link shows BGP route instability.",
      confidence: "Medium",
      rootCause: "Degraded WAN Path",
      icon: "🔶"
    },
    topology: [
      { label: "Diane Foster", sublabel: "192.168.1.104 · Remote", type: "user", status: "ok" },
      { label: "VPN Gateway", sublabel: "vpn.corp.local · Tunnel up", type: "switch", status: "amber" },
      { label: "WAN-GW1", sublabel: "Primary ISP · BGP unstable", type: "wan", status: "fault" },
      { label: "WAN-GW2", sublabel: "Backup ISP · Active (fallback)", type: "wan", status: "amber" },
      { label: "Internet", sublabel: "Routing via backup", type: "wan", status: "ok" }
    ],
    diagnostics: [
      { name: "Ping (LAN gateway)", status: "ok", detail: "4ms avg · 0% loss" },
      { name: "Ping (8.8.8.8)", status: "amber", detail: "310ms avg · 3% loss" },
      { name: "DNS resolution", status: "ok", detail: "18ms · Resolved OK" },
      { name: "Traceroute", status: "amber", detail: "High latency hop 3 · backup WAN" },
      { name: "VPN tunnel", status: "amber", detail: "Up · secondary path · 310ms" },
      { name: "Wi-Fi signal", status: "ok", detail: "Home network · N/A" },
      { name: "Primary WAN (WAN-GW1)", status: "fault", detail: "BGP flap · partial routing" },
      { name: "Backup WAN (WAN-GW2)", status: "amber", detail: "Up · 50Mbps · handling failover" },
      { name: "Recent config changes", status: "ok", detail: "No changes in last 24h" }
    ],
    affectedUsers: [
      { name: "Tom Nguyen", detail: "Remote · VPN via backup path" },
      { name: "Aisha Brooks", detail: "Remote · same WAN issue" }
    ],
    similarTickets: [
      { id: "INC-4601", title: "VPN latency spike all remote users", resolution: "ISP primary link recovered after 40 min. Monitoring added.", daysAgo: 14, match: 89 },
      { id: "INC-4122", title: "Slow VPN, dropped calls", resolution: "BGP route advertisement fixed by ISP. No action on our end.", daysAgo: 45, match: 71 },
      { id: "INC-3990", title: "Backup WAN failover degraded perf", resolution: "QoS policy updated on backup path for video traffic.", daysAgo: 58, match: 60 }
    ],
    portHistory: {
      switch: "WAN-GW1",
      port: "BGP Session",
      events: [
        { time: "08:44 AM", event: "BGP session flapped", type: "fault" },
        { time: "08:44 AM", event: "Traffic failed over to WAN-GW2", type: "amber" },
        { time: "08:30 AM", event: "BGP prefix instability detected", type: "amber" },
        { time: "07:00 AM", event: "Primary WAN stable", type: "ok" }
      ]
    }
  },
  {
    id: "INC-4815",
    user: "Ryan Okafor",
    title: "Can't open Salesforce, everything else works",
    time: "08:12 AM",
    priority: "low",
    type: "not-network",
    location: "Floor 2, East Wing",
    ip: "10.14.2.89",
    diagnosis: {
      summary: "All network diagnostics are healthy. Ping, DNS, and routing are normal. This appears to be an application-layer issue with Salesforce — not a network problem.",
      confidence: "High",
      rootCause: "Not a Network Issue",
      icon: "✅"
    },
    topology: [
      { label: "Ryan Okafor", sublabel: "10.14.2.89", type: "user", status: "ok" },
      { label: "AP-2E-03", sublabel: "Wi-Fi 6 · -51 dBm", type: "ap", status: "ok" },
      { label: "SW-09", sublabel: "Access switch · Gi0/7", type: "switch", status: "ok" },
      { label: "SW-11", sublabel: "Core switch", type: "switch", status: "ok" },
      { label: "WAN-GW1", sublabel: "ISP handoff · healthy", type: "wan", status: "ok" }
    ],
    diagnostics: [
      { name: "Ping (LAN gateway)", status: "ok", detail: "1ms avg · 0% loss" },
      { name: "Ping (8.8.8.8)", status: "ok", detail: "14ms avg · 0% loss" },
      { name: "DNS resolution", status: "ok", detail: "9ms · Resolved OK" },
      { name: "Traceroute", status: "ok", detail: "Clean path · 14 hops" },
      { name: "VPN tunnel", status: "ok", detail: "Not in use" },
      { name: "Wi-Fi signal", status: "ok", detail: "-51 dBm · Channel 100" },
      { name: "Switch port (SW-09 Gi0/7)", status: "ok", detail: "Up · 1Gbps · 0 errors" },
      { name: "Salesforce DNS", status: "ok", detail: "login.salesforce.com · resolves" },
      { name: "Recent config changes", status: "ok", detail: "No changes in last 24h" }
    ],
    affectedUsers: [],
    similarTickets: [
      { id: "INC-4710", title: "Salesforce login error", resolution: "Cleared browser cache and cookies. App-layer SSO token issue.", daysAgo: 8, match: 91 },
      { id: "INC-4580", title: "Can't access cloud app, network fine", resolution: "Proxy bypass rule added for the app domain.", daysAgo: 19, match: 72 },
      { id: "INC-3801", title: "Single app unreachable, rest OK", resolution: "Certificate error on app server — resolved by vendor.", daysAgo: 77, match: 58 }
    ],
    portHistory: {
      switch: "SW-09",
      port: "Gi0/7",
      events: [
        { time: "08:10 AM", event: "Port stable — no events", type: "ok" },
        { time: "Yesterday", event: "Normal traffic patterns", type: "ok" }
      ]
    }
  }
];
